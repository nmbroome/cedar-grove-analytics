import { useState, useMemo } from 'react';
import TimeByClientChart from './charts/TimeByClientChart';
import { useAllTimeEntries, useAttorneys } from '../hooks/useFirestoreData';

function MainPage() {
  const [selectedYear, setSelectedYear] = useState(2025);
  
  // Fetch all attorneys
  const { attorneys, loading: attorneysLoading } = useAttorneys();
  
  // Fetch all time entries
  const { data: allEntries, loading: entriesLoading, error } = useAllTimeEntries();
  
  const loading = attorneysLoading || entriesLoading;

  // Create attorney name map
  const attorneyMap = useMemo(() => {
    const map = {};
    attorneys.forEach(attorney => {
      map[attorney.id] = attorney.name || attorney.id;
    });
    return map;
  }, [attorneys]);

  // Process and filter data
  const timeData = useMemo(() => {
    if (!allEntries || allEntries.length === 0) return [];

    return allEntries
      .filter(entry => {
        if (selectedYear && entry.year !== selectedYear) return false;
        return true;
      })
      .map(entry => ({
        ...entry,
        attorney: entry.name || attorneyMap[entry.attorneyId] || entry.attorneyId,
        client: entry.client || entry.company || 'Unknown Client',
        hours: entry.hours || entry.secondaryHours || 0,
      }));
  }, [allEntries, attorneyMap, selectedYear]);

  // Aggregate by client
  const clientData = useMemo(() => {
    return timeData.reduce((acc, entry) => {
      const existing = acc.find(item => item.client === entry.client);
      if (existing) {
        existing.hours += entry.hours;
      } else {
        acc.push({ client: entry.client, hours: entry.hours });
      }
      return acc;
    }, []);
  }, [timeData]);

  const totalHours = useMemo(() => 
    timeData.reduce((sum, entry) => sum + (entry.hours || 0), 0),
    [timeData]
  );

  const totalClients = clientData.length;

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
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Error loading data</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cedar Grove Analytics</h1>
              <p className="text-gray-600 mt-1">Client Time Allocation</p>
            </div>
            <div className="flex gap-3">
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Total Hours
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {totalHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Across all clients
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Total Clients
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {totalClients}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Active clients
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
            <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Average Hours
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {totalClients > 0 ? (totalHours / totalClients).toFixed(1) : '0.0'}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Per client
            </div>
          </div>
        </div>

        {/* Time by Client Chart */}
        <TimeByClientChart data={clientData} />

        {/* Client Details Table */}
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Client Details</h3>
            <p className="text-sm text-gray-600 mt-1">All clients for {selectedYear}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
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
                {clientData
                  .sort((a, b) => b.hours - a.hours)
                  .map((client, index) => (
                    <tr key={client.client} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.client}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {client.hours.toFixed(1)} hrs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {totalHours > 0 ? ((client.hours / totalHours) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MainPage;