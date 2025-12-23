"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import CedarGroveAnalytics from '@/components/AnalyticsDashboard';

function DashboardContent() {
  const { isAdmin, loading, userFirstName, isAuthorized, getNameVariations } = useAuth();
  const router = useRouter();
  const [checkingAttorney, setCheckingAttorney] = useState(true);
  const [matchedAttorneyName, setMatchedAttorneyName] = useState(null);

  useEffect(() => {
    const findMatchingAttorney = async () => {
      if (loading || !isAuthorized || isAdmin) {
        setCheckingAttorney(false);
        return;
      }

      if (!userFirstName) {
        setCheckingAttorney(false);
        return;
      }

      try {
        // Get all name variations for the user's email first name
        const nameVariations = getNameVariations(userFirstName);
        
        // Query attorneys collection to find matching attorney
        const attorneysSnapshot = await getDocs(collection(db, 'attorneys'));
        
        let foundAttorney = null;
        attorneysSnapshot.docs.forEach(doc => {
          const attorneyFullName = doc.id; // e.g., "Nick Stone"
          const attorneyFirstName = attorneyFullName.split(' ')[0].toLowerCase();
          
          // Check if any of the user's name variations match the attorney's first name
          if (nameVariations.includes(attorneyFirstName)) {
            foundAttorney = attorneyFullName;
          }
        });

        if (foundAttorney) {
          setMatchedAttorneyName(foundAttorney);
        }
      } catch (error) {
        console.error('Error finding matching attorney:', error);
      } finally {
        setCheckingAttorney(false);
      }
    };

    findMatchingAttorney();
  }, [loading, isAdmin, userFirstName, isAuthorized, getNameVariations]);

  useEffect(() => {
    // Redirect non-admins to their attorney page once we've found a match
    if (!loading && !checkingAttorney && isAuthorized && !isAdmin && matchedAttorneyName) {
      router.push(`/attorneys/${encodeURIComponent(matchedAttorneyName)}`);
    }
  }, [loading, checkingAttorney, isAdmin, matchedAttorneyName, isAuthorized, router]);

  // Show loading while checking or redirecting
  if (loading || checkingAttorney || (!isAdmin && matchedAttorneyName)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  // Only admins see the full dashboard
  return <CedarGroveAnalytics />;
}

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}