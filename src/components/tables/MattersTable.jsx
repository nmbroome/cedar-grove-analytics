"use client";

import { useState } from 'react';
import { formatCurrency, formatHours } from '../../utils/formatters';
import { MatterRowTooltip } from '../tooltips';

const MattersTable = ({
  matters,
  sortConfig,
  onSort,
  totalHours
}) => {
  const [hoveredMatter, setHoveredMatter] = useState(null);
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
              onClick={() => onSort('matter')}
              className="w-[24%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Matter {getSortIndicator('matter')}
            </th>
            <th
              onClick={() => onSort('clientName')}
              className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Client {getSortIndicator('clientName')}
            </th>
            <th
              onClick={() => onSort('avgHours')}
              className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Avg Hours {getSortIndicator('avgHours')}
            </th>
            <th
              onClick={() => onSort('count')}
              className="w-[8%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Count {getSortIndicator('count')}
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
              Total Earnings {getSortIndicator('totalEarnings')}
            </th>
            <th
              onClick={() => onSort('percentage')}
              className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              % of Total {getSortIndicator('percentage')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matters.map((m, idx) => {
            const percentage = totalHours > 0 ? ((m.totalHours / totalHours) * 100).toFixed(1) : 0;
            return (
              <tr
                key={idx}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onMouseEnter={(e) => {
                  setHoveredMatter(m);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredMatter(null)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {m.matter}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {m.clientName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {m.avgHours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {m.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatHours(m.totalHours)}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  {formatCurrency(m.totalEarnings)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {percentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hoveredMatter && (
        <MatterRowTooltip
          matter={hoveredMatter}
          position={tooltipPosition}
        />
      )}
    </div>
  );
};

export default MattersTable;
