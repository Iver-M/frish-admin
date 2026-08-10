import { useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiAlertTriangle, FiBell, FiCheckCircle, FiFileText } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import { subscribeMarketRecords } from '../../../services/firestoreService.js'
import { getReportCode } from '../../../utils/reportCode.js'
import { markNotificationRead, markNotificationsRead, subscribeNotificationReadState } from '../../../utils/notificationReadState.js'
import { normalizeReportRecord } from '../../../utils/reportRecord.js'
import { normalizeScanRecord } from '../../../utils/scanRecord.js'
import './Notifications.css'

const DEMO_NOTIFICATIONS = [
  { id: 'demo-report', title: 'New report awaiting review', detail: 'A submitted report is ready for BFAR review.', createdAt: null, icon: FiAlertCircle, kind: 'alert' },
  { id: 'demo-assessment', title: 'New assessment received', detail: 'A freshness assessment has been submitted.', createdAt: null, icon: FiFileText, kind: 'info' },
]

export default function Notifications() {
  const navigate = useNavigate()
  const { user, isFirebaseEnabled } = useAuth()
  const [reports, setReports] = useState([])
  const [scans, setScans] = useState([])
  const [readNotificationIds, setReadNotificationIds] = useState(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isFirebaseEnabled) return undefined
    return subscribeMarketRecords('reports', user, setReports, (firebaseError) => setError(firebaseError.message || 'Unable to load live notifications.'))
  }, [isFirebaseEnabled, user])

  useEffect(
    () => subscribeNotificationReadState(user, setReadNotificationIds),
    [user],
  )

  useEffect(() => {
    if (!isFirebaseEnabled || user?.role !== 'bfar_admin') {
      setScans([])
      return undefined
    }
    return subscribeMarketRecords('scans', user, setScans, (firebaseError) => setError(firebaseError.message || 'Unable to load freshness alerts.'))
  }, [isFirebaseEnabled, user])

  const notifications = useMemo(() => {
    if (!isFirebaseEnabled) return DEMO_NOTIFICATIONS
    const reportNotifications = reports.map(normalizeReportRecord).flatMap((report) => {
      if (user?.role === 'bfar_admin' && report.status === 'resolved' && report.lguAction && !report.reporterUpdate) {
        return [{
          id: `outcome-${report.id}`,
          title: 'LGU conclusion ready to communicate',
          detail: `${getReportCode(report)} — review the LGU result and notify the original reporter`,
          createdAt: report.updatedAt || report.createdAt,
          icon: FiCheckCircle,
          kind: 'success',
          path: `/reports/${report.id}`,
        }]
      }
      if (user?.role === 'bfar_admin' && report.status === 'submitted') {
        return [{
          id: `submitted-${report.id}`,
          title: 'New field report submitted',
          detail: `${getReportCode(report)} — ${report.title || 'Inspection report'}${report.vendorName ? ` — ${report.vendorName}` : ''}`,
          createdAt: report.createdAt,
          icon: FiAlertCircle,
          kind: 'alert',
          path: `/reports/${report.id}`,
        }]
      }
      if (user?.role === 'market_admin' && report.status === 'forwarded-lgu') {
        return [{
          id: `forwarded-${report.id}`,
          title: 'New case forwarded by BFAR-NCR',
          detail: `${getReportCode(report)} — ${report.title || 'Inspection report'}`,
          createdAt: report.updatedAt || report.createdAt,
          icon: FiFileText,
          kind: 'warning',
          path: `/reports/${report.id}`,
        }]
      }
      return []
    })
    const scanNotifications = user?.role === 'bfar_admin'
      ? scans.map(normalizeScanRecord)
        .filter((scan) => scan.status === 'not-fresh')
        .map((scan) => ({
          id: `scan-${scan.id}`,
          title: 'Freshness concern detected',
          detail: `${scan.species} — submitted by ${scan.inspector}`,
          createdAt: scan.createdAt,
          icon: FiAlertTriangle,
          kind: 'alert',
          path: '/assessments',
        }))
      : []
    return [...reportNotifications, ...scanNotifications]
      .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))
  }, [isFirebaseEnabled, reports, scans, user?.role])

  const unreadCount = notifications.filter((item) => !readNotificationIds.has(item.id)).length
  const headerCopy = user?.role === 'market_admin'
    ? 'Cases newly forwarded by BFAR-NCR appear here automatically.'
    : 'Live field submissions, freshness concerns, and resolved LGU cases appear here automatically.'

  function markAllRead() {
    markNotificationsRead(user, notifications.map((item) => item.id))
  }

  function openNotification(item) {
    markNotificationRead(user, item.id)
    navigate(item.path || '/reports')
  }

  return <div className="page notifications-page market-workspace">
    <div className="notifications-page__header"><div><p className="workspace-kicker">ADMIN CENTER</p><h2>Notifications</h2><p>{headerCopy}</p></div><button className="btn btn-outline" onClick={() => navigate('/dashboard')}>Back to dashboard</button></div>
    <section className="notifications-card">
      <div className="notifications-card__heading"><div><h3>Operational notifications</h3><span className="notifications-live"><i /> {isFirebaseEnabled ? 'Live' : 'Demo data'}</span></div><div className="notifications-card__actions"><span>{unreadCount} unread</span>{unreadCount > 0 && <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all read</button>}</div></div>
      {error && <p className="notifications-error" role="alert">{error}</p>}
      <div className="notifications-list">{notifications.length ? notifications.map((item) => { const Icon = item.icon; const unread = !readNotificationIds.has(item.id); return <button className={`notification-item ${unread ? 'notification-item--unread' : ''}`} key={item.id} onClick={() => openNotification(item)}><span className={`notification-item__icon notification-item__icon--${item.kind}`}><Icon /></span><span className="notification-item__content"><strong>{item.title}</strong><small>{item.detail}</small></span><time>{formatTimestamp(item.createdAt)}</time></button> }) : <div className="notifications-empty"><FiBell size={30} /><strong>No actions waiting</strong><span>New report submissions, escalations, conclusions, and freshness concerns appear here in real time.</span></div>}</div>
    </section>
  </div>
}

function timestampValue(value) { return value?.toMillis?.() || 0 }
function formatTimestamp(value) { const timestamp = timestampValue(value); return timestamp ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp)) : 'Just now' }
