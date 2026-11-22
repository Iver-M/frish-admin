import { FEEDBACK_MODE } from '../services/feedbackEnvironment.js'
import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isLguCaseRef, usesLguCaseView } from '../services/authorityCasesBoundary.js'
import './AdminLayout.css'

// Which roles can access each route. This is the actual enforcement point
// on the frontend — Sidebar hiding a link is just UX, this is what stops
// someone from typing the URL directly. (A real backend must enforce this
// independently too — see the Firestore Security Rules discussion.)
const ROUTE_ACCESS = {
  '/dashboard': ['bfar_admin', 'market_admin'],
  '/assessments': ['bfar_admin'],
  '/reports': ['bfar_admin', 'market_admin'],
  '/consumer-intake': ['bfar_admin'],
  '/authority-cases': ['bfar_admin', 'market_admin'],
  '/inspectors': ['bfar_admin'],
  '/vendors': ['market_admin'],
  '/audit-trail': ['bfar_admin'],
  '/feedback': ['bfar_admin'],
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
  '/consumer-intake': ['Report Management', 'Review Consumer concerns and explicitly accept valid submissions'],
  '/authority-cases': ['Report Management', 'Track accepted Consumer cases through the shared Firebase workflow'],
  '/inspectors': ['Inspector Management', 'Create, view, and manage inspector account assignments'],
  '/vendors': ['Vendor Management', 'Create, view, and manage vendor records'],
  '/audit-trail': ['Audit Trail', 'Monitor system activities and user actions'],
  '/feedback': ['User Feedback', FEEDBACK_MODE === 'online_test' ? 'Read controlled team test feedback' : 'Read Consumer feedback submitted to the local Firebase emulators'],
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
  const { user, logout, authLoading, switchingSession } = useAuth()
  const currentPath = location.pathname.replace(/\/+$/, '') || '/'
  const pathname = currentPath.toLowerCase()
  const routeRoot = pathname.startsWith('/reports/')
    ? '/reports'
    : pathname.startsWith('/consumer-intake/')
    ? '/consumer-intake'
    : pathname.startsWith('/authority-cases/')
      ? '/authority-cases'
      : pathname
  // A pending session change must also redact the previous URL while offline.
  if (switchingSession || usesLguCaseView(user)) {
    if (routeRoot === '/audit-trail') return <Navigate to="/dashboard" replace />
    const params = new URLSearchParams(location.search)
    const rawCasePath = pathname.startsWith('/authority-cases/')
      && !isLguCaseRef(currentPath.slice('/authority-cases/'.length))
    const rawCaseQuery = routeRoot === '/reports'
      && params.getAll('caseId').some(caseId => !isLguCaseRef(caseId))
    const intakeLink = (routeRoot === '/reports' && params.get('view') === 'consumer-intake')
      || routeRoot === '/consumer-intake'
    if (rawCasePath || rawCaseQuery || intakeLink) return <Navigate to="/reports?view=consumer-cases" replace />
  }
  if (authLoading) {
    return <div className="admin-layout__loading">Checking your secure session…</div>
  }
  if (!user) return <Navigate to="/" replace />

  const allowedRoles = ROUTE_ACCESS[routeRoot]
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

  const [pageTitle, pageSubtitle] = BFAR_PAGE_HEADERS[routeRoot] || ['FRISH Admin Portal', 'Manage your FRISH administration workspace.']
  const sessionScope = JSON.stringify([user.uid, user.role, user.marketId, user.consumerPermissions?.role, user.consumerPermissions?.cases])
  return (
    <BannerActionContext.Provider value={bannerActionTarget}>
    <div className="admin-layout" key={sessionScope}>
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
