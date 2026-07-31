import {
  FiUsers,
  FiClipboard,
  FiAlertTriangle,
  FiPercent,
  FiTrendingUp,
  FiClock,
  FiSearch,
  FiCheckCircle,
  FiSend,
  FiUserCheck,
  FiUserX,
  FiActivity,
  FiTag,
  FiMessageSquare,
  FiSmile,
  FiShoppingBag,
  FiMap,
  FiInbox,
  FiLoader,
} from 'react-icons/fi'
import './StatCard.css'

// One shared icon set so every module's stat cards look consistent.
// Add a new key here whenever a page needs a stat type not yet covered.
const ICONS = {
  inspectors: FiUsers,
  assessments: FiClipboard,
  reports: FiAlertTriangle,
  'pass-rate': FiPercent,
  pending: FiClock,
  investigating: FiSearch,
  validated: FiCheckCircle,
  forwarded: FiSend,
  active: FiUserCheck,
  inactive: FiUserX,
  activity: FiActivity,
  categories: FiTag,
  feedback: FiMessageSquare,
  sentiment: FiSmile,
  vendors: FiShoppingBag,
  markets: FiMap,
  'in-progress': FiLoader,
  resolved: FiCheckCircle,
  total: FiInbox,
}

export default function StatCard({ label, value, sublabel, icon, trend = 'flat' }) {
  const Icon = ICONS[icon] || FiTrendingUp

  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <span className={`stat-card__icon stat-card__icon--${icon || 'default'}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="stat-card__value">{value}</div>
      {sublabel && (
        <div className={`stat-card__sublabel stat-card__sublabel--${trend}`}>{sublabel}</div>
      )}
    </div>
  )
}
