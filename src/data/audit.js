// Dummy data for the Audit Trail page.

export const auditLogs = [
  { id: 'AUD-1001', timestamp: '2026-07-08 09:14 AM', admin: 'Admin User', action: 'Approved assessment DLGREG-344', module: 'Assessments', ip: '192.168.1.14' },
  { id: 'AUD-1002', timestamp: '2026-07-08 08:52 AM', admin: 'Admin User', action: 'Assigned report REP-2026-092 to Maria Santos', module: 'Reports', ip: '192.168.1.14' },
  { id: 'AUD-1003', timestamp: '2026-07-08 08:20 AM', admin: 'Admin User', action: 'Updated inspector profile EMP-1004', module: 'Inspectors', ip: '192.168.1.14' },
  { id: 'AUD-1004', timestamp: '2026-07-07 05:41 PM', admin: 'Admin User', action: 'Suspended vendor V-004', module: 'Vendors', ip: '10.10.4.2' },
  { id: 'AUD-1005', timestamp: '2026-07-07 03:12 PM', admin: 'Admin User', action: 'Replied to feedback #FB-220', module: 'User Feedback', ip: '10.10.4.2' },
  { id: 'AUD-1006', timestamp: '2026-07-07 11:02 AM', admin: 'Admin User', action: 'Resolved report REP-2026-093', module: 'Reports', ip: '10.10.4.2' },
  { id: 'AUD-1007', timestamp: '2026-07-06 04:30 PM', admin: 'Admin User', action: 'Changed account password', module: 'Profile', ip: '192.168.1.9' },
]

export function getAuditLogs() {
  return auditLogs
}
