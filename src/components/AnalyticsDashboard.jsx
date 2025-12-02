import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Activity, Calendar, Search, ChevronDown } from 'lucide-react';
import { useAllTimeEntries, useAttorneys, useClients } from '../hooks/useFirestoreData';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
  '#82ca9d', '#ffc658', '#ff7c43', '#665191', '#a05195',
  '#d45087', '#f95d6a', '#ff7c43', '#2f4b7c', '#003f5c',
  '#7a5195', '#bc5090', '#ef5675', '#ff764a', '#ffa600',
  '#488f31', '#de425b', '#69b3a2', '#404080', '#f4a261'
];

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
  const [dateRange, setDateRange] = useState('all-time');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hoveredBarKey, setHoveredBarKey] = useState(null);
  const [transactionAttorneyFilter, setTransactionAttorneyFilter] = useState('all');
  const [attorneySortConfig, setAttorneySortConfig] = useState({ key: 'name', direction: 'asc' });
  const [transactionSortConfig, setTransactionSortConfig] = useState({ key: 'totalHours', direction: 'desc' });
  const [opsSortConfig, setOpsSortConfig] = useState({ key: 'hours', direction: 'desc' });
  const [clientSortConfig, setClientSortConfig] = useState({ key: 'totalHours', direction: 'desc' });

  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data from Firebase
  const { data: allEntries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  const { attorneys: firebaseAttorneys, loading: attorneysLoading, error: attorneysError } = useAttorneys();
  const { clients: firebaseClients, loading: clientsLoading, error: clientsError } = useClients();

  const loading = entriesLoading || attorneysLoading || clientsLoading;
  const error = entriesError || attorneysError || clientsError;

  // Helper function to convert month name to number
  const getMonthNumber = (monthName) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months.findIndex(m => m.toLowerCase() === monthName?.toLowerCase()) + 1 || 1;
  };

  // Helper function to get date from entry (handles billableDate, opsDate, or year/month)
  // Converts to PST (UTC-8) for consistent date handling
  const getEntryDate = (entry) => {
    let date;
    
    // Try billableDate first (new format)
    if (entry.billableDate?.toDate) {
      date = entry.billableDate.toDate();
    } else if (entry.billableDate) {
      date = new Date(entry.billableDate);
    }
    // Try opsDate
    else if (entry.opsDate?.toDate) {
      date = entry.opsDate.toDate();
    } else if (entry.opsDate) {
      date = new Date(entry.opsDate);
    }
    // Try date field
    else if (entry.date?.toDate) {
      date = entry.date.toDate();
    } else if (entry.date) {
      date = new Date(entry.date);
    }
    // Fallback to year/month
    else {
      date = new Date(entry.year, getMonthNumber(entry.month) - 1);
    }
    
    return date;
  };

  // Helper to get current date/time in PST
  const getPSTDate = () => {
    const now = new Date();
    // Convert to PST by creating a date string in PST timezone
    const pstString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    return new Date(pstString);
  };

  // Helper to create a date in PST from year, month, day
  const createPSTDate = (year, month, day, hours = 0, minutes = 0, seconds = 0, ms = 0) => {
    // Create the date as if it's in PST
    const date = new Date(year, month, day, hours, minutes, seconds, ms);
    return date;
  };

  // Create attorney name map
  const attorneyMap = useMemo(() => {
    const map = {};
    firebaseAttorneys.forEach(attorney => {
      map[attorney.id] = attorney.name || attorney.id;
    });
    return map;
  }, [firebaseAttorneys]);

  // Process data based on date range (using PST)
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];

    // If "all-time" selected, return all entries
    if (dateRange === 'all-time') {
      return allEntries;
    }

    const now = getPSTDate();
    let startDate;
    let endDate = new Date(now);

    switch (dateRange) {
      case 'current-week':
        // Start of current week (Sunday) in PST
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        break;
      case 'current-month':
        // Start of current month in PST
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last-month':
        // Start of last month to end of last month in PST
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'trailing-60':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60, 0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          // Parse date strings directly to avoid timezone issues
          const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        } else {
          return allEntries;
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return allEntries.filter(entry => {
      const entryDate = getEntryDate(entry);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [allEntries, dateRange, customDateStart, customDateEnd]);

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

    // Filter entries by attorney if one is selected
    const entriesToProcess = transactionAttorneyFilter === 'all' 
      ? filteredEntries 
      : filteredEntries.filter(entry => {
          const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
          return attorneyName === transactionAttorneyFilter;
        });

    entriesToProcess.forEach(entry => {
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
  }, [filteredEntries, transactionAttorneyFilter, attorneyMap]);

  // Process client data - uses Firebase clients collection as master list
  const clientData = useMemo(() => {
    // Build a map of time entry stats by client name
    const entryStats = {};
    
    filteredEntries.forEach(entry => {
      const clientName = entry.client || 'Unknown';
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const totalHours = billableHours + opsHours;
      const category = entry.billingCategory || entry.category || 'Other';
      const earnings = entry.billablesEarnings || 0;
      const entryDate = getEntryDate(entry);

      if (!entryStats[clientName]) {
        entryStats[clientName] = {
          totalHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionCount: 0,
          lastActivity: entryDate,
        };
      }

      entryStats[clientName].totalHours += totalHours;
      entryStats[clientName].totalEarnings += earnings;
      entryStats[clientName].uniqueTransactions.add(category);
      entryStats[clientName].transactionCount += 1;

      if (entryDate > entryStats[clientName].lastActivity) {
        entryStats[clientName].lastActivity = entryDate;
      }
    });

    // Use Firebase clients as master list, merge with entry stats
    // Only include clients with status "Active" or "Quiet"
    const activeStatuses = ['Active', 'Quiet'];
    const inactiveStatuses = ['Terminated', 'Dissolved'];
    
    return firebaseClients
      .filter(client => {
        const status = client.status || '';
        // Include Active, Quiet clients (or clients without a status for backward compatibility)
        return activeStatuses.includes(status) || (!inactiveStatuses.includes(status) && status !== '');
      })
      .map(client => {
        const clientName = client.clientName || client.id;
        const stats = entryStats[clientName] || {
          totalHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionCount: 0,
          lastActivity: null,
        };

        // Determine display status based on Firebase status field
        const fbStatus = client.status || '';
        let displayStatus = 'active';
        if (fbStatus === 'Quiet') {
          displayStatus = 'quiet';
        } else if (inactiveStatuses.includes(fbStatus)) {
          displayStatus = 'inactive';
        }

        return {
          name: clientName,
          totalHours: Math.round(stats.totalHours * 10) / 10,
          totalEarnings: stats.totalEarnings,
          uniqueTransactions: stats.uniqueTransactions.size,
          avgHoursPerTransaction: stats.transactionCount > 0 
            ? (stats.totalHours / stats.transactionCount).toFixed(1) 
            : 0,
          lastActivity: stats.lastActivity 
            ? stats.lastActivity.toISOString().split('T')[0] 
            : 'No activity',
          status: displayStatus,
          fbStatus: fbStatus,
          location: client.location || '',
          clientType: client.clientType || '',
          channel: client.channel || '',
          contactEmail: client.contactEmail || '',
          website: client.website || '',
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries, firebaseClients]);

  // Count clients by status from Firebase
  const clientCounts = useMemo(() => {
    const activeStatuses = ['Active', 'Quiet'];
    const inactiveStatuses = ['Terminated', 'Dissolved'];
    
    const active = firebaseClients.filter(c => c.status === 'Active').length;
    const quiet = firebaseClients.filter(c => c.status === 'Quiet').length;
    const terminated = firebaseClients.filter(c => inactiveStatuses.includes(c.status)).length;
    const total = active + quiet; // Only count Active and Quiet as "clients"
    
    return { active, quiet, terminated, total };
  }, [firebaseClients]);

  // Process ops data - only use opsCategory (structured data from dropdown)
  // Entries without a valid opsCategory are grouped into "Other"
  const opsData = useMemo(() => {
    const opsStats = {};
    let totalOpsHours = 0;

    filteredEntries.forEach(entry => {
      const opsHours = entry.opsHours || 0;
      
      if (opsHours > 0) {
        // Use opsCategory if valid, otherwise categorize as "Other"
        const category = (entry.opsCategory && entry.opsCategory.trim() !== '') 
          ? entry.opsCategory 
          : 'Other';
        
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAttorneySort = (key) => {
    let direction = 'desc'; // Default to high-to-low for metrics
    if (key === 'name') {
      direction = 'asc'; // Default to A-Z for name
    }
    if (attorneySortConfig.key === key) {
      // Toggle direction if clicking same column
      direction = attorneySortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setAttorneySortConfig({ key, direction });
  };

  const handleTransactionSort = (key) => {
    let direction = 'desc'; // Default to high-to-low for metrics
    if (key === 'type') {
      direction = 'asc'; // Default to A-Z for type name
    }
    if (transactionSortConfig.key === key) {
      // Toggle direction if clicking same column
      direction = transactionSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setTransactionSortConfig({ key, direction });
  };

  const getSortedAttorneys = () => {
    const attorneys = [...attorneyData];
    
    attorneys.sort((a, b) => {
      let aVal, bVal;
      
      switch (attorneySortConfig.key) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'billable':
          aVal = a.billable;
          bVal = b.billable;
          break;
        case 'ops':
          aVal = a.ops;
          bVal = b.ops;
          break;
        case 'total':
          aVal = a.billable + a.ops;
          bVal = b.billable + b.ops;
          break;
        case 'earnings':
          aVal = a.earnings;
          bVal = b.earnings;
          break;
        case 'utilization':
          aVal = calculateUtilization(a);
          bVal = calculateUtilization(b);
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      if (aVal < bVal) {
        return attorneySortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return attorneySortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return attorneys;
  };

  const getSortedTransactions = () => {
    const transactions = [...transactionData];
    const totalHours = transactions.reduce((sum, t) => sum + t.totalHours, 0);
    
    transactions.sort((a, b) => {
      let aVal, bVal;
      
      switch (transactionSortConfig.key) {
        case 'type':
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
          break;
        case 'avgHours':
          aVal = parseFloat(a.avgHours);
          bVal = parseFloat(b.avgHours);
          break;
        case 'count':
          aVal = a.count;
          bVal = b.count;
          break;
        case 'totalHours':
          aVal = a.totalHours;
          bVal = b.totalHours;
          break;
        case 'totalEarnings':
          aVal = a.totalEarnings;
          bVal = b.totalEarnings;
          break;
        case 'percentage':
          aVal = totalHours > 0 ? (a.totalHours / totalHours) : 0;
          bVal = totalHours > 0 ? (b.totalHours / totalHours) : 0;
          break;
        default:
          aVal = a.totalHours;
          bVal = b.totalHours;
      }
      
      if (aVal < bVal) {
        return transactionSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return transactionSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return transactions;
  };

  const handleOpsSort = (key) => {
    let direction = 'desc'; // Default to high-to-low for metrics
    if (key === 'category') {
      direction = 'asc'; // Default to A-Z for category name
    }
    if (opsSortConfig.key === key) {
      direction = opsSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setOpsSortConfig({ key, direction });
  };

  const getSortedOps = () => {
    const ops = [...opsData];
    
    ops.sort((a, b) => {
      let aVal, bVal;
      
      switch (opsSortConfig.key) {
        case 'category':
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case 'hours':
          aVal = a.hours;
          bVal = b.hours;
          break;
        case 'percentage':
          aVal = parseFloat(a.percentage);
          bVal = parseFloat(b.percentage);
          break;
        default:
          aVal = a.hours;
          bVal = b.hours;
      }
      
      if (aVal < bVal) {
        return opsSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return opsSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return ops;
  };

  const handleClientSort = (key) => {
    let direction = 'desc'; // Default to high-to-low for metrics
    if (key === 'name' || key === 'location' || key === 'status') {
      direction = 'asc'; // Default to A-Z for text fields
    }
    if (clientSortConfig.key === key) {
      direction = clientSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setClientSortConfig({ key, direction });
  };

  const getSortedClients = () => {
    let filtered = clientData.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (clientSortConfig.key) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'status':
          aVal = a.totalHours > 0 ? 'active' : 'inactive';
          bVal = b.totalHours > 0 ? 'active' : 'inactive';
          break;
        case 'location':
          aVal = (a.location || '').toLowerCase();
          bVal = (b.location || '').toLowerCase();
          break;
        case 'totalHours':
          aVal = a.totalHours;
          bVal = b.totalHours;
          break;
        case 'totalEarnings':
          aVal = a.totalEarnings;
          bVal = b.totalEarnings;
          break;
        case 'lastActivity':
          aVal = a.lastActivity === 'No activity' ? '' : a.lastActivity;
          bVal = b.lastActivity === 'No activity' ? '' : b.lastActivity;
          break;
        default:
          aVal = a.totalHours;
          bVal = b.totalHours;
      }
      
      if (aVal < bVal) {
        return clientSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return clientSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  };

  const getDateRangeLabel = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const formatDateRange = (start, end) => {
      const startStr = `${monthNames[start.getMonth()]} ${start.getDate()}`;
      const endStr = `${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      return `${startStr} - ${endStr}`;
    };

    if (dateRange === 'all-time') {
      return 'All Time';
    }

    const now = getPSTDate();
    let startDate;
    let endDate = new Date(now);

    switch (dateRange) {
      case 'current-week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        return `Current Week (${formatDateRange(startDate, endDate)})`;
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        return `Current Month (${formatDateRange(startDate, endDate)})`;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        return `Last Month (${formatDateRange(startDate, endDate)})`;
      case 'trailing-60':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
        return `Trailing 60 Days (${formatDateRange(startDate, endDate)})`;
      case 'custom':
        if (customDateStart && customDateEnd) {
          const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
          const start = `${monthNames[startMonth - 1]} ${startDay}`;
          const end = `${monthNames[endMonth - 1]} ${endDay}, ${endYear}`;
          return `${start} - ${end}`;
        }
        return 'Custom Range';
      default:
        return 'All Time';
    }
  };

  const handleDateRangeSelect = (value) => {
    if (value !== 'custom') {
      setDateRange(value);
      setShowDateDropdown(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (customDateStart && customDateEnd) {
      setDateRange('custom');
      setShowDateDropdown(false);
    }
  };

  // Custom label for pie chart - only show for slices >= 5%
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, hours, percentage }) => {
    // Only show label if slice is >= 5%
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
        {`${hours}h (${percentage}%)`}
      </text>
    );
  };

  // Date Range Dropdown Component
  const DateRangeDropdown = () => (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDateDropdown(!showDateDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">{getDateRangeLabel()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDateDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Preset Options */}
          <div className="py-1">
            {[
              { value: 'all-time', label: 'All Time' },
              { value: 'current-week', label: 'Current Week' },
              { value: 'current-month', label: 'Current Month' },
              { value: 'last-month', label: 'Last Month' },
              { value: 'trailing-60', label: 'Trailing 60 Days' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleDateRangeSelect(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  dateRange === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Range Section */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Custom Range</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleApplyCustomRange}
                disabled={!customDateStart || !customDateEnd}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  customDateStart && customDateEnd
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (filteredEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Cedar Grove Analytics</h1>
              <p className="text-gray-600">Law firm performance dashboard</p>
            </div>
            <DateRangeDropdown />
          </div>

          {/* No Data Message */}
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-900 text-xl mb-4">No data available</div>
              <div className="text-gray-600">
                No time entries found for the selected date range. Try selecting a different time period above.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Cedar Grove Analytics</h1>
            <p className="text-gray-600">Attorney time allocation and efficiency insights</p>
          </div>
          
          {/* Date Range Dropdown */}
          <DateRangeDropdown />
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
                    <th 
                      onClick={() => handleAttorneySort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Attorney {attorneySortConfig.key === 'name' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('billable')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Billable Hours {attorneySortConfig.key === 'billable' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('ops')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Ops Hours {attorneySortConfig.key === 'ops' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('total')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total {attorneySortConfig.key === 'total' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('earnings')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Earnings {attorneySortConfig.key === 'earnings' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('utilization')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Utilization {attorneySortConfig.key === 'utilization' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedAttorneys().map((attorney, idx) => {
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
            <div className="flex items-center justify-between">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                </span>
              </div>
              
              {/* Attorney Filter */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600" />
                <select
                  value={transactionAttorneyFilter}
                  onChange={(e) => setTransactionAttorneyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Attorneys</option>
                  {attorneyData.map(attorney => (
                    <option key={attorney.name} value={attorney.name}>
                      {attorney.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleTransactionSort('type')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Transaction Type {transactionSortConfig.key === 'type' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('avgHours')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Avg Hours {transactionSortConfig.key === 'avgHours' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('count')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Count {transactionSortConfig.key === 'count' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('totalHours')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours {transactionSortConfig.key === 'totalHours' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('totalEarnings')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Earnings {transactionSortConfig.key === 'totalEarnings' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('percentage')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      % of Total {transactionSortConfig.key === 'percentage' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedTransactions().map((txn, idx) => {
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
                        <th 
                          onClick={() => handleOpsSort('category')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Ops Category {opsSortConfig.key === 'category' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleOpsSort('hours')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Total Hours {opsSortConfig.key === 'hours' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleOpsSort('percentage')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          % of Total Ops {opsSortConfig.key === 'percentage' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSortedOps().map((ops, idx) => (
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
                  <ResponsiveContainer width="100%" height={450}>
                    <PieChart margin={{ top: 40, right: 40, bottom: 20, left: 40 }}>
                      <Pie
                        data={opsData}
                        dataKey="hours"
                        nameKey="category"
                        cx="50%"
                        cy="40%"
                        outerRadius={120}
                        label={renderCustomLabel}
                        labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                      >
                        {opsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [`${value}h`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                      />
                      <Legend 
                        layout="horizontal" 
                        align="center" 
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
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
                      {clientData.filter(c => c.totalHours > 0).length}
                    </div>
                    <span className="text-gray-400 text-xs">with transactions in period</span>
                  </div>
                  <div className="text-gray-300 text-4xl font-light mx-4">/</div>
                  <div>
                    <span className="text-gray-600 text-sm">Inactive Clients</span>
                    <div className="text-3xl font-bold text-red-600 mt-2">
                      {clientData.filter(c => c.totalHours === 0).length}
                    </div>
                    <span className="text-gray-400 text-xs">no transactions in period</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-gray-500 text-sm">Total: {clientCounts.total} clients (Active + Quiet)</span>
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
                      onClick={() => handleClientSort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Client Name {clientSortConfig.key === 'name' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('status')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Status {clientSortConfig.key === 'status' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('location')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Location {clientSortConfig.key === 'location' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('totalHours')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours {clientSortConfig.key === 'totalHours' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('totalEarnings')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Earnings {clientSortConfig.key === 'totalEarnings' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('lastActivity')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Last Activity {clientSortConfig.key === 'lastActivity' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
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
                            client.totalHours > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.totalHours > 0 ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatHours(client.totalHours)}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatCurrency(client.totalEarnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.lastActivity !== 'No activity' 
                          ? new Date(client.lastActivity).toLocaleDateString() 
                          : 'No activity'}
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
                  <BarChart data={clientData.filter(c => c.totalHours > 0).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="totalHours" fill="#0088FE" name="Total Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Service Breadth (Unique Transaction Types)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientData.filter(c => c.uniqueTransactions > 0).slice(0, 10)}>
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