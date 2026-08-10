export const EMPTY_FORM = {
  authUid: '',
  employeeId: '',
  name: '',
  email: '',
  phone: '',
  marketId: 'pasig',
  marketName: 'Pasig Public Market',
}

export const INSPECTOR_FILTERS = [
  { value: 'all', label: 'All accounts' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function inspectorPayload(form) {
  const employeeId = form.employeeId.trim()
  const name = form.name.trim()
  return {
    employeeId,
    inspectorCode: employeeId,
    name,
    displayName: name,
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    marketId: 'pasig',
    marketName: 'Pasig Public Market',
    assignedArea: 'Pasig Public Market',
  }
}

export function normalizeInspector(profile) {
  const id = String(profile.id || '')
  const name = profile.name || profile.displayName || profile.email || 'Unnamed inspector'
  const rawStatus = String(profile.accountStatus || profile.status || 'inactive').toLowerCase()
  const employeeId =
    profile.employeeId
    || profile.inspectorCode
    || (id.startsWith('INS-') ? id : `INS-${id.slice(0, 6).toUpperCase() || 'NEW'}`)
  const numericAssessmentCount = Number(profile.assessmentCount ?? 0)

  return {
    ...profile,
    id,
    employeeId,
    name,
    email: profile.email || 'Not provided',
    phone: profile.phone || '',
    assignedArea: profile.marketName || profile.assignedArea || 'Pasig Public Market',
    marketId: profile.marketId || 'pasig',
    status: rawStatus === 'active' ? 'active' : 'inactive',
    photo: name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase(),
    assessmentCount: Number.isFinite(numericAssessmentCount) ? numericAssessmentCount : 0,
  }
}

export function auditEntry(user, action, details) {
  return {
    actorId: user?.uid || 'bfar-admin',
    actorName: user?.name || 'BFAR-NCR Admin',
    action,
    details,
    category: 'Inspector Management',
    marketId: 'pasig',
  }
}

export function dataErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '')

  if (code === 'permission-denied' || /insufficient permissions/i.test(message)) {
    return 'You do not have permission to manage inspector profiles. Sign in with an active BFAR administrator account and publish the latest Firestore rules.'
  }
  if (code === 'unavailable' || code === 'firestore/unavailable') {
    return 'Inspector records are temporarily unavailable. Check your connection and try again.'
  }
  if (/profile already exists/i.test(message)) return message
  if (code === 'not-found' || code === 'firestore/not-found') {
    return 'This inspector profile no longer exists. Refresh the page and try again.'
  }
  if (code === 'invalid-argument') {
    return 'The Firebase Authentication UID is not valid. Copy the UID from Firebase Authentication and try again.'
  }
  return 'The inspector record could not be saved. Please try again.'
}
