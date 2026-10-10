import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { FiClock, FiFileText, FiImage, FiShield, FiUser } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { AUTHORITY_CASES_RUNTIME_ENABLED, authorityErrorMessage, getPendingConsumerConcern, promoteConsumerConcern, subscribeAuthorityCases } from '../../../services/authorityCasesBoundary.js'
import { consumerReportView } from '../../../utils/consumerReportView.js'
import { Crumb, Summary, InfoCard, Fact } from './ReportDetail.jsx'
import AuthorityCaseWorkflow from '../authority-cases/AuthorityCaseWorkflow.jsx'
import AuthorityEvidenceViewer from '../authority-cases/AuthorityEvidenceViewer.jsx'
import { isAuthorityEvidenceViewerEnabled } from '../../../services/authorityEvidenceService.js'
import '../consumer-intake/ConsumerIntake.css'

export default function ConsumerReportReview({ kind }) {
  const { reportId, caseId } = useParams()
  const { user, isBfarAdmin } = useAuth()
  const id = kind === 'concern' ? reportId : caseId
  const scope = `${user?.uid}:${user?.role}:${user?.accountStatus}:${kind}:${id}`
  if (!isBfarAdmin || user?.accountStatus !== 'active') return <Navigate to="/dashboard" replace />
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <main className="page report-detail"><Link to="/reports">Back to reports</Link><p>Consumer reports are not connected in this environment yet.</p></main>
  return <Review key={scope} kind={kind} id={id} user={user} />
}

function Review({ kind, id, user }) {
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const busy = useRef(false)
  const mounted = useRef(true)
  const concern = kind === 'concern'
  useEffect(() => { mounted.current = true; window.scrollTo(0, 0); return () => { mounted.current = false } }, [])
  useEffect(() => {
    let active = true
    let unsubscribe
    setLoading(true); setError('')
    const failed = item => { if (active) { setRecord(null); setLoading(false); setError(authorityErrorMessage(item)) } }
    const received = value => {
      if (!active) return
      if (value && (concern ? value.reportId !== id : value.caseId !== id)) {
        failed({ code: 'functions/internal' }); return
      }
      setRecord(value); setLoading(false); setError('')
    }
    try {
      if (concern) getPendingConsumerConcern(id).then(result => received(result.concern)).catch(failed)
      else unsubscribe = subscribeAuthorityCases(id, received, failed)
    } catch (item) { failed(item) }
    return () => { active = false; unsubscribe?.() }
  }, [id, concern, retry])
  async function accept() {
    if (busy.current || !record) return false
    busy.current = true; setPromoting(true); setError('')
    try {
      const result = await promoteConsumerConcern(record.reportId, { title: 'Consumer fish quality concern', assignedMarket: record.marketName })
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(result?.caseId || '')) throw new Error('Acceptance could not be confirmed. Retry to retrieve the existing case.')
      if (!mounted.current) return false
      navigate(`/reports/authority/${encodeURIComponent(result.caseId)}`, { replace: true })
      return true
    } catch (item) { if (mounted.current) setError(authorityErrorMessage(item)); return false }
    finally { busy.current = false; if (mounted.current) setPromoting(false) }
  }
  const report = record && consumerReportView(record, kind)
  if (loading && !record) return <main className="page report-detail"><p role="status">Loading Consumer report…</p></main>
  if (!report) return <main className="page report-detail"><Link to="/reports">Back to reports</Link><p role="alert">{error || 'Report not found or not permitted.'}</p><button className="btn btn-outline" onClick={() => setRetry(value => value + 1)}>Retry</button></main>
  return <>
    <main className="report-detail page">
      <Crumb label="Back to reports" report={report} />
      <Summary report={report} kicker="CONSUMER REPORT" statusOverride={report.statusLabel} />
      {error && !confirmOpen && <p role="alert">{error}</p>}
      <div className="report-detail__layout">
        <div className="report-detail__main">
          <InfoCard title="Vendor information" icon={FiUser}><dl className="detail-facts detail-facts--vendor"><Fact label="Vendor / Stall" value={report.vendorName} /><Fact label="Market" value={report.assignedMarket} /><Fact label="Report source" value="Consumer" /><Fact label="Assigned inspector" value={report.assignedInspectorName || 'Awaiting assignment'} /></dl></InfoCard>
          <InfoCard title="Report findings" icon={FiFileText}><dl className="detail-facts"><Fact label="Reason for report" value={reasonLabel(report.reason)} /></dl><p>{report.description}</p></InfoCard>
          {!concern && isAuthorityEvidenceViewerEnabled(user) && <InfoCard title="Photo evidence" icon={FiImage}><AuthorityEvidenceViewer record={record} user={user} /></InfoCard>}
          <InfoCard title="Report review" icon={FiShield}>
            {concern ? <><p>Review these findings before accepting the concern. Acceptance submits it to the authority workflow and updates the Consumer’s report status.</p><button className="btn btn-primary" disabled={promoting} onClick={() => { setError(''); setConfirmOpen(true) }}>Accept report</button></> : <AuthorityCaseWorkflow record={record} user={user} onReload={() => setRetry(value => value + 1)} />}
          </InfoCard>
        </div>
        <aside className="report-detail__side">
          <InfoCard title="Report progress" icon={FiClock}><p>{report.statusLabel}</p><p>{concern ? 'Awaiting BFAR acceptance.' : 'Status changes appear automatically in the Consumer’s History → Reports.'}</p></InfoCard>
          <InfoCard title="Report metadata" icon={FiFileText}><dl className="metadata"><Fact label="Report source" value="Consumer" /><Fact label="Market" value={report.assignedMarket} /></dl><p>Reporter contacts remain protected. This view excludes Consumer identity and precise location.</p></InfoCard>
        </aside>
      </div>
    </main>
    <ConfirmDialog open={confirmOpen} onClose={() => { if (!busy.current) { setConfirmOpen(false); setError('') } }} onConfirm={accept} title="Accept this Consumer report?" message="This submits the concern to the authority workflow. Its original Consumer record is retained and its status becomes Submitted to authority." confirmLabel="Accept report" pendingLabel="Accepting…" error={error} />
  </>
}

function reasonLabel(value) {
  return ({ spoiled_at_scan: 'Spoiled at time of scanning', spoiled_after_purchase: 'Spoiled after purchase', suspected_treatment: 'Suspected chemical treatment', other: 'Other concern' })[value] || 'Not recorded'
}
