"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatters';

// Brand green (globals.css --color-cg-green) for totals; red-600 for
// subtractions, matching the negative styling used in the table.
const CG_GREEN = '#1CA33B';
const RED = '#dc2626';

// Compact axis ticks so large dollar amounts stay legible.
const compactCurrency = (v) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
};

// Custom tooltip reads the datum off payload[].payload — never sum the
// stacked series (the transparent base would pollute the total).
const WaterfallTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  if (!datum) return null;
  const value = datum.value || 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm">
      <div className="font-medium text-cg-black">{datum.name}</div>
      <div className={datum.isNegative ? 'text-red-600' : 'text-cg-dark'}>
        {formatCurrency(value)}
      </div>
    </div>
  );
};

const RevenueWaterfallChart = ({ data, title = 'Revenue Waterfall' }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 24, right: 16, bottom: 60, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={compactCurrency} width={64} tick={{ fontSize: 12 }} />
        <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
        {/* Invisible base props each visible delta to the correct height */}
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
        {/* Visible delta, colored per datum: green for totals, red for cuts */}
        <Bar dataKey="delta" stackId="wf" maxBarSize={64} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isTotal ? CG_GREEN : RED} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            style={{ fontSize: 11, fill: '#5A5A48' }}
            formatter={(v) => formatCurrency(v || 0)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default RevenueWaterfallChart;
