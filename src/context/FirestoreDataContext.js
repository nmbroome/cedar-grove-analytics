"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';
import { useAuth } from './AuthContext';
import { normalizeEntry } from '@/hooks/useFirestoreData';

const FirestoreDataContext = createContext({});

export const useFirestoreCache = () => useContext(FirestoreDataContext);

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const FirestoreDataProvider = ({ children }) => {
  const [allEntries, setAllEntries] = useState([]);
  const [attorneys, setAttorneys] = useState([]);
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

      const [entriesSnap, attorneysSnap, clientsSnap, ratesSnap, targetsSnap] = await Promise.all([
        getDocs(collectionGroup(db, 'entries')),
        getDocs(collection(db, 'attorneys')),
        getDocs(collection(db, 'clients')),
        getDocs(collectionGroup(db, 'rates')),
        getDocs(collectionGroup(db, 'targets')),
      ]);

      // Process entries
      const entries = entriesSnap.docs.map(doc => {
        const pathParts = doc.ref.path.split('/');
        const attorneyId = pathParts[1];
        return { id: doc.id, ...normalizeEntry(doc.data(), attorneyId) };
      });

      // Process attorneys
      let attorneyList;
      if (!attorneysSnap.empty) {
        attorneyList = attorneysSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.id,
          ...doc.data()
        }));
      } else {
        // Fallback: derive from entries
        const attorneyMap = {};
        entries.forEach(entry => {
          if (entry.attorneyId && !attorneyMap[entry.attorneyId]) {
            attorneyMap[entry.attorneyId] = { id: entry.attorneyId, name: entry.attorneyId };
          }
        });
        attorneyList = Object.values(attorneyMap).sort((a, b) => a.name.localeCompare(b.name));
      }

      // Process clients
      const clientList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process rates via collectionGroup
      const ratesMap = {};
      ratesSnap.docs.forEach(doc => {
        const pathParts = doc.ref.path.split('/');
        const attorneyName = pathParts[1];
        if (!ratesMap[attorneyName]) ratesMap[attorneyName] = {};
        const data = doc.data();
        ratesMap[attorneyName][doc.id] = {
          billableRate: data.billableRate || 0,
          month: data.month,
          year: data.year,
        };
      });

      // Process targets via collectionGroup
      const targetsMap = {};
      targetsSnap.docs.forEach(doc => {
        const pathParts = doc.ref.path.split('/');
        const attorneyName = pathParts[1];
        if (!targetsMap[attorneyName]) targetsMap[attorneyName] = {};
        const data = doc.data();
        targetsMap[attorneyName][doc.id] = {
          billableTarget: data.billableTarget ?? 100,
          opsTarget: data.opsTarget ?? 50,
          totalTarget: data.totalTarget ?? 150,
        };
      });

      setAllEntries(entries);
      setAttorneys(attorneyList);
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
    allEntries,
    attorneys,
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
