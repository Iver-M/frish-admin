import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import {
  AUTHORITY_CASES_RUNTIME_ENABLED,
  AUTHORITY_CASES_IS_CLOUD,
  authorityErrorMessage,
  getPendingConsumerConcern,
  listPendingConsumerConcerns,
  promoteConsumerConcern,
  rejectConsumerConcern,
} from '../../../services/authorityCasesBoundary.js'
import './ConsumerIntake.css'

export default function ConsumerIntake({ embedded = false, selectedReportId = '' }) {
  const { reportId: routeReportId } = useParams()
  const reportId = selectedReportId || routeReportId
  const navigate = useNavigate()
  const { isBfarAdmin } = useAuth()
  const [concerns, setConcerns] = useState([])
  const [concern, setConcern] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const listPath = embedded ? '/reports?view=consumer-intake' : '/consumer-intake'
  const detailPath = (id) => embedded
    ? `/reports?view=consumer-intake&reportId=${encodeURIComponent(id)}`
    : `/consumer-intake/${id}`
  const casePath = (id) => embedded
    ? `/reports?view=consumer-cases&caseId=${encodeURIComponent(id)}`
    : `/authority-cases/${id}`

  const load = useCallback(async () => {
    if (!isBfarAdmin || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      if (reportId) setConcern((await getPendingConsumerConcern(reportId)).concern)
      else setConcerns((await listPendingConsumerConcerns({ pageSize: 50 })).concerns)
    } catch (loadError) { setError(authorityErrorMessage(loadError)) }
    finally { setLoading(false) }
  }, [isBfarAdmin, reportId])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!isBfarAdmin || !AUTHORITY_CASES_RUNTIME_ENABLED) return undefined
    const interval = window.setInterval(() => { void load() }, 30_000)
    return () => window.clearInterval(interval)
  }, [isBfarAdmin, load])

  async function promote() {
    if (promoting || !concern) return
    setPromoting(true)
    setError('')
    try {
      const result = await promoteConsumerConcern(concern.reportId, {
        title: 'Consumer fish quality concern',
        assignedMarket: concern.marketName,
      })
      setConfirmOpen(false)
      navigate(casePath(result.caseId), { state: { alreadyPromoted: result.alreadyPromoted } })
    } catch (promotionError) {
      setError(authorityErrorMessage(promotionError))
      setConfirmOpen(false)
    } finally { setPromoting(false) }
  }

  async function rejectConcern() {
    const reason = rejectReason.trim()
    if (rejecting || !concern || !reason) return
    setRejecting(true)
    setError('')
    try {
      await rejectConsumerConcern(concern.reportId, reason)
      setRejectOpen(false)
      setRejectReason('')
      navigate(listPath, { replace: true })
    } catch (rejectionError) {
      setError(authorityErrorMessage(rejectionError))
      setRejectOpen(false)
    } finally { setRejecting(false) }
  }

  if (!isBfarAdmin) return null
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Disabled embedded={embedded} />

  const Root = embedded ? 'section' : 'main'

  return (
    <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}>
      <Disclosure onRefresh={load} loading={loading} />
      {error && <div className="intake-alert" role="alert">{error} <button onClick={load}>Retry</button></div>}
      {loading ? <p className="intake-state">Loading Consumer intake…</p> : reportId ? (
        concern ? <Detail concern={concern} backPath={listPath} onAccept={() => setConfirmOpen(true)} onReject={() => setRejectOpen(true)} busy={promoting || rejecting} />
          : <p className="intake-state">Concern not found.</p>
      ) : <List concerns={concerns} detailPath={detailPath} />}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !promoting && setConfirmOpen(false)}
        onConfirm={promote}
        title="Accept as an authority case?"
        message="This explicit BFAR action creates a separate submitted authority case. The Consumer prototype concern remains unchanged."
        confirmLabel="Accept as authority case"
        pendingLabel="Promoting…"
        pending={promoting}
      />
      <Modal
        open={rejectOpen}
        onClose={() => !rejecting && setRejectOpen(false)}
        title="Do not accept this Consumer concern"
        size="sm"
        footer={<><button className="btn btn-outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>Cancel</button><button className="btn btn-danger-outline" onClick={rejectConcern} disabled={rejecting || !rejectReason.trim()}>{rejecting ? 'Recording…' : 'Confirm rejection'}</button></>}
      >
        <div className="intake-reject-form"><p>Record a concise internal reason. It is not exposed to the Consumer; the Consumer receives only a privacy-safe “not accepted” status.</p><label><span>Internal reason</span><textarea rows={4} maxLength={1000} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Example: The report does not identify a Pasig Public Market vendor or stall." /></label><small>{rejectReason.length}/1000</small></div>
      </Modal>
    </Root>
  )
}

function Disclosure({ onRefresh, loading }) {
  return <div className={`intake-disclosure ${AUTHORITY_CASES_IS_CLOUD ? 'intake-disclosure--live' : ''}`}>
    <div><strong>{AUTHORITY_CASES_IS_CLOUD ? 'Connected to the shared Consumer cloud-test intake.' : 'Local Consumer authority emulator.'}</strong><span>Consumer concerns remain pending until BFAR explicitly accepts them as authority cases. Reporter contacts stay protected and are never displayed in this queue.</span></div>
    <button className="btn btn-outline btn-sm" type="button" disabled={loading} onClick={onRefresh}>{loading ? 'Refreshing…' : 'Refresh intake'}</button>
  </div>
}

function Disabled({ embedded = false }) {
  const Root = embedded ? 'section' : 'main'
  return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className="intake-disclosure"><strong>Consumer Intake is disabled.</strong><span>Set VITE_CONSUMER_AUTHORITY_MODE=cloud_test for the shared team-test Firebase environment, or enable the documented local emulator mode.</span></div></Root>
}

function List({ concerns, detailPath }) {
  return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER INTAKE</p><h2>Pending prototype concerns</h2></div><span>{concerns.length} pending</span></header>
    {concerns.length ? <div className="intake-list">{concerns.map((item) => <article key={item.reportId}>
      <div><strong>{item.vendorOrStall}</strong><span>{item.marketName}</span></div>
      <p>{item.description || 'No description provided.'}</p>
      <footer><span className="prototype-badge">Pending BFAR acceptance</span><Link className="btn btn-outline btn-sm" to={detailPath(item.reportId)}>Review concern</Link></footer>
    </article>)}</div> : <p className="intake-state">No Consumer concerns are waiting for BFAR acceptance.</p>}
  </section>
}

function Detail({ concern, backPath, onAccept, onReject, busy }) {
  return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">INTAKE REVIEW</p><h2>{concern.vendorOrStall}</h2></div><span className="prototype-badge">Pending BFAR acceptance</span></header>
    <dl><Fact label="Report ID" value={concern.reportId} /><Fact label="Market" value={concern.marketName} /><Fact label="Reason" value={label(concern.reason)} /><Fact label="Description" value={concern.description || 'None provided'} /><Fact label="Analysis" value="Unavailable — no temporary model output is authority evidence" /></dl>
    <p className="intake-privacy">Reporter contacts are protected and may be accessed only by BFAR through an approved follow-up workflow. LGU and Inspectors do not receive them. This concern remains linked to its Consumer scan even though images are not shown; secure evidence viewing is not yet enabled. Anonymous owner UID, evidence paths, precise GPS, and temporary model class/confidence are excluded.</p>
    <div className="intake-actions"><Link className="btn btn-outline" to={backPath}>Back to intake</Link><button className="btn btn-outline" disabled={busy} onClick={onReject}>Do not accept</button><button className="btn btn-primary" disabled={busy} onClick={onAccept}>{busy ? 'Working…' : 'Accept as authority case'}</button></div>
  </section>
}

function Fact({ label: title, value }) { return <div><dt>{title}</dt><dd>{value}</dd></div> }
function label(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
