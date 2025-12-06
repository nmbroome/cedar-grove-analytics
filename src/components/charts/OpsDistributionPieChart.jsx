import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from '../../utils/constants';

const OpsDistributionPieChart = ({ data, title = "Ops Time Distribution" }) => {
  // Custom label for pie chart - only show for slices >= 5%
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, hours, percentage, index }) => {
    if (percent < 0.05) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill={CHART_COLORS[index % CHART_COLORS.length]}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${hours}h (${percentage}%)`}
      </text>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={600}>
        <PieChart margin={{ top: 60, right: 20, bottom: 120, left: 20 }}>
          <Pie
            data={data}
            dataKey="hours"
            nameKey="category"
            cx="50%"
            cy="38%"
            outerRadius={100}
            label={renderCustomLabel}
            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [`${value}h`, name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
          />
          <Legend 
            layout="horizontal" 
            align="center" 
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: '40px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OpsDistributionPieChart;
