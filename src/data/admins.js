// Dummy data for the "Manage Admins" page (BFAR Admin only).
// role: 'bfar_admin' | 'market_admin'. marketId is null for BFAR Admins
// (system-wide) and required for Market Admins.

export const admins = [
  { id: 'ADM-001', name: 'Admin User', email: 'admin@frish.gov.ph', role: 'bfar_admin', marketId: null, status: 'active', dateAdded: '2025-01-10' },
  { id: 'ADM-002', name: 'Rosario Bautista', email: 'rosario.bautista@frish.gov.ph', role: 'market_admin', marketId: 'pasig', status: 'active', dateAdded: '2025-03-22' },
  { id: 'ADM-003', name: 'Ferdinand Cruz', email: 'ferdinand.cruz@frish.gov.ph', role: 'market_admin', marketId: 'pasig', status: 'active', dateAdded: '2025-05-14' },
  { id: 'ADM-004', name: 'Teresita Ramos', email: 'teresita.ramos@frish.gov.ph', role: 'market_admin', marketId: 'pasig', status: 'suspended', dateAdded: '2025-06-02' },
]

export function getAdmins() {
  return admins
}
