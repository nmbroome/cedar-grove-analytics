const STATUS_BADGE = {
  'paid':               'bg-status-success-light text-status-success-text',
  'payment initiated':  'bg-status-warning-light text-status-warning-text',
  'sent':               'bg-status-success-light text-status-success-text',
  'pending':            'bg-status-warning-light text-status-warning-text',
  'quiet':              'bg-status-warning-light text-status-warning-text',
  'failed':             'bg-status-danger-light text-status-danger-text',
  'active':             'bg-status-success-light text-status-success-text',
  'inactive':           'bg-status-danger-light text-status-danger-text',
};
const DEFAULT_BADGE = 'bg-gray-100 text-gray-700';

export function getStatusBadge(status) {
  return STATUS_BADGE[(status || '').toLowerCase()] || DEFAULT_BADGE;
}

const MATCH_TYPE_BADGE = {
  'alias':  'bg-meta-light text-meta-text',
  'name':   'bg-primary-light text-primary-text',
};
const DEFAULT_MATCH_BADGE = 'bg-secondary-light text-secondary-text';

export function getMatchTypeBadge(type) {
  return MATCH_TYPE_BADGE[(type || '').toLowerCase()] || DEFAULT_MATCH_BADGE;
}

export function getUtilizationColor(util) {
  if (util > 90 && util < 110) return 'text-status-success';
  if ((util >= 85 && util <= 90) || (util >= 110 && util <= 115)) return 'text-status-warning';
  return 'text-status-danger';
}

export function getUtilizationBgColor(util) {
  if (util > 90 && util < 110) return 'bg-status-success-light text-status-success-text';
  if ((util >= 85 && util <= 90) || (util >= 110 && util <= 115)) return 'bg-status-warning-light text-status-warning-text';
  return 'bg-status-danger-light text-status-danger-text';
}

export function getProgressBarColor(util) {
  if (util > 90 && util < 110) return 'bg-status-success';
  if ((util >= 85 && util <= 90) || (util >= 110 && util <= 115)) return 'bg-status-warning';
  return 'bg-status-danger';
}
