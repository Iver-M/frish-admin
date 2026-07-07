import { useMemo, useState } from 'react'
import { FiEye, FiUserPlus, FiCheckCircle } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { getReports } from '../../../data/reports.js'
import { getInspectors } from '../../../data/inspectors.js'
import './Reports.css'

export default function Reports() {
  const [reports, setReports] = useState(getReports())
  const inspectors = getInspectors()
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)
  const [assigning, setAssigning] = useState(null)
  const [resolving, setResolving] = useState(null)
  const [chosenInspector, setChosenInspector] = useState('')

  const filtered = useMemo(() => {
    return reports.filter(
      (r) =>
        r.id.toLowerCase().includes(query.toLowerCase()) ||
        r.reporter.toLowerCase().includes(query.toLowerCase()) ||
        r.location.toLowerCase().includes(query.toLowerCase())
    )
  }, [reports, query])

  function handleAssignConfirm() {
    if (!assigning || !chosenInspector) return
    setReports((prev) =>
      prev.map((r) =>
        r.id === assigning.id ? { ...r, assignedInspector: chosenInspector, status: 'assigned' } : r
      )
    )
    setAssigning(null)
    setChosenInspector('')
  }

  function handleResolveConfirm() {
    if (!resolving) return
    setReports((prev) => prev.map((r) => (r.id === resolving.id ? { ...r, status: 'resolved' } : r)))
    setResolving(null)
  }

  const columns = [
    { key: 'id', header: 'Report ID' },
    { key: 'reporter', header: 'Reporter' },
    { key: 'location', header: 'Location' },
    { key: 'issue', header: 'Issue' },
    { key: 'assignedInspector', header: 'Assigned Inspector' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'date', header: 'Date' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setViewing(row)}>
            <FiEye size={13} /> View
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setAssigning(row)
              setChosenInspector(row.assignedInspector !== 'Unassigned' ? row.assignedInspector : '')
            }}
          >
            <FiUserPlus size={13} /> Assign
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setResolving(row)}
            disabled={row.status === 'resolved'}
          >
            <FiCheckCircle size={13} /> Resolve
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Reports</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by ID, reporter, or location..." />
      </div>

      <TableCard columns={columns} rows={filtered} emptyMessage="No reports match your search." />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Report ${viewing.id}` : ''}
        footer={
          <button className="btn btn-primary btn-sm" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <div className="detail-grid">
            <p><strong>Reporter:</strong> {viewing.reporter} ({viewing.reporterType})</p>
            <p><strong>Location:</strong> {viewing.location}</p>
            <p><strong>Issue:</strong> {viewing.issue}</p>
            <p><strong>Assigned Inspector:</strong> {viewing.assignedInspector}</p>
            <p><strong>Date Filed:</strong> {viewing.date}</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!assigning}
        onClose={() => setAssigning(null)}
        title={assigning ? `Assign Inspector — ${assigning.id}` : ''}
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setAssigning(null)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAssignConfirm} disabled={!chosenInspector}>
              Assign
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Select Inspector</label>
          <select
            className="select-input"
            value={chosenInspector}
            onChange={(e) => setChosenInspector(e.target.value)}
          >
            <option value="">Choose an inspector...</option>
            {inspectors.map((i) => (
              <option key={i.id} value={i.name}>
                {i.name} — {i.region}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!resolving}
        onClose={() => setResolving(null)}
        onConfirm={handleResolveConfirm}
        title="Mark report as resolved?"
        message={resolving ? `This will mark report ${resolving.id} as resolved.` : ''}
        confirmLabel="Mark Resolved"
      />
    </div>
  )
}
