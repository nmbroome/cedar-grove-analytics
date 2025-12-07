import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once (important for Next.js hot reloading)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// Auth state promise
let authReadyPromise = null;
let authReadyResolve = null;

if (typeof window !== 'undefined') {
  authReadyPromise = new Promise((resolve) => {
    authReadyResolve = resolve;
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      authReadyResolve(user);
    } else {
      console.log("No user, signing in anonymously...");
      signInAnonymously(auth)
        .then(() => console.log("Signed in anonymously"))
        .catch((error) => console.error("Anonymous auth failed:", error));
    }
  });
}

export const waitForAuth = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  return authReadyPromise;
};

export { db, auth };