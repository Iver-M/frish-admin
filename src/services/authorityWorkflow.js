// Match the trusted Consumer authority state machine, not legacy /reports writes.
const ACTIONS = Object.freeze({
  submitted: [{ transition: 'assign_inspector', label: 'Assign inspector', nextStatus: 'assigned', consumerLabel: 'Under review' }],
  assigned: [{ transition: 'start_investigation', label: 'Start investigation', nextStatus: 'in_progress', consumerLabel: 'Investigating' }],
  in_progress: [
    { transition: 'forward_to_lgu', label: 'Forward to LGU', nextStatus: 'forwarded_lgu', consumerLabel: 'Forwarded to LGU' },
    { transition: 'close_no_violation', label: 'Close — no violation', nextStatus: 'closed_no_violation', consumerLabel: 'Closed — no violation' },
  ],
})

export const AUTHORITY_STATUS_LABELS = Object.freeze({
  submitted: 'Submitted to authority', assigned: 'Under review',
  in_progress: 'Investigating', forwarded_lgu: 'Forwarded to LGU',
  resolved: 'Resolved', closed_no_violation: 'Closed — no violation',
})

export function authorityStatusLabel(status) {
  return AUTHORITY_STATUS_LABELS[status] || 'Status unavailable'
}

export function authorityAction(transition) {
  const action = Object.values(ACTIONS).flat().find(item => item.transition === transition)
  return action ? { ...action } : null
}

export function availableAuthorityActions(record, user) {
  if (user?.role !== 'bfar_admin' || user.accountStatus !== 'active'
      || !user.uid || record?.sourceType !== 'consumer'
      || !Number.isSafeInteger(record.version) || record.version < 1) return []
  return (ACTIONS[record.status] || []).map(action => ({ ...action }))
}

export function buildAuthorityCommand(record, user, transition, inspector, requestId) {
  if (!availableAuthorityActions(record, user).some(action => action.transition === transition)
      || !/^[A-Za-z0-9_-]{1,128}$/.test(record.caseId || '')
      || record.version >= Number.MAX_SAFE_INTEGER
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId || '')) {
    throw new Error('Reload this case before changing its status.')
  }
  let assignment = null
  if (transition === 'assign_inspector') {
    const name = String(inspector?.name || inspector?.displayName || inspector?.email || '').trim()
    if (inspector?.role !== 'inspector' || inspector.accountStatus !== 'active'
        || typeof inspector.id !== 'string' || !inspector.id.trim()
        || inspector.id !== inspector.id.trim() || inspector.id.length > 128
        || /[\u0000-\u001f\u007f]/.test(inspector.id)
        || !name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name)) {
      throw new Error('Choose an active inspector before assigning this case.')
    }
    assignment = { inspectorId: inspector.id, inspectorName: name }
  }
  return Object.freeze({
    schemaVersion: '1.0', requestId, caseId: record.caseId,
    expectedVersion: record.version, transition, assignment, reasonCode: 'workflow',
  })
}

export function isAmbiguousAuthorityFailure(error) {
  // Only explicit backend rejections establish that a mutation did not commit.
  return !['permission-denied', 'unauthenticated', 'invalid-argument',
    'failed-precondition', 'aborted', 'resource-exhausted'].includes(
    String(error?.code || '').replace(/^functions\//, ''))
}

export function authorityWorkflowError(error) {
  const code = String(error?.code || '').replace(/^functions\//, '')
  if (code === 'aborted') return 'This case changed or this request conflicts with another action. Review the latest status before trying again.'
  if (code === 'permission-denied' || code === 'unauthenticated') return 'Your account is not authorized for this case action. Sign in with an approved BFAR account.'
  if (code === 'resource-exhausted') return 'Too many case requests. Wait before trying again.'
  if (isAmbiguousAuthorityFailure(error)) return 'The result could not be confirmed. Retry the same request to check whether it was already saved.'
  return 'This case action could not be applied. Check the current status and inspector selection.'
}

export function validateAuthorityResult(command, result) {
  const action = authorityAction(command.transition)
  const fields = ['schemaVersion', 'outcome', 'caseId', 'status', 'version']
  if (!action || !result || typeof result !== 'object' || Array.isArray(result)
      || Object.keys(result).length !== fields.length || !fields.every(field => Object.hasOwn(result, field))
      || result.schemaVersion !== '1.0' || result.outcome !== 'accepted'
      || result.caseId !== command.caseId || result.status !== action.nextStatus
      || result.version !== command.expectedVersion + 1) {
    throw Object.assign(new Error('The case update result is unavailable.'), { code: 'functions/internal' })
  }
  return Object.fromEntries(fields.map(field => [field, result[field]]))
}

export function createAuthorityTransitionClient(send) {
  return async command => validateAuthorityResult(command, await send(command))
}
