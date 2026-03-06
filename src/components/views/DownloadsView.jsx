"use client";

import { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { DateRangeIndicator } from '../shared';
import { DownloadsTable } from '../tables';
import { TopDownloadsChart } from '../charts';

const DownloadsView = ({
  dateRangeLabel,
  globalAttorneyFilter,
  allAttorneyNames,
  downloadData,
}) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderSortConfig, setFolderSortConfig] = useState({ key: 'downloads', direction: 'desc' });
  const [fileSortConfig, setFileSortConfig] = useState({ key: 'downloads', direction: 'desc' });

  const handleFolderSort = (key) => {
    let direction = 'desc';
    if (key === 'name') direction = 'asc';
    if (folderSortConfig.key === key) {
      direction = folderSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setFolderSortConfig({ key, direction });
  };

  const handleFileSort = (key) => {
    let direction = 'desc';
    if (key === 'file') direction = 'asc';
    if (fileSortConfig.key === key) {
      direction = fileSortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setFileSortConfig({ key, direction });
  };

  const sortedFolders = useMemo(() => {
    const folders = [...downloadData];
    folders.sort((a, b) => {
      let aVal, bVal;
      switch (folderSortConfig.key) {
        case 'name':
          aVal = a.folderName.toLowerCase();
          bVal = b.folderName.toLowerCase();
          break;
        case 'downloads':
          aVal = a.downloads;
          bVal = b.downloads;
          break;
        case 'uniqueFiles':
          aVal = a.uniqueFiles;
          bVal = b.uniqueFiles;
          break;
        case 'lastDownload':
          aVal = a.lastDownload || '';
          bVal = b.lastDownload || '';
          break;
        default:
          aVal = a.downloads;
          bVal = b.downloads;
      }
      if (aVal < bVal) return folderSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return folderSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return folders;
  }, [downloadData, folderSortConfig]);

  const selectedFolderData = useMemo(() => {
    if (!selectedFolder) return null;
    return downloadData.find(f => f.folderName === selectedFolder);
  }, [downloadData, selectedFolder]);

  const sortedFiles = useMemo(() => {
    if (!selectedFolderData) return [];
    const files = [...selectedFolderData.files];
    files.sort((a, b) => {
      let aVal, bVal;
      switch (fileSortConfig.key) {
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
      if (aVal < bVal) return fileSortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return fileSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return files;
  }, [selectedFolderData, fileSortConfig]);

  const totalFiles = useMemo(() => {
    return downloadData.reduce((sum, f) => sum + f.uniqueFiles, 0);
  }, [downloadData]);

  return (
    <div className="space-y-6">
      <DateRangeIndicator
        dateRangeLabel={dateRangeLabel}
        entryCount={selectedFolder ? selectedFolderData?.files?.length || 0 : totalFiles}
        globalAttorneyFilter={globalAttorneyFilter}
        allAttorneyNames={allAttorneyNames}
      />

      {selectedFolder ? (
        <>
          <button
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to all folders
          </button>

          <div className="bg-white rounded-lg shadow px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{selectedFolderData?.folderName}</h3>
            <div className="flex gap-6 mt-1 text-sm text-gray-500">
              <span>{selectedFolderData?.downloads} downloads</span>
              <span>{selectedFolderData?.uniqueFiles} files</span>
              <span>{selectedFolderData?.uniqueUsers} users</span>
            </div>
          </div>

          <DownloadsTable
            mode="files"
            data={sortedFiles}
            sortConfig={fileSortConfig}
            onSort={handleFileSort}
          />

          <TopDownloadsChart
            data={sortedFiles}
            mode="files"
            title={`Top Documents in ${selectedFolderData?.folderName || selectedFolder}`}
          />
        </>
      ) : (
        <>
          <DownloadsTable
            mode="folders"
            data={sortedFolders}
            sortConfig={folderSortConfig}
            onSort={handleFolderSort}
            onFolderClick={setSelectedFolder}
          />

          <TopDownloadsChart
            data={sortedFolders}
            mode="folders"
            title="Top Folders by Downloads"
          />
        </>
      )}
    </div>
  );
};

export default DownloadsView;
