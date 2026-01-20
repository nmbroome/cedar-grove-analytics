"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Calendar, Users, Target, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';
import { useAllTimeEntries } from '@/hooks/useFirestoreData';
import { useAuth } from '@/context/AuthContext';
import { getPersonRole } from '@/utils/roles';
import { filterHiddenAttorneys } from '@/utils/hiddenAttorneys';

const AdminTargets = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Use entries to derive attorney list instead of useAttorneys
  const { data: allEntries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  
  // Derive unique attorneys from entries, then filter out hidden ones
  const attorneys = useMemo(() => {
    if (!allEntries || allEntries.length === 0) return [];
    
    const attorneyMap = new Map();
    allEntries.forEach(entry => {
      const id = entry.attorneyId;
      if (id && !attorneyMap.has(id)) {
        attorneyMap.set(id, {
          id: id,
          name: id
        });
      }
    });
    
    // Get all attorney names and filter out hidden ones
    const allAttorneyNames = Array.from(attorneyMap.keys());
    const visibleAttorneyNames = filterHiddenAttorneys(allAttorneyNames);
    
    // Return only visible attorneys
    return visibleAttorneyNames.map(name => ({
      id: name,
      name: name
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEntries]);

  // Calculate role breakdown for display
  const roleBreakdown = useMemo(() => {
    if (!attorneys || attorneys.length === 0) return '';
    
    const roleCounts = {};
    attorneys.forEach(attorney => {
      const role = getPersonRole(attorney.name);
      if (!roleCounts[role]) {
        roleCounts[role] = 0;
      }
      roleCounts[role]++;
    });
    
    // Sort roles so "Attorney" comes first, then alphabetically
    const sortedRoles = Object.keys(roleCounts).sort((a, b) => {
      if (a === 'Attorney') return -1;
      if (b === 'Attorney') return 1;
      return a.localeCompare(b);
    });
    
    // Build the display string
    const parts = sortedRoles.map(role => {
      const count = roleCounts[role];
      // Pluralize role names appropriately
      let displayRole = role.toLowerCase();
      if (count !== 1) {
        // Handle pluralization
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
  }, [attorneys]);

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

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Fetch existing targets for the selected month/year
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        setError(null);
        await waitForAuth();

        const targetDocId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        
        // Create default targets from attorneys list
        const defaultTargets = attorneys.map(attorney => ({
          id: `${attorney.id}_${targetDocId}`,
          attorneyId: attorney.id,
          attorneyName: attorney.name || attorney.id,
          year: selectedYear,
          month: selectedMonth,
          billableTarget: 100,
          opsTarget: 50,
          totalTarget: 150,
          isNew: true
        }));

        // Try to fetch existing targets from each attorney's targets subcollection
        const existingTargets = [];
        
        for (const attorney of attorneys) {
          try {
            const targetsSnapshot = await getDocs(collection(db, 'attorneys', attorney.id, 'targets'));
            const monthTarget = targetsSnapshot.docs.find(d => d.id === targetDocId);
            
            if (monthTarget) {
              const data = monthTarget.data();
              existingTargets.push({
                id: `${attorney.id}_${targetDocId}`,
                attorneyId: attorney.id,
                attorneyName: attorney.name || attorney.id,
                year: data.year || selectedYear,
                month: data.month || selectedMonth,
                billableTarget: data.billableTarget ?? 100,
                opsTarget: data.opsTarget ?? 50,
                totalTarget: (data.billableTarget ?? 100) + (data.opsTarget ?? 50),
                isNew: false
              });
            }
          } catch (err) {
            console.log(`No targets found for ${attorney.id}:`, err.message);
          }
        }

        // Merge existing targets with defaults for missing attorneys
        if (existingTargets.length > 0) {
          const existingAttorneyIds = existingTargets.map(t => t.attorneyId);
          const missingTargets = defaultTargets.filter(t => !existingAttorneyIds.includes(t.attorneyId));
          setTargets([...existingTargets, ...missingTargets]);
        } else {
          setTargets(defaultTargets);
        }
      } catch (err) {
        console.error('Error in fetchTargets:', err);
        setError(err.message);
        // Still try to show attorneys with default targets
        const targetDocId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const defaultTargets = attorneys.map(attorney => ({
          id: `${attorney.id}_${targetDocId}`,
          attorneyId: attorney.id,
          attorneyName: attorney.name || attorney.id,
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

    if (!entriesLoading && attorneys.length > 0) {
      fetchTargets();
    } else if (!entriesLoading) {
      setLoading(false);
      setTargets([]);
    }
  }, [selectedYear, selectedMonth, attorneys, entriesLoading]);

  // Update a target value
  const handleTargetChange = (attorneyId, field, value) => {
    setTargets(prev => prev.map(target => {
      if (target.attorneyId === attorneyId) {
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

  // Save all targets
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);
      await waitForAuth();

      const targetDocId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

      for (const target of targets) {
        // First, ensure the attorney parent document exists
        const attorneyDocRef = doc(db, 'attorneys', target.attorneyId);
        await setDoc(attorneyDocRef, {
          name: target.attorneyName,
          updatedAt: new Date()
        }, { merge: true });

        // Then save the target to the targets subcollection
        const targetDocRef = doc(db, 'attorneys', target.attorneyId, 'targets', targetDocId);
        await setDoc(targetDocRef, {
          billableTarget: target.billableTarget,
          opsTarget: target.opsTarget,
          totalTarget: target.totalTarget,
          year: selectedYear,
          month: selectedMonth,
          updatedAt: new Date()
        });
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

  // Save individual attorney target
  const handleSaveIndividual = async (attorneyId) => {
    try {
      setSavingAttorney(attorneyId);
      await waitForAuth();

      const target = targets.find(t => t.attorneyId === attorneyId);
      if (!target) return;

      const targetDocId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

      // First, ensure the attorney parent document exists
      const attorneyDocRef = doc(db, 'attorneys', target.attorneyId);
      await setDoc(attorneyDocRef, {
        name: target.attorneyName,
        updatedAt: new Date()
      }, { merge: true });

      // Then save the target to the targets subcollection
      const targetDocRef = doc(db, 'attorneys', target.attorneyId, 'targets', targetDocId);
      await setDoc(targetDocRef, {
        billableTarget: target.billableTarget,
        opsTarget: target.opsTarget,
        totalTarget: target.totalTarget,
        year: selectedYear,
        month: selectedMonth,
        updatedAt: new Date()
      });

      // Update the target's isNew status
      setTargets(prev => prev.map(t => 
        t.attorneyId === attorneyId ? { ...t, isNew: false } : t
      ));
    } catch (error) {
      console.error('Error saving individual target:', error);
      setError(`Failed to save target for attorney: ${error.message}`);
    } finally {
      setSavingAttorney(null);
    }
  };

  // Copy targets from previous month
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

      const prevTargetDocId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const previousTargets = [];

      for (const attorney of attorneys) {
        try {
          const targetsSnapshot = await getDocs(collection(db, 'attorneys', attorney.id, 'targets'));
          const monthTarget = targetsSnapshot.docs.find(d => d.id === prevTargetDocId);
          
          if (monthTarget) {
            const data = monthTarget.data();
            previousTargets.push({
              attorneyId: attorney.id,
              attorneyName: attorney.name || attorney.id,
              billableTarget: data.billableTarget ?? 100,
              opsTarget: data.opsTarget ?? 50
            });
          }
        } catch (err) {
          console.log(`No previous targets for ${attorney.id}`);
        }
      }

      if (previousTargets.length > 0) {
        const targetDocId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        const copiedTargets = previousTargets.map(t => ({
          id: `${t.attorneyId}_${targetDocId}`,
          attorneyId: t.attorneyId,
          attorneyName: t.attorneyName,
          year: selectedYear,
          month: selectedMonth,
          billableTarget: t.billableTarget,
          opsTarget: t.opsTarget,
          totalTarget: t.billableTarget + t.opsTarget,
          isNew: true
        }));

        const existingAttorneyIds = copiedTargets.map(t => t.attorneyId);
        const missingAttorneys = attorneys.filter(a => !existingAttorneyIds.includes(a.id));
        
        const missingTargets = missingAttorneys.map(attorney => ({
          id: `${attorney.id}_${targetDocId}`,
          attorneyId: attorney.id,
          attorneyName: attorney.name || attorney.id,
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

  // Apply same value to all attorneys for a field
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

  if (loading || entriesLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading targets...</div>
        </div>
      </div>
    );
  }

  if (entriesError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-gray-600 mb-4">{entriesError}</div>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (attorneys.length === 0) {
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
            <div className="text-gray-900 text-xl mb-4">No attorneys found</div>
            <div className="text-gray-600">
              No time entries found in the database. Attorneys are derived from existing time entries.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <p className="text-sm text-gray-600">Set monthly billable and ops hour targets for each attorney</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{user.displayName}</div>
                    <div className="text-gray-500">{user.email}</div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save All Targets</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status Message */}
      {saveStatus && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            saveStatus === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {saveStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Targets saved successfully!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                <span>Error saving targets. Please try again.</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Month/Year Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Select Period:</span>
              </div>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCopyFromPreviousMonth}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Copy from Previous Month</span>
            </button>
          </div>
        </div>

        {/* Quick Apply Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-blue-700">Quick Apply to All:</span>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-600">Billable:</label>
              <input
                type="number"
                placeholder="Hours"
                className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyToAll('billableTarget', e.target.value);
                  }
                }}
              />
              <span className="text-xs text-blue-500">(Enter to apply)</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-600">Ops:</label>
              <input
                type="number"
                placeholder="Hours"
                className="w-20 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyToAll('opsTarget', e.target.value);
                  }
                }}
              />
              <span className="text-xs text-blue-500">(Enter to apply)</span>
            </div>
          </div>
        </div>

        {/* Targets Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                {getMonthLabel()} {selectedYear} Targets
              </h2>
              <span className="text-sm text-gray-500">({roleBreakdown})</span>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attorney
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billable Target (hours)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ops Target (hours)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Target (hours)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {targets
                .sort((a, b) => (a.attorneyName || '').localeCompare(b.attorneyName || ''))
                .map((target) => (
                <tr key={target.attorneyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {target.attorneyName}
                        </span>
                        {getPersonRole(target.attorneyName) !== 'Attorney' && (
                          <div className="text-xs text-gray-500">
                            {getPersonRole(target.attorneyName)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={target.billableTarget || ''}
                      onChange={(e) => handleTargetChange(target.attorneyId, 'billableTarget', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={target.opsTarget || ''}
                      onChange={(e) => handleTargetChange(target.attorneyId, 'opsTarget', e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      min="0"
                      step="1"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">
                        {target.totalTarget || 0}h
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {target.isNew ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Unsaved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Saved
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSaveIndividual(target.attorneyId)}
                      disabled={savingAttorney === target.attorneyId || !target.isNew}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        !target.isNew
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : savingAttorney === target.attorneyId
                            ? 'bg-blue-100 text-blue-400 cursor-wait'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {savingAttorney === target.attorneyId ? (
                        <>
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3" />
                          Save
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary for {getMonthLabel()} {selectedYear}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Billable Target</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {targets.reduce((sum, t) => sum + (t.billableTarget || 0), 0)}h
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Total Ops Target</div>
              <div className="text-2xl font-bold text-green-700 mt-1">
                {targets.reduce((sum, t) => sum + (t.opsTarget || 0), 0)}h
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Combined Total Target</div>
              <div className="text-2xl font-bold text-purple-700 mt-1">
                {targets.reduce((sum, t) => sum + (t.totalTarget || 0), 0)}h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTargets;