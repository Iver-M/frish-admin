import { useMemo, useState } from 'react'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatCard from '../../../components/StatCard.jsx'
import { getAuditLogs } from '../../../data/audit.js'
import { getAdmins } from '../../../data/admins.js'
import './AuditTrail.css'

// Cycles a small set of badge tones across categories so each one reads
// distinctly without hand-picking a color per category.
const CATEGORY_TONES = ['danger', 'info', 'success', 'warning', 'neutral']

export default function AuditTrail() {
  const logs = getAuditLogs()
  const admins = getAdmins()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = useMemo(() => Array.from(new Set(logs.map((l) => l.category))).sort(), [logs])

  const categoryTone = useMemo(() => {
    const map = {}
    categories.forEach((c, i) => {
      map[c] = CATEGORY_TONES[i % CATEGORY_TONES.length]
    })
    return map
  }, [categories])

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchesQuery =
        l.admin.toLowerCase().includes(query.toLowerCase()) ||
        l.action.toLowerCase().includes(query.toLowerCase()) ||
        l.details.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [logs, query, categoryFilter])

  // "Total Activities" and "Today's Activity" stand in for what would be a
  // real backend count across the full history — the dummy list below only
  // shows a handful of representative entries, same pattern as the
  // Dashboard's stat cards vs. its "Recent" tables.
  const stats = [
    { id: 'total', label: 'Total Activities', value: '5,847', icon: 'activity', trend: 'flat' },
    { id: 'today', label: "Today's Activity", value: '127', icon: 'pending', trend: 'flat' },
    { id: 'active-users', label: 'Active Users', value: String(admins.filter((a) => a.status === 'active').length), icon: 'active', trend: 'flat' },
    { id: 'categories', label: 'Action Categories', value: String(categories.length), icon: 'categories', trend: 'flat' },
  ]

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'admin', header: 'User' },
    { key: 'action', header: 'Action' },
    { key: 'details', header: 'Details' },
    {
      key: 'category',
      header: 'Categories',
      render: (row) => (
        <span className={`status-badge status-badge--${categoryTone[row.category]}`}>{row.category}</span>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h2>Audit Trail</h2>
          <p className="page-header-row__subtitle">Monitor system activities and user actions</p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by user, action, or details..." />
        <select className="select-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <TableCard
        title={`Activity Logs (${filtered.length})`}
        subtitle="Comprehensive log of all system activities and user actions"
        columns={columns}
        rows={filtered}
        emptyMessage="No activity matches your search."
      />
    </div>
  )
}
