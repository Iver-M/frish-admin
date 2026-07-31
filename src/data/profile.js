// Dummy fallback details for the logged-in admin's profile page.
// Name/role/market itself come from AuthContext (the real logged-in
// session) — this only supplies the extra display fields a real user
// record would have (phone, department, account metadata).

export const adminProfile = {
  email: 'admin@frish.gov.ph',
  phone: '+63 993 431 0023',
  department: 'Bureau of Fisheries and Aquatic Resources (BFAR)',
  accountCreated: 'June 15, 2026',
  lastLogin: 'June 16, 2026 - 8:30 AM',
}

export function getAdminProfile() {
  return adminProfile
}
