import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAllTimeEntries, useAttorneys, useClients } from './useFirestoreData';
import { useAttorneyRates } from './useAttorneyRates';
import { 
  getEntryDate, 
  getPSTDate, 
  getMonthBusinessDays,
  countBusinessDays 
} from '../utils/dateHelpers';
import { 
  isAttorneyHidden, 
  shouldIncludeAttorneyData,
  filterHiddenAttorneys,
  filterHiddenAttorneyData 
} from '../utils/hiddenAttorneys';

// Role mapping for specific people who aren't attorneys
const ROLE_OVERRIDES = {
  'Valery Uscanga': 'Legal Operations Associate',
  // Add more role overrides here as needed
};

export const useAnalyticsData = ({
  dateRange,
  customDateStart,
  customDateEnd,
  globalAttorneyFilter,
  transactionAttorneyFilter,
}) => {
  // Fetch data from Firebase
  const { data: allEntries, loading: entriesLoading, error: entriesError } = useAllTimeEntries();
  const { attorneys: firebaseAttorneys, loading: attorneysLoading, error: attorneysError } = useAttorneys();
  const { clients: firebaseClients, loading: clientsLoading, error: clientsError } = useClients();
  const { getRate, loading: ratesLoading } = useAttorneyRates();
  
  // State for attorney targets from Firebase
  const [attorneyTargets, setAttorneyTargets] = useState({});
  const [targetsLoading, setTargetsLoading] = useState(true);

  // Fetch all attorney targets from Firebase
  useEffect(() => {
    const fetchAllTargets = async () => {
      try {
        setTargetsLoading(true);
        const targetsMap = {};
        
        for (const attorney of firebaseAttorneys) {
          try {
            const targetsSnapshot = await getDocs(collection(db, 'attorneys', attorney.id, 'targets'));
            const attorneyName = attorney.name || attorney.id;
            
            if (!targetsMap[attorneyName]) {
              targetsMap[attorneyName] = {};
            }
            
            targetsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              targetsMap[attorneyName][doc.id] = {
                billableTarget: data.billableTarget ?? 100,
                opsTarget: data.opsTarget ?? 50,
                totalTarget: data.totalTarget ?? 150
              };
            });
          } catch (err) {
            console.log(`No targets found for ${attorney.id}`);
          }
        }
        
        setAttorneyTargets(targetsMap);
      } catch (err) {
        console.error('Error fetching targets:', err);
      } finally {
        setTargetsLoading(false);
      }
    };

    if (!attorneysLoading && firebaseAttorneys.length > 0) {
      fetchAllTargets();
    } else if (!attorneysLoading) {
      setTargetsLoading(false);
    }
  }, [firebaseAttorneys, attorneysLoading]);

  const loading = entriesLoading || attorneysLoading || clientsLoading || targetsLoading || ratesLoading;
  const error = entriesError || attorneysError || clientsError;

  // Create attorney name map
  const attorneyMap = useMemo(() => {
    const map = {};
    firebaseAttorneys.forEach(attorney => {
      map[attorney.id] = attorney.name || attorney.id;
    });
    return map;
  }, [firebaseAttorneys]);

  // Create attorney role map (from Firebase data or overrides)
  const attorneyRoleMap = useMemo(() => {
    const map = {};
    firebaseAttorneys.forEach(attorney => {
      const name = attorney.name || attorney.id;
      // Check for role override first, then Firebase role, then default to 'Attorney'
      map[name] = ROLE_OVERRIDES[name] || attorney.role || 'Attorney';
    });
    return map;
  }, [firebaseAttorneys]);

  // Helper function to get role for an attorney
  const getAttorneyRole = (name) => {
    return ROLE_OVERRIDES[name] || attorneyRoleMap[name] || 'Attorney';
  };

  // Calculate the date range boundaries
  const dateRangeInfo = useMemo(() => {
    const now = getPSTDate();
    let startDate;
    let endDate = new Date(now);

    switch (dateRange) {
      case 'all-time':
        if (allEntries && allEntries.length > 0) {
          const dates = allEntries.map(e => getEntryDate(e)).filter(d => d);
          if (dates.length > 0) {
            startDate = new Date(Math.min(...dates.map(d => d.getTime())));
          } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          }
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      case 'current-week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        break;
      case 'current-month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'trailing-60':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60, 0, 0, 0, 0);
        break;
      case 'custom':
        if (customDateStart && customDateEnd) {
          const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
          startDate = new Date(startYear, startMonth - 1, startDay);
          endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Current month key for comparison
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return { startDate, endDate, currentMonthKey, now };
  }, [dateRange, customDateStart, customDateEnd, allEntries]);

  // Get list of all attorney names for global filter dropdown
  // Filter out hidden attorneys from the UI display
  const allAttorneyNames = useMemo(() => {
    const names = new Set();
    firebaseAttorneys.forEach(attorney => {
      names.add(attorney.name || attorney.id);
    });
    if (allEntries) {
      allEntries.forEach(entry => {
        const name = attorneyMap[entry.attorneyId] || entry.attorneyId;
        if (name) names.add(name);
      });
    }
    
    // Filter out hidden attorneys from the dropdown
    // They're hidden from UI but their data is still included in calculations
    const allNames = Array.from(names).sort();
    return filterHiddenAttorneys(allNames);
  }, [firebaseAttorneys, allEntries, attorneyMap]);

  // Filter entries based on date range
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];

    let entries = allEntries;

    // Filter by date range
    if (dateRange !== 'all-time') {
      const { startDate: rangeStart, endDate: rangeEnd } = dateRangeInfo;

      if (rangeStart) {
        entries = entries.filter(entry => {
          const entryDate = getEntryDate(entry);
          return entryDate >= rangeStart && entryDate <= rangeEnd;
        });
      }
    }

    // Filter by selected attorneys (global filter)
    if (globalAttorneyFilter.length > 0) {
      entries = entries.filter(entry => {
        const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
        return globalAttorneyFilter.includes(attorneyName);
      });
    }

    return entries;
  }, [allEntries, dateRange, dateRangeInfo, globalAttorneyFilter, attorneyMap]);

  // Helper function to get default target for an attorney (uses current month target if available)
  const getDefaultTarget = (attorneyName) => {
    const { currentMonthKey } = dateRangeInfo;
    const attorneyTargetData = attorneyTargets[attorneyName] || {};
    const currentMonthTarget = attorneyTargetData[currentMonthKey];
    
    return {
      billableTarget: currentMonthTarget?.billableTarget ?? 100,
      opsTarget: currentMonthTarget?.opsTarget ?? 50,
      totalTarget: currentMonthTarget?.totalTarget ?? 150
    };
  };

  // Process attorney data with proper target calculations
  const attorneyData = useMemo(() => {
    const attorneyStats = {};
    const attorneyMonthlyActivity = {};
    
    const { startDate, endDate, currentMonthKey, now } = dateRangeInfo;
    
    // First pass: collect hours and track active months per attorney
    filteredEntries.forEach(entry => {
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      const entryDate = getEntryDate(entry);
      
      if (!attorneyMonthlyActivity[attorneyName]) {
        attorneyMonthlyActivity[attorneyName] = {
          months: new Set(),
          billable: 0,
          ops: 0,
          earnings: 0,
          transactions: {},
          clients: {}
        };
      }
      
      if (entryDate) {
        const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
        attorneyMonthlyActivity[attorneyName].months.add(monthKey);
      }
      
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const earnings = entry.billablesEarnings || 0;
      
      attorneyMonthlyActivity[attorneyName].billable += billableHours;
      attorneyMonthlyActivity[attorneyName].ops += opsHours;
      attorneyMonthlyActivity[attorneyName].earnings += earnings;
      
      const category = entry.billingCategory || entry.category || 'Other';
      const client = entry.client || 'Unknown';
      const isAdjustment = category.toLowerCase() === 'adjustment' || category.toLowerCase() === 'adjustments';
      
      // Track transactions for attorney page, but exclude adjustments
      if (billableHours > 0 && !isAdjustment) {
        if (!attorneyMonthlyActivity[attorneyName].transactions[category]) {
          attorneyMonthlyActivity[attorneyName].transactions[category] = 0;
        }
        attorneyMonthlyActivity[attorneyName].transactions[category] += billableHours;
      }
      
      if (!attorneyMonthlyActivity[attorneyName].clients[client]) {
        attorneyMonthlyActivity[attorneyName].clients[client] = 0;
      }
      attorneyMonthlyActivity[attorneyName].clients[client] += billableHours + opsHours;
    });

    // Second pass: calculate targets for each attorney based on their active months
    Object.entries(attorneyMonthlyActivity).forEach(([attorneyName, data]) => {
      let totalBillableTarget = 0;
      let totalOpsTarget = 0;
      let totalTarget = 0;
      
      const attorneyTargetData = attorneyTargets[attorneyName] || {};
      const defaultTarget = getDefaultTarget(attorneyName);
      const activeMonths = Array.from(data.months);
      
      // If no active months, use defaults for one month
      if (activeMonths.length === 0) {
        totalBillableTarget = defaultTarget.billableTarget;
        totalOpsTarget = defaultTarget.opsTarget;
        totalTarget = defaultTarget.totalTarget;
      } else {
        activeMonths.forEach(monthKey => {
          const [year, month] = monthKey.split('-').map(Number);
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
          
          // Get the target for this month (use stored target, or fall back to default)
          const monthTarget = attorneyTargetData[monthKey];
          const billableTarget = monthTarget?.billableTarget ?? defaultTarget.billableTarget;
          const opsTarget = monthTarget?.opsTarget ?? defaultTarget.opsTarget;
          const monthTotalTarget = monthTarget?.totalTarget ?? defaultTarget.totalTarget;
          
          // Determine if this month needs pro-rating (is partial)
          // A month is partial if:
          // 1. The date range starts after the 1st of the month, OR
          // 2. The date range ends before the last day of the month, OR  
          // 3. It's the current month and we're mid-month
          const rangeStartsAfterMonthStart = startDate && startDate > monthStart;
          const rangeEndsBeforeMonthEnd = endDate && endDate < monthEnd;
          const isCurrentMonthInProgress = monthKey === currentMonthKey;
          
          const needsProRating = rangeStartsAfterMonthStart || rangeEndsBeforeMonthEnd || isCurrentMonthInProgress;
          
          if (needsProRating) {
            // Calculate business days for pro-rating
            const effectiveStart = (startDate && startDate > monthStart) ? startDate : monthStart;
            let effectiveEnd;
            
            if (isCurrentMonthInProgress) {
              // For current month, use today as the end date
              effectiveEnd = now;
            } else if (endDate && endDate < monthEnd) {
              effectiveEnd = endDate;
            } else {
              effectiveEnd = monthEnd;
            }
            
            const businessDaysElapsed = countBusinessDays(effectiveStart, effectiveEnd);
            const totalBusinessDaysInMonth = getMonthBusinessDays(year, month).total;
            
            const fraction = totalBusinessDaysInMonth > 0 ? businessDaysElapsed / totalBusinessDaysInMonth : 1;
            
            totalBillableTarget += billableTarget * fraction;
            totalOpsTarget += opsTarget * fraction;
            totalTarget += monthTotalTarget * fraction;
          } else {
            // Complete historical month - use full stored target (or default)
            totalBillableTarget += billableTarget;
            totalOpsTarget += opsTarget;
            totalTarget += monthTotalTarget;
          }
        });
      }

      attorneyStats[attorneyName] = {
        name: attorneyName,
        billable: data.billable,
        ops: data.ops,
        earnings: data.earnings,
        target: Math.round(totalTarget * 10) / 10,
        billableTarget: Math.round(totalBillableTarget * 10) / 10,
        opsTarget: Math.round(totalOpsTarget * 10) / 10,
        role: getAttorneyRole(attorneyName),
        transactions: data.transactions,
        clients: data.clients,
        topTransactions: Object.entries(data.transactions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name)
      };
    });

    // Convert to array and filter out hidden attorneys from display
    // Hidden attorneys' data is still included in the totals calculated above
    const allAttorneyData = Object.values(attorneyStats);
    
    // Filter for display: only show attorneys that should be visible
    // But we return both for different use cases
    const visibleAttorneyData = allAttorneyData.filter(attorney => {
      // Check if this attorney should be included based on the date range
      // If the date range includes their active period, include their data
      // but they may still be hidden from the UI
      return shouldIncludeAttorneyData(attorney.name, startDate, endDate) && 
             !isAttorneyHidden(attorney.name);
    });

    return visibleAttorneyData;
  }, [filteredEntries, attorneyMap, dateRangeInfo, attorneyTargets, getAttorneyRole]);

  // Create a separate dataset that includes hidden attorneys for totals calculation
  const allAttorneyDataIncludingHidden = useMemo(() => {
    const attorneyStats = {};
    const attorneyMonthlyActivity = {};
    
    const { startDate, endDate, currentMonthKey, now } = dateRangeInfo;
    
    // First pass: collect hours and track active months per attorney
    filteredEntries.forEach(entry => {
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      const entryDate = getEntryDate(entry);
      
      if (!attorneyMonthlyActivity[attorneyName]) {
        attorneyMonthlyActivity[attorneyName] = {
          months: new Set(),
          billable: 0,
          ops: 0,
          earnings: 0,
          transactions: {},
          clients: {}
        };
      }
      
      if (entryDate) {
        const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
        attorneyMonthlyActivity[attorneyName].months.add(monthKey);
      }
      
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const earnings = entry.billablesEarnings || 0;
      
      attorneyMonthlyActivity[attorneyName].billable += billableHours;
      attorneyMonthlyActivity[attorneyName].ops += opsHours;
      attorneyMonthlyActivity[attorneyName].earnings += earnings;
    });

    // Second pass: build stats
    Object.entries(attorneyMonthlyActivity).forEach(([attorneyName, data]) => {
      const defaultTarget = getDefaultTarget(attorneyName);
      
      attorneyStats[attorneyName] = {
        name: attorneyName,
        billable: data.billable,
        ops: data.ops,
        earnings: data.earnings,
        target: defaultTarget.totalTarget,
        billableTarget: defaultTarget.billableTarget,
        opsTarget: defaultTarget.opsTarget,
      };
    });

    return Object.values(attorneyStats);
  }, [filteredEntries, attorneyMap, dateRangeInfo, attorneyTargets]);

  // Process transaction data
  const transactionData = useMemo(() => {
    const transactionStats = {};

    const entriesToProcess = transactionAttorneyFilter === 'all' 
      ? filteredEntries 
      : filteredEntries.filter(entry => {
          const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
          return attorneyName === transactionAttorneyFilter;
        });

    entriesToProcess.forEach(entry => {
      const category = entry.billingCategory || entry.category || 'Other';
      const billableHours = entry.billableHours || 0;
      const earnings = entry.billablesEarnings || 0;
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;

      if (billableHours > 0) {
        if (!transactionStats[category]) {
          transactionStats[category] = {
            type: category,
            totalHours: 0,
            totalEarnings: 0,
            count: 0,
            byAttorney: {},
            entries: []
          };
        }

        transactionStats[category].totalHours += billableHours;
        transactionStats[category].totalEarnings += earnings;
        transactionStats[category].count += 1;
        
        if (!transactionStats[category].byAttorney[attorneyName]) {
          transactionStats[category].byAttorney[attorneyName] = { count: 0, hours: 0, earnings: 0 };
        }
        transactionStats[category].byAttorney[attorneyName].count += 1;
        transactionStats[category].byAttorney[attorneyName].hours += billableHours;
        transactionStats[category].byAttorney[attorneyName].earnings += earnings;
        
        if (transactionStats[category].entries.length < 50) {
          transactionStats[category].entries.push({
            attorney: attorneyName,
            client: entry.client || 'Unknown',
            hours: billableHours,
            earnings: earnings,
            date: entry.billableDate || entry.date || '',
            notes: entry.notes || ''
          });
        }
      }
    });

    return Object.values(transactionStats).map(stat => ({
      ...stat,
      avgHours: stat.count > 0 ? (stat.totalHours / stat.count).toFixed(1) : 0,
      avgEarnings: stat.count > 0 ? (stat.totalEarnings / stat.count).toFixed(2) : 0,
      entries: stat.entries.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date) - new Date(a.date);
      })
    })).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries, transactionAttorneyFilter, attorneyMap]);

  // Process ops data
  const opsData = useMemo(() => {
    const opsStats = {};
    let totalOpsHours = 0;

    filteredEntries.forEach(entry => {
      const opsHours = entry.opsHours || 0;
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
      
      if (opsHours > 0) {
        const category = (entry.opsCategory && entry.opsCategory.trim() !== '') 
          ? entry.opsCategory 
          : 'Other';
        
        if (!opsStats[category]) {
          opsStats[category] = { hours: 0, byAttorney: {}, entries: [] };
        }
        opsStats[category].hours += opsHours;
        totalOpsHours += opsHours;
        
        if (!opsStats[category].byAttorney[attorneyName]) {
          opsStats[category].byAttorney[attorneyName] = { count: 0, hours: 0 };
        }
        opsStats[category].byAttorney[attorneyName].count += 1;
        opsStats[category].byAttorney[attorneyName].hours += opsHours;
        
        if (opsStats[category].entries.length < 50) {
          opsStats[category].entries.push({
            attorney: attorneyName,
            client: entry.client || 'N/A',
            hours: opsHours,
            date: entry.opsDate || entry.billableDate || entry.date || '',
            notes: entry.ops || entry.notes || ''
          });
        }
      }
    });

    return Object.entries(opsStats).map(([category, data]) => ({
      category,
      hours: Math.round(data.hours * 10) / 10,
      percentage: totalOpsHours > 0 ? Math.round((data.hours / totalOpsHours) * 100) : 0,
      byAttorney: data.byAttorney,
      entries: data.entries.sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const dateA = a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
        const dateB = b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
        return dateB - dateA;
      }),
      count: data.entries.length
    })).sort((a, b) => b.hours - a.hours);
  }, [filteredEntries, attorneyMap]);

  // Process client data - uses the same date filter as other tabs (no separate activity window)
  const clientData = useMemo(() => {
    const entryStats = {};
    
    filteredEntries.forEach(entry => {
      const clientName = entry.client || 'Unknown';
      const billableHours = entry.billableHours || 0;
      const opsHours = entry.opsHours || 0;
      const totalHours = billableHours + opsHours;
      const category = entry.billingCategory || entry.category || 'Other';
      const earnings = entry.billablesEarnings || 0;
      const entryDate = getEntryDate(entry);
      const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;

      if (!entryStats[clientName]) {
        entryStats[clientName] = {
          totalHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionCount: 0,
          lastActivity: entryDate,
          byAttorney: {},
          byCategory: {},
          entries: []
        };
      }

      entryStats[clientName].totalHours += totalHours;
      entryStats[clientName].totalEarnings += earnings;
      entryStats[clientName].uniqueTransactions.add(category);
      entryStats[clientName].transactionCount += 1;

      if (entryDate > entryStats[clientName].lastActivity) {
        entryStats[clientName].lastActivity = entryDate;
      }
      
      if (!entryStats[clientName].byAttorney[attorneyName]) {
        entryStats[clientName].byAttorney[attorneyName] = { count: 0, hours: 0, earnings: 0 };
      }
      entryStats[clientName].byAttorney[attorneyName].count += 1;
      entryStats[clientName].byAttorney[attorneyName].hours += totalHours;
      entryStats[clientName].byAttorney[attorneyName].earnings += earnings;
      
      if (!entryStats[clientName].byCategory[category]) {
        entryStats[clientName].byCategory[category] = { count: 0, hours: 0 };
      }
      entryStats[clientName].byCategory[category].count += 1;
      entryStats[clientName].byCategory[category].hours += totalHours;
      
      if (entryStats[clientName].entries.length < 50) {
        entryStats[clientName].entries.push({
          attorney: attorneyName,
          category: category,
          billableHours: billableHours,
          opsHours: opsHours,
          totalHours: totalHours,
          earnings: earnings,
          date: entry.billableDate || entry.opsDate || entry.date || '',
          notes: entry.notes || ''
        });
      }
    });

    const activeStatuses = ['Active', 'Quiet'];
    const inactiveStatuses = ['Terminated', 'Dissolved'];
    
    return firebaseClients
      .filter(client => {
        const status = client.status || '';
        return activeStatuses.includes(status) || (!inactiveStatuses.includes(status) && status !== '');
      })
      .map(client => {
        const clientName = client.clientName || client.id;
        const stats = entryStats[clientName] || {
          totalHours: 0,
          totalEarnings: 0,
          uniqueTransactions: new Set(),
          transactionCount: 0,
          lastActivity: null,
          byAttorney: {},
          byCategory: {},
          entries: []
        };

        const fbStatus = client.status || '';
        let displayStatus = 'active';
        if (fbStatus === 'Quiet') {
          displayStatus = 'quiet';
        } else if (inactiveStatuses.includes(fbStatus)) {
          displayStatus = 'inactive';
        }

        const sortedEntries = (stats.entries || []).sort((a, b) => {
          if (!a.date || !b.date) return 0;
          const dateA = a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
          const dateB = b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
          return dateB - dateA;
        });

        return {
          name: clientName,
          totalHours: Math.round(stats.totalHours * 10) / 10,
          totalEarnings: stats.totalEarnings,
          uniqueTransactions: stats.uniqueTransactions.size,
          avgHoursPerTransaction: stats.transactionCount > 0 
            ? (stats.totalHours / stats.transactionCount).toFixed(1) 
            : 0,
          lastActivity: stats.lastActivity 
            ? stats.lastActivity.toISOString().split('T')[0] 
            : 'No activity',
          status: displayStatus,
          fbStatus: fbStatus,
          location: client.location || '',
          clientType: client.clientType || '',
          channel: client.channel || '',
          contactEmail: client.contactEmail || '',
          website: client.website || '',
          byAttorney: stats.byAttorney || {},
          byCategory: stats.byCategory || {},
          entries: sortedEntries,
          entryCount: stats.transactionCount || 0
        };
      })
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredEntries, firebaseClients, attorneyMap]);

  // Count clients by status from Firebase
  const clientCounts = useMemo(() => {
    const activeStatuses = ['Active', 'Quiet'];
    const inactiveStatuses = ['Terminated', 'Dissolved'];
    
    const active = firebaseClients.filter(c => c.status === 'Active').length;
    const quiet = firebaseClients.filter(c => c.status === 'Quiet').length;
    const terminated = firebaseClients.filter(c => inactiveStatuses.includes(c.status)).length;
    const total = active + quiet;
    
    return { active, quiet, terminated, total };
  }, [firebaseClients]);

  // Calculate utilization (targets are already properly calculated in attorneyData)
  const calculateUtilization = (attorney) => {
    const total = attorney.billable + attorney.ops;
    if (attorney.target === 0) return 0;
    return Math.round((total / attorney.target) * 100);
  };

  // Calculate total gross billables (rate × hours) - includes all entries (hidden attorneys too)
  const totalGrossBillables = useMemo(() => {
    let total = 0;
    filteredEntries.forEach(entry => {
      const billableHours = entry.billableHours || 0;
      if (billableHours > 0) {
        const entryDate = getEntryDate(entry);
        const attorneyName = attorneyMap[entry.attorneyId] || entry.attorneyId;
        const rate = getRate(attorneyName, entryDate);
        total += rate * billableHours;
      }
    });
    return total;
  }, [filteredEntries, attorneyMap, getRate]);

  // Calculate totals - use allAttorneyDataIncludingHidden for accurate totals
  // but use visible attorneyData count for "number of attorneys" display
  const totals = useMemo(() => {
    // For hours and earnings totals, include all attorneys (even hidden ones)
    const totalBillable = allAttorneyDataIncludingHidden.reduce((acc, att) => acc + att.billable, 0);
    const totalOps = allAttorneyDataIncludingHidden.reduce((acc, att) => acc + att.ops, 0);
    const totalEarnings = allAttorneyDataIncludingHidden.reduce((acc, att) => acc + att.earnings, 0);
    
    // For targets and utilization, only use visible attorneys
    const totalBillableTarget = attorneyData.reduce((acc, att) => acc + att.billableTarget, 0);
    const totalOpsTarget = attorneyData.reduce((acc, att) => acc + att.opsTarget, 0);
    
    const avgUtilization = attorneyData.length > 0
      ? Math.round(attorneyData.reduce((acc, att) => acc + calculateUtilization(att), 0) / attorneyData.length)
      : 0;

    return {
      totalBillable,
      totalOps,
      totalEarnings,
      totalBillableTarget,
      totalOpsTarget,
      avgUtilization,
    };
  }, [attorneyData, allAttorneyDataIncludingHidden]);

  return {
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
    dateRangeInfo,
    totalGrossBillables,
    ...totals,
  };
};

export default useAnalyticsData;