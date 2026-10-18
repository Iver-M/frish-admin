// UI diagnostics only. Signed tokens, current accounts and operation policies
// are still verified by Consumer-owned services on every protected request.
export function evaluateConsumerRuntime(env = {}) {
  const configured = env.VITE_USE_FIREBASE === 'true'
    && Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID)
  const requested = env.VITE_CONSUMER_AUTHORITY_MODE || 'disabled'
  const emulator = env.VITE_AUTHORITY_CASES_EMULATOR === 'true'
  if (requested === 'disabled' && !emulator) return { mode: 'disabled', message: 'Consumer integration is disabled for this build. Ask the project owner to select an approved test setup.' }
  if (!configured) return { mode: 'disabled', message: 'Consumer integration was requested, but Firebase configuration is incomplete.' }
  if (env.VITE_FIREBASE_PROJECT_ID !== 'frish-app2026') return { mode: 'disabled', message: 'Consumer integration requires the approved frish-app2026 test project. This build points to a different environment.' }
  if (emulator && (requested === 'cloud_test' || !env.DEV)) return { mode: 'disabled', message: 'Consumer emulator configuration conflicts with cloud mode or a non-development build.' }
  if (emulator) return { mode: 'emulator', message: 'Local Consumer emulator. Reports saved here do not appear in the shared cloud-test queue.' }
  if (requested === 'cloud_test') return { mode: 'cloud_test', message: 'Shared Consumer cloud-test environment. Local emulator reports are stored separately.' }
  return { mode: 'disabled', message: 'The requested Consumer environment is unsupported.' }
}

export function consumerPermissions(claims = {}, mode = 'disabled') {
  const cloud = mode === 'cloud_test'
  const active = mode !== 'disabled' && claims.accountStatus === 'active'
    && (cloud ? claims.environment === 'staging' && claims.cloudTestApproved === true
      && claims.claimVersion === 'frish-cloud-test-v1' && claims.policyVersion === 'frish-cloud-test-v1'
      && Array.isArray(claims.marketIds) && claims.marketIds.includes('pasig') : true)
  return { role: active ? claims.role : null, intake: Boolean(active && claims.role === 'bfar_admin'),
    cases: Boolean(active && ['bfar_admin', 'lgu', 'lgu_admin', 'market_admin'].includes(claims.role)) }
}

export const CASE_ACTIONS = Object.freeze({
  assign_inspector: { from: 'submitted', to: 'assigned', roles: ['bfar_admin'], label: 'Assign inspector' },
  start_investigation: { from: 'assigned', to: 'in_progress', roles: ['bfar_admin', 'inspector'], label: 'Start investigation' },
  forward_to_lgu: { from: 'in_progress', to: 'forwarded_lgu', roles: ['bfar_admin', 'inspector'], label: 'Forward to LGU' },
  close_no_violation: { from: 'in_progress', to: 'closed_no_violation', roles: ['bfar_admin'], label: 'Close — no violation' },
  resolve: { from: 'forwarded_lgu', to: 'resolved', roles: ['lgu'], label: 'Record resolution' },
})

export function permittedCaseActions(record, actor) {
  if (!Number.isSafeInteger(record?.version) || record.version < 1) return []
  return Object.entries(CASE_ACTIONS).filter(([, action]) => action.from === record.status
    && action.roles.includes(actor?.role)
    && (actor.role !== 'inspector' || actor.uid === record.assignedInspectorId)
    && (actor.role !== 'lgu' || record.marketId === 'pasig')).map(([name]) => name)
}

export function authorityFailureMessage(error) {
  const code = String(error?.code || '').replace(/^functions\//, '').replace(/^firestore\//, '')
  if (code === 'authority-cases-disabled') return 'Consumer integration is disabled or its environment is incomplete. Ask the project owner to check this build configuration.'
  if (code === 'permission-denied') return 'Consumer access was denied. Portal access does not grant Consumer permissions. Ask the project owner to check signed staff claims, current account, market scope and operation policy.'
  if (code === 'unauthenticated') return 'Consumer credentials could not be verified. Sign in again; if it persists, ask the owner to check App Check and the approved web origin.'
  if (code === 'app-check-required') return 'Case actions require the approved web App Check configuration. Ask the project owner to complete it.'
  if (code === 'request-storage-unavailable') return 'This action could not be retained in this browser tab. No new request was sent. Restore session storage before retrying.'
  if (code === 'not-found' && error?.operation === 'intake-detail') return 'This Consumer concern no longer exists.'
  if (code === 'not-found') return 'The Consumer endpoint was not found. Ask the owner to check its deployment, project and region.'
  if (error?.details?.category === 'stale_version') return 'This case changed. Refresh the recorded case before preparing another action.'
  if (code === 'aborted') return 'This action conflicts with the recorded case or request. Refresh the case and review its version.'
  if (code === 'failed-precondition' && /index/i.test(error?.message || '')) return 'The Consumer query requires a Firestore index. Ask the owner to verify the approved indexes.'
  if (code === 'failed-precondition') return 'The Consumer service environment or current record does not permit this action. It may already have an intake decision or be ineligible for this workflow.'
  if (code === 'invalid-argument') return 'The Consumer service rejected this request. Refresh and check the selected action.'
  if (code === 'resource-exhausted') return 'The Consumer service request limit was reached. Wait before retrying.'
  if (code === 'invalid-response') return 'The Consumer service returned an unexpected response. The action is unconfirmed; retry the same request.'
  return 'The Consumer request failed or the service is unavailable. Check the connection and retry. If it persists, ask the owner to check deployment and the approved web origin.'
}

export function formatConsumerDate(value) {
  const seconds = value?.seconds ?? value?._seconds
  const millis = value?.toMillis?.() ?? (typeof value === 'string' ? Date.parse(value) : typeof seconds === 'number' ? seconds * 1000 : NaN)
  const date = new Date(millis)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Not recorded'
}
