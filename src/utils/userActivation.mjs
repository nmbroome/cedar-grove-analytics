/**
 * Pure helpers for gating attorney/user visibility by their activation
 * (join) date. Consumed by hooks/components that need to know whether a
 * user should count as "on the roster yet" for a given as-of date. Must
 * stay free of React/Firebase imports.
 *
 * users/{id}.activationDate is stored as a "YYYY-MM-DD" string, produced
 * by an HTML <input type="date"> in the admin UI.
 */

/**
 * Parse a "YYYY-MM-DD" activationDate string into a local-midnight Date.
 * Returns null for falsy input or an unparseable string.
 */
export function parseActivationDate(value) {
  if (!value) return null;

  // String concat (not a template literal, per project style) + new Date(str)
  // parses as local time here, mirroring the split/Number/new Date(y, m-1, d)
  // approach useAnalyticsData.js uses for customDateStart/customDateEnd — so
  // activation-date comparisons never drift a day off from calendar-date
  // comparisons elsewhere in the app.
  const d = new Date(value + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;

  // Guard against calendar-invalid day-of-month strings (e.g. "2026-02-30"),
  // which `new Date()` silently rolls forward into the next month instead of
  // rejecting. Not reachable via the <input type="date"> UI, but a direct
  // Firestore edit or future non-UI writer could store one — reject rather
  // than silently gating on a shifted date.
  const [y, m, dd] = value.split('-').map(Number);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== dd) return null;

  return d;
}

/**
 * Whether `user` had already joined as of `asOfDate`.
 */
export function hasJoinedBy(user, asOfDate) {
  const activationDate = parseActivationDate(user?.activationDate);

  // No recorded activation date means "always applicable" — preserves
  // backward compatibility with existing users that predate this field.
  if (!activationDate) return true;

  // No asOfDate means an unbounded/all-time range, which no join date can fail.
  if (!asOfDate) return true;

  return activationDate.getTime() <= asOfDate.getTime();
}
