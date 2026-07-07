import { FiBell, FiMenu } from 'react-icons/fi'
import { getAdminProfile } from '../data/profile.js'
import './Topbar.css'

export default function Topbar({ title, welcomeMessage, onMenuClick }) {
  const profile = getAdminProfile()

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <FiMenu size={20} />
        </button>
        <div>
          <h1 className="topbar__title">{title}</h1>
          {welcomeMessage && <p className="topbar__welcome">{welcomeMessage}</p>}
        </div>
      </div>

      <div className="topbar__right">
        <button className="topbar__icon-btn" aria-label="Notifications">
          <FiBell size={19} />
          <span className="topbar__notif-dot" />
        </button>
        <div className="topbar__avatar">{profile.avatarInitials}</div>
      </div>
    </header>
  )
}
