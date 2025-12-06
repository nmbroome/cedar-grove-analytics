const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor = 'text-blue-500',
  className = '' 
}) => {
  return (
    <div className={`bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600 text-sm font-medium">{title}</span>
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl font-bold text-gray-900">{value}</div>
      </div>
      {subtitle && (
        <div className="text-sm text-gray-600 text-center">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default KPICard;
