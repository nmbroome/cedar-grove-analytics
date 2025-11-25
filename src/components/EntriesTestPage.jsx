import { useState, useMemo } from 'react';
import { useAllTimeEntries, useAttorneys } from '../hooks/useFirestoreData';
import { Search, Download, Filter, Calendar, DollarSign } from 'lucide-react';

function EntriesTestPage() {
  const { data: allEntries, loading: entriesLoading, error } = useAllTimeEntries();
  const { attorneys, loading: attorneysLoading } = useAttorneys();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttorney, setSelectedAttorney] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'billableDate', direction: 'desc' });

  const loading = entriesLoading || attorneysLoading;

  // Helper function to convert month name to number
  const getMonthNumber = (monthName) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months.findIndex(m => m.toLowerCase() === monthName?.toLowerCase()) + 1 || 1;
  };

  // Create attorney name map
  const attorneyMap = useMemo(() => {
    const map = {};
    attorneys.forEach(attorney => {
      map[attorney.id] = attorney.name || attorney.id;
    });
    return map;
  }, [attorneys]);

  // Group entries by attorney
  const entriesByAttorney = useMemo(() => {
    if (!allEntries) return {};

    const grouped = {};
    allEntries.forEach(entry => {
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      if (!grouped[attorneyName]) {
        grouped[attorneyName] = [];
      }
      grouped[attorneyName].push({
        ...entry,
        attorneyName,
        // Use normalized fields from hook
        billableHours: entry.billableHours || 0,
        opsHours: entry.opsHours || 0,
        totalHours: entry.totalHours || (entry.billableHours || 0) + (entry.opsHours || 0),
        billablesEarnings: entry.billablesEarnings || 0
      });
    });

    return grouped;
  }, [allEntries, attorneyMap]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let entries = [];

    if (selectedAttorney === 'all') {
      entries = Object.values(entriesByAttorney).flat();
    } else {
      entries = entriesByAttorney[selectedAttorney] || [];
    }

    // Apply search filter
    if (searchTerm) {
      entries = entries.filter(entry => {
        const searchLower = searchTerm.toLowerCase();
        return (
          entry.client?.toLowerCase().includes(searchLower) ||
          entry.company?.toLowerCase().includes(searchLower) ||
          entry.billingCategory?.toLowerCase().includes(searchLower) ||
          entry.category?.toLowerCase().includes(searchLower) ||
          entry.ops?.toLowerCase().includes(searchLower) ||
          entry.opsCategory?.toLowerCase().includes(searchLower) ||
          entry.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      entries.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle date objects - use billableDate or opsDate
        if (sortConfig.key === 'billableDate' || sortConfig.key === 'opsDate') {
          if (a[sortConfig.key]?.toDate) {
            aVal = a[sortConfig.key].toDate();
          } else if (a[sortConfig.key]) {
            aVal = new Date(a[sortConfig.key]);
          } else {
            aVal = new Date(a.year, getMonthNumber(a.month) - 1);
          }
          
          if (b[sortConfig.key]?.toDate) {
            bVal = b[sortConfig.key].toDate();
          } else if (b[sortConfig.key]) {
            bVal = new Date(b[sortConfig.key]);
          } else {
            bVal = new Date(b.year, getMonthNumber(b.month) - 1);
          }
        }

        // Handle numbers
        if (['totalHours', 'billableHours', 'opsHours', 'billablesEarnings'].includes(sortConfig.key)) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return entries;
  }, [entriesByAttorney, selectedAttorney, searchTerm, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatDate = (entry) => {
    // Try billableDate first
    if (entry.billableDate?.toDate) {
      return entry.billableDate.toDate().toLocaleDateString();
    }
    if (entry.billableDate) {
      return new Date(entry.billableDate).toLocaleDateString();
    }
    // Fallback to month/year
    return `${entry.month} ${entry.year}`;
  };

  const formatOpsDate = (entry) => {
    if (entry.opsDate?.toDate) {
      return entry.opsDate.toDate().toLocaleDateString();
    }
    if (entry.opsDate) {
      return new Date(entry.opsDate).toLocaleDateString();
    }
    return '-';
  };

  const exportToCSV = () => {
    const headers = [
      'Attorney',
      'Client',
      'Billable Hours',
      'Ops Hours',
      'Total Hours',
      'Billables Earnings',
      'Billing Category',
      'Ops Category',
      'Ops',
      'Month',
      'Year',
      'Billable Date',
      'Ops Date',
      'Notes'
    ];

    const rows = filteredEntries.map(entry => [
      entry.attorneyName,
      entry.client || '',
      entry.billableHours || 0,
      entry.opsHours || 0,
      entry.totalHours,
      entry.billablesEarnings || 0,
      entry.billingCategory || '',
      entry.opsCategory || '',
      entry.ops || '',
      entry.month || '',
      entry.year || '',
      formatDate(entry),
      formatOpsDate(entry),
      entry.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries_${selectedAttorney}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Calculate summary stats - updated for new fields
  const summaryStats = useMemo(() => {
    const stats = {
      totalEntries: filteredEntries.length,
      totalHours: 0,
      totalBillableHours: 0,
      totalOpsHours: 0,
      totalEarnings: 0,
      uniqueClients: new Set(),
      uniqueCategories: new Set()
    };

    filteredEntries.forEach(entry => {
      stats.totalBillableHours += entry.billableHours || 0;
      stats.totalOpsHours += entry.opsHours || 0;
      stats.totalHours += entry.totalHours || 0;
      stats.totalEarnings += entry.billablesEarnings || 0;

      if (entry.client) stats.uniqueClients.add(entry.client);
      if (entry.billingCategory) stats.uniqueCategories.add(entry.billingCategory);
    });

    return {
      ...stats,
      uniqueClients: stats.uniqueClients.size,
      uniqueCategories: stats.uniqueCategories.size
    };
  }, [filteredEntries]);

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

  const formatHours = (hours) => {
    const rounded = Math.round(hours * 10) / 10;
    if (rounded === Math.floor(rounded)) {
      return Math.floor(rounded).toString();
    }
    return rounded.toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading entries from Firebase...</div>
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

  const attorneyList = Object.keys(entriesByAttorney).sort();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Time Entries Test View</h1>
              <p className="text-gray-600 mt-1">View and export all time entries by attorney (Updated for new data format)</p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Summary Stats - Updated for new fields */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Entries</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {summaryStats.totalEntries}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {formatHours(summaryStats.totalHours)}h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Billable Hours</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {formatHours(summaryStats.totalBillableHours)}h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Ops Hours</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {formatHours(summaryStats.totalOpsHours)}h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Earnings</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {formatCurrency(summaryStats.totalEarnings)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Unique Clients</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {summaryStats.uniqueClients}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attorney Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Filter by Attorney
              </label>
              <select
                value={selectedAttorney}
                onChange={(e) => setSelectedAttorney(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Attorneys ({Object.keys(entriesByAttorney).length})</option>
                {attorneyList.map(attorney => (
                  <option key={attorney} value={attorney}>
                    {attorney} ({entriesByAttorney[attorney].length} entries)
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Search
              </label>
              <input
                type="text"
                placeholder="Search by client, category, ops, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Entries Table - Updated for new fields */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Entries: {filteredEntries.length}
              {selectedAttorney !== 'all' && ` for ${selectedAttorney}`}
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('attorneyName')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Attorney {sortConfig.key === 'attorneyName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('client')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Client {sortConfig.key === 'client' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('billableHours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Billable {sortConfig.key === 'billableHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('opsHours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Ops {sortConfig.key === 'opsHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('totalHours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Total {sortConfig.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('billablesEarnings')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Earnings {sortConfig.key === 'billablesEarnings' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('billingCategory')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Category {sortConfig.key === 'billingCategory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('opsCategory')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Ops Cat {sortConfig.key === 'opsCategory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('billableDate')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Date {sortConfig.key === 'billableDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                      No entries found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.attorneyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.client || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                        {entry.billableHours > 0 ? `${formatHours(entry.billableHours)}h` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-orange-600 font-medium">
                        {entry.opsHours > 0 ? `${formatHours(entry.opsHours)}h` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatHours(entry.totalHours)}h
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                        {entry.billablesEarnings > 0 ? formatCurrency(entry.billablesEarnings) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.billingCategory ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {entry.billingCategory}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.opsCategory ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                            {entry.opsCategory}
                          </span>
                        ) : entry.ops ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {entry.ops}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {entry.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attorney Breakdown - Updated for new fields */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Entries by Attorney</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attorneyList.map(attorney => {
              const entries = entriesByAttorney[attorney];
              const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
              const billableHours = entries.reduce((sum, e) => sum + (e.billableHours || 0), 0);
              const opsHours = entries.reduce((sum, e) => sum + (e.opsHours || 0), 0);
              const totalEarnings = entries.reduce((sum, e) => sum + (e.billablesEarnings || 0), 0);

              return (
                <div 
                  key={attorney}
                  onClick={() => setSelectedAttorney(attorney)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedAttorney === attorney 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">{attorney}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entries:</span>
                      <span className="font-medium">{entries.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="font-medium text-blue-600">{formatHours(totalHours)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billable:</span>
                      <span className="font-medium text-green-600">{formatHours(billableHours)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ops:</span>
                      <span className="font-medium text-orange-600">{formatHours(opsHours)}h</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-gray-600">Earnings:</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(totalEarnings)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to Dashboard Button */}
        <div className="flex justify-center">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Analytics Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default EntriesTestPage;