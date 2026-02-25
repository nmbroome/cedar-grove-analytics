// Emails with downloads-only dashboard access (can view the Downloads tab on the main dashboard)
const DOWNLOADS_ACCESS_EMAILS = [
  'michael@cedargrovellp.com',
];

export function hasDownloadsAccessEmail(email) {
  if (!email) return false;
  return DOWNLOADS_ACCESS_EMAILS.includes(email.toLowerCase());
}
