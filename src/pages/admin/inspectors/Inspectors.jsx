import { useEffect, useMemo, useState } from 'react'
import { FiEdit2, FiEye, FiPlus, FiRotateCcw, FiUserCheck, FiUserX } from 'react-icons/fi'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import SearchBar from '../../../components/SearchBar.jsx'
import StatCard from '../../../components/StatCard.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import TableCard from '../../../components/TableCard.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getInspectors } from '../../../data/inspectors.js'
import { BfarBannerAction } from '../../../layout/AdminLayout.jsx'
import {
  createInspectorProfile,
  subscribeMarketRecords,
  subscribeInspectorProfiles,
  updateInspectorProfile,
} from '../../../services/firestoreService.js'
import InspectorFormModal from './InspectorFormModal.jsx'
import {
  auditEntry,
  dataErrorMessage,
  EMPTY_FORM,
  INSPECTOR_FILTERS,
  inspectorPayload,
  normalizeInspector,
} from './inspectorManagement.js'
import './Inspectors.css'

export default function Inspectors() {
  const { user, isBfarAdmin, isFirebaseEnabled } = useAuth()
  const [inspectors, setInspectors] = useState(() =>
    isFirebaseEnabled ? [] : getInspectors().map(normalizeInspector),
  )
  const [scanActivity, setScanActivity] = useState(new Map())
  const [scanActivityError, setScanActivityError] = useState('')
  const [isLoading, setLoading] = useState(isFirebaseEnabled)
  const [loadError, setLoadError] = useState('')
  const [actionNotice, setActionNotice] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [changingAccess, setChangingAccess] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSaving, setSaving] = useState(false)

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined

    return subscribeInspectorProfiles(
      (profiles) => {
        setInspectors(profiles.map(normalizeInspector))
        setLoading(false)
        setLoadError('')
      },
      (firebaseError) => {
        setLoadError(dataErrorMessage(firebaseError))
        setLoading(false)
      },
    )
  }, [isFirebaseEnabled])

  useEffect(() => {
    if (!isFirebaseEnabled || !isBfarAdmin) return undefined

    return subscribeMarketRecords(
      'scans',
      user,
      (records) => {
        const activity = new Map()
        records.forEach((record) => {
          const inspectorId = record.createdBy?.uid
          if (!inspectorId) return
          const current = activity.get(inspectorId) || { count: 0, lastScanAt: null }
          const recordTime = timestampValue(record.createdAt)
          const currentTime = timestampValue(current.lastScanAt)
          activity.set(inspectorId, {
            count: current.count + 1,
            lastScanAt: recordTime > currentTime ? record.createdAt : current.lastScanAt,
          })
        })
        setScanActivity(activity)
        setScanActivityError('')
      },
      () => setScanActivityError('Inspector accounts loaded, but live scan activity is unavailable.'),
    )
  }, [isBfarAdmin, isFirebaseEnabled, user])

  const inspectorsWithActivity = useMemo(
    () => inspectors.map((inspector) => {
      const activity = scanActivity.get(inspector.id)
      return {
        ...inspector,
        scanCount: activity?.count ?? (isFirebaseEnabled ? 0 : inspector.assessmentCount),
        lastScanAt: activity?.lastScanAt || null,
      }
    }),
    [inspectors, isFirebaseEnabled, scanActivity],
  )

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return inspectorsWithActivity.filter((inspector) => {
      const searchValue = [
        inspector.employeeId,
        inspector.name,
        inspector.email,
        inspector.phone,
        inspector.assignedArea,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !normalizedQuery || searchValue.includes(normalizedQuery)
      const matchesStatus = statusFilter === 'all' || inspector.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [inspectorsWithActivity, query, statusFilter])

  const stats = useMemo(
    () => [
      {
        id: 'total',
        label: 'Total Inspectors',
        value: String(inspectors.length),
        icon: 'inspectors',
        trend: 'flat',
      },
      {
        id: 'active',
        label: 'Active',
        value: String(inspectors.filter((item) => item.status === 'active').length),
        icon: 'active',
        trend: 'flat',
      },
      {
        id: 'inactive',
        label: 'Inactive',
        value: String(inspectors.filter((item) => item.status === 'inactive').length),
        icon: 'inactive',
        trend: 'flat',
      },
    ],
    [inspectors],
  )

  function clearFeedback() {
    setFormError('')
    setActionNotice(null)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    clearFeedback()
    setCreating(true)
  }

  function openEdit(inspector) {
    setForm({
      authUid: inspector.id,
      employeeId: inspector.employeeId,
      name: inspector.name,
      email: inspector.email === 'Not provided' ? '' : inspector.email,
      phone: inspector.phone,
      marketId: 'pasig',
      marketName: 'Pasig Public Market',
    })
    setViewing(null)
    clearFeedback()
    setEditing(inspector)
  }

  function updateForm(field, value) {
    if (formError) setFormError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    if (!isFirebaseEnabled) {
      setFormError('Connect Firebase before registering an inspector profile.')
      return
    }

    setSaving(true)
    setFormError('')
    setActionNotice(null)

    try {
      await createInspectorProfile(
        form.authUid,
        inspectorPayload(form),
        auditEntry(user, 'Registered inspector profile', `${form.name} · ${form.employeeId}`),
      )
      setCreating(false)
      setForm(EMPTY_FORM)
      setActionNotice({
        tone: 'success',
        message: `${form.name} was registered as an active inspector.`,
      })
    } catch (firebaseError) {
      setFormError(dataErrorMessage(firebaseError))
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(event) {
    event.preventDefault()
    if (!editing) return

    setSaving(true)
    setFormError('')
    setActionNotice(null)

    try {
      await updateInspectorProfile(
        editing.id,
        inspectorPayload(form),
        auditEntry(user, 'Updated inspector profile', `${form.name} · ${form.employeeId}`),
      )
      setEditing(null)
      setActionNotice({ tone: 'success', message: `${form.name}'s profile was updated.` })
    } catch (firebaseError) {
      setFormError(dataErrorMessage(firebaseError))
    } finally {
      setSaving(false)
    }
  }

  async function handleAccessConfirm() {
    if (!changingAccess) return false

    const nextStatus = changingAccess.status === 'active' ? 'inactive' : 'active'
    setActionNotice(null)

    try {
      await updateInspectorProfile(
        changingAccess.id,
        { accountStatus: nextStatus },
        auditEntry(
          user,
          nextStatus === 'active'
            ? 'Activated inspector account'
            : 'Deactivated inspector account',
          `${changingAccess.name} · ${changingAccess.employeeId}`,
        ),
      )
      setActionNotice({
        tone: 'success',
        message: `${changingAccess.name} is now ${nextStatus}.`,
      })
      return true
    } catch (firebaseError) {
      setActionNotice({ tone: 'error', message: dataErrorMessage(firebaseError) })
      return false
    }
  }

  const managementDisabled = !isFirebaseEnabled || isSaving
  const columns = [
    { key: 'employeeId', header: 'Inspector ID' },
    {
      key: 'name',
      header: 'Inspector',
      render: (row) => (
        <div className="inspector-cell">
          <span className="avatar-circle" aria-hidden="true">{row.photo}</span>
          <span>
            <strong>{row.name}</strong>
            <small>{row.email}</small>
          </span>
        </div>
      ),
    },
    { key: 'phone', header: 'Contact', render: (row) => row.phone || 'Not provided' },
    { key: 'assignedArea', header: 'Assigned Market' },
    { key: 'status', header: 'Access', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'scanCount', header: 'Scans' },
    {
      key: 'actions',
      header: 'Management',
      render: (row) => (
        <div className="inspector-actions">
          <button
            type="button"
            className="inspector-action"
            onClick={() => setViewing(row)}
            aria-label={`View ${row.name}'s profile`}
          >
            <FiEye />
            <span>View</span>
          </button>
          <button
            type="button"
            className="inspector-action"
            onClick={() => openEdit(row)}
            disabled={managementDisabled}
            aria-label={`Edit ${row.name}'s profile`}
          >
            <FiEdit2 />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={`inspector-action ${
              row.status === 'active' ? 'inspector-action--danger' : 'inspector-action--success'
            }`}
            onClick={() => {
              setActionNotice(null)
              setChangingAccess(row)
            }}
            disabled={managementDisabled}
            aria-label={`${row.status === 'active' ? 'Deactivate' : 'Activate'} ${row.name}`}
          >
            {row.status === 'active' ? <FiUserX /> : <FiUserCheck />}
            <span>{row.status === 'active' ? 'Deactivate' : 'Activate'}</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page inspectors-page">
      <div className="page-header-row">
        <div>
          <h2>Inspector Management</h2>
          <p className="page-header-row__subtitle">
            Manage authorized inspector profiles and mobile-app access.
          </p>
        </div>
      </div>

      {isBfarAdmin && (
        <BfarBannerAction>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreate}
            disabled={!isFirebaseEnabled}
            title={isFirebaseEnabled ? undefined : 'Connect Firebase to register inspectors'}
          >
            <FiPlus size={15} /> Register Inspector
          </button>
        </BfarBannerAction>
      )}

      <div className="stat-grid">
        {stats.map((stat) => <StatCard key={stat.id} {...stat} />)}
      </div>

      {actionNotice && (
        <div
          className={`inspector-alert inspector-alert--${actionNotice.tone}`}
          role={actionNotice.tone === 'error' ? 'alert' : 'status'}
        >
          {actionNotice.message}
        </div>
      )}
      {loadError && (
        <div className="inspector-alert inspector-alert--error" role="alert">
          {loadError}
        </div>
      )}
      {scanActivityError && (
        <div className="inspector-alert inspector-alert--error" role="status">
          {scanActivityError}
        </div>
      )}

      <div className="toolbar">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search ID, name, email, or market..."
        />
        <select
          className="select-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter inspectors by account status"
        >
          {INSPECTOR_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>{filter.label}</option>
          ))}
        </select>
        {(query || statusFilter !== 'all') && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setQuery('')
              setStatusFilter('all')
            }}
          >
            <FiRotateCcw /> Clear filters
          </button>
        )}
      </div>

      <TableCard
        title={`Inspectors (${filtered.length})`}
        subtitle={
          isFirebaseEnabled
            ? 'Live inspector profiles from Firestore users'
            : 'Prototype records — connect Firebase to manage access'
        }
        columns={columns}
        rows={filtered}
        emptyMessage={isLoading ? 'Loading inspector accounts…' : 'No inspectors match your filters.'}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name || 'Inspector profile'}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setViewing(null)}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openEdit(viewing)}
              disabled={managementDisabled}
            >
              <FiEdit2 /> Edit profile
            </button>
          </>
        }
      >
        {viewing && (
          <div className="inspector-profile">
            <div className="avatar-circle avatar-circle--lg" aria-hidden="true">{viewing.photo}</div>
            <div className="inspector-profile__summary">
              <strong>{viewing.employeeId}</strong>
              <StatusBadge status={viewing.status} />
            </div>
            <dl className="inspector-details">
              <div><dt>Firebase UID</dt><dd>{viewing.id}</dd></div>
              <div><dt>Email</dt><dd>{viewing.email}</dd></div>
              <div><dt>Contact</dt><dd>{viewing.phone || 'Not provided'}</dd></div>
              <div><dt>Assigned market</dt><dd>{viewing.assignedArea}</dd></div>
              <div><dt>Scans logged</dt><dd>{viewing.scanCount}</dd></div>
              <div><dt>Last scan</dt><dd>{formatTimestamp(viewing.lastScanAt)}</dd></div>
            </dl>
          </div>
        )}
      </Modal>

      <InspectorFormModal
        open={creating}
        mode="create"
        form={form}
        isSaving={isSaving}
        error={formError}
        onChange={updateForm}
        onClose={() => {
          if (!isSaving) setCreating(false)
        }}
        onSubmit={handleCreate}
      />
      <InspectorFormModal
        open={Boolean(editing)}
        mode="edit"
        form={form}
        isSaving={isSaving}
        error={formError}
        onChange={updateForm}
        onClose={() => {
          if (!isSaving) setEditing(null)
        }}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={Boolean(changingAccess)}
        onClose={() => setChangingAccess(null)}
        onConfirm={handleAccessConfirm}
        title={
          changingAccess?.status === 'active'
            ? 'Deactivate inspector access?'
            : 'Activate inspector access?'
        }
        message={
          changingAccess?.status === 'active'
            ? `${changingAccess?.name} will no longer be authorized to use protected inspector data or submit assessments.`
            : `${changingAccess?.name} will regain access to the inspector mobile app and protected inspector data.`
        }
        confirmLabel={changingAccess?.status === 'active' ? 'Deactivate access' : 'Activate access'}
        danger={changingAccess?.status === 'active'}
        error={actionNotice?.tone === 'error' ? actionNotice.message : ''}
      />
    </div>
  )
}

function timestampValue(value) {
  return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0)
}

function formatTimestamp(value) {
  const timestamp = timestampValue(value)
  return timestamp
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
    : 'No scans yet'
}
