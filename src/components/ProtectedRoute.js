"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  allowedAttorneyName = null // If set, only this attorney (or admins) can access
}) {
  const { user, isAdmin, isAuthorized, loading, userAttorneyName } = useAuth();
  const router = useRouter();

  // Check if user can access this attorney's page
  const canAccessAttorneyPage = () => {
    if (isAdmin) return true;
    if (!allowedAttorneyName) return true;
    return userAttorneyName?.toLowerCase() === allowedAttorneyName?.toLowerCase();
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
        // Redirect non-admins to their own attorney page
        if (userAttorneyName) {
          router.push(`/attorneys/${encodeURIComponent(userAttorneyName)}`);
        } else {
          router.push('/login?error=access_denied');
        }
      }
    }
  }, [user, isAdmin, isAuthorized, loading, router, requireAdmin, allowedAttorneyName, userAttorneyName]);

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