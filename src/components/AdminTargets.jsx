"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useFirestoreData';
import { useFirestoreCache } from '@/context/FirestoreDataContext';
import { filterHiddenAttorneys } from '@/utils/hiddenAttorneys';
import UtilizationTargetsTab from '@/components/admin/UtilizationTargetsTab';

const AdminTargets = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
  const { refetch } = useFirestoreCache();

  const users = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const allNames = allUsers.map(u => u.name || u.id);
    const visibleNames = filterHiddenAttorneys(allNames);
    return allUsers
      .filter(u => visibleNames.includes(u.name || u.id))
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  }, [allUsers]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-gray-600 mb-4">{usersError}</div>
          <Link href="/admin" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Utilization Targets</h1>
                <p className="text-sm text-gray-600">Set monthly billable and ops hour targets for each team member</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-gray-500">{user.email}</div>
                  </div>
                </div>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <UtilizationTargetsTab users={users} usersLoading={usersLoading} refetch={refetch} />
      </div>
    </div>
  );
};

export default AdminTargets;
