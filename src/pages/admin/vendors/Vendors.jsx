import { useMemo, useState } from 'react'
import { FiEye, FiEdit2, FiSlash, FiCheckCircle, FiPlus, FiRotateCcw, FiMapPin } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import TableCard from '../../../components/TableCard.jsx'
import StatCard from '../../../components/StatCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { getVendors } from '../../../data/vendors.js'
import { getInspectors } from '../../../data/inspectors.js'
import { getMarkets } from '../../../data/markets.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { scopeByMarket } from '../../../utils/scopeByMarket.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import './Vendors.css'

export default function Vendors() {
  const { user, isBfarAdmin } = useAuth()
  const markets = getMarkets()
  const [vendors, setVendors] = useState(getVendors())
  const inspectors = getInspectors()
  const scopedVendors = useMemo(() => scopeByMarket(vendors, user), [vendors, user])
  const scopedInspectors = useMemo(() => scopeByMarket(inspectors, user), [inspectors, user])

  const [query, setQuery] = useState('')
  const [complianceFilter, setComplianceFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [form, setForm] = useState({ ownerName: '', email: '', stallName: '', stallNo: '', marketId: markets[0]?.id || '' })

  const filtered = useMemo(() => {
    return scopedVendors.filter((v) =>
      (
        v.ownerName.toLowerCase().includes(query.toLowerCase()) ||
        v.stallName.toLowerCase().includes(query.toLowerCase()) ||
        v.stallNo.toLowerCase().includes(query.toLowerCase())
      ) && (complianceFilter === 'all' || v.compliance === complianceFilter)
    )
  }, [scopedVendors, query, complianceFilter])

  const stats = useMemo(() => {
    const marketCount = new Set(scopedVendors.map((v) => v.marketId)).size
    const activeInspectorCount = scopedInspectors.filter((i) => i.status === 'active').length
    return [
      { id: 'total-vendors', label: 'Total Vendors', value: String(scopedVendors.length), icon: 'vendors', trend: 'flat' },
      { id: 'total-markets', label: 'Total Markets', value: String(marketCount), icon: 'markets', trend: 'flat' },
      { id: 'active-inspectors', label: 'Active Inspectors', value: String(activeInspectorCount), icon: 'active', trend: 'flat' },
    ]
  }, [scopedVendors, scopedInspectors])

  function handleCreate(e) {
    e.preventDefault()
    const market = markets.find((m) => m.id === form.marketId)
    const newVendor = {
      id: `VEN-${String(vendors.length + 1).padStart(3, '0')}`,
      ownerName: form.ownerName,
      email: form.email,
      stallName: form.stallName,
      market: market?.name || '',
      marketId: form.marketId,
      stallNo: form.stallNo,
      status: 'active',
      compliance: 'Compliant',
      violations: 0,
    }
    setVendors((prev) => [newVendor, ...prev])
    setCreating(false)
    setForm({ ownerName: '', email: '', stallName: '', stallNo: '', marketId: markets[0]?.id || '' })
  }

  function handleToggleConfirm() {
    if (!toggling) return
    setVendors((prev) =>
      prev.map((v) =>
        v.id === toggling.id ? { ...v, status: v.status === 'suspended' ? 'active' : 'suspended' } : v
      )
    )
    setViewing((prev) => (prev && prev.id === toggling.id ? { ...prev, status: prev.status === 'suspended' ? 'active' : 'suspended' } : prev))
    setToggling(null)
  }

  const columns = [
    { key: 'id', header: 'Vendor ID' },
    {
      key: 'ownerName',
      header: 'Vendor Name',
      render: (row) => (
        <div>
          <div className="cell-primary">{row.ownerName}</div>
          <div className="cell-secondary">{row.email}</div>
        </div>
      ),
    },
    { key: 'stallName', header: 'Stall Name' },
    { key: 'market', header: 'Market Location' },
    { key: 'stallNo', header: 'Stall No.' },
    { key: 'compliance', header: 'Compliance' },
    { key: 'violations', header: 'Violations' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="table-icon-group">
          <button className="table-icon-btn" onClick={() => setViewing(row)} aria-label="View vendor">
            <FiEye size={15} />
          </button>
          <button className="table-icon-btn" onClick={() => setViewing(row)} aria-label="Edit vendor">
            <FiEdit2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className={`page vendors-page ${!isBfarAdmin ? 'market-workspace' : ''}`}>
      <div className="page-header-row">
        <div>
          <p className="workspace-kicker">{isBfarAdmin ? 'VENDOR MANAGEMENT' : 'LGU MARKET ADMIN'}</p>
          <h2>{isBfarAdmin ? 'Vendor Management' : 'Vendor Violation History'}</h2>
          <p className="page-header-row__subtitle">{isBfarAdmin ? 'Create, view, and manage vendor records' : 'Monitor vendors and prioritize follow-up actions.'}</p>
        </div>
      </div>
      {isBfarAdmin && <BfarBannerAction><button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus size={15} /> Add Vendor</button></BfarBannerAction>}

      {isBfarAdmin && <div className="stat-grid vendors-page__stats">
        {stats.map((s) => (
          <StatCard key={s.id} {...s} />
        ))}
      </div>}

      <div className="toolbar workspace-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by vendor name, or stall..." />
        <select className="select-input" value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)} aria-label="Filter by compliance"><option value="all">All compliance states</option><option value="Compliant">Compliant</option><option value="Under review">Under review</option><option value="Non-compliant">Non-compliant</option></select>
        {(query || complianceFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setComplianceFilter('all') }}><FiRotateCcw size={14} /> Clear</button>}
      </div>

      {isBfarAdmin ? <TableCard title={`Vendors (${filtered.length})`} subtitle="List of registered vendors and their information" columns={columns} rows={filtered} emptyMessage="No vendors match your search." /> : <section className="vendor-history"><div className="vendor-history__heading"><div><h3>Vendor records</h3><p>Compliance and enforcement history for this market</p></div><span>{filtered.length} vendors</span></div>{filtered.length ? <div className="vendor-history__grid">{filtered.map((vendor) => <button className="vendor-history-card" key={vendor.id} onClick={() => setViewing(vendor)}><span className="vendor-history-card__avatar">{vendor.ownerName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><span className="vendor-history-card__identity"><strong>{vendor.ownerName}</strong><small>Vendor ID {vendor.id}</small></span><span className="vendor-history-card__location"><FiMapPin /> Stall {vendor.stallNo} · {vendor.market}</span><span className={`vendor-history-card__compliance vendor-history-card__compliance--${vendor.compliance.toLowerCase().replace(' ', '-')}`}>{vendor.compliance}</span><span className="vendor-history-card__violations">{vendor.violations} {vendor.violations === 1 ? 'violation' : 'violations'}</span></button>)}</div> : <div className="vendor-history__empty">No vendor records match the selected filters.</div>}</section>}

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.stallName : ''}
        footer={
          <>
            {viewing?.status === 'suspended' ? (
              <button className="btn btn-outline btn-sm" onClick={() => setToggling(viewing)}>
                <FiCheckCircle size={13} /> Reinstate
              </button>
            ) : (
              <button className="btn btn-danger-outline btn-sm" onClick={() => setToggling(viewing)}>
                <FiSlash size={13} /> Suspend
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setViewing(null)}>
              Close
            </button>
          </>
        }
      >
        {viewing && (
          <div className="detail-grid">
            <p><strong>Vendor Name:</strong> {viewing.ownerName}</p>
            <p><strong>Email:</strong> {viewing.email}</p>
            <p><strong>Stall Name:</strong> {viewing.stallName}</p>
            <p><strong>Market Location:</strong> {viewing.market}</p>
            <p><strong>Stall No.:</strong> {viewing.stallNo}</p>
            <p><strong>Compliance:</strong> {viewing.compliance}</p>
            <p><strong>Recorded Violations:</strong> {viewing.violations}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
          </div>
        )}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add Vendor"
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={!form.ownerName.trim() || !form.stallName.trim()}
            >
              Add Vendor
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Vendor Name</label>
            <input className="text-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="text-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Stall Name</label>
            <input className="text-input" value={form.stallName} onChange={(e) => setForm({ ...form, stallName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Stall No.</label>
            <input className="text-input" value={form.stallNo} onChange={(e) => setForm({ ...form, stallNo: e.target.value })} placeholder="e.g. A-12" />
          </div>
          <div className="form-group">
            <label>Market Location</label>
            <select className="select-input" value={form.marketId} onChange={(e) => setForm({ ...form, marketId: e.target.value })}>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        onConfirm={handleToggleConfirm}
        title={toggling?.status === 'suspended' ? 'Reinstate vendor?' : 'Suspend vendor?'}
        message={
          toggling
            ? toggling.status === 'suspended'
              ? `${toggling.stallName} will be reinstated and allowed to operate again.`
              : `${toggling.stallName} will be suspended from operating until reinstated.`
            : ''
        }
        confirmLabel={toggling?.status === 'suspended' ? 'Reinstate' : 'Suspend'}
        danger={toggling?.status !== 'suspended'}
      />
    </div>
  )
}
