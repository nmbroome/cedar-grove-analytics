"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Building2, 
  Clock, 
  DollarSign, 
  Users, 
  Briefcase,
  Calendar,
  Mail,
  Globe,
  TrendingUp,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useAllTimeEntries, useClients } from '@/hooks/useFirestoreData';
import { useAttorneyRates } from '@/hooks/useAttorneyRates';
import { getEntryDate, getPSTDate, getDateRangeLabel } from '@/utils/dateHelpers';
import { formatCurrency, formatHours, formatDate } from '@/utils/formatters';
import { CHART_COLORS, DATE_RANGE_OPTIONS } from '@/utils/constants';
import { DateRangeDropdown } from '@/components/shared';

// Custom tooltip for charts - defined outside component to prevent re-creation on render
const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.name.toLowerCase().includes('earning') 
              ? formatCurrency(entry.value) 
              : `${formatHours(entry.value)}h`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Pie chart label renderer - defined outside component
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, hours }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${formatHours(hours)}h`}
    </text>
  );
};

const ClientDetailView = ({ clientName }) => {
  const router = useRouter();
  const { data: allEntries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  const { clients: firebaseClients, loading: clientsLoading, error: clientsError } = useClients();
  const { rates: attorneyRates, loading: ratesLoading, error: ratesError, getRate } = useAttorneyRates();
  
  // Date range state
  const [dateRange, setDateRange] = useState('all-time');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const loading = entriesLoading || clientsLoading || ratesLoading;
  const error = entriesError || clientsError || ratesError;

  // Get client metadata from Firebase
  const clientMetadata = useMemo(() => {
    if (!firebaseClients) return null;
    return firebaseClients.find(c => 
      (c.clientName || c.id) === clientName
    );
  }, [firebaseClients, clientName]);

  // Calculate date range boundaries
  const dateRangeInfo = useMemo(() => {
    const now = getPSTDate();
    let startDate = null;
    let endDate = new Date(now);

    switch (dateRange) {
      case 'all-time':
        startDate = null;
        break;
      case 'current-week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        break;
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'trailing-60':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60, 0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        }
        break;
      default:
        startDate = null;
    }

    return { startDate, endDate };
  }, [dateRange, customDateStart, customDateEnd]);

  // Filter entries for this client
  const clientEntries = useMemo(() => {
    if (!allEntries) return [];

    let entries = allEntries.filter(entry => 
      (entry.client || entry.company || 'Unknown') === clientName
    );

    // Apply date filter
    if (dateRange !== 'all-time' && dateRangeInfo.startDate) {
      entries = entries.filter(entry => {
        const entryDate = getEntryDate(entry);
        return entryDate >= dateRangeInfo.startDate && entryDate <= dateRangeInfo.endDate;
      });
    }

    return entries;
  }, [allEntries, clientName, dateRange, dateRangeInfo]);

  // Process client statistics
  const clientStats = useMemo(() => {
    if (!clientEntries.length) {
      return {
        totalHours: 0,
        billableHours: 0,
        opsHours: 0,
        grossBillables: 0,
        takeHomeEarnings: 0,
        transactionCount: 0,
        uniqueTransactionTypes: 0,
        uniqueAttorneys: 0,
        avgHoursPerTransaction: 0,
        lastActivity: null,
        firstActivity: null,
      };
    }

    const stats = {
      totalHours: 0,
      billableHours: 0,
      opsHours: 0,
      grossBillables: 0,
      takeHomeEarnings: 0,
      transactionCount: clientEntries.length,
      transactionTypes: new Set(),
      attorneys: new Set(),
      lastActivity: null,
      firstActivity: null,
    };

    clientEntries.forEach(entry => {
      const billable = entry.billableHours || 0;
      const ops = entry.opsHours || 0;
      
      stats.billableHours += billable;
      stats.opsHours += ops;
      stats.totalHours += billable + ops;
      stats.takeHomeEarnings += entry.billablesEarnings || 0;
      
      // Calculate gross billables using attorney rate * hours
      const entryDate = getEntryDate(entry);
      const attorneyName = entry.attorneyId;
      if (attorneyName && billable > 0) {
        const rate = getRate(attorneyName, entryDate);
        stats.grossBillables += rate * billable;
      }
      
      if (entry.billingCategory || entry.category) {
        stats.transactionTypes.add(entry.billingCategory || entry.category);
      }
      if (entry.attorneyId) {
        stats.attorneys.add(entry.attorneyId);
      }

      const entryDate2 = getEntryDate(entry);
      if (!stats.lastActivity || entryDate2 > stats.lastActivity) {
        stats.lastActivity = entryDate2;
      }
      if (!stats.firstActivity || entryDate2 < stats.firstActivity) {
        stats.firstActivity = entryDate2;
      }
    });

    return {
      ...stats,
      uniqueTransactionTypes: stats.transactionTypes.size,
      uniqueAttorneys: stats.attorneys.size,
      avgHoursPerTransaction: stats.transactionCount > 0 
        ? stats.totalHours / stats.transactionCount 
        : 0,
    };
  }, [clientEntries, getRate]);

  // Attorney breakdown data
  const attorneyBreakdown = useMemo(() => {
    const breakdown = {};
    
    clientEntries.forEach(entry => {
      const attorney = entry.attorneyId || 'Unknown';
      if (!breakdown[attorney]) {
        breakdown[attorney] = {
          name: attorney,
          hours: 0,
          billableHours: 0,
          opsHours: 0,
          grossBillables: 0,
          takeHomeEarnings: 0,
          count: 0,
        };
      }
      const billableHours = entry.billableHours || 0;
      breakdown[attorney].billableHours += billableHours;
      breakdown[attorney].opsHours += entry.opsHours || 0;
      breakdown[attorney].hours += billableHours + (entry.opsHours || 0);
      breakdown[attorney].takeHomeEarnings += entry.billablesEarnings || 0;
      breakdown[attorney].count += 1;
      
      // Calculate gross billables using attorney rate * hours
      if (billableHours > 0) {
        const entryDate = getEntryDate(entry);
        const rate = getRate(attorney, entryDate);
        breakdown[attorney].grossBillables += rate * billableHours;
      }
    });

    return Object.values(breakdown).sort((a, b) => b.hours - a.hours);
  }, [clientEntries, getRate]);

  // Transaction type breakdown data
  const transactionBreakdown = useMemo(() => {
    const breakdown = {};
    
    clientEntries.forEach(entry => {
      const category = entry.billingCategory || entry.category || 'Other';
      const billable = entry.billableHours || 0;
      
      if (billable > 0) {
        if (!breakdown[category]) {
          breakdown[category] = {
            type: category,
            hours: 0,
            grossBillables: 0,
            takeHomeEarnings: 0,
            count: 0,
          };
        }
        breakdown[category].hours += billable;
        breakdown[category].takeHomeEarnings += entry.billablesEarnings || 0;
        breakdown[category].count += 1;
        
        // Calculate gross billables
        const attorney = entry.attorneyId;
        if (attorney) {
          const entryDate = getEntryDate(entry);
          const rate = getRate(attorney, entryDate);
          breakdown[category].grossBillables += rate * billable;
        }
      }
    });

    const result = Object.values(breakdown).sort((a, b) => b.hours - a.hours);
    const totalHours = result.reduce((sum, t) => sum + t.hours, 0);
    
    return result.map(t => ({
      ...t,
      percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 100) : 0,
    }));
  }, [clientEntries, getRate]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthlyData = {};
    
    clientEntries.forEach(entry => {
      const entryDate = getEntryDate(entry);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          label: new Date(entryDate.getFullYear(), entryDate.getMonth(), 1)
            .toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          billableHours: 0,
          opsHours: 0,
          totalHours: 0,
          grossBillables: 0,
          takeHomeEarnings: 0,
          count: 0,
        };
      }
      
      const billableHours = entry.billableHours || 0;
      monthlyData[monthKey].billableHours += billableHours;
      monthlyData[monthKey].opsHours += entry.opsHours || 0;
      monthlyData[monthKey].totalHours += billableHours + (entry.opsHours || 0);
      monthlyData[monthKey].takeHomeEarnings += entry.billablesEarnings || 0;
      monthlyData[monthKey].count += 1;
      
      // Calculate gross billables
      const attorney = entry.attorneyId;
      if (attorney && billableHours > 0) {
        const rate = getRate(attorney, entryDate);
        monthlyData[monthKey].grossBillables += rate * billableHours;
      }
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [clientEntries, getRate]);

  // Recent entries (sorted by date, most recent first)
  const recentEntries = useMemo(() => {
    return [...clientEntries]
      .sort((a, b) => {
        const dateA = getEntryDate(a);
        const dateB = getEntryDate(b);
        return dateB - dateA;
      })
      .slice(0, 50);
  }, [clientEntries]);

  const dateRangeLabel = getDateRangeLabel(dateRange, customDateStart, customDateEnd);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading client data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </Link>
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
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    {clientMetadata?.status && (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        clientMetadata.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : clientMetadata.status === 'Quiet'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {clientMetadata.status}
                      </span>
                    )}
                    {clientMetadata?.clientType && (
                      <span className="text-sm text-gray-500">{clientMetadata.clientType}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DateRangeDropdown
              dateRange={dateRange}
              setDateRange={setDateRange}
              customDateStart={customDateStart}
              setCustomDateStart={setCustomDateStart}
              customDateEnd={customDateEnd}
              setCustomDateEnd={setCustomDateEnd}
              showDropdown={showDateDropdown}
              setShowDropdown={setShowDateDropdown}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Date Range Indicator */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700">
            Showing data for: <span className="font-semibold">{dateRangeLabel}</span>
            <span className="ml-2 text-purple-600">({clientEntries.length} entries)</span>
          </span>
        </div>

        {/* Client Metadata */}
        {clientMetadata && (clientMetadata.contactEmail || clientMetadata.website || clientMetadata.channel) && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              {clientMetadata.contactEmail && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${clientMetadata.contactEmail}`} className="hover:text-blue-600">
                    {clientMetadata.contactEmail}
                  </a>
                </div>
              )}
              {clientMetadata.website && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="w-4 h-4" />
                  <a href={clientMetadata.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                    {clientMetadata.website}
                  </a>
                </div>
              )}
              {clientMetadata.channel && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Briefcase className="w-4 h-4" />
                  <span>Channel: {clientMetadata.channel}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Billable Hours</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatHours(clientStats.billableHours)}h</div>
            <div className="text-xs text-gray-500 mt-1">
              {clientStats.transactionCount} entries
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Gross Billables</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(clientStats.grossBillables)}</div>
            <div className="text-xs text-gray-500 mt-1">Rate × Hours</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Transactions</span>
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{clientStats.transactionCount}</div>
            <div className="text-xs text-gray-500 mt-1">{clientStats.uniqueTransactionTypes} unique types</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Avg Hours/Txn</span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatHours(clientStats.avgHoursPerTransaction)}h</div>
            <div className="text-xs text-gray-500 mt-1">Per transaction</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Attorneys</span>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{clientStats.uniqueAttorneys}</div>
            <div className="text-xs text-gray-500 mt-1">Have worked on this client</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Last Activity</span>
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-lg font-bold text-gray-900">
              {clientStats.lastActivity 
                ? clientStats.lastActivity.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No activity'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {clientStats.firstActivity && `Since ${clientStats.firstActivity.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {clientEntries.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            {monthlyTrend.length > 1 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Trend Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="billableHours" 
                      stroke="#0088FE" 
                      strokeWidth={2} 
                      name="Billable Hours"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Attorney Breakdown */}
            {attorneyBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Attorney</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attorneyBreakdown.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                    <Bar dataKey="billableHours" fill="#0088FE" name="Billable Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Transaction Type Breakdown */}
        {transactionBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Transaction Type</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={transactionBreakdown.slice(0, 8)}
                    dataKey="hours"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={renderPieLabel}
                    labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                  >
                    {transactionBreakdown.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${formatHours(value)}h`]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Type Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Billables</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactionBreakdown.map((txn, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{txn.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{txn.count}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">{formatHours(txn.hours)}h</td>
                        <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">{formatCurrency(txn.grossBillables)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{txn.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Attorney Details Table */}
        {attorneyBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Attorney Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attorney</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hours</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Billables</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attorneyBreakdown.map((attorney, idx) => (
                    <tr key={idx} className="hover:bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {attorney.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {attorney.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                        {formatHours(attorney.billableHours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatCurrency(attorney.grossBillables)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {clientStats.billableHours > 0 
                          ? Math.round((attorney.billableHours / clientStats.billableHours) * 100)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Recent Entries</h3>
              <p className="text-sm text-gray-500 mt-1">
                Showing {Math.min(50, recentEntries.length)} most recent entries
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attorney</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Billables</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEntries.map((entry, idx) => {
                    const entryDate = getEntryDate(entry);
                    const billableHours = entry.billableHours || 0;
                    const rate = entry.attorneyId ? getRate(entry.attorneyId, entryDate) : 0;
                    const grossBillables = rate * billableHours;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.attorneyId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {entry.billingCategory || entry.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                          {billableHours > 0 ? `${formatHours(billableHours)}h` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                          {grossBillables > 0 ? formatCurrency(grossBillables) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={entry.notes}>
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data State */}
        {clientEntries.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
            <p className="text-gray-500">
              No time entries found for {clientName} in the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailView;