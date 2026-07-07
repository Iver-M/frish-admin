// Dummy data for the logged-in admin profile.

export const adminProfile = {
  name: 'Admin User',
  email: 'admin@frish.gov.ph',
  role: 'System Administrator',
  department: 'Fish Freshness Inspection Division',
  avatarInitials: 'AU',
  joined: 'January 2025',
}

export function getAdminProfile() {
  return adminProfile
}
