import { useMemo, useState } from 'react'
import { FiEye, FiEdit2, FiUserX, FiUserCheck, FiPlus, FiRotateCcw } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatCard from '../../../components/StatCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { getInspectors } from '../../../data/inspectors.js'
import { getMarkets } from '../../../data/markets.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import './Inspectors.css'

const FILTERS = [
  { value: 'all', label: 'All Records' },
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
]

export default function Inspectors() {
  const { user, isBfarAdmin } = useAuth()
  const markets = getMarkets()
  const [inspectors, setInspectors] = useState(getInspectors())
  const scopedInspectors = useMemo(() => scopeByMarket(inspectors, user), [inspectors, user])

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [marketFilter, setMarketFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [deactivating, setDeactivating] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', marketId: markets[0]?.id || '' })

  const filtered = useMemo(() => {
    return scopedInspectors.filter((i) => {
      const matchesQuery =
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.id.toLowerCase().includes(query.toLowerCase()) ||
        i.assignedArea.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || i.status === statusFilter
      const matchesMarket = marketFilter === 'all' || i.marketId === marketFilter
      return matchesQuery && matchesStatus && matchesMarket
    })
  }, [scopedInspectors, query, statusFilter, marketFilter])

  const stats = useMemo(() => {
    const active = scopedInspectors.filter((i) => i.status === 'active').length
    const inactive = scopedInspectors.filter((i) => i.status === 'inactive').length
    return [
      { id: 'total', label: 'Total Inspectors', value: String(scopedInspectors.length), icon: 'inspectors', trend: 'flat' },
      { id: 'active', label: 'Active', value: String(active), icon: 'active', trend: 'flat' },
      { id: 'inactive', label: 'Inactive', value: String(inactive), icon: 'inactive', trend: 'flat' },
    ]
  }, [scopedInspectors])

  function handleCreate(e) {
    e.preventDefault()
    const market = markets.find((m) => m.id === form.marketId)
    const newInspector = {
      id: `INS-${String(inspectors.length + 1).padStart(3, '0')}`,
      name: form.name,
      email: form.email,
      phone: form.phone,
      region: market?.name || '',
      marketId: form.marketId,
      assignedArea: market?.name || '',
      status: 'active',
      photo: form.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
      assessmentCount: 0,
    }
    setInspectors((prev) => [newInspector, ...prev])
    setCreating(false)
    setForm({ name: '', email: '', phone: '', marketId: markets[0]?.id || '' })
  }

  function handleDeactivateConfirm() {
    if (!deactivating) return
    setInspectors((prev) =>
      prev.map((i) =>
        i.id === deactivating.id ? { ...i, status: i.status === 'inactive' ? 'active' : 'inactive' } : i
      )
    )
    setDeactivating(null)
  }

  const columns = [
    { key: 'id', header: 'Inspector ID' },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div className="cell-primary">{row.name}</div>
          <div className="cell-secondary">{row.email}</div>
        </div>
      ),
    },
    { key: 'phone', header: 'Contact' },
    { key: 'assignedArea', header: 'Assigned Area' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'assessmentCount', header: 'Assessments' },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="table-icon-group">
          <button className="table-icon-btn" onClick={() => setViewing(row)} aria-label="View inspector">
            <FiEye size={15} />
          </button>
          <button className="table-icon-btn" onClick={() => setViewing(row)} aria-label="Edit inspector">
            <FiEdit2 size={14} />
          </button>
          <button
            className="table-icon-btn table-icon-btn--danger"
            onClick={() => setDeactivating(row)}
            aria-label={row.status === 'inactive' ? 'Activate inspector' : 'Deactivate inspector'}
          >
            {row.status === 'inactive' ? <FiUserCheck size={15} /> : <FiUserX size={15} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h2>Inspector Management</h2>
          <p className="page-header-row__subtitle">Create, view, and manage inspector account assignments</p>
        </div>
      </div>
      {isBfarAdmin && <BfarBannerAction><button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus size={15} /> Add Inspector</button></BfarBannerAction>}

      <div className="stat-grid">
        {stats.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by ID, name, or area..." />
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {isBfarAdmin && <select className="select-input" value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)} aria-label="Filter by assigned market"><option value="all">All assigned markets</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select>}
        {(query || statusFilter !== 'all' || marketFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setStatusFilter('all'); setMarketFilter('all') }}><FiRotateCcw size={14} /> Clear</button>}
      </div>

      <TableCard
        title={`Inspectors (${filtered.length})`}
        subtitle="List of registered inspectors and their details"
        columns={columns}
        rows={filtered}
        emptyMessage="No inspectors match your search."
      />

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
              <p><strong>Email:</strong> {viewing.email}</p>
              <p><strong>Contact:</strong> {viewing.phone}</p>
              <p><strong>Assigned Area:</strong> {viewing.assignedArea}</p>
              <p><strong>Assessments Logged:</strong> {viewing.assessmentCount}</p>
              <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add Inspector"
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
              Add Inspector
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="text-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Contact Number</label>
            <input className="text-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxxxx" />
          </div>
          <div className="form-group">
            <label>Assigned Market</label>
            <select className="select-input" value={form.marketId} onChange={(e) => setForm({ ...form, marketId: e.target.value })}>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={handleDeactivateConfirm}
        title={deactivating?.status === 'inactive' ? 'Activate this inspector?' : 'Deactivate this inspector?'}
        message={
          deactivating
            ? deactivating.status === 'inactive'
              ? `${deactivating.name} will regain access to submit assessments.`
              : `${deactivating.name} will no longer be able to submit assessments.`
            : ''
        }
        confirmLabel={deactivating?.status === 'inactive' ? 'Activate' : 'Deactivate'}
        danger={deactivating?.status !== 'inactive'}
      />
    </div>
  )
}
