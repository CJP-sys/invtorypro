import { signInWithEmailAndPassword } from "firebase/auth";

signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        console.log("Logged in!");
    })
    .catch((error) => {
        console.log(error.message);
    });

/* ─────────────────────────────────────────
   ROLE SELECTION
   Just toggles the active badge visually.
   When you wire up the backend, you'll send
   the selected role along with the login request.
───────────────────────────────────────── */
function selectRole(btn) {
  document.querySelectorAll('.role-badge')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ─────────────────────────────────────────
   PASSWORD TOGGLE
   Switches input type between 'password'
   and 'text', and swaps the eye icon.
───────────────────────────────────────── */
let passwordVisible = false;

function togglePassword() {
  const input = document.getElementById('password');
  const icon  = document.getElementById('eye-icon');

  passwordVisible = !passwordVisible;
  input.type = passwordVisible ? 'text' : 'password';

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

/* ─────────────────────────────────────────
   LOGIN HANDLER
   Right now this uses a hardcoded demo
   credential check. When you build the
   backend, replace the fake check inside
   with a real fetch() call to your API.
───────────────────────────────────────── */
function handleLogin(e) {
  e.preventDefault(); // stop browser default form submit

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('login-btn');
  const errorBox = document.getElementById('error-msg');

  // Basic client-side presence check
  // (your backend will do the real validation)
  if (!email || !password) {
    showError('Please fill in both fields.');
    return;
  }

  // Show loading state — prevents double-clicks
  btn.classList.add('loading');
  btn.disabled = true;
  errorBox.classList.remove('show');

  // ── REPLACE THIS BLOCK with a real fetch() call later ──
  // e.g.:
  // const res = await fetch('/api/auth/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email, password })
  // });
  // const data = await res.json();
  // if (!res.ok) { showError(data.message); return; }
  // localStorage.setItem('token', data.token);
  // window.location.href = '/dashboard';
  // ────────────────────────────────────────────────────────

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
  .then(() => {

      window.location.href = "main/InventoryPro.html";

  })
  .catch((error)=>{

      alert(error.message);

  });

  // Fake 1.5s delay simulating a network request
  setTimeout(() => {
    btn.classList.remove('loading');
    btn.disabled = false;

    // Demo credentials — remove these when real auth is ready
    const DEMO_EMAIL    = 'admin@ims.com';
    const DEMO_PASSWORD = 'admin123';

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      // SUCCESS — redirect to dashboard
      showToast('Login successful! Redirecting...');
      setTimeout(() => {
        // Change this to your actual dashboard URL
        window.location.href = 'main/InventoryPro.html';
      }, 1200);
    } else {
      showError('Invalid email or password. Please try again.');
    }
  }, 1500);
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

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function showForgot(e) {
  e.preventDefault();
  showToast('Password reset: contact your system administrator.');
}