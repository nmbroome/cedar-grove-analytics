"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from '../tooltips';

const TopTransactionsChart = ({ data, title = "Top Transaction Types by Time" }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.slice(0, 10)}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="type" angle={-15} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="totalHours" fill="#0088FE" name="Total Hours" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopTransactionsChart;
