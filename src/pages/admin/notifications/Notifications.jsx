import { FiAlertCircle, FiCheckCircle, FiClock, FiFileText, FiUsers } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext.jsx'
import './Notifications.css'

const NOTIFICATIONS = [
  { title: 'New report escalated by BFAR-NCR', detail: 'REP-2026-081 was forwarded for administrative action.', time: '5 minutes ago', icon: FiAlertCircle, target: '/reports', kind: 'alert', unread: true },
  { title: 'Pending review overdue', detail: 'REP-2026-069 has been awaiting a decision for more than 24 hours.', time: '8 minutes ago', icon: FiClock, target: '/reports', kind: 'warning', unread: true },
  { title: 'BFAR-NCR acknowledged your decision', detail: 'Your decision for REP-2026-072 has been received.', time: '9 minutes ago', icon: FiCheckCircle, target: '/audit-trail', kind: 'success', unread: true },
  { title: 'New assessment received', detail: 'DLG-2026-290 passed with 92% freshness confidence.', time: '10 minutes ago', icon: FiFileText, target: '/assessments', kind: 'info', unread: false },
  { title: 'Vendor follow-up needed', detail: 'A vendor with repeat violations needs an inspection follow-up.', time: 'Yesterday', icon: FiUsers, target: '/vendors', kind: 'warning', unread: false },
]

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const visibleNotifications = NOTIFICATIONS.filter((item) => user?.role === 'bfar_admin' || item.target !== '/audit-trail')

  return <div className="page notifications-page market-workspace">
    <div className="notifications-page__header"><div><p className="workspace-kicker">ADMIN CENTER</p><h2>Notifications</h2><p>Stay updated on reports, reviews, assessments, and vendor actions.</p></div><button className="btn btn-outline" onClick={() => navigate('/dashboard')}>Back to dashboard</button></div>
    <section className="notifications-card">
      <div className="notifications-card__heading"><h3>All notifications</h3><span>{visibleNotifications.filter((item) => item.unread).length} unread</span></div>
      <div className="notifications-list">{visibleNotifications.map((item) => { const Icon = item.icon; return <button className={`notification-item ${item.unread ? 'notification-item--unread' : ''}`} key={item.title} onClick={() => navigate(item.target)}><span className={`notification-item__icon notification-item__icon--${item.kind}`}><Icon /></span><span className="notification-item__content"><strong>{item.title}</strong><small>{item.detail}</small></span><time>{item.time}</time></button> })}</div>
    </section>
  </div>
}
