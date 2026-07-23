import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, signOut, setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOoAtNg4UMfQftWblcsHQ9PzmBIq_YmTU",
  authDomain: "inventory-00.firebaseapp.com",
  projectId: "inventory-00",
  storageBucket: "inventory-00.firebasestorage.app",
  messagingSenderId: "394398193447",
  appId: "1:394398193447:web:4c28a9284144c91b8a7b02"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const LOGIN_MARKER = 'inventory-pro-explicit-login';

// Opening or refreshing the login page always starts from a signed-out state.
sessionStorage.removeItem(LOGIN_MARKER);
const loginReady = auth.authStateReady().then(async () => {
  if (auth.currentUser) await signOut(auth);
});

/* ─────────────────────────────────────────
   ROLE SELECTION
   Just toggles the active badge visually.
   When you wire up the backend, you'll send
   the selected role along with the login request.
───────────────────────────────────────── */
function setLoginMode(mode) {
  const isAdmin = mode === 'admin';
  document.querySelectorAll('[data-login-mode]').forEach(button => {
    const active = button.dataset.loginMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.getElementById('viewer-login-panel').hidden = isAdmin;
  document.getElementById('admin-login-panel').hidden = !isAdmin;
  document.getElementById('error-msg')?.classList.remove('show');
  document.getElementById('viewer-error-msg')?.classList.remove('show');
  const subtitle = document.querySelector('.login-card .subtitle');
  if (subtitle) subtitle.textContent = isAdmin
    ? 'Sign in with the approved administrator email and password.'
    : 'Sign in with Google or an existing email and password.';
  if (isAdmin) setTimeout(() => document.getElementById('email')?.focus(), 0);
  else setTimeout(() => document.getElementById('google-login-btn')?.focus(), 0);
}
window.setLoginMode = setLoginMode;

/* ─────────────────────────────────────────
   PASSWORD TOGGLE
   Switches input type between 'password'
   and 'text', and swaps the eye icon.
───────────────────────────────────────── */
let passwordVisible = false;

function togglePassword() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eye-icon');
  const button = document.getElementById('password-toggle');

  passwordVisible = !passwordVisible;
  input.type = passwordVisible ? 'text' : 'password';
  button?.setAttribute('aria-pressed', String(passwordVisible));
  button?.setAttribute('aria-label', passwordVisible ? 'Hide password' : 'Show password');
  if (button) button.title = passwordVisible ? 'Hide password' : 'Show password';

  // Swap icon: eye vs eye-off
  icon.innerHTML = passwordVisible
    ? /* eye-off SVG paths */
      `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : /* eye SVG paths */
      `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
}
window.togglePassword = togglePassword;

let viewerPasswordVisible = false;

function toggleViewerPassword() {
  const input = document.getElementById('viewer-password');
  const icon = document.getElementById('viewer-eye-icon');
  const button = document.getElementById('viewer-password-toggle');
  viewerPasswordVisible = !viewerPasswordVisible;
  input.type = viewerPasswordVisible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(viewerPasswordVisible));
  button.setAttribute('aria-label', viewerPasswordVisible ? 'Hide password' : 'Show password');
  button.title = viewerPasswordVisible ? 'Hide password' : 'Show password';
  icon.innerHTML = viewerPasswordVisible
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
}
window.toggleViewerPassword = toggleViewerPassword;

function completeSignIn(message) {
  sessionStorage.setItem(LOGIN_MARKER, 'true');
  showToast(message);
  setTimeout(() => { window.location.href = 'main/index.html'; }, 650);
}

async function handleGoogleLogin() {
  const button = document.getElementById('google-login-btn');
  button.disabled = true;
  document.getElementById('error-msg')?.classList.remove('show');
  try {
    await loginReady;
    await setPersistence(auth, browserSessionPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const isAdmin = (result.user.email || '').toLowerCase() === 'chrisdiorsystem@gmail.com';
    completeSignIn(isAdmin ? 'Administrator · Full Access confirmed' : 'Welcome! Opening Viewer · Read Only');
  } catch (error) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') return;
    if (error?.code === 'auth/popup-blocked') showError('The Google sign-in window was blocked. Allow popups and try again.');
    else if (error?.code === 'auth/unauthorized-domain') showError('Google sign-in is not authorized for this domain yet.');
    else showError('Google sign-in could not be completed. Please try again.');
  } finally {
    button.disabled = false;
  }
}
window.handleGoogleLogin = handleGoogleLogin;

async function handleViewerLogin(e) {
  e.preventDefault();
  const email = document.getElementById('viewer-email').value.trim();
  const password = document.getElementById('viewer-password').value;
  const btn = document.getElementById('viewer-login-btn');

  if (!email || !password) {
    showViewerError('Please fill in both fields.');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  document.getElementById('viewer-error-msg').classList.remove('show');

  try {
    await loginReady;
    await setPersistence(auth, browserSessionPersistence);
    const result = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = (result.user.email || '').toLowerCase() === 'chrisdiorsystem@gmail.com';
    completeSignIn(isAdmin ? 'Administrator · Full Access confirmed' : 'Welcome! Opening Viewer · Read Only');
  } catch (error) {
    let message = 'Invalid email or password. Please try again.';
    if (error?.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
    else if (error?.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait and try again.';
    showViewerError(message);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}
window.handleViewerLogin = handleViewerLogin;

/* ─────────────────────────────────────────
   LOGIN HANDLER
   Authenticates the user with Firebase
   Authentication and redirects to the app
   dashboard after a successful sign-in.
───────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errorBox = document.getElementById('error-msg');

  if (!email || !password) {
    showError('Please fill in both fields.');
    return;
  }
  if (email.toLowerCase() !== 'chrisdiorsystem@gmail.com') {
    showError('This account is not approved for administrator access. Use Viewer Google sign-in or request access.');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  errorBox.classList.remove('show');

  try {
    await loginReady;
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    btn.classList.remove('loading');
    btn.disabled = false;
    completeSignIn('Administrator sign-in successful');
  } catch (error) {
    btn.classList.remove('loading');
    btn.disabled = false;

    let message = 'Unable to sign in. Please try again.';
    if (error?.code === 'auth/invalid-login-credentials') {
      message = 'No matching Firebase user was found. Create the user in Firebase Authentication and make sure Email/Password is enabled.';
    } else if (error?.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error?.message) {
      message = error.message;
    }

    showError(message);
  }
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function showError(msg) {
  const errorBox  = document.getElementById('error-msg'); 
  const errorText = document.getElementById('error-text');
  errorText.textContent = msg;
  errorBox.classList.add('show');
}

function showViewerError(msg) {
  document.getElementById('viewer-error-text').textContent = msg;
  document.getElementById('viewer-error-msg').classList.add('show');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

async function showForgot(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  if (!email) {
    showError('Enter your email address first, then request a password reset.');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`Password reset email sent to ${email}`);
  } catch (error) {
    let message = 'Unable to send password reset email.';
    if (error?.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error?.code === 'auth/user-not-found') {
      message = 'No account found for that email.';
    } else if (error?.message) {
      message = error.message;
    }
    showError(message);
  }
}

async function showViewerForgot(e) {
  e.preventDefault();
  const email = document.getElementById('viewer-email').value.trim();
  if (!email) {
    showViewerError('Enter your email address first, then request a password setup or reset link.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`Password setup/reset email sent to ${email}`);
  } catch (error) {
    showViewerError(error?.code === 'auth/invalid-email'
      ? 'Please enter a valid email address.'
      : 'Unable to send the password email. Please try again.');
  }
}
window.showViewerForgot = showViewerForgot;

function requestAccess(e) {
  e.preventDefault();
  window.location.href = 'mailto:chrisdiorsystem@gmail.com?subject=Request%20access%20to%20Inventory%20Pro';
}

window.requestAccess = requestAccess;
window.handleLogin = handleLogin;
window.showForgot = showForgot;

setLoginMode('viewer');
