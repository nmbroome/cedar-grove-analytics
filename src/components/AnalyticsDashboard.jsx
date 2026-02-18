"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, LogIn, LogOut, Shield } from 'lucide-react';
import { getDateRangeLabel } from '@/utils/dateHelpers';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useAuth } from '@/context/AuthContext';
import { DateRangeDropdown, AttorneyFilterDropdown } from './shared';
import { OverviewView, AttorneysView, TransactionsView, OpsView, ClientsView, DownloadsView } from './views';

const AnalyticsDashboard = () => {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();

  // Date range state
  const [dateRange, setDateRange] = useState('current-month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Attorney filter state - start with empty array, will default to all attorneys
  const [globalAttorneyFilter, setGlobalAttorneyFilter] = useState([]);
  const [showAttorneyDropdown, setShowAttorneyDropdown] = useState(false);

  // Transaction filter state
  const [transactionAttorneyFilter, setTransactionAttorneyFilter] = useState('all');

  // View state
  const [selectedView, setSelectedView] = useState('overview');

  // Fetch and process data
  const {
    loading,
    error,
    allAttorneyNames,
    filteredBillableEntries,
    filteredOpsEntries,
    attorneyData,
    transactionData,
    matterData,
    downloadData,
    opsData,
    clientData,
    clientCounts,
    calculateUtilization,
    totalBillable,
    totalOps,
    totalEarnings,
    totalGrossBillables,
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

  // Effective attorney filter - defaults to all attorneys when empty
  const effectiveAttorneyFilter = useMemo(() => {
    if (globalAttorneyFilter.length === 0 && allAttorneyNames.length > 0) {
      return [...allAttorneyNames];
    }
    return globalAttorneyFilter;
  }, [globalAttorneyFilter, allAttorneyNames]);

  const handleLogout = async () => {
    await signOut();
    router.refresh();
  };

  const dateRangeLabel = getDateRangeLabel(dateRange, customDateStart, customDateEnd);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cg-green"></div>
          <div className="mt-4 text-xl text-cg-dark">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-cg-background">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-4">Error loading data</div>
          <div className="text-cg-dark mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cg-green text-white rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if ((!filteredBillableEntries || filteredBillableEntries.length === 0) && (!filteredOpsEntries || filteredOpsEntries.length === 0)) {
    return (
      <div className="min-h-screen bg-cg-background p-6">
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
            globalAttorneyFilter={effectiveAttorneyFilter}
            setGlobalAttorneyFilter={setGlobalAttorneyFilter}
            isAdmin={isAdmin}
            user={user}
            onLogout={handleLogout}
          />

          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="text-cg-dark text-xl mb-4">No data available</div>
              <div className="text-gray-500">
                No time entries found for the selected date range. Try selecting a different time period above.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cg-background p-6">
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
          globalAttorneyFilter={effectiveAttorneyFilter}
          setGlobalAttorneyFilter={setGlobalAttorneyFilter}
          isAdmin={isAdmin}
          user={user}
          onLogout={handleLogout}
        />

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-300">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'attorneys', label: 'Team Members' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'ops', label: 'Ops' },
            { key: 'clients', label: 'Clients' },
            { key: 'downloads', label: 'Downloads' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key)}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedView === tab.key
                  ? 'text-cg-green border-b-2 border-cg-green'
                  : 'text-cg-dark hover:text-cg-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Views */}
        {selectedView === 'overview' && (
          <OverviewView
            dateRangeLabel={dateRangeLabel}
            filteredEntriesCount={(filteredBillableEntries?.length || 0) + (filteredOpsEntries?.length || 0)}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            avgUtilization={avgUtilization}
            totalBillable={totalBillable}
            totalOps={totalOps}
            totalBillableTarget={totalBillableTarget}
            totalOpsTarget={totalOpsTarget}
            totalEarnings={totalEarnings}
            totalGrossBillables={totalGrossBillables}
            attorneyData={attorneyData}
            transactionData={transactionData}
          />
        )}

        {selectedView === 'attorneys' && (
          <AttorneysView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            attorneyData={attorneyData}
            calculateUtilization={calculateUtilization}
          />
        )}

        {selectedView === 'transactions' && (
          <TransactionsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            matterData={matterData}
          />
        )}

        {selectedView === 'ops' && (
          <OpsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            opsData={opsData}
          />
        )}

        {selectedView === 'clients' && (
          <ClientsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            clientData={clientData}
            clientCounts={clientCounts}
            filteredBillableEntries={filteredBillableEntries}
          />
        )}

        {selectedView === 'downloads' && (
          <DownloadsView
            dateRangeLabel={dateRangeLabel}
            globalAttorneyFilter={effectiveAttorneyFilter}
            allAttorneyNames={allAttorneyNames}
            downloadData={downloadData}
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
        <h1 className="text-3xl font-bold text-cg-black">Cedar Grove Analytics</h1>
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

        {/* Admin Button */}
        <Link
          href="/admin"
          className="flex items-center gap-2 px-4 py-2 bg-cg-dark text-white hover:bg-gray-700 rounded-lg transition-colors"
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
              className="flex items-center gap-2 px-3 py-2 text-cg-dark hover:text-cg-black hover:bg-gray-200 rounded-lg transition-colors"
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