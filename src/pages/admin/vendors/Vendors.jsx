import { useMemo, useState } from 'react'
import { FiEye, FiSlash, FiCheckCircle } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import { getVendors } from '../../../data/vendors.js'

export default function Vendors() {
  const [vendors, setVendors] = useState(getVendors())
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)
  const [toggling, setToggling] = useState(null)

  const filtered = useMemo(() => {
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.market.toLowerCase().includes(query.toLowerCase()) ||
        v.registration.toLowerCase().includes(query.toLowerCase())
    )
  }, [vendors, query])

  function handleToggleConfirm() {
    if (!toggling) return
    setVendors((prev) =>
      prev.map((v) =>
        v.id === toggling.id ? { ...v, status: v.status === 'suspended' ? 'active' : 'suspended' } : v
      )
    )
    setToggling(null)
  }

  const columns = [
    { key: 'name', header: 'Vendor Name' },
    { key: 'market', header: 'Market' },
    { key: 'stallNumber', header: 'Stall Number' },
    { key: 'registration', header: 'Registration' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setViewing(row)}>
            <FiEye size={13} /> View
          </button>
          {row.status === 'suspended' ? (
            <button className="btn btn-outline btn-sm" onClick={() => setToggling(row)}>
              <FiCheckCircle size={13} /> Reinstate
            </button>
          ) : (
            <button className="btn btn-danger-outline btn-sm" onClick={() => setToggling(row)}>
              <FiSlash size={13} /> Suspend
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Vendors</h2>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by name, market, or registration..." />
      </div>

      <TableCard columns={columns} rows={filtered} emptyMessage="No vendors match your search." />

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
          <div className="detail-grid">
            <p><strong>Market:</strong> {viewing.market}</p>
            <p><strong>Stall Number:</strong> {viewing.stallNumber}</p>
            <p><strong>Registration:</strong> {viewing.registration}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={handleToggleConfirm}
        title={toggling?.status === 'suspended' ? 'Reinstate vendor?' : 'Suspend vendor?'}
        message={
          toggling
            ? toggling.status === 'suspended'
              ? `${toggling.name} will be reinstated and allowed to operate again.`
              : `${toggling.name} will be suspended from operating until reinstated.`
            : ''
        }
        confirmLabel={toggling?.status === 'suspended' ? 'Reinstate' : 'Suspend'}
        danger={toggling?.status !== 'suspended'}
      />
    </div>
  )
}
