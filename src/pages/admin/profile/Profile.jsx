import { useEffect, useMemo, useState } from 'react'
import { FiBriefcase, FiCheckCircle, FiEdit2, FiLock, FiMail, FiPhone } from 'react-icons/fi'
import Modal from '../../../components/Modal.jsx'
import { getAdminProfile as getDemoAdminProfile } from '../../../data/profile.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import { changeAdminPassword } from '../../../services/authService.js'
import { subscribeRecord, updateOwnAdminProfile } from '../../../services/firestoreService.js'
import './Profile.css'

const ROLE_LABELS = {
  bfar_admin: 'BFAR-NCR Administrator',
  market_admin: 'LGU Market Administrator',
}

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

export default function Profile() {
  const { user, isFirebaseEnabled, refreshProfile } = useAuth()
  const demoProfile = getDemoAdminProfile()
  const [profileRecord, setProfileRecord] = useState(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [notice, setNotice] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', department: '' })
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM)

  useEffect(() => {
    if (!isFirebaseEnabled || !user?.uid) return undefined
    return subscribeRecord(
      'users',
      user.uid,
      setProfileRecord,
      (error) => setProfileError(error.message || 'Unable to load your profile.'),
    )
  }, [isFirebaseEnabled, user?.uid])

  const profile = useMemo(() => ({
    name: profileRecord?.name || profileRecord?.displayName || user?.name || 'Administrator',
    email: user?.email || profileRecord?.email || demoProfile.email,
    phone: profileRecord?.phone || user?.phone || (!isFirebaseEnabled ? demoProfile.phone : '') || 'Not provided',
    department: profileRecord?.department || user?.department || (!isFirebaseEnabled ? demoProfile.department : '') || defaultDepartment(user?.role),
    role: user?.role,
    marketName: profileRecord?.marketName || user?.marketName || (user?.role === 'market_admin' ? 'Pasig Public Market' : ''),
    accountStatus: profileRecord?.accountStatus || profileRecord?.status || user?.accountStatus || 'active',
    createdAt: profileRecord?.createdAt || user?.createdAt || (!isFirebaseEnabled ? demoProfile.accountCreated : null),
    lastLoginAt: user?.lastLoginAt || (!isFirebaseEnabled ? demoProfile.lastLogin : null),
    authProvider: user?.authProvider || 'password',
  }), [demoProfile, isFirebaseEnabled, profileRecord, user])

  const passwordManagedByGoogle = profile.authProvider === 'google.com'

  function openEditProfile() {
    setForm({
      name: profile.name,
      phone: profile.phone === 'Not provided' ? '' : profile.phone,
      department: profile.department,
    })
    setProfileError('')
    setEditing(true)
  }

  async function handleSaveProfile() {
    const name = form.name.trim()
    const department = form.department.trim()
    if (!name || !department) {
      setProfileError('Full name and department are required.')
      return
    }

    setSavingProfile(true)
    setProfileError('')
    try {
      if (isFirebaseEnabled) {
        await updateOwnAdminProfile(user.uid, {
          name,
          displayName: name,
          phone: form.phone.trim(),
          department,
        }, {
          actorId: user.uid,
          actorName: name,
          action: 'Updated own profile',
          details: `${ROLE_LABELS[user.role] || 'Administrator'} updated their contact profile.`,
          category: 'Profile Management',
          marketId: user.marketId || 'pasig',
        })
        await refreshProfile()
      } else {
        setProfileRecord((current) => ({ ...current, name, displayName: name, phone: form.phone.trim(), department }))
      }
      setEditing(false)
      setNotice({ tone: 'success', text: 'Your profile information was updated.' })
    } catch (error) {
      setProfileError(error.message || 'Unable to update your profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  function openPasswordDialog() {
    setPasswordForm(EMPTY_PASSWORD_FORM)
    setPasswordError('')
    setChangingPassword(true)
  }

  async function handleChangePassword() {
    if (!passwordForm.currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Use a new password with at least eight characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new password and confirmation do not match.')
      return
    }

    setSavingPassword(true)
    setPasswordError('')
    try {
      await changeAdminPassword(passwordForm.currentPassword, passwordForm.newPassword)
      setChangingPassword(false)
      setPasswordForm(EMPTY_PASSWORD_FORM)
      setNotice({ tone: 'success', text: 'Your password was changed successfully.' })
    } catch (error) {
      setPasswordError(error.message || 'Unable to change your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="page profile-page">
      <div className="page-header-row">
        <div>
          <h2>Profile Management</h2>
          <p className="page-header-row__subtitle">Review your administrator identity, contact details, and sign-in security.</p>
        </div>
        {isFirebaseEnabled && <span className="profile-live-indicator"><span /> Live profile</span>}
      </div>

      {notice && <div className={`profile-notice profile-notice--${notice.tone}`} role="status"><FiCheckCircle /> <span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}
      {profileError && !editing && <p className="profile-error" role="alert">{profileError}</p>}

      <div className="profile-grid">
        <div className="profile-col">
          <section className="profile-panel">
            <h3 className="profile-panel__title">Profile Overview</h3>
            <div className="profile-overview">
              <div className="profile-overview__avatar">{getInitials(profile.name)}</div>
              <p className="profile-overview__name">{profile.name}</p>
              <p className="profile-overview__role">{ROLE_LABELS[profile.role] || 'Administrator'}</p>
            </div>
            <div className="profile-overview__contact">
              <span><FiMail size={13} /> {profile.email}</span>
              <span><FiPhone size={13} /> {profile.phone}</span>
              <span><FiBriefcase size={13} /> {profile.department}</span>
            </div>
          </section>

          <section className="profile-panel">
            <h3 className="profile-panel__title">Account Information</h3>
            <p className="profile-panel__subtitle">Authentication and access details</p>
            <div className="profile-info-list">
              <InfoRow label="Account Created" value={formatTimestamp(profile.createdAt)} />
              <InfoRow label="Account Status" value={titleCase(profile.accountStatus)} valueClass={`profile-info-list__value--${profile.accountStatus === 'active' ? 'active' : 'inactive'}`} />
              <InfoRow label="Last Login" value={formatTimestamp(profile.lastLoginAt, true)} />
              <InfoRow label="Sign-in Method" value={passwordManagedByGoogle ? 'Google account' : 'Email and password'} />
            </div>
          </section>
        </div>

        <div className="profile-col">
          <section className="profile-panel">
            <div className="profile-panel__header-row">
              <div>
                <h3 className="profile-panel__title">Personal Information</h3>
                <p className="profile-panel__subtitle">Contact details used within the admin portal</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={openEditProfile}>
                <FiEdit2 size={13} /> Edit Profile
              </button>
            </div>
            <div className="profile-info-list">
              <InfoRow label="Full Name" value={profile.name} />
              <InfoRow label="Email Address" value={profile.email} />
              <InfoRow label="Phone Number" value={profile.phone} />
              <InfoRow label="Role" value={ROLE_LABELS[profile.role] || 'Administrator'} />
              {profile.role === 'market_admin' && <InfoRow label="Assigned Market" value={profile.marketName} />}
              <InfoRow label="Department" value={profile.department} />
            </div>
          </section>

          <section className="profile-panel profile-security">
            <div className="profile-panel__header-row">
              <div>
                <h3 className="profile-panel__title">Security Settings</h3>
                <p className="profile-panel__subtitle">{passwordManagedByGoogle ? 'Password security is managed by your Google account.' : 'Change the password for this administrator account.'}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={openPasswordDialog} disabled={passwordManagedByGoogle || !isFirebaseEnabled} title={passwordManagedByGoogle ? 'Manage this password through Google' : undefined}>
                <FiLock size={13} /> {passwordManagedByGoogle ? 'Managed by Google' : 'Change Password'}
              </button>
            </div>
            <p className="profile-security__note">Your email address, role, status, and assigned market are controlled by the authorized account-management workflow and cannot be changed here.</p>
          </section>
        </div>
      </div>

      <Modal open={changingPassword} onClose={() => !savingPassword && setChangingPassword(false)} title="Change Password" footer={<><button className="btn btn-outline btn-sm" onClick={() => setChangingPassword(false)} disabled={savingPassword}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Update Password'}</button></>}>
        <PasswordField label="Current Password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
        <PasswordField label="New Password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
        <PasswordField label="Confirm New Password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} />
        {passwordError && <p className="profile-modal-error" role="alert">{passwordError}</p>}
      </Modal>

      <Modal open={editing} onClose={() => !savingProfile && setEditing(false)} title="Edit Profile" footer={<><button className="btn btn-outline btn-sm" onClick={() => setEditing(false)} disabled={savingProfile}>Cancel</button><button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save Changes'}</button></>}>
        <div className="form-group"><label>Full Name</label><input className="text-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
        <div className="form-group"><label>Email Address</label><input className="text-input" value={profile.email} disabled /><small className="profile-field-help">This is your Firebase Authentication email and cannot be edited from this page.</small></div>
        <div className="form-group"><label>Phone Number</label><input className="text-input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="e.g. +63 917 123 4567" /></div>
        <div className="form-group"><label>Department</label><input className="text-input" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} /></div>
        {profileError && <p className="profile-modal-error" role="alert">{profileError}</p>}
      </Modal>
    </div>
  )
}

function InfoRow({ label, value, valueClass = '' }) {
  return <div className="profile-info-list__row"><span className="profile-info-list__label">{label}</span><span className={`profile-info-list__value ${valueClass}`.trim()}>{value || 'Not available'}</span></div>
}

function PasswordField({ label, value, onChange }) {
  return <div className="form-group"><label>{label}</label><input type="password" className="text-input" value={value} onChange={(event) => onChange(event.target.value)} autoComplete={label === 'Current Password' ? 'current-password' : 'new-password'} placeholder="••••••••" /></div>
}

function getInitials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') }
function defaultDepartment(role) { return role === 'market_admin' ? 'Pasig City Market Administration Office' : 'Bureau of Fisheries and Aquatic Resources (BFAR)' }
function titleCase(value = '') { return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Not available' }
function formatTimestamp(value, includeTime = false) {
  if (!value) return 'Not available'
  if (typeof value === 'string' && Number.isNaN(Date.parse(value))) return value
  const date = value?.toDate?.() || new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-PH', includeTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date)
}
