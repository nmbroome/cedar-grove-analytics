import { useState } from 'react';
import { formatCurrency, formatHours } from '../../utils/formatters';
import { ClientRowTooltip } from '../tooltips';

const ClientsTable = ({ 
  clients, 
  sortConfig, 
  onSort 
}) => {
  const [hoveredClient, setHoveredClient] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th 
              onClick={() => onSort('name')}
              className="w-[28%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Client Name {getSortIndicator('name')}
            </th>
            <th 
              onClick={() => onSort('status')}
              className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Status {getSortIndicator('status')}
            </th>
            <th 
              onClick={() => onSort('location')}
              className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Location {getSortIndicator('location')}
            </th>
            <th 
              onClick={() => onSort('totalHours')}
              className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Total Hours {getSortIndicator('totalHours')}
            </th>
            <th 
              onClick={() => onSort('totalEarnings')}
              className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Earnings {getSortIndicator('totalEarnings')}
            </th>
            <th 
              onClick={() => onSort('lastActivity')}
              className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Last Activity {getSortIndicator('lastActivity')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.map((client, idx) => (
            <tr 
              key={idx} 
              className="hover:bg-purple-50 cursor-pointer transition-colors"
              onMouseEnter={(e) => {
                if (client.entryCount > 0) {
                  setHoveredClient(client);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseMove={(e) => {
                if (client.entryCount > 0) {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
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
      
      {hoveredClient && (
        <ClientRowTooltip 
          client={hoveredClient} 
          position={tooltipPosition}
        />
      )}
    </div>
  );
};

export default ClientsTable;
