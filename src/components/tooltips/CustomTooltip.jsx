import { formatCurrency, formatHours } from '../../utils/formatters';

// Custom tooltip formatter for charts - shows only the hovered item.
// `sourceNote` (see utils/calcDefinitions.mjs getSourceNote) appends one muted
// line stating the formula/provenance of the plotted value.
const CustomTooltip = ({ active, payload, label, sourceNote }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.name.toLowerCase().includes('earning') ? formatCurrency(entry.value) : `${formatHours(entry.value)}h`}
          </p>
        ))}
        {sourceNote && (
          <p className="mt-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-gray-400 max-w-[280px]">
            {sourceNote}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
