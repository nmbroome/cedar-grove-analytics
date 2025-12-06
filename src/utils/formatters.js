// Format currency - omit .00 decimals
export const formatCurrency = (amount) => {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded === Math.floor(rounded)) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format hours - round to .1, omit .0 decimals
export const formatHours = (hours) => {
  const rounded = Math.round(hours * 10) / 10;
  if (rounded === Math.floor(rounded)) {
    return Math.floor(rounded).toString();
  }
  return rounded.toFixed(1);
};

// Format date from various formats (Firestore Timestamp, string, Date)
export const formatDate = (date) => {
  if (!date) return 'No date';
  // Handle Firestore Timestamp
  if (date && typeof date === 'object' && date.seconds) {
    return new Date(date.seconds * 1000).toLocaleDateString();
  }
  // Handle string dates
  if (typeof date === 'string') {
    return date;
  }
  // Handle Date objects
  if (date instanceof Date) {
    return date.toLocaleDateString();
  }
  return 'No date';
};
