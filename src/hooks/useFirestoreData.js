import { useState, useEffect } from 'react';
import { collection, getDocs, collectionGroup, query, where } from 'firebase/firestore';
import { db, waitForAuth } from '../firebase/config';

/**
 * Normalize entry data to handle both old and new field names
 * New format:
 * - billableHours (was: hours)
 * - opsHours (was: secondaryHours)
 * - billableDate, opsDate (new timestamp fields)
 * - billablesEarnings (new)
 * - opsCategory (new)
 */
const normalizeEntry = (entryData, attorneyId) => {
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
 * Fetch all time entries across all attorneys
 * Uses collectionGroup to query the nested 'entries' subcollections
 */
export const useAllTimeEntries = (filters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Wait for authentication before fetching
        await waitForAuth();

        // Use collectionGroup to get all 'entries' across all attorneys
        let q = collectionGroup(db, 'entries');

        // Apply filters if provided
        const constraints = [];
        if (filters.year) {
          constraints.push(where('year', '==', filters.year));
        }
        if (filters.month) {
          constraints.push(where('month', '==', filters.month));
        }

        if (constraints.length > 0) {
          q = query(q, ...constraints);
        }

        const querySnapshot = await getDocs(q);
        const entries = [];

        querySnapshot.docs.forEach(doc => {
          const entryData = doc.data();
          
          // Extract attorney name from the document path
          // Path structure: attorneys/{attorneyId}/entries/{entryId}
          const pathParts = doc.ref.path.split('/');
          const attorneyId = pathParts[1];
          
          entries.push({
            id: doc.id,
            ...normalizeEntry(entryData, attorneyId)
          });
        });

        setData(entries);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
};

/**
 * Fetch all attorneys with their metadata
 */
export const useAttorneys = () => {
  const [attorneys, setAttorneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttorneys = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for authentication before fetching
        console.log('useAttorneys: waiting for auth...');
        const user = await waitForAuth();
        console.log('useAttorneys: auth complete, user:', user?.uid);
        
        console.log('useAttorneys: fetching attorneys collection...');
        const querySnapshot = await getDocs(collection(db, 'attorneys'));
        console.log('useAttorneys: got snapshot, size:', querySnapshot.size);
        
        const attorneyList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('useAttorneys: attorney list:', attorneyList);
        setAttorneys(attorneyList);
      } catch (err) {
        console.error('useAttorneys: Error fetching attorneys:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttorneys();
  }, []);

  return { attorneys, loading, error };
};

/**
 * Fetch all clients from the clients collection
 */
export const useClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        
        // Wait for authentication before fetching
        await waitForAuth();
        
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const clientList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientList);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return { clients, loading, error };
};

/**
 * Fetch entries for a specific attorney
 */
export const useAttorneyEntries = (attorneyId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attorneyId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Wait for authentication before fetching
        await waitForAuth();
        
        const entriesRef = collection(db, 'attorneys', attorneyId, 'entries');
        const querySnapshot = await getDocs(entriesRef);
        
        const entries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...normalizeEntry(doc.data(), attorneyId)
        }));

        setData(entries);
      } catch (err) {
        console.error('Error fetching attorney entries:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [attorneyId]);

  return { data, loading, error };
};