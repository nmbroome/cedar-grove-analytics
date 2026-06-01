"use client";

import { useState, useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { useMonthlyMetrics } from '@/hooks/useFirestoreData';
import { getMonthNumber } from '@/utils/dateHelpers';
import { formatCurrency } from '@/utils/formatters';
import { hasBillingSummary, buildSummaryRows, buildWaterfallData } from '@/utils/billingSummary';
import { RevenueWaterfallChart } from '@/components/charts';

// Tailwind classes per row `kind` (from buildSummaryRows).
const labelClass = (kind) => {
  switch (kind) {
    case 'component': return 'pl-8 text-sm text-gray-500';
    case 'subtotal': return 'font-semibold text-cg-black';
    case 'total': return 'font-bold text-cg-black';
    case 'gross': return 'font-semibold text-cg-black';
    default: return 'text-cg-dark'; // subtract
  }
};

const amountClass = (kind) => {
  switch (kind) {
    case 'component': return 'text-sm text-gray-500';
    case 'subtract': return 'text-red-600';
    case 'total': return 'font-bold text-cg-green';
    case 'subtotal': return 'font-semibold text-cg-black';
    case 'gross': return 'font-semibold text-cg-black';
    default: return 'text-cg-black';
  }
};

const rowClass = (kind) => {
  if (kind === 'total') return 'border-t-2 border-gray-300';
  if (kind === 'subtotal') return 'border-t border-gray-200';
  return '';
};

const MonthlyRevenueSummary = () => {
  const { data: monthlyMetrics, loading, error } = useMonthlyMetrics();

  // Months that actually have a full breakdown, most recent first.
  // Independent of the per-client selectors in BillingSummariesView.
  const months = useMemo(() => {
    return (monthlyMetrics || [])
      .filter(hasBillingSummary)
      .map((entry) => {
        const monthNumber = getMonthNumber(entry.month);
        return {
          ...entry,
          monthNumber,
          key: `${entry.year}-${String(monthNumber).padStart(2, '0')}`,
        };
      })
      .sort((a, b) => b.year - a.year || b.monthNumber - a.monthNumber);
  }, [monthlyMetrics]);

  const [selectedKey, setSelectedKey] = useState(null);

  // Default to the most recent month; fall back if the stored key no
  // longer matches the available months.
  const effectiveKey = useMemo(() => {
    if (selectedKey && months.some((m) => m.key === selectedKey)) return selectedKey;
    return months[0]?.key || null;
  }, [selectedKey, months]);

  const selectedEntry = useMemo(
    () => months.find((m) => m.key === effectiveKey) || null,
    [months, effectiveKey]
  );

  const rows = useMemo(() => (selectedEntry ? buildSummaryRows(selectedEntry) : []), [selectedEntry]);
  const waterfall = useMemo(() => (selectedEntry ? buildWaterfallData(selectedEntry) : []), [selectedEntry]);

  const periodLabel = selectedEntry ? `${selectedEntry.month} ${selectedEntry.year}` : '';

  return (
    <div className="space-y-4">
      {/* Section header + month selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cg-green/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-cg-green" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cg-black">Monthly Revenue Reconciliation</h2>
            <p className="text-sm text-cg-dark">Firm-wide billing summary by month</p>
          </div>
        </div>

        {months.length > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cg-dark" />
            <select
              value={effectiveKey || ''}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cg-green focus:border-transparent bg-white"
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.month} {m.year}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-cg-green"></div>
            <div className="mt-4 text-cg-dark">Loading revenue data...</div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">
          Could not load monthly revenue data: {error}
        </div>
      ) : months.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Revenue breakdown not available yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Once the monthly billing summary sync runs, the firm-wide revenue
            reconciliation will populate here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Labeled table mirroring the source sheet */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-cg-black">Billing Summary — {periodLabel}</h3>
            </div>
            <table className="min-w-full">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className={rowClass(row.kind)}>
                    <td className={`px-6 py-3 ${labelClass(row.kind)}`}>{row.label}</td>
                    <td className={`px-6 py-3 text-right tabular-nums ${amountClass(row.kind)}`}>
                      {row.kind === 'subtract'
                        ? `−${formatCurrency(row.value)}`
                        : formatCurrency(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Waterfall chart */}
          <RevenueWaterfallChart data={waterfall} title={`Revenue Waterfall — ${periodLabel}`} />
        </div>
      )}
    </div>
  );
};

export default MonthlyRevenueSummary;
