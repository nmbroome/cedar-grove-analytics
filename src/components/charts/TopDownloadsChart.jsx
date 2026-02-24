"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DownloadTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1 text-sm max-w-[300px] break-words">{label}</p>
        <p className="text-sm text-blue-600">{payload[0].value} downloads</p>
      </div>
    );
  }
  return null;
};

const TopDownloadsChart = ({ data }) => {
  const chartData = data
    .slice(0, 15)
    .map(d => ({
      file: d.file.length > 40 ? d.file.slice(0, 37) + '...' : d.file,
      fullFile: d.file,
      downloads: d.downloads,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Documents by Downloads</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            dataKey="file"
            type="category"
            width={260}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<DownloadTooltip />} />
          <Bar dataKey="downloads" fill="#0088FE" name="Downloads" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopDownloadsChart;
