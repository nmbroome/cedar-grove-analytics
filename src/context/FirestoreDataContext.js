"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';
import { useAuth } from './AuthContext';
import { normalizeBillableEntry, normalizeOpsEntry } from '@/hooks/useFirestoreData';
import { getMonthNumber } from '@/utils/dateHelpers';

const FirestoreDataContext = createContext({});

export const useFirestoreCache = () => useContext(FirestoreDataContext);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const FirestoreDataProvider = ({ children }) => {
  const [allBillableEntries, setAllBillableEntries] = useState([]);
  const [allOpsEntries, setAllOpsEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [allRates, setAllRates] = useState({});
  const [allTargets, setAllTargets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastFetchedAt = useRef(null);
  const fetchInProgress = useRef(false);
  const { user, isAuthorized } = useAuth();

  const fetchAllData = useCallback(async (force = false, silent = false) => {
    if (fetchInProgress.current) return;
    if (!force && lastFetchedAt.current && Date.now() - lastFetchedAt.current < CACHE_TTL) {
      return;
    }

    fetchInProgress.current = true;
    if (!silent) setLoading(true);

    try {
      await waitForAuth();

      // Fetch users and clients in parallel
      const [usersSnap, clientsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'clients')),
      ]);

      // Process users and build rates/targets maps from profile arrays
      const userList = [];
      const ratesMap = {};
      const targetsMap = {};

      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        const userId = doc.id;
        const userName = data.name || userId;

        userList.push({
          id: userId,
          name: userName,
          role: data.role || 'Attorney',
          email: data.email || '',
        });

        // Build rates map from user profile rates[] array
        // Key by display name so lookups work consistently across the app
        if (Array.isArray(data.rates)) {
          ratesMap[userName] = {};
          data.rates.forEach(rateEntry => {
            const monthNum = getMonthNumber(rateEntry.month);
            const monthKey = `${rateEntry.year}-${String(monthNum).padStart(2, '0')}`;
            ratesMap[userName][monthKey] = {
              rate: rateEntry.rate || 0,
              month: monthNum,
              year: rateEntry.year,
            };
          });
        }

        // Build targets map from user profile targets[] array
        // Key by display name so lookups work consistently across the app
        if (Array.isArray(data.targets)) {
          targetsMap[userName] = {};
          data.targets.forEach(targetEntry => {
            const monthNum = getMonthNumber(targetEntry.month);
            const monthKey = `${targetEntry.year}-${String(monthNum).padStart(2, '0')}`;
            targetsMap[userName][monthKey] = {
              billableHours: targetEntry.billableHours ?? 100,
              opsHours: targetEntry.opsHours ?? 50,
              totalHours: targetEntry.totalHours ?? 150,
              earnings: targetEntry.earnings ?? 0,
            };
          });
        }
      });

      // Fetch billables and ops subcollections for all users in parallel
      const userIds = usersSnap.docs.map(doc => doc.id);
      const entryFetches = userIds.flatMap(userId => [
        getDocs(collection(db, 'users', userId, 'billables')).then(snap => ({ userId, type: 'billables', snap })),
        getDocs(collection(db, 'users', userId, 'ops')).then(snap => ({ userId, type: 'ops', snap })),
      ]);

      const entryResults = await Promise.all(entryFetches);

      // Process billable and ops entries
      const billableEntries = [];
      const opsEntries = [];

      entryResults.forEach(({ userId, type, snap }) => {
        snap.docs.forEach(doc => {
          const data = doc.data();
          const month = data.month || '';
          const year = data.year || new Date().getFullYear();
          const entries = data.entries || [];

          // Debug: trace David Popkin's data
          const userDoc = usersSnap.docs.find(d => d.id === userId);
          const debugName = userDoc?.data()?.name || userId;
          if (debugName === 'David Popkin') {
            console.log(`[DEBUG] David Popkin ${type} doc: ${doc.id}, month: ${month}, year: ${year}, entries count: ${entries.length}`);
            if (entries.length > 0) {
              console.log(`[DEBUG] First entry sample:`, JSON.stringify(entries[0], (key, val) => {
                if (val && typeof val === 'object' && val.seconds) return `Timestamp(${new Date(val.seconds * 1000).toISOString()})`;
                return val;
              }));
            }
          }

          if (type === 'billables') {
            entries.forEach((entry, idx) => {
              billableEntries.push({
                id: `${userId}_${doc.id}_${idx}`,
                ...normalizeBillableEntry(entry, userId, month, year),
              });
            });
          } else {
            entries.forEach((entry, idx) => {
              opsEntries.push({
                id: `${userId}_${doc.id}_${idx}`,
                ...normalizeOpsEntry(entry, userId, month, year),
              });
            });
          }
        });
      });

      // Process clients
      const clientList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setAllBillableEntries(billableEntries);
      setAllOpsEntries(opsEntries);
      setUsers(userList);
      setClients(clientList);
      setAllRates(ratesMap);
      setAllTargets(targetsMap);
      setError(null);
      lastFetchedAt.current = Date.now();
    } catch (err) {
      console.error('FirestoreDataProvider: Error fetching data:', err);
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Fetch on auth
  useEffect(() => {
    if (isAuthorized && user) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, user, fetchAllData]);

  // Background refresh when tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthorized && lastFetchedAt.current) {
        const age = Date.now() - lastFetchedAt.current;
        if (age > CACHE_TTL) {
          fetchAllData(true, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthorized, fetchAllData]);

  const refetch = useCallback((force = true) => {
    return fetchAllData(force, false);
  }, [fetchAllData]);

  const value = {
    allBillableEntries,
    allOpsEntries,
    users,
    clients,
    allRates,
    allTargets,
    loading,
    error,
    refetch,
  };

  return (
    <FirestoreDataContext.Provider value={value}>
      {children}
    </FirestoreDataContext.Provider>
  );
};
