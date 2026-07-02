/**
 * One-time migration: seed permissions/{email} docs from the hardcoded
 * email allowlists that used to live in src/utils/{partialAdminAccess,
 * downloadsAccess,transactionsOpsAccess}.js (see SEC-016 in the security
 * audit). Run this once after deploying the updated firestore.rules and
 * app code so the two people who currently have elevated access don't
 * lose it on cutover.
 *
 * Usage:
 *   node scripts/seed-permissions.mjs          # dry run (default)
 *   node scripts/seed-permissions.mjs --apply  # write to Firestore
 *
 * Credentials: reads FIREBASE_SERVICE_ACCOUNT_KEY from .env.local (admin
 * SDK, bypasses security rules). Idempotent — re-running after --apply
 * just overwrites the same flags.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

// Mirrors the allowlists removed from src/utils/*Access.js. Update this
// list (and re-run with --apply) instead of editing source going forward
// — grants are now managed via Admin -> User Management -> Permissions.
const GRANTS = [
  { email: 'valery@cedargrovellp.com', partialAdmin: true, transactionsOpsAccess: true },
  { email: 'michael@cedargrovellp.com', downloadsAccess: true },
];

function loadServiceAccount() {
  const envPath = path.join(repoRoot, '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  const line = raw.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));
  if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  const json = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim();
  return JSON.parse(json);
}

async function main() {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
  const db = admin.firestore();

  console.log(`Seeding ${GRANTS.length} permission grant(s). Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);

  for (const grant of GRANTS) {
    const email = grant.email.toLowerCase();
    const { email: _email, ...flags } = grant;
    console.log(`${APPLY ? 'WRITE' : 'would write'} permissions/${email}:`, flags);

    if (APPLY) {
      await db.collection('permissions').doc(email).set({
        ...flags,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'scripts/seed-permissions.mjs',
      }, { merge: true });
    }
  }

  if (!APPLY) console.log('\nRe-run with --apply to persist.');

  await admin.app().delete();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
