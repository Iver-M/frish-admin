import { useMemo, useState } from 'react'
import { FiEye } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import { getInspectors } from '../../../data/inspectors.js'
import './Inspectors.css'

export default function Inspectors() {
  const inspectors = getInspectors()
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)

  const filtered = useMemo(() => {
    return inspectors.filter(
      (i) =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.region.toLowerCase().includes(query.toLowerCase()) ||
        i.id.toLowerCase().includes(query.toLowerCase())
    )
  }, [inspectors, query])

  const columns = [
    {
      key: 'photo',
      header: 'Profile Photo',
      render: (row) => <div className="avatar-circle">{row.photo}</div>,
    },
    { key: 'name', header: 'Inspector Name' },
    { key: 'id', header: 'Employee ID' },
    { key: 'region', header: 'Region' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button className="btn btn-outline btn-sm" onClick={() => setViewing(row)}>
          <FiEye size={13} /> View Profile
        </button>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Inspectors</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name, ID, or region..." />
      </div>

      <TableCard columns={columns} rows={filtered} emptyMessage="No inspectors match your search." />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.name : ''}
        footer={
          <button className="btn btn-primary btn-sm" onClick={() => setViewing(null)}>
            Close
          </button>
        }
      >
        {viewing && (
          <div className="inspector-profile">
            <div className="avatar-circle avatar-circle--lg">{viewing.photo}</div>
            <div className="detail-grid">
              <p><strong>Employee ID:</strong> {viewing.id}</p>
              <p><strong>Region:</strong> {viewing.region}</p>
              <p><strong>Email:</strong> {viewing.email}</p>
              <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
