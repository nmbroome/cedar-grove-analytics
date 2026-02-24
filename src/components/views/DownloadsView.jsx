"use client";

import { useState } from 'react';
import { DateRangeIndicator } from '../shared';
import { DownloadsTable } from '../tables';
import { TopDownloadsChart } from '../charts';

const DownloadsView = ({
  dateRangeLabel,
  globalAttorneyFilter,
  allAttorneyNames,
  downloadData,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'downloads', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'file') direction = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedDownloads = () => {
    const downloads = [...downloadData];

    downloads.sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'file':
          aVal = a.file.toLowerCase();
          bVal = b.file.toLowerCase();
          break;
        case 'downloads':
          aVal = a.downloads;
          bVal = b.downloads;
          break;
        case 'lastDownload':
          aVal = a.lastDownload || '';
          bVal = b.lastDownload || '';
          break;
        default:
          aVal = a.downloads;
          bVal = b.downloads;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return downloads;
  };

  return (
    <div className="space-y-6">
      <DateRangeIndicator
        dateRangeLabel={dateRangeLabel}
        entryCount={downloadData?.length || 0}
        globalAttorneyFilter={globalAttorneyFilter}
        allAttorneyNames={allAttorneyNames}
      />

      <DownloadsTable
        downloads={getSortedDownloads()}
        sortConfig={sortConfig}
        onSort={handleSort}
      />

      <TopDownloadsChart data={getSortedDownloads()} />
    </div>
  );
};

export default DownloadsView;
