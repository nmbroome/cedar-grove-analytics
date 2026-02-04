"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Calendar, Users, Target, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';
import { useUsers } from '@/hooks/useFirestoreData';
import { useAuth } from '@/context/AuthContext';
import { filterHiddenAttorneys } from '@/utils/hiddenAttorneys';

const AdminTargets = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();

  // Filter out hidden users
  const users = useMemo(() => {
    if (!allUsers || allUsers.length === 0) return [];
    const allNames = allUsers.map(u => u.name || u.id);
    const visibleNames = filterHiddenAttorneys(allNames);
    return allUsers
      .filter(u => visibleNames.includes(u.name || u.id))
      .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
  }, [allUsers]);

  // Calculate role breakdown for display
  const roleBreakdown = useMemo(() => {
    if (!users || users.length === 0) return '';

    const roleCounts = {};
    users.forEach(u => {
      const role = u.role || 'Attorney';
      if (!roleCounts[role]) roleCounts[role] = 0;
      roleCounts[role]++;
    });

    const sortedRoles = Object.keys(roleCounts).sort((a, b) => {
      if (a === 'Attorney') return -1;
      if (b === 'Attorney') return 1;
      return a.localeCompare(b);
    });

    const parts = sortedRoles.map(role => {
      const count = roleCounts[role];
      let displayRole = role.toLowerCase();
      if (count !== 1) {
        if (displayRole === 'attorney') {
          displayRole = 'attorneys';
        } else if (displayRole.endsWith('associate')) {
          displayRole = displayRole + 's';
        } else {
          displayRole = displayRole + 's';
        }
      }
      return `${count} ${displayRole}`;
    });

    return parts.join(', ');
  }, [users]);

  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAttorney, setSavingAttorney] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [2024, 2025, 2026];

  const getMonthName = (monthNum) => months.find(m => m.value === monthNum)?.label || '';

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Fetch existing targets for the selected month/year from user profile docs
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        setError(null);
        await waitForAuth();

        const monthName = getMonthName(selectedMonth);

        const defaultTargets = users.map(u => ({
          id: `${u.id}_${selectedYear}_${selectedMonth}`,
          userId: u.id,
          userName: u.name || u.id,
          role: u.role || 'Attorney',
          year: selectedYear,
          month: selectedMonth,
          billableTarget: 100,
          opsTarget: 50,
          totalTarget: 150,
          isNew: true
        }));

        const existingTargets = [];

        for (const u of users) {
          try {
            const userDoc = await getDoc(doc(db, 'users', u.id));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const targetsArray = data.targets || [];
              const monthTarget = targetsArray.find(
                t => t.month === monthName && t.year === selectedYear
              );

              if (monthTarget) {
                existingTargets.push({
                  id: `${u.id}_${selectedYear}_${selectedMonth}`,
                  userId: u.id,
                  userName: u.name || u.id,
                  role: u.role || 'Attorney',
                  year: selectedYear,
                  month: selectedMonth,
                  billableTarget: monthTarget.billableHours ?? 100,
                  opsTarget: monthTarget.opsHours ?? 50,
                  totalTarget: (monthTarget.billableHours ?? 100) + (monthTarget.opsHours ?? 50),
                  isNew: false
                });
              }
            }
          } catch (err) {
            console.log(`No targets found for ${u.id}:`, err.message);
          }
        }

        if (existingTargets.length > 0) {
          const existingUserIds = existingTargets.map(t => t.userId);
          const missingTargets = defaultTargets.filter(t => !existingUserIds.includes(t.userId));
          setTargets([...existingTargets, ...missingTargets]);
        } else {
          setTargets(defaultTargets);
        }
      } catch (err) {
        console.error('Error in fetchTargets:', err);
        setError(err.message);
        const defaultTargets = users.map(u => ({
          id: `${u.id}_${selectedYear}_${selectedMonth}`,
          userId: u.id,
          userName: u.name || u.id,
          role: u.role || 'Attorney',
          year: selectedYear,
          month: selectedMonth,
          billableTarget: 100,
          opsTarget: 50,
          totalTarget: 150,
          isNew: true
        }));
        setTargets(defaultTargets);
      } finally {
        setLoading(false);
      }
    };

    if (!usersLoading && users.length > 0) {
      fetchTargets();
    } else if (!usersLoading) {
      setLoading(false);
      setTargets([]);
    }
  }, [selectedYear, selectedMonth, users, usersLoading]);

  const handleTargetChange = (userId, field, value) => {
    setTargets(prev => prev.map(target => {
      if (target.userId === userId) {
        const numValue = parseFloat(value) || 0;
        const updated = { ...target, [field]: numValue, isNew: true };
        if (field === 'billableTarget' || field === 'opsTarget') {
          updated.totalTarget = (updated.billableTarget || 0) + (updated.opsTarget || 0);
        }
        return updated;
      }
      return target;
    }));
  };

  // Save target to user profile doc by updating the targets[] array
  const saveTargetToFirestore = async (target) => {
    const monthName = getMonthName(target.month);
    const userRef = doc(db, 'users', target.userId);

    const userDoc = await getDoc(userRef);
    const data = userDoc.exists() ? userDoc.data() : {};
    const currentTargets = data.targets || [];

    // Remove existing entry for this month/year, then add the new one
    const filteredTargets = currentTargets.filter(
      t => !(t.month === monthName && t.year === target.year)
    );

    filteredTargets.push({
      month: monthName,
      year: target.year,
      billableHours: target.billableTarget,
      opsHours: target.opsTarget,
      totalHours: target.totalTarget,
      earnings: 0,
    });

    await updateDoc(userRef, { targets: filteredTargets });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);
      await waitForAuth();

      for (const target of targets) {
        await saveTargetToFirestore(target);
      }

      setSaveStatus('success');
      setTargets(prev => prev.map(t => ({ ...t, isNew: false })));
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving targets:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIndividual = async (userId) => {
    try {
      setSavingAttorney(userId);
      await waitForAuth();

      const target = targets.find(t => t.userId === userId);
      if (!target) return;

      await saveTargetToFirestore(target);

      setTargets(prev => prev.map(t =>
        t.userId === userId ? { ...t, isNew: false } : t
      ));
    } catch (error) {
      console.error('Error saving individual target:', error);
      setError(`Failed to save target: ${error.message}`);
    } finally {
      setSavingAttorney(null);
    }
  };

  const handleCopyFromPreviousMonth = async () => {
    try {
      setLoading(true);
      await waitForAuth();

      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = selectedYear - 1;
      }

      const prevMonthName = getMonthName(prevMonth);
      const previousTargets = [];

      for (const u of users) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.id));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const targetsArray = data.targets || [];
            const monthTarget = targetsArray.find(
              t => t.month === prevMonthName && t.year === prevYear
            );

            if (monthTarget) {
              previousTargets.push({
                userId: u.id,
                userName: u.name || u.id,
                role: u.role || 'Attorney',
                billableTarget: monthTarget.billableHours ?? 100,
                opsTarget: monthTarget.opsHours ?? 50
              });
            }
          }
        } catch (err) {
          console.log(`No previous targets for ${u.id}`);
        }
      }

      if (previousTargets.length > 0) {
        const copiedTargets = previousTargets.map(t => ({
          id: `${t.userId}_${selectedYear}_${selectedMonth}`,
          userId: t.userId,
          userName: t.userName,
          role: t.role,
          year: selectedYear,
          month: selectedMonth,
          billableTarget: t.billableTarget,
          opsTarget: t.opsTarget,
          totalTarget: t.billableTarget + t.opsTarget,
          isNew: true
        }));

        const existingUserIds = copiedTargets.map(t => t.userId);
        const missingUsers = users.filter(u => !existingUserIds.includes(u.id));

        const missingTargets = missingUsers.map(u => ({
          id: `${u.id}_${selectedYear}_${selectedMonth}`,
          userId: u.id,
          userName: u.name || u.id,
          role: u.role || 'Attorney',
          year: selectedYear,
          month: selectedMonth,
          billableTarget: 100,
          opsTarget: 50,
          totalTarget: 150,
          isNew: true
        }));

        setTargets([...copiedTargets, ...missingTargets]);
        setSaveStatus(null);
      } else {
        alert(`No targets found for ${months[prevMonth - 1]?.label || prevMonth} ${prevYear}`);
      }
    } catch (error) {
      console.error('Error copying targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToAll = (field, value) => {
    const numValue = parseFloat(value) || 0;
    setTargets(prev => prev.map(target => {
      const updated = { ...target, [field]: numValue, isNew: true };
      if (field === 'billableTarget' || field === 'opsTarget') {
        updated.totalTarget = (updated.billableTarget || 0) + (updated.opsTarget || 0);
      }
      return updated;
    }));
  };

  const getMonthLabel = () => {
    const month = months.find(m => m.value === selectedMonth);
    return month ? month.label : '';
  };

  if (loading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading targets...</div>
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-gray-600 mb-4">{usersError}</div>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <div className="text-gray-900 text-xl mb-4">No team members found</div>
            <div className="text-gray-600">No users found in the database.</div>
          </div>
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
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {saving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Saving...</span></>) : (<><Save className="w-4 h-4" /><span>Save All Targets</span></>)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {saveStatus && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${saveStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {saveStatus === 'success' ? (<><CheckCircle className="w-5 h-5" /><span>Targets saved successfully!</span></>) : (<><AlertCircle className="w-5 h-5" /><span>Error saving targets. Please try again.</span></>)}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Select Period:</span>
              </div>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                {months.map(month => (<option key={month.value} value={month.value}>{month.label}</option>))}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                {years.map(year => (<option key={year} value={year}>{year}</option>))}
              </select>
            </div>
            <button onClick={handleCopyFromPreviousMonth} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              <span>Copy from Previous Month</span>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-blue-700">Quick Apply to All:</span>
            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-600">Billable:</label>
              <input type="number" placeholder="Hours" className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => { if (e.key === 'Enter') handleApplyToAll('billableTarget', e.target.value); }} />
              <span className="text-xs text-blue-500">(Enter to apply)</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-600">Ops:</label>
              <input type="number" placeholder="Hours" className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => { if (e.key === 'Enter') handleApplyToAll('opsTarget', e.target.value); }} />
              <span className="text-xs text-blue-500">(Enter to apply)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">{getMonthLabel()} {selectedYear} Targets</h2>
              <span className="text-sm text-gray-500">({roleBreakdown})</span>
            </div>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Target (hours)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ops Target (hours)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Target (hours)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {targets.sort((a, b) => (a.userName || '').localeCompare(b.userName || '')).map((target) => (
                <tr key={target.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{target.userName}</span>
                        {target.role !== 'Attorney' && (<div className="text-xs text-gray-500">{target.role}</div>)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="number" value={target.billableTarget || ''} onChange={(e) => handleTargetChange(target.userId, 'billableTarget', e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" min="0" step="1" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="number" value={target.opsTarget || ''} onChange={(e) => handleTargetChange(target.userId, 'opsTarget', e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" min="0" step="1" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">{target.totalTarget || 0}h</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {target.isNew ? (<span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Unsaved</span>) : (<span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Saved</span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleSaveIndividual(target.userId)} disabled={savingAttorney === target.userId || !target.isNew} className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${!target.isNew ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : savingAttorney === target.userId ? 'bg-blue-100 text-blue-400 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                      {savingAttorney === target.userId ? (<><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Saving...</>) : (<><Save className="w-3 h-3" />Save</>)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary for {getMonthLabel()} {selectedYear}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Billable Target</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{targets.reduce((sum, t) => sum + (t.billableTarget || 0), 0)}h</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Total Ops Target</div>
              <div className="text-2xl font-bold text-green-700 mt-1">{targets.reduce((sum, t) => sum + (t.opsTarget || 0), 0)}h</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Combined Total Target</div>
              <div className="text-2xl font-bold text-purple-700 mt-1">{targets.reduce((sum, t) => sum + (t.totalTarget || 0), 0)}h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTargets;
