/**
 * Configuration for attorneys who should be hidden from the UI
 * but whose data should still be included in calculations when their
 * active period overlaps with the selected date range.
 * 
 * Each entry specifies:
 * - name: The attorney's full name (must match exactly)
 * - hideAfter: Date after which they should be hidden from attorney lists
 *              (their data is still included if the date range overlaps their active period)
 */
export const HIDDEN_ATTORNEYS = [
  {
    name: 'Andrew Duble',
    hideAfter: new Date('2025-12-31T23:59:59'), // Hide in 2026 and beyond
  },
  // Add more attorneys here as needed:
  // { name: 'John Doe', hideAfter: new Date('2024-06-30') },
];

/**
 * Check if an attorney should be hidden from the UI based on current date
 * @param {string} attorneyName - The attorney's full name
 * @param {Date} [asOfDate] - The date to check against (defaults to now)
 * @returns {boolean} True if the attorney should be hidden
 */
export const isAttorneyHidden = (attorneyName, asOfDate = new Date()) => {
  const config = HIDDEN_ATTORNEYS.find(a => a.name === attorneyName);
  if (!config) return false;
  return asOfDate > config.hideAfter;
};

/**
 * Check if an attorney's data should be included based on the date range
 * Even if hidden from the UI, their data should be included if the date range
 * overlaps with their active period (before hideAfter)
 * @param {string} attorneyName - The attorney's full name
 * @param {Date} startDate - Start of the date range
 * @param {Date} endDate - End of the date range
 * @returns {boolean} True if the attorney's data should be included
 */
export const shouldIncludeAttorneyData = (attorneyName, startDate, endDate) => {
  const config = HIDDEN_ATTORNEYS.find(a => a.name === attorneyName);
  if (!config) return true; // Not in hidden list, always include
  
  // Include data if any part of the date range is before or at hideAfter
  return startDate <= config.hideAfter;
};

/**
 * Filter a list of attorney names to remove hidden ones (for UI display)
 * @param {string[]} attorneyNames - Array of attorney names
 * @param {Date} [asOfDate] - The date to check against (defaults to now)
 * @returns {string[]} Filtered array with hidden attorneys removed
 */
export const filterHiddenAttorneys = (attorneyNames, asOfDate = new Date()) => {
  return attorneyNames.filter(name => !isAttorneyHidden(name, asOfDate));
};

/**
 * Filter attorney data objects to remove hidden ones (for UI display)
 * @param {Object[]} attorneys - Array of attorney objects with 'name' property
 * @param {Date} [asOfDate] - The date to check against (defaults to now)
 * @returns {Object[]} Filtered array with hidden attorneys removed
 */
export const filterHiddenAttorneyData = (attorneys, asOfDate = new Date()) => {
  return attorneys.filter(a => !isAttorneyHidden(a.name, asOfDate));
};