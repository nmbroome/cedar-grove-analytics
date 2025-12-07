"use client";

import { Activity, Clock, Users, DollarSign } from 'lucide-react';
import { formatCurrency, formatHours } from '../../utils/formatters';
import { DateRangeIndicator, KPICard } from '../shared';
import { TopTransactionsChart, BillableVsOpsChart } from '../charts';

const OverviewView = ({
  dateRangeLabel,
  filteredEntriesCount,
  globalAttorneyFilter,
  allAttorneyNames,
  avgUtilization,
  totalBillable,
  totalOps,
  totalBillableTarget,
  totalOpsTarget,
  totalEarnings,
  attorneyData,
  transactionData,
}) => {
  const totalHours = totalBillable + totalOps;
  const billablePercentage = totalHours > 0 ? Math.round((totalBillable / totalHours) * 100) : 0;
  const opsPercentage = totalHours > 0 ? Math.round((totalOps / totalHours) * 100) : 0;
  const billableProgress = totalBillableTarget > 0 ? Math.round((totalBillable / totalBillableTarget) * 100) : 0;
  const opsProgress = totalOpsTarget > 0 ? Math.round((totalOps / totalOpsTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <DateRangeIndicator 
        dateRangeLabel={dateRangeLabel}
        entryCount={filteredEntriesCount}
        globalAttorneyFilter={globalAttorneyFilter}
        allAttorneyNames={allAttorneyNames}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard
          title="Avg Utilization"
          value={`${avgUtilization}%`}
          subtitle={`${attorneyData.length} attorneys`}
          icon={Activity}
          iconColor="text-blue-500"
        />

        <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-600 text-sm font-medium">Time Split</span>
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-baseline gap-1.5">
              <div className="text-3xl font-bold text-blue-600">{billablePercentage}%</div>
              <div className="text-xl text-gray-400">/</div>
              <div className="text-3xl font-bold text-green-600">{opsPercentage}%</div>
            </div>
          </div>
          <div className="text-sm text-gray-600 text-center">Billable / Ops</div>
        </div>

        <KPICard
          title="Total Billable"
          value={`${formatHours(totalBillable)}h`}
          subtitle={`${billableProgress}% of target`}
          icon={Clock}
          iconColor="text-green-500"
        />

        <KPICard
          title="Total Ops"
          value={`${formatHours(totalOps)}h`}
          subtitle={`${opsProgress}% of target`}
          icon={Users}
          iconColor="text-orange-500"
        />

        <div className="bg-white p-4 rounded-lg shadow aspect-square flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-600 text-sm font-medium">Total Earnings</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalEarnings)}</div>
          </div>
          <div className="text-sm text-gray-600 text-center">Billable earnings</div>
        </div>
      </div>

      {/* Top Transactions */}
      <TopTransactionsChart 
        data={transactionData} 
        title={`Top Transaction Types by Time - ${dateRangeLabel}`}
      />

      {/* Billable vs Ops Time by Attorney */}
      <BillableVsOpsChart 
        data={attorneyData}
        title={`Billable vs Ops Time by Attorney - ${dateRangeLabel}`}
      />
    </div>
  );
};

export default OverviewView;
