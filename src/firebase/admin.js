import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Cache the initialized admin app at module scope so we don't re-parse the
// service-account JSON on every cold-start invocation of a route handler.
let cachedApp = null;

function getAdminApp() {
  if (cachedApp) return cachedApp;

  // Reuse an existing app if one was initialized elsewhere in this process
  // (e.g., by a different module on the same cold start).
  if (getApps().length > 0) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not configured");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    // Do NOT include the raw env-var contents in the thrown error — the
    // service-account JSON contains a private key.
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }

  cachedApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return cachedApp;
}

function getAdminDb() {
  return getFirestore(getAdminApp());
}

function getAdminAuth() {
  return getAuth(getAdminApp());
}

export { getAdminDb, getAdminAuth };
