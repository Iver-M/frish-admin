import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiEye, FiMapPin, FiRotateCcw, FiSlash } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { getVendors } from '../../../data/vendors.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { subscribeMarketRecords, upsertVendorWithAudit } from '../../../services/firestoreService.js'
import { buildVendorRecords, deriveVendorCompliance, normalizeVendorRecord } from '../../../utils/vendorRecord.js'
import './Vendors.css'

export default function Vendors() {
  const { user, isFirebaseEnabled } = useAuth()
  const [vendorRecords, setVendorRecords] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(isFirebaseEnabled)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [complianceFilter, setComplianceFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [toggling, setToggling] = useState(null)

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setVendorRecords(getVendors())
      setLoading(false)
      return undefined
    }

    let vendorsReady = false
    let reportsReady = false
    const finishLoading = () => {
      if (vendorsReady && reportsReady) setLoading(false)
    }
    const handleError = (firebaseError) => {
      setError(firebaseError.message || 'Unable to load vendor records.')
      setLoading(false)
    }
    const unsubscribeVendors = subscribeMarketRecords('vendors', user, (records) => {
      setVendorRecords(records)
      vendorsReady = true
      finishLoading()
    }, handleError)
    const unsubscribeReports = subscribeMarketRecords('reports', user, (records) => {
      setReports(records)
      reportsReady = true
      finishLoading()
    }, handleError)
    return () => { unsubscribeVendors(); unsubscribeReports() }
  }, [isFirebaseEnabled, user])

  const vendors = useMemo(
    () => isFirebaseEnabled ? buildVendorRecords(vendorRecords, reports) : vendorRecords.map(normalizeVendorRecord),
    [isFirebaseEnabled, reports, vendorRecords],
  )

  useEffect(() => {
    if (!viewing) return
    const updated = vendors.find((vendor) => vendor.id === viewing.id)
    if (updated) setViewing(updated)
  }, [vendors, viewing?.id])

  const filtered = useMemo(() => vendors.filter((vendor) => {
    const haystack = `${vendor.ownerName} ${vendor.stallName} ${vendor.stallNo} ${vendor.id}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
      && (complianceFilter === 'all' || vendor.compliance === complianceFilter)
  }), [complianceFilter, query, vendors])

  async function handleToggleConfirm() {
    if (!toggling) return false
    const nextStatus = toggling.status === 'suspended' ? 'active' : 'suspended'
    const nextCompliance = nextStatus === 'suspended' ? 'Non-compliant' : deriveVendorCompliance(toggling.openCaseCount, 'Compliant', nextStatus)
    setActionError('')

    try {
      if (isFirebaseEnabled) {
        await upsertVendorWithAudit(toggling.id, {
          ownerName: toggling.ownerName,
          email: toggling.email || '',
          stallName: toggling.stallName,
          stallNo: toggling.stallNo,
          market: 'Pasig Public Market',
          marketId: 'pasig',
          status: nextStatus,
          compliance: nextCompliance,
          violations: toggling.violations || 0,
          source: toggling.source || 'report-derived',
        }, {
          actorId: user.uid,
          actorName: user.name,
          action: nextStatus === 'suspended' ? 'Suspended vendor record' : 'Reinstated vendor record',
          details: `${toggling.ownerName} (${toggling.stallNo ? `Stall ${toggling.stallNo}` : 'stall not recorded'}) at Pasig Public Market.`,
          category: 'Vendor Management',
          marketId: 'pasig',
        })
      } else {
        setVendorRecords((records) => records.map((vendor) => vendor.id === toggling.id ? { ...vendor, status: nextStatus, compliance: nextCompliance } : vendor))
      }
      setNotice(`${toggling.ownerName} was ${nextStatus === 'suspended' ? 'suspended' : 'reinstated'}.`)
      setToggling(null)
      return true
    } catch (firebaseError) {
      setActionError(firebaseError.message || 'Unable to update this vendor record.')
      return false
    }
  }

  return (
    <div className="page vendors-page market-workspace">
      <div className="page-header-row">
        <div>
          <p className="workspace-kicker">LGU MARKET ADMIN</p>
          <h2>Vendor Violation History</h2>
          <p className="page-header-row__subtitle">Review vendor activity derived from Pasig Public Market reports and manage operating status.</p>
        </div>
        {isFirebaseEnabled && <span className="vendor-live-indicator"><span /> Live records</span>}
      </div>

      {notice && <div className="vendor-notice" role="status"><FiCheckCircle /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
      {error && <p className="vendor-error" role="alert">{error}</p>}

      <div className="toolbar workspace-toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search vendor, stall, or record ID..." />
        <select className="select-input" value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)} aria-label="Filter by compliance">
          <option value="all">All compliance states</option>
          <option value="Compliant">Compliant</option>
          <option value="Under review">Under review</option>
          <option value="Non-compliant">Non-compliant</option>
        </select>
        {(query || complianceFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setComplianceFilter('all') }}><FiRotateCcw size={14} /> Clear</button>}
      </div>

      <section className="vendor-history">
        <div className="vendor-history__heading">
          <div><h3>Vendor records</h3><p>Report-linked compliance and enforcement history for Pasig Public Market</p></div>
          <span>{filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'}</span>
        </div>
        {loading ? <div className="vendor-history__empty">Loading live vendor records…</div> : filtered.length ? (
          <div className="vendor-history__grid">
            {filtered.map((vendor) => (
              <button className="vendor-history-card" key={vendor.id} onClick={() => setViewing(vendor)}>
                <span className="vendor-history-card__avatar">{getInitials(vendor.ownerName)}</span>
                <span className="vendor-history-card__identity"><strong>{vendor.ownerName}</strong><small>Record {vendor.id}</small></span>
                <span className="vendor-history-card__view"><FiEye /> View</span>
                <span className="vendor-history-card__location"><FiMapPin /> {vendor.stallNo ? `Stall ${vendor.stallNo} · ` : ''}Pasig Public Market</span>
                <span className={`vendor-history-card__compliance vendor-history-card__compliance--${toneClass(vendor.compliance)}`}>{vendor.compliance}</span>
                <span className="vendor-history-card__violations">{vendor.reportCount} {vendor.reportCount === 1 ? 'report' : 'reports'}</span>
              </button>
            ))}
          </div>
        ) : <div className="vendor-history__empty">No vendor records match the selected filters.</div>}
      </section>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.ownerName || 'Vendor record'} footer={<>{viewing?.status === 'suspended' ? <button className="btn btn-outline btn-sm" onClick={() => { setActionError(''); setToggling(viewing) }}><FiCheckCircle size={13} /> Reinstate Vendor</button> : <button className="btn btn-danger-outline btn-sm" onClick={() => { setActionError(''); setToggling(viewing) }}><FiSlash size={13} /> Suspend Vendor</button>}<button className="btn btn-primary btn-sm" onClick={() => setViewing(null)}>Close</button></>}>
        {viewing && <div className="detail-grid vendor-detail-grid">
          <p><strong>Record ID:</strong> {viewing.id}</p>
          <p><strong>Vendor Name:</strong> {viewing.ownerName}</p>
          <p><strong>Email:</strong> {viewing.email || 'Not recorded'}</p>
          <p><strong>Stall:</strong> {viewing.stallNo || 'Not recorded'}</p>
          <p><strong>Market:</strong> Pasig Public Market</p>
          <p><strong>Linked Reports:</strong> {viewing.reportCount}</p>
          <p><strong>Open Cases:</strong> {viewing.openCaseCount}</p>
          <p><strong>Recorded Violations:</strong> {viewing.violations}</p>
          <p><strong>Compliance:</strong> <span className={`vendor-history-card__compliance vendor-history-card__compliance--${toneClass(viewing.compliance)}`}>{viewing.compliance}</span></p>
          <p><strong>Operating Status:</strong> <StatusBadge status={viewing.status} /></p>
          <p className="vendor-detail-grid__source"><strong>Record Source:</strong> {viewing.source === 'firestore' ? 'Managed vendor record with linked report activity' : 'Automatically derived from submitted reports'}</p>
        </div>}
      </Modal>

      <ConfirmDialog open={!!toggling} onClose={() => { setToggling(null); setActionError('') }} onConfirm={handleToggleConfirm} title={toggling?.status === 'suspended' ? 'Reinstate vendor?' : 'Suspend vendor?'} message={toggling ? toggling.status === 'suspended' ? `${toggling.ownerName} will be marked active again. Open report cases will remain visible for review.` : `${toggling.ownerName} will be marked suspended in the shared vendor record. Existing reports will not be deleted.` : ''} confirmLabel={toggling?.status === 'suspended' ? 'Reinstate' : 'Suspend'} pendingLabel="Saving…" danger={toggling?.status !== 'suspended'} error={actionError} />
    </div>
  )
}

function getInitials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function toneClass(value = '') { return value.toLowerCase().replaceAll(' ', '-') }
