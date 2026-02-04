"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User,
  Clock, 
  DollarSign, 
  Users, 
  Briefcase,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  FileText,
  Building2
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
import { useUserBillableEntries, useUserOpsEntries, useUsers } from '@/hooks/useFirestoreData';
import { useFirestoreCache } from '@/context/FirestoreDataContext';
import {
  getEntryDate,
  getPSTDate,
  getDateRangeLabel,
  getMonthBusinessDays,
  countBusinessDays
} from '@/utils/dateHelpers';
import { formatCurrency, formatHours, formatDate } from '@/utils/formatters';
import { CHART_COLORS } from '@/utils/constants';
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

const AttorneyDetailView = ({ attorneyName }) => {
  const router = useRouter();
  const { data: billableEntries, loading: billableLoading, error: billableError } = useUserBillableEntries(attorneyName);
  const { data: opsEntries, loading: opsLoading, error: opsError } = useUserOpsEntries(attorneyName);
  const { users } = useUsers();
  const { allTargets } = useFirestoreCache();

  // Date range state
  const [dateRange, setDateRange] = useState('current-month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Attorney targets from shared cache
  const attorneyTargets = useMemo(() => allTargets[attorneyName] || {}, [allTargets, attorneyName]);

  // Get the person's role from user profile
  const personRole = useMemo(() => {
    const user = users.find(u => (u.name || u.id) === attorneyName || u.id === attorneyName);
    return user?.role || 'Attorney';
  }, [users, attorneyName]);

  const loading = billableLoading || opsLoading;
  const error = billableError || opsError;

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
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return { startDate, endDate, currentMonthKey, now };
  }, [dateRange, customDateStart, customDateEnd]);

  // Filter billable entries by date range
  const filteredBillableEntries = useMemo(() => {
    if (!billableEntries) return [];
    let entries = billableEntries;
    if (dateRange !== 'all-time' && dateRangeInfo.startDate) {
      entries = entries.filter(entry => {
        const entryDate = getEntryDate(entry);
        return entryDate >= dateRangeInfo.startDate && entryDate <= dateRangeInfo.endDate;
      });
    }
    return entries;
  }, [billableEntries, dateRange, dateRangeInfo]);

  // Filter ops entries by date range
  const filteredOpsEntries = useMemo(() => {
    if (!opsEntries) return [];
    let entries = opsEntries;
    if (dateRange !== 'all-time' && dateRangeInfo.startDate) {
      entries = entries.filter(entry => {
        const entryDate = getEntryDate(entry);
        return entryDate >= dateRangeInfo.startDate && entryDate <= dateRangeInfo.endDate;
      });
    }
    return entries;
  }, [opsEntries, dateRange, dateRangeInfo]);

  // Combined entries reference (used for active months, targets, etc.)
  const attorneyEntries = useMemo(() => {
    return [...filteredBillableEntries, ...filteredOpsEntries];
  }, [filteredBillableEntries, filteredOpsEntries]);

  // Calculate targets based on active months
  const calculatedTargets = useMemo(() => {
    const { startDate, endDate, currentMonthKey, now } = dateRangeInfo;
    
    // Get unique months from entries
    const activeMonths = new Set();
    attorneyEntries.forEach(entry => {
      const entryDate = getEntryDate(entry);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      activeMonths.add(monthKey);
    });

    const defaultTarget = {
      billableTarget: attorneyTargets[currentMonthKey]?.billableTarget ?? 100,
      opsTarget: attorneyTargets[currentMonthKey]?.opsTarget ?? 50,
      totalTarget: attorneyTargets[currentMonthKey]?.totalTarget ?? 150
    };

    if (activeMonths.size === 0) {
      return defaultTarget;
    }

    let totalBillableTarget = 0;
    let totalOpsTarget = 0;
    let totalTarget = 0;

    Array.from(activeMonths).forEach(monthKey => {
      const [year, month] = monthKey.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const monthTarget = attorneyTargets[monthKey];
      const billableTarget = monthTarget?.billableTarget ?? defaultTarget.billableTarget;
      const opsTarget = monthTarget?.opsTarget ?? defaultTarget.opsTarget;
      const monthTotalTarget = monthTarget?.totalTarget ?? defaultTarget.totalTarget;

      // Check if month needs pro-rating
      const rangeStartsAfterMonthStart = startDate && startDate > monthStart;
      const rangeEndsBeforeMonthEnd = endDate && endDate < monthEnd;
      const isCurrentMonthInProgress = monthKey === currentMonthKey;

      const needsProRating = rangeStartsAfterMonthStart || rangeEndsBeforeMonthEnd || isCurrentMonthInProgress;

      if (needsProRating) {
        const effectiveStart = (startDate && startDate > monthStart) ? startDate : monthStart;
        let effectiveEnd;

        if (isCurrentMonthInProgress) {
          effectiveEnd = now;
        } else if (endDate && endDate < monthEnd) {
          effectiveEnd = endDate;
        } else {
          effectiveEnd = monthEnd;
        }

        const businessDaysElapsed = countBusinessDays(effectiveStart, effectiveEnd);
        const totalBusinessDaysInMonth = getMonthBusinessDays(year, month).total;
        const fraction = totalBusinessDaysInMonth > 0 ? businessDaysElapsed / totalBusinessDaysInMonth : 1;

        totalBillableTarget += billableTarget * fraction;
        totalOpsTarget += opsTarget * fraction;
        totalTarget += monthTotalTarget * fraction;
      } else {
        totalBillableTarget += billableTarget;
        totalOpsTarget += opsTarget;
        totalTarget += monthTotalTarget;
      }
    });

    return {
      billableTarget: Math.round(totalBillableTarget * 10) / 10,
      opsTarget: Math.round(totalOpsTarget * 10) / 10,
      totalTarget: Math.round(totalTarget * 10) / 10
    };
  }, [attorneyEntries, attorneyTargets, dateRangeInfo]);

  // Process attorney statistics
  const attorneyStats = useMemo(() => {
    if (!attorneyEntries.length) {
      return {
        totalHours: 0,
        billableHours: 0,
        opsHours: 0,
        totalEarnings: 0,
        transactionCount: 0,
        uniqueTransactionTypes: 0,
        uniqueClients: 0,
        avgHoursPerTransaction: 0,
        lastActivity: null,
        firstActivity: null,
        utilization: 0,
        billableUtilization: 0,
        opsUtilization: 0,
      };
    }

    const stats = {
      totalHours: 0,
      billableHours: 0,
      opsHours: 0,
      totalEarnings: 0,
      transactionCount: filteredBillableEntries.length + filteredOpsEntries.length,
      transactionTypes: new Set(),
      clients: new Set(),
      lastActivity: null,
      firstActivity: null,
    };

    filteredBillableEntries.forEach(entry => {
      const billable = entry.billableHours || 0;
      stats.billableHours += billable;
      stats.totalHours += billable;
      stats.totalEarnings += entry.earnings || 0;

      if (entry.billingCategory) {
        stats.transactionTypes.add(entry.billingCategory);
      }
      if (entry.client) {
        stats.clients.add(entry.client);
      }

      const entryDate = getEntryDate(entry);
      if (!stats.lastActivity || entryDate > stats.lastActivity) {
        stats.lastActivity = entryDate;
      }
      if (!stats.firstActivity || entryDate < stats.firstActivity) {
        stats.firstActivity = entryDate;
      }
    });

    filteredOpsEntries.forEach(entry => {
      const ops = entry.opsHours || 0;
      stats.opsHours += ops;
      stats.totalHours += ops;

      const entryDate = getEntryDate(entry);
      if (!stats.lastActivity || entryDate > stats.lastActivity) {
        stats.lastActivity = entryDate;
      }
      if (!stats.firstActivity || entryDate < stats.firstActivity) {
        stats.firstActivity = entryDate;
      }
    });

    const utilization = calculatedTargets.totalTarget > 0 
      ? Math.round((stats.totalHours / calculatedTargets.totalTarget) * 100)
      : 0;
    const billableUtilization = calculatedTargets.billableTarget > 0
      ? Math.round((stats.billableHours / calculatedTargets.billableTarget) * 100)
      : 0;
    const opsUtilization = calculatedTargets.opsTarget > 0
      ? Math.round((stats.opsHours / calculatedTargets.opsTarget) * 100)
      : 0;

    return {
      ...stats,
      uniqueTransactionTypes: stats.transactionTypes.size,
      uniqueClients: stats.clients.size,
      avgHoursPerTransaction: stats.transactionCount > 0 
        ? stats.totalHours / stats.transactionCount 
        : 0,
      utilization,
      billableUtilization,
      opsUtilization,
    };
  }, [attorneyEntries, filteredBillableEntries, filteredOpsEntries, calculatedTargets]);

  // Client breakdown data
  const clientBreakdown = useMemo(() => {
    const breakdown = {};
    
    attorneyEntries.forEach(entry => {
      const client = entry.client || 'Unknown';
      if (!breakdown[client]) {
        breakdown[client] = {
          name: client,
          hours: 0,
          billableHours: 0,
          opsHours: 0,
          earnings: 0,
          count: 0,
        };
      }
      breakdown[client].billableHours += entry.billableHours || 0;
      breakdown[client].opsHours += entry.opsHours || 0;
      breakdown[client].hours += (entry.billableHours || 0) + (entry.opsHours || 0);
      breakdown[client].earnings += entry.earnings || 0;
      breakdown[client].count += 1;
    });

    return Object.values(breakdown).sort((a, b) => b.hours - a.hours);
  }, [attorneyEntries]);

  // Transaction type breakdown data (billable entries only)
  const transactionBreakdown = useMemo(() => {
    const breakdown = {};

    filteredBillableEntries.forEach(entry => {
      const category = entry.billingCategory || 'Other';
      const billable = entry.billableHours || 0;

      if (billable > 0) {
        if (!breakdown[category]) {
          breakdown[category] = {
            type: category,
            hours: 0,
            earnings: 0,
            count: 0,
          };
        }
        breakdown[category].hours += billable;
        breakdown[category].earnings += entry.earnings || 0;
        breakdown[category].count += 1;
      }
    });

    const result = Object.values(breakdown).sort((a, b) => b.hours - a.hours);
    const totalHours = result.reduce((sum, t) => sum + t.hours, 0);

    return result.map(t => ({
      ...t,
      percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 100) : 0,
    }));
  }, [filteredBillableEntries]);

  // Ops category breakdown (ops entries only)
  const opsBreakdown = useMemo(() => {
    const breakdown = {};

    filteredOpsEntries.forEach(entry => {
      const opsHours = entry.opsHours || 0;
      if (opsHours > 0) {
        const category = entry.category || 'Other';
        if (!breakdown[category]) {
          breakdown[category] = {
            category,
            hours: 0,
            count: 0,
          };
        }
        breakdown[category].hours += opsHours;
        breakdown[category].count += 1;
      }
    });

    const result = Object.values(breakdown).sort((a, b) => b.hours - a.hours);
    const totalHours = result.reduce((sum, t) => sum + t.hours, 0);

    return result.map(t => ({
      ...t,
      percentage: totalHours > 0 ? Math.round((t.hours / totalHours) * 100) : 0,
    }));
  }, [filteredOpsEntries]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthlyData = {};
    
    attorneyEntries.forEach(entry => {
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
          earnings: 0,
          count: 0,
        };
      }
      
      monthlyData[monthKey].billableHours += entry.billableHours || 0;
      monthlyData[monthKey].opsHours += entry.opsHours || 0;
      monthlyData[monthKey].totalHours += (entry.billableHours || 0) + (entry.opsHours || 0);
      monthlyData[monthKey].earnings += entry.earnings || 0;
      monthlyData[monthKey].count += 1;
    });

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [attorneyEntries]);

  // Recent entries
  const recentEntries = useMemo(() => {
    return [...attorneyEntries]
      .sort((a, b) => {
        const dateA = getEntryDate(a);
        const dateB = getEntryDate(b);
        return dateB - dateA;
      })
      .slice(0, 50);
  }, [attorneyEntries]);

  const dateRangeLabel = getDateRangeLabel(dateRange, customDateStart, customDateEnd);

  // Utilization color helper
  const getUtilizationColor = (util) => {
    if (util >= 95 && util <= 105) return 'text-green-600';
    if ((util >= 90 && util < 95) || (util > 105 && util <= 110)) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUtilizationBgColor = (util) => {
    if (util >= 95 && util <= 105) return 'bg-green-100 text-green-800';
    if ((util >= 90 && util < 95) || (util > 105 && util <= 110)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Progress bar color helper
  const getProgressBarColor = (util) => {
    if (util >= 95 && util <= 105) return 'bg-green-500';
    if ((util >= 90 && util < 95) || (util > 105 && util <= 110)) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading data...</div>
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{attorneyName}</h1>
                  <p className="text-sm text-gray-500">{personRole} Performance Analytics</p>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Showing data for: <span className="font-semibold">{dateRangeLabel}</span>
            <span className="ml-2 text-blue-600">({attorneyEntries.length} entries)</span>
          </span>
        </div>

        {/* Utilization Summary Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Utilization Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Utilization */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getUtilizationColor(attorneyStats.utilization)}`}>
                {attorneyStats.utilization}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Overall Utilization</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatHours(attorneyStats.totalHours)}h / {formatHours(calculatedTargets.totalTarget)}h target
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${getProgressBarColor(attorneyStats.utilization)}`}
                  style={{ width: `${Math.min(attorneyStats.utilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Billable Utilization */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getUtilizationColor(attorneyStats.billableUtilization)}`}>
                {attorneyStats.billableUtilization}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Billable Utilization</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatHours(attorneyStats.billableHours)}h / {formatHours(calculatedTargets.billableTarget)}h target
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${getProgressBarColor(attorneyStats.billableUtilization)}`}
                  style={{ width: `${Math.min(attorneyStats.billableUtilization, 100)}%` }}
                />
              </div>
            </div>

            {/* Ops Utilization */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getUtilizationColor(attorneyStats.opsUtilization)}`}>
                {attorneyStats.opsUtilization}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Ops Utilization</div>
              <div className="text-xs text-gray-400 mt-1">
                {formatHours(attorneyStats.opsHours)}h / {formatHours(calculatedTargets.opsTarget)}h target
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${getProgressBarColor(attorneyStats.opsUtilization)}`}
                  style={{ width: `${Math.min(attorneyStats.opsUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Hours</span>
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatHours(attorneyStats.totalHours)}h</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatHours(attorneyStats.billableHours)}h bill / {formatHours(attorneyStats.opsHours)}h ops
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Earnings</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(attorneyStats.totalEarnings)}</div>
            <div className="text-xs text-gray-500 mt-1">From billable work</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Transactions</span>
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{attorneyStats.transactionCount}</div>
            <div className="text-xs text-gray-500 mt-1">{attorneyStats.uniqueTransactionTypes} unique types</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Avg Hours/Txn</span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatHours(attorneyStats.avgHoursPerTransaction)}h</div>
            <div className="text-xs text-gray-500 mt-1">Per transaction</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Clients</span>
              <Building2 className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{attorneyStats.uniqueClients}</div>
            <div className="text-xs text-gray-500 mt-1">Unique clients served</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Bill:Ops Ratio</span>
              <Briefcase className="w-5 h-5 text-gray-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {attorneyStats.opsHours > 0 
                ? `${(attorneyStats.billableHours / attorneyStats.opsHours).toFixed(1)}:1`
                : '∞:1'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Billable to ops</div>
          </div>
        </div>

        {/* Charts Row */}
        {attorneyEntries.length > 0 && (
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
                    <Line 
                      type="monotone" 
                      dataKey="opsHours" 
                      stroke="#00C49F" 
                      strokeWidth={2} 
                      name="Ops Hours"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Clients */}
            {clientBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients by Hours</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientBreakdown.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                    <Bar dataKey="billableHours" fill="#0088FE" name="Billable" stackId="hours" />
                    <Bar dataKey="opsHours" fill="#00C49F" name="Ops" stackId="hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Transaction Type and Ops Breakdown */}
        {(transactionBreakdown.length > 0 || opsBreakdown.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction Type Pie Chart */}
            {transactionBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billable Time by Transaction Type</h3>
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
                    <Tooltip formatter={(value) => [`${formatHours(value)}h`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ops Category Pie Chart */}
            {opsBreakdown.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ops Time by Category</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={opsBreakdown.slice(0, 8)}
                      dataKey="hours"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={renderPieLabel}
                      labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                    >
                      {opsBreakdown.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${formatHours(value)}h`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Client Details Table */}
        {clientBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Client Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ops</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientBreakdown.map((client, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-purple-50 cursor-pointer"
                      onClick={() => router.push(`/clients/${encodeURIComponent(client.name)}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {client.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                        {formatHours(client.billableHours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatHours(client.opsHours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                        {formatHours(client.hours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatCurrency(client.earnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {attorneyStats.totalHours > 0 
                          ? Math.round((client.hours / attorneyStats.totalHours) * 100)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Type Table */}
        {transactionBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Type Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hours</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Billable</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactionBreakdown.map((txn, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {txn.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatHours(txn.hours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                        {formatCurrency(txn.earnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {txn.percentage}%
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ops</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEntries.map((entry, idx) => {
                    const entryDate = getEntryDate(entry);
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                            onClick={() => router.push(`/clients/${encodeURIComponent(entry.client || 'Unknown')}`)}>
                          {entry.client || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {entry.billingCategory || entry.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                          {entry.billableHours > 0 ? `${formatHours(entry.billableHours)}h` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                          {entry.opsHours > 0 ? `${formatHours(entry.opsHours)}h` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-medium">
                          {entry.earnings > 0 ? formatCurrency(entry.earnings) : '-'}
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
        {attorneyEntries.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
            <p className="text-gray-500">
              No time entries found for {attorneyName} in the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttorneyDetailView;