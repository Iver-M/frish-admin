import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAlertTriangle, FiBell, FiCheckCircle, FiMenu, FiMessageSquare, FiSearch, FiUsers } from 'react-icons/fi'
import { isFirebaseEnabled } from '../services/firebase.js'
import { subscribeMarketRecords } from '../services/firestoreService.js'
import { getReportCode } from '../utils/reportCode.js'
import { markNotificationRead, subscribeNotificationReadState } from '../utils/notificationReadState.js'
import { normalizeFeedbackRecord } from '../utils/feedbackRecord.js'
import { normalizeReportRecord } from '../utils/reportRecord.js'
import { normalizeScanRecord } from '../utils/scanRecord.js'
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
  const [reports, setReports] = useState([])
  const [scans, setScans] = useState([])
  const [feedback, setFeedback] = useState([])
  const [readNotificationIds, setReadNotificationIds] = useState(new Set())
  const [globalQuery, setGlobalQuery] = useState('')
  const navigate = useNavigate()
  const initials = getInitials(user?.name) || 'AD'
  const email = user?.email || (user?.role === 'bfar_admin' ? 'admin@frish.gov.ph' : 'market.admin@frish.gov.ph')
  const profileName = user?.name || (user?.role === 'bfar_admin' ? 'BFAR-NCR Admin' : 'Pasig Public Market Admin')
  const goTo = (path) => { setOpenPanel(null); navigate(path) }
  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    return subscribeMarketRecords('reports', user, setReports, () => setReports([]))
  }, [user])

  useEffect(() => {
    if (!isFirebaseEnabled || user?.role !== 'bfar_admin') {
      setFeedback([])
      return undefined
    }
    return subscribeMarketRecords('feedback', user, setFeedback, () => setFeedback([]))
  }, [user])

  useEffect(
    () => subscribeNotificationReadState(user, setReadNotificationIds),
    [user],
  )

  useEffect(() => {
    if (!isFirebaseEnabled || user?.role !== 'bfar_admin') {
      setScans([])
      return undefined
    }
    return subscribeMarketRecords('scans', user, setScans, () => setScans([]))
  }, [user])

  const liveNotifications = useMemo(() => {
    const reportNotifications = reports.map(normalizeReportRecord).flatMap((report) => {
    if (user?.role === 'bfar_admin' && report.status === 'resolved' && report.lguAction && !report.reporterUpdate) {
      return [{
        id: `outcome-${report.id}`,
        reportId: report.id,
        title: 'LGU conclusion ready to communicate',
        detail: `${getReportCode(report)} — review and notify the original reporter`,
        timestamp: report.updatedAt || report.createdAt,
        icon: FiCheckCircle,
      }]
    }
    if (user?.role === 'bfar_admin' && report.status === 'submitted') {
      return [{
        id: `submitted-${report.id}`,
        reportId: report.id,
        title: 'New field report submitted',
        detail: `${getReportCode(report)} — ${report.title || 'Inspection report'}`,
        timestamp: report.createdAt,
        icon: FiUsers,
      }]
    }
    if (user?.role === 'bfar_admin' && report.status === 'under-lgu-action') {
      return [{
        id: `lgu-acknowledged-${report.id}`,
        reportId: report.id,
        title: 'Pasig LGU acknowledged the case',
        detail: `${getReportCode(report)} — administrative action has started`,
        timestamp: report.lguAcknowledgedAt || report.updatedAt || report.createdAt,
        icon: FiCheckCircle,
      }]
    }
    if (user?.role === 'market_admin' && report.status === 'forwarded-lgu') {
      return [{
        id: `forwarded-${report.id}`,
        reportId: report.id,
        path: `/reports/${report.id}`,
        title: 'New case forwarded by BFAR-NCR',
        detail: `${getReportCode(report)} — ${report.title || 'Inspection report'}`,
        timestamp: report.updatedAt || report.createdAt,
        icon: FiUsers,
      }]
    }
    return []
    })
    const scanNotifications = user?.role === 'bfar_admin'
      ? scans.map(normalizeScanRecord)
        .filter((scan) => scan.status === 'not-fresh')
        .map((scan) => ({
          id: `scan-${scan.id}`,
          path: '/assessments',
          title: 'Freshness concern detected',
          detail: `${scan.species} — ${scan.inspector}`,
          timestamp: scan.createdAt,
          icon: FiAlertTriangle,
        }))
      : []
    const feedbackNotifications = user?.role === 'bfar_admin'
      ? feedback.map(normalizeFeedbackRecord)
        .filter((item) => item.status === 'pending')
        .map((item) => ({
          id: `feedback-${item.id}`,
          path: '/feedback',
          title: 'New mobile feedback received',
          detail: `${item.feedbackCode} — ${item.user} · ${item.rating || 0}/5`,
          timestamp: item.createdAt,
          icon: FiMessageSquare,
        }))
      : []
    return [...reportNotifications, ...scanNotifications, ...feedbackNotifications]
      .sort((a, b) => timestampValue(b.timestamp) - timestampValue(a.timestamp))
  }, [feedback, reports, scans, user?.role])
  const unreadNotifications = liveNotifications.filter((item) => !readNotificationIds.has(item.id))
  const panelNotifications = liveNotifications.slice(0, 4)
  const notificationCount = isFirebaseEnabled ? unreadNotifications.length : NOTIFICATIONS.length

  function openNotification(item) {
    markNotificationRead(user, item.id)
    goTo(item.path || `/reports/${item.reportId}`)
  }

  function handleGlobalSearch(event) {
    event.preventDefault()
    const search = globalQuery.trim()
    navigate(search ? `/reports?search=${encodeURIComponent(search)}` : '/reports')
  }

  return <header className="topbar">
    <div className="topbar__left">
      <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Toggle menu"><FiMenu size={20} /></button>
      <form className="topbar__search" role="search" onSubmit={handleGlobalSearch}>
        <FiSearch size={16} aria-hidden="true" />
        <input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="Search reports" aria-label="Search report code, vendor, species, or inspector" />
        <button type="submit" aria-label="Run report search">Search</button>
      </form>
    </div>
    <div className="topbar__right">
      <div className="topbar__control">
        <button className="topbar__icon-btn" onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')} aria-label="Notifications" aria-expanded={openPanel === 'notifications'}><FiBell size={21} />{notificationCount > 0 && <span className="topbar__notif-dot">{notificationCount > 9 ? '9+' : notificationCount}</span>}</button>
        {openPanel === 'notifications' && <section className="topbar-popover topbar-popover--notifications" aria-label="Notifications">{isFirebaseEnabled ? (panelNotifications.length ? panelNotifications.map((item) => { const Icon = item.icon; const unread = !readNotificationIds.has(item.id); return <button key={item.id} className={`notification-row ${unread ? 'notification-row--unread' : ''}`} onClick={() => openNotification(item)}><span className="notification-row__avatar"><Icon /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span></button> }) : <p className="topbar-popover__empty">No actions waiting</p>) : NOTIFICATIONS.map(([title, time]) => <button key={title} className="notification-row" onClick={() => goTo('/reports')}><span className="notification-row__avatar"><FiUsers /></span><span><strong>{title}</strong><small>{time}</small></span></button>)}<button className="topbar-popover__footer" onClick={() => goTo('/notifications')}>View All Notifications</button></section>}
      </div>
      <div className="topbar__control">
        <button className="topbar__avatar" onClick={() => setOpenPanel(openPanel === 'profile' ? null : 'profile')} aria-label="Open profile menu" aria-expanded={openPanel === 'profile'}>{initials}</button>
        {openPanel === 'profile' && <section className="topbar-popover topbar-popover--profile" aria-label="Profile menu"><button className="profile-summary" onClick={() => goTo('/profile')}><span className="profile-summary__avatar">{initials}</span><span><strong>{profileName}</strong><small>{email}</small></span></button><button className="profile-menu-item" onClick={() => goTo('/profile')}>Profile</button><button className="profile-menu-item" onClick={() => goTo('/profile')}>Account Settings</button></section>}
      </div>
    </div>
  </header>
}

function timestampValue(value) { return value?.toMillis?.() || 0 }
