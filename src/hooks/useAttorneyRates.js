"use client";

import { useMemo, useCallback } from 'react';
import { useFirestoreCache } from '@/context/FirestoreDataContext';

/**
 * Given a rates map ({ monthKey -> { rate } }) and a target monthKey,
 * returns the rate for that month. If no exact match, falls back to
 * the most recent prior month's rate.
 */
function findRate(ratesMap, monthKey) {
  if (!ratesMap) return 0;

  const exactRate = ratesMap[monthKey]?.rate;
  if (exactRate) return exactRate;

  // Find the most recent month key before the requested one
  const sortedKeys = Object.keys(ratesMap).sort();
  let fallbackKey = null;
  for (const key of sortedKeys) {
    if (key < monthKey) {
      fallbackKey = key;
    } else {
      break;
    }
  }

  return fallbackKey ? (ratesMap[fallbackKey]?.rate || 0) : 0;
}

/**
 * Hook to get all user billing rates from the shared cache.
 * Returns a map of userId -> { monthKey -> rate }
 */
export function useAttorneyRates() {
  const { allRates, loading, error } = useFirestoreCache();

  const getRate = useCallback((userName, date) => {
    if (!userName || !allRates[userName]) {
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

    return findRate(allRates[userName], monthKey);
  }, [allRates]);

  const calculateGrossBillables = useCallback((entry) => {
    const userName = entry.userId;
    const billableHours = entry.billableHours || 0;

    if (!userName || billableHours <= 0) return 0;

    let entryDate = entry.date;

    // Handle Firestore Timestamp
    if (entryDate && typeof entryDate === 'object' && entryDate.toDate) {
      entryDate = entryDate.toDate();
    } else if (entryDate && typeof entryDate === 'object' && entryDate.seconds) {
      entryDate = new Date(entryDate.seconds * 1000);
    }

    if (!entryDate) return 0;

    const rate = getRate(userName, entryDate);
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
 * Hook to get rates for a specific user from the shared cache.
 */
export function useAttorneyRatesByName(userName) {
  const { allRates, loading, error } = useFirestoreCache();

  const rates = useMemo(() => {
    if (!userName || !allRates[userName]) return {};
    return allRates[userName];
  }, [allRates, userName]);

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

    return findRate(rates, monthKey);
  }, [rates]);

  return {
    rates,
    loading,
    error,
    getRate,
  };
}

export default useAttorneyRates;
