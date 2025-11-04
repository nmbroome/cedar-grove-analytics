import { useState, useEffect } from 'react';
import { collection, getDocs, collectionGroup, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

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
            attorneyId: attorneyId,
            ...entryData
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
        const querySnapshot = await getDocs(collection(db, 'attorneys'));
        const attorneyList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAttorneys(attorneyList);
      } catch (err) {
        console.error('Error fetching attorneys:', err);
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
        const entriesRef = collection(db, 'attorneys', attorneyId, 'entries');
        const querySnapshot = await getDocs(entriesRef);
        
        const entries = querySnapshot.docs.map(doc => ({
          id: doc.id,
          attorneyId: attorneyId,
          ...doc.data()
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