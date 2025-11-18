import { useState, useMemo } from 'react';
import { useAllTimeEntries, useAttorneys } from '../hooks/useFirestoreData';
import { Search, Download, Filter, Calendar } from 'lucide-react';

function EntriesTestPage() {
  const { data: allEntries, loading: entriesLoading, error } = useAllTimeEntries();
  const { attorneys, loading: attorneysLoading } = useAttorneys();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttorney, setSelectedAttorney] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

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
        totalHours: (parseFloat(entry.hours) || 0) + (parseFloat(entry.secondaryHours) || 0)
      });
    });

    return grouped;
  }, [allEntries, attorneyMap]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    let entries = [];

    if (selectedAttorney === 'all') {
      // Flatten all entries
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
          entry.notes?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      entries.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle date objects
        if (sortConfig.key === 'date') {
          aVal = a.date?.toDate ? a.date.toDate() : new Date(a.year, getMonthNumber(a.month) - 1);
          bVal = b.date?.toDate ? b.date.toDate() : new Date(b.year, getMonthNumber(b.month) - 1);
        }

        // Handle numbers
        if (sortConfig.key === 'totalHours' || sortConfig.key === 'hours' || sortConfig.key === 'secondaryHours') {
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

  const exportToCSV = () => {
    const headers = [
      'Attorney',
      'Client',
      'Company',
      'Primary Hours',
      'Secondary Hours',
      'Total Hours',
      'Billing Category',
      'Category',
      'Ops',
      'Month',
      'Year',
      'Date',
      'Flat Fee',
      'Notes'
    ];

    const rows = filteredEntries.map(entry => [
      entry.attorneyName,
      entry.client || '',
      entry.company || '',
      entry.hours || 0,
      entry.secondaryHours || 0,
      entry.totalHours,
      entry.billingCategory || '',
      entry.category || '',
      entry.ops || '',
      entry.month || '',
      entry.year || '',
      entry.date ? new Date(entry.date.toDate()).toLocaleDateString() : '',
      entry.flatFee || '',
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

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const stats = {
      totalEntries: filteredEntries.length,
      totalHours: 0,
      totalBillableHours: 0,
      totalOpsHours: 0,
      uniqueClients: new Set(),
      uniqueCategories: new Set()
    };

    filteredEntries.forEach(entry => {
      stats.totalHours += entry.totalHours;
      
      if (entry.ops && entry.ops !== '' && entry.ops !== 'null') {
        stats.totalOpsHours += entry.totalHours;
      } else {
        stats.totalBillableHours += entry.totalHours;
      }

      if (entry.client) stats.uniqueClients.add(entry.client);
      if (entry.company) stats.uniqueClients.add(entry.company);
      if (entry.billingCategory) stats.uniqueCategories.add(entry.billingCategory);
    });

    return {
      ...stats,
      uniqueClients: stats.uniqueClients.size,
      uniqueCategories: stats.uniqueCategories.size
    };
  }, [filteredEntries]);

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
              <p className="text-gray-600 mt-1">View and export all time entries by attorney</p>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Entries</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {summaryStats.totalEntries}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {summaryStats.totalHours.toFixed(1)}h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Billable Hours</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {summaryStats.totalBillableHours.toFixed(1)}h
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Ops Hours</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {summaryStats.totalOpsHours.toFixed(1)}h
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

        {/* Entries Table */}
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
                    onClick={() => handleSort('company')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Company {sortConfig.key === 'company' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('hours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Hours {sortConfig.key === 'hours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('secondaryHours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Secondary {sortConfig.key === 'secondaryHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('totalHours')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Total {sortConfig.key === 'totalHours' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('billingCategory')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Category {sortConfig.key === 'billingCategory' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('ops')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Ops {sortConfig.key === 'ops' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('month')}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Date {sortConfig.key === 'month' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.company || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.hours || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {entry.secondaryHours || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {entry.totalHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {entry.billingCategory || entry.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {entry.ops ? (
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                            {entry.ops}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {entry.month} {entry.year}
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

        {/* Attorney Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Entries by Attorney</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attorneyList.map(attorney => {
              const entries = entriesByAttorney[attorney];
              const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
              const billableHours = entries.filter(e => !e.ops || e.ops === '' || e.ops === 'null')
                .reduce((sum, e) => sum + e.totalHours, 0);
              const opsHours = entries.filter(e => e.ops && e.ops !== '' && e.ops !== 'null')
                .reduce((sum, e) => sum + e.totalHours, 0);

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
                      <span className="font-medium text-blue-600">{totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Billable:</span>
                      <span className="font-medium text-green-600">{billableHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ops:</span>
                      <span className="font-medium text-orange-600">{opsHours.toFixed(1)}h</span>
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