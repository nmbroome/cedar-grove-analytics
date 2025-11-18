import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Activity, Calendar, Search } from 'lucide-react';
import { useAllTimeEntries, useAttorneys } from '../hooks/useFirestoreData';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CedarGroveAnalytics = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedAttorney, setSelectedAttorney] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRange, setDateRange] = useState('last-month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

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
      case 'last-week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last-month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'last-quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year-to-date':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          startDate = new Date(customDateStart);
          endDate = new Date(customDateEnd);
        }
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return allEntries.filter(entry => {
      // Create a date from year and month
      const entryDate = new Date(entry.year, getMonthNumber(entry.month) - 1);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [allEntries, dateRange, customDateStart, customDateEnd]);

  // Process attorney data
  const attorneyData = useMemo(() => {
    const attorneyStats = {};

    filteredEntries.forEach(entry => {
      // Attorney ID is the document name (e.g., "Ohta")
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      
      if (!attorneyStats[attorneyName]) {
        attorneyStats[attorneyName] = {
          name: attorneyName,
          billable: 0,
          ops: 0,
          target: 150, // Default target
          billableTarget: 100,
          opsTarget: 50,
          role: 'Attorney',
          transactions: {},
          clients: {}
        };
      }

      // Get hours - use 'hours' field (primary hours)
      const primaryHours = parseFloat(entry.hours) || 0;
      const secondaryHours = parseFloat(entry.secondaryHours) || 0;
      const totalHours = primaryHours + secondaryHours;

      // Get category - use billingCategory as primary
      const category = entry.billingCategory || entry.category || 'Other';
      
      // Get client - prefer 'client' field, fallback to 'company'
      const client = entry.client || entry.company || 'Unknown';

      // Determine if billable or ops based on the 'ops' field or category
      // If 'ops' field exists and is not empty/null, it's ops time
      if (entry.ops && entry.ops !== '' && entry.ops !== 'null') {
        // This is ops time
        attorneyStats[attorneyName].ops += totalHours;
      } else {
        // This is billable time
        attorneyStats[attorneyName].billable += totalHours;
      }

      // Track transaction types (by billingCategory)
      if (!attorneyStats[attorneyName].transactions[category]) {
        attorneyStats[attorneyName].transactions[category] = 0;
      }
      attorneyStats[attorneyName].transactions[category] += totalHours;

      // Track clients
      if (!attorneyStats[attorneyName].clients[client]) {
        attorneyStats[attorneyName].clients[client] = 0;
      }
      attorneyStats[attorneyName].clients[client] += totalHours;
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

  // Process transaction data
  const transactionData = useMemo(() => {
    const transactionStats = {};

    filteredEntries.forEach(entry => {
      const category = entry.billingCategory || entry.category || 'Other';
      const primaryHours = parseFloat(entry.hours) || 0;
      const secondaryHours = parseFloat(entry.secondaryHours) || 0;
      const totalHours = primaryHours + secondaryHours;

      if (!transactionStats[category]) {
        transactionStats[category] = {
          type: category,
          totalHours: 0,
          count: 0
        };
      }

      transactionStats[category].totalHours += totalHours;
      transactionStats[category].count += 1;
    });

    return Object.values(transactionStats).map(stat => ({
      ...stat,
      avgHours: stat.count > 0 ? (stat.totalHours / stat.count).toFixed(1) : 0
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries]);

  // Process client data
  const clientData = useMemo(() => {
    const clientStats = {};
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    filteredEntries.forEach(entry => {
      const clientName = entry.client || entry.company || 'Unknown';
      const primaryHours = parseFloat(entry.hours) || 0;
      const secondaryHours = parseFloat(entry.secondaryHours) || 0;
      const totalHours = primaryHours + secondaryHours;
      const category = entry.billingCategory || entry.category || 'Other';
      
      // Use the 'date' field if available, otherwise construct from year/month
      let entryDate;
      if (entry.date && entry.date.toDate) {
        entryDate = entry.date.toDate(); // Firestore Timestamp
      } else if (entry.date) {
        entryDate = new Date(entry.date);
      } else {
        entryDate = new Date(entry.year, getMonthNumber(entry.month) - 1);
      }

      if (!clientStats[clientName]) {
        clientStats[clientName] = {
          name: clientName,
          monthlyHours: 0,
          annualHours: 0,
          uniqueTransactions: new Set(),
          transactionHours: 0,
          transactionCount: 0,
          lastActivity: entryDate,
          stage: 'Unknown'
        };
      }

      clientStats[clientName].annualHours += totalHours;
      clientStats[clientName].monthlyHours += totalHours;
      clientStats[clientName].uniqueTransactions.add(category);
      clientStats[clientName].transactionCount += 1;
      clientStats[clientName].transactionHours += totalHours;

      if (entryDate > clientStats[clientName].lastActivity) {
        clientStats[clientName].lastActivity = entryDate;
      }
    });

    return Object.values(clientStats).map(client => ({
      name: client.name,
      monthlyHours: Math.round(client.monthlyHours / 12), // Approximate
      annualHours: Math.round(client.annualHours),
      uniqueTransactions: client.uniqueTransactions.size,
      avgHoursPerTransaction: client.transactionCount > 0 
        ? (client.transactionHours / client.transactionCount).toFixed(1) 
        : 0,
      lastActivity: client.lastActivity.toISOString().split('T')[0],
      status: client.lastActivity >= sixMonthsAgo ? 'active' : 'inactive',
      stage: client.stage
    }));
  }, [filteredEntries]);

  // Process ops data
  const opsData = useMemo(() => {
    const opsStats = {};
    let totalOpsHours = 0;

    filteredEntries.forEach(entry => {
      // Check if this is an ops entry by looking at the 'ops' field
      const isOps = entry.ops && entry.ops !== '' && entry.ops !== 'null';
      
      if (isOps) {
        const category = entry.ops || 'Other Ops'; // Use the ops field as the category
        const primaryHours = parseFloat(entry.hours) || 0;
        const secondaryHours = parseFloat(entry.secondaryHours) || 0;
        const totalHours = primaryHours + secondaryHours;
        
        if (!opsStats[category]) {
          opsStats[category] = 0;
        }
        opsStats[category] += totalHours;
        totalOpsHours += totalHours;
      }
    });

    return Object.entries(opsStats).map(([category, hours]) => ({
      category,
      hours: Math.round(hours * 10) / 10, // Round to 1 decimal
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
    if (dateRange === 'custom') {
      return `${customDateStart} to ${customDateEnd}`;
    }
    const labels = {
      'last-week': 'Last Week',
      'last-month': 'Last Month',
      'last-quarter': 'Last Quarter',
      'year-to-date': 'Year to Date',
    };
    return labels[dateRange] || 'Last Month';
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
          
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{getDateRangeLabel()}</span>
            </button>

            {showDatePicker && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                <div className="space-y-2">
                  {[
                    { value: 'last-week', label: 'Last Week' },
                    { value: 'last-month', label: 'Last Month' },
                    { value: 'last-quarter', label: 'Last Quarter' },
                    { value: 'year-to-date', label: 'Year to Date' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDateRange(option.value);
                        setShowDatePicker(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 transition-colors ${
                        dateRange === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-2">Custom Range</p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Start date"
                      />
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="End date"
                      />
                      <button
                        onClick={() => {
                          if (customDateStart && customDateEnd) {
                            setDateRange('custom');
                            setShowDatePicker(false);
                          }
                        }}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        disabled={!customDateStart || !customDateEnd}
                      >
                        Apply Custom Range
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            <div className="flex justify-between gap-3 w-full">
              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Avg Utilization</span>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{avgUtilization}%</div>
                </div>
                <div className="flex items-center justify-center text-sm text-gray-600">
                  {attorneyData.length} attorneys
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Time Split</span>
                  <DollarSign className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.round((totalBillable / (totalBillable + totalOps)) * 100)}%
                    </div>
                    <div className="text-xl text-gray-400">/</div>
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round((totalOps / (totalBillable + totalOps)) * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 text-center">Billable / Ops</div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Billable</span>
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{Math.round(totalBillable)}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  {totalBillableTarget > 0 ? Math.round((totalBillable / totalBillableTarget) * 100) : 0}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Ops</span>
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{Math.round(totalOps)}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  {totalOpsTarget > 0 ? Math.round((totalOps / totalOpsTarget) * 100) : 0}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Billable Ratio</span>
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {totalOps > 0 ? (totalBillable / totalOps).toFixed(1) : '0'}:1
                  </div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  Billable to Ops
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
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalHours" fill="#0088FE" name="Total Hours" />
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
                          {Math.round(attorney.billable)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(attorney.ops)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {Math.round(total)}h
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
                <BarChart data={attorneyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="billable" fill="#0088FE" name="Billable Hours" />
                  <Bar dataKey="ops" fill="#00C49F" name="Ops Hours" />
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
                          {Math.round(txn.totalHours)}h
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
                  <Tooltip />
                  <Bar dataKey="avgHours" fill="#FFBB28" name="Avg Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ops View */}
        {selectedView === 'ops' && opsData.length > 0 && (
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
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
                      Annual Hours {sortConfig.key === 'annualHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('uniqueTransactions')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Unique Transactions {sortConfig.key === 'uniqueTransactions' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                  Annual Hours by Client
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="annualHours" fill="#0088FE" name="Annual Hours" />
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
                    <Tooltip />
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