"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirestoreCache } from '@/context/FirestoreDataContext';

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  allowedAttorneyName = null // If set, only this attorney (or admins) can access
}) {
  const { user, isAdmin, isAuthorized, loading, userEmail } = useAuth();
  const { users } = useFirestoreCache();
  const router = useRouter();

  // Check if the logged-in user's email matches the email on this attorney's user doc
  const canAccessAttorneyPage = () => {
    if (isAdmin) return true;
    if (!allowedAttorneyName) return true;
    if (!userEmail) return false;

    // Find the user doc for this attorney page and compare emails
    const attorneyUser = users.find(u => (u.name || u.id) === allowedAttorneyName);
    if (!attorneyUser || !attorneyUser.email) return false;

    return attorneyUser.email.toLowerCase() === userEmail;
  };

  useEffect(() => {
    if (!loading) {
      // Redirect if: no user, anonymous user, or not authorized
      if (!user || user.isAnonymous || !isAuthorized) {
        router.push('/login');
        return;
      }

      // If admin is required but user is not admin
      if (requireAdmin && !isAdmin) {
        router.push('/login?error=admin_required');
        return;
      }

      // If trying to access another attorney's page
      if (allowedAttorneyName && !canAccessAttorneyPage()) {
        router.push('/login?error=access_denied');
      }
    }
  }, [user, isAdmin, isAuthorized, loading, router, requireAdmin, allowedAttorneyName, userEmail, users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated properly
  if (!user || user.isAnonymous || !isAuthorized) {
    return null;
  }

  // Don't render if admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return null;
  }

  // Don't render if trying to access another attorney's page
  if (allowedAttorneyName && !canAccessAttorneyPage()) {
    return null;
  }

  return children;
}
