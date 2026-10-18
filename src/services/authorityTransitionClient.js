import { CASE_ACTIONS } from './consumerAuthorityPolicy.js'

export const CLOUD_TRANSITION_ENDPOINT = 'https://asia-southeast1-frish-app2026.cloudfunctions.net/transitionAuthorityCase'
const LOCAL_PATH = '/frish-app2026/asia-southeast1/transitionAuthorityCase'
export function approvedTransitionEndpoint(endpoint, mode) {
  if (mode === 'cloud_test') return endpoint === CLOUD_TRANSITION_ENDPOINT
  if (mode !== 'emulator') return false
  try {
    const url = new URL(endpoint)
    return ['http://127.0.0.1:5001', 'http://localhost:5001', 'http://127.0.0.1:5002'].includes(url.origin)
      && url.pathname === LOCAL_PATH && !url.search && !url.hash && !url.username && !url.password
  } catch { return false }
}
function failure(code, details) { return Object.assign(new Error('Consumer authority request failed.'), { code, details }) }
export function createCaseCommand(record, transition, assignment = null, requestId = globalThis.crypto.randomUUID()) {
  if (!Object.hasOwn(CASE_ACTIONS, transition) || !/^[A-Za-z0-9_-]{1,128}$/.test(record?.caseId || '')
    || !Number.isSafeInteger(record.version) || record.version < 1 || record.version >= Number.MAX_SAFE_INTEGER
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)) throw failure('invalid-argument')
  if (transition === 'assign_inspector') {
    if (!assignment || !validText(assignment.inspectorId, 128) || !validText(assignment.inspectorName, 120)) throw failure('invalid-argument')
  } else if (assignment !== null) throw failure('invalid-argument')
  return Object.freeze({ schemaVersion: '1.0', requestId, caseId: record.caseId,
    expectedVersion: record.version, transition, assignment: assignment ? Object.freeze({ inspectorId: assignment.inspectorId, inspectorName: assignment.inspectorName }) : null, reasonCode: 'workflow' })
}
function validText(value, max) { return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) }

export function transitionJournal(storage, scope) {
  const key = `frish:unconfirmed-authority:${scope}`
  return {
    read() {
      const saved = storage.getItem(key)
      if (!saved) return null
      const value = JSON.parse(saved)
      const command = createCaseCommand({ caseId: value.caseId, version: value.expectedVersion }, value.transition, value.assignment, value.requestId)
      if (JSON.stringify(value) !== JSON.stringify(command)) throw failure('invalid-argument')
      return command
    },
    save(command) { storage.setItem(key, JSON.stringify(command)) },
    clear() { storage.removeItem(key) },
  }
}

// An uncertain response keeps the exact command available to the caller. Never
// generate a fresh requestId/version during retry or optimistically update data.
export function createAuthorityTransitionClient({ endpoint, mode, getAuthToken, getAppCheckToken, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  return async command => {
    if (!approvedTransitionEndpoint(endpoint, mode)) throw failure('authority-cases-disabled')
    const token = await getAuthToken()
    if (!token) throw failure('unauthenticated')
    const appCheck = await getAppCheckToken()
    if (!appCheck) throw failure('app-check-required')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(endpoint, { method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Firebase-AppCheck': appCheck },
        body: JSON.stringify({ data: command }), signal: controller.signal })
      let body
      try { body = await response.json() } catch { throw failure(response.status === 404 ? 'not-found' : 'invalid-response') }
      if (!response.ok || body.error) throw failure(String(body.error?.status || (response.status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE')).toLowerCase().replaceAll('_', '-'), body.error?.details)
      const result = body.result
      if (result?.schemaVersion !== '1.0' || result.outcome !== 'accepted' || result.caseId !== command.caseId
        || result.version !== command.expectedVersion + 1 || result.status !== CASE_ACTIONS[command.transition]?.to) throw failure('invalid-response')
      return result
    } catch (error) {
      if (typeof error?.code === 'string') throw error
      throw failure('unavailable')
    } finally { clearTimeout(timer) }
  }
}
