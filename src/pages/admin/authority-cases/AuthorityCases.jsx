import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { AUTHORITY_CASES_IS_CLOUD, AUTHORITY_CASES_RUNTIME_ENABLED, AUTHORITY_RUNTIME_MESSAGE, authorityErrorMessage, isAuthorityCaseRefForUser, subscribeAuthorityCase, subscribeAuthorityCases } from '../../../services/authorityCasesBoundary.js'
import { formatConsumerDate } from '../../../services/consumerAuthorityPolicy.js'
import AuthorityCaseActions from './AuthorityCaseActions.jsx'
import AuthorityEvidenceViewer from './AuthorityEvidenceViewer.jsx'
import ConsumerWorkflow from '../consumer-intake/ConsumerWorkflow.jsx'
import '../consumer-intake/ConsumerIntake.css'

export default function AuthorityCases({ embedded = false, selectedCaseId = '' }) {
  const { caseId: routeCaseId } = useParams()
  const caseId = selectedCaseId || routeCaseId || ''
  return <AuthorityCasesView key={caseId} caseId={caseId} embedded={embedded} />
}

function AuthorityCasesView({ caseId, embedded }) {
  const location = useLocation()
  const { isBfarAdmin, isMarketAdmin, user } = useAuth()
  const lguView = AUTHORITY_CASES_IS_CLOUD && isMarketAdmin
  const [records, setRecords] = useState([])
  const [record, setRecord] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const listPath = embedded ? '/reports?view=consumer-cases' : '/authority-cases'
  const detailPath = (id) => embedded
    ? `/reports?view=consumer-cases&caseId=${encodeURIComponent(id)}`
    : `/authority-cases/${id}`
  useEffect(() => {
    if ((!isBfarAdmin && !isMarketAdmin) || !AUTHORITY_CASES_RUNTIME_ENABLED) { setLoadState('ready'); return undefined }
    let active = true
    let unsubscribe
    setLoadState('loading'); setError(''); setRecord(null); setRecords([])
    const onError = (loadError) => { if (active) { setError(authorityErrorMessage(loadError)); setLoadState('ready') } }
    const onData = next => {
      if (!active) return
      if (caseId) setRecord(next)
      else setRecords(next)
      setError(''); setLoadState('ready')
    }
    const onWaiting = () => { if (active) setLoadState('waiting') }
    try {
      unsubscribe = caseId
        ? subscribeAuthorityCase(caseId, onData, onError, onWaiting, user)
        : subscribeAuthorityCases(onData, onError, user, onWaiting)
    } catch (loadError) { onError(loadError) }
    return () => { active = false; unsubscribe?.() }
  }, [caseId, isBfarAdmin, isMarketAdmin, user, refresh])
  if (!isBfarAdmin && !isMarketAdmin) return null
  const Root = embedded ? 'section' : 'main'
  if (!AUTHORITY_CASES_RUNTIME_ENABLED) return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className="intake-disclosure"><strong>Authority Cases are disabled.</strong><span>{AUTHORITY_RUNTIME_MESSAGE}</span></div></Root>
  return <Root className={`consumer-intake ${embedded ? 'consumer-intake--embedded' : 'page'}`}><div className={`intake-disclosure ${AUTHORITY_CASES_IS_CLOUD ? 'intake-disclosure--live' : ''}`}><div><strong>{AUTHORITY_CASES_IS_CLOUD ? 'Configured for Consumer cloud-test cases' : 'Local Consumer authority emulator'}</strong><span>Accepted Consumer concerns are kept separate from Inspector reports. This page updates automatically from Firestore while reporter identity and contact details remain protected.</span></div></div>
    {!lguView && location.state?.alreadyPromoted && <div className="intake-alert intake-alert--info">This concern was already accepted; the existing authority case was opened without creating a duplicate.</div>}
    {!user?.consumerPermissions?.cases && <div className="intake-alert" role="status">Portal access does not grant Consumer permissions. The backend requires signed active staff claims for the approved test environment.</div>}
    <button className="btn btn-outline" disabled={loadState === 'loading'} onClick={() => { setLoadState('loading'); setRefresh(value => value + 1) }}>Refresh recorded cases</button>
    {error && <div className="intake-alert" role="alert">{error}</div>}
    {loadState === 'loading' ? <p className="intake-state" role="status">Loading authority cases…</p> : error ? null : loadState === 'waiting' ? (
      <p className="intake-state" role="status">{caseId ? 'Waiting for a connection to confirm this case. Case actions require server confirmation.' : 'Waiting for a connection to confirm the case list.'}</p>
    ) : caseId ? <CaseDetail record={record?.caseId === caseId ? record : null} user={user} lguView={lguView} backPath={listPath} /> : <CaseList records={records.filter(item => isAuthorityCaseRefForUser(item.id, user))} isMarketAdmin={isMarketAdmin} lguView={lguView} detailPath={detailPath} />}
  </Root>
}

function CaseList({ records, isMarketAdmin, lguView, detailPath }) { return <section className="intake-panel"><header><div><p className="workspace-kicker">CONSUMER AUTHORITY CASES</p><h2>{isMarketAdmin ? 'Cases forwarded to Pasig LGU' : 'Promoted cases'}</h2></div><span>{records.length} cases</span></header>{records.length ? <div className="intake-list">{records.map((record) => <article key={record.id}><div><strong>{record.title}</strong><span>{record.assignedMarket}</span></div><p>{record.vendorOrStall} · {lguView ? pretty(record.reason) : record.description}</p><footer><span className="prototype-badge">{pretty(record.status)}</span><Link className="btn btn-outline btn-sm" to={detailPath(record.id)}>Open case</Link></footer></article>)}</div> : <p className="intake-state">{isMarketAdmin ? 'No Consumer cases have been forwarded to Pasig LGU.' : 'No Consumer authority cases have been promoted.'}</p>}</section> }

function CaseDetail({ record, user, lguView, backPath }) {
  if (!record) return <>
    <p className="intake-state">Authority case not found or not permitted.</p>
    {lguView && <Link className="btn btn-outline" to={backPath}>Back to authority cases</Link>}
  </>
  return (
    <section className="intake-panel intake-detail">
      <header>
        <div><p className="workspace-kicker">CONSUMER AUTHORITY CASE</p><h2>{record.title}</h2></div>
        <span className="prototype-badge" role="status">{pretty(record.status)}</span>
      </header>
      {!lguView && <ConsumerWorkflow status={record.status} />}
      <dl>
        <Fact label={lguView ? 'Case reference' : 'Case ID'} value={record.caseId} />
        {!lguView && <Fact label="Source concern" value={record.sourceConcernReportId} />}
        <Fact label="Market" value={record.assignedMarket} />
        <Fact label="Vendor or stall" value={record.vendorOrStall} />
        <Fact label="Reason" value={pretty(record.reason)} />
        {!lguView && <Fact label="Assigned inspector" value={record.assignedInspectorName || 'Not assigned'} />}
        {!lguView && <Fact label="Photo estimate" value="Uncertain estimate" />}
        <Fact label="Accepted" value={formatConsumerDate(record.promotedAt)} />
        <Fact label="Last recorded update" value={formatConsumerDate(record.updatedAt)} />
        <Fact label="Record version" value={record.version} />
        {!lguView && <Fact label="Findings" value={record.description || 'None provided'} />}
      </dl>
      {!lguView && <p className="intake-privacy">Reporter contacts are protected; LGU and Inspectors do not receive reporter identity, email, or Consumer UID. The case remains linked to a Consumer scan even when evidence is unavailable. This general authority view contains no precise GPS, image data, Storage path, local URI, public URL, or temporary model result.</p>}
      {user?.role === 'bfar_admin' && user.consumerPermissions?.role === 'bfar_admin' && (
        <AuthorityEvidenceViewer record={record} user={user} />
      )}
      <AuthorityCaseActions key={`${record.caseId}:${user?.uid}`} record={record} user={user} lguView={lguView} />
      <div className="intake-actions">
        <Link className="btn btn-outline" to={backPath}>Back to authority cases</Link>
        <Link className="btn btn-outline" to="/reports?view=inspector">Open Inspector reports</Link>
      </div>
    </section>
  )
}


function Fact({ label, value }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function pretty(value) { return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bLgu\b/g, 'LGU') }
