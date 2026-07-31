// Dummy data for the Audit Trail page (BFAR Admin only).
// category maps to a colored badge in the UI, similar to how Reports/
// Vendors etc. group their own modules. details is a short elaboration
// shown alongside the action.

export const auditLogs = [
  { id: 'AUD-1001', timestamp: '2026-07-08 09:14 AM', admin: 'Admin User', action: 'Updated Vendor Information', details: 'Updated contact details for VEN-004', category: 'Vendor Management', ip: '192.168.1.14', marketId: 'pasig' },
  { id: 'AUD-1002', timestamp: '2026-07-08 08:52 AM', admin: 'Admin User', action: 'Viewed Assessment Record', details: 'Accessed detailed view for DLGREG-344', category: 'Assessment Records', ip: '192.168.1.14', marketId: 'pasig' },
  { id: 'AUD-1003', timestamp: '2026-07-08 08:20 AM', admin: 'Admin User', action: 'Login', details: 'Successful login to admin portal', category: 'Authentication', ip: '192.168.1.14', marketId: null },
  { id: 'AUD-1004', timestamp: '2026-07-07 05:41 PM', admin: 'Admin User', action: 'Assigned Report', details: 'Assigned report REP-2026-092 to Maria Santos', category: 'Report Management', ip: '10.10.4.2', marketId: 'pasig' },
  { id: 'AUD-1005', timestamp: '2026-07-07 03:12 PM', admin: 'Admin User', action: 'Updated Inspector Profile', details: 'Updated status for inspector EMP-1004', category: 'Inspector Management', ip: '10.10.4.2', marketId: null },
  { id: 'AUD-1006', timestamp: '2026-07-07 11:02 AM', admin: 'Admin User', action: 'Replied to Feedback', details: 'Replied to feedback FB-2026-001', category: 'User Feedback', ip: '10.10.4.2', marketId: null },
  { id: 'AUD-1007', timestamp: '2026-07-06 04:30 PM', admin: 'Admin User', action: 'Changed Password', details: 'Account password changed successfully', category: 'Account Settings', ip: '192.168.1.9', marketId: null },
  { id: 'AUD-1008', timestamp: '2026-07-06 02:10 PM', admin: 'Admin User', action: 'Created Admin Account', details: 'Created Market Admin account for Teresita Ramos', category: 'Admin Management', ip: '192.168.1.9', marketId: null },
]

export function getAuditLogs() {
  return auditLogs
}
