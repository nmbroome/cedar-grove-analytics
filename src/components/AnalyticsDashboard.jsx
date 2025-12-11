"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, LogIn, LogOut, Shield } from 'lucide-react';
import { getDateRangeLabel } from '@/utils/dateHelpers';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useAuth } from '@/context/AuthContext';
import { DateRangeDropdown, AttorneyFilterDropdown } from './shared';
import { OverviewView, AttorneysView, TransactionsView, OpsView, ClientsView } from './views';

const AnalyticsDashboard = () => {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();

  // Date range state
  const [dateRange, setDateRange] = useState('current-month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Attorney filter state
  const [globalAttorneyFilter, setGlobalAttorneyFilter] = useState([]);
  const [showAttorneyDropdown, setShowAttorneyDropdown] = useState(false);
  const [attorneyFilterInitialized, setAttorneyFilterInitialized] = useState(false);

  // Transaction filter state
  const [transactionAttorneyFilter, setTransactionAttorneyFilter] = useState('all');

  // View state
  const [selectedView, setSelectedView] = useState('overview');

  // Fetch and process data
  const {
    loading,
    error,
    allAttorneyNames,
    filteredEntries,
    attorneyData,
    transactionData,
    opsData,
    clientData,
    clientCounts,
    calculateUtilization,
    totalBillable,
    totalOps,
    totalEarnings,
    totalBillableTarget,
    totalOpsTarget,
    avgUtilization,
  } = useAnalyticsData({
    dateRange,
    customDateStart,
    customDateEnd,
    globalAttorneyFilter,
    transactionAttorneyFilter,
  });

  // Initialize attorney filter with all attorneys once loaded
  useEffect(() => {
    if (!attorneyFilterInitialized && allAttorneyNames.length > 0) {
      setGlobalAttorneyFilter([...allAttorneyNames]);
      setAttorneyFilterInitialized(true);
    }
  }, [allAttorneyNames, attorneyFilterInitialized]);

  const handleLogout = async () => {
    await signOut();
    router.refresh();
  };

  const dateRangeLabel = getDateRangeLabel(dateRange, customDateStart, customDateEnd);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="mt-4 text-xl text-gray-700">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!filteredEntries || filteredEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Header 
            showDateDropdown={showDateDropdown}
            setShowDateDropdown={setShowDateDropdown}
            dateRange={dateRange}
            setDateRange={setDateRange}
            customDateStart={customDateStart}
            setCustomDateStart={setCustomDateStart}
            customDateEnd={customDateEnd}
            setCustomDateEnd={setCustomDateEnd}
            showAttorneyDropdown={showAttorneyDropdown}
            setShowAttorneyDropdown={setShowAttorneyDropdown}
            allAttorneyNames={allAttorneyNames || []}
            globalAttorneyFilter={globalAttorneyFilter}
            setGlobalAttorneyFilter={setGlobalAttorneyFilter}
            isAdmin={isAdmin}
            user={user}
            onLogout={handleLogout}
          />

          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-gray-900 text-xl mb-4">No data available</div>
              <div className="text-gray-600">
                No time entries found for the selected date range. Try selecting a different time period above.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header 
          showDateDropdown={showDateDropdown}
          setShowDateDropdown={setShowDateDropdown}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customDateStart={customDateStart}
          setCustomDateStart={setCustomDateStart}
          customDateEnd={customDateEnd}
          setCustomDateEnd={setCustomDateEnd}
          showAttorneyDropdown={showAttorneyDropdown}
          setShowAttorneyDropdown={setShowAttorneyDropdown}
          allAttorneyNames={allAttorneyNames || []}
          globalAttorneyFilter={globalAttorneyFilter}
          setGlobalAttorneyFilter={setGlobalAttorneyFilter}
          isAdmin={isAdmin}
          user={user}
          onLogout={handleLogout}
        />

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {['overview', 'attorneys', 'transactions', 'ops', 'clients'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                selectedView === view
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Views */}
        {selectedView === 'overview' && (
          <OverviewView
            dateRangeLabel={dateRangeLabel}
            filteredEntriesCount={filteredEntries.length}
            globalAttorneyFilter={globalAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            avgUtilization={avgUtilization}
            totalBillable={totalBillable}
            totalOps={totalOps}
            totalBillableTarget={totalBillableTarget}
            totalOpsTarget={totalOpsTarget}
            totalEarnings={totalEarnings}
            attorneyData={attorneyData}
            transactionData={transactionData}
          />
        )}

        {selectedView === 'attorneys' && (
          <AttorneysView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={globalAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            attorneyData={attorneyData}
            calculateUtilization={calculateUtilization}
          />
        )}

        {selectedView === 'transactions' && (
          <TransactionsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={globalAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            transactionData={transactionData}
          />
        )}

        {selectedView === 'ops' && (
          <OpsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={globalAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            opsData={opsData}
          />
        )}

        {selectedView === 'clients' && (
          <ClientsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={globalAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            clientData={clientData}
            clientCounts={clientCounts}
          />
        )}
      </div>
    </div>
  );
};

// Header component
const Header = ({
  showDateDropdown,
  setShowDateDropdown,
  dateRange,
  setDateRange,
  customDateStart,
  setCustomDateStart,
  customDateEnd,
  setCustomDateEnd,
  showAttorneyDropdown,
  setShowAttorneyDropdown,
  allAttorneyNames,
  globalAttorneyFilter,
  setGlobalAttorneyFilter,
  isAdmin,
  user,
  onLogout,
}) => {
  return (
    <div className="mb-8 flex justify-between items-start">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cedar Grove Analytics</h1>
        <p className="text-gray-600">Attorney time allocation and efficiency insights</p>
      </div>
      
      <div className="flex items-center gap-4">
        <AttorneyFilterDropdown
          allAttorneyNames={allAttorneyNames}
          globalAttorneyFilter={globalAttorneyFilter}
          setGlobalAttorneyFilter={setGlobalAttorneyFilter}
          showDropdown={showAttorneyDropdown}
          setShowDropdown={setShowAttorneyDropdown}
        />
        
        <DateRangeDropdown
          dateRange={dateRange}
          setDateRange={setDateRange}
          customDateStart={customDateStart}
          setCustomDateStart={setCustomDateStart}
          customDateEnd={customDateEnd}
          setCustomDateEnd={setCustomDateEnd}
          showDropdown={showDateDropdown}
          setShowDropdown={setShowDateDropdown}
        />

        {/* Admin Button - always visible, redirects to login if not authenticated */}
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Admin</span>
        </Link>

        {/* User status / Logout */}
        {user && !user.isAnonymous && (
          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={`Logged in as ${user.email}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;