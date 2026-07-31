import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiEye, FiDownload, FiUserPlus, FiCheckCircle, FiArrowRightCircle, FiFilter, FiFileText, FiRotateCcw } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import { getReports } from '../../../data/reports.js'
import { getInspectors } from '../../../data/inspectors.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import './Reports.css'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'under-investigation', label: 'Under Investigation' },
  { value: 'validated', label: 'Validated' },
  { value: 'forwarded-lgu', label: 'Forwarded to LGU' },
]

export default function Reports() {
  const { user, isMarketAdmin } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState(getReports())
  const inspectors = getInspectors()
  const scopedReports = useMemo(() => scopeByMarket(reports, user), [reports, user])
  const scopedInspectors = useMemo(() => scopeByMarket(inspectors, user), [inspectors, user])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inspectorFilter, setInspectorFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [chosenInspector, setChosenInspector] = useState('')

  const filtered = useMemo(() => {
    return scopedReports.filter((r) => {
      const matchesQuery =
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.reporter.toLowerCase().includes(query.toLowerCase()) ||
        r.location.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const matchesInspector = inspectorFilter === 'all' || r.assignedInspector === inspectorFilter
      return matchesQuery && matchesStatus && matchesInspector
    })
  }, [scopedReports, query, statusFilter, inspectorFilter])

  const assignedInspectors = useMemo(() => Array.from(new Set(scopedReports.map((report) => report.assignedInspector))).sort(), [scopedReports])

  function updateReport(id, changes) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
    setViewing((prev) => (prev && prev.id === id ? { ...prev, ...changes } : prev))
  }

  function handleAssign() {
    if (!viewing || !chosenInspector) return
    updateReport(viewing.id, { assignedInspector: chosenInspector })
  }

  function handleValidate() {
    if (!viewing) return
    updateReport(viewing.id, { status: 'validated' })
  }

  function handleForwardToLgu() {
    if (!viewing) return
    updateReport(viewing.id, { status: 'forwarded-lgu' })
  }

  function handleExport() {
    // UI only — wire this up to a real CSV/PDF export once a backend exists.
    alert('Export started (UI only). This will generate a CSV/PDF once connected to a backend.')
  }

  const columns = isMarketAdmin ? [
    { key: 'id', header: 'Report ID' },
    { key: 'reporterType', header: 'Type' },
    { key: 'reporter', header: 'User', render: (row) => <span className="reports-person"><strong>{row.reporter}</strong><small>{row.location}</small></span> },
    { key: 'species', header: 'Fish Species', render: (row) => <span className="reports-species">{getSpecies(row)}</span> },
    { key: 'dateTime', header: 'Received', render: (row) => <span className="reports-datetime"><span>{formatDate(row.date)}</span><span className="reports-datetime__time">{row.time}</span></span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', header: '', render: (row) => <OpenButton row={row} onOpen={openReport} /> },
  ] : [
    { key: 'id', header: 'Report ID' },
    {
      key: 'dateTime',
      header: 'Date & Time',
      render: (row) => (
        <span className="reports-datetime">
          <span>{row.date}</span>
          <span className="reports-datetime__time">{row.time}</span>
        </span>
      ),
    },
    { key: 'location', header: 'Market' },
    { key: 'vendorName', header: 'Vendor', render: (row) => row.vendorName || 'Not recorded' },
    { key: 'reporterType', header: 'Type' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'assignedInspector', header: 'Assigned to' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => <OpenButton row={row} onOpen={openReport} iconOnly />,
    },
  ]

  function openReport(row) {
    navigate(`/reports/${row.id}`)
  }

  return (
    <div className={`page reports-page ${isMarketAdmin ? 'market-workspace' : ''}`}>
      <div className="page-header-row">
        <div>
          <p className="workspace-kicker">{isMarketAdmin ? 'REPORTS & ACTIONS' : 'REPORT MANAGEMENT'}</p>
          <h2>{isMarketAdmin ? 'Reports forwarded by BFAR-NCR' : 'Report Management'}</h2>
          <p className="page-header-row__subtitle">{isMarketAdmin ? 'Review escalations, assign actions, and return your decision.' : 'Review and manage consumer and inspector submitted reports'}</p>
        </div>
      </div>
      {!isMarketAdmin && <BfarBannerAction><button className="btn btn-primary" onClick={handleExport}><FiDownload size={15} /> Export records</button></BfarBannerAction>}

      {isMarketAdmin ? (
        <div className="escalated-controls">
          <div className="escalated-controls__top">
            <SearchBar value={query} onChange={setQuery} placeholder="Search ids, user, status..." />
            <div className="escalated-controls__actions"><button className="btn btn-outline btn-sm" onClick={handleExport}><FiDownload size={13} /> Export CSV</button><button className="btn btn-primary btn-sm" onClick={handleExport}><FiFileText size={13} /> Summary Reports</button></div>
          </div>
          <div className="report-filter-row"><FiFilter aria-hidden="true" />{FILTERS.map((filter) => <button key={filter.value} className={`report-filter ${statusFilter === filter.value ? 'report-filter--active' : ''}`} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}</div>
        </div>
      ) : (
        <div className="toolbar workspace-toolbar reports-page__toolbar"><SearchBar value={query} onChange={setQuery} placeholder="Search by ID, reporter, or market..." /><select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select><select className="select-input" value={inspectorFilter} onChange={(e) => setInspectorFilter(e.target.value)} aria-label="Filter by assigned inspector"><option value="all">All inspectors</option>{assignedInspectors.map((inspector) => <option key={inspector} value={inspector}>{inspector}</option>)}</select>{(query || statusFilter !== 'all' || inspectorFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setStatusFilter('all'); setInspectorFilter('all') }}><FiRotateCcw size={14} /> Clear</button>}</div>
      )}

      {isMarketAdmin ? <TableCard columns={columns} rows={filtered} emptyMessage="No reports match your search." /> : <BfarReportBoard reports={filtered} onOpen={openReport} />}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Report ${viewing.id}` : ''}
        size="lg"
        footer={
          <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <div className="detail-grid">
            <p><strong>Reporter:</strong> {viewing.reporter} ({viewing.reporterType})</p>
            <p><strong>Market:</strong> {viewing.location}</p>
            <p><strong>Vendor:</strong> {viewing.vendorName || 'Not recorded'}</p>
            <p><strong>Issue:</strong> {viewing.issue}</p>
            <p><strong>Validation Result:</strong> {viewing.validationResult || 'Pending validation'}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
            <p><strong>Date Filed:</strong> {viewing.date} · {viewing.time}</p>

            <div className="form-group">
              <label>Assigned Inspector</label>
              <div className="reports-assign-row">
                <select
                  className="select-input"
                  value={chosenInspector}
                  onChange={(e) => setChosenInspector(e.target.value)}
                >
                  <option value="">Choose an inspector...</option>
                  {scopedInspectors.map((i) => (
                    <option key={i.id} value={i.name}>
                      {i.name} — {i.assignedArea}
                    </option>
                  ))}
                </select>
                <button className="btn btn-outline btn-sm" onClick={handleAssign} disabled={!chosenInspector}>
                  <FiUserPlus size={13} /> Assign
                </button>
              </div>
            </div>

            <div className="reports-workflow-actions">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleValidate}
                disabled={viewing.status === 'validated' || viewing.status === 'forwarded-lgu'}
              >
                <FiCheckCircle size={13} /> Mark Validated
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleForwardToLgu}
                disabled={viewing.status !== 'validated'}
              >
                <FiArrowRightCircle size={13} /> Forward to LGU
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function OpenButton({ row, onOpen, iconOnly = false }) {
  return <button className={iconOnly ? 'table-icon-btn' : 'reports-open-btn'} onClick={() => onOpen(row)} aria-label={`Open ${row.id}`}>{iconOnly ? <FiEye size={16} /> : 'Open'}</button>
}

function BfarReportBoard({ reports, onOpen }) {
  return <section className="bfar-report-board"><div className="bfar-report-board__heading"><div><h3>Report review queue</h3><p>Check completeness, assign an inspector, validate findings, then forward confirmed cases to the LGU.</p></div><span>{reports.length} reports</span></div>{reports.length ? <div className="bfar-report-board__list">{reports.map((report) => <article className="bfar-report-card" key={report.id}><div className="bfar-report-card__top"><div><strong>{report.id}</strong><span>{report.reporterType} report · {report.location}</span></div><StatusBadge status={report.status} /></div><h4>{report.issue}</h4><div className="bfar-report-card__facts"><span><b>Vendor</b>{report.vendorName || 'Not recorded'}</span><span><b>Inspector</b>{report.assignedInspector}</span><span><b>Validation</b>{report.validationResult || 'Pending validation'}</span></div><footer><span>Received {formatDate(report.date)} · {report.time}</span><button className="btn btn-outline btn-sm" onClick={() => onOpen(report)}>Review report</button></footer></article>)}</div> : <div className="bfar-report-board__empty">No reports match the selected filters.</div>}</section>
}

function formatDate(date) { return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) }
function getSpecies(report) { const match = report.issue.match(/tilapia|sardines|galunggong|fish/i); return match ? `${match[0][0].toUpperCase()}${match[0].slice(1)}${/galunggong/i.test(match[0]) ? ' (Round Scad)' : ''}` : 'Fish product' }
