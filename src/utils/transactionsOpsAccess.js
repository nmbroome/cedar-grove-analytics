// Emails with transactions+ops dashboard access (can view Transactions and Ops tabs on the main dashboard)
const TRANSACTIONS_OPS_ACCESS_EMAILS = [
  'valery@cedargrovellp.com',
];

export function hasTransactionsOpsAccessEmail(email) {
  if (!email) return false;
  return TRANSACTIONS_OPS_ACCESS_EMAILS.includes(email.toLowerCase());
}
