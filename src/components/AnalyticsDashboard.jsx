import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Activity, Calendar, Search, ChevronDown, Settings } from 'lucide-react';
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

// Transaction row tooltip component
const TransactionRowTooltip = ({ transaction, position, formatCurrency, formatHours }) => {
  if (!transaction) return null;

  const attorneyBreakdown = Object.entries(transaction.byAttorney || {})
    .sort((a, b) => b[1].count - a[1].count);

  // Helper to format dates (handles Firestore Timestamps and strings)
  const formatDate = (date) => {
    if (!date) return 'No date';
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    // Handle string dates
    if (typeof date === 'string') {
      return date;
    }
    // Handle Date objects
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return 'No date';
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-2xl p-5"
      style={{ 
        left: Math.min(position.x + 15, window.innerWidth - 750),
        top: Math.max(10, Math.min(position.y - 200, window.innerHeight - 550)),
        width: '700px',
      }}
    >
      {/* Header */}
      <div className="font-bold text-gray-900 text-xl mb-4 pb-3 border-b-2 border-blue-200">
        {transaction.type}
        <span className="text-sm font-normal text-gray-500 ml-3">
          {transaction.count} total entries • {formatHours(transaction.totalHours)}h • {formatCurrency(transaction.totalEarnings)}
        </span>
      </div>
      
      {/* Attorney Breakdown - Horizontal */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">By Attorney:</div>
        <div className="flex flex-wrap gap-2">
          {attorneyBreakdown.map(([attorney, stats]) => (
            <div key={attorney} className="inline-flex items-center bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <span className="font-medium text-gray-800">{attorney}</span>
              <span className="text-gray-500 ml-2">({stats.count})</span>
              <span className="text-blue-600 font-semibold ml-2">{formatHours(stats.hours)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries Table */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Recent Entries:
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Attorney</th>
              <th className="px-3 py-2 text-left font-semibold">Client</th>
              <th className="px-3 py-2 text-right font-semibold">Hours</th>
              <th className="px-3 py-2 text-right font-semibold">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(transaction.entries || []).slice(0, 10).map((entry, idx) => (
              <tr key={idx} className="hover:bg-blue-50">
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{entry.attorney}</td>
                <td className="px-3 py-2 text-gray-700 truncate max-w-[200px]" title={entry.client}>{entry.client}</td>
                <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatHours(entry.hours)}h</td>
                <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCurrency(entry.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transaction.count > 10 && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            Showing 10 of {transaction.count} entries
          </div>
        )}
      </div>
    </div>
  );
};

// Ops row tooltip component
const OpsRowTooltip = ({ ops, position, formatHours }) => {
  if (!ops) return null;

  const attorneyBreakdown = Object.entries(ops.byAttorney || {})
    .sort((a, b) => b[1].hours - a[1].hours);

  // Helper to format dates (handles Firestore Timestamps and strings)
  const formatDate = (date) => {
    if (!date) return 'No date';
    if (date && typeof date === 'object' && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    if (typeof date === 'string') {
      return date;
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return 'No date';
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-2xl p-5"
      style={{ 
        left: Math.min(position.x + 15, window.innerWidth - 650),
        top: Math.max(10, Math.min(position.y - 200, window.innerHeight - 550)),
        width: '600px',
      }}
    >
      {/* Header */}
      <div className="font-bold text-gray-900 text-xl mb-4 pb-3 border-b-2 border-green-200">
        {ops.category}
        <span className="text-sm font-normal text-gray-500 ml-3">
          {ops.count} entries • {formatHours(ops.hours)}h • {ops.percentage}% of total
        </span>
      </div>
      
      {/* Attorney Breakdown - Horizontal */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">By Attorney:</div>
        <div className="flex flex-wrap gap-2">
          {attorneyBreakdown.map(([attorney, stats]) => (
            <div key={attorney} className="inline-flex items-center bg-green-50 px-3 py-1.5 rounded-full text-sm">
              <span className="font-medium text-gray-800">{attorney}</span>
              <span className="text-gray-500 ml-2">({stats.count})</span>
              <span className="text-green-600 font-semibold ml-2">{formatHours(stats.hours)}h</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries Table */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Recent Entries:
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Attorney</th>
              <th className="px-3 py-2 text-left font-semibold">Notes</th>
              <th className="px-3 py-2 text-right font-semibold">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(ops.entries || []).slice(0, 10).map((entry, idx) => (
              <tr key={idx} className="hover:bg-green-50">
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{entry.attorney}</td>
                <td className="px-3 py-2 text-gray-700 truncate max-w-[250px]" title={entry.notes}>{entry.notes || '-'}</td>
                <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatHours(entry.hours)}h</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ops.count > 10 && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            Showing 10 of {ops.count} entries
          </div>
        )}
      </div>
    </div>
  );
};

// Client row tooltip component
const ClientRowTooltip = ({ client, position, formatCurrency, formatHours }) => {
  if (!client || client.entryCount === 0) return null;

  const attorneyBreakdown = Object.entries(client.byAttorney || {})
    .sort((a, b) => b[1].hours - a[1].hours);
  
  const categoryBreakdown = Object.entries(client.byCategory || {})
    .sort((a, b) => b[1].hours - a[1].hours);

  // Helper to format dates (handles Firestore Timestamps and strings)
  const formatDate = (date) => {
    if (!date) return 'No date';
    if (date && typeof date === 'object' && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    if (typeof date === 'string') {
      return date;
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return 'No date';
  };

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-2xl p-5"
      style={{ 
        left: Math.min(position.x + 15, window.innerWidth - 750),
        top: Math.max(10, Math.min(position.y - 200, window.innerHeight - 550)),
        width: '700px',
      }}
    >
      {/* Header */}
      <div className="font-bold text-gray-900 text-xl mb-4 pb-3 border-b-2 border-purple-200">
        {client.name}
        <span className="text-sm font-normal text-gray-500 ml-3">
          {client.entryCount} entries • {formatHours(client.totalHours)}h • {formatCurrency(client.totalEarnings)}
        </span>
      </div>
      
      {/* Attorney Breakdown - Horizontal */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">By Attorney:</div>
        <div className="flex flex-wrap gap-2">
          {attorneyBreakdown.map(([attorney, stats]) => (
            <div key={attorney} className="inline-flex items-center bg-purple-50 px-3 py-1.5 rounded-full text-sm">
              <span className="font-medium text-gray-800">{attorney}</span>
              <span className="text-gray-500 ml-2">({stats.count})</span>
              <span className="text-purple-600 font-semibold ml-2">{formatHours(stats.hours)}h</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Category Breakdown - Horizontal */}
      {categoryBreakdown.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">By Transaction Type:</div>
          <div className="flex flex-wrap gap-2">
            {categoryBreakdown.slice(0, 8).map(([category, stats]) => (
              <div key={category} className="inline-flex items-center bg-blue-50 px-3 py-1.5 rounded-full text-sm">
                <span className="font-medium text-gray-800">{category}</span>
                <span className="text-blue-600 font-semibold ml-2">{formatHours(stats.hours)}h</span>
              </div>
            ))}
            {categoryBreakdown.length > 8 && (
              <div className="inline-flex items-center bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-500">
                +{categoryBreakdown.length - 8} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Entries Table */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          Recent Transactions:
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-xs uppercase">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Attorney</th>
              <th className="px-3 py-2 text-left font-semibold">Type</th>
              <th className="px-3 py-2 text-right font-semibold">Hours</th>
              <th className="px-3 py-2 text-right font-semibold">Earnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(client.entries || []).slice(0, 10).map((entry, idx) => (
              <tr key={idx} className="hover:bg-purple-50">
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{entry.attorney}</td>
                <td className="px-3 py-2 text-gray-700 truncate max-w-[150px]" title={entry.category}>{entry.category}</td>
                <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatHours(entry.totalHours)}h</td>
                <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCurrency(entry.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {client.entryCount > 10 && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            Showing 10 of {client.entryCount} entries
          </div>
        )}
      </div>
    </div>
  );
};

const CedarGroveAnalytics = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedAttorney, setSelectedAttorney] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRange, setDateRange] = useState('current-month');
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
  const [hoveredTransaction, setHoveredTransaction] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredOps, setHoveredOps] = useState(null);
  const [opsTooltipPosition, setOpsTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredClient, setHoveredClient] = useState(null);
  const [clientTooltipPosition, setClientTooltipPosition] = useState({ x: 0, y: 0 });
  const [clientActivityPeriod, setClientActivityPeriod] = useState('3-months'); // Default to trailing 3 months
  const [clientActivityStartDate, setClientActivityStartDate] = useState('');
  const [clientActivityEndDate, setClientActivityEndDate] = useState('');
  const [globalAttorneyFilter, setGlobalAttorneyFilter] = useState([]); // Array of selected attorney names
  const [showAttorneyDropdown, setShowAttorneyDropdown] = useState(false);
  const [attorneyFilterInitialized, setAttorneyFilterInitialized] = useState(false);

  const dropdownRef = useRef(null);
  const tooltipRef = useRef(null);
  const attorneyDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDateDropdown(false);
      }
      if (attorneyDropdownRef.current && !attorneyDropdownRef.current.contains(event.target)) {
        setShowAttorneyDropdown(false);
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

  // Get list of all attorney names for global filter dropdown
  const allAttorneyNames = useMemo(() => {
    const names = new Set();
    // Get from Firebase attorneys
    firebaseAttorneys.forEach(attorney => {
      names.add(attorney.name || attorney.id);
    });
    // Also get from entries in case there are any not in the attorneys collection
    if (allEntries) {
      allEntries.forEach(entry => {
        const name = attorneyMap[entry.attorneyId] || entry.attorneyId;
        if (name) names.add(name);
      });
    }
    return Array.from(names).sort();
  }, [firebaseAttorneys, allEntries, attorneyMap]);

  // Initialize attorney filter with all attorneys once loaded
  useEffect(() => {
    if (!attorneyFilterInitialized && allAttorneyNames.length > 0) {
      setGlobalAttorneyFilter([...allAttorneyNames]);
      setAttorneyFilterInitialized(true);
    }
  }, [allAttorneyNames, attorneyFilterInitialized]);

  // Process data based on date range (using PST)
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];

    let entries = allEntries;

    // Filter by date range
    if (dateRange !== 'all-time') {
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
            break;
          }
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }

      if (startDate) {
        entries = entries.filter(entry => {
          const entryDate = getEntryDate(entry);
          return entryDate >= startDate && entryDate <= endDate;
        });
      }
    }

    // Filter by selected attorneys (global filter)
    if (globalAttorneyFilter.length > 0) {
      entries = entries.filter(entry => {
        const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
        return globalAttorneyFilter.includes(attorneyName);
      });
    }

    return entries;
  }, [allEntries, dateRange, customDateStart, customDateEnd, globalAttorneyFilter, attorneyMap]);

  // Calculate the number of months in the selected date range for target scaling
  const monthsInDateRange = useMemo(() => {
    const now = getPSTDate();
    let startDate;
    let endDate = new Date(now);

    switch (dateRange) {
      case 'all-time':
        // For all-time, calculate from earliest entry to now
        if (allEntries && allEntries.length > 0) {
          const dates = allEntries.map(e => getEntryDate(e)).filter(d => d);
          if (dates.length > 0) {
            startDate = new Date(Math.min(...dates.map(d => d.getTime())));
          } else {
            return 1;
          }
        } else {
          return 1;
        }
        break;
      case 'current-week':
        // A week is roughly 0.25 months
        return 0.25;
      case 'current-month':
        // Current month - calculate fraction of month elapsed
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        return dayOfMonth / daysInMonth;
      case 'last-month':
        return 1;
      case 'trailing-60':
        return 2; // ~60 days = ~2 months
      case 'custom':
        if (customDateStart && customDateEnd) {
          const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay);
          endDate = new Date(endYear, endMonth - 1, endDay);
        } else {
          return 1;
        }
        break;
      default:
        return 1;
    }

    if (startDate && endDate) {
      // Calculate months between dates
      const msPerMonth = 1000 * 60 * 60 * 24 * 30.44; // Average days per month
      const months = (endDate.getTime() - startDate.getTime()) / msPerMonth;
      return Math.max(0.25, months); // Minimum of 1 week equivalent
    }

    return 1;
  }, [dateRange, customDateStart, customDateEnd, allEntries]);

  // Process attorney data - updated to use new field names
  const attorneyData = useMemo(() => {
    const attorneyStats = {};
    
    // Monthly targets (base values)
    const monthlyTarget = 150;
    const monthlyBillableTarget = 100;
    const monthlyOpsTarget = 50;
    
    // Scale targets based on date range
    const scaledTarget = Math.round(monthlyTarget * monthsInDateRange * 10) / 10;
    const scaledBillableTarget = Math.round(monthlyBillableTarget * monthsInDateRange * 10) / 10;
    const scaledOpsTarget = Math.round(monthlyOpsTarget * monthsInDateRange * 10) / 10;

    filteredEntries.forEach(entry => {
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      
      if (!attorneyStats[attorneyName]) {
        attorneyStats[attorneyName] = {
          name: attorneyName,
          billable: 0,
          ops: 0,
          earnings: 0,
          target: scaledTarget,
          billableTarget: scaledBillableTarget,
          opsTarget: scaledOpsTarget,
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
  }, [filteredEntries, attorneyMap, monthsInDateRange]);

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
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;

      // Only count entries with billable hours for transaction stats
      if (billableHours > 0) {
        if (!transactionStats[category]) {
          transactionStats[category] = {
            type: category,
            totalHours: 0,
            totalEarnings: 0,
            count: 0,
            byAttorney: {},
            entries: []
          };
        }

        transactionStats[category].totalHours += billableHours;
        transactionStats[category].totalEarnings += earnings;
        transactionStats[category].count += 1;
        
        // Track by attorney
        if (!transactionStats[category].byAttorney[attorneyName]) {
          transactionStats[category].byAttorney[attorneyName] = {
            count: 0,
            hours: 0,
            earnings: 0
          };
        }
        transactionStats[category].byAttorney[attorneyName].count += 1;
        transactionStats[category].byAttorney[attorneyName].hours += billableHours;
        transactionStats[category].byAttorney[attorneyName].earnings += earnings;
        
        // Store entry details (limit to most recent 50 for performance)
        if (transactionStats[category].entries.length < 50) {
          transactionStats[category].entries.push({
            attorney: attorneyName,
            client: entry.client || 'Unknown',
            hours: billableHours,
            earnings: earnings,
            date: entry.billableDate || entry.date || '',
            notes: entry.notes || ''
          });
        }
      }
    });

    return Object.values(transactionStats).map(stat => ({
      ...stat,
      avgHours: stat.count > 0 ? (stat.totalHours / stat.count).toFixed(1) : 0,
      avgEarnings: stat.count > 0 ? (stat.totalEarnings / stat.count).toFixed(2) : 0,
      // Sort entries by date descending
      entries: stat.entries.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date) - new Date(a.date);
      })
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries, transactionAttorneyFilter, attorneyMap]);

  // Calculate client activity period date range
  const clientActivityDateRange = useMemo(() => {
    const now = getPSTDate();
    let startDate = null;
    let endDate = now;
    
    switch (clientActivityPeriod) {
      case '2-weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 14);
        break;
      case '1-month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '2-months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 2);
        break;
      case '3-months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6-months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '9-months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 9);
        break;
      case '12-months':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '18-months':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 18);
        break;
      case '24-months':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      case 'custom':
        if (clientActivityStartDate) {
          startDate = new Date(clientActivityStartDate + 'T00:00:00');
        }
        if (clientActivityEndDate) {
          endDate = new Date(clientActivityEndDate + 'T23:59:59');
        }
        break;
      case 'all-time':
      default:
        startDate = null;
        break;
    }
    
    return { startDate, endDate };
  }, [clientActivityPeriod, clientActivityStartDate, clientActivityEndDate]);

  // Process client data - uses Firebase clients collection as master list
  const clientData = useMemo(() => {
    // Filter entries by client activity period
    const clientActivityEntries = clientActivityPeriod === 'all-time' 
      ? filteredEntries 
      : filteredEntries.filter(entry => {
          const entryDate = getEntryDate(entry);
          if (!entryDate) return false;
          
          const afterStart = !clientActivityDateRange.startDate || entryDate >= clientActivityDateRange.startDate;
          const beforeEnd = !clientActivityDateRange.endDate || entryDate <= clientActivityDateRange.endDate;
          
          return afterStart && beforeEnd;
        });

    // Build a map of time entry stats by client name
    const entryStats = {};
    
    clientActivityEntries.forEach(entry => {
      const clientName = entry.client || 'Unknown';
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const totalHours = billableHours + opsHours;
      const category = entry.billingCategory || entry.category || 'Other';
      const earnings = entry.billablesEarnings || 0;
      const entryDate = getEntryDate(entry);
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;

      if (!entryStats[clientName]) {
        entryStats[clientName] = {
          totalHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionCount: 0,
          lastActivity: entryDate,
          byAttorney: {},
          byCategory: {},
          entries: []
        };
      }

      entryStats[clientName].totalHours += totalHours;
      entryStats[clientName].totalEarnings += earnings;
      entryStats[clientName].uniqueTransactions.add(category);
      entryStats[clientName].transactionCount += 1;

      if (entryDate > entryStats[clientName].lastActivity) {
        entryStats[clientName].lastActivity = entryDate;
      }
      
      // Track by attorney
      if (!entryStats[clientName].byAttorney[attorneyName]) {
        entryStats[clientName].byAttorney[attorneyName] = {
          count: 0,
          hours: 0,
          earnings: 0
        };
      }
      entryStats[clientName].byAttorney[attorneyName].count += 1;
      entryStats[clientName].byAttorney[attorneyName].hours += totalHours;
      entryStats[clientName].byAttorney[attorneyName].earnings += earnings;
      
      // Track by category
      if (!entryStats[clientName].byCategory[category]) {
        entryStats[clientName].byCategory[category] = {
          count: 0,
          hours: 0
        };
      }
      entryStats[clientName].byCategory[category].count += 1;
      entryStats[clientName].byCategory[category].hours += totalHours;
      
      // Store entry details (limit to most recent 50 for performance)
      if (entryStats[clientName].entries.length < 50) {
        entryStats[clientName].entries.push({
          attorney: attorneyName,
          category: category,
          billableHours: billableHours,
          opsHours: opsHours,
          totalHours: totalHours,
          earnings: earnings,
          date: entry.billableDate || entry.opsDate || entry.date || '',
          notes: entry.notes || ''
        });
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
          byAttorney: {},
          byCategory: {},
          entries: []
        };

        // Determine display status based on Firebase status field
        const fbStatus = client.status || '';
        let displayStatus = 'active';
        if (fbStatus === 'Quiet') {
          displayStatus = 'quiet';
        } else if (inactiveStatuses.includes(fbStatus)) {
          displayStatus = 'inactive';
        }

        // Sort entries by date descending
        const sortedEntries = (stats.entries || []).sort((a, b) => {
          if (!a.date || !b.date) return 0;
          const dateA = a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
          const dateB = b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
          return dateB - dateA;
        });

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
          byAttorney: stats.byAttorney || {},
          byCategory: stats.byCategory || {},
          entries: sortedEntries,
          entryCount: stats.transactionCount || 0
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries, firebaseClients, clientActivityPeriod, clientActivityDateRange]);

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
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      
      if (opsHours > 0) {
        // Use opsCategory if valid, otherwise categorize as "Other"
        const category = (entry.opsCategory && entry.opsCategory.trim() !== '') 
          ? entry.opsCategory 
          : 'Other';
        
        if (!opsStats[category]) {
          opsStats[category] = {
            hours: 0,
            byAttorney: {},
            entries: []
          };
        }
        opsStats[category].hours += opsHours;
        totalOpsHours += opsHours;
        
        // Track by attorney
        if (!opsStats[category].byAttorney[attorneyName]) {
          opsStats[category].byAttorney[attorneyName] = {
            count: 0,
            hours: 0
          };
        }
        opsStats[category].byAttorney[attorneyName].count += 1;
        opsStats[category].byAttorney[attorneyName].hours += opsHours;
        
        // Store entry details (limit to most recent 50 for performance)
        if (opsStats[category].entries.length < 50) {
          opsStats[category].entries.push({
            attorney: attorneyName,
            client: entry.client || 'N/A',
            hours: opsHours,
            date: entry.opsDate || entry.billableDate || entry.date || '',
            notes: entry.ops || entry.notes || ''
          });
        }
      }
    });

    return Object.entries(opsStats).map(([category, data]) => ({
      category,
      hours: Math.round(data.hours * 10) / 10,
      percentage: totalOpsHours > 0 ? Math.round((data.hours / totalOpsHours) * 100) : 0,
      byAttorney: data.byAttorney,
      entries: data.entries.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const dateA = a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
        const dateB = b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
        return dateB - dateA;
      }),
      count: data.entries.length
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, attorneyMap]);

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
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, hours, percentage, index }) => {
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
        fill={COLORS[index % COLORS.length]}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
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
            <div className="flex items-center gap-4">
              <Link
                to="/admin/targets"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Manage Targets</span>
              </Link>
              <DateRangeDropdown />
            </div>
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
          
          {/* Right side controls */}
          <div className="flex items-center gap-4">
            <Link
              to="/admin/targets"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Manage Targets</span>
            </Link>
            
            {/* Attorney Filter Dropdown */}
            <div className="relative" ref={attorneyDropdownRef}>
              <button
                onClick={() => setShowAttorneyDropdown(!showAttorneyDropdown)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm ${
                  globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length
                    ? 'bg-purple-50 border-purple-300' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {globalAttorneyFilter.length === 0 
                    ? 'No Attorneys'
                    : globalAttorneyFilter.length === allAttorneyNames.length
                      ? 'All Attorneys'
                      : globalAttorneyFilter.length === 1 
                        ? globalAttorneyFilter[0]
                        : `${globalAttorneyFilter.length} Attorneys`}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showAttorneyDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showAttorneyDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100">
                    <button
                      onClick={() => setGlobalAttorneyFilter([...allAttorneyNames])}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        globalAttorneyFilter.length === allAttorneyNames.length 
                          ? 'bg-purple-100 text-purple-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Attorneys
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {allAttorneyNames.map(name => (
                      <label
                        key={name}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={globalAttorneyFilter.includes(name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setGlobalAttorneyFilter([...globalAttorneyFilter, name]);
                            } else {
                              setGlobalAttorneyFilter(globalAttorneyFilter.filter(n => n !== name));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">{name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => setGlobalAttorneyFilter([])}
                      className="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Date Range Dropdown */}
            <DateRangeDropdown />
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                  <span className="ml-2 text-blue-600">({filteredEntries.length} entries)</span>
                </span>
              </div>
              {globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">
                    Filtered by: <span className="font-semibold">
                      {globalAttorneyFilter.length === 1 
                        ? globalAttorneyFilter[0] 
                        : `${globalAttorneyFilter.length} attorneys`}
                    </span>
                  </span>
                </div>
              )}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                </span>
              </div>
              {globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">
                    Filtered by: <span className="font-semibold">
                      {globalAttorneyFilter.length === 1 
                        ? globalAttorneyFilter[0] 
                        : `${globalAttorneyFilter.length} attorneys`}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleAttorneySort('name')}
                      className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Attorney {attorneySortConfig.key === 'name' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('billable')}
                      className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Billable {attorneySortConfig.key === 'billable' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('ops')}
                      className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Ops {attorneySortConfig.key === 'ops' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('total')}
                      className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Total {attorneySortConfig.key === 'total' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('earnings')}
                      className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Earnings {attorneySortConfig.key === 'earnings' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleAttorneySort('utilization')}
                      className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      Util. {attorneySortConfig.key === 'utilization' && (attorneySortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                  </span>
                </div>
                {globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length && (
                  <div className="flex items-center gap-2 pl-4 border-l border-blue-200">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-purple-700">
                      Filtered by: <span className="font-semibold">
                        {globalAttorneyFilter.length === 1 
                          ? globalAttorneyFilter[0] 
                          : `${globalAttorneyFilter.length} attorneys`}
                      </span>
                    </span>
                  </div>
                )}
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
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleTransactionSort('type')}
                      className="w-[28%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Transaction Type {transactionSortConfig.key === 'type' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('avgHours')}
                      className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Avg Hours {transactionSortConfig.key === 'avgHours' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('count')}
                      className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Count {transactionSortConfig.key === 'count' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('totalHours')}
                      className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours {transactionSortConfig.key === 'totalHours' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('totalEarnings')}
                      className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Earnings {transactionSortConfig.key === 'totalEarnings' && (transactionSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleTransactionSort('percentage')}
                      className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                      <tr 
                        key={idx} 
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onMouseEnter={(e) => {
                          setHoveredTransaction(txn);
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          setTooltipPosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setHoveredTransaction(null)}
                      >
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
              
              {/* Transaction Tooltip */}
              {hoveredTransaction && (
                <TransactionRowTooltip 
                  transaction={hoveredTransaction} 
                  position={tooltipPosition}
                  formatCurrency={formatCurrency}
                  formatHours={formatHours}
                />
              )}
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                </span>
              </div>
              {globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">
                    Filtered by: <span className="font-semibold">
                      {globalAttorneyFilter.length === 1 
                        ? globalAttorneyFilter[0] 
                        : `${globalAttorneyFilter.length} attorneys`}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {opsData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ops Table - Left side */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          onClick={() => handleOpsSort('category')}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        >
                          Ops Category {opsSortConfig.key === 'category' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleOpsSort('hours')}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24"
                        >
                          Hours {opsSortConfig.key === 'hours' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          onClick={() => handleOpsSort('percentage')}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
                        >
                          % {opsSortConfig.key === 'percentage' && (opsSortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSortedOps().map((ops, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-green-50 cursor-pointer transition-colors"
                          onMouseEnter={(e) => {
                            setHoveredOps(ops);
                            setOpsTooltipPosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setOpsTooltipPosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredOps(null)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {ops.category}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {ops.hours}h
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {ops.percentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Ops Tooltip */}
                  {hoveredOps && (
                    <OpsRowTooltip 
                      ops={hoveredOps} 
                      position={opsTooltipPosition}
                      formatHours={formatHours}
                    />
                  )}
                </div>

                {/* Ops Distribution Chart - Right side */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Ops Time Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={600}>
                    <PieChart margin={{ top: 60, right: 20, bottom: 120, left: 20 }}>
                      <Pie
                        data={opsData}
                        dataKey="hours"
                        nameKey="category"
                        cx="50%"
                        cy="38%"
                        outerRadius={100}
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
                        wrapperStyle={{ paddingTop: '40px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
                </span>
              </div>
              {globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">
                    Filtered by: <span className="font-semibold">
                      {globalAttorneyFilter.length === 1 
                        ? globalAttorneyFilter[0] 
                        : `${globalAttorneyFilter.length} attorneys`}
                    </span>
                  </span>
                </div>
              )}
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
                  </div>
                  <div className="text-gray-300 text-4xl font-light mx-4">/</div>
                  <div>
                    <span className="text-gray-600 text-sm">Inactive Clients</span>
                    <div className="text-3xl font-bold text-red-600 mt-2">
                      {clientData.filter(c => c.totalHours === 0).length}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600 text-sm whitespace-nowrap">Activity window:</span>
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={clientActivityPeriod}
                        onChange={(e) => setClientActivityPeriod(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="2-weeks">Last 2 Weeks</option>
                        <option value="1-month">Last 1 Month</option>
                        <option value="2-months">Last 2 Months</option>
                        <option value="3-months">Last 3 Months</option>
                        <option value="6-months">Last 6 Months</option>
                        <option value="9-months">Last 9 Months</option>
                        <option value="12-months">Last 12 Months</option>
                        <option value="18-months">Last 18 Months</option>
                        <option value="24-months">Last 24 Months</option>
                        <option value="custom">Custom Range</option>
                        <option value="all-time">All Time</option>
                      </select>
                    </div>
                  </div>
                  {clientActivityPeriod === 'custom' && (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="date"
                        value={clientActivityStartDate}
                        onChange={(e) => setClientActivityStartDate(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500 text-sm">to</span>
                      <input
                        type="date"
                        value={clientActivityEndDate}
                        onChange={(e) => setClientActivityEndDate(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div className="text-gray-400 text-xs mt-2">
                    Total: {clientCounts.total} clients (Active + Quiet status)
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
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      onClick={() => handleClientSort('name')}
                      className="w-[28%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Client Name {clientSortConfig.key === 'name' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('status')}
                      className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Status {clientSortConfig.key === 'status' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('location')}
                      className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Location {clientSortConfig.key === 'location' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('totalHours')}
                      className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Total Hours {clientSortConfig.key === 'totalHours' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('totalEarnings')}
                      className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Earnings {clientSortConfig.key === 'totalEarnings' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleClientSort('lastActivity')}
                      className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Last Activity {clientSortConfig.key === 'lastActivity' && (clientSortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedClients().map((client, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-purple-50 cursor-pointer transition-colors"
                      onMouseEnter={(e) => {
                        if (client.entryCount > 0) {
                          setHoveredClient(client);
                          setClientTooltipPosition({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseMove={(e) => {
                        if (client.entryCount > 0) {
                          setClientTooltipPosition({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => setHoveredClient(null)}
                    >
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
              
              {/* Client Tooltip */}
              {hoveredClient && (
                <ClientRowTooltip 
                  client={hoveredClient} 
                  position={clientTooltipPosition}
                  formatCurrency={formatCurrency}
                  formatHours={formatHours}
                />
              )}
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