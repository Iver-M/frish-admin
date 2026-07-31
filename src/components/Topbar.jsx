import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiBell, FiMenu, FiSearch, FiUsers } from 'react-icons/fi'
import './Topbar.css'

const NOTIFICATIONS = [
  ['New report escalated by BFAR-NCR', '5 Minutes Ago'],
  ['Pending review overdue', '8 Minutes Ago'],
  ['BFAR-NCR acknowledged your decision', '9 Minutes Ago'],
  ['New Assessment', '10 Minutes Ago'],
]

function getInitials(name = '') { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') }

export default function Topbar({ onMenuClick, user }) {
  const [openPanel, setOpenPanel] = useState(null)
  const navigate = useNavigate()
  const initials = getInitials(user?.name) || 'AD'
  const email = user?.role === 'bfar_admin' ? 'admin@frish.gov.ph' : 'market.admin@frish.gov.ph'
  const goTo = (path) => { setOpenPanel(null); navigate(path) }

  return <header className="topbar">
    <div className="topbar__left">
      <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Toggle menu"><FiMenu size={20} /></button>
      <label className="topbar__search"><FiSearch size={16} /><input placeholder="Search" aria-label="Search ids, reports, vendors" /></label>
    </div>
    <div className="topbar__right">
      <div className="topbar__control">
        <button className="topbar__icon-btn" onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')} aria-label="Notifications" aria-expanded={openPanel === 'notifications'}><FiBell size={21} /><span className="topbar__notif-dot">3</span></button>
        {openPanel === 'notifications' && <section className="topbar-popover topbar-popover--notifications" aria-label="Notifications">{NOTIFICATIONS.map(([title, time]) => <button key={title} className="notification-row" onClick={() => goTo('/reports')}><span className="notification-row__avatar"><FiUsers /></span><span><strong>{title}</strong><small>{time}</small></span></button>)}<button className="topbar-popover__footer" onClick={() => goTo('/notifications')}>View All Notifications</button></section>}
      </div>
      <div className="topbar__control">
        <button className="topbar__avatar" onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')} aria-label="Open profile menu" aria-expanded={openPanel === 'profile'}>{initials}</button>
        {openPanel === 'profile' && <section className="topbar-popover topbar-popover--profile" aria-label="Profile menu"><button className="profile-summary" onClick={() => goTo('/profile')}><span className="profile-summary__avatar">{initials}</span><span><strong>Frish Admin</strong><small>{email}</small></span></button><button className="profile-menu-item" onClick={() => goTo('/profile')}>Profile</button><button className="profile-menu-item" onClick={() => goTo('/profile')}>Account Settings</button></section>}
      </div>
    </div>
  </header>
}
