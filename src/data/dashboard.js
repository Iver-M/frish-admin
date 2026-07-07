// Dummy dashboard summary data.
// Replace `getDashboardStats`, `getRecentAssessments`, `getRecentReports`
// with real API/Firestore calls later — the shape returned should stay the same.

export const dashboardStats = [
  {
    id: 'total-inspectors',
    label: 'Total Inspectors',
    value: '18',
    sublabel: '+2 this month',
    icon: 'inspectors',
    trend: 'up',
  },
  {
    id: 'assessment-records',
    label: 'Assessment Records',
    value: '1,847',
    sublabel: '+134 today',
    icon: 'assessments',
    trend: 'up',
  },
  {
    id: 'pending-reports',
    label: 'Pending Reports',
    value: '12',
    sublabel: '4 new today',
    icon: 'reports',
    trend: 'flat',
  },
  {
    id: 'pass-rate',
    label: 'Fresh Fish Pass Rate',
    value: '92%',
    sublabel: '+3% vs last week',
    icon: 'pass-rate',
    trend: 'up',
  },
]

export const recentAssessments = [
  {
    id: 'DLGREG-344',
    species: 'Bangus (Milkfish)',
    freshness: 'Fresh',
    confidence: '96%',
    inspector: 'Juan Dela Cruz',
    date: 'Today · 8:14 AM',
    status: 'fresh',
  },
  {
    id: 'DLGREG-398',
    species: 'Galunggong',
    freshness: 'Fresh',
    confidence: '93%',
    inspector: 'Juan Dela Cruz',
    date: 'Today · 7:52 AM',
    status: 'fresh',
  },
  {
    id: 'DLG-447',
    species: 'Tilapia',
    freshness: 'Not Fresh / Aging',
    confidence: '89%',
    inspector: 'Juan Dela Cruz',
    date: 'Today · 7:40 AM',
    status: 'not-fresh',
  },
  {
    id: 'DLG-451',
    species: 'Tamban (Sardines)',
    freshness: 'Moderately Fresh',
    confidence: '81%',
    inspector: 'Maria Santos',
    date: 'Today · 7:22 AM',
    status: 'moderate',
  },
]

export const recentReports = [
  {
    id: 'REP-2026-089',
    reporterType: 'Consumer',
    market: 'Pasig Public Market',
    issue: 'Under Investigation',
    status: 'investigating',
    submittedBy: 'Consumer User',
    date: 'Today · 9am',
  },
  {
    id: 'REP-2026-090',
    reporterType: 'Consumer',
    market: 'Pasig Public Market',
    issue: 'Pending Review',
    status: 'pending',
    submittedBy: 'Consumer User',
    date: 'Today · 9am',
  },
  {
    id: 'REP-2026-091',
    reporterType: 'Inspector',
    market: 'Pasig Public Market',
    issue: 'Validated',
    status: 'validated',
    submittedBy: 'Juan Dela Cruz',
    date: 'Today · 9am',
  },
]

export function getDashboardStats() {
  return dashboardStats
}

export function getRecentAssessments() {
  return recentAssessments
}

export function getRecentReports() {
  return recentReports
}
