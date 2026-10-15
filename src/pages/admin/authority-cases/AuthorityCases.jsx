import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { AUTHORITY_CASES_IS_CLOUD, AUTHORITY_CASES_RUNTIME_ENABLED, AUTHORITY_RUNTIME_MESSAGE, authorityErrorMessage, subscribeAuthorityCase, subscribeAuthorityCases } from '../../../services/authorityCasesBoundary.js'
import { formatConsumerDate } from '../../../services/consumerAuthorityPolicy.js'
import AuthorityCaseActions from './AuthorityCaseActions.jsx'
import AuthorityEvidenceViewer from './AuthorityEvidenceViewer.jsx'
import '../consumer-intake/ConsumerIntake.css'

export default function AuthorityCases({ embedded = false, selectedCaseId = '' }) {
  const { caseId: routeCaseId } = useParams()
  const caseId = selectedCaseId || routeCaseId
  const location = useLocation()
  const { isBfarAdmin, isMarketAdmin, user } = useAuth()
  const [records, setRecords] = useState([])
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const listPath = embedded ? '/reports?view=consumer-cases' : '/authority-cases'
  const detailPath = (id) => embedded
    ? `/reports?view=consumer-cases&caseId=${encodeURIComponent(id)}`
    : `/authority-cases/${id}`
  useEffect(() => {
    if ((!isBfarAdmin && !isMarketAdmin) || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoading(false); return undefined }
    let active = true
    let unsubscribe
    setLoading(true); setError(''); setRecord(null); setRecords([])
    const onError = (loadError) => { if (active) { setError(authorityErrorMessage(loadError)); setLoading(false) } }
    const onData = next => {
      if (!active) return
      if (caseId) setRecord(next)
      else setRecords(next)
      setError(''); setLoading(false)
    }
    try {
      unsubscribe = caseId ? subscribeAuthorityCase(caseId, onData, onError) : subscribeAuthorityCases(onData, onError, user)
    } catch (loadError) { onError(loadError) }
    return () => { active = false; unsubscribe?.() }
  }, [caseId, isBfarAdmin, isMarketAdmin, user, refresh])
  if (!isBfarAdmin && !isMarketAdmin) return null
  const Root = embedded ? 'section' : 'main'
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className="intake-disclosure"><strong>Authority Cases are disabled.</strong><span>{AUTHORITY_RUNTIME_MESSAGE}</span></div></Root>
  return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className={`intake-disclosure ${AUTHORITY_CASES_IS_CLOUD ? 'intake-disclosure--live' : ''}`}><div><strong>{AUTHORITY_CASES_IS_CLOUD ? 'Configured for Consumer cloud-test cases' : 'Local Consumer authority emulator'}</strong><span>Accepted Consumer concerns are kept separate from Inspector reports. This page updates automatically from Firestore while reporter identity and contact details remain protected.</span></div></div>
    {location.state?.alreadyPromoted && <div className="intake-alert intake-alert--info">This concern was already accepted; the existing authority case was opened without creating a duplicate.</div>}
    {!user?.consumerPermissions?.cases && <div className="intake-alert" role="status">Portal access does not grant Consumer permissions. The backend requires signed active staff claims for the approved test environment.</div>}
    <button className="btn btn-outline" disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh recorded cases</button>
    {error && <div className="intake-alert" role="alert">{error}</div>}
    {loading ? <p className="intake-state" role="status">Loading authority cases…</p> : error ? null : caseId ? <CaseDetail key={`${caseId}:${user?.uid}`} record={record} user={user} backPath={listPath} /> : <CaseList records={records} isMarketAdmin={isMarketAdmin} detailPath={detailPath} />}
  </Root>
}

function CaseList({ records, isMarketAdmin, detailPath }) { return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASES</p><h2>{isMarketAdmin ? 'Cases forwarded to Pasig LGU' : 'Promoted cases'}</h2></div><span>{records.length} cases</span></header>{records.length ? <div className="intake-list">{records.map((record) => <article key={record.id}><div><strong>{record.title}</strong><span>{record.assignedMarket}</span></div><p>{record.vendorOrStall} · {record.description}</p><footer><span className="prototype-badge">{pretty(record.status)}</span><Link className="btn btn-outline btn-sm" to={detailPath(record.id)}>Open case</Link></footer></article>)}</div> : <p className="intake-state">{isMarketAdmin ? 'No Consumer cases have been forwarded to Pasig LGU.' : 'No Consumer authority cases have been promoted.'}</p>}</section> }

function CaseDetail({ record, user, backPath }) { if (!record) return <p className="intake-state">Authority case not found or not permitted.</p>; const marketAdmin = user?.role === 'market_admin'; return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASE</p><h2>{record.title}</h2></div><span className="prototype-badge">{pretty(record.status)}</span></header><Workflow status={record.status} /><dl><Fact label="Case ID" value={record.caseId} /><Fact label="Source concern" value={record.sourceConcernReportId} /><Fact label="Market" value={record.assignedMarket} /><Fact label="Vendor or stall" value={record.vendorOrStall} /><Fact label="Reason" value={pretty(record.reason)} /><Fact label="Assigned inspector" value={record.assignedInspectorName || 'Not assigned'} /><Fact label="Photo estimate" value="Uncertain estimate" /><Fact label="Accepted" value={formatConsumerDate(record.promotedAt)} /><Fact label="Last recorded update" value={formatConsumerDate(record.updatedAt)} /><Fact label="Record version" value={record.version} /><Fact label="Findings" value={record.description || 'None provided'} /></dl><p className="intake-privacy">Reporter contacts are protected; LGU and Inspectors do not receive reporter identity, email, or Consumer UID. The case remains linked to a Consumer scan even when evidence is unavailable. This general authority view contains no precise GPS, image data, Storage path, local URI, public URL, or temporary model result.</p>{!marketAdmin && <AuthorityEvidenceViewer record={record} user={user} />}<AuthorityCaseActions key={`${record.caseId}:${user?.uid}`} record={record} user={user} /><div className="intake-actions"><Link className="btn btn-outline" to={backPath}>Back to authority cases</Link><Link className="btn btn-outline" to="/reports?view=inspector">Open Inspector reports</Link></div></section> }
function Fact({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function pretty(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bLgu\b/g, 'LGU') }

const CASE_STAGES = [
  ['submitted', 'BFAR review'],
  ['assigned', 'Inspector assigned'],
  ['in_progress', 'Validation in progress'],
  ['forwarded_lgu', 'Forwarded to LGU'],
  ['resolved', 'Resolved'],
]
function Workflow({ status }) {
  const current = CASE_STAGES.findIndex(([value]) => value === status)
  const closed = status === 'closed_no_violation'
  return <div className="authority-workflow" aria-label="Current recorded status; other stages are possible steps, not a dated history">{CASE_STAGES.map(([value, label], index) => <span key={value} aria-current={index === current && !closed ? 'step' : undefined} className={index === current && !closed ? 'authority-workflow__step authority-workflow__step--complete' : 'authority-workflow__step'}>{label}</span>)}{closed && <span aria-current="step" className="authority-workflow__step authority-workflow__step--closed">Closed — no violation</span>}</div>
}
