/** Central role configuration. Change this email here and in firestore.rules. */
import { auth } from './firebase.js';

export const ADMIN_EMAIL = 'chrisdiorsystem@gmail.com';

/** Resolves the authenticated account to the only two supported experiences. */
export async function getAccessContext() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || sessionStorage.getItem('inventory-pro-explicit-login') !== 'true') {
    return { user: null, role: 'guest', isAdmin: false };
  }
  const isAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL;
  return { user, role: isAdmin ? 'admin' : 'viewer', isAdmin };
}
