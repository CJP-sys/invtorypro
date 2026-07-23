/**
 * js/auth.js
 * ─────────────────────────────────────────────────────
 * Handles everything related to who is logged in:
 *  - Redirect to login if not authenticated
 *  - Show real user name/email in the sidebar
 *  - Sign out when user clicks the sidebar chip
 */

import { auth }                        from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { toast }                       from './utils.js';
import { ADMIN_EMAIL }                 from './access.js';
import { confirmDialog }               from './dialogs.js';

export function requestAdminAccess() {
  const email = auth.currentUser?.email || 'viewer';
  const subject = encodeURIComponent('Request administrator access to Inventory Pro');
  const body = encodeURIComponent(`Hello,\n\nPlease review administrator access for ${email}.\n\nThank you.`);
  window.location.href = `mailto:chrisdiorsystem@gmail.com?subject=${subject}&body=${body}`;
}
window.requestAdminAccess = requestAdminAccess;

/* ─── AUTH STATE LISTENER ───────────────────────────────
   Fires once on page load, then again whenever auth
   state changes (login / logout / token refresh).

   Two outcomes:
   1. No user → redirect to login immediately
   2. User exists → populate sidebar with real info
─────────────────────────────────────────────────────── */
onAuthStateChanged(auth, (user) => {
  const hasExplicitLogin = sessionStorage.getItem('inventory-pro-explicit-login') === 'true';
  if (!user || !hasExplicitLogin) {
    // Not signed in — send back to login page.
    // Using replace() so the back button doesn't return
    // to the dashboard while still logged out.
    if (user && !hasExplicitLogin) signOut(auth).finally(() => window.location.replace('../index.html'));
    else window.location.replace('../index.html');
    return;
  }

  // Unlock every application control only after Firebase confirms a user.
  document.body.classList.remove('auth-pending');
  document.getElementById('sidebar')?.removeAttribute('inert');
  document.getElementById('main')?.removeAttribute('inert');
  document.getElementById('auth-gate')?.remove();

  // Show the real user's name (or email prefix if no display name)
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  const avatarEl = document.querySelector('.user-avatar');
  const accessBadge = document.getElementById('demo-mode-badge');
  const requestButton = document.getElementById('request-admin-btn');
  const email = user.email || '';
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
  document.body.dataset.access = isAdmin ? 'admin' : 'viewer';
  if (nameEl) {
    nameEl.textContent = user.displayName || email.split('@')[0] || 'User';
    nameEl.title = email;
  }
  if (avatarEl) {
    const initials = (user.displayName || email || 'User').split(/\s+|@/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    avatarEl.textContent = user.photoURL ? '' : initials;
    avatarEl.style.backgroundImage = user.photoURL ? `url("${user.photoURL}")` : '';
    avatarEl.classList.toggle('has-image', Boolean(user.photoURL));
  }
  if (roleEl) roleEl.textContent = isAdmin ? 'Administrator · Full Access' : 'Viewer · Read Only';
  if (accessBadge) {
    accessBadge.hidden = false;
    accessBadge.textContent = isAdmin ? 'ADMINISTRATOR · FULL ACCESS' : 'VIEWER · READ ONLY';
    accessBadge.classList.toggle('admin-access', isAdmin);
    accessBadge.classList.toggle('viewer-access', !isAdmin);
  }
  if (requestButton) requestButton.hidden = isAdmin;
});

/* ─── SIGN OUT ──────────────────────────────────────────
   Wired to the sidebar user chip.
   Asks for confirmation first — avoids accidental logouts.
─────────────────────────────────────────────────────── */
document.querySelector('.user-chip')?.addEventListener('click', async () => {
  if (!await confirmDialog({ title:'Sign out?', message:'You will return to the secure login page.', confirmText:'Sign out' })) return;
  try {
    sessionStorage.removeItem('inventory-pro-explicit-login');
    await signOut(auth);
    window.location.replace('../index.html');
  } catch (err) {
    console.error('Sign out failed', err);
    toast('Sign out failed — try again', 'error');
  }
});
