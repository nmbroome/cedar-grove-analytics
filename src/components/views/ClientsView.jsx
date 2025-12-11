"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import { DateRangeIndicator } from '../shared';
import { ClientsTable } from '../tables';
import { ClientHoursChart, ServiceBreadthChart } from '../charts';

const ClientsView = ({
  dateRangeLabel,
  globalAttorneyFilter,
  allAttorneyNames,
  clientData,
  clientCounts,
}) => {
  const [clientSearch, setClientSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'totalHours', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'name' || key === 'location' || key === 'status') direction = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedClients = () => {
    let filtered = clientData.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
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
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const activeCount = clientData.filter(c => c.totalHours > 0).length;
  const inactiveCount = clientData.filter(c => c.totalHours === 0).length;

  return (
    <div className="space-y-6">
      <DateRangeIndicator 
        dateRangeLabel={dateRangeLabel}
        globalAttorneyFilter={globalAttorneyFilter}
        allAttorneyNames={allAttorneyNames}
      />

      {/* Client Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-600 text-sm">Active Clients</span>
              <div className="text-3xl font-bold text-green-600 mt-2">{activeCount}</div>
              <span className="text-gray-400 text-xs">with activity in selected period</span>
            </div>
            <div className="text-gray-300 text-4xl font-light mx-4">/</div>
            <div>
              <span className="text-gray-600 text-sm">Inactive Clients</span>
              <div className="text-3xl font-bold text-red-600 mt-2">{inactiveCount}</div>
              <span className="text-gray-400 text-xs">no activity in selected period</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-gray-400 text-xs">
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
      <ClientsTable 
        clients={getSortedClients()}
        sortConfig={sortConfig}
        onSort={handleSort}
      />

      {/* Client Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientHoursChart data={clientData} />
        <ServiceBreadthChart data={clientData} />
      </div>
    </div>
  );
};

export default ClientsView;