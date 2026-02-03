import { useMemo } from 'react';
import { useFirestoreCache } from '@/context/FirestoreDataContext';

/**
 * Normalize entry data to handle both old and new field names
 * New format:
 * - billableHours (was: hours)
 * - opsHours (was: secondaryHours)
 * - billableDate, opsDate (new timestamp fields)
 * - billablesEarnings (new)
 * - opsCategory (new)
 */
export const normalizeEntry = (entryData, attorneyId) => {
  // Handle billable hours - prefer new field name, fallback to old
  const billableHours = parseFloat(entryData.billableHours) || parseFloat(entryData.hours) || 0;

  // Handle ops hours - prefer new field name, fallback to old
  const opsHours = parseFloat(entryData.opsHours) || parseFloat(entryData.secondaryHours) || 0;

  // Total hours combines both
  const totalHours = billableHours + opsHours;

  // Determine if this entry has ops work
  const hasOps = opsHours > 0 || (entryData.ops && entryData.ops !== '' && entryData.ops !== 'null');

  return {
    ...entryData,
    attorneyId,
    // Normalized hour fields
    billableHours,
    opsHours,
    totalHours,
    hasOps,
    // Keep legacy field names for backward compatibility
    hours: billableHours,
    secondaryHours: opsHours,
    // Ensure other fields have defaults
    billablesEarnings: parseFloat(entryData.billablesEarnings) || 0,
    billingCategory: entryData.billingCategory || entryData.category || 'Other',
    opsCategory: entryData.opsCategory || '',
    client: entryData.client || entryData.company || 'Unknown',
    ops: entryData.ops || '',
    notes: entryData.notes || '',
    month: entryData.month || '',
    year: entryData.year || new Date().getFullYear(),
  };
};

/**
 * Get all time entries from the shared cache.
 * Optionally filter by year/month.
 */
export const useAllTimeEntries = (filters = {}) => {
  const { allEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    let entries = allEntries;
    if (filters.year) {
      entries = entries.filter(e => e.year === filters.year);
    }
    if (filters.month) {
      entries = entries.filter(e => e.month === filters.month);
    }
    return entries;
  }, [allEntries, filters.year, filters.month]);

  return { data, loading, error };
};

/**
 * Get all attorneys from the shared cache.
 */
export const useAttorneys = () => {
  const { attorneys, loading, error } = useFirestoreCache();
  return { attorneys, loading, error };
};

/**
 * Get all clients from the shared cache.
 */
export const useClients = () => {
  const { clients, loading, error } = useFirestoreCache();
  return { clients, loading, error };
};

/**
 * Get entries for a specific attorney from the shared cache.
 */
export const useAttorneyEntries = (attorneyId) => {
  const { allEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    if (!attorneyId) return [];
    return allEntries.filter(e => e.attorneyId === attorneyId);
  }, [allEntries, attorneyId]);

  return { data, loading, error };
};
