"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect if: no user, anonymous user, or not an admin
      if (!user || user.isAnonymous || !isAdmin) {
        router.push('/login');
      }
    }
  }, [user, isAdmin, loading, router]);

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
  if (!user || user.isAnonymous || !isAdmin) {
    return null;
  }

  return children;
}