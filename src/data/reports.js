// Dummy data for the Reports (Report Management) page.
// marketId scopes each report to a market for Market Admin filtering.
// status: 'pending-review' | 'under-investigation' | 'validated' | 'forwarded-lgu'

export const reports = [
  { id: 'REP-2026-089', reporter: 'Consumer User', reporterType: 'Consumer', location: 'Pasig Public Market', marketId: 'pasig', vendorName: "Juan's Isdaan", validationResult: 'Validation in progress', issue: 'Suspected spoiled Galunggong sold as fresh', assignedInspector: 'Juan Dela Cruz', status: 'under-investigation', date: '2026-07-08', time: '6:00 AM' },
  { id: 'REP-2026-090', reporter: 'Carlo Ventura', reporterType: 'Consumer', location: 'Pasig Public Market', marketId: 'pasig', vendorName: 'Vendor not identified', validationResult: 'Completeness review required', issue: 'Strong odor from Galunggong stall', assignedInspector: 'Unassigned', status: 'pending-review', date: '2026-07-08', time: '6:00 AM' },
  { id: 'REP-2026-091', reporter: 'Juan Dela Cruz', reporterType: 'Inspector', location: 'Pasig Public Market', marketId: 'pasig', vendorName: "Antonio's Isdaan", validationResult: 'Confirmed: display conditions corrected', issue: 'Routine spot-check flagged discoloration', assignedInspector: 'Juan Dela Cruz', status: 'validated', date: '2026-07-08', time: '5:19 AM' },
  { id: 'REP-2026-092', reporter: 'Ana Lopez', reporterType: 'Consumer', location: 'Pasig Public Market', marketId: 'pasig', vendorName: 'Fresh Catch Trading', validationResult: 'Confirmed: vendor advised', issue: 'Vendor mislabeling fish species', assignedInspector: 'Maria Santos', status: 'validated', date: '2026-07-07', time: '2:10 PM' },
  { id: 'REP-2026-093', reporter: 'Mark Aquino', reporterType: 'Consumer', location: 'Pasig Public Market', marketId: 'pasig', vendorName: 'Pasig Bounty Seafoods', validationResult: 'Confirmed: enforcement endorsed', issue: 'Improper cold storage observed', assignedInspector: 'Ramon Reyes', status: 'forwarded-lgu', date: '2026-07-06', time: '11:45 AM' },
  { id: 'REP-2026-094', reporter: 'Maria Santos', reporterType: 'Inspector', location: 'Pasig Public Market', marketId: 'pasig', vendorName: 'Fresh Catch Trading', validationResult: 'Confirmed: product removed from display', issue: 'Stall exceeded shelf-life limit for Galunggong', assignedInspector: 'Maria Santos', status: 'forwarded-lgu', date: '2026-07-05', time: '9:32 AM' },
  { id: 'REP-2026-095', reporter: 'Liza Fernandez', reporterType: 'Consumer', location: 'Pasig Public Market', marketId: 'pasig', vendorName: 'Vendor not identified', validationResult: 'Completeness review required', issue: 'Fish stored without ice', assignedInspector: 'Unassigned', status: 'pending-review', date: '2026-07-05', time: '8:05 AM' },
]

export function getReports() {
  return reports
}
