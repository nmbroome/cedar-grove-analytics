// Emails with partial admin access (can view most admin pages except User Management)
const PARTIAL_ADMIN_EMAILS = [
  'valery@cedargrovellp.com',
];

export function isPartialAdminEmail(email) {
  if (!email) return false;
  return PARTIAL_ADMIN_EMAILS.includes(email.toLowerCase());
}
