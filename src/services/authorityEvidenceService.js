import { auth, isAuthorityEmulatorEnabled, isFirebaseEnabled } from './firebase.js'

export const AUTHORITY_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024
export const AUTHORITY_EVIDENCE_TYPES = Object.freeze(['eyesAndSkin', 'gills'])
export const AUTHORITY_EVIDENCE_ELIGIBLE_STATUSES = Object.freeze([
  'submitted', 'assigned', 'in_progress', 'forwarded_lgu',
])

const DEFAULT_ENDPOINT = 'http://127.0.0.1:5001/frish-app2026/asia-southeast1/getAuthorityCaseEvidence'
const EXPECTED_PATH = '/frish-app2026/asia-southeast1/getAuthorityCaseEvidence'
const APPROVED_ENDPOINT_ORIGINS = new Set([
  'http://localhost:5001',
  'http://127.0.0.1:5001',
])
const APPROVED_ADMIN_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
const APPROVED_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const CASE_ID = /^[A-Za-z0-9_-]{1,128}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const runtimeEnv = import.meta.env || {}
export const AUTHORITY_EVIDENCE_ENDPOINT = runtimeEnv.VITE_AUTHORITY_EVIDENCE_ENDPOINT || DEFAULT_ENDPOINT

export class AuthorityEvidenceError extends Error {
  constructor(category, message) {
    super(message || evidenceErrorMessage(category))
    this.name = 'AuthorityEvidenceError'
    this.category = category
  }
}

export function isApprovedEvidenceEndpoint(value) {
  try {
    const endpoint = new URL(value)
    return endpoint.protocol === 'http:'
      && APPROVED_ENDPOINT_ORIGINS.has(endpoint.origin)
      && endpoint.pathname === EXPECTED_PATH
      && !endpoint.search
      && !endpoint.hash
  } catch {
    return false
  }
}

export function evaluateAuthorityEvidenceEnvironment({
  dev,
  firebaseEnabled,
  authorityEmulatorEnabled,
  evidenceFlag,
  projectId,
  endpoint,
  pageOrigin,
}) {
  return Boolean(dev
    && firebaseEnabled
    && authorityEmulatorEnabled
    && evidenceFlag === 'true'
    && projectId === 'frish-app2026'
    && isApprovedEvidenceEndpoint(endpoint)
    && APPROVED_ADMIN_ORIGINS.has(pageOrigin))
}

const currentPageOrigin = typeof window === 'undefined' ? '' : window.location.origin
export const AUTHORITY_EVIDENCE_ENVIRONMENT_ENABLED = evaluateAuthorityEvidenceEnvironment({
  dev: runtimeEnv.DEV,
  firebaseEnabled: isFirebaseEnabled,
  authorityEmulatorEnabled: isAuthorityEmulatorEnabled,
  evidenceFlag: runtimeEnv.VITE_AUTHORITY_EVIDENCE_EMULATOR,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  endpoint: AUTHORITY_EVIDENCE_ENDPOINT,
  pageOrigin: currentPageOrigin,
})

export function isAuthorityEvidenceViewerEnabled(user) {
  return evaluateAuthorityEvidenceViewer(AUTHORITY_EVIDENCE_ENVIRONMENT_ENABLED, user)
}

export function evaluateAuthorityEvidenceViewer(environmentEnabled, user) {
  return Boolean(environmentEnabled
    && user?.role === 'bfar_admin'
    && user?.accountStatus === 'active')
}

export function isAuthorityEvidenceStatusEligible(status) {
  return AUTHORITY_EVIDENCE_ELIGIBLE_STATUSES.includes(status)
}

export function evidenceErrorMessage(category) {
  const messages = {
    authentication_required: 'Sign in again before viewing evidence.',
    account_not_authorized: 'This account is not authorized to view submitted evidence.',
    evidence_unavailable: 'This evidence is unavailable for authorized review.',
    case_status_not_eligible: 'Evidence is unavailable at this case status.',
    invalid_request: 'The evidence request is invalid.',
    invalid_response: 'The evidence service returned an invalid response.',
    service_unavailable: 'The emulator evidence service is unavailable. Retry after it is restored.',
    timeout: 'The evidence request timed out. Please retry.',
    request_cancelled: 'The evidence request was cancelled.',
    retrieval_failed: 'Evidence could not be retrieved. Please retry.',
  }
  return messages[category] || messages.retrieval_failed
}

function createRequestId() {
  const requestId = globalThis.crypto?.randomUUID?.()
  if (!requestId || !UUID.test(requestId)) {
    throw new AuthorityEvidenceError('invalid_request')
  }
  return requestId.toLowerCase()
}

function validateAction({ authorityCaseId, evidenceType, caseStatus, requestId }) {
  if (typeof authorityCaseId !== 'string' || !CASE_ID.test(authorityCaseId)
    || !AUTHORITY_EVIDENCE_TYPES.includes(evidenceType)
    || !isAuthorityEvidenceStatusEligible(caseStatus)
    || !UUID.test(requestId)) {
    const category = !isAuthorityEvidenceStatusEligible(caseStatus)
      ? 'case_status_not_eligible'
      : 'invalid_request'
    throw new AuthorityEvidenceError(category)
  }
}

function mapHttpStatus(status) {
  if (status === 400 || status === 405) return 'invalid_request'
  if (status === 401) return 'authentication_required'
  if (status === 403) return 'account_not_authorized'
  if (status === 404) return 'evidence_unavailable'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'service_unavailable'
  return 'retrieval_failed'
}

function parseContentLength(headers) {
  const header = headers.get('content-length')
  if (header === null) return null
  if (!/^\d+$/.test(header)) throw new AuthorityEvidenceError('invalid_response')
  const value = Number(header)
  if (!Number.isSafeInteger(value) || value <= 0 || value > AUTHORITY_EVIDENCE_MAX_BYTES) {
    throw new AuthorityEvidenceError('invalid_response')
  }
  return value
}

async function freshBfarToken(authInstance) {
  const currentUser = authInstance?.currentUser
  if (!currentUser) throw new AuthorityEvidenceError('authentication_required')
  let result
  try {
    result = await currentUser.getIdTokenResult(true)
  } catch {
    throw new AuthorityEvidenceError('authentication_required')
  }
  if (result?.claims?.role !== 'bfar_admin' || result?.claims?.accountStatus !== 'active') {
    throw new AuthorityEvidenceError('account_not_authorized')
  }
  if (typeof result.token !== 'string' || !result.token) {
    throw new AuthorityEvidenceError('authentication_required')
  }
  return result.token
}

export function createAuthorityEvidenceClient({
  authInstance = auth,
  endpoint = AUTHORITY_EVIDENCE_ENDPOINT,
  fetchImpl = globalThis.fetch,
  makeRequestId = createRequestId,
  timeoutMs = 15000,
  runtimeEnabled = AUTHORITY_EVIDENCE_ENVIRONMENT_ENABLED,
} = {}) {
  const active = new Map()

  async function perform({ authorityCaseId, evidenceType, caseStatus, signal, requestId }) {
    if (!runtimeEnabled || !isApprovedEvidenceEndpoint(endpoint)) {
      throw new AuthorityEvidenceError('service_unavailable')
    }
    validateAction({ authorityCaseId, evidenceType, caseStatus, requestId })
    const token = await freshBfarToken(authInstance)
    const controller = new AbortController()
    let timedOut = false
    const cancel = () => controller.abort()
    if (signal?.aborted) controller.abort()
    else signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorityCaseId, evidenceType, requestId }),
        signal: controller.signal,
        cache: 'no-store',
        credentials: 'omit',
      })
      if (!response.ok) throw new AuthorityEvidenceError(mapHttpStatus(response.status))
      const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!APPROVED_MIME_TYPES.has(contentType)) throw new AuthorityEvidenceError('invalid_response')
      const declaredLength = parseContentLength(response.headers)
      const blob = await response.blob()
      if (!(blob instanceof Blob)
        || !APPROVED_MIME_TYPES.has(blob.type)
        || blob.type !== contentType
        || blob.size <= 0
        || blob.size > AUTHORITY_EVIDENCE_MAX_BYTES
        || (declaredLength !== null && declaredLength !== blob.size)) {
        throw new AuthorityEvidenceError('invalid_response')
      }
      return Object.freeze({ blob, contentType, size: blob.size, requestId })
    } catch (error) {
      if (error instanceof AuthorityEvidenceError) throw error
      if (controller.signal.aborted) {
        throw new AuthorityEvidenceError(timedOut ? 'timeout' : 'request_cancelled')
      }
      if (error instanceof TypeError) throw new AuthorityEvidenceError('service_unavailable')
      throw new AuthorityEvidenceError('retrieval_failed')
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
    }
  }

  function retrieve(action) {
    const key = `${action.authorityCaseId}:${action.evidenceType}`
    const existing = active.get(key)
    if (existing) return existing
    const requestId = makeRequestId()
    const pending = perform({ ...action, requestId }).finally(() => {
      if (active.get(key) === pending) active.delete(key)
    })
    active.set(key, pending)
    return pending
  }

  return Object.freeze({ retrieve })
}

export const authorityEvidenceClient = createAuthorityEvidenceClient()
