import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Auth state promise - resolves when user is authenticated
let authReadyPromise = null;
let authReadyResolve = null;

// Create the promise immediately
authReadyPromise = new Promise((resolve) => {
  authReadyResolve = resolve;
});

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User authenticated:", user.uid);
    authReadyResolve(user);
  } else {
    // No user, sign in anonymously
    console.log("No user, signing in anonymously...");
    signInAnonymously(auth)
      .then(() => {
        console.log("Signed in anonymously");
      })
      .catch((error) => {
        console.error("Anonymous auth failed:", error);
      });
  }
});

// Export a function to wait for auth to be ready
export const waitForAuth = () => authReadyPromise;

export { db, auth };