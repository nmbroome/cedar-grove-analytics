"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';

/**
 * Hook to fetch all attorney billing rates from Firebase
 * Returns a map of attorneyName -> { monthKey -> rate }
 * 
 * Structure in Firebase:
 * attorneys/{attorneyName}/rates/{monthKey}
 *   └── billableRate: number
 *   └── month: string
 *   └── year: number
 */
export function useAttorneyRates() {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllRates = async () => {
      try {
        setLoading(true);
        
        // Wait for authentication before fetching
        await waitForAuth();
        
        // First, get all attorneys
        const attorneysSnapshot = await getDocs(collection(db, 'attorneys'));
        const ratesMap = {};

        // For each attorney, fetch their rates subcollection
        await Promise.all(
          attorneysSnapshot.docs.map(async (attorneyDoc) => {
            const attorneyName = attorneyDoc.id;
            
            try {
              const ratesSnapshot = await getDocs(
                collection(db, 'attorneys', attorneyName, 'rates')
              );

              if (!ratesMap[attorneyName]) {
                ratesMap[attorneyName] = {};
              }

              ratesSnapshot.docs.forEach((rateDoc) => {
                const data = rateDoc.data();
                const monthKey = rateDoc.id; // e.g., "2024-12"
                ratesMap[attorneyName][monthKey] = {
                  billableRate: data.billableRate || 0,
                  month: data.month,
                  year: data.year,
                };
              });
            } catch (rateErr) {
              // Attorney may not have rates subcollection yet
              console.log(`No rates found for ${attorneyName}`);
            }
          })
        );

        setRates(ratesMap);
        setError(null);
      } catch (err) {
        console.error('Error fetching attorney rates:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRates();
  }, []);

  /**
   * Get the billing rate for a specific attorney and month
   * @param {string} attorneyName - The attorney's name
   * @param {Date|string|object} date - The date to get the rate for (can be Date, string, or Firestore Timestamp)
   * @returns {number} The billing rate, or 0 if not found
   */
  const getRate = useCallback((attorneyName, date) => {
    if (!attorneyName || !rates[attorneyName]) {
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
      // Firestore Timestamp with toDate method
      dateObj = date.toDate();
    } else {
      return 0;
    }

    // Validate the date
    if (isNaN(dateObj.getTime())) {
      return 0;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const rate = rates[attorneyName]?.[monthKey]?.billableRate;
    
    return rate || 0;
  }, [rates]);

  /**
   * Calculate gross billables for an entry using the attorney's rate
   * @param {Object} entry - The time entry with attorneyId, billableHours, and date info
   * @returns {number} The gross billable amount (rate * hours)
   */
  const calculateGrossBillables = useCallback((entry) => {
    const attorneyName = entry.attorneyId;
    const billableHours = entry.billableHours || 0;
    
    if (!attorneyName || billableHours <= 0) return 0;

    // Get the date from the entry - try multiple fields
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
    rates,
    loading,
    error,
    getRate,
    calculateGrossBillables,
  };
}

/**
 * Hook to fetch rates for a specific attorney
 * @param {string} attorneyName - The attorney's name
 */
export function useAttorneyRatesByName(attorneyName) {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attorneyName) {
      setLoading(false);
      return;
    }

    const fetchRates = async () => {
      try {
        setLoading(true);
        
        // Wait for authentication before fetching
        await waitForAuth();
        
        const ratesSnapshot = await getDocs(
          collection(db, 'attorneys', attorneyName, 'rates')
        );

        const ratesMap = {};
        ratesSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          ratesMap[doc.id] = {
            billableRate: data.billableRate || 0,
            month: data.month,
            year: data.year,
          };
        });

        setRates(ratesMap);
        setError(null);
      } catch (err) {
        console.error(`Error fetching rates for ${attorneyName}:`, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [attorneyName]);

  /**
   * Get the billing rate for a specific month
   * @param {Date|string|object} date - The date to get the rate for
   * @returns {number} The billing rate, or 0 if not found
   */
  const getRate = useCallback((date) => {
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