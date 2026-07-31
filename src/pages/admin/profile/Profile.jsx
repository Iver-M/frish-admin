import { useState } from 'react'
import { FiLock, FiEdit2, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi'
import Modal from '../../../components/Modal.jsx'
import { getAdminProfile } from '../../../data/profile.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import './Profile.css'

const ROLE_LABELS = {
  bfar_admin: 'System Administrator',
  market_admin: 'Market Admin',
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function Profile() {
  const { user } = useAuth()
  const fallback = getAdminProfile() // static department/phone/account metadata for this prototype
  const [changingPassword, setChangingPassword] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user.name, email: fallback.email, phone: fallback.phone, department: fallback.department })

  function handleSaveProfile() {
    // UI only — persist via a real API/Firestore call later.
    alert('Profile updated (UI only, not persisted).')
    setEditing(false)
  }

  function handleChangePassword() {
    alert('Password change flow triggered (UI only).')
    setChangingPassword(false)
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h2>Profile Management</h2>
          <p className="page-header-row__subtitle">View and update your profile information and account settings</p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-col">
          <div className="profile-panel">
            <h3 className="profile-panel__title">Profile Overview</h3>
            <div className="profile-overview">
              <div className="profile-overview__avatar">{getInitials(user.name)}</div>
              <p className="profile-overview__name">{user.name}</p>
              <p className="profile-overview__role">{ROLE_LABELS[user.role]}</p>
            </div>
            <div className="profile-overview__contact">
              <span><FiMail size={13} /> {fallback.email}</span>
              <span><FiPhone size={13} /> {fallback.phone}</span>
              <span><FiBriefcase size={13} /> {fallback.department}</span>
            </div>
          </div>

          <div className="profile-panel">
            <h3 className="profile-panel__title">Account Information</h3>
            <p className="profile-panel__subtitle">View your account details</p>
            <div className="profile-info-list">
              <InfoRow label="Account Created" value={fallback.accountCreated} />
              <InfoRow label="Account Status" value="Active" valueClass="profile-info-list__value--active" />
              <InfoRow label="Last Login" value={fallback.lastLogin} />
            </div>
          </div>
        </div>

        <div className="profile-col">
          <div className="profile-panel">
            <div className="profile-panel__header-row">
              <div>
                <h3 className="profile-panel__title">Personal Information</h3>
                <p className="profile-panel__subtitle">Update your personal details</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                <FiEdit2 size={13} /> Edit Profile
              </button>
            </div>
            <div className="profile-info-list">
              <InfoRow label="Full Name" value={user.name} />
              <InfoRow label="Email Address" value={fallback.email} />
              <InfoRow label="Phone Number" value={fallback.phone} />
              <InfoRow label="Role" value={ROLE_LABELS[user.role]} />
              {user.role === 'market_admin' && <InfoRow label="Assigned Market" value={user.marketName} />}
              <InfoRow label="Department" value={fallback.department} />
            </div>
          </div>

          <div className="profile-panel">
            <div className="profile-panel__header-row">
              <div>
                <h3 className="profile-panel__title">Security Settings</h3>
                <p className="profile-panel__subtitle">Change your password</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setChangingPassword(true)}>
                <FiLock size={13} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        title="Change Password"
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setChangingPassword(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleChangePassword}>
              Update Password
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Current Password</label>
          <input type="password" className="text-input" placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label>New Password</label>
          <input type="password" className="text-input" placeholder="••••••••" />
        </div>
        <div className="form-group">
          <label>Confirm New Password</label>
          <input type="password" className="text-input" placeholder="••••••••" />
        </div>
      </Modal>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile"
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}>
              Save Changes
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Full Name</label>
          <input
            className="text-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            className="text-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input
            className="text-input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Department</label>
          <input
            className="text-input"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}

function InfoRow({ label, value, valueClass = '' }) {
  return (
    <div className="profile-info-list__row">
      <span className="profile-info-list__label">{label}</span>
      <span className={`profile-info-list__value ${valueClass}`.trim()}>{value}</span>
    </div>
  )
}
