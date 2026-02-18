"use client";

import { useState } from 'react';
import { DateRangeIndicator } from '../shared';
import { MattersTable } from '../tables';
import { MatterCategorySunburst } from '../charts';

const TransactionsView = ({
  dateRangeLabel,
  globalAttorneyFilter,
  allAttorneyNames,
  matterData,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'totalHours', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'matter' || key === 'clientName') direction = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedMatters = () => {
    const matters = [...matterData];
    const totalHours = matters.reduce((sum, m) => sum + m.totalHours, 0);

    matters.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'matter':
          aVal = a.matter.toLowerCase();
          bVal = b.matter.toLowerCase();
          break;
        case 'clientName':
          aVal = a.clientName.toLowerCase();
          bVal = b.clientName.toLowerCase();
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

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return matters;
  };

  const totalHours = matterData.reduce((sum, m) => sum + m.totalHours, 0);

  return (
    <div className="space-y-6">
      <DateRangeIndicator
        dateRangeLabel={dateRangeLabel}
        globalAttorneyFilter={globalAttorneyFilter}
        allAttorneyNames={allAttorneyNames}
      />

      <MattersTable
        matters={getSortedMatters()}
        sortConfig={sortConfig}
        onSort={handleSort}
        totalHours={totalHours}
      />

      <MatterCategorySunburst data={matterData} />
    </div>
  );
};

export default TransactionsView;
