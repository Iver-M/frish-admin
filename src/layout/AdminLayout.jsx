import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { getAdminProfile } from '../data/profile.js'
import './AdminLayout.css'

// Maps each route to the title/welcome copy shown in the Topbar.
// Add an entry here whenever a new page is added to the router.
const PAGE_META = {
  '/dashboard': { title: 'Dashboard', welcome: 'Welcome back to the FRISH Admin Portal' },
  '/assessments': { title: 'Assessments', welcome: 'Review freshness assessments submitted by inspectors' },
  '/reports': { title: 'Reports', welcome: 'Consumer and inspector submitted reports' },
  '/inspectors': { title: 'Inspectors', welcome: 'Manage inspector accounts and assignments' },
  '/vendors': { title: 'Vendors', welcome: 'Manage registered market vendors' },
  '/audit-trail': { title: 'Audit Trail', welcome: 'Track administrative actions across the system' },
  '/feedback': { title: 'User Feedback', welcome: 'See what consumers and inspectors are saying' },
  '/profile': { title: 'Profile', welcome: 'Manage your administrator account' },
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getAdminProfile()

  const meta = PAGE_META[location.pathname] || { title: 'FRISH Admin', welcome: '' }

  function handleLogout() {
    // No real auth in this prototype — simply return to the login screen.
    navigate('/')
  }

  function handleMenuClick() {
    if (window.innerWidth <= 1024) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div className="admin-layout__main">
        <Topbar
          title={meta.title}
          welcomeMessage={`${meta.welcome}${meta.welcome ? ' — ' : ''}${profile.name}`}
          onMenuClick={handleMenuClick}
        />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
