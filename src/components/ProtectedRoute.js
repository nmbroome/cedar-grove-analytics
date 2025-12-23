"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  allowedAttorneyName = null // If set, only this attorney (or admins) can access
}) {
  const { user, isAdmin, isAuthorized, loading, userFirstName, getNameVariations } = useAuth();
  const router = useRouter();

  // Check if user can access this attorney's page using nickname variations
  const canAccessAttorneyPage = () => {
    if (isAdmin) return true;
    if (!allowedAttorneyName) return true;
    if (!userFirstName) return false;
    
    // Extract first name from the attorney page parameter (e.g., "Nick Stone" -> "nick")
    const attorneyFirstName = allowedAttorneyName.split(' ')[0].toLowerCase();
    
    // Get all name variations for the user's email first name
    const userNameVariations = getNameVariations(userFirstName);
    
    // Check if the attorney's first name matches any of the user's name variations
    return userNameVariations.includes(attorneyFirstName);
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
        // Redirect non-admins to login with access denied
        router.push('/login?error=access_denied');
      }
    }
  }, [user, isAdmin, isAuthorized, loading, router, requireAdmin, allowedAttorneyName, userFirstName]);

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