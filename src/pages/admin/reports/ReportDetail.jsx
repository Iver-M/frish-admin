import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiImage,
  FiMapPin,
  FiMessageSquare,
  FiSend,
  FiShield,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getReports } from '../../../data/reports.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import {
  listActiveInspectors,
  sendReporterUpdate,
  subscribeRecord,
  updateReportWithAudit,
} from '../../../services/firestoreService.js'
import { getReportCode } from '../../../utils/reportCode.js'
import {
  isReportAssignable,
  normalizeReportRecord,
  reportSourceLabel,
} from '../../../utils/reportRecord.js'
import './ReportDetail.css'

const PUBLIC_CONCLUSIONS = [
  'Resolved — corrective action completed',
  'Resolved — reported concern addressed',
  'Resolved — follow-up monitoring scheduled',
  'Closed — no further action required',
]

export default function ReportDetail() {
  const { reportId } = useParams()
  const { user, isBfarAdmin, isFirebaseEnabled } = useAuth()
  const [liveReport, setLiveReport] = useState(undefined)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    return subscribeRecord(
      'reports',
      reportId,
      setLiveReport,
      (firebaseError) => setError(firebaseError.message || 'Unable to load this report.'),
    )
  }, [isFirebaseEnabled, reportId])

  const report = useMemo(() => {
    const record = isFirebaseEnabled ? liveReport : getReports().find((item) => item.id === reportId)
    return record ? normalizeReportRecord(record) : record
  }, [isFirebaseEnabled, liveReport, reportId])

  if (isFirebaseEnabled && liveReport === undefined) return <main className="report-detail page">Loading report…</main>
  if (!report) return <Navigate to="/reports" replace />

  return isBfarAdmin
    ? <BfarReportReview report={report} user={user} error={error} isFirebaseEnabled={isFirebaseEnabled} />
    : <LguReportAction report={report} user={user} error={error} />
}

function BfarReportReview({ report, user, error, isFirebaseEnabled }) {
  const assignable = isReportAssignable(report)
  const workflowLocked = report.status === 'forwarded-lgu' || report.status === 'resolved'
  const missingCanonicalFields = report.compatibility?.canonicalFieldsMissing || []
  const needsCanonicalRepair = isFirebaseEnabled && missingCanonicalFields.length > 0
  const [inspectors, setInspectors] = useState([])
  const [assignedInspectorId, setAssignedInspectorId] = useState(report.assignedInspectorId || '')
  const [status, setStatus] = useState(report.status || 'submitted')
  const [isSaving, setSaving] = useState(false)
  const [message, setMessage] = useState(error)
  const [conclusion, setConclusion] = useState(report.reporterUpdate?.conclusion || '')
  const [reporterMessage, setReporterMessage] = useState(report.reporterUpdate?.message || '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [outcomeError, setOutcomeError] = useState('')
  const reporter = reporterOf(report)

  useEffect(() => {
    if (!assignable) return undefined
    let active = true
    listActiveInspectors()
      .then((items) => active && setInspectors(items))
      .catch((item) => active && setMessage(item.message || 'Unable to load inspectors.'))
    return () => { active = false }
  }, [assignable])

  useEffect(() => {
    setAssignedInspectorId(report.assignedInspectorId || '')
    setStatus(report.status || 'submitted')
  }, [report])

  useEffect(() => {
    if (!report.reporterUpdate) return
    setConclusion(report.reporterUpdate.conclusion || '')
    setReporterMessage(report.reporterUpdate.message || '')
  }, [report.reporterUpdate])

  async function saveWorkflow() {
    const selectedInspector = inspectors.find((item) => item.id === assignedInspectorId)
    if (assignable && !selectedInspector) return setMessage('Choose an active inspector before saving.')
    const inspector = selectedInspector || { id: '', name: 'Field inspector submission' }
    const firstAssignment = assignable && !report.assignedInspectorId
    const nextStatus = firstAssignment ? 'assigned' : status
    const canonicalFields = canonicalReportFields(report)
    setSaving(true)
    setMessage('')
    try {
      await updateReportWithAudit(
        report.id,
        assignable
          ? {
            ...canonicalFields,
            assignedInspectorId: inspector.id,
            assignedInspectorName: displayName(inspector),
            status: nextStatus,
          }
          : { ...canonicalFields, status: nextStatus },
        {
          actorId: user.uid || 'bfar-admin',
          actorName: user.name || 'BFAR-NCR Admin',
          action: needsCanonicalRepair
            ? 'Completed legacy report fields'
            : firstAssignment ? 'Assigned inspector to report' : 'Updated inspection report',
          details: `${titleOf(report)} — ${displayName(inspector)} · ${nextStatus}`,
          category: 'Report Management',
        },
      )
      setMessage(needsCanonicalRepair
        ? 'The report now contains the required Pasig market fields and is available to the LGU escalation query.'
        : firstAssignment
        ? 'Inspector assignment saved in Firestore. Mobile assignment sync can be enabled when the updated report module is added to the inspector app.'
        : 'Report workflow updated.')
    } catch (item) {
      setMessage(reportWorkflowError(item))
    } finally {
      setSaving(false)
    }
  }

  async function sendConclusion() {
    const cleanMessage = reporterMessage.trim()
    setOutcomeError('')

    if (!user?.uid) {
      setOutcomeError('Your administrator session could not be verified. Sign in again and retry.')
      return false
    }
    if (!reporter.uid || !reporter.role) {
      setOutcomeError('This report does not contain a valid reporter account ID. Confirm the source record before sending.')
      return false
    }
    if (!conclusion) {
      setOutcomeError('Select a public conclusion before sending.')
      return false
    }
    if (cleanMessage.length < 20) {
      setOutcomeError('Add a short, useful explanation of at least 20 characters.')
      return false
    }
    if (cleanMessage.length > 800) {
      setOutcomeError('Keep the reporter message within 800 characters.')
      return false
    }

    const senderName = user.name || 'BFAR-NCR Admin'
    try {
      await sendReporterUpdate(
        report.id,
        {
          message: cleanMessage,
          conclusion,
          recipientUid: reporter.uid,
          recipientRole: reporter.role,
          sentByUid: user.uid,
          sentByName: senderName,
        },
        {
          reportId: report.id,
          reportCode: getReportCode(report),
          recipientUid: reporter.uid,
          recipientRole: reporter.role,
          conclusion,
          message: cleanMessage,
          sentByUid: user.uid,
          sentByName: senderName,
        },
        {
          actorId: user.uid,
          actorName: senderName,
          action: 'Sent LGU case conclusion to reporter',
          details: `${getReportCode(report)} — ${reporter.role} reporter notified`,
          category: 'Report Communication',
          marketId: report.marketId || 'pasig',
        },
      )
      setMessage(`Conclusion sent securely to ${reporter.name}.`)
      return true
    } catch (item) {
      setOutcomeError(item.message || 'Unable to send the conclusion.')
      return false
    }
  }

  return <main className="report-detail bfar-report-review page">
    <Crumb label="Back to report management" report={report} />
    <Summary report={report} kicker="BFAR-NCR REPORT REVIEW" />
    <div className="report-detail__layout">
      <div className="report-detail__main">
        <InfoCard title="Completeness and report details" icon={FiFileText}>
          <div className="detail-facts detail-facts--vendor">
            <Fact label="Submitted by" value={report.createdBy?.name || report.reporter || 'Field inspector'} />
            <Fact label="Vendor" value={report.vendorName || 'Not recorded'} />
            <Fact label="Stall number" value={report.stallNumber || 'Not recorded'} />
            <Fact label="Contact number" value={report.contactNumber || 'Not recorded'} />
            <Fact label="Market" value={marketOf(report)} icon={<FiMapPin />} />
            <Fact label="Report source" value={reportSourceLabel(report)} />
          </div>
          <p className="finding-note">{report.description || report.issue || 'No report description recorded.'}</p>
          {report.actionTaken && <p className="finding-note"><strong>Inspector action:</strong> {report.actionTaken}</p>}
        </InfoCard>

        {report.assessment && <InspectionEvidence assessment={report.assessment} />}

        <InfoCard title={assignable ? 'Field validation assignment' : 'BFAR review workflow'} icon={FiShield}>
          {needsCanonicalRepair && <p className="workflow-guidance">This report uses the Inspector app’s older format and is missing: {missingCanonicalFields.join(', ')}. Complete these fields so Firestore can route the case to the Pasig LGU.</p>}
          {!assignable && <p className="workflow-guidance">{workflowLocked ? (report.status === 'resolved' ? 'The LGU decision has been received. Review it below and communicate the approved conclusion to the original reporter.' : 'This case is awaiting a decision from the Pasig Public Market administrator.') : 'This report was submitted by an inspector and does not require reassignment. Review the evidence before forwarding a valid case to the LGU.'}</p>}
          <label className="detail-field" hidden={!assignable}>
            <span>Assigned inspector</span>
            <select value={assignedInspectorId} onChange={(event) => setAssignedInspectorId(event.target.value)}>
              <option value="">Choose an active inspector…</option>
              {inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{displayName(inspector)}</option>)}
            </select>
          </label>
          <label className="detail-field">
            <span>{assignable ? 'Assignment status' : 'BFAR disposition'}</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={workflowLocked || (assignable && !report.assignedInspectorId)}>
              <option value="submitted">Submitted</option>
              {assignable && <option value="assigned">Assigned</option>}
              {assignable && <option value="in progress">In Progress</option>}
              <option value="forwarded-lgu">Forwarded to LGU</option>
              {report.status === 'resolved' && <option value="resolved">Resolved by LGU</option>}
            </select>
          </label>
          <div className="review-action-row">
            {workflowLocked && needsCanonicalRepair && <button className="btn btn-primary btn-sm" onClick={saveWorkflow} disabled={isSaving}><FiCheckCircle /> {isSaving ? 'Completing record…' : 'Complete record for LGU'}</button>}
            <button className="btn btn-primary btn-sm" onClick={saveWorkflow} disabled={workflowLocked || isSaving || (assignable && !assignedInspectorId)}>
              {assignable ? <FiUserPlus /> : <FiCheckCircle />} {workflowLocked ? (report.status === 'resolved' ? 'Resolved by LGU' : 'Awaiting LGU decision') : isSaving ? 'Saving…' : assignable ? report.assignedInspectorId ? 'Save workflow' : 'Assign inspector' : 'Save BFAR review'}
            </button>
          </div>
          {message && <p className="bfar-review-status">{message}</p>}
        </InfoCard>

        {report.status === 'resolved' && report.lguAction && <InfoCard title="Communicate the LGU conclusion" icon={FiMessageSquare}>
          <ReporterOutcome
            report={report}
            reporter={reporter}
            conclusion={conclusion}
            reporterMessage={reporterMessage}
            onConclusionChange={setConclusion}
            onMessageChange={setReporterMessage}
            onSend={() => { setOutcomeError(''); setConfirmOpen(true) }}
          />
        </InfoCard>}
      </div>

      <aside className="report-detail__side">
        <InfoCard title="Workflow status" icon={FiClock}><History report={report} /></InfoCard>
        <InfoCard title="Current record" icon={FiUser}>
          <dl className="metadata">
            <Fact label="Assigned inspector" value={report.assignedInspectorName || 'Unassigned'} />
            <Fact label="Status" value={statusLabel(report.status)} />
            <Fact label="Submitted" value={formatDate(report.createdAt || report.date)} />
          </dl>
        </InfoCard>
      </aside>
    </div>

    <ConfirmDialog
      open={confirmOpen}
      onClose={() => { setConfirmOpen(false); setOutcomeError('') }}
      onConfirm={sendConclusion}
      title="Send conclusion to reporter?"
      message={`This will publish the reviewed conclusion to ${reporter.name}. Internal LGU remarks will not be included.`}
      confirmLabel="Send conclusion"
      pendingLabel="Sending…"
      error={outcomeError}
    />
  </main>
}

function InspectionEvidence({ assessment }) {
  const sensor = assessment.sensor || {}
  const location = assessment.location || {}
  const hasLocation = Number.isFinite(Number(location.latitude))
    && Number.isFinite(Number(location.longitude))
    && !(Number(location.latitude) === 0 && Number(location.longitude) === 0)
  const detectedParts = assessment.detectedParts || []

  return <InfoCard title="Inspection evidence" icon={FiImage}>
    <div className="inspection-evidence">
      {assessment.imageUrl ? (
        <img className="inspection-evidence__image" src={assessment.imageUrl} alt={`${assessment.fishType} inspection evidence`} />
      ) : (
        <div className="inspection-evidence__image inspection-evidence__image--empty">
          <FiImage />
          <span>{assessment.localImagePath ? 'The captured image is stored only on the inspector device.' : 'No inspection image was attached.'}</span>
        </div>
      )}
      <dl className="inspection-evidence__facts">
        <Fact label="Fish species" value={assessment.fishType} />
        <Fact label="Freshness" value={assessment.freshness} />
        <Fact label="Assessment result" value={assessment.overallStatus} />
        <Fact label="Model confidence" value={assessment.confidence === null ? 'Not recorded' : `${assessment.confidence}%`} />
        <Fact label="Shelf life" value={assessment.shelfLife === null ? 'Not recorded' : withUnit(assessment.shelfLife, 'hours')} />
        <Fact label="Storage recommendation" value={assessment.storageRecommendation} />
        <Fact label="Temperature" value={withUnit(sensor.temperature, '°C')} />
        <Fact label="Humidity" value={withUnit(sensor.humidity, '%')} />
        <Fact label="Ammonia" value={evidenceValue(sensor.ammonia)} />
        <Fact label="Gas resistance" value={withUnit(sensor.gasResistance, 'kΩ')} />
        <Fact label="GPS coordinates" value={hasLocation ? `${location.latitude}, ${location.longitude}` : 'Not recorded'} />
        <Fact label="Captured" value={assessment.timestamp ? formatDate(assessment.timestamp) : 'Not recorded'} />
      </dl>
    </div>
    <div className="inspection-evidence__detections">
      <strong>Detected parts</strong>
      <span>{detectedParts.length ? detectedParts.map((part) => part.class || part.name).filter(Boolean).join(', ') || `${detectedParts.length} detections` : 'No detected-part evidence recorded.'}</span>
    </div>
  </InfoCard>
}

function ReporterOutcome({
  report,
  reporter,
  conclusion,
  reporterMessage,
  onConclusionChange,
  onMessageChange,
  onSend,
}) {
  if (report.reporterUpdate?.sentAt) {
    return <div className="reporter-outcome reporter-outcome--sent">
      <div className="reporter-outcome__success"><FiCheckCircle /><span><strong>Conclusion sent</strong><small>{formatDate(report.reporterUpdate.sentAt)} · {report.reporterUpdate.sentByName || 'BFAR-NCR Admin'}</small></span></div>
      <dl className="reporter-outcome__delivery"><Fact label="Recipient" value={`${reporter.name} · ${roleLabel(reporter.role)}`} /><Fact label="Public conclusion" value={report.reporterUpdate.conclusion} /></dl>
      <p className="reporter-outcome__message">{report.reporterUpdate.message}</p>
    </div>
  }

  const canSend = Boolean(
    report.lguAction
    && reporter.uid
    && reporter.role
    && conclusion
    && reporterMessage.trim().length >= 20
    && reporterMessage.trim().length <= 800,
  )

  return <div className="reporter-outcome">
    <div className="reporter-outcome__internal">
      <strong>LGU result for BFAR review</strong>
      <span>{actionLabel(report.lguAction)}</span>
      <p>{report.lguRemarks || 'No LGU remarks were recorded.'}</p>
      <small>Internal LGU remarks are never copied to the reporter automatically.</small>
    </div>
    <div className="reporter-outcome__recipient">
      <FiUser />
      <span><small>Original reporter</small><strong>{reporter.name} · {roleLabel(reporter.role)}</strong></span>
    </div>
    {!reporter.uid && <p className="reporter-outcome__warning" role="alert">This legacy report has no reporter account ID. Add or migrate the original reporter UID before sending a conclusion.</p>}
    <label className="detail-field">
      <span>Public conclusion</span>
      <select value={conclusion} onChange={(event) => onConclusionChange(event.target.value)}>
        <option value="">Choose a safe conclusion…</option>
        {PUBLIC_CONCLUSIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    <label className="detail-field">
      <span>Message to reporter</span>
      <textarea
        value={reporterMessage}
        maxLength={800}
        onChange={(event) => onMessageChange(event.target.value)}
        placeholder="Summarize the outcome and any next steps without including confidential vendor or enforcement details."
      />
      <small className="reporter-outcome__count">{reporterMessage.length}/800</small>
    </label>
    <div className="reporter-outcome__footer">
      <p>The message is delivered through a private notification record. The consumer never receives the full administrative report.</p>
      <button className="btn btn-primary btn-sm" type="button" disabled={!canSend} onClick={onSend}><FiSend /> Review and send</button>
    </div>
  </div>
}

function LguReportAction({ report, user, error }) {
  const caseResolved = report.status === 'resolved'
  const [action, setAction] = useState(report.lguAction || '')
  const [remarks, setRemarks] = useState(report.lguRemarks || '')
  const [message, setMessage] = useState(error)
  const [isSaving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [decisionError, setDecisionError] = useState('')

  useEffect(() => {
    setAction(report.lguAction || '')
    setRemarks(report.lguRemarks || '')
  }, [report.lguAction, report.lguRemarks])

  async function submitDecision() {
    if (!action || caseResolved) return false
    if (remarks.trim().length < 10) {
      setDecisionError('Add a clear decision explanation of at least 10 characters.')
      return false
    }
    setSaving(true)
    setMessage('')
    setDecisionError('')
    try {
      await updateReportWithAudit(
        report.id,
        {
          status: 'resolved',
          lguAction: action,
          lguRemarks: remarks.trim(),
          marketId: 'pasig',
          assignedMarket: 'Pasig Public Market',
        },
        {
          actorId: user.uid || 'lgu-admin',
          actorName: user.name || 'Pasig Public Market Admin',
          action: 'Submitted LGU case decision',
          details: `${getReportCode(report)} — ${actionLabel(action)}`,
          category: 'LGU Case Action',
          marketId: 'pasig',
        },
      )
      setMessage('Decision sent to BFAR-NCR.')
      return true
    } catch (item) {
      setDecisionError(item.message || 'Unable to submit the decision.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return <>
  <main className="report-detail page market-report-detail">
    <Crumb label="Back to escalated reports" report={report} />
    <Summary report={report} kicker="LGU ESCALATED CASE" statusOverride={report.status === 'forwarded-lgu' ? 'Awaiting LGU Action' : undefined} />
    <div className="report-detail__layout">
      <div className="report-detail__main">
        <InfoCard title="Vendor information" icon={FiUser}>
          <div className="detail-facts detail-facts--vendor">
            <Fact label="Vendor Name" value={report.vendorName || 'Not recorded'} />
            <Fact label="Assigned inspector" value={report.assignedInspectorName || 'Awaiting assignment'} />
            <Fact label="Market" value={marketOf(report)} icon={<FiMapPin />} />
            <Fact label="Report source" value={report.sourceType || 'Inspector'} />
          </div>
        </InfoCard>
        <InfoCard title="Inspection information" icon={FiShield}>
          <div className="detail-facts detail-facts--inspection">
            <Fact label="Report title" value={titleOf(report)} />
            <Fact label="Received" value={formatDate(report.createdAt || report.date)} icon={<FiCalendar />} />
          </div>
          <p>{report.description || report.issue || 'No inspection details recorded.'}</p>
        </InfoCard>
        {report.assessment && <InspectionEvidence assessment={report.assessment} />}
        <InfoCard title="Administrative action" icon={FiCheckCircle}>
          {caseResolved && <p className="workflow-guidance">This decision has been submitted to BFAR-NCR and is now read-only.</p>}
          {!caseResolved && <p className="workflow-guidance">BFAR-NCR has formally escalated this case for LGU action. Choose the enforcement response and document the reason before sending the final decision.</p>}
          <label className="detail-field"><span>Action taken</span><select value={action} disabled={caseResolved} onChange={(event) => setAction(event.target.value)}><option value="">Select an action…</option><option value="warning">Issue a written warning</option><option value="remove">Remove product from sale</option><option value="suspend">Suspend vendor operations</option></select></label>
          <label className="detail-field"><span>Remarks</span><textarea value={remarks} disabled={caseResolved} onChange={(event) => setRemarks(event.target.value)} placeholder="Add your decision and instructions for the vendor…" /></label>
          <div className="detail-actions"><Link className="btn btn-outline btn-sm" to="/reports">Back to reports</Link>{!caseResolved && <button className="btn btn-primary btn-sm" disabled={!action || remarks.trim().length < 10 || isSaving} onClick={() => { setDecisionError(''); setConfirmOpen(true) }}><FiSend /> Submit final decision</button>}</div>
          {message && <p className="bfar-review-status">{message}</p>}
        </InfoCard>
      </div>
      <aside className="report-detail__side">
        <InfoCard title="Action history" icon={FiClock}><History report={report} /></InfoCard>
        <InfoCard title="Report metadata" icon={FiFileText}><dl className="metadata"><Fact label="Date received" value={formatDate(report.createdAt || report.date)} /><Fact label="Market" value={marketOf(report)} /><Fact label="Status" value={statusLabel(report.status)} /></dl></InfoCard>
      </aside>
    </div>
  </main>
  <ConfirmDialog
    open={confirmOpen}
    onClose={() => { setConfirmOpen(false); setDecisionError('') }}
    onConfirm={submitDecision}
    title="Submit the final LGU decision?"
    message="This will resolve the escalated case and send the decision to BFAR-NCR. The action and remarks will become read-only."
    confirmLabel="Submit decision"
    pendingLabel="Submitting…"
    error={decisionError}
  />
  </>
}

function Crumb({ label, report }) {
  return <div className="report-detail__crumb"><Link to="/reports"><FiArrowLeft /> {label}</Link><span>{getReportCode(report)} · {reportSourceLabel(report)} report</span></div>
}

function Summary({ report, kicker, statusOverride }) {
  return <div className="report-detail__summary"><div><p className="workspace-kicker">{kicker}</p><h2>{titleOf(report)}</h2><p>{marketOf(report)} · Received {formatDate(report.createdAt || report.date)}</p></div><StatusBadge status={report.status || 'submitted'} label={statusOverride} /></div>
}

function History({ report }) {
  return <ol className="action-history">
    {report.reporterUpdate?.sentAt && <li><strong>Conclusion sent to reporter</strong><span>{report.reporterUpdate.sentByName || 'BFAR-NCR Admin'} · {formatDate(report.reporterUpdate.sentAt)}</span></li>}
    {report.lguAction && <li><strong>LGU action completed</strong><span>{actionLabel(report.lguAction)} · {formatDate(report.updatedAt)}</span></li>}
    <li><strong>{report.assignedInspectorId ? `Assigned to ${report.assignedInspectorName || 'inspector'}` : 'Report submitted for review'}</strong><span>{formatDate(report.updatedAt || report.createdAt || report.date)}</span></li>
    <li><strong>Report submitted</strong><span>{report.createdBy?.name || 'Field inspector'} · {formatDate(report.createdAt || report.date)}</span></li>
  </ol>
}

function InfoCard({ title, icon: Icon, children }) {
  return <section className="detail-card"><header><span><Icon />{title}</span></header><div className="detail-card__body">{children}</div></section>
}

function Fact({ label, value, icon }) {
  return <div className={`detail-fact ${icon ? 'detail-fact--with-icon' : ''}`}>{icon && <span className="detail-fact__icon">{icon}</span>}<dt>{label}</dt><dd>{value}</dd></div>
}

function reporterOf(report) {
  const rawRole = String(report.createdBy?.role || report.sourceType || report.reporterType || '').toLowerCase()
  const role = rawRole.includes('consumer') ? 'consumer' : rawRole.includes('inspector') ? 'inspector' : ''
  return {
    uid: report.createdBy?.uid || report.reporterId || report.consumerId || '',
    name: report.createdBy?.name || report.reporter || (role === 'consumer' ? 'Consumer reporter' : 'Field inspector'),
    role,
  }
}

function actionLabel(action) {
  return ({ warning: 'Written warning issued', remove: 'Product removed from sale', suspend: 'Vendor operations suspended' })[action]
    || 'LGU conclusion recorded'
}

function roleLabel(role) {
  return role === 'consumer' ? 'Consumer' : role === 'inspector' ? 'Inspector' : 'Unknown reporter'
}

function titleOf(report) { return report.title || report.issue || 'Inspection report' }
function marketOf(report) { return report.assignedMarket || report.location || 'Pasig Public Market' }
function canonicalReportFields(report) {
  return {
    reportCode: getReportCode(report),
    title: titleOf(report),
    vendorName: report.vendorName || report.vendor?.vendorName || 'Vendor not recorded',
    assignedMarket: 'Pasig Public Market',
    marketId: 'pasig',
    description: report.description || report.inspector?.findings || report.issue || 'No findings recorded.',
    sourceType: report.sourceType || 'inspector',
  }
}
function displayName(inspector) { return inspector.name || inspector.displayName || inspector.email || `Inspector ${inspector.id.slice(0, 6)}` }
function timestampValue(value) { return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0) }
function formatDate(value) { const timestamp = timestampValue(value); return timestamp ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp)) : 'Not recorded' }
function statusLabel(status) { return String(status || 'submitted').replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function evidenceValue(value) { return value === null || value === undefined || value === '' ? 'Not recorded' : String(value) }
function withUnit(value, unit) {
  const text = evidenceValue(value)
  if (text === 'Not recorded' || text.toLowerCase().includes(unit.toLowerCase())) return text
  return unit === '%' ? `${text}%` : `${text} ${unit}`
}

function reportWorkflowError(error) {
  const denied = String(error?.code || '').includes('permission-denied')
    || /missing or insufficient permissions/i.test(error?.message || '')
  return denied
    ? 'This Inspector report uses the nested mobile schema, but the compatible Firestore forwarding rules are not active yet. Publish the latest firestore.rules file and try again.'
    : error?.message || 'Unable to save the report.'
}
