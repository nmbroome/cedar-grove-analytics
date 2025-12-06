// Helper function to convert month name to number
export const getMonthNumber = (monthName) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months.findIndex(m => m.toLowerCase() === monthName?.toLowerCase()) + 1 || 1;
};

// Helper to get current date/time in PST
export const getPSTDate = () => {
  const now = new Date();
  const pstString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return new Date(pstString);
};

// Helper function to get date from entry (handles billableDate, opsDate, or year/month)
export const getEntryDate = (entry) => {
  let date;
  
  if (entry.billableDate?.toDate) {
    date = entry.billableDate.toDate();
  } else if (entry.billableDate) {
    date = new Date(entry.billableDate);
  } else if (entry.opsDate?.toDate) {
    date = entry.opsDate.toDate();
  } else if (entry.opsDate) {
    date = new Date(entry.opsDate);
  } else if (entry.date?.toDate) {
    date = entry.date.toDate();
  } else if (entry.date) {
    date = new Date(entry.date);
  } else {
    date = new Date(entry.year, getMonthNumber(entry.month) - 1);
  }
  
  return date;
};

// Get date range label for display
export const getDateRangeLabel = (dateRange, customDateStart, customDateEnd) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const formatDateRange = (start, end) => {
    const startStr = `${monthNames[start.getMonth()]} ${start.getDate()}`;
    const endStr = `${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    return `${startStr} - ${endStr}`;
  };

  if (dateRange === 'all-time') {
    return 'All Time';
  }

  const now = getPSTDate();
  let startDate;
  let endDate = new Date(now);

  switch (dateRange) {
    case 'current-week':
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      return `Current Week (${formatDateRange(startDate, endDate)})`;
    case 'current-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return `Current Month (${formatDateRange(startDate, endDate)})`;
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return `Last Month (${formatDateRange(startDate, endDate)})`;
    case 'trailing-60':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60);
      return `Trailing 60 Days (${formatDateRange(startDate, endDate)})`;
    case 'custom':
      if (customDateStart && customDateEnd) {
        const [startYear, startMonth, startDay] = customDateStart.split('-').map(Number);
        const [endYear, endMonth, endDay] = customDateEnd.split('-').map(Number);
        const start = `${monthNames[startMonth - 1]} ${startDay}`;
        const end = `${monthNames[endMonth - 1]} ${endDay}, ${endYear}`;
        return `${start} - ${end}`;
      }
      return 'Custom Range';
    default:
      return 'All Time';
  }
};

// Calculate date range boundaries
export const calculateDateRange = (dateRange, customDateStart, customDateEnd, allEntries = []) => {
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
        startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { startDate, endDate };
};

// Calculate client activity date range
export const calculateClientActivityDateRange = (period, customStart, customEnd) => {
  const now = getPSTDate();
  let startDate = null;
  let endDate = now;
  
  switch (period) {
    case '2-weeks':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 14);
      break;
    case '1-month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '2-months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 2);
      break;
    case '3-months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6-months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '9-months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 9);
      break;
    case '12-months':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case '18-months':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 18);
      break;
    case '24-months':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 2);
      break;
    case 'custom':
      if (customStart) {
        startDate = new Date(customStart + 'T00:00:00');
      }
      if (customEnd) {
        endDate = new Date(customEnd + 'T23:59:59');
      }
      break;
    case 'all-time':
    default:
      startDate = null;
      break;
  }
  
  return { startDate, endDate };
};
