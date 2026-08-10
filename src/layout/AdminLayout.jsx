import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './AdminLayout.css'

// Which roles can access each route. This is the actual enforcement point
// on the frontend — Sidebar hiding a link is just UX, this is what stops
// someone from typing the URL directly. (A real backend must enforce this
// independently too — see the Firestore Security Rules discussion.)
const ROUTE_ACCESS = {
  '/dashboard': ['bfar_admin', 'market_admin'],
  '/assessments': ['bfar_admin'],
  '/reports': ['bfar_admin', 'market_admin'],
  '/inspectors': ['bfar_admin'],
  '/vendors': ['market_admin'],
  '/audit-trail': ['bfar_admin'],
  '/feedback': ['bfar_admin', 'market_admin'],
  '/admins': ['bfar_admin'],
  '/profile': ['bfar_admin', 'market_admin'],
  '/notifications': ['bfar_admin', 'market_admin'],
}

const BannerActionContext = createContext(null)

/** Renders a page-level primary action in the shared BFAR banner. */
export function BfarBannerAction({ children }) {
  const target = useContext(BannerActionContext)
  return target ? createPortal(children, target) : null
}

const BFAR_PAGE_HEADERS = {
  '/dashboard': ['Dashboard', 'Welcome back to FRISH Admin Portal'],
  '/assessments': ['Freshness Assessments', 'Review live scan results submitted by authorized inspectors'],
  '/reports': ['Report Management', 'Review and manage consumer and inspector submitted reports'],
  '/inspectors': ['Inspector Management', 'Create, view, and manage inspector account assignments'],
  '/vendors': ['Vendor Management', 'Create, view, and manage vendor records'],
  '/audit-trail': ['Audit Trail', 'Monitor system activities and user actions'],
  '/feedback': ['User Feedback', 'Review and manage user comments, suggestions, and feedback'],
  '/admins': ['Manage Admins', 'Manage BFAR and market administrator accounts'],
  '/profile': ['Profile Management', 'View and update your profile information and account settings'],
  '/notifications': ['Notifications', 'Stay updated on reports, reviews, assessments, and vendor actions.'],
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bannerActionTarget, setBannerActionTarget] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, authLoading } = useAuth()

  if (authLoading) {
    return <div className="admin-layout__loading">Checking your secure session…</div>
  }

  // Not logged in — bounce back to the login screen.
  if (!user) {
    return <Navigate to="/" replace />
  }

  // Logged in, but this role isn't allowed on this route — send to Dashboard
  // rather than showing a broken/empty page.
  const allowedRoles = ROUTE_ACCESS[location.pathname]
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  function handleMenuClick() {
    if (window.innerWidth <= 1024) {
      setMobileOpen((v) => !v)
    } else {
      setCollapsed((v) => !v)
    }
  }

  const [pageTitle, pageSubtitle] = BFAR_PAGE_HEADERS[location.pathname] || ['FRISH Admin Portal', 'Manage your FRISH administration workspace.']
  return (
    <BannerActionContext.Provider value={bannerActionTarget}>
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
        role={user.role}
        user={user}
      />
      <div className="admin-layout__main">
        <Topbar onMenuClick={handleMenuClick} user={user} />
        {user.role === 'bfar_admin' && <section className="bfar-welcome-banner"><div><span>BFAR-NCR ADMIN</span><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div><div ref={setBannerActionTarget} className="bfar-welcome-banner__action" /></section>}
        <div className={`admin-layout__content ${user.role === 'bfar_admin' ? 'admin-layout__content--bfar' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
    </BannerActionContext.Provider>
  )
}
