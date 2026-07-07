import { FiUsers, FiClipboard, FiAlertTriangle, FiPercent, FiTrendingUp } from 'react-icons/fi'
import './StatCard.css'

const ICONS = {
  inspectors: FiUsers,
  assessments: FiClipboard,
  reports: FiAlertTriangle,
  'pass-rate': FiPercent,
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
