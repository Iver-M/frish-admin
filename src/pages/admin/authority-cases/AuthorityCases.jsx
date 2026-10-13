import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { AUTHORITY_CASES_IS_CLOUD, AUTHORITY_CASES_RUNTIME_ENABLED, authorityErrorMessage, subscribeAuthorityCase, subscribeAuthorityCases } from '../../../services/authorityCasesBoundary.js'
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
  const [error, setError] = useState('')
  const listPath = embedded ? '/reports?view=consumer-cases' : '/authority-cases'
  const detailPath = (id) => embedded
    ? `/reports?view=consumer-cases&caseId=${encodeURIComponent(id)}`
    : `/authority-cases/${id}`
  const load = useCallback(() => {
    if ((!isBfarAdmin && !isMarketAdmin) || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoading(false); return }
    setLoading(true); setError('')
    const onError = (loadError) => { setError(authorityErrorMessage(loadError)); setLoading(false) }
    return caseId
      ? subscribeAuthorityCase(caseId, (next) => { setRecord(next); setLoading(false) }, onError)
      : subscribeAuthorityCases((next) => { setRecords(next); setLoading(false) }, onError, user)
  }, [caseId, isBfarAdmin, isMarketAdmin, user])
  useEffect(() => load(), [load])
  if (!isBfarAdmin && !isMarketAdmin) return null
  const Root = embedded ? 'section' : 'main'
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className="intake-disclosure"><strong>Authority Cases are disabled.</strong><span>Enable the shared Consumer authority runtime or use the local emulator configuration.</span></div></Root>
  return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className={`intake-disclosure ${AUTHORITY_CASES_IS_CLOUD ? 'intake-disclosure--live' : ''}`}><div><strong>{AUTHORITY_CASES_IS_CLOUD ? 'Live Consumer authority cases' : 'Local Consumer authority emulator'}</strong><span>Accepted Consumer concerns are kept separate from Inspector reports. This page updates automatically from Firestore while reporter identity and contact details remain protected.</span></div></div>
    {location.state?.alreadyPromoted && <div className="intake-alert intake-alert--info">This concern was already accepted; the existing authority case was opened without creating a duplicate.</div>}
    {error && <div className="intake-alert" role="alert">{error}</div>}
    {loading ? <p className="intake-state">Loading authority cases…</p> : caseId ? <CaseDetail record={record} user={user} backPath={listPath} /> : <CaseList records={records} isMarketAdmin={isMarketAdmin} detailPath={detailPath} />}
  </Root>
}

function CaseList({ records, isMarketAdmin, detailPath }) { return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASES</p><h2>{isMarketAdmin ? 'Cases forwarded to Pasig LGU' : 'Promoted cases'}</h2></div><span>{records.length} cases</span></header>{records.length ? <div className="intake-list">{records.map((record) => <article key={record.id}><div><strong>{record.title}</strong><span>{record.assignedMarket}</span></div><p>{record.vendorOrStall} · {record.description}</p><footer><span className="prototype-badge">{pretty(record.status)}</span><Link className="btn btn-outline btn-sm" to={detailPath(record.id)}>Open case</Link></footer></article>)}</div> : <p className="intake-state">{isMarketAdmin ? 'No Consumer cases have been forwarded to Pasig LGU.' : 'No Consumer authority cases have been promoted.'}</p>}</section> }

function CaseDetail({ record, user, backPath }) { if (!record) return <p className="intake-state">Authority case not found or not permitted.</p>; const marketAdmin = user?.role === 'market_admin'; return <section className="intake-panel intake-detail"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASE</p><h2>{record.title}</h2></div><span className="prototype-badge">{pretty(record.status)}</span></header><Workflow status={record.status} /><dl><Fact label="Case ID" value={record.caseId} /><Fact label="Source concern" value={record.sourceConcernReportId} /><Fact label="Market" value={record.assignedMarket} /><Fact label="Vendor or stall" value={record.vendorOrStall} /><Fact label="Reason" value={pretty(record.reason)} /><Fact label="Assigned inspector" value={record.assignedInspectorName || 'Not assigned'} /><Fact label="Analysis trust" value="Unavailable" /><Fact label="Description" value={record.description || 'None provided'} /></dl><p className="intake-privacy">Reporter contacts are protected; LGU and Inspectors do not receive reporter identity, email, or Consumer UID. The case remains linked to a Consumer scan even when evidence is unavailable. This general authority view contains no precise GPS, image data, Storage path, local URI, public URL, or temporary model result.</p>{!marketAdmin && <AuthorityEvidenceViewer record={record} user={user} />}<div className="intake-actions"><Link className="btn btn-outline" to={backPath}>Back to authority cases</Link><Link className="btn btn-outline" to="/reports?view=inspector">Open Inspector reports</Link></div></section> }
function Fact({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function pretty(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

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
  return <div className="authority-workflow" aria-label="Authority case workflow">{CASE_STAGES.map(([value, label], index) => <span key={value} className={index <= current && !closed ? 'authority-workflow__step authority-workflow__step--complete' : 'authority-workflow__step'}>{label}</span>)}{closed && <span className="authority-workflow__step authority-workflow__step--closed">Closed — no violation</span>}</div>
}
