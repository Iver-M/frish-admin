// Dummy data for the Reports page.

export const reports = [
  { id: 'REP-2026-089', reporter: 'Consumer User', reporterType: 'Consumer', location: 'Pasig Public Market', issue: 'Suspected spoiled tilapia sold as fresh', assignedInspector: 'Juan Dela Cruz', status: 'investigating', date: '2026-07-08' },
  { id: 'REP-2026-090', reporter: 'Carlo Ventura', reporterType: 'Consumer', location: 'Pasig Public Market', issue: 'Strong odor from sardines stall', assignedInspector: 'Unassigned', status: 'pending', date: '2026-07-08' },
  { id: 'REP-2026-091', reporter: 'Juan Dela Cruz', reporterType: 'Inspector', location: 'Pasig Public Market', issue: 'Routine spot-check flagged discoloration', assignedInspector: 'Juan Dela Cruz', status: 'validated', date: '2026-07-08' },
  { id: 'REP-2026-092', reporter: 'Ana Lopez', reporterType: 'Consumer', location: 'Quiapo Market', issue: 'Vendor mislabeling fish species', assignedInspector: 'Maria Santos', status: 'assigned', date: '2026-07-07' },
  { id: 'REP-2026-093', reporter: 'Mark Aquino', reporterType: 'Consumer', location: 'Divisoria Market', issue: 'Improper cold storage observed', assignedInspector: 'Ramon Reyes', status: 'resolved', date: '2026-07-06' },
  { id: 'REP-2026-094', reporter: 'Maria Santos', reporterType: 'Inspector', location: 'Quiapo Market', issue: 'Stall exceeded shelf-life limit for galunggong', assignedInspector: 'Maria Santos', status: 'resolved', date: '2026-07-05' },
  { id: 'REP-2026-095', reporter: 'Liza Fernandez', reporterType: 'Consumer', location: 'Divisoria Market', issue: 'Fish stored without ice', assignedInspector: 'Unassigned', status: 'pending', date: '2026-07-05' },
]

export function getReports() {
  return reports
}
