import { useMemo, useState } from 'react'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import { getAuditLogs } from '../../../data/audit.js'

export default function AuditTrail() {
  const logs = getAuditLogs()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(query.toLowerCase()) ||
        l.module.toLowerCase().includes(query.toLowerCase()) ||
        l.admin.toLowerCase().includes(query.toLowerCase())
    )
  }, [logs, query])

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'admin', header: 'Admin' },
    { key: 'action', header: 'Action' },
    { key: 'module', header: 'Affected Module' },
    { key: 'ip', header: 'IP Address' },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Audit Trail</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by action, module, or admin..." />
      </div>

      <TableCard
        title="System Activity Log"
        subtitle="A record of administrative actions taken across FRISH"
        columns={columns}
        rows={filtered}
        emptyMessage="No audit records match your search."
      />
    </div>
  )
}
