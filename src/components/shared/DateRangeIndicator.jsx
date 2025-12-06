import { Calendar, Users } from 'lucide-react';

const DateRangeIndicator = ({ 
  dateRangeLabel, 
  entryCount,
  globalAttorneyFilter = [],
  allAttorneyNames = []
}) => {
  const isFiltered = globalAttorneyFilter.length > 0 && globalAttorneyFilter.length < allAttorneyNames.length;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-600" />
        <span className="text-sm text-blue-700">
          Showing data for: <span className="font-semibold">{dateRangeLabel}</span>
          {entryCount !== undefined && (
            <span className="ml-2 text-blue-600">({entryCount} entries)</span>
          )}
        </span>
      </div>
      {isFiltered && (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700">
            Filtered by: <span className="font-semibold">
              {globalAttorneyFilter.length === 1 
                ? globalAttorneyFilter[0] 
                : `${globalAttorneyFilter.length} attorneys`}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default DateRangeIndicator;
