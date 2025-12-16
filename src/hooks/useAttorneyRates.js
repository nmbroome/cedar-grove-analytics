"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

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
        
        // First, get all attorneys
        const attorneysSnapshot = await getDocs(collection(db, 'attorneys'));
        const ratesMap = {};

        // For each attorney, fetch their rates subcollection
        await Promise.all(
          attorneysSnapshot.docs.map(async (attorneyDoc) => {
            const attorneyName = attorneyDoc.id;
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
   * @param {Date|string} date - The date to get the rate for
   * @returns {number} The billing rate, or 0 if not found
   */
  const getRate = (attorneyName, date) => {
    if (!rates[attorneyName]) return 0;
    
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return 0;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return rates[attorneyName]?.[monthKey]?.billableRate || 0;
  };

  /**
   * Calculate gross billables for an entry using the attorney's rate
   * @param {Object} entry - The time entry with attorneyId, billableHours, and date info
   * @returns {number} The gross billable amount (rate * hours)
   */
  const calculateGrossBillables = (entry) => {
    const attorneyName = entry.attorneyId;
    const billableHours = entry.billableHours || 0;
    
    if (!attorneyName || billableHours <= 0) return 0;

    // Get the date from the entry
    const entryDate = entry.billableDate || entry.opsDate || entry.date;
    if (!entryDate) return 0;

    const rate = getRate(attorneyName, entryDate);
    return rate * billableHours;
  };

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
   * @param {Date|string} date - The date to get the rate for
   * @returns {number} The billing rate, or 0 if not found
   */
  const getRate = (date) => {
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return 0;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    return rates[monthKey]?.billableRate || 0;
  };

  return {
    rates,
    loading,
    error,
    getRate,
  };
}

export default useAttorneyRates;