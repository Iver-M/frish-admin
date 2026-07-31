import './StatusBadge.css'

// Central map so every page renders statuses consistently.
// Extend this map, don't create one-off badge styles per page.
const STATUS_MAP = {
  fresh: { label: 'Fresh', tone: 'success' },
  'not-fresh': { label: 'Not Fresh', tone: 'danger' },
  moderate: { label: 'Moderate', tone: 'warning' },

  'pending-review': { label: 'Pending Review', tone: 'info' },
  pending: { label: 'Pending Review', tone: 'info' },
  'under-investigation': { label: 'Under Investigation', tone: 'danger' },
  investigating: { label: 'Under Investigation', tone: 'danger' },
  validated: { label: 'Validated', tone: 'success' },
  'forwarded-lgu': { label: 'Forwarded to LGU', tone: 'neutral' },
  'in-progress': { label: 'In Progress', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },

  active: { label: 'Active', tone: 'success' },
  'on-leave': { label: 'On Leave', tone: 'warning' },
  inactive: { label: 'Inactive', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },
}

export default function StatusBadge({ status, label }) {
  const meta = STATUS_MAP[status] || { label: label || status, tone: 'neutral' }
  return (
    <span className={`status-badge status-badge--${meta.tone}`}>
      <span className="status-badge__dot" />
      {label || meta.label}
    </span>
  )
}
