// Role mapping for team members who aren't attorneys
// This allows displaying correct titles throughout the application
export const ROLE_OVERRIDES = {
  'Valery Uscanga': 'Legal Operations Associate',
};

// Helper function to get the role for a person
export const getPersonRole = (name, defaultRole = 'Attorney') => {
  return ROLE_OVERRIDES[name] || defaultRole;
};

// Check if someone is an attorney (for UI that might need to differentiate)
export const isAttorney = (name) => {
  return !ROLE_OVERRIDES[name];
};