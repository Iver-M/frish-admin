import StatCard from '../../../components/StatCard.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { getDashboardStats, getRecentAssessments, getRecentReports } from '../../../data/dashboard.js'
import './Dashboard.css'

export default function Dashboard() {
  const stats = getDashboardStats()
  const assessments = getRecentAssessments()
  const reports = getRecentReports()

  const assessmentColumns = [
    { key: 'id', header: 'Assessment ID' },
    { key: 'species', header: 'Fish Species' },
    { key: 'freshness', header: 'Freshness' },
    { key: 'confidence', header: 'Confidence' },
    { key: 'inspector', header: 'Inspector' },
    { key: 'date', header: 'Date' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ]

  const reportColumns = [
    { key: 'id', header: 'Report ID' },
    { key: 'submittedBy', header: 'Reporter' },
    { key: 'market', header: 'Market' },
    { key: 'issue', header: 'Issue' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'date', header: 'Date' },
  ]

  return (
    <div className="page">
      <div className="stat-grid">
        {stats.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      <TableCard
        title="Recent Freshness Assessments"
        subtitle="Latest assessments submitted by inspectors"
        columns={assessmentColumns}
        rows={assessments}
      />

      <TableCard
        title="Recent Reports"
        subtitle="Consumer and inspector submitted reports"
        columns={reportColumns}
        rows={reports}
      />
    </div>
  )
}
