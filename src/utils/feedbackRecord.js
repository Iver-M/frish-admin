const FEEDBACK_STATUSES = new Set(['pending', 'in-progress', 'resolved'])

export function normalizeFeedbackRecord(record = {}) {
  const rating = finiteRating(record.rating)
  const createdAt = record.createdAt
    || record.submittedAt
    || (record.date ? `${record.date} ${record.time || ''}`.trim() : null)
  const userName = cleanText(record.userName)
    || cleanText(record.displayName)
    || cleanText(record.user)
    || cleanText(record.userEmail)
    || 'Inspector'
  const status = normalizeFeedbackStatus(record.status)

  return {
    ...record,
    id: String(record.id || ''),
    feedbackCode: feedbackCode(record.id),
    user: userName,
    userId: cleanText(record.userId),
    userEmail: cleanText(record.userEmail),
    userType: roleLabel(record.role),
    rating,
    sentiment: rating
      ? (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral')
      : (cleanText(record.sentiment) || 'neutral'),
    category: cleanText(record.category) || (record.platform === 'mobile' ? 'Mobile app feedback' : 'General feedback'),
    subject: cleanText(record.subject) || `${rating || 'Unrated'}-star app experience`,
    comment: cleanText(record.message) || cleanText(record.comment) || 'No message provided.',
    status,
    platform: cleanText(record.platform) || 'Not recorded',
    appVersion: cleanText(record.appVersion) || 'Not recorded',
    createdAt,
    updatedAt: record.updatedAt || createdAt,
    adminReply: record.adminReply && typeof record.adminReply === 'object' ? record.adminReply : null,
  }
}

export function normalizeFeedbackStatus(value) {
  const normalized = String(value || 'pending').trim().toLowerCase().replace(/[_\s]+/g, '-')
  return FEEDBACK_STATUSES.has(normalized) ? normalized : 'pending'
}

export function feedbackTimestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Date.parse(value) || 0
  return 0
}

export function formatFeedbackTimestamp(value) {
  const timestamp = feedbackTimestampValue(value)
  return timestamp
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
    : 'Just now'
}

function feedbackCode(value) {
  const id = String(value || '')
  const number = [...id].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 10000, 0)
  return `FDB-${String(number).padStart(4, '0')}`
}

function finiteRating(value) {
  const rating = Number(value)
  return Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 0
}

function roleLabel(value) {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'inspector') return 'Inspector'
  if (role === 'consumer') return 'Consumer'
  return 'User'
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}
