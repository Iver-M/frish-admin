// Dummy data for the Vendor Management page.
// marketId scopes each vendor to a market — Market Admins only see vendors
// whose marketId matches their assigned market (see AuthContext).
// ownerName/email identify the person; stallName is their business name.

export const vendors = [
  { id: 'VEN-001', ownerName: 'Juan Dela Cruz', email: 'jdelacruz@gmail.com', stallName: "Juan's Isdaan", market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'A-11', compliance: 'Compliant', violations: 0, status: 'active' },
  { id: 'VEN-002', ownerName: 'Antonio Cruz', email: 'acruz@gmail.com', stallName: "Antonio's Isdaan", market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'A-12', compliance: 'Under review', violations: 1, status: 'active' },
  { id: 'VEN-003', ownerName: 'Pedro Garcia', email: 'pgarcia@gmail.com', stallName: "Pedro's Isdaan", market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'A-14', compliance: 'Compliant', violations: 0, status: 'active' },
  { id: 'VEN-004', ownerName: 'Fresh Catch Trading Co.', email: 'freshcatch@gmail.com', stallName: 'Fresh Catch Trading', market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'B-21', compliance: 'Under review', violations: 2, status: 'active' },
  { id: 'VEN-005', ownerName: 'Rowena Dela Cruz', email: 'rowena.dc@gmail.com', stallName: 'Dela Cruz Fishmongers', market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'B-03', compliance: 'Non-compliant', violations: 3, status: 'suspended' },
  { id: 'VEN-006', ownerName: 'Pasig Bounty Co.', email: 'pasigbounty@gmail.com', stallName: 'Pasig Bounty Seafoods', market: 'Pasig Public Market', marketId: 'pasig', stallNo: 'C-55', compliance: 'Compliant', violations: 0, status: 'active' },
]

export function getVendors() {
  return vendors
}
