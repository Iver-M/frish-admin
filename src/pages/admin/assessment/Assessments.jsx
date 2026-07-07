import { useMemo, useState } from 'react'
import { FiDownload, FiEye } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Pagination from '../../../components/Pagination.jsx'
import Modal from '../../../components/Modal.jsx'
import { getAssessments } from '../../../data/assessments.js'
import './Assessments.css'

const PAGE_SIZE = 6

const FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'fresh', label: 'Fresh' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'not-fresh', label: 'Not Fresh' },
]

export default function Assessments() {
  const allAssessments = getAssessments()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    return allAssessments.filter((a) => {
      const matchesQuery =
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.species.toLowerCase().includes(query.toLowerCase()) ||
        a.inspector.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [allAssessments, query, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleQueryChange(v) {
    setQuery(v)
    setPage(1)
  }

  function handleFilterChange(v) {
    setStatusFilter(v)
    setPage(1)
  }

  function handleExport() {
    // UI only — wire this up to a real CSV/PDF export once a backend exists.
    alert('Export started (UI only). This will generate a CSV/PDF once connected to a backend.')
  }

  const columns = [
    { key: 'id', header: 'Assessment ID' },
    { key: 'species', header: 'Fish Species' },
    { key: 'prediction', header: 'Prediction' },
    { key: 'confidence', header: 'Confidence', render: (row) => `${row.confidence}%` },
    { key: 'shelfLife', header: 'Shelf Life' },
    { key: 'inspector', header: 'Inspector' },
    { key: 'createdDate', header: 'Created Date' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'action',
      header: '',
      render: (row) => (
        <button className="btn btn-outline btn-sm" onClick={() => setSelected(row)}>
          <FiEye size={14} /> View
        </button>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Assessments</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={handleQueryChange} placeholder="Search by ID, species, or inspector..." />
        <select className="select-input" value={statusFilter} onChange={(e) => handleFilterChange(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="toolbar-spacer" />
        <button className="btn btn-outline" onClick={handleExport}>
          <FiDownload size={15} /> Export
        </button>
      </div>

      <TableCard columns={columns} rows={pageRows} emptyMessage="No assessments match your search." />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Assessment ${selected.id}` : ''}
        footer={
          <button className="btn btn-primary btn-sm" onClick={() => setSelected(null)}>
            Close
          </button>
        }
      >
        {selected && (
          <div className="detail-grid">
            <DetailRow label="Fish Species" value={selected.species} />
            <DetailRow label="Prediction" value={selected.prediction} />
            <DetailRow label="Confidence" value={`${selected.confidence}%`} />
            <DetailRow label="Estimated Shelf Life" value={selected.shelfLife} />
            <DetailRow label="Inspector" value={selected.inspector} />
            <DetailRow label="Location" value={selected.location} />
            <DetailRow label="Created Date" value={selected.createdDate} />
            <DetailRow label="Notes" value={selected.notes} />
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  )
}
