import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCalendar, FiCamera, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiPaperclip, FiSend, FiShield, FiUser, FiUserPlus } from 'react-icons/fi'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getReports } from '../../../data/reports.js'
import { getInspectors } from '../../../data/inspectors.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import './ReportDetail.css'

export default function ReportDetail() {
  const { reportId } = useParams()
  const { user, isMarketAdmin, isBfarAdmin } = useAuth()
  const report = useMemo(() => scopeByMarket(getReports(), user).find((item) => item.id === reportId), [reportId, user])
  const [action, setAction] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!report) return <Navigate to="/reports" replace />

  if (isBfarAdmin) return <BfarReportReview report={report} user={user} />

  const species = getSpecies(report)
  const date = new Intl.DateTimeFormat('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${report.date}T00:00:00`))

  return <main className="report-detail page">
    <div className="report-detail__crumb"><Link to="/reports"><FiArrowLeft /> Back to escalated reports</Link><span>{report.id} · {report.reporterType} report</span></div>
    <div className="report-detail__summary"><div><p className="workspace-kicker">ESCALATED REPORT</p><h2>{report.reporter} — {species}</h2><p>{report.location} · Received {date}, {report.time}</p></div><StatusBadge status={submitted ? 'forwarded-lgu' : report.status} /></div>

    <div className="report-detail__layout">
      <div className="report-detail__main">
        <InfoCard title="Vendor Information" icon={FiUser}>
          <div className="detail-facts detail-facts--vendor"><Fact label="Vendor Name" value={report.reporter} /><Fact label="Stall Number" value="FF-SH-042" /><Fact label="Market" value={report.location} icon={<FiMapPin />} /><a href="#history">View vendor history →</a></div>
        </InfoCard>

        <InfoCard title="Inspection Information" icon={FiShield}>
          <div className="detail-facts detail-facts--inspection"><Fact label="Inspector" value={report.assignedInspector === 'Unassigned' ? 'To be assigned' : report.assignedInspector} /><Fact label="Inspection Date" value={`${date} · ${report.time}`} icon={<FiCalendar />} /></div>
          <div className="inspection-stats"><Metric label="Freshness Classification" value={report.status === 'validated' ? 'Validated' : 'Spoiled'} danger={report.status !== 'validated'} /><Metric label="Shelf-life Prediction" value="0 hours — unsafe for sale" /><Metric label="Temperature" value="14.4°C" /><Metric label="Humidity" value="73%" /><Metric label="Ammonia" value="3.0%" /><Metric label="TMA-N" value="35%" /></div>
          <div className="photo-label">Inspection photos</div><div className="inspection-photos">{[1, 2, 3].map((item) => <button key={item} className="photo-placeholder" aria-label={`Inspection photo ${item}`}><FiCamera /></button>)}</div>
        </InfoCard>

        <InfoCard title="BFAR-NCR Findings" icon={FiFileText}>
          <p className="finding-lead">Investigation summary</p><p>The submitted assessment indicates a high probability that the product is unsafe for sale. Visual inspection records observed spoilage indicators consistent with the report.</p><p className="finding-note">Assessment reference: {report.id} · Inspection protocol verified</p><div className="finding-callout"><strong>Recommended BFAR administrative action</strong><span>Escalate for market-level action. Keep the product off display pending the LGU’s decision.</span></div>
        </InfoCard>

        <InfoCard title="Administrative Action" icon={FiCheckCircle}>
          <label className="detail-field"><span>Action taken</span><select value={action} onChange={(event) => setAction(event.target.value)}><option value="">Select an action…</option><option value="warning">Issue a written warning</option><option value="remove">Remove product from sale</option><option value="suspend">Suspend vendor operations</option></select></label>
          <label className="detail-field"><span>Remarks</span><textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Add your decision and any instructions for the vendor…" /></label>
          <label className="upload-zone"><FiPaperclip /><span>Supporting documents (optional)</span><small>Drop files here or click to upload</small><input type="file" multiple /></label>
          <div className="detail-actions"><Link className="btn btn-outline btn-sm" to="/reports">Save draft</Link><button className="btn btn-primary btn-sm" disabled={!action} onClick={() => setSubmitted(true)}><FiSend /> Send decision to BFAR-NCR</button></div>
        </InfoCard>
      </div>

      <aside className="report-detail__side"><InfoCard title="Action History" icon={FiClock}><ol className="action-history" id="history"><li><strong>{submitted ? 'Decision sent to BFAR-NCR' : 'Report received from BFAR-NCR'}</strong><span>{submitted ? 'LGU market admin' : 'BFAR-NCR market admin'} · {date}</span></li><li><strong>Assessment escalated</strong><span>Automated FRISH review · {date}</span></li></ol></InfoCard><InfoCard title="Report Metadata" icon={FiFileText}><dl className="metadata"><Fact label="Date received" value={date} /><Fact label="Report type" value={report.reporterType} /><Fact label="Market" value={report.location} /><Fact label="Fish species" value={species} /></dl></InfoCard></aside>
    </div>
  </main>
}

function BfarReportReview({ report, user }) {
  const inspectors = useMemo(() => scopeByMarket(getInspectors(), user).filter((item) => item.status === 'active'), [user])
  const [assignedInspector, setAssignedInspector] = useState(report.assignedInspector === 'Unassigned' ? '' : report.assignedInspector)
  const [reviewNotes, setReviewNotes] = useState('')
  const [validated, setValidated] = useState(report.status === 'validated' || report.status === 'forwarded-lgu')
  const [forwarded, setForwarded] = useState(report.status === 'forwarded-lgu')
  const date = new Intl.DateTimeFormat('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${report.date}T00:00:00`))
  const status = forwarded ? 'forwarded-lgu' : validated ? 'validated' : report.status

  return <main className="report-detail bfar-report-review page"><div className="report-detail__crumb"><Link to="/reports"><FiArrowLeft /> Back to report management</Link><span>{report.id} · {report.reporterType} report</span></div><div className="report-detail__summary"><div><p className="workspace-kicker">BFAR-NCR REPORT REVIEW</p><h2>{report.issue}</h2><p>{report.location} · Received {date}, {report.time}</p></div><StatusBadge status={status} /></div><div className="report-detail__layout"><div className="report-detail__main"><InfoCard title="Completeness and report details" icon={FiFileText}><div className="detail-facts detail-facts--vendor"><Fact label="Reporter" value={`${report.reporter} (${report.reporterType})`} /><Fact label="Concerned vendor" value={report.vendorName || 'Not recorded'} /><Fact label="Market / location" value={report.location} icon={<FiMapPin />} /><Fact label="Supporting evidence" value="Evidence attached to report record" icon={<FiPaperclip />} /></div><div className="finding-callout"><strong>Review requirement</strong><span>Confirm the vendor, market location, issue details, and supporting evidence before assigning field validation.</span></div></InfoCard><InfoCard title="Inspector assignment and validation" icon={FiShield}><label className="detail-field"><span>Assigned inspector</span><select value={assignedInspector} onChange={(event) => setAssignedInspector(event.target.value)}><option value="">Choose an authorized inspector…</option>{inspectors.map((inspector) => <option key={inspector.id} value={inspector.name}>{inspector.name} — {inspector.assignedArea}</option>)}</select></label><div className="review-action-row"><button className="btn btn-outline btn-sm" disabled={!assignedInspector}><FiUserPlus /> Assign inspector</button><button className="btn btn-outline btn-sm" onClick={() => setValidated(true)} disabled={!assignedInspector || validated}><FiCheckCircle /> Mark validation complete</button></div><p className="bfar-review-status">{validated ? 'Validation findings are ready for final review.' : 'Assign an active inspector before marking this report validated.'}</p></InfoCard><InfoCard title="Final BFAR decision" icon={FiCheckCircle}><label className="detail-field"><span>Review notes</span><textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Record completeness checks, inspector findings, and the basis for the final decision…" /></label><div className="detail-actions"><Link className="btn btn-outline btn-sm" to="/reports">Save draft</Link><button className="btn btn-primary btn-sm" disabled={!validated || forwarded} onClick={() => setForwarded(true)}><FiSend /> {forwarded ? 'Forwarded to LGU' : 'Forward validated report to LGU'}</button></div></InfoCard></div><aside className="report-detail__side"><InfoCard title="Workflow status" icon={FiClock}><ol className="action-history"><li><strong>{forwarded ? 'Forwarded to LGU Market Admin' : validated ? 'Validated for LGU action' : 'Received for BFAR completeness review'}</strong><span>BFAR-NCR · {date}</span></li><li><strong>Report submitted</strong><span>{report.reporter} · {date}</span></li></ol></InfoCard><InfoCard title="Current record" icon={FiUser}><dl className="metadata"><Fact label="Vendor" value={report.vendorName || 'Not recorded'} /><Fact label="Assigned inspector" value={assignedInspector || 'Unassigned'} /><Fact label="Validation result" value={validated ? 'Validated for final review' : report.validationResult || 'Pending validation'} /><Fact label="Status" value={forwarded ? 'Forwarded to LGU' : validated ? 'Validated' : 'Under review'} /></dl></InfoCard></aside></div></main>
}

function InfoCard({ title, icon: Icon, children }) { return <section className="detail-card"><header><span><Icon />{title}</span></header><div className="detail-card__body">{children}</div></section> }
function Fact({ label, value, icon }) { return <div className={`detail-fact ${icon ? 'detail-fact--with-icon' : ''}`}>{icon && <span className="detail-fact__icon">{icon}</span>}<dt>{label}</dt><dd>{value}</dd></div> }
function Metric({ label, value, danger }) { return <div className="inspection-metric"><span>{label}</span><strong className={danger ? 'is-danger' : ''}>{value}</strong></div> }
function getSpecies(report) { const match = report.issue.match(/tilapia|sardines|galunggong|fish/i); return match ? `${match[0][0].toUpperCase()}${match[0].slice(1)}${/galunggong/i.test(match[0]) ? ' (Round Scad)' : ''}` : 'Fish product' }
