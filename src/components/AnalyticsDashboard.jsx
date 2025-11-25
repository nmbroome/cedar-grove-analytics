import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Activity, Calendar, Search } from 'lucide-react';
import { useAllTimeEntries, useAttorneys } from '../hooks/useFirestoreData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Format currency - omit .00 decimals
const formatCurrency = (amount) => {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded === Math.floor(rounded)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format hours - round to .1, omit .0 decimals
const formatHours = (hours) => {
  const rounded = Math.round(hours * 10) / 10;
  if (rounded === Math.floor(rounded)) {
    return Math.floor(rounded).toString();
  }
  return rounded.toFixed(1);
};

// Custom tooltip formatter for charts - shows only the hovered item
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.name.toLowerCase().includes('earning') ? formatCurrency(entry.value) : `${formatHours(entry.value)}h`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip that shows only a single bar value (for charts with multiple bar series)
// Uses the activePayload to filter which bar is actually being hovered
// Tooltip that shows total hours by default, or specific bar when directly hovered
const PerBarTooltip = ({ active, payload, label, hoveredDataKey }) => {
  if (active && payload && payload.length > 0) {
    // If hovering a specific bar, show only that bar's value
    if (hoveredDataKey) {
      const filteredPayload = payload.filter(p => p.dataKey === hoveredDataKey);
      if (filteredPayload.length === 0) return null;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {filteredPayload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatHours(entry.value)}h
            </p>
          ))}
        </div>
      );
    }
    
    // Otherwise show total hours
    const totalHours = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-700">
          Total Hours: <span className="font-semibold">{formatHours(totalHours)}h</span>
        </p>
      </div>
    );
  }
  return null;
};

const CedarGroveAnalytics = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedAttorney, setSelectedAttorney] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRange, setDateRange] = useState('current-month');
  const [clientSearch, setClientSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hoveredBarKey, setHoveredBarKey] = useState(null);

  // Fetch data from Firebase
  const { data: allEntries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  const { attorneys: firebaseAttorneys, loading: attorneysLoading, error: attorneysError } = useAttorneys();

  const loading = entriesLoading || attorneysLoading;
  const error = entriesError || attorneysError;

  // Helper function to convert month name to number
  const getMonthNumber = (monthName) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months.findIndex(m => m.toLowerCase() === monthName?.toLowerCase()) + 1 || 1;
  };

  // Helper function to get date from entry (handles billableDate, opsDate, or year/month)
  const getEntryDate = (entry) => {
    // Try billableDate first (new format)
    if (entry.billableDate?.toDate) {
      return entry.billableDate.toDate();
    }
    if (entry.billableDate) {
      return new Date(entry.billableDate);
    }
    // Try opsDate
    if (entry.opsDate?.toDate) {
      return entry.opsDate.toDate();
    }
    if (entry.opsDate) {
      return new Date(entry.opsDate);
    }
    // Try date field
    if (entry.date?.toDate) {
      return entry.date.toDate();
    }
    if (entry.date) {
      return new Date(entry.date);
    }
    // Fallback to year/month
    return new Date(entry.year, getMonthNumber(entry.month) - 1);
  };

  // Create attorney name map
  const attorneyMap = useMemo(() => {
    const map = {};
    firebaseAttorneys.forEach(attorney => {
      map[attorney.id] = attorney.name || attorney.id;
    });
    return map;
  }, [firebaseAttorneys]);

  // Process data based on date range
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case 'current-week':
        // Start of current week (Sunday)
        const dayOfWeek = now.getDay();
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'current-month':
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'trailing-60':
        startDate.setDate(now.getDate() - 60);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return allEntries.filter(entry => {
      const entryDate = getEntryDate(entry);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [allEntries, dateRange]);

  // Process attorney data - updated to use new field names
  const attorneyData = useMemo(() => {
    const attorneyStats = {};

    filteredEntries.forEach(entry => {
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      
      if (!attorneyStats[attorneyName]) {
        attorneyStats[attorneyName] = {
          name: attorneyName,
          billable: 0,
          ops: 0,
          earnings: 0,
          target: 150,
          billableTarget: 100,
          opsTarget: 50,
          role: 'Attorney',
          transactions: {},
          clients: {}
        };
      }

      // Use normalized field names from useFirestoreData
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const earnings = entry.billablesEarnings || 0;

      // Add billable hours
      attorneyStats[attorneyName].billable += billableHours;
      
      // Add ops hours
      attorneyStats[attorneyName].ops += opsHours;
      
      // Add earnings
      attorneyStats[attorneyName].earnings += earnings;

      // Get category for transaction tracking
      const category = entry.billingCategory || entry.category || 'Other';
      const client = entry.client || 'Unknown';

      // Track transaction types (by billingCategory)
      if (billableHours > 0) {
        if (!attorneyStats[attorneyName].transactions[category]) {
          attorneyStats[attorneyName].transactions[category] = 0;
        }
        attorneyStats[attorneyName].transactions[category] += billableHours;
      }

      // Track clients
      if (!attorneyStats[attorneyName].clients[client]) {
        attorneyStats[attorneyName].clients[client] = 0;
      }
      attorneyStats[attorneyName].clients[client] += billableHours + opsHours;
    });

    // Convert to array and add top transactions
    return Object.values(attorneyStats).map(attorney => ({
      ...attorney,
      topTransactions: Object.entries(attorney.transactions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name)
    }));
  }, [filteredEntries, attorneyMap]);

  // Process transaction data - updated to use new field names
  const transactionData = useMemo(() => {
    const transactionStats = {};

    filteredEntries.forEach(entry => {
      const category = entry.billingCategory || entry.category || 'Other';
      const billableHours = entry.billableHours || 0;
      const earnings = entry.billablesEarnings || 0;

      // Only count entries with billable hours for transaction stats
      if (billableHours > 0) {
        if (!transactionStats[category]) {
          transactionStats[category] = {
            type: category,
            totalHours: 0,
            totalEarnings: 0,
            count: 0
          };
        }

        transactionStats[category].totalHours += billableHours;
        transactionStats[category].totalEarnings += earnings;
        transactionStats[category].count += 1;
      }
    });

    return Object.values(transactionStats).map(stat => ({
      ...stat,
      avgHours: stat.count > 0 ? (stat.totalHours / stat.count).toFixed(1) : 0,
      avgEarnings: stat.count > 0 ? (stat.totalEarnings / stat.count).toFixed(2) : 0
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries]);

  // Process client data - updated to use new field names
  const clientData = useMemo(() => {
    const clientStats = {};
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    filteredEntries.forEach(entry => {
      const clientName = entry.client || 'Unknown';
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const totalHours = billableHours + opsHours;
      const category = entry.billingCategory || entry.category || 'Other';
      const earnings = entry.billablesEarnings || 0;
      const entryDate = getEntryDate(entry);

      if (!clientStats[clientName]) {
        clientStats[clientName] = {
          name: clientName,
          monthlyHours: 0,
          annualHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionHours: 0,
          transactionCount: 0,
          lastActivity: entryDate,
          stage: 'Unknown'
        };
      }

      clientStats[clientName].annualHours += totalHours;
      clientStats[clientName].monthlyHours += totalHours;
      clientStats[clientName].totalEarnings += earnings;
      clientStats[clientName].uniqueTransactions.add(category);
      clientStats[clientName].transactionCount += 1;
      clientStats[clientName].transactionHours += totalHours;

      if (entryDate > clientStats[clientName].lastActivity) {
        clientStats[clientName].lastActivity = entryDate;
      }
    });

    return Object.values(clientStats).map(client => ({
      name: client.name,
      monthlyHours: Math.round(client.monthlyHours / 12),
      annualHours: Math.round(client.annualHours),
      totalEarnings: client.totalEarnings.toFixed(2),
      uniqueTransactions: client.uniqueTransactions.size,
      avgHoursPerTransaction: client.transactionCount > 0 
        ? (client.transactionHours / client.transactionCount).toFixed(1) 
        : 0,
      lastActivity: client.lastActivity.toISOString().split('T')[0],
      status: client.lastActivity >= sixMonthsAgo ? 'active' : 'inactive',
      stage: client.stage
    }));
  }, [filteredEntries]);

  // Process ops data - updated to use new field names (opsHours, opsCategory)
  const opsData = useMemo(() => {
    const opsStats = {};
    let totalOpsHours = 0;

    filteredEntries.forEach(entry => {
      const opsHours = entry.opsHours || 0;
      
      if (opsHours > 0) {
        // Use opsCategory if available, fallback to ops field, then 'Other Ops'
        const category = entry.opsCategory || entry.ops || 'Other Ops';
        
        if (!opsStats[category]) {
          opsStats[category] = 0;
        }
        opsStats[category] += opsHours;
        totalOpsHours += opsHours;
      }
    });

    return Object.entries(opsStats).map(([category, hours]) => ({
      category,
      hours: Math.round(hours * 10) / 10,
      percentage: totalOpsHours > 0 ? Math.round((hours / totalOpsHours) * 100) : 0
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredEntries]);

  // Calculate utilization
  const calculateUtilization = (attorney) => {
    const total = attorney.billable + attorney.ops;
    return Math.round((total / attorney.target) * 100);
  };

  const calculateBillableUtilization = (attorney) => {
    return Math.round((attorney.billable / attorney.billableTarget) * 100);
  };

  const calculateOpsUtilization = (attorney) => {
    return Math.round((attorney.ops / attorney.opsTarget) * 100);
  };

  const avgUtilization = attorneyData.length > 0
    ? Math.round(attorneyData.reduce((acc, att) => acc + calculateUtilization(att), 0) / attorneyData.length)
    : 0;

  const totalBillable = attorneyData.reduce((acc, att) => acc + att.billable, 0);
  const totalOps = attorneyData.reduce((acc, att) => acc + att.ops, 0);
  const totalEarnings = attorneyData.reduce((acc, att) => acc + att.earnings, 0);
  const totalBillableTarget = attorneyData.reduce((acc, att) => acc + att.billableTarget, 0);
  const totalOpsTarget = attorneyData.reduce((acc, att) => acc + att.opsTarget, 0);

  // Loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading analytics data...</div>
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
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-900 text-xl mb-4">No data available</div>
          <div className="text-gray-600 mb-4">
            No time entries found for the selected date range. Try adjusting your filters.
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedClients = () => {
    let filtered = clientData.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  const getDateRangeLabel = () => {
    const labels = {
      'current-week': 'Current Week',
      'current-month': 'Current Month',
      'trailing-60': 'Trailing 60 Days',
    };
    return labels[dateRange] || 'Current Month';
  };

  const renderCustomLabel = ({ hours, percentage }) => {
    return `${hours}h (${percentage}%)`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cedar Grove Analytics</h1>
            <p className="text-gray-600">Attorney time allocation and efficiency insights</p>
          </div>
          
          {/* Date Range Selector - Horizontal Buttons */}
          <div className="flex items-center gap-2">
            {[
              { value: 'current-week', label: 'Current Week' },
              { value: 'current-month', label: 'Current Month' },
              { value: 'trailing-60', label: 'Trailing 60 Days' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {['overview', 'attorneys', 'transactions', 'ops', 'clients'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                selectedView === view
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Overview View */}
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                <span className="ml-2 text-blue-600">({filteredEntries.length} entries)</span>
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Avg Utilization</span>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{avgUtilization}%</div>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  {attorneyData.length} attorneys
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Time Split</span>
                  <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-3xl font-bold text-blue-600">
                      {totalBillable + totalOps > 0 ? Math.round((totalBillable / (totalBillable + totalOps)) * 100) : 0}%
                    </div>
                    <div className="text-xl text-gray-400">/</div>
                    <div className="text-3xl font-bold text-green-600">
                      {totalBillable + totalOps > 0 ? Math.round((totalOps / (totalBillable + totalOps)) * 100) : 0}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 text-center">Billable / Ops</div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Billable</span>
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{formatHours(totalBillable)}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  {totalBillableTarget > 0 ? Math.round((totalBillable / totalBillableTarget) * 100) : 0}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Ops</span>
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{formatHours(totalOps)}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  {totalOpsTarget > 0 ? Math.round((totalOps / totalOpsTarget) * 100) : 0}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Earnings</span>
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</div>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  Billable earnings
                </div>
              </div>
            </div>

            {/* Top Transactions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Transaction Types by Time - {getDateRangeLabel()}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={transactionData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="totalHours" fill="#0088FE" name="Total Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Billable vs Ops Time by Attorney */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Billable vs Ops Time by Attorney - {getDateRangeLabel()}
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={attorneyData} barGap={0} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    content={<PerBarTooltip hoveredDataKey={hoveredBarKey} />}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="billable" 
                    fill="#0088FE" 
                    name="Billable Hours"
                    onMouseEnter={() => setHoveredBarKey('billable')}
                    onMouseLeave={() => setHoveredBarKey(null)}
                  />
                  <Bar 
                    dataKey="ops" 
                    fill="#00C49F" 
                    name="Ops Hours"
                    onMouseEnter={() => setHoveredBarKey('ops')}
                    onMouseLeave={() => setHoveredBarKey(null)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Attorneys View */}
        {selectedView === 'attorneys' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
              </span>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attorney
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billable Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ops Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attorneyData.map((attorney, idx) => {
                    const utilization = calculateUtilization(attorney);
                    const total = attorney.billable + attorney.ops;
                    return (
                      <tr key={idx} className="hover:bg-blue-50 cursor-pointer transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                          {attorney.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatHours(attorney.billable)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatHours(attorney.ops)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatHours(total)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(attorney.earnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              utilization >= 100
                                ? 'bg-green-100 text-green-800'
                                : utilization >= 80
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {utilization}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-1">
                            {attorney.topTransactions.map((txn, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                              >
                                {tIdx + 1}. {txn}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Attorney Comparison Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Billable vs Ops Time by Attorney
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={attorneyData} barGap={0} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    content={<PerBarTooltip hoveredDataKey={hoveredBarKey} />}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="billable" 
                    fill="#0088FE" 
                    name="Billable Hours"
                    onMouseEnter={() => setHoveredBarKey('billable')}
                    onMouseLeave={() => setHoveredBarKey(null)}
                  />
                  <Bar 
                    dataKey="ops" 
                    fill="#00C49F" 
                    name="Ops Hours"
                    onMouseEnter={() => setHoveredBarKey('ops')}
                    onMouseLeave={() => setHoveredBarKey(null)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transactions View */}
        {selectedView === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
              </span>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactionData.map((txn, idx) => {
                    const totalHours = transactionData.reduce((sum, t) => sum + t.totalHours, 0);
                    const percentage = totalHours > 0 ? ((txn.totalHours / totalHours) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} className="hover:bg-blue-50 cursor-pointer transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                          {txn.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {txn.avgHours}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {txn.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatHours(txn.totalHours)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(txn.totalEarnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Average Time per Transaction */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Average Time per Transaction Type
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={transactionData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" width={150} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgHours" fill="#FFBB28" name="Avg Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ops View */}
        {selectedView === 'ops' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
              </span>
            </div>

            {opsData.length > 0 ? (
              <>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ops Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % of Total Ops
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {opsData.map((ops, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {ops.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ops.hours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ops.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ops Distribution Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Ops Time Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={opsData}
                        dataKey="percentage"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={renderCustomLabel}
                      >
                        {opsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <div className="text-gray-500">No ops data available for the selected date range.</div>
              </div>
            )}
          </div>
        )}

        {/* Clients View */}
        {selectedView === 'clients' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
              </span>
            </div>

            {/* Client Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-600 text-sm">Active Clients</span>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                      {clientData.filter(c => c.status === 'active').length}
                    </div>
                  </div>
                  <div className="text-gray-300 text-4xl font-light mx-4">/</div>
                  <div>
                    <span className="text-gray-600 text-sm">Inactive Clients</span>
                    <div className="text-3xl font-bold text-red-600 mt-2">
                      {clientData.filter(c => c.status === 'inactive').length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleSort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Client Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('status')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('annualHours')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours {sortConfig.key === 'annualHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('totalEarnings')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Earnings {sortConfig.key === 'totalEarnings' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('uniqueTransactions')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Transaction Types {sortConfig.key === 'uniqueTransactions' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('lastActivity')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Last Activity {sortConfig.key === 'lastActivity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedClients().map((client, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.annualHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatCurrency(parseFloat(client.totalEarnings))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.uniqueTransactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.lastActivity).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Client Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Hours by Client
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="annualHours" fill="#0088FE" name="Total Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Service Breadth (Unique Transaction Types)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="uniqueTransactions" fill="#00C49F" name="Unique Transaction Types" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CedarGroveAnalytics;