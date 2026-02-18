"use client";

const DownloadsTable = ({
  downloads,
  sortConfig,
  onSort,
}) => {
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th
              onClick={() => onSort('file')}
              className="w-[60%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Document {getSortIndicator('file')}
            </th>
            <th
              onClick={() => onSort('downloads')}
              className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Downloads {getSortIndicator('downloads')}
            </th>
            <th
              onClick={() => onSort('lastDownload')}
              className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            >
              Last Download {getSortIndicator('lastDownload')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {downloads.map((d, idx) => (
            <tr
              key={idx}
              className="hover:bg-blue-50 transition-colors"
            >
              <td className="px-6 py-3 text-sm text-gray-900 truncate" title={d.file}>
                {d.file}
              </td>
              <td className="px-6 py-3 text-sm text-gray-900">
                {d.downloads}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">
                {formatDate(d.lastDownload)}
              </td>
            </tr>
          ))}
          {downloads.length === 0 && (
            <tr>
              <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                No download data available for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DownloadsTable;
