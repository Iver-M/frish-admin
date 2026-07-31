import { useState } from 'react'
import { FiPlus, FiSlash, FiCheckCircle } from 'react-icons/fi'
import TableCard from '../../../components/TableCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { getAdmins } from '../../../data/admins.js'
import { getMarkets } from '../../../data/markets.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import './ManageAdmins.css'

const ROLE_LABELS = {
  bfar_admin: 'BFAR Admin',
  market_admin: 'Market Admin',
}

export default function ManageAdmins() {
  const markets = getMarkets()
  const [admins, setAdmins] = useState(getAdmins())
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'market_admin', marketId: markets[0]?.id || '' })

  function marketName(marketId) {
    return markets.find((m) => m.id === marketId)?.name || '—'
  }

  function handleCreate(e) {
    e.preventDefault()
    // UI only — in production this calls a Cloud Function that creates the
    // Firebase Auth user and sets their custom claims (role, marketId).
    // The client never sets claims directly.
    const newAdmin = {
      id: `ADM-${String(admins.length + 1).padStart(3, '0')}`,
      name: form.name,
      email: form.email,
      role: form.role,
      marketId: form.role === 'market_admin' ? form.marketId : null,
      status: 'active',
      dateAdded: new Date().toISOString().slice(0, 10),
    }
    setAdmins((prev) => [newAdmin, ...prev])
    setCreating(false)
    setForm({ name: '', email: '', role: 'market_admin', marketId: markets[0]?.id || '' })
  }

  function handleToggleConfirm() {
    if (!toggling) return
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === toggling.id ? { ...a, status: a.status === 'suspended' ? 'active' : 'suspended' } : a
      )
    )
    setToggling(null)
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => ROLE_LABELS[row.role] },
    { key: 'market', header: 'Assigned Market', render: (row) => (row.marketId ? marketName(row.marketId) : 'All Markets') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'dateAdded', header: 'Date Added' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.role === 'bfar_admin' ? (
          <span className="manage-admins__protected">Protected</span>
        ) : row.status === 'suspended' ? (
          <button className="btn btn-outline btn-sm" onClick={() => setToggling(row)}>
            <FiCheckCircle size={13} /> Reinstate
          </button>
        ) : (
          <button className="btn btn-danger-outline btn-sm" onClick={() => setToggling(row)}>
            <FiSlash size={13} /> Suspend
          </button>
        ),
    },
  ]

  return (
    <div className="page">
      <BfarBannerAction><button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus size={15} /> Add Admin</button></BfarBannerAction>

      <p className="manage-admins__note">
        BFAR Admin accounts have full system-wide access. Market Admin accounts are scoped to exactly
        one assigned market and cannot view or modify data outside it.
      </p>

      <TableCard columns={columns} rows={admins} emptyMessage="No admin accounts yet." />

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add Admin Account"
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.email.trim()}
            >
              Create Account
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              className="text-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rosario Bautista"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="text-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@frish.gov.ph"
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              className="select-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="market_admin">Market Admin</option>
              <option value="bfar_admin">BFAR Admin</option>
            </select>
          </div>
          {form.role === 'market_admin' && (
            <div className="form-group">
              <label>Assigned Market</label>
              <select
                className="select-input"
                value={form.marketId}
                onChange={(e) => setForm({ ...form, marketId: e.target.value })}
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={handleToggleConfirm}
        title={toggling?.status === 'suspended' ? 'Reinstate this admin?' : 'Suspend this admin?'}
        message={
          toggling
            ? toggling.status === 'suspended'
              ? `${toggling.name} will regain access to the admin portal.`
              : `${toggling.name} will immediately lose access to the admin portal.`
            : ''
        }
        confirmLabel={toggling?.status === 'suspended' ? 'Reinstate' : 'Suspend'}
        danger={toggling?.status !== 'suspended'}
      />
    </div>
  )
}
