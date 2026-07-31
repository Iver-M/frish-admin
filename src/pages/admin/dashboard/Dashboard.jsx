import { Link } from 'react-router-dom'
import { FiAlertTriangle, FiArrowRight, FiCheckCircle, FiClock, FiFileText, FiUsers } from 'react-icons/fi'
import StatCard from '../../../components/StatCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getDashboardStats, getRecentAssessments, getRecentReports } from '../../../data/dashboard.js'
import { getAssessments } from '../../../data/assessments.js'
import { getReports } from '../../../data/reports.js'
import { getInspectors } from '../../../data/inspectors.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import sampleMackerel from '../../../assets/images/samples/sample-mackerel.jpg'
import sampleGalunggong from '../../../assets/images/samples/sample-galunggong.jpg'
import './Dashboard.css'

const ACTIVITY = [
  ['Added New Assessment', 'DLG-2026-081', '6:00 am'],
  ['Flagged for Investigation', 'REP-2026-069', '6:15 am'],
  ['Passed with 92% confidence', 'DLG-2026-290', '6:15 am'],
  ['Failed — confidence 40%', 'GG-447', '7:00 am'],
]

export default function Dashboard() {
  const { user, isMarketAdmin } = useAuth()
  const assessments = scopeByMarket(getRecentAssessments(), user).slice(0, 4)
  const reports = scopeByMarket(getRecentReports(), user).slice(0, 5)

  const stats = (() => {
    if (!isMarketAdmin) return getDashboardStats()
    const scopedAssessments = scopeByMarket(getAssessments(), user)
    const scopedReports = scopeByMarket(getReports(), user)
    const scopedInspectors = scopeByMarket(getInspectors(), user)
    const fresh = scopedAssessments.filter((item) => item.status === 'fresh').length
    const pending = scopedReports.filter((item) => ['pending', 'investigating', 'assigned'].includes(item.status)).length
    return [
      { id: 'pending', label: 'Pending Review', value: String(pending), sublabel: 'Needs your review', icon: 'pending' },
      { id: 'investigating', label: 'Under Investigation', value: String(scopedReports.filter((item) => item.status === 'investigating').length), sublabel: 'Open cases', icon: 'investigating' },
      { id: 'completed', label: 'Completed', value: String(scopedAssessments.length), sublabel: 'This week', icon: 'validated' },
      { id: 'watch', label: 'Reports under watch', value: String(Math.max(scopedInspectors.length, fresh)), sublabel: 'Fresh', icon: 'pass-rate' },
    ]
  })()

  return (
    <div className={`dashboard page ${isMarketAdmin ? 'dashboard--market' : 'dashboard--bfar'}`}>
      {isMarketAdmin ? (
        <section className="dashboard__hero">
          <span>LGU MARKET ADMIN</span>
          <h2>Good morning, Officer.</h2>
          <p>Here’s your market’s escalation activity at a glance.</p>
        </section>
      ) : (
        <section className="dashboard__intro">
          <h2>Dashboard</h2>
          <p>Welcome back to FRISH Admin Portal</p>
        </section>
      )}

      <div className="stat-grid">{stats.map((stat) => <StatCard key={stat.id} {...stat} />)}</div>

      {isMarketAdmin ? <MarketOverview reports={reports} /> : <BfarOverview assessments={assessments} reports={reports} />}
    </div>
  )
}

function BfarOverview({ assessments, reports }) {
  return (
    <>
      <div className="dashboard__split">
        <section className="dashboard-panel">
          <PanelHeading title="Recent Freshness Assessments" subtitle="Latest assessments submitted by operators" to="/assessments" />
          <div className="dashboard-list">
            {assessments.map((item, index) => <AssessmentRow item={item} key={item.id} image={index < 2 ? sampleMackerel : sampleGalunggong} />)}
          </div>
        </section>
        <section className="dashboard-panel dashboard-panel--activity">
          <PanelHeading title="Recent Activities" to="/audit-trail" />
          <div className="activity-list">{ACTIVITY.map(([title, id, time]) => <div className="activity-row" key={id}><span className="activity-row__avatar"><FiUsers /></span><span><strong>{title}</strong><small>{id}</small></span><time>{time}</time></div>)}</div>
        </section>
      </div>
      <ReportsPanel reports={reports} />
    </>
  )
}

function MarketOverview({ reports }) {
  const vendors = ['Gian Carlo', 'Ivan James', 'Herminia Dela', 'Robert Butternut', 'Jon Adrian']
  return <div className="dashboard__split dashboard__split--market">
    <section className="dashboard-panel">
      <PanelHeading title="Recent Escalations" subtitle="Forwarded by BFAR-NCR admin" to="/reports" />
      <div className="escalation-list">{reports.map((report) => <EscalationRow key={report.id} report={report} />)}</div>
    </section>
    <section className="dashboard-panel dashboard-panel--vendors">
      <PanelHeading title="Vendors" subtitle="Under Watch" to="/vendors" />
      <div className="vendor-list">{vendors.map((vendor, index) => <div className="vendor-row" key={vendor}><span className="vendor-row__avatar"><FiUsers /></span><span><strong>{vendor}</strong><small>Pasig Public Market · Stall {index + 1}</small></span><b>{index % 3 + 1} Violations</b></div>)}</div>
    </section>
  </div>
}

function ReportsPanel({ reports }) {
  return <section className="dashboard-panel dashboard-panel--reports"><PanelHeading title="Recent Reports" subtitle="Consumer and inspector submitted reports" to="/reports" /><div className="report-list">{reports.map((report) => <div className="report-row" key={report.id}><span><strong>{report.id}</strong><small>{report.market} · Submitted by {report.submittedBy}</small></span><StatusBadge status={report.status} /><Link to="/reports" className="report-row__open">Open</Link></div>)}</div></section>
}

function PanelHeading({ title, subtitle, to }) { return <div className="dashboard-panel__heading"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{to && <Link to={to} aria-label={`View all ${title.toLowerCase()}`}>View all</Link>}</div> }
function AssessmentRow({ item, image }) { return <div className="assessment-row"><span><strong>{item.id}</strong><small>Inspector: {item.inspector} · {item.date}</small><small>{item.species}</small></span><img src={image} alt={item.species} /><span className="assessment-row__status"><StatusBadge status={item.status} /><small>Confidence {item.confidence}</small></span></div> }
function EscalationRow({ report }) { const icon = report.status === 'validated' ? <FiCheckCircle /> : report.status === 'pending' ? <FiClock /> : <FiAlertTriangle />; return <article className="escalation-row"><div><strong>{report.id}</strong><span> · {report.reporterType || 'Consumer'} Report</span><h4>{report.market} — Galunggong (Round Scad)</h4><small>{report.market} · Received {report.date}</small></div><span className="escalation-row__status">{icon}<StatusBadge status={report.status} /></span></article> }
