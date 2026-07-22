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
  if (!user) {
    // Not signed in — send back to login page.
    // Using replace() so the back button doesn't return
    // to the dashboard while still logged out.
    window.location.replace('../index.html');
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
  const email = user.email || '';
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
  document.body.dataset.access = isAdmin ? 'admin' : 'viewer';
  if (nameEl) nameEl.textContent = user.displayName || email.split('@')[0] || 'User';
  if (roleEl) roleEl.textContent = isAdmin ? 'Administrator' : 'Viewer · Demo';
});

/* ─── SIGN OUT ──────────────────────────────────────────
   Wired to the sidebar user chip.
   Asks for confirmation first — avoids accidental logouts.
─────────────────────────────────────────────────────── */
document.querySelector('.user-chip')?.addEventListener('click', async () => {
  if (!await confirmDialog({ title:'Sign out?', message:'You will return to the secure login page.', confirmText:'Sign out' })) return;
  try {
    await signOut(auth);
    window.location.replace('../index.html');
  } catch (err) {
    console.error('Sign out failed', err);
    toast('Sign out failed — try again', 'error');
  }
});
