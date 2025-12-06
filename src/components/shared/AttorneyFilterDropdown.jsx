import { useRef, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';

const AttorneyFilterDropdown = ({
  allAttorneyNames,
  globalAttorneyFilter,
  setGlobalAttorneyFilter,
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

  const getButtonLabel = () => {
    if (globalAttorneyFilter.length === 0) return 'No Attorneys';
    if (globalAttorneyFilter.length === allAttorneyNames.length) return 'All Attorneys';
    if (globalAttorneyFilter.length === 1) return globalAttorneyFilter[0];
    return `${globalAttorneyFilter.length} Attorneys`;
  };

  const isFiltered = globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm ${
          isFiltered
            ? 'bg-purple-50 border-purple-300' 
            : 'bg-white border-gray-300'
        }`}
      >
        <Users className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {getButtonLabel()}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <button
              onClick={() => setGlobalAttorneyFilter([...allAttorneyNames])}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                globalAttorneyFilter.length === allAttorneyNames.length 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Attorneys
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {allAttorneyNames.map(name => (
              <label
                key={name}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={globalAttorneyFilter.includes(name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setGlobalAttorneyFilter([...globalAttorneyFilter, name]);
                    } else {
                      setGlobalAttorneyFilter(globalAttorneyFilter.filter(n => n !== name));
                    }
                  }}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="ml-3 text-sm text-gray-700">{name}</span>
              </label>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setGlobalAttorneyFilter([])}
              className="w-full px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttorneyFilterDropdown;
