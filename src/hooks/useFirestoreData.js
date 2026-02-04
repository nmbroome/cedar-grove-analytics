import { useMemo } from 'react';
import { useFirestoreCache } from '@/context/FirestoreDataContext';

/**
 * Normalize a billable entry from the new schema.
 * New schema fields: client, date, hours, earnings, billingCategory, matter, reimbursements, notes, sheetRowNumber
 * Normalized output adds: userId, billableHours, month, year
 */
export const normalizeBillableEntry = (entryData, userId, month, year) => {
  const billableHours = parseFloat(entryData.hours) || 0;
  const earnings = parseFloat(entryData.earnings) || 0;

  return {
    ...entryData,
    userId,
    billableHours,
    earnings,
    billingCategory: entryData.billingCategory || 'Other',
    client: entryData.client || 'Unknown',
    matter: entryData.matter || '',
    reimbursements: parseFloat(entryData.reimbursements) || 0,
    notes: entryData.notes || '',
    month: month || '',
    year: year || new Date().getFullYear(),
  };
};

/**
 * Normalize an ops entry from the new schema.
 * New schema fields: description, date, hours, category, sheetRowNumber
 * Normalized output adds: userId, opsHours, month, year
 */
export const normalizeOpsEntry = (entryData, userId, month, year) => {
  const opsHours = parseFloat(entryData.hours) || 0;

  return {
    ...entryData,
    userId,
    opsHours,
    description: entryData.description || '',
    category: entryData.category || 'Other',
    notes: entryData.description || '',
    month: month || '',
    year: year || new Date().getFullYear(),
  };
};

/**
 * Get all billable entries from the shared cache.
 * Optionally filter by year/month.
 */
export const useAllBillableEntries = (filters = {}) => {
  const { allBillableEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    let entries = allBillableEntries;
    if (filters.year) {
      entries = entries.filter(e => e.year === filters.year);
    }
    if (filters.month) {
      entries = entries.filter(e => e.month === filters.month);
    }
    return entries;
  }, [allBillableEntries, filters.year, filters.month]);

  return { data, loading, error };
};

/**
 * Get all ops entries from the shared cache.
 * Optionally filter by year/month.
 */
export const useAllOpsEntries = (filters = {}) => {
  const { allOpsEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    let entries = allOpsEntries;
    if (filters.year) {
      entries = entries.filter(e => e.year === filters.year);
    }
    if (filters.month) {
      entries = entries.filter(e => e.month === filters.month);
    }
    return entries;
  }, [allOpsEntries, filters.year, filters.month]);

  return { data, loading, error };
};

/**
 * Get all users from the shared cache.
 */
export const useUsers = () => {
  const { users, loading, error } = useFirestoreCache();
  return { users, loading, error };
};

/**
 * Get all clients from the shared cache.
 */
export const useClients = () => {
  const { clients, loading, error } = useFirestoreCache();
  return { clients, loading, error };
};

/**
 * Get billable entries for a specific user from the shared cache.
 */
export const useUserBillableEntries = (userId) => {
  const { allBillableEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    if (!userId) return [];
    return allBillableEntries.filter(e => e.userId === userId);
  }, [allBillableEntries, userId]);

  return { data, loading, error };
};

/**
 * Get ops entries for a specific user from the shared cache.
 */
export const useUserOpsEntries = (userId) => {
  const { allOpsEntries, loading, error } = useFirestoreCache();

  const data = useMemo(() => {
    if (!userId) return [];
    return allOpsEntries.filter(e => e.userId === userId);
  }, [allOpsEntries, userId]);

  return { data, loading, error };
};
