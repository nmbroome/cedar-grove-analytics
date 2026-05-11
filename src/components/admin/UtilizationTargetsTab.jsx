"use client";

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Save, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, waitForAuth } from '@/firebase/config';

const MONTHS = [
  { idx: 0, short: 'Jan', long: 'January' },
  { idx: 1, short: 'Feb', long: 'February' },
  { idx: 2, short: 'Mar', long: 'March' },
  { idx: 3, short: 'Apr', long: 'April' },
  { idx: 4, short: 'May', long: 'May' },
  { idx: 5, short: 'Jun', long: 'June' },
  { idx: 6, short: 'Jul', long: 'July' },
  { idx: 7, short: 'Aug', long: 'August' },
  { idx: 8, short: 'Sep', long: 'September' },
  { idx: 9, short: 'Oct', long: 'October' },
  { idx: 10, short: 'Nov', long: 'November' },
  { idx: 11, short: 'Dec', long: 'December' },
];

const YEARS = [2024, 2025, 2026, 2027];

const buildEmptyUserMatrix = () => {
  const matrix = {};
  MONTHS.forEach(m => {
    matrix[m.idx] = { client: '', ops: '' };
  });
  return matrix;
};

const monthTotal = (cell) => {
  const c = parseFloat(cell?.client) || 0;
  const o = parseFloat(cell?.ops) || 0;
  return Math.round((c + o) * 100) / 100;
};

const annualTotal = (userMatrix) =>
  MONTHS.reduce((sum, m) => sum + monthTotal(userMatrix?.[m.idx]), 0);

const TargetTable = ({ title, users, matrix, onChange }) => (
  <div className="bg-white rounded-lg shadow overflow-x-auto">
    <table className="min-w-full text-sm border-collapse">
      <thead className="bg-cg-green text-white">
        <tr>
          <th rowSpan={2} className="px-3 py-2 text-left align-middle whitespace-nowrap border-r border-cg-green/40">
            {title}
          </th>
          {MONTHS.map(m => (
            <th key={m.idx} colSpan={3} className="px-2 py-1 text-center border-l border-cg-green/40 font-semibold">
              {m.short}
            </th>
          ))}
          <th rowSpan={2} className="px-3 py-2 text-right align-middle whitespace-nowrap border-l border-cg-green/40">
            Annual Hours
          </th>
        </tr>
        <tr>
          {MONTHS.map(m => (
            <Fragment key={m.idx}>
              <th className="px-1 py-1 text-[11px] font-normal border-l border-cg-green/40">Client</th>
              <th className="px-1 py-1 text-[11px] font-normal">Ops</th>
              <th className="px-1 py-1 text-[11px] font-normal">Total</th>
            </Fragment>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {users.map(u => {
          const userMatrix = matrix[u.id] || buildEmptyUserMatrix();
          return (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap border-r border-gray-200">
                {u.name || u.id}
              </td>
              {MONTHS.map(m => {
                const cell = userMatrix[m.idx] || { client: '', ops: '' };
                const total = monthTotal(cell);
                return (
                  <Fragment key={m.idx}>
                    <td className="px-1 py-1 border-l border-gray-200">
                      <input
                        type="number"
                        value={cell.client ?? ''}
                        onChange={(e) => onChange(u.id, m.idx, 'client', e.target.value)}
                        className="w-14 px-1 py-1 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-cg-green focus:border-cg-green"
                        min="0"
                        step="1"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={cell.ops ?? ''}
                        onChange={(e) => onChange(u.id, m.idx, 'ops', e.target.value)}
                        className="w-14 px-1 py-1 text-sm text-right border border-gray-200 rounded focus:ring-1 focus:ring-cg-green focus:border-cg-green"
                        min="0"
                        step="1"
                      />
                    </td>
                    <td className="px-1 py-1 text-sm text-right text-gray-700 font-medium">
                      {total || ''}
                    </td>
                  </Fragment>
                );
              })}
              <td className="px-3 py-2 text-right font-semibold text-gray-900 border-l border-gray-200 whitespace-nowrap">
                {annualTotal(userMatrix) || ''}
              </td>
            </tr>
          );
        })}
        {users.length === 0 && (
          <tr>
            <td colSpan={MONTHS.length * 3 + 2} className="px-3 py-4 text-center text-gray-500">
              No members in this group.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const UtilizationTargetsTab = ({ users, usersLoading, refetch }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setSaveStatus(null);
        await waitForAuth();

        const next = {};
        for (const u of users) {
          const userMatrix = buildEmptyUserMatrix();
          try {
            const userDoc = await getDoc(doc(db, 'users', u.id));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const targetsArray = data.targets || [];
              targetsArray.forEach(t => {
                if (t.year !== selectedYear) return;
                const m = MONTHS.find(mm => mm.long === t.month);
                if (!m) return;
                userMatrix[m.idx] = {
                  client: t.billableHours ?? '',
                  ops: t.opsHours ?? '',
                };
              });
            }
          } catch (err) {
            console.log(`No targets for ${u.id}:`, err.message);
          }
          next[u.id] = userMatrix;
        }
        setMatrix(next);
      } catch (err) {
        console.error('Error loading targets:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!usersLoading && users.length > 0) {
      load();
    } else if (!usersLoading) {
      setLoading(false);
      setMatrix({});
    }
  }, [selectedYear, users, usersLoading]);

  const handleChange = (userId, monthIdx, field, value) => {
    setMatrix(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || buildEmptyUserMatrix()),
        [monthIdx]: {
          ...(prev[userId]?.[monthIdx] || { client: '', ops: '' }),
          [field]: value === '' ? '' : value,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus(null);
      await waitForAuth();

      for (const u of users) {
        const userMatrix = matrix[u.id];
        if (!userMatrix) continue;

        const userRef = doc(db, 'users', u.id);
        const userDoc = await getDoc(userRef);
        const data = userDoc.exists() ? userDoc.data() : {};
        const existing = data.targets || [];
        const otherYears = existing.filter(t => t.year !== selectedYear);

        const yearEntries = MONTHS.map(m => {
          const cell = userMatrix[m.idx] || {};
          const billable = parseFloat(cell.client) || 0;
          const ops = parseFloat(cell.ops) || 0;
          return {
            month: m.long,
            year: selectedYear,
            billableHours: billable,
            opsHours: ops,
            totalHours: billable + ops,
            earnings: 0,
          };
        });

        await updateDoc(userRef, { targets: [...otherYears, ...yearEntries] });
      }

      if (refetch) {
        await refetch();
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Error saving targets:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => {
    const pte = [];
    const fte = [];
    const other = [];
    users.forEach(u => {
      const role = u.role || 'Attorney';
      const emp = u.employmentType || 'FTE';
      if (role !== 'Attorney') other.push(u);
      else if (emp === 'PTE') pte.push(u);
      else fte.push(u);
    });
    const byName = (a, b) => (a.name || a.id).localeCompare(b.name || b.id);
    pte.sort(byName);
    fte.sort(byName);
    other.sort(byName);
    return { pte, fte, other };
  }, [users]);

  if (loading || usersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cg-green"></div>
          <div className="mt-4 text-xl text-gray-700">Loading targets...</div>
        </div>
      </div>
    );
  }

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
    <div className="space-y-6">
      {saveStatus && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            saveStatus === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
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
      )}

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cg-green focus:border-transparent bg-white"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <TargetTable title="Attorneys Part-time" users={groups.pte} matrix={matrix} onChange={handleChange} />
      <TargetTable title="Attorneys Full-time" users={groups.fte} matrix={matrix} onChange={handleChange} />
      <TargetTable title="Other" users={groups.other} matrix={matrix} onChange={handleChange} />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium transition-colors ${
            saving
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-cg-green hover:opacity-90 text-white'
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
              <span>Save</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UtilizationTargetsTab;
