import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { AUTHORITY_CASES_RUNTIME_ENABLED, authorityErrorMessage, getAuthorityCase, listAuthorityCases } from '../../../services/authorityCasesBoundary.js'
import AuthorityEvidenceViewer from './AuthorityEvidenceViewer.jsx'
import '../consumer-intake/ConsumerIntake.css'

export default function AuthorityCases() {
  const { caseId } = useParams()
  const location = useLocation()
  const { isBfarAdmin, user } = useAuth()
  const [records, setRecords] = useState([])
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!isBfarAdmin || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoading(false); return }
    setLoading(true); setError('')
    try { if (caseId) setRecord(await getAuthorityCase(caseId)); else setRecords(await listAuthorityCases()) }
    catch (loadError) { setError(authorityErrorMessage(loadError)) }
    finally { setLoading(false) }
  }, [caseId, isBfarAdmin])
  useEffect(() => { void load() }, [load])
  if (!isBfarAdmin) return null
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <main className="page consumer-intake"><div className="intake-disclosure"><strong>Authority Cases are disabled.</strong><span>The emulator-only feature flag is off; legacy Inspector reports remain available under Reports.</span></div></main>
  return <main className="page consumer-intake"><div className="intake-disclosure"><strong>Emulator prototype — not connected to production Firebase.</strong><span>Consumer authority cases are separate from legacy Inspector reports. Reporter contacts remain protected; secure linked-evidence viewing requires its separate local emulator flag.</span></div>
    {location.state?.alreadyPromoted && <div className="intake-alert">This concern was already promoted; the existing case was returned without creating a duplicate.</div>}
    {error && <div className="intake-alert" role="alert">{error} <button onClick={load}>Retry</button></div>}
    {loading ? <p className="intake-state">Loading emulator authority cases…</p> : caseId ? <CaseDetail record={record} user={user} /> : <CaseList records={records} />}
  </main>
}

function CaseList({ records }) { return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASES</p><h2>Promoted cases</h2></div><span>{records.length} cases</span></header>{records.length ? <div className="intake-list">{records.map((record) => <article key={record.id}><div><strong>{record.title}</strong><span>{record.assignedMarket}</span></div><p>{record.vendorOrStall} · {record.description}</p><footer><span className="prototype-badge">{record.status}</span><Link className="btn btn-outline btn-sm" to={`/authority-cases/${record.id}`}>Open case</Link></footer></article>)}</div> : <p className="intake-state">No Consumer authority cases have been promoted.</p>}</section> }

function CaseDetail({ record, user }) { if (!record) return <p className="intake-state">Authority case not found or not permitted.</p>; return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASE</p><h2>{record.title}</h2></div><span className="prototype-badge">{record.status}</span></header><dl><Fact label="Case ID" value={record.caseId} /><Fact label="Source concern" value={record.sourceConcernReportId} /><Fact label="Market" value={record.assignedMarket} /><Fact label="Vendor or stall" value={record.vendorOrStall} /><Fact label="Reason" value={pretty(record.reason)} /><Fact label="Analysis trust" value="Unavailable" /><Fact label="Description" value={record.description || 'None provided'} /></dl><p className="intake-privacy">Reporter contacts are protected; LGU and Inspectors do not receive reporter identity, email, or Consumer UID. The case remains linked to a Consumer scan even when evidence is unavailable. This general authority view contains no precise GPS, image data, Storage path, local URI, public URL, or temporary model result.</p><AuthorityEvidenceViewer record={record} user={user} /><div className="intake-actions"><Link className="btn btn-outline" to="/authority-cases">Back to authority cases</Link><Link className="btn btn-outline" to="/reports">Open legacy Inspector reports</Link></div></section> }
function Fact({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function pretty(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
