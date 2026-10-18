import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiBriefcase, FiDownload, FiFileText, FiInbox, FiRotateCcw } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getReports } from '../../../data/reports.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import { subscribeInspectorProfiles, subscribeMarketRecords } from '../../../services/firestoreService.js'
import { getReportCode } from '../../../utils/reportCode.js'
import { isReportAssignable, normalizeReportRecord } from '../../../utils/reportRecord.js'
import ConsumerIntake from '../consumer-intake/ConsumerIntake.jsx'
import AuthorityCases from '../authority-cases/AuthorityCases.jsx'
import './Reports.css'

const LIVE_STATUSES = ['submitted', 'under-review', 'needs-revision', 'assigned', 'in progress', 'forwarded-lgu', 'under-lgu-action', 'resolved']
const BFAR_FILTERS = [{ value: 'all', label: 'All reports' }, ...LIVE_STATUSES.map((value) => ({ value, label: statusLabel(value) }))]
const LGU_FILTERS = [
  { value: 'all', label: 'All escalated cases' },
  { value: 'forwarded-lgu', label: 'Awaiting LGU action' },
  { value: 'under-lgu-action', label: 'Under LGU action' },
  { value: 'resolved', label: 'Resolved' },
]

export default function Reports() {
  const { user, isBfarAdmin, isFirebaseEnabled } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [reports, setReports] = useState(() => (isFirebaseEnabled ? [] : getReports()))
  const [inspectors, setInspectors] = useState([])
  const [query, setQuery] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const requestedView = searchParams.get('view')
  const availableViews = useMemo(() => {
    const views = [{ value: 'inspector', label: isBfarAdmin ? 'Inspector Reports' : 'Inspector Escalations', icon: FiFileText }]
    if (isBfarAdmin) views.push({ value: 'consumer-intake', label: 'Consumer Intake', icon: FiInbox })
    views.push({ value: 'consumer-cases', label: 'Consumer Cases', icon: FiBriefcase })
    return views
  }, [isBfarAdmin])
  const activeView = availableViews.some(({ value }) => value === requestedView) ? requestedView : 'inspector'

  useEffect(() => {
    setQuery(searchParams.get('search') || '')
  }, [searchParams])

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    return subscribeMarketRecords(
      'reports',
      user,
      setReports,
      (firebaseError) => setError(firebaseError.message || 'Unable to load reports.'),
    )
  }, [isFirebaseEnabled, user])

  useEffect(() => {
    if (!isFirebaseEnabled || !isBfarAdmin) {
      setInspectors([])
      return undefined
    }
    return subscribeInspectorProfiles(setInspectors, () => setInspectors([]))
  }, [isBfarAdmin, isFirebaseEnabled])

  const inspectorNames = useMemo(() => new Map(inspectors.map((inspector) => [
    inspector.id,
    inspector.name || inspector.displayName || inspector.email || 'Inspector',
  ])), [inspectors])
  const displayReports = useMemo(() => reports
    .map((record) => withInspectorIdentity(normalizeReportRecord(record), inspectorNames))
    .filter((report) => isBfarAdmin || ['forwarded-lgu', 'under-lgu-action', 'resolved'].includes(report.status))
    .sort((a, b) => timestampValue(b.updatedAt || b.createdAt) - timestampValue(a.updatedAt || a.createdAt)),
  [inspectorNames, isBfarAdmin, reports])
  const filters = isBfarAdmin ? BFAR_FILTERS : LGU_FILTERS
  const filteredReports = useMemo(() => displayReports.filter((report) => {
    const searchValue = [
      report.id,
      getReportCode(report),
      report.title,
      report.vendorName,
      report.stallNumber,
      report.assignedMarket,
      report.assignedInspectorName,
      report.assessment?.fishType,
    ].join(' ').toLowerCase()
    return searchValue.includes(query.trim().toLowerCase())
      && (statusFilter === 'all' || report.status === statusFilter)
  }), [displayReports, query, statusFilter])

  function handleExport() {
    const headers = ['Report code', 'Title', 'Vendor', 'Market', 'Source', 'Inspector', 'Status', 'Submitted']
    const rows = filteredReports.map((report) => [
      getReportCode(report),
      report.title,
      report.vendorName,
      report.assignedMarket,
      report.sourceType,
      report.assignedInspectorName,
      statusLabel(report.status),
      formatTimestamp(report.createdAt),
    ])
    downloadCsv(`frish-reports-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows])
  }

  function changeView(view) {
    navigate(`/reports?view=${view}`)
  }

  const isInspectorView = activeView === 'inspector'
  const viewCopy = activeView === 'consumer-intake'
    ? {
        kicker: 'CONSUMER INTAKE',
        title: 'Review public concerns',
        subtitle: 'Screen privacy-safe Consumer concerns and explicitly accept valid submissions into the authority workflow.',
      }
    : activeView === 'consumer-cases'
      ? {
          kicker: isBfarAdmin ? 'CONSUMER CASE MANAGEMENT' : 'LGU CONSUMER CASES',
          title: isBfarAdmin ? 'Accepted Consumer cases' : 'Consumer cases forwarded by BFAR-NCR',
          subtitle: isBfarAdmin
            ? 'Track concerns accepted by BFAR through Inspector validation and LGU resolution.'
            : 'Review Consumer-originated cases that BFAR-NCR formally forwarded to Pasig Public Market.',
        }
      : {
          kicker: isBfarAdmin ? 'INSPECTOR REPORTS' : 'LGU CASE MANAGEMENT',
          title: isBfarAdmin ? 'BFAR report review' : 'Inspector reports forwarded by BFAR-NCR',
          subtitle: isBfarAdmin
            ? 'Review reports submitted directly by authorized Inspectors and manage the official escalation workflow.'
            : 'Review Inspector-originated cases formally escalated to Pasig Public Market and return the LGU decision to BFAR-NCR.',
        }

  return (
    <div className={`page reports-page ${!isBfarAdmin ? 'market-workspace reports-page--market' : ''}`}>
      {isBfarAdmin && (
        <BfarBannerAction>
          <div className="reports-banner-actions">
            {isInspectorView && <button className="btn btn-outline" onClick={handleExport} disabled={filteredReports.length === 0}><FiDownload size={15} /> Export records</button>}
            {isInspectorView && <button className="btn btn-primary" onClick={() => setStatusFilter('submitted')}>Review submitted reports</button>}
          </div>
        </BfarBannerAction>
      )}

      <div className="page-header-row reports-page__header">
        <div>
          <p className="workspace-kicker">{viewCopy.kicker}</p>
          <h2>{viewCopy.title}</h2>
          <p className="page-header-row__subtitle">{viewCopy.subtitle}</p>
        </div>
        <div className="reports-page__header-actions">
          {isFirebaseEnabled && isInspectorView && <span className="reports-live-indicator"><i /> Live Firebase data</span>}
          {!isBfarAdmin && isInspectorView && <button className="btn btn-outline btn-sm" onClick={handleExport} disabled={filteredReports.length === 0}><FiDownload size={14} /> Export cases</button>}
        </div>
      </div>

      <nav className="report-module-tabs" aria-label="Report management views">
        {availableViews.map(({ value, label, icon: Icon }) => (
          <button key={value} type="button" className={activeView === value ? 'report-module-tab report-module-tab--active' : 'report-module-tab'} onClick={() => changeView(value)} aria-current={activeView === value ? 'page' : undefined}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {isInspectorView && <>
        <div className="toolbar workspace-toolbar reports-page__toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder={isBfarAdmin ? 'Search code, vendor, market, species, or inspector...' : 'Search report code, vendor, species, or inspector...'} />
          <select className="select-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by report status">
            {filters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          {(query || statusFilter !== 'all') && (
            <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setStatusFilter('all') }}>
              <FiRotateCcw size={14} /> Clear
            </button>
          )}
        </div>

        {error && <p className="reports-error" role="alert">{error}</p>}
        <ReportBoard
          reports={filteredReports}
          isLive={isFirebaseEnabled}
          isBfarAdmin={isBfarAdmin}
          onOpen={(report) => navigate(`/reports/${report.id}`)}
        />
      </>}
      {activeView === 'consumer-intake' && <ConsumerIntake embedded selectedReportId={searchParams.get('reportId') || ''} />}
      {activeView === 'consumer-cases' && <AuthorityCases embedded selectedCaseId={searchParams.get('caseId') || ''} />}
    </div>
  )
}

function ReportBoard({ reports, isLive, isBfarAdmin, onOpen }) {
  return (
    <section className="bfar-report-board">
      <div className="bfar-report-board__heading">
        <div>
          <h3>{isBfarAdmin ? (isLive ? 'Submitted report queue' : 'Report review queue') : 'Escalated case queue'}</h3>
          <p>{isBfarAdmin ? (isLive ? 'Inspector reports are reviewed directly. Use Consumer Intake for public concerns that require explicit BFAR acceptance.' : 'Sample records are shown until Firebase data is enabled.') : 'Awaiting-action cases require an LGU decision. Resolved cases remain available as read-only records.'}</p>
        </div>
        <span>{reports.length} reports</span>
      </div>
      {reports.length ? (
        <div className="bfar-report-board__list">
          {reports.map((report) => {
            const assignable = isReportAssignable(report)
            return (
              <article className="bfar-report-card" key={report.id}>
                <div className="bfar-report-card__top">
                  <div><strong>{getReportCode(report)}</strong><span>{report.assignedMarket}</span></div>
                  <StatusBadge status={report.status} label={!isBfarAdmin && report.status === 'forwarded-lgu' ? 'Awaiting LGU Action' : undefined} />
                </div>
                <h4>{report.title}</h4>
                <div className="bfar-report-card__facts">
                  <span><b>Vendor</b>{report.vendorName}</span>
                  <span>
                    <b>{isBfarAdmin ? (assignable ? 'Assigned inspector' : 'Submitted by') : 'Forwarded by'}</b>
                    {isBfarAdmin ? (assignable ? report.assignedInspectorName || 'Awaiting BFAR review' : report.createdBy?.name || report.createdBy?.email || 'Inspector') : 'BFAR-NCR'}
                  </span>
                  <span><b>Submitted</b>{formatTimestamp(report.createdAt)}</span>
                </div>
                <footer>
                  <span>{report.description}</span>
                  <button className={`btn btn-sm ${!isBfarAdmin && report.status === 'forwarded-lgu' ? 'btn-primary' : 'btn-outline'}`} onClick={() => onOpen(report)}>
                    {isBfarAdmin ? (isLive && assignable && !report.assignedInspectorId ? 'Review & assign' : 'Review report') : report.status === 'resolved' ? 'View decision' : 'Review & decide'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
      ) : <div className="bfar-report-board__empty">{isBfarAdmin ? 'No reports match the selected filters.' : 'No escalated cases match the selected filters.'}</div>}
    </section>
  )
}

function timestampValue(value) {
  return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0)
}

function withInspectorIdentity(report, inspectorNames) {
  const creator = report.createdBy && typeof report.createdBy === 'object' ? report.createdBy : {}
  const name = creator.name || inspectorNames.get(creator.uid)
  return name ? { ...report, createdBy: { ...creator, name } } : report
}

function formatTimestamp(value) {
  const timestamp = timestampValue(value)
  return timestamp
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
    : 'Not recorded'
}

function statusLabel(status) {
  return status.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function downloadCsv(filename, rows) {
  const contents = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
