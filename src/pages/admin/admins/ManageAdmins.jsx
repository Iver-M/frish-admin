import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiPlus, FiSlash } from 'react-icons/fi'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import TableCard from '../../../components/TableCard.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getAdmins } from '../../../data/admins.js'
import { getMarkets } from '../../../data/markets.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import {
  createAdminProfile,
  subscribeAdminProfiles,
  updateAdminProfile,
} from '../../../services/firestoreService.js'
import './ManageAdmins.css'

const ROLE_LABELS = {
  bfar_admin: 'BFAR Admin',
  market_admin: 'Market Admin',
}

const EMPTY_FORM = {
  authUid: '',
  name: '',
  email: '',
  role: 'market_admin',
  marketId: 'pasig',
}

export default function ManageAdmins() {
  const { user, isFirebaseEnabled } = useAuth()
  const markets = getMarkets()
  const [admins, setAdmins] = useState(() => (isFirebaseEnabled ? [] : getAdmins().map(normalizeAdmin)))
  const [isLoading, setLoading] = useState(isFirebaseEnabled)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(null)
  const [creating, setCreating] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, marketId: markets[0]?.id || 'pasig' })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    return subscribeAdminProfiles(
      (profiles) => {
        setAdmins(profiles.map(normalizeAdmin))
        setLoading(false)
        setLoadError('')
      },
      (error) => {
        setLoading(false)
        setLoadError(adminErrorMessage(error))
      },
    )
  }, [isFirebaseEnabled])

  const totals = useMemo(() => ({
    active: admins.filter((admin) => admin.status === 'active').length,
    suspended: admins.filter((admin) => admin.status === 'suspended').length,
  }), [admins])

  function marketName(marketId) {
    return markets.find((market) => market.id === marketId)?.name || 'Pasig Public Market'
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, marketId: markets[0]?.id || 'pasig' })
    setFormError('')
    setNotice(null)
    setCreating(true)
  }

  function updateForm(field, value) {
    setFormError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (!isFirebaseEnabled) return

    setSaving(true)
    setFormError('')
    setNotice(null)
    const cleanName = form.name.trim()
    const cleanEmail = form.email.trim().toLowerCase()
    const assignedMarket = form.role === 'market_admin' ? form.marketId : null

    try {
      await createAdminProfile(
        form.authUid,
        {
          name: cleanName,
          displayName: cleanName,
          email: cleanEmail,
          role: form.role,
          marketId: assignedMarket,
          marketName: assignedMarket ? marketName(assignedMarket) : null,
        },
        adminAudit(user, 'Registered administrator profile', `${cleanName} · ${ROLE_LABELS[form.role]}`),
      )
      setCreating(false)
      setForm({ ...EMPTY_FORM, marketId: markets[0]?.id || 'pasig' })
      setNotice({ tone: 'success', message: `${cleanName} is now available in live Admin Management.` })
    } catch (error) {
      setFormError(adminErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleConfirm() {
    if (!toggling) return false
    const nextStatus = toggling.status === 'suspended' ? 'active' : 'suspended'
    setNotice(null)

    try {
      await updateAdminProfile(
        toggling.id,
        { accountStatus: nextStatus },
        adminAudit(
          user,
          nextStatus === 'active' ? 'Reinstated administrator access' : 'Suspended administrator access',
          `${toggling.name} · ${ROLE_LABELS[toggling.role]}`,
        ),
      )
      setNotice({ tone: 'success', message: `${toggling.name} is now ${nextStatus}.` })
      return true
    } catch (error) {
      setNotice({ tone: 'error', message: adminErrorMessage(error) })
      return false
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (row) => ROLE_LABELS[row.role] || row.role },
    { key: 'market', header: 'Assigned Market', render: (row) => (row.marketId ? marketName(row.marketId) : 'All Markets') },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'dateAdded', header: 'Date Added' },
    {
      key: 'actions',
      header: 'Management',
      render: (row) => row.role === 'bfar_admin' ? (
        <span className="manage-admins__protected">Protected</span>
      ) : row.status === 'suspended' ? (
        <button className="btn btn-outline btn-sm" onClick={() => { setNotice(null); setToggling(row) }}>
          <FiCheckCircle size={13} /> Reinstate
        </button>
      ) : (
        <button className="btn btn-danger-outline btn-sm" onClick={() => { setNotice(null); setToggling(row) }}>
          <FiSlash size={13} /> Suspend
        </button>
      ),
    },
  ]

  return (
    <div className="page manage-admins">
      <BfarBannerAction>
        <button className="btn btn-primary" onClick={openCreate} disabled={!isFirebaseEnabled}>
          <FiPlus size={15} /> Register Admin
        </button>
      </BfarBannerAction>

      <p className="manage-admins__note">
        Live administrator profiles from Firestore. Register an existing Firebase Authentication UID,
        then manage its portal access here.
      </p>

      <div className="manage-admins__summary" aria-label="Administrator account totals">
        <span><strong>{admins.length}</strong> Total admins</span>
        <span><strong>{totals.active}</strong> Active</span>
        <span><strong>{totals.suspended}</strong> Suspended</span>
      </div>

      {notice && <p className={`manage-admins__alert manage-admins__alert--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.message}</p>}
      {loadError && <p className="manage-admins__alert manage-admins__alert--error" role="alert">{loadError}</p>}

      <TableCard
        title={`Administrator accounts (${admins.length})`}
        subtitle={isFirebaseEnabled ? 'Real-time profiles from Firestore users' : 'Demonstration accounts'}
        columns={columns}
        rows={admins}
        emptyMessage={isLoading ? 'Loading administrator accounts…' : 'No administrator profiles were found.'}
      />

      <Modal
        open={creating}
        onClose={() => { if (!isSaving) setCreating(false) }}
        title="Register Administrator Profile"
        footer={(
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setCreating(false)} disabled={isSaving}>Cancel</button>
            <button className="btn btn-primary btn-sm" type="submit" form="admin-profile-form" disabled={isSaving}>
              {isSaving ? 'Registering…' : 'Register administrator'}
            </button>
          </>
        )}
      >
        <form id="admin-profile-form" onSubmit={handleCreate}>
          <div className="manage-admins__form-note">
            <strong>Authentication account required</strong>
            <span>Create the sign-in account in Firebase Authentication first, then paste its exact UID below. Passwords are never stored in Firestore.</span>
          </div>
          <div className="form-group">
            <label>Firebase Authentication UID</label>
            <input required className="text-input" value={form.authUid} onChange={(event) => updateForm('authUid', event.target.value)} placeholder="Paste the complete User UID" autoCapitalize="none" autoComplete="off" spellCheck="false" />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input required className="text-input" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Rosario Bautista" maxLength={100} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input required type="email" className="text-input" value={form.email} onChange={(event) => updateForm('email', event.target.value)} placeholder="name@frish.gov.ph" maxLength={160} />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="select-input" value={form.role} onChange={(event) => updateForm('role', event.target.value)}>
              <option value="market_admin">Market Admin</option>
              <option value="bfar_admin">BFAR Admin</option>
            </select>
          </div>
          {form.role === 'market_admin' && (
            <div className="form-group">
              <label>Assigned Market</label>
              <select className="select-input" value={form.marketId} onChange={(event) => updateForm('marketId', event.target.value)}>
                {markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
              </select>
            </div>
          )}
          {formError && <p className="manage-admins__alert manage-admins__alert--error" role="alert">{formError}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        onConfirm={handleToggleConfirm}
        title={toggling?.status === 'suspended' ? 'Reinstate this admin?' : 'Suspend this admin?'}
        message={toggling?.status === 'suspended'
          ? `${toggling?.name} will regain access the next time their administrator profile is verified.`
          : `${toggling?.name} will be blocked the next time their administrator profile is verified.`}
        confirmLabel={toggling?.status === 'suspended' ? 'Reinstate' : 'Suspend'}
        pendingLabel="Saving…"
        danger={toggling?.status !== 'suspended'}
        error={notice?.tone === 'error' ? notice.message : ''}
      />
    </div>
  )
}

function normalizeAdmin(profile) {
  const status = String(profile.accountStatus || profile.status || 'active').toLowerCase()
  return {
    ...profile,
    id: String(profile.id || ''),
    name: profile.name || profile.displayName || profile.email || 'Unnamed administrator',
    email: profile.email || 'Not provided',
    marketId: profile.role === 'market_admin' ? profile.marketId || 'pasig' : null,
    status: status === 'suspended' || status === 'inactive' || status === 'disabled' ? 'suspended' : 'active',
    dateAdded: formatDate(profile.createdAt || profile.dateAdded),
  }
}

function adminAudit(user, action, details) {
  return {
    actorId: user?.uid || 'bfar-admin',
    actorName: user?.name || 'BFAR-NCR Admin',
    action,
    details,
    category: 'Administrator Management',
    marketId: 'pasig',
  }
}

function adminErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '')
  if (code === 'already-exists' || /profile already exists/i.test(message)) return message
  if (code === 'invalid-argument') return 'Paste a valid Firebase Authentication UID.'
  if (code.includes('permission-denied') || /insufficient permissions/i.test(message)) return 'Your BFAR account does not have permission to manage administrator profiles. Publish the merged Firestore rules and try again.'
  if (code.includes('unavailable')) return 'Administrator profiles are temporarily unavailable. Check your connection and try again.'
  return 'The administrator profile could not be saved. Please try again.'
}

function formatDate(value) {
  const timestamp = value?.toMillis?.()
    || (typeof value === 'string' ? Date.parse(value) : 0)
    || (value instanceof Date ? value.getTime() : 0)
  return timestamp
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(timestamp))
    : 'Not recorded'
}
