import { useState } from 'react'
import { FiLock, FiEdit2 } from 'react-icons/fi'
import Modal from '../../../components/Modal.jsx'
import { getAdminProfile } from '../../../data/profile.js'
import './Profile.css'

export default function Profile() {
  const profile = getAdminProfile()
  const [changingPassword, setChangingPassword] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: profile.name, email: profile.email, department: profile.department })

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
        <h2>Profile</h2>
      </div>

      <div className="profile-card">
        <div className="profile-card__avatar">{profile.avatarInitials}</div>

        <div className="profile-card__info">
          <h3>{profile.name}</h3>
          <p className="profile-card__role">{profile.role}</p>

          <div className="profile-card__details">
            <DetailItem label="Email" value={profile.email} />
            <DetailItem label="Department" value={profile.department} />
            <DetailItem label="Administrator Since" value={profile.joined} />
          </div>

          <div className="profile-card__actions">
            <button className="btn btn-outline" onClick={() => setChangingPassword(true)}>
              <FiLock size={14} /> Change Password
            </button>
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              <FiEdit2 size={14} /> Edit Profile
            </button>
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

function DetailItem({ label, value }) {
  return (
    <div className="profile-detail-item">
      <span className="profile-detail-item__label">{label}</span>
      <span className="profile-detail-item__value">{value}</span>
    </div>
  )
}
