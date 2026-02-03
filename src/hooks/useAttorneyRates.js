"use client";

import { useMemo, useCallback } from 'react';
import { useFirestoreCache } from '@/context/FirestoreDataContext';

/**
 * Hook to get all attorney billing rates from the shared cache.
 * Returns a map of attorneyName -> { monthKey -> rate }
 */
export function useAttorneyRates() {
  const { allRates, loading, error } = useFirestoreCache();

  const getRate = useCallback((attorneyName, date) => {
    if (!attorneyName || !allRates[attorneyName]) {
      return 0;
    }

    let dateObj;

    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && date.toDate) {
      dateObj = date.toDate();
    } else {
      return 0;
    }

    if (isNaN(dateObj.getTime())) {
      return 0;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const rate = allRates[attorneyName]?.[monthKey]?.billableRate;
    return rate || 0;
  }, [allRates]);

  const calculateGrossBillables = useCallback((entry) => {
    const attorneyName = entry.attorneyId;
    const billableHours = entry.billableHours || 0;

    if (!attorneyName || billableHours <= 0) return 0;

    let entryDate = entry.billableDate || entry.opsDate || entry.date;

    // Handle Firestore Timestamp
    if (entryDate && typeof entryDate === 'object' && entryDate.toDate) {
      entryDate = entryDate.toDate();
    } else if (entryDate && typeof entryDate === 'object' && entryDate.seconds) {
      entryDate = new Date(entryDate.seconds * 1000);
    }

    if (!entryDate) return 0;

    const rate = getRate(attorneyName, entryDate);
    return rate * billableHours;
  }, [getRate]);

  return {
    rates: allRates,
    loading,
    error,
    getRate,
    calculateGrossBillables,
  };
}

/**
 * Hook to get rates for a specific attorney from the shared cache.
 */
export function useAttorneyRatesByName(attorneyName) {
  const { allRates, loading, error } = useFirestoreCache();

  const rates = useMemo(() => {
    if (!attorneyName || !allRates[attorneyName]) return {};
    return allRates[attorneyName];
  }, [allRates, attorneyName]);

  const getRate = useCallback((date) => {
    let dateObj;

    if (date && typeof date === 'object' && date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date && typeof date === 'object' && date.toDate) {
      dateObj = date.toDate();
    } else {
      return 0;
    }

    if (isNaN(dateObj.getTime())) {
      return 0;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return rates[monthKey]?.billableRate || 0;
  }, [rates]);

  return {
    rates,
    loading,
    error,
    getRate,
  };
}

export default useAttorneyRates;
