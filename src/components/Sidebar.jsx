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
  FiShield,
  FiInbox,
  FiBriefcase,
} from 'react-icons/fi'
import { AUTHORITY_CASES_RUNTIME_ENABLED } from '../services/authorityCasesBoundary.js'
import Logo from './common/Logo.jsx'
import './Sidebar.css'

// `roles` lists who can see each item. Keep this in sync with ROUTE_ACCESS
// in AdminLayout.jsx, which enforces the same rule at the route level (a
// role-filtered nav link is UX only — the route guard is what actually
// stops direct navigation to a page a role shouldn't see).
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: FiGrid, roles: ['bfar_admin', 'market_admin'] },
  { to: '/assessments', label: 'Freshness Assessments', icon: FiClipboard, roles: ['bfar_admin'] },
  { to: '/reports', label: 'Reports', icon: FiFileText, roles: ['bfar_admin', 'market_admin'] },
  ...(AUTHORITY_CASES_RUNTIME_ENABLED ? [
    { to: '/consumer-intake', label: 'Consumer Intake', icon: FiInbox, roles: ['bfar_admin'] },
    { to: '/authority-cases', label: 'Authority Cases', icon: FiBriefcase, roles: ['bfar_admin'] },
  ] : []),
  { to: '/inspectors', label: 'Inspectors', icon: FiUsers, roles: ['bfar_admin'] },
  { to: '/vendors', label: 'Vendors', icon: FiShoppingBag, roles: ['bfar_admin', 'market_admin'] },
  { to: '/audit-trail', label: 'Audit Trail', icon: FiList, roles: ['bfar_admin'] },
  { to: '/feedback', label: 'User Feedback', icon: FiMessageSquare, roles: ['bfar_admin', 'market_admin'] },
  { to: '/admins', label: 'Manage Admins', icon: FiShield, roles: ['bfar_admin'] },
  { to: '/profile', label: 'Profile', icon: FiUser, roles: ['bfar_admin', 'market_admin'] },
]

export default function Sidebar({ collapsed, mobileOpen, onMobileClose, onLogout, role, user }) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role) && (role !== 'bfar_admin' || item.to !== '/vendors') && (role !== 'market_admin' || ['/dashboard', '/reports', '/vendors', '/profile'].includes(item.to))).map((item) =>
    role === 'market_admin' && item.to === '/reports' ? { ...item, label: 'Escalated Reports' } : item,
  )

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
            {visibleItems.map(({ to, label, icon: Icon }) => (
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
          <div className="sidebar__account">
            <span className="sidebar__account-avatar">{role === 'bfar_admin' ? 'BF' : 'LG'}</span>
            {!collapsed && (
              <span className="sidebar__account-copy">
                <strong>{role === 'bfar_admin' ? 'BFAR-NCR Admin' : 'LGU Admin'}</strong>
                <small>{user?.marketName || 'Pasig City'}</small>
              </span>
            )}
            <button className="sidebar__signout" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
