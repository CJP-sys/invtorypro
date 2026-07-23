/**
 * js/firebase.js
 * ─────────────────────────────────────────────────────
 * Single source of truth for Firebase.
 * Every other module imports { auth, db } from here.
 * Never call initializeApp() anywhere else.
 */

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDOoAtNg4UMfQftWblcsHQ9PzmBIq_YmTU",
  authDomain:        "inventory-00.firebaseapp.com",
  projectId:         "inventory-00",
  storageBucket:     "inventory-00.firebasestorage.app",
  messagingSenderId: "394398193447",
  appId:             "1:394398193447:web:4c28a9284144c91b8a7b02"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export async function requireUser() {
  await auth.authStateReady();
  if (!auth.currentUser || sessionStorage.getItem('inventory-pro-explicit-login') !== 'true') {
    throw new Error('You must sign in for this browser session.');
  }
  return auth.currentUser;
}
