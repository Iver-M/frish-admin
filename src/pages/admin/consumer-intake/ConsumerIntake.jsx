import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import {
  AUTHORITY_CASES_RUNTIME_ENABLED,
  AUTHORITY_CASES_IS_CLOUD,
  AUTHORITY_RUNTIME_MESSAGE,
  authorityErrorMessage,
  getPendingConsumerConcern,
  listPendingConsumerConcerns,
  promoteConsumerConcern,
  rejectConsumerConcern,
} from '../../../services/authorityCasesBoundary.js'
import { formatConsumerDate } from '../../../services/consumerAuthorityPolicy.js'
import './ConsumerIntake.css'

export default function ConsumerIntake({ embedded = false, selectedReportId = '' }) {
  const { reportId: routeReportId } = useParams()
  const reportId = selectedReportId || routeReportId
  const navigate = useNavigate()
  const location = useLocation()
  const { isBfarAdmin, user, refreshProfile } = useAuth()
  const [concerns, setConcerns] = useState([])
  const [concern, setConcern] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [nextPageToken, setNextPageToken] = useState(null)
  const [pageToken, setPageToken] = useState(null)
  const request = useRef(0)
  const mutation = useRef(false)
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

  const load = useCallback(async (requestedPageToken = pageToken) => {
    if (!isBfarAdmin || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoading(false); return }
    const current = ++request.current
    setLoading(true)
    setError('')
    try {
      const result = reportId ? await getPendingConsumerConcern(reportId) : await listPendingConsumerConcerns({ pageSize: 50, ...(requestedPageToken ? { pageToken: requestedPageToken } : {}) })
      if (current !== request.current) return
      if (reportId) {
        if (!result?.concern || result.concern.reportId !== reportId) throw Object.assign(new Error(), { code: 'invalid-response' })
        setConcern(result.concern)
      } else {
        if (!Array.isArray(result?.concerns)) throw Object.assign(new Error(), { code: 'invalid-response' })
        setConcerns(result.concerns); setNextPageToken(result.nextPageToken || null)
      }
    } catch (loadError) { if (current === request.current) { setConcern(null); setConcerns([]); setError(authorityErrorMessage(loadError)) } }
    finally { if (current === request.current) setLoading(false) }
  }, [isBfarAdmin, reportId, user?.uid, pageToken])

  useEffect(() => { setConcern(null); setConcerns([]); setActionError(''); void load(); return () => { request.current += 1 } }, [load])
  useEffect(() => {
    if (!isBfarAdmin || !AUTHORITY_CASES_RUNTIME_ENABLED) return undefined
    const interval = window.setInterval(() => { if (!mutation.current && !reportId) void load() }, 30_000)
    return () => window.clearInterval(interval)
  }, [isBfarAdmin, load])

  async function promote() {
    if (promoting || !concern) return
    if (mutation.current) return
    mutation.current = true
    const activeRequest = request.current
    setPromoting(true)
    setActionError('')
    try {
      const result = await promoteConsumerConcern(concern.reportId, {
        title: 'Consumer fish quality concern',
        assignedMarket: concern.marketName,
      })
      if (activeRequest !== request.current) return
      setConfirmOpen(false)
      navigate(casePath(result.caseId), { state: { alreadyPromoted: result.alreadyPromoted } })
    } catch (promotionError) {
      setActionError(authorityErrorMessage(promotionError))
      setConfirmOpen(false)
    } finally { mutation.current = false; setPromoting(false) }
  }

  async function rejectConcern() {
    const reason = rejectReason.trim()
    if (rejecting || !concern || !reason) return
    if (mutation.current) return
    mutation.current = true
    const activeRequest = request.current
    setRejecting(true)
    setActionError('')
    try {
      await rejectConsumerConcern(concern.reportId, reason)
      if (activeRequest !== request.current) return
      setRejectOpen(false)
      setRejectReason('')
      navigate(listPath, { replace: true, state: { rejectionConfirmed: true } })
    } catch (rejectionError) {
      setActionError(authorityErrorMessage(rejectionError))
      setRejectOpen(false)
    } finally { mutation.current = false; setRejecting(false) }
  }

  if (!isBfarAdmin) return null
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Disabled embedded={embedded} />

  const Root = embedded ? 'section' : 'main'

  return (
    <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}>
      <Disclosure onRefresh={() => load()} loading={loading || promoting || rejecting} />
      {location.state?.rejectionConfirmed && <p className="intake-alert intake-alert--info" role="status">The server recorded the rejection. The current service can still return decided concerns in its saved-record list.</p>}
      {!user?.consumerPermissions?.intake && <div className="intake-alert" role="status">Portal sign-in does not establish Consumer permissions. Signed active BFAR claims are required and the backend decides access. <button onClick={() => refreshProfile().catch(() => setActionError('Unable to refresh permissions. Sign in again.'))}>Refresh permissions</button></div>}
      {actionError && <div className="intake-alert" role="alert">{actionError} Acceptance retries open the same linked case.</div>}
      {error && <div className="intake-alert" role="alert">{error} <button onClick={() => load()}>Retry</button></div>}
      {loading ? <p className="intake-state" role="status">Loading Consumer intake…</p> : error ? null : reportId ? (
        concern?.reportId === reportId ? <Detail concern={concern} backPath={listPath} onAccept={() => setConfirmOpen(true)} onReject={() => setRejectOpen(true)} busy={promoting || rejecting} />
          : <p className="intake-state">Concern not found.</p>
      ) : <><List concerns={concerns} detailPath={detailPath} /><div className="intake-actions">{pageToken && <button className="btn btn-outline" onClick={() => setPageToken(null)}>First page of concerns</button>}{nextPageToken && <button className="btn btn-outline" onClick={() => setPageToken(nextPageToken)}>Next page of concerns</button>}</div></>}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !promoting && setConfirmOpen(false)}
        onConfirm={promote}
        title="Accept as an authority case?"
        message="This BFAR action creates one linked authority case. Consumer status updates depend on the approved backend status service; acceptance does not confirm phone notification delivery."
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
    <div><strong>{AUTHORITY_CASES_IS_CLOUD ? 'Configured for the shared Consumer cloud-test intake.' : 'Local Consumer authority emulator.'}</strong><span>{AUTHORITY_RUNTIME_MESSAGE} The service returns saved concerns; it checks the recorded intake decision when you accept or reject. Retrying acceptance opens an existing linked case. Reporter contacts stay protected and are never displayed in this queue.</span></div>
    <button className="btn btn-outline btn-sm" type="button" disabled={loading} onClick={onRefresh}>{loading ? 'Refreshing…' : 'Refresh intake'}</button>
  </div>
}

function Disabled({ embedded = false }) {
  const Root = embedded ? 'section' : 'main'
  return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className="intake-disclosure" role="status"><strong>Consumer Intake is disabled.</strong><span>{AUTHORITY_RUNTIME_MESSAGE}</span></div></Root>
}

function List({ concerns, detailPath }) {
  return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER INTAKE</p><h2>Saved Consumer concerns</h2></div><span>{concerns.length} on this page</span></header>
    {concerns.length ? <div className="intake-list">{concerns.map((item) => <article key={item.reportId}>
      <div><strong>{item.vendorOrStall}</strong><span>{item.marketName}</span></div>
      <p>{item.description || 'No description provided.'} · Saved {formatConsumerDate(item.createdAt)}</p>
      <footer><span className="prototype-badge">Saved Consumer concern</span><Link className="btn btn-outline btn-sm" to={detailPath(item.reportId)}>Review concern</Link></footer>
    </article>)}</div> : <p className="intake-state">No saved Consumer concerns were returned for this environment.</p>}
  </section>
}

function Detail({ concern, backPath, onAccept, onReject, busy }) {
  return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">INTAKE REVIEW</p><h2>{concern.vendorOrStall}</h2></div><span className="prototype-badge">Saved Consumer concern</span></header>
    <dl><Fact label="Report ID" value={concern.reportId} /><Fact label="Market" value={concern.marketName} /><Fact label="Reason" value={label(concern.reason)} /><Fact label="Findings" value={concern.description || 'None provided'} /><Fact label="Saved" value={formatConsumerDate(concern.createdAt)} /><Fact label="Photo estimate" value="Uncertain estimate" /></dl>
    <p className="intake-privacy">Reporter contacts are protected and may be accessed only by BFAR through an approved follow-up workflow. LGU and Inspectors do not receive them. This concern remains linked to its Consumer scan even though images are not shown; secure evidence viewing is not yet enabled. Anonymous owner UID, evidence paths, precise GPS, and temporary model class/confidence are excluded.</p>
    <div className="intake-actions"><Link className="btn btn-outline" to={backPath}>Back to intake</Link><button className="btn btn-outline" disabled={busy} onClick={onReject}>Do not accept</button><button className="btn btn-primary" disabled={busy} onClick={onAccept}>{busy ? 'Working…' : 'Accept as authority case'}</button></div>
  </section>
}

function Fact({ label: title, value }) { return <div><dt>{title}</dt><dd>{value}</dd></div> }
function label(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
