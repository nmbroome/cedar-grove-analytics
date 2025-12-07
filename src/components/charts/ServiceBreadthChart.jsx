"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomTooltip } from '../tooltips';

const ServiceBreadthChart = ({ data, title = "Service Breadth (Unique Transaction Types)" }) => {
  const clientsWithTransactions = data.filter(c => c.uniqueTransactions > 0).slice(0, 10);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={clientsWithTransactions}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="uniqueTransactions" fill="#00C49F" name="Unique Transaction Types" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ServiceBreadthChart;
