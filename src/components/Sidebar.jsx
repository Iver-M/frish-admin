import { NavLink } from 'react-router-dom'
import {
  FiGrid,
  FiClipboard,
  FiFileText,
  FiUsers,
  FiShoppingBag,
  FiList,
  FiMessageSquare,
  FiUser,
  FiLogOut,
} from 'react-icons/fi'
import Logo from './common/Logo.jsx'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/assessments', label: 'Assessments', icon: FiClipboard },
  { to: '/reports', label: 'Reports', icon: FiFileText },
  { to: '/inspectors', label: 'Inspectors', icon: FiUsers },
  { to: '/vendors', label: 'Vendors', icon: FiShoppingBag },
  { to: '/audit-trail', label: 'Audit Trail', icon: FiList },
  { to: '/feedback', label: 'User Feedback', icon: FiMessageSquare },
  { to: '/profile', label: 'Profile', icon: FiUser },
]

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onLogout }) {
  return (
    <>
      {mobileOpen && <div className="sidebar-scrim" onClick={onMobileClose} />}

      <aside
        className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${
          mobileOpen ? 'sidebar--mobile-open' : ''
        }`}
      >
        <div className="sidebar__brand">
          <Logo className={`sidebar__logo ${collapsed ? 'sidebar__logo--collapsed' : ''}`.trim()} />
        </div>

        <nav className="sidebar__nav">
          <ul>
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                  }
                  onClick={onMobileClose}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="sidebar__link-icon" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <button className="sidebar__link sidebar__logout" onClick={onLogout} title={collapsed ? 'Log Out' : undefined}>
            <FiLogOut size={18} className="sidebar__link-icon" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
