"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestoreCache } from '@/context/FirestoreDataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import CedarGroveAnalytics from '@/components/AnalyticsDashboard';

function DashboardContent() {
  const { isAdmin, loading, userEmail, isAuthorized, hasDownloadsAccess, hasTransactionsOpsAccess, signOut } = useAuth();
  const { users, loading: usersLoading } = useFirestoreCache();
  const router = useRouter();
  const [matchedAttorneyName, setMatchedAttorneyName] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading || usersLoading || !isAuthorized || isAdmin || hasDownloadsAccess || hasTransactionsOpsAccess) {
      setChecked(true);
      return;
    }

    if (!userEmail || !users || users.length === 0) {
      setChecked(true);
      return;
    }

    // Find user doc whose email matches the logged-in user's email
    const matchedUser = users.find(
      u => u.email && u.email.toLowerCase() === userEmail
    );

    if (matchedUser) {
      setMatchedAttorneyName(matchedUser.name || matchedUser.id);
    }

    setChecked(true);
  }, [loading, usersLoading, isAdmin, hasDownloadsAccess, hasTransactionsOpsAccess, userEmail, isAuthorized, users]);

  useEffect(() => {
    // Redirect non-admins to their attorney page once we've found a match
    if (checked && isAuthorized && !isAdmin && !hasDownloadsAccess && !hasTransactionsOpsAccess && matchedAttorneyName) {
      router.push(`/users/${encodeURIComponent(matchedAttorneyName)}`);
    }
  }, [checked, isAdmin, hasDownloadsAccess, hasTransactionsOpsAccess, matchedAttorneyName, isAuthorized, router]);

  // Show loading while checking or redirecting
  if (loading || usersLoading || !checked || (!isAdmin && !hasDownloadsAccess && !hasTransactionsOpsAccess && matchedAttorneyName)) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  // Downloads-access users see the dashboard restricted to Downloads tab only
  if (!isAdmin && hasDownloadsAccess) {
    return <CedarGroveAnalytics downloadsOnly />;
  }

  // Transactions+Ops access users see the dashboard restricted to those tabs
  if (!isAdmin && hasTransactionsOpsAccess) {
    return <CedarGroveAnalytics transactionsOpsOnly />;
  }

  // Non-admins without a matched attorney page see a simple message
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-gray-700">No attorney profile found for your account.</div>
          <div className="mt-2 text-gray-500">Contact an administrator for assistance.</div>
          <button
            onClick={async () => { await signOut(); router.push('/login'); }}
            className="mt-6 px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
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
