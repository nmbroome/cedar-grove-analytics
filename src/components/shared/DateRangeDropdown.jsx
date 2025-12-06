import { useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { DATE_RANGE_OPTIONS } from '../../utils/constants';
import { getDateRangeLabel } from '../../utils/dateHelpers';

const DateRangeDropdown = ({
  dateRange,
  setDateRange,
  customDateStart,
  setCustomDateStart,
  customDateEnd,
  setCustomDateEnd,
  showDropdown,
  setShowDropdown,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  const handleDateRangeSelect = (value) => {
    if (value !== 'custom') {
      setDateRange(value);
      setShowDropdown(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (customDateStart && customDateEnd) {
      setDateRange('custom');
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {getDateRangeLabel(dateRange, customDateStart, customDateEnd)}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Preset Options */}
          <div className="py-1">
            {DATE_RANGE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleDateRangeSelect(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  dateRange === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Range Section */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <p className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Custom Range</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleApplyCustomRange}
                disabled={!customDateStart || !customDateEnd}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  customDateStart && customDateEnd
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Apply Custom Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeDropdown;
