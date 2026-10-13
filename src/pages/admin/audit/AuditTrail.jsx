import { useEffect, useMemo, useState } from 'react'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatCard from '../../../components/StatCard.jsx'
import { getAuditLogs } from '../../../data/audit.js'
import { getAdmins } from '../../../data/admins.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { subscribeAdminProfiles, subscribeInspectorProfiles, subscribeMarketRecords } from '../../../services/firestoreService.js'
import { getReportCode } from '../../../utils/reportCode.js'
import { normalizeFeedbackRecord } from '../../../utils/feedbackRecord.js'
import { normalizeReportRecord } from '../../../utils/reportRecord.js'
import { formatConfidence, normalizeScanRecord } from '../../../utils/scanRecord.js'
import './AuditTrail.css'

const CATEGORY_TONES = ['danger', 'info', 'success', 'warning', 'neutral']

export default function AuditTrail() {
  const { user, isFirebaseEnabled } = useAuth()
  const [storedLogs, setStoredLogs] = useState([])
  const [reports, setReports] = useState([])
  const [scans, setScans] = useState([])
  const [feedback, setFeedback] = useState([])
  const [adminProfiles, setAdminProfiles] = useState([])
  const [inspectorProfiles, setInspectorProfiles] = useState([])
  const [authorityEvents, setAuthorityEvents] = useState([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    const unsubscribeLogs = subscribeMarketRecords('auditLogs', user, setStoredLogs, (firebaseError) => setError(firebaseError.message || 'Unable to load audit entries.'))
    const unsubscribeReports = subscribeMarketRecords('reports', user, setReports, (firebaseError) => setError(firebaseError.message || 'Unable to load report events.'))
    const unsubscribeScans = subscribeMarketRecords('scans', user, setScans, (firebaseError) => setError(firebaseError.message || 'Unable to load assessment events.'))
    const unsubscribeFeedback = subscribeMarketRecords('feedback', user, setFeedback, (firebaseError) => setError(firebaseError.message || 'Unable to load feedback events.'))
    const unsubscribeAdmins = subscribeAdminProfiles(setAdminProfiles, (firebaseError) => setError(firebaseError.message || 'Unable to load administrator profiles.'))
    const unsubscribeInspectors = subscribeInspectorProfiles(setInspectorProfiles, (firebaseError) => setError(firebaseError.message || 'Unable to load inspector profiles.'))
    const unsubscribeAuthority = subscribeMarketRecords('authorityCaseAudit', user, setAuthorityEvents, () => setAuthorityEvents([]))
    return () => { unsubscribeLogs(); unsubscribeReports(); unsubscribeScans(); unsubscribeFeedback(); unsubscribeAdmins(); unsubscribeInspectors(); unsubscribeAuthority() }
  }, [isFirebaseEnabled, user])

  const logs = useMemo(() => {
    if (!isFirebaseEnabled) return getAuditLogs()
    const reportEvents = reports.map(normalizeReportRecord).map((report) => ({
      id: `report-${report.id}`,
      timestamp: report.createdAt,
      admin: report.createdBy?.name || 'Inspector',
      action: 'Submitted report',
      details: `${getReportCode(report)} — ${report.title || 'Inspection report'}${report.vendorName ? ` — ${report.vendorName}` : ''}`,
      category: 'Report Management',
    }))
    const auditEvents = storedLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      admin: log.actorName || 'BFAR-NCR Admin',
      action: log.action || 'Updated record',
      details: log.details || '',
      category: log.category || 'System',
    }))
    const scanEvents = scans.map(normalizeScanRecord).map((scan) => ({
      id: `scan-${scan.id}`,
      timestamp: scan.createdAt,
      admin: scan.inspector,
      action: 'Recorded freshness assessment',
      details: `${scan.assessmentCode} — ${scan.species} — ${scan.prediction} — ${formatConfidence(scan.confidence)}`,
      category: 'Freshness Assessment',
    }))
    const feedbackEvents = feedback.map(normalizeFeedbackRecord).map((item) => ({
      id: `feedback-${item.id}`,
      timestamp: item.createdAt,
      admin: item.user,
      action: 'Submitted mobile feedback',
      details: `${item.feedbackCode} — ${item.rating || 0}/5 — ${item.comment}`,
      category: 'User Feedback',
    }))
    const consumerCaseEvents = authorityEvents.map((event) => ({
      id: `authority-${event.id}`,
      timestamp: event.createdAt,
      admin: authorityActorLabel(event.actorRole),
      action: authorityActionLabel(event.transition),
      details: `${event.caseId || 'Consumer authority case'} — ${statusLabel(event.previousStatus)} to ${statusLabel(event.nextStatus)}`,
      category: 'Consumer Authority Case',
    }))
    return [...reportEvents, ...scanEvents, ...feedbackEvents, ...consumerCaseEvents, ...auditEvents].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp))
  }, [authorityEvents, feedback, isFirebaseEnabled, reports, scans, storedLogs])

  const liveUsers = useMemo(() => [...adminProfiles, ...inspectorProfiles], [adminProfiles, inspectorProfiles])
  const categories = useMemo(() => Array.from(new Set(logs.map((log) => log.category))).sort(), [logs])
  const categoryTone = useMemo(() => Object.fromEntries(categories.map((category, index) => [category, CATEGORY_TONES[index % CATEGORY_TONES.length]])), [categories])
  const filtered = useMemo(() => logs.filter((log) => {
    const value = `${log.admin} ${log.action} ${log.details}`.toLowerCase()
    return value.includes(query.toLowerCase()) && (categoryFilter === 'all' || log.category === categoryFilter)
  }), [logs, query, categoryFilter])

  const today = new Date().toDateString()
  const stats = [
    { id: 'total', label: 'Total Activities', value: String(logs.length), icon: 'activity', trend: 'flat' },
    { id: 'today', label: "Today's Activity", value: String(logs.filter((log) => toDate(log.timestamp)?.toDateString() === today).length), icon: 'pending', trend: 'flat' },
    { id: 'active-users', label: 'Active Users', value: String(isFirebaseEnabled ? liveUsers.filter(isActiveProfile).length : getAdmins().filter((admin) => admin.status === 'active').length), icon: 'active', trend: 'flat' },
    { id: 'categories', label: 'Action Categories', value: String(categories.length), icon: 'categories', trend: 'flat' },
  ]

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (row) => formatTimestamp(row.timestamp) },
    { key: 'admin', header: 'User' },
    { key: 'action', header: 'Action' },
    { key: 'details', header: 'Details' },
    { key: 'category', header: 'Categories', render: (row) => <span className={`status-badge status-badge--${categoryTone[row.category]}`}>{row.category}</span> },
  ]

  return <div className="page audit-page">
    <div className="page-header-row"><div><p className="workspace-kicker">SYSTEM ACTIVITY</p><h2>Audit Trail</h2><p className="page-header-row__subtitle">{isFirebaseEnabled ? 'Live assessments, reports, feedback, and administrator actions across FRISH.' : 'Monitor system activities and user actions.'}</p></div>{isFirebaseEnabled && <span className="audit-live-indicator"><span /> Live activity</span>}</div>
    <div className="stat-grid">{stats.map((stat) => <StatCard key={stat.id} {...stat} />)}</div>
    <div className="toolbar"><SearchBar value={query} onChange={setQuery} placeholder="Search by user, action, or details..." /><select className="select-input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All Categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
    {error && <p className="audit-error" role="alert">{error}</p>}
    <TableCard title={`Activity Logs (${filtered.length})`} subtitle="Inspector submissions and administrator management activity" columns={columns} rows={filtered} emptyMessage="No activity matches your search." />
  </div>
}

function timestampValue(value) { return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0) }
function toDate(value) { const timestamp = timestampValue(value); return timestamp ? new Date(timestamp) : null }
function formatTimestamp(value) { const date = toDate(value); return date ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Just now' }
function isActiveProfile(profile) { return String(profile.accountStatus || profile.status || 'active').toLowerCase() === 'active' }
function statusLabel(value) { return String(value || 'unknown').replace(/_/g, ' ') }
function authorityActorLabel(role) { return role === 'inspector' ? 'Assigned Inspector' : role === 'lgu' ? 'Pasig LGU Admin' : 'BFAR-NCR Admin' }
function authorityActionLabel(transition) {
  return ({ assign_inspector: 'Assigned Consumer case', start_investigation: 'Started Consumer case validation', forward_to_lgu: 'Forwarded Consumer case to LGU', close_no_violation: 'Closed Consumer case without violation', resolve: 'Resolved Consumer case' })[transition] || 'Updated Consumer authority case'
}
