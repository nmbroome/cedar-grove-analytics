import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Activity, Calendar, Search } from 'lucide-react';

// Sample data - replace with Firebase data later
const sampleAttorneyData = [
  { 
    name: 'Michael Ohta', 
    billable: 95, 
    ops: 48, 
    target: 150,
    billableTarget: 100,
    opsTarget: 50,
    role: 'Associate',
    topTransactions: ['Formation', 'Equity Issuance', 'Contract Review', 'Board Consent', 'Consultant Onboarding']
  },
  { 
    name: 'Colin van Loon', 
    billable: 88, 
    ops: 52, 
    target: 150,
    billableTarget: 100,
    opsTarget: 50,
    role: 'Associate',
    topTransactions: ['Equity Issuance', 'Formation', 'Consultant Onboarding', 'Contract Review', 'Board Consent']
  },
  { 
    name: 'Sam McClure', 
    billable: 102, 
    ops: 45, 
    target: 150,
    billableTarget: 100,
    opsTarget: 50,
    role: 'Associate',
    topTransactions: ['Formation', 'Contract Review', 'Equity Issuance', 'Board Consent', 'Consultant Onboarding']
  },
  { 
    name: 'David Popkin', 
    billable: 85, 
    ops: 92, 
    target: 180,
    billableTarget: 90,
    opsTarget: 90,
    role: 'Partner',
    topTransactions: ['Contract Review', 'Formation', 'Equity Issuance', 'Board Consent', 'IP Assignment']
  },
  { 
    name: 'Nick Agate', 
    billable: 78, 
    ops: 95, 
    target: 180,
    billableTarget: 90,
    opsTarget: 90,
    role: 'Partner',
    topTransactions: ['Equity Issuance', 'Formation', 'Board Consent', 'Contract Review', 'Consultant Onboarding']
  },
];

const sampleTransactionData = [
  { type: 'Formation', avgHours: 12.5, count: 15, totalHours: 187.5 },
  { type: 'Equity Issuance', avgHours: 8.2, count: 22, totalHours: 180.4 },
  { type: 'Consultant Onboarding', avgHours: 4.5, count: 18, totalHours: 81 },
  { type: 'Board Consent', avgHours: 2.8, count: 28, totalHours: 78.4 },
  { type: 'Contract Review', avgHours: 6.5, count: 12, totalHours: 78 },
];

const sampleOpsData = [
  { category: 'Business Development', hours: 45, percentage: 28 },
  { category: 'Team Meeting', hours: 38, percentage: 24 },
  { category: 'Admin', hours: 32, percentage: 20 },
  { category: 'Training', hours: 25, percentage: 15 },
  { category: 'Other', hours: 21, percentage: 13 },
];

const sampleMonthlyTrend = [
  { month: 'Jul', utilization: 92 },
  { month: 'Aug', utilization: 88 },
  { month: 'Sep', utilization: 95 },
  { month: 'Oct', utilization: 103 },
  { month: 'Nov', utilization: 98 },
];

// Client data
const sampleClientData = [
  { 
    name: 'Acme Corp', 
    monthlyHours: 45, 
    annualHours: 520, 
    uniqueTransactions: 8, 
    avgHoursPerTransaction: 6.5,
    lastActivity: '2025-10-15',
    status: 'active',
    stage: 'Growth'
  },
  { 
    name: 'TechStart Inc', 
    monthlyHours: 32, 
    annualHours: 384, 
    uniqueTransactions: 5, 
    avgHoursPerTransaction: 7.7,
    lastActivity: '2025-11-01',
    status: 'active',
    stage: 'Seed'
  },
  { 
    name: 'Innovate Labs', 
    monthlyHours: 28, 
    annualHours: 336, 
    uniqueTransactions: 6, 
    avgHoursPerTransaction: 5.6,
    lastActivity: '2025-10-28',
    status: 'active',
    stage: 'Series A'
  },
  { 
    name: 'GrowthCo', 
    monthlyHours: 22, 
    annualHours: 264, 
    uniqueTransactions: 4, 
    avgHoursPerTransaction: 6.6,
    lastActivity: '2025-09-12',
    status: 'active',
    stage: 'Series B'
  },
  { 
    name: 'Legacy Systems', 
    monthlyHours: 0, 
    annualHours: 156, 
    uniqueTransactions: 3, 
    avgHoursPerTransaction: 8.2,
    lastActivity: '2025-03-22',
    status: 'inactive',
    stage: 'Growth'
  },
  { 
    name: 'BuildRight LLC', 
    monthlyHours: 18, 
    annualHours: 216, 
    uniqueTransactions: 7, 
    avgHoursPerTransaction: 3.9,
    lastActivity: '2025-10-30',
    status: 'active',
    stage: 'Pre-Seed'
  },
  { 
    name: 'DataFlow Systems', 
    monthlyHours: 0, 
    annualHours: 92, 
    uniqueTransactions: 2, 
    avgHoursPerTransaction: 7.7,
    lastActivity: '2025-04-08',
    status: 'inactive',
    stage: 'Seed'
  },
];

// Individual client detail data
const sampleClientDetails = {
  'Acme Corp': {
    monthlyHours: 45,
    annualHours: 520,
    status: 'active',
    transactionBreakdown: [
      { type: 'Formation', hours: 156, percentage: 30 },
      { type: 'Equity Issuance', hours: 130, percentage: 25 },
      { type: 'Contract Review', hours: 104, percentage: 20 },
      { type: 'Board Consent', hours: 78, percentage: 15 },
      { type: 'Other', hours: 52, percentage: 10 },
    ],
    attorneyBreakdown: [
      { name: 'Michael Ohta', hours: 145 },
      { name: 'Sam McClure', hours: 132 },
      { name: 'Colin van Loon', hours: 118 },
      { name: 'David Popkin', hours: 85 },
      { name: 'Nick Agate', hours: 40 },
    ],
    monthlyTrend: [
      { month: 'Jul', hours: 48 },
      { month: 'Aug', hours: 42 },
      { month: 'Sep', hours: 46 },
      { month: 'Oct', hours: 44 },
      { month: 'Nov', hours: 45 },
    ],
  },
};

// Attorney detail data (monthly breakdown)
const sampleAttorneyDetails = {
  'Michael Ohta': {
    monthlyData: [
      { month: 'Jul', billable: 98, ops: 45, utilization: 95 },
      { month: 'Aug', billable: 92, ops: 48, utilization: 93 },
      { month: 'Sep', billable: 95, ops: 50, utilization: 97 },
      { month: 'Oct', billable: 100, ops: 47, utilization: 98 },
      { month: 'Nov', billable: 95, ops: 48, utilization: 95 },
    ],
    transactionBreakdown: [
      { type: 'Formation', hours: 42, percentage: 44 },
      { type: 'Equity Issuance', hours: 28, percentage: 29 },
      { type: 'Contract Review', hours: 15, percentage: 16 },
      { type: 'Board Consent', hours: 7, percentage: 7 },
      { type: 'Other', hours: 3, percentage: 3 },
    ],
    opsBreakdown: [
      { category: 'Business Development', hours: 15, percentage: 31 },
      { category: 'Team Meeting', hours: 12, percentage: 25 },
      { category: 'Admin', hours: 10, percentage: 21 },
      { category: 'Training', hours: 8, percentage: 17 },
      { category: 'Other', hours: 3, percentage: 6 },
    ],
    topClients: [
      { name: 'Acme Corp', hours: 28 },
      { name: 'TechStart Inc', hours: 22 },
      { name: 'Innovate Labs', hours: 18 },
      { name: 'GrowthCo', hours: 14 },
      { name: 'BuildRight LLC', hours: 13 },
    ],
  },
};

// Transaction trends over time by attorney
const sampleTransactionTrends = {
  'Formation': [
    { month: 'Jul', 'Michael Ohta': 14, 'Colin van Loon': 11, 'Sam McClure': 13, 'David Popkin': 10, 'Nick Agate': 9 },
    { month: 'Aug', 'Michael Ohta': 12, 'Colin van Loon': 13, 'Sam McClure': 12, 'David Popkin': 11, 'Nick Agate': 10 },
    { month: 'Sep', 'Michael Ohta': 13, 'Colin van Loon': 12, 'Sam McClure': 11, 'David Popkin': 12, 'Nick Agate': 11 },
    { month: 'Oct', 'Michael Ohta': 11, 'Colin van Loon': 10, 'Sam McClure': 13, 'David Popkin': 13, 'Nick Agate': 12 },
    { month: 'Nov', 'Michael Ohta': 12, 'Colin van Loon': 11, 'Sam McClure': 12, 'David Popkin': 11, 'Nick Agate': 10 },
  ],
  'Equity Issuance': [
    { month: 'Jul', 'Michael Ohta': 9, 'Colin van Loon': 10, 'Sam McClure': 8, 'David Popkin': 7, 'Nick Agate': 9 },
    { month: 'Aug', 'Michael Ohta': 8, 'Colin van Loon': 9, 'Sam McClure': 7, 'David Popkin': 8, 'Nick Agate': 10 },
    { month: 'Sep', 'Michael Ohta': 7, 'Colin van Loon': 8, 'Sam McClure': 9, 'David Popkin': 9, 'Nick Agate': 8 },
    { month: 'Oct', 'Michael Ohta': 8, 'Colin van Loon': 7, 'Sam McClure': 8, 'David Popkin': 8, 'Nick Agate': 7 },
    { month: 'Nov', 'Michael Ohta': 9, 'Colin van Loon': 8, 'Sam McClure': 7, 'David Popkin': 7, 'Nick Agate': 8 },
  ],
  'Consultant Onboarding': [
    { month: 'Jul', 'Michael Ohta': 5, 'Colin van Loon': 4, 'Sam McClure': 4, 'David Popkin': 3, 'Nick Agate': 5 },
    { month: 'Aug', 'Michael Ohta': 4, 'Colin van Loon': 5, 'Sam McClure': 5, 'David Popkin': 4, 'Nick Agate': 4 },
    { month: 'Sep', 'Michael Ohta': 5, 'Colin van Loon': 4, 'Sam McClure': 4, 'David Popkin': 5, 'Nick Agate': 4 },
    { month: 'Oct', 'Michael Ohta': 4, 'Colin van Loon': 4, 'Sam McClure': 5, 'David Popkin': 4, 'Nick Agate': 5 },
    { month: 'Nov', 'Michael Ohta': 5, 'Colin van Loon': 5, 'Sam McClure': 4, 'David Popkin': 4, 'Nick Agate': 4 },
  ],
  'Board Consent': [
    { month: 'Jul', 'Michael Ohta': 3, 'Colin van Loon': 3, 'Sam McClure': 2, 'David Popkin': 3, 'Nick Agate': 3 },
    { month: 'Aug', 'Michael Ohta': 2, 'Colin van Loon': 3, 'Sam McClure': 3, 'David Popkin': 2, 'Nick Agate': 3 },
    { month: 'Sep', 'Michael Ohta': 3, 'Colin van Loon': 2, 'Sam McClure': 3, 'David Popkin': 3, 'Nick Agate': 2 },
    { month: 'Oct', 'Michael Ohta': 3, 'Colin van Loon': 3, 'Sam McClure': 2, 'David Popkin': 3, 'Nick Agate': 3 },
    { month: 'Nov', 'Michael Ohta': 2, 'Colin van Loon': 3, 'Sam McClure': 3, 'David Popkin': 2, 'Nick Agate': 3 },
  ],
  'Contract Review': [
    { month: 'Jul', 'Michael Ohta': 7, 'Colin van Loon': 6, 'Sam McClure': 7, 'David Popkin': 8, 'Nick Agate': 6 },
    { month: 'Aug', 'Michael Ohta': 6, 'Colin van Loon': 7, 'Sam McClure': 6, 'David Popkin': 7, 'Nick Agate': 7 },
    { month: 'Sep', 'Michael Ohta': 7, 'Colin van Loon': 6, 'Sam McClure': 7, 'David Popkin': 6, 'Nick Agate': 7 },
    { month: 'Oct', 'Michael Ohta': 6, 'Colin van Loon': 7, 'Sam McClure': 6, 'David Popkin': 7, 'Nick Agate': 6 },
    { month: 'Nov', 'Michael Ohta': 7, 'Colin van Loon': 6, 'Sam McClure': 7, 'David Popkin': 7, 'Nick Agate': 6 },
  ],
};

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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedClients = () => {
    let filtered = filteredData.clients.filter(client =>
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

  // Filter data based on date range - in a real app, this would query Firebase
  const getFilteredData = () => {
    // For now, we'll apply a simple multiplier to simulate date filtering
    // In production, this would filter actual date-stamped records
    const multipliers = {
      'last-week': 0.25,
      'last-month': 1.0,
      'last-quarter': 3.0,
      'year-to-date': 10.0,
      'custom': 1.0,
    };
    const mult = multipliers[dateRange] || 1.0;
    
    return {
      attorneys: sampleAttorneyData.map(a => ({
        ...a,
        billable: Math.round(a.billable * mult),
        ops: Math.round(a.ops * mult),
        target: Math.round(a.target * mult),
        billableTarget: Math.round(a.billableTarget * mult),
        opsTarget: Math.round(a.opsTarget * mult),
      })),
      transactions: sampleTransactionData.map(t => ({
        ...t,
        totalHours: Math.round(t.totalHours * mult * 10) / 10,
        count: Math.round(t.count * mult),
      })),
      clients: sampleClientData.map(c => ({
        ...c,
        monthlyHours: Math.round(c.monthlyHours * mult),
      })),
      ops: sampleOpsData.map(o => ({
        ...o,
        hours: Math.round(o.hours * mult),
      })),
      totalBillable: Math.round(sampleAttorneyData.reduce((acc, att) => acc + att.billable, 0) * mult),
      totalOps: Math.round(sampleAttorneyData.reduce((acc, att) => acc + att.ops, 0) * mult),
    };
  };

  const filteredData = getFilteredData();

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

  const avgUtilization = Math.round(
    filteredData.attorneys.reduce((acc, att) => acc + calculateUtilization(att), 0) / filteredData.attorneys.length
  );

  const totalBillable = filteredData.attorneys.reduce((acc, att) => acc + att.billable, 0);
  const totalOps = filteredData.attorneys.reduce((acc, att) => acc + att.ops, 0);
  const totalBillableTarget = filteredData.attorneys.reduce((acc, att) => acc + att.billableTarget, 0);
  const totalOpsTarget = filteredData.attorneys.reduce((acc, att) => acc + att.opsTarget, 0);

  const calculateBillableRatio = (attorney) => {
    return (attorney.billable / attorney.ops).toFixed(1);
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
          {selectedTransaction ? (
            <button
              onClick={() => setSelectedTransaction(null)}
              className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Transactions
            </button>
          ) : selectedAttorney ? (
            <button
              onClick={() => setSelectedAttorney(null)}
              className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Attorneys
            </button>
          ) : selectedClient ? (
            <button
              onClick={() => setSelectedClient(null)}
              className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              ← Back to Clients
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Client Detail View */}
        {selectedClient && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedClient}</h2>
              <p className="text-gray-600">Complete client engagement breakdown</p>
            </div>

            {/* Client KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <span className="text-gray-600 text-sm">Status</span>
                <div className="mt-2">
                  <span className={`inline-flex px-3 py-1 text-lg font-semibold rounded-full ${
                    sampleClientDetails[selectedClient]?.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {sampleClientDetails[selectedClient]?.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <span className="text-gray-600 text-sm">Monthly Hours</span>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {sampleClientDetails[selectedClient]?.monthlyHours || 45}h
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <span className="text-gray-600 text-sm">Annual Hours</span>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {sampleClientDetails[selectedClient]?.annualHours || 520}h
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <span className="text-gray-600 text-sm">Avg Hours/Transaction</span>
                <div className="text-3xl font-bold text-purple-600 mt-2">6.5h</div>
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours Trend Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sampleClientDetails[selectedClient]?.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="hours" stroke="#0088FE" strokeWidth={2} name="Hours" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction and Attorney Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Breakdown */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Transaction Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sampleClientDetails[selectedClient]?.transactionBreakdown}
                      dataKey="percentage"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={renderCustomLabel}
                    >
                      {sampleClientDetails[selectedClient]?.transactionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Attorney Breakdown */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Time by Attorney</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sampleClientDetails[selectedClient]?.attorneyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#0088FE" name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Attorney Detail View */}
        {selectedAttorney && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedAttorney}</h2>
              <p className="text-gray-600">Individual performance and workload breakdown</p>
            </div>

            {/* Attorney KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {sampleAttorneyDetails[selectedAttorney]?.monthlyData.slice(-1).map((current) => {
                const attorney = sampleAttorneyData.find(a => a.name === selectedAttorney);
                const utilization = calculateUtilization(attorney);
                return (
                  <React.Fragment key="kpis">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <span className="text-gray-600 text-sm">Current Month Utilization</span>
                      <div className="text-3xl font-bold text-gray-900 mt-2">{utilization}%</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <span className="text-gray-600 text-sm">Billable Hours</span>
                      <div className="text-3xl font-bold text-blue-600 mt-2">{attorney.billable}h</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <span className="text-gray-600 text-sm">Ops Hours</span>
                      <div className="text-3xl font-bold text-green-600 mt-2">{attorney.ops}h</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <span className="text-gray-600 text-sm">Total Hours</span>
                      <div className="text-3xl font-bold text-gray-900 mt-2">{attorney.billable + attorney.ops}h</div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Monthly Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Hours Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sampleAttorneyDetails[selectedAttorney]?.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="billable" stroke="#0088FE" strokeWidth={2} name="Billable" />
                  <Line type="monotone" dataKey="ops" stroke="#00C49F" strokeWidth={2} name="Ops" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction and Ops Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Billable Transaction Breakdown */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billable Time by Transaction Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sampleAttorneyDetails[selectedAttorney]?.transactionBreakdown}
                      dataKey="percentage"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={renderCustomLabel}
                    >
                      {sampleAttorneyDetails[selectedAttorney]?.transactionBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Ops Breakdown */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ops Time by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sampleAttorneyDetails[selectedAttorney]?.opsBreakdown}
                      dataKey="percentage"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={renderCustomLabel}
                    >
                      {sampleAttorneyDetails[selectedAttorney]?.opsBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Clients */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients by Hours</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sampleAttorneyDetails[selectedAttorney]?.topClients}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#0088FE" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Monthly Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ops
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sampleAttorneyDetails[selectedAttorney]?.monthlyData.map((month, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {month.billable}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {month.ops}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {month.billable + month.ops}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            month.utilization >= 100
                              ? 'bg-green-100 text-green-800'
                              : month.utilization >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {month.utilization}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transaction Detail View */}
        {selectedTransaction && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTransaction}</h2>
              <p className="text-gray-600">Average time trend by attorney</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Hours Trend Over Time
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sampleTransactionTrends[selectedTransaction]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {filteredData.attorneys.map((attorney, idx) => (
                    <Line
                      key={attorney.name}
                      type="monotone"
                      dataKey={attorney.name}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attorney
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      July
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      August
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      September
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      October
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      November
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.attorneys.map((attorney, idx) => {
                    const trends = sampleTransactionTrends[selectedTransaction];
                    const values = trends.map(t => t[attorney.name]);
                    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {attorney.name}
                        </td>
                        {values.map((val, vIdx) => (
                          <td key={vIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {val}h
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {avg}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overview View */}
        {!selectedTransaction && !selectedAttorney && !selectedClient && selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Showing data for: <span className="font-semibold">{getDateRangeLabel()}</span>
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
                <div className="flex items-center justify-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+5%</span>
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
                      {Math.round((filteredData.totalBillable / (filteredData.totalBillable + filteredData.totalOps)) * 100)}%
                    </div>
                    <div className="text-xl text-gray-400">/</div>
                    <div className="text-3xl font-bold text-green-600">
                      {Math.round((filteredData.totalOps / (filteredData.totalBillable + filteredData.totalOps)) * 100)}%
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
                  <div className="text-4xl font-bold text-gray-900">{filteredData.totalBillable}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  {Math.round((filteredData.totalBillable / totalBillableTarget) * 100)}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Total Ops</span>
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">{filteredData.totalOps}h</div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  {Math.round((filteredData.totalOps / totalOpsTarget) * 100)}% of target
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 text-sm font-medium">Billable Ratio</span>
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {(filteredData.totalBillable / filteredData.totalOps).toFixed(1)}:1
                  </div>
                </div>
                <div className="text-sm text-gray-600 text-center leading-tight">
                  Billable to Ops
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Utilization Trend */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Utilization Trend - {getDateRangeLabel()}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={sampleMonthlyTrend}
                  margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      domain={[0, 120]}
                      allowDecimals={false}
                      tickCount={7}
                      ticks={[0, 20, 40, 60, 80, 100, 120]}
                      tickFormatter={(value) => `${value}%`}
                      interval={0}
                      allowDataOverflow={true}
                    />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="utilization" stroke="#0088FE" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Ops Distribution */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Ops Time Distribution - {getDateRangeLabel()}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={filteredData.ops}
                      dataKey="percentage"
                      nameKey="category"
                      cx="35%"          // shift pie left to make room for legend
                      cy="50%"
                      outerRadius={80}
                      label={({ hours, percentage }) => `${hours}h (${percentage}%)`}
                    >
                      {filteredData.ops.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      wrapperStyle={{
                        paddingLeft: 20,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Transactions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Transaction Types by Time - {getDateRangeLabel()}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredData.transactions}>
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
        {!selectedTransaction && !selectedAttorney && !selectedClient && selectedView === 'attorneys' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
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
                      Billable (Target)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ops (Target)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Utilization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top 5 Transaction Types
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.attorneys.map((attorney, idx) => {
                    const utilization = calculateUtilization(attorney);
                    const billableUtil = calculateBillableUtilization(attorney);
                    const opsUtil = calculateOpsUtilization(attorney);
                    const total = attorney.billable + attorney.ops;

                    const getUtilColor = (val) => {
                      if (val > 105) return 'text-red-600';
                      if (val < 75) return 'text-red-600';
                      if (val < 85) return 'text-yellow-600';
                      return 'text-green-600';
                    };

                    const getBadgeColor = (val) => {
                      if (val > 105) return 'bg-red-100 text-red-800';
                      if (val < 75) return 'bg-red-100 text-red-800';
                      if (val < 85) return 'bg-yellow-100 text-yellow-800';
                      return 'bg-green-100 text-green-800';
                    };

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedAttorney(attorney.name)}
                      >
                        {/* Attorney Name */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                          {attorney.name} ({attorney.role})
                        </td>

                        {/* Billable */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {attorney.billable}h / {attorney.billableTarget}h
                            </span>
                            <span className={`text-xs ${getUtilColor(billableUtil)}`}>
                              {billableUtil}% utilization
                            </span>
                          </div>
                        </td>

                        {/* Ops */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {attorney.ops}h / {attorney.opsTarget}h
                            </span>
                            <span className={`text-xs ${getUtilColor(opsUtil)}`}>
                              {opsUtil}% utilization
                            </span>
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {total}h
                        </td>

                        {/* Overall Utilization */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(utilization)}`}
                          >
                            {utilization}%
                          </span>
                        </td>

                        {/* Top 5 Transactions */}
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-1">
                            {attorney.topTransactions.map((txn, tIdx) => (
                              <span
                                key={tIdx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(txn);
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors"
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
                <BarChart data={filteredData.attorneys}>
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
        {!selectedTransaction && !selectedAttorney && !selectedClient && selectedView === 'transactions' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
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
                      % of Billable
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.transactions.map((txn, idx) => {
                    const percentage = ((txn.totalHours / filteredData.totalBillable) * 100).toFixed(1);
                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTransaction(txn.type)}
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
                          {txn.totalHours}h
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
                <BarChart data={filteredData.transactions} layout="vertical">
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
        {!selectedTransaction && !selectedAttorney && !selectedClient && selectedView === 'ops' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.ops.map((ops, idx) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="flex items-center text-green-600">
                          <TrendingDown className="w-4 h-4 mr-1" />
                          <span>-3%</span>
                        </span>
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
                    data={filteredData.ops}
                    dataKey="percentage"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={renderCustomLabel}
                  >
                    {filteredData.ops.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Ops by Attorney */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ops Hours by Attorney
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredData.attorneys}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="ops" fill="#00C49F" name="Ops Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Clients View */}
        {!selectedTransaction && !selectedAttorney && !selectedClient && selectedView === 'clients' && (
          <div className="space-y-6">
            {/* Date Range Indicator */}
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
                      {filteredData.clients.filter(c => c.status === 'active').length}
                    </div>
                  </div>
                  <div className="text-gray-300 text-4xl font-light mx-4">/</div>
                  <div>
                    <span className="text-gray-600 text-sm">Inactive Clients</span>
                    <div className="text-3xl font-bold text-red-600 mt-2">
                      {filteredData.clients.filter(c => c.status === 'inactive').length}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-3">
                  Last 6 months activity threshold
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
                      onClick={() => handleSort('stage')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Stage {sortConfig.key === 'stage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      onClick={() => handleSort('monthlyHours')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Monthly Hours {sortConfig.key === 'monthlyHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                      onClick={() => handleSort('avgHoursPerTransaction')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Avg Hours/Transaction {sortConfig.key === 'avgHoursPerTransaction' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                    <tr 
                      key={idx} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedClient(client.name)}
                    >
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
                          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800">
                          {client.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.monthlyHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.annualHours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.uniqueTransactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.avgHoursPerTransaction}h
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
              {/* Time Spent per Client */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Annual Hours by Client
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredData.clients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="annualHours" fill="#0088FE" name="Annual Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Average Hours per Transaction */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Avg Hours per Transaction by Client
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredData.clients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgHoursPerTransaction" fill="#FFBB28" name="Avg Hours/Transaction" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Breadth */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Service Breadth (Unique Transaction Types)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredData.clients}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="uniqueTransactions" fill="#00C49F" name="Unique Transaction Types" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CedarGroveAnalytics;