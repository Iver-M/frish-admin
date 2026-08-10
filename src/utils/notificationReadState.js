const READ_EVENT = 'frish:notification-read-state'

export function notificationReadKey(user) {
  return `frish_admin_notification_ids_${user?.uid || user?.role || 'demo'}`
}

export function readNotificationIds(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(notificationReadKey(user)) || '[]')
    return new Set(Array.isArray(stored) ? stored.filter(Boolean) : [])
  } catch {
    return new Set()
  }
}

export function markNotificationRead(user, notificationId) {
  const ids = readNotificationIds(user)
  ids.add(notificationId)
  persistNotificationIds(user, ids)
}

export function markNotificationsRead(user, notificationIds) {
  const ids = readNotificationIds(user)
  notificationIds.forEach((id) => ids.add(id))
  persistNotificationIds(user, ids)
}

export function subscribeNotificationReadState(user, callback) {
  const key = notificationReadKey(user)
  const refresh = (event) => {
    if (event?.type === 'storage' && event.key !== key) return
    if (event?.type === READ_EVENT && event.detail?.key !== key) return
    callback(readNotificationIds(user))
  }

  callback(readNotificationIds(user))
  window.addEventListener('storage', refresh)
  window.addEventListener(READ_EVENT, refresh)
  return () => {
    window.removeEventListener('storage', refresh)
    window.removeEventListener(READ_EVENT, refresh)
  }
}

function persistNotificationIds(user, ids) {
  const key = notificationReadKey(user)
  localStorage.setItem(key, JSON.stringify([...ids]))
  window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { key } }))
}
