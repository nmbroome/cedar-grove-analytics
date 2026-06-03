// Out-of-office (OOO) and firm-holiday helpers, sourced from the `timeOff/all`
// Firestore document (synced from the firm's shared Google Calendar — see
// FirestoreSchema.md). Pure helpers, in the style of hiddenAttorneys.js / roles.js.
//
// These feed the utilization target pro-rating (getMonthProRateFraction in
// dateHelpers.js): firm holidays are baked into the monthly target, while an
// attorney's OOO proportionally reduces their expected target for any period.
//
// All consumers are read-only; the app never writes `timeOff/all`. Everything
// here tolerates a null/missing doc so behavior is unchanged before the sync ships.

import { getUSFederalHolidays, toDateKey } from './dateHelpers';

// Normalize a person name for matching: trim, lowercase, collapse inner whitespace.
const normalizeName = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Normalize an email for matching: trim, lowercase.
const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// Parse a 'YYYY-MM-DD' string as a LOCAL calendar day (avoids the UTC shift that
// `new Date('YYYY-MM-DD')` introduces, which can roll the day across timezones).
const parseDateKey = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Expand an inclusive [start, end] date-string range to 'YYYY-MM-DD' keys.
const expandRange = (start, end) => {
  const keys = [];
  const s = parseDateKey(start);
  if (!s) return keys;
  const e = end ? parseDateKey(end) : s;
  if (!e) return keys;
  const cur = new Date(s);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(e);
  last.setHours(0, 0, 0, 0);
  let guard = 0; // defensive cap against malformed ranges
  while (cur <= last && guard < 1000) {
    keys.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return keys;
};

/**
 * Parse the raw `timeOff/all` Firestore doc into fast lookup structures.
 * Tolerant of a null/missing doc and missing fields (pre-rollout safe).
 *
 * @param {object|null} timeOffDoc - { holidays: [{date, name}],
 *                                      outOfOffice: [{name, email, start, end, title}] }
 * @returns {{
 *   holidaySet: Set<string>,
 *   oooByEmail: Map<string, Set<string>>,
 *   oooByName: Map<string, Set<string>>,
 *   hasHolidays: boolean,
 * }}
 */
export const parseTimeOff = (timeOffDoc) => {
  const holidaySet = new Set();
  const oooByEmail = new Map();
  const oooByName = new Map();

  if (timeOffDoc && Array.isArray(timeOffDoc.holidays)) {
    timeOffDoc.holidays.forEach((h) => {
      if (h && h.date) holidaySet.add(String(h.date));
    });
  }

  if (timeOffDoc && Array.isArray(timeOffDoc.outOfOffice)) {
    timeOffDoc.outOfOffice.forEach((o) => {
      if (!o) return;
      const keys = expandRange(o.start, o.end);
      if (keys.length === 0) return;

      const addTo = (map, lookupKey) => {
        if (!lookupKey) return;
        let set = map.get(lookupKey);
        if (!set) {
          set = new Set();
          map.set(lookupKey, set);
        }
        keys.forEach((k) => set.add(k));
      };

      addTo(oooByEmail, normalizeEmail(o.email));
      addTo(oooByName, normalizeName(o.name));
    });
  }

  return { holidaySet, oooByEmail, oooByName, hasHolidays: holidaySet.size > 0 };
};

/**
 * Resolve the firm-holiday date-key set for the spanned years.
 *
 * When the synced doc carries holidays, they are the source of truth (the user's
 * "replace holidays" choice). Otherwise fall back to the hardcoded US federal
 * holidays for each spanned year, so behavior is unchanged before the sync ships.
 *
 * (isBusinessDay also excludes federal holidays independently, so a federal
 * holiday the firm works can't be "un-excluded" while it remains in isBusinessDay
 * — an accepted limitation; see FirestoreSchema.md.)
 */
export const getHolidaySet = (parsed, startDate, endDate) => {
  if (parsed && parsed.hasHolidays) return parsed.holidaySet;

  const set = new Set();
  if (!startDate || !endDate) return set;
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  for (let y = startYear; y <= endYear; y++) {
    getUSFederalHolidays(y).forEach((d) => set.add(toDateKey(d)));
  }
  return set;
};

/**
 * The OOO date-key set for a person, joined by email first (exact, normalized),
 * then by name (exact, normalized). Returns an empty Set when nothing matches.
 *
 * There is no nickname resolution here — canonicalize the display name/email in
 * the sync (Apps Script) so the dashboard only does exact normalized matching.
 */
export const getOooSetFor = (parsed, { name, email } = {}) => {
  if (!parsed) return new Set();
  const byEmail = email ? parsed.oooByEmail.get(normalizeEmail(email)) : null;
  if (byEmail) return byEmail;
  const byName = name ? parsed.oooByName.get(normalizeName(name)) : null;
  return byName || new Set();
};

/**
 * Count business-day OOO and holidays within [startDate, endDate] for a person,
 * for UI context messaging. Counts weekdays (Mon–Fri) only; holidays take
 * precedence over OOO so the two never double-count.
 *
 * Optional precomputed sets avoid redundant work when called in a per-month loop:
 * pass the range-level holidaySet (so federal fallback isn't rebuilt each call)
 * and the person's oooSet.
 *
 * @returns {{ oooBusinessDays: number, holidayBusinessDays: number }}
 */
export const countTimeOffInRange = (
  parsed,
  person,
  startDate,
  endDate,
  holidaySetOverride = null,
  oooSetOverride = null,
) => {
  let oooBusinessDays = 0;
  let holidayBusinessDays = 0;
  if (!startDate || !endDate) return { oooBusinessDays, holidayBusinessDays };

  const holidaySet = holidaySetOverride || getHolidaySet(parsed, startDate, endDate);
  const oooSet = oooSetOverride || getOooSetFor(parsed, person || {});

  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(endDate);
  last.setHours(0, 0, 0, 0);

  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      const key = toDateKey(cur);
      if (holidaySet && holidaySet.has(key)) holidayBusinessDays++;
      else if (oooSet && oooSet.has(key)) oooBusinessDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { oooBusinessDays, holidayBusinessDays };
};
