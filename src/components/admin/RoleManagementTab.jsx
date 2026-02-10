"use client";

import React, { useState, useEffect } from 'react';
import { Save, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';

const EMPLOYMENT_TYPES = ['FTE', 'PTE'];

const buildEditsFromUsers = (users) => {
  const edits = {};
  if (users && users.length > 0) {
    users.forEach(u => {
      edits[u.id] = {
        email: u.email || '',
        role: u.role || 'Attorney',
        employmentType: u.employmentType || 'FTE',
        isDirty: false,
      };
    });
  }
  return edits;
};

const RoleManagementTab = ({ users, refetch }) => {
  const [roleEdits, setRoleEdits] = useState(() => buildEditsFromUsers(users));
  const [savingUser, setSavingUser] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Re-sync edits when users change (e.g. after refetch)
  useEffect(() => {
    setRoleEdits(buildEditsFromUsers(users));
  }, [users]);

  const handleChange = (userId, field, value) => {
    setRoleEdits(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  const handleSaveIndividual = async (userId) => {
    const edits = roleEdits[userId];
    if (!edits) return;

    try {
      setSavingUser(userId);
      await waitForAuth();

      await updateDoc(doc(db, 'users', userId), {
        email: edits.email,
        role: edits.role,
        employmentType: edits.employmentType,
      });

      setRoleEdits(prev => ({
        ...prev,
        [userId]: { ...prev[userId], isDirty: false },
      }));

      await refetch();
    } catch (error) {
      console.error('Error saving role:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSavingUser(null);
    }
  };

  const handleSaveAll = async () => {
    const dirtyUsers = Object.entries(roleEdits).filter(([, edits]) => edits.isDirty);
    if (dirtyUsers.length === 0) return;

    try {
      setSavingAll(true);
      setSaveStatus(null);
      await waitForAuth();

      for (const [userId, edits] of dirtyUsers) {
        await updateDoc(doc(db, 'users', userId), {
          email: edits.email,
          role: edits.role,
          employmentType: edits.employmentType,
        });
      }

      setRoleEdits(prev => {
        const updated = { ...prev };
        dirtyUsers.forEach(([userId]) => {
          updated[userId] = { ...updated[userId], isDirty: false };
        });
        return updated;
      });

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
      await refetch();
    } catch (error) {
      console.error('Error saving roles:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSavingAll(false);
    }
  };

  const hasDirtyEdits = Object.values(roleEdits).some(e => e.isDirty);

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="text-gray-900 text-xl mb-4">No team members found</div>
          <div className="text-gray-600">No users found in the database.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {saveStatus && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 ${saveStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {saveStatus === 'success' ? (<><CheckCircle className="w-5 h-5" /><span>Roles and employment types saved successfully!</span></>) : (<><AlertCircle className="w-5 h-5" /><span>Error saving changes. Please try again.</span></>)}
        </div>
      )}

      {/* Save All Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{users.length} team member{users.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={savingAll || !hasDirtyEdits}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            savingAll || !hasDirtyEdits
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {savingAll ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Saving...</span></>
          ) : (
            <><Save className="w-4 h-4" /><span>Save All Changes</span></>
          )}
        </button>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employment Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const edits = roleEdits[user.id] || { email: user.email || '', role: user.role || 'Attorney', employmentType: user.employmentType || 'FTE', isDirty: false };
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.name || user.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="email"
                      value={edits.email}
                      onChange={(e) => handleChange(user.id, 'email', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="user@example.com"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={edits.role}
                      onChange={(e) => handleChange(user.id, 'role', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="e.g. Attorney"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={edits.employmentType}
                      onChange={(e) => handleChange(user.id, 'employmentType', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                    >
                      {EMPLOYMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {edits.isDirty ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Unsaved</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Saved</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSaveIndividual(user.id)}
                      disabled={savingUser === user.id || !edits.isDirty}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        !edits.isDirty
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : savingUser === user.id
                            ? 'bg-blue-100 text-blue-400 cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {savingUser === user.id ? (
                        <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Saving...</>
                      ) : (
                        <><Save className="w-3 h-3" />Save</>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoleManagementTab;
