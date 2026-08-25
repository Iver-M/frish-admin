import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import {
  AUTHORITY_CASES_RUNTIME_ENABLED,
  authorityErrorMessage,
  getPendingConsumerConcern,
  listPendingConsumerConcerns,
  promoteConsumerConcern,
} from '../../../services/authorityCasesBoundary.js'
import './ConsumerIntake.css'

export default function ConsumerIntake() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { isBfarAdmin } = useAuth()
  const [concerns, setConcerns] = useState([])
  const [concern, setConcern] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)

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
      navigate(`/authority-cases/${result.caseId}`, { state: { alreadyPromoted: result.alreadyPromoted } })
    } catch (promotionError) {
      setError(authorityErrorMessage(promotionError))
      setConfirmOpen(false)
    } finally { setPromoting(false) }
  }

  if (!isBfarAdmin) return null
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Disabled />

  return (
    <main className="page consumer-intake">
      <Disclosure />
      {error && <div className="intake-alert" role="alert">{error} <button onClick={load}>Retry</button></div>}
      {loading ? <p className="intake-state">Loading emulator intake…</p> : reportId ? (
        concern ? <Detail concern={concern} onAccept={() => setConfirmOpen(true)} promoting={promoting} />
          : <p className="intake-state">Concern not found.</p>
      ) : <List concerns={concerns} />}
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
    </main>
  )
}

function Disclosure() {
  return <div className="intake-disclosure"><strong>Emulator prototype — not connected to production Firebase.</strong><span>Saving a Consumer concern does not submit it. Only this explicit BFAR acceptance creates an authority case.</span></div>
}

function Disabled() {
  return <main className="page consumer-intake"><div className="intake-disclosure"><strong>Consumer Intake is disabled.</strong><span>Set the documented local emulator flag; production authority listeners remain prohibited.</span></div></main>
}

function List({ concerns }) {
  return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER INTAKE</p><h2>Pending prototype concerns</h2></div><span>{concerns.length} pending</span></header>
    {concerns.length ? <div className="intake-list">{concerns.map((item) => <article key={item.reportId}>
      <div><strong>{item.vendorOrStall}</strong><span>{item.marketName}</span></div>
      <p>{item.description || 'No description provided.'}</p>
      <footer><span className="prototype-badge">prototype_saved</span><Link className="btn btn-outline btn-sm" to={`/consumer-intake/${item.reportId}`}>Review concern</Link></footer>
    </article>)}</div> : <p className="intake-state">No pending emulator concerns.</p>}
  </section>
}

function Detail({ concern, onAccept, promoting }) {
  return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">INTAKE REVIEW</p><h2>{concern.vendorOrStall}</h2></div><span className="prototype-badge">prototype_saved</span></header>
    <dl><Fact label="Report ID" value={concern.reportId} /><Fact label="Market" value={concern.marketName} /><Fact label="Reason" value={label(concern.reason)} /><Fact label="Description" value={concern.description || 'None provided'} /><Fact label="Analysis" value="Unavailable — no temporary model output is authority evidence" /></dl>
    <p className="intake-privacy">Reporter email, reporter identity, anonymous owner UID, evidence paths, and temporary model class/confidence are excluded from this view.</p>
    <div className="intake-actions"><Link className="btn btn-outline" to="/consumer-intake">Back to intake</Link><button className="btn btn-primary" disabled={promoting} onClick={onAccept}>{promoting ? 'Promoting…' : 'Accept as authority case'}</button></div>
  </section>
}

function Fact({ label: title, value }) { return <div><dt>{title}</dt><dd>{value}</dd></div> }
function label(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
