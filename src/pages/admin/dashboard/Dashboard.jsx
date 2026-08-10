import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInbox,
  FiUsers,
} from 'react-icons/fi'
import LoadingSkeleton from '../../../components/LoadingSkeleton.jsx'
import StatCard from '../../../components/StatCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getDashboardStats, getRecentAssessments, getRecentReports } from '../../../data/dashboard.js'
import { getReports } from '../../../data/reports.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { subscribeInspectorProfiles, subscribeMarketRecords } from '../../../services/firestoreService.js'
import { getReportCode } from '../../../utils/reportCode.js'
import { getAssessmentCode } from '../../../utils/scanRecord.js'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import sampleMackerel from '../../../assets/images/samples/sample-mackerel.jpg'
import sampleGalunggong from '../../../assets/images/samples/sample-galunggong.jpg'
import './Dashboard.css'

const DEMO_ACTIVITY = [
  { id: 'demo-assessment', title: 'Added new assessment', detail: 'DLG-2026-081', time: '6:00 AM', kind: 'scan' },
  { id: 'demo-report', title: 'Report flagged for investigation', detail: 'RPT-2069', time: '6:15 AM', kind: 'report' },
  { id: 'demo-pass', title: 'Freshness assessment passed', detail: 'DLG-2026-290 · 92% confidence', time: '6:15 AM', kind: 'scan' },
  { id: 'demo-fail', title: 'Freshness concern detected', detail: 'GG-447 · 40% confidence', time: '7:00 AM', kind: 'alert' },
]

const LGU_VISIBLE_STATUSES = new Set(['forwarded-lgu', 'under-lgu-action', 'resolved'])

export default function Dashboard() {
  const { user, isMarketAdmin, isFirebaseEnabled } = useAuth()
  const [liveScans, setLiveScans] = useState([])
  const [liveReports, setLiveReports] = useState([])
  const [liveInspectors, setLiveInspectors] = useState([])
  const [loading, setLoading] = useState({ reports: false, scans: false, inspectors: false })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined

    const isBfar = user?.role === 'bfar_admin'
    const unsubscribers = []
    setLiveReports([])
    setLiveScans([])
    setLiveInspectors([])
    setErrors({})
    setLoading({ reports: true, scans: isBfar, inspectors: isBfar })

    const finish = (key) => setLoading((current) => ({ ...current, [key]: false }))
    const fail = (key, error) => {
      setErrors((current) => ({ ...current, [key]: friendlyDataError(key, error) }))
      finish(key)
    }

    unsubscribers.push(subscribeMarketRecords(
      'reports',
      user,
      (records) => {
        setLiveReports(records)
        finish('reports')
      },
      (error) => fail('reports', error),
    ))

    // Market admins intentionally receive report-level case data only. Raw
    // scan evidence and the system-wide inspector directory remain BFAR-only.
    if (isBfar) {
      unsubscribers.push(subscribeMarketRecords(
        'scans',
        user,
        (records) => {
          setLiveScans(records)
          finish('scans')
        },
        (error) => fail('scans', error),
      ))
      unsubscribers.push(subscribeInspectorProfiles(
        (profiles) => {
          setLiveInspectors(profiles)
          finish('inspectors')
        },
        (error) => fail('inspectors', error),
      ))
    }

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [isFirebaseEnabled, user])

  const dashboardData = useMemo(() => {
    if (!isFirebaseEnabled) return demoDashboardData(user, isMarketAdmin)

    const reports = liveReports
      .map(normalizeReport)
      .filter((report) => !isMarketAdmin || LGU_VISIBLE_STATUSES.has(report.status))
      .sort((a, b) => timestampValue(b.updatedAt || b.createdAt) - timestampValue(a.updatedAt || a.createdAt))

    if (isMarketAdmin) {
      return {
        stats: marketStats(reports),
        reports: reports.slice(0, 6),
        scans: [],
        activity: [],
      }
    }

    const scans = liveScans
      .map(normalizeScan)
      .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))
    const reviewQueue = reports.filter(isBfarActionable)
    return {
      stats: bfarStats(scans, reports, liveInspectors),
      reports: reviewQueue.slice(0, 5),
      scans: scans.slice(0, 4),
      activity: buildActivity(scans, reports).slice(0, 5),
    }
  }, [isFirebaseEnabled, isMarketAdmin, liveInspectors, liveReports, liveScans, user])

  const isLoading = isFirebaseEnabled && Object.values(loading).some(Boolean)
  const errorMessages = Object.values(errors).filter(Boolean)
  const stats = dashboardData.stats.map((stat) => {
    if (isLoading) return { ...stat, value: '—', sublabel: 'Loading live records' }
    const unavailable = isMarketAdmin
      ? Boolean(errors.reports)
      : (stat.id === 'active-inspectors' && Boolean(errors.inspectors))
        || (['assessment-records', 'pass-rate'].includes(stat.id) && Boolean(errors.scans))
        || (stat.id === 'pending-reports' && Boolean(errors.reports))
    return unavailable ? { ...stat, value: '—', sublabel: 'Live data unavailable' } : stat
  })

  return (
    <div className={`dashboard page ${isMarketAdmin ? 'dashboard--market' : 'dashboard--bfar'}`}>
      {isMarketAdmin ? (
        <section className="dashboard__hero">
          <span>LGU MARKET ADMIN</span>
          <h2>Good morning, Officer.</h2>
          <p>Here’s your market’s escalated report activity at a glance.</p>
        </section>
      ) : (
        <section className="dashboard__intro">
          <h2>Operations overview</h2>
          <p>{isFirebaseEnabled ? 'Live inspector activity and report workload' : 'Demonstration data for the FRISH Admin Portal'}</p>
        </section>
      )}

      {isLoading && <DashboardNotice tone="loading" message="Synchronizing the latest dashboard records…" />}
      {errorMessages.length > 0 && (
        <DashboardNotice
          tone="error"
          message={`Some dashboard information could not be loaded. ${errorMessages.join(' ')}`}
        />
      )}

      <div className="stat-grid">{stats.map((stat) => <StatCard key={stat.id} {...stat} />)}</div>

      {isMarketAdmin
        ? <MarketOverview reports={dashboardData.reports} loading={loading.reports} error={errors.reports} />
        : (
          <BfarOverview
            scans={dashboardData.scans}
            reports={dashboardData.reports}
            activity={dashboardData.activity}
            loading={{ scans: loading.scans, reports: loading.reports, activity: loading.scans || loading.reports }}
            errors={errors}
            isDemo={!isFirebaseEnabled}
          />
        )}
    </div>
  )
}

function BfarOverview({ scans, reports, activity, loading, errors, isDemo }) {
  return (
    <>
      <div className="dashboard__split">
        <section className="dashboard-panel">
          <PanelHeading
            title="Recent freshness assessments"
            subtitle={isDemo ? 'Sample assessment records' : 'Latest image-analysis records from inspectors'}
            to="/assessments"
          />
          {errors.scans ? <ErrorPanel message={errors.scans} /> : loading.scans ? <LoadingSkeleton type="table" rows={4} /> : (
            <div className="dashboard-list">
              {scans.length
                ? scans.map((item) => <AssessmentRow item={item} key={item.id} />)
                : <EmptyPanel icon={FiFileText} title="No assessment records yet" message="Completed inspector scans will appear here automatically." />}
            </div>
          )}
        </section>
        <section className="dashboard-panel dashboard-panel--activity">
          <PanelHeading title="Recent activity" subtitle="Latest report and assessment events" to="/audit-trail" />
          {errors.scans && errors.reports ? <ErrorPanel message="Recent activity is unavailable because report and assessment records could not be loaded." /> : loading.activity ? <LoadingSkeleton type="table" rows={4} /> : (
            <div className="activity-list">
              {activity.length
                ? activity.map((item) => <ActivityRow item={item} key={item.id} />)
                : <EmptyPanel icon={FiActivity} title="No recent activity" message="New scans and report changes will be shown here." />}
            </div>
          )}
        </section>
      </div>
      <ReportsPanel reports={reports} loading={loading.reports} error={errors.reports} />
    </>
  )
}

function MarketOverview({ reports, loading, error }) {
  const openCases = reports.filter((report) => report.status !== 'resolved')
  const resolvedCases = reports.filter((report) => report.status === 'resolved')

  return <div className="dashboard__split dashboard__split--market">
    <section className="dashboard-panel">
      <PanelHeading title="Recent escalations" subtitle="Reports formally forwarded by BFAR-NCR" to="/reports" />
      {error ? <ErrorPanel message={error} /> : loading ? <LoadingSkeleton type="table" rows={5} /> : (
        <div className="escalation-list">
          {reports.length
            ? reports.map((report) => <EscalationRow key={report.id} report={report} />)
            : <EmptyPanel icon={FiInbox} title="No escalated reports" message="Cases forwarded by BFAR-NCR will appear here." />}
        </div>
      )}
    </section>
    <section className="dashboard-panel dashboard-panel--case-summary">
      <PanelHeading title="Case status" subtitle="Report-level workload for this market" />
      {error ? <ErrorPanel message="Case totals are unavailable until report records can be loaded." /> : loading ? <LoadingSkeleton type="table" rows={3} /> : (
        <div className="case-summary-list">
          <CaseSummaryRow icon={FiAlertTriangle} label="Awaiting LGU action" value={openCases.length} tone="warning" />
          <CaseSummaryRow icon={FiCheckCircle} label="Resolved cases" value={resolvedCases.length} tone="success" />
          <CaseSummaryRow icon={FiFileText} label="Total escalations" value={reports.length} tone="info" />
        </div>
      )}
    </section>
  </div>
}

function ReportsPanel({ reports, loading, error }) {
  return <section className="dashboard-panel dashboard-panel--reports">
    <PanelHeading title="Report review queue" subtitle="Consumer and inspector reports requiring BFAR attention" to="/reports" />
    {error ? <ErrorPanel message={error} /> : loading ? <LoadingSkeleton type="table" rows={4} /> : (
      <div className="report-list">
        {reports.length ? reports.map((report) => (
          <div className="report-row" key={report.id}>
            <span>
              <strong>{report.reportCode}</strong>
              <small>{report.market} · Submitted by {report.submittedBy}</small>
              <b>{report.title}</b>
            </span>
            <StatusBadge status={report.status} label={workflowLabel(report.status)} />
            <Link to={`/reports/${report.id}`} className="report-row__open">Review</Link>
          </div>
        )) : <EmptyPanel icon={FiInbox} title="No reports in the queue" message="New inspector and consumer reports will appear here in real time." />}
      </div>
    )}
  </section>
}

function PanelHeading({ title, subtitle, to }) {
  return <div className="dashboard-panel__heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{to && <Link to={to} aria-label={`View all ${title.toLowerCase()}`}>View all</Link>}</div>
}

function AssessmentRow({ item }) {
  return <div className="assessment-row">
    <span>
      <strong>{item.species}</strong>
      <small>{item.inspector} · {formatTimestamp(item.createdAt)}</small>
      <small>{item.assessmentCode || getAssessmentCode(item.id, item.species)}</small>
    </span>
    {item.image
      ? <img src={item.image} alt={`${item.species} assessment`} />
      : <span className="assessment-row__image-placeholder" aria-label="Assessment image unavailable"><FiFileText /></span>}
    <span className="assessment-row__status">
      <StatusBadge status={item.status} />
      <small>{formatConfidence(item.confidence)}</small>
    </span>
  </div>
}

function ActivityRow({ item }) {
  const Icon = item.kind === 'alert' ? FiAlertTriangle : item.kind === 'scan' ? FiCheckCircle : FiUsers
  return <div className="activity-row">
    <span className={`activity-row__avatar activity-row__avatar--${item.kind}`}><Icon /></span>
    <span><strong>{item.title}</strong><small>{item.detail}</small></span>
    <time>{item.time || formatTimestamp(item.timestamp, true)}</time>
  </div>
}

function EscalationRow({ report }) {
  const Icon = report.status === 'resolved' ? FiCheckCircle : report.status === 'under-lgu-action' ? FiClock : FiAlertTriangle
  return <article className="escalation-row">
    <div>
      <strong>{report.reportCode}</strong><span> · {report.reporterType} report</span>
      <h4>{report.title}</h4>
      <small>{report.vendorName} · Received {formatTimestamp(report.createdAt)}</small>
    </div>
    <span className="escalation-row__status"><Icon /><StatusBadge status={report.status} label={workflowLabel(report.status)} /></span>
  </article>
}

function CaseSummaryRow({ icon: Icon, label, value, tone }) {
  return <div className="case-summary-row"><span className={`case-summary-row__icon case-summary-row__icon--${tone}`}><Icon /></span><strong>{label}</strong><b>{value}</b></div>
}

function EmptyPanel({ icon: Icon, title, message }) {
  return <div className="dashboard-empty"><Icon /><strong>{title}</strong><span>{message}</span></div>
}

function ErrorPanel({ message }) {
  return <div className="dashboard-empty dashboard-empty--error" role="alert"><FiAlertTriangle /><strong>Unable to load live data</strong><span>{message}</span></div>
}

function DashboardNotice({ tone, message }) {
  return <div className={`dashboard-notice dashboard-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{tone === 'error' ? <FiAlertTriangle /> : <FiClock />}<span>{message}</span></div>
}

function demoDashboardData(user, isMarketAdmin) {
  const assessments = scopeByMarket(getRecentAssessments(), user).slice(0, 4).map((item, index) => ({
    ...item,
    assessmentCode: getAssessmentCode(item.id, item.species),
    species: item.species,
    createdAt: item.date,
    inspector: item.inspector,
    image: index < 2 ? sampleMackerel : sampleGalunggong,
  }))
  if (isMarketAdmin) {
    const escalations = scopeByMarket(getReports(), user)
      .map(normalizeReport)
      .filter((report) => LGU_VISIBLE_STATUSES.has(report.status))
      .slice(0, 6)
    return { stats: marketStats(escalations), reports: escalations, scans: [], activity: [] }
  }
  const reports = scopeByMarket(getRecentReports(), user).slice(0, 5).map(normalizeReport)
  return { stats: getDashboardStats(), scans: assessments, reports, activity: DEMO_ACTIVITY }
}

function bfarStats(scans, reports, inspectors) {
  const activeInspectors = inspectors.filter((item) => normalizeAccountStatus(item) === 'active').length
  const reviewQueue = reports.filter((item) => ['submitted', 'under-review', 'needs-revision'].includes(item.status)).length
  const classifiedScans = scans.filter((item) => item.status !== 'unknown')
  const freshScans = classifiedScans.filter((item) => item.status === 'fresh').length
  const passRate = classifiedScans.length ? `${Math.round((freshScans / classifiedScans.length) * 100)}%` : '—'
  return [
    { id: 'active-inspectors', label: 'Active Inspectors', value: String(activeInspectors), sublabel: `${inspectors.length} total accounts`, icon: 'inspectors', trend: 'flat' },
    { id: 'assessment-records', label: 'Assessment Records', value: String(scans.length), sublabel: 'Live inspector scans', icon: 'assessments', trend: 'flat' },
    { id: 'pending-reports', label: 'Reports Awaiting Review', value: String(reviewQueue), sublabel: reviewQueue ? 'Needs BFAR action' : 'Queue is clear', icon: 'reports', trend: 'flat' },
    { id: 'pass-rate', label: 'Fresh Classification Rate', value: passRate, sublabel: classifiedScans.length ? `${classifiedScans.length} classified scans` : 'No classified scans yet', icon: 'pass-rate', trend: 'flat' },
  ]
}

function marketStats(reports) {
  const awaiting = reports.filter((item) => item.status === 'forwarded-lgu').length
  const underAction = reports.filter((item) => item.status === 'under-lgu-action').length
  const resolved = reports.filter((item) => item.status === 'resolved').length
  const recent = reports.filter((item) => isWithinDays(item.createdAt, 7)).length
  return [
    { id: 'pending', label: 'Awaiting LGU Action', value: String(awaiting), sublabel: awaiting ? 'Needs your review' : 'Queue is clear', icon: 'pending', trend: 'flat' },
    { id: 'in-progress', label: 'Under Action', value: String(underAction), sublabel: 'Open enforcement cases', icon: 'in-progress', trend: 'flat' },
    { id: 'resolved', label: 'Resolved Cases', value: String(resolved), sublabel: 'Completed decisions', icon: 'resolved', trend: 'flat' },
    { id: 'received', label: 'Received This Week', value: String(recent), sublabel: `${reports.length} total escalations`, icon: 'forwarded', trend: 'flat' },
  ]
}

function normalizeScan(scan) {
  const freshness = String(scan.freshness || scan.prediction || scan.status || '').toLowerCase()
  const status = freshness.includes('not fresh') || freshness.includes('spoiled') || freshness === 'fail'
    ? 'not-fresh'
    : freshness.includes('moderate') || freshness === 'warning'
      ? 'moderate'
      : freshness.includes('fresh') || freshness === 'pass'
        ? 'fresh'
        : 'unknown'
  return {
    ...scan,
    id: scan.id || 'Assessment record',
    assessmentCode: getAssessmentCode(scan.id, scan.fishType || scan.species),
    species: scan.fishType || scan.species || 'Fish species not recorded',
    inspector: scan.createdBy?.name || scan.createdBy?.email || scan.inspector || 'Inspector not recorded',
    confidence: Number(scan.confidence),
    createdAt: scan.createdAt || scan.timestamp || scan.createdDate,
    image: webSafeImage(scan.imageUrl || scan.photoUrl || scan.imagePath || scan.photo),
    status,
  }
}

function normalizeReport(report) {
  const normalizedStatus = normalizeReportStatus(report.status)
  const fishType = report.assessment?.fishType || report.fishSpecies || ''
  return {
    ...report,
    reportCode: getReportCode(report),
    title: report.title || report.issue || (fishType ? `${fishType} inspection report` : 'Inspection report'),
    vendorName: report.vendorName || report.vendor?.vendorName || 'Vendor not recorded',
    market: report.assignedMarket || report.market || report.location || 'Pasig Public Market',
    submittedBy: report.createdBy?.name || report.createdBy?.email || report.reporter || report.inspector?.name || 'Inspector',
    reporterType: roleLabel(report.createdBy?.role || report.sourceType || report.reporterType),
    createdAt: report.createdAt || report.date,
    updatedAt: report.updatedAt,
    status: normalizedStatus,
  }
}

function normalizeReportStatus(value) {
  const status = String(value || 'submitted').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  if (['pending', 'pending-review'].includes(status)) return 'submitted'
  if (['in-progress', 'investigating', 'under-investigation'].includes(status)) return 'in progress'
  if (['under-bfar-review'].includes(status)) return 'under-review'
  if (['forwarded-to-lgu', 'escalated-to-lgu'].includes(status)) return 'forwarded-lgu'
  if (status === 'under-lgu-action') return status
  return status
}

function buildActivity(scans, reports) {
  const scanEvents = scans.map((scan) => ({
    id: `scan-${scan.id}`,
    title: scan.status === 'not-fresh' ? 'Freshness concern detected' : 'Assessment recorded',
    detail: `${scan.assessmentCode} · ${scan.species} · ${formatConfidence(scan.confidence)}`,
    timestamp: scan.createdAt,
    kind: scan.status === 'not-fresh' ? 'alert' : 'scan',
  }))
  const reportEvents = reports.map((report) => ({
    id: `report-${report.id}`,
    title: reportActivityTitle(report.status),
    detail: `${report.reportCode} · ${report.title}`,
    timestamp: report.updatedAt || report.createdAt,
    kind: report.status === 'resolved' ? 'scan' : report.status === 'forwarded-lgu' ? 'alert' : 'report',
  }))
  return [...scanEvents, ...reportEvents].sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp))
}

function reportActivityTitle(status) {
  return ({
    submitted: 'New report submitted',
    assigned: 'Inspector assigned to report',
    'in progress': 'Field validation in progress',
    'under-review': 'Report under BFAR review',
    'needs-revision': 'Report returned for revision',
    'forwarded-lgu': 'Report escalated to LGU',
    resolved: 'LGU case resolved',
    closed: 'Report closed',
  })[status] || 'Report updated'
}

function isBfarActionable(report) {
  return ['submitted', 'under-review', 'needs-revision'].includes(report.status)
    || (report.status === 'resolved' && report.lguAction && !report.reporterUpdate)
}

function workflowLabel(status) {
  return ({
    submitted: 'Submitted',
    assigned: 'Assigned',
    'in progress': 'In Progress',
    'under-review': 'Under BFAR Review',
    'needs-revision': 'Needs Revision',
    'forwarded-lgu': 'Forwarded to LGU',
    'under-lgu-action': 'Under LGU Action',
    resolved: 'Resolved',
    closed: 'Closed',
  })[status] || String(status || 'Submitted').replace(/-/g, ' ')
}

function friendlyDataError(key, error) {
  const denied = String(error?.code || '').includes('permission-denied') || /insufficient permissions/i.test(error?.message || '')
  const labels = { scans: 'Assessment records', reports: 'Report records', inspectors: 'Inspector accounts' }
  return denied
    ? `${labels[key]} are not permitted by the current Firestore rules.`
    : `${labels[key]} are temporarily unavailable.`
}

function normalizeAccountStatus(profile) {
  return String(profile.accountStatus || profile.status || 'inactive').toLowerCase()
}

function roleLabel(value) {
  const role = String(value || '').toLowerCase()
  return role.includes('consumer') ? 'Consumer' : 'Inspector'
}

function webSafeImage(value) {
  const path = String(value || '')
  return /^(https?:|data:image\/|blob:)/i.test(path) ? path : ''
}

function formatConfidence(value) {
  return Number.isFinite(value) ? `${Math.round(value)}% confidence` : 'Confidence not recorded'
}

function timestampValue(value) {
  if (value?.toMillis) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Date.parse(value) || 0
  return 0
}

function formatTimestamp(value, timeOnly = false) {
  const timestamp = timestampValue(value)
  if (!timestamp) return typeof value === 'string' && value ? value : 'Not recorded'
  return new Intl.DateTimeFormat('en-PH', timeOnly
    ? { hour: 'numeric', minute: '2-digit' }
    : { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

function isWithinDays(value, days) {
  const timestamp = timestampValue(value)
  return timestamp > 0 && Date.now() - timestamp <= days * 24 * 60 * 60 * 1000
}
