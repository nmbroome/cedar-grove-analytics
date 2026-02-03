"use client";

import { useRouter } from 'next/navigation';
import { formatCurrency, formatHours } from '../../utils/formatters';

const AttorneysTable = ({ 
  attorneys, 
  sortConfig, 
  onSort,
  calculateUtilization 
}) => {
  const router = useRouter();

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleAttorneyClick = (attorneyName) => {
    router.push(`/attorneys/${encodeURIComponent(attorneyName)}`);
  };

  const getUtilizationBadgeColor = (util) => {
    if (util >= 95 && util <= 105) return 'bg-green-100 text-green-800';
    if ((util >= 90 && util < 95) || (util > 105 && util <= 110)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th 
              onClick={() => onSort('name')}
              className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Name {getSortIndicator('name')}
            </th>
            <th 
              onClick={() => onSort('billable')}
              className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Billable {getSortIndicator('billable')}
            </th>
            <th 
              onClick={() => onSort('ops')}
              className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Ops {getSortIndicator('ops')}
            </th>
            <th 
              onClick={() => onSort('total')}
              className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Total {getSortIndicator('total')}
            </th>
            <th 
              onClick={() => onSort('earnings')}
              className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Earnings {getSortIndicator('earnings')}
            </th>
            <th 
              onClick={() => onSort('utilization')}
              className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
            >
              Util. {getSortIndicator('utilization')}
            </th>
            <th className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
              Top Transactions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {attorneys.map((attorney, idx) => {
            const utilization = calculateUtilization(attorney);
            const total = attorney.billable + attorney.ops;
            return (
              <tr 
                key={idx} 
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => handleAttorneyClick(attorney.name)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div>
                    <span className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                      {attorney.name}
                    </span>
                    {attorney.role && attorney.role !== 'Attorney' && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        ({attorney.role})
                      </span>
                    )}
                  </div>
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
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUtilizationBadgeColor(utilization)}`}
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
  );
};

export default AttorneysTable;