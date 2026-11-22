import { collection, doc, getDoc, getDocs, getDocFromServer, getDocsFromServer, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, authorityRuntimeMode, consumerRuntime, db, functions, getAuthorityAppCheckToken } from './authorityFirebase.js'
import { authorityFailureMessage } from './consumerAuthorityPolicy.js'
import { CLOUD_TRANSITION_ENDPOINT, createAuthorityTransitionClient } from './authorityTransitionClient.js'
import { createConsumerIntakeClient } from './authorityIntakeClient.js'

export const AUTHORITY_CASES_COLLECTION = 'authorityCases'
export const AUTHORITY_CASES_RUNTIME_MODE = authorityRuntimeMode
export const AUTHORITY_CASES_RUNTIME_ENABLED = authorityRuntimeMode !== 'disabled'
export const AUTHORITY_CASES_IS_CLOUD = authorityRuntimeMode === 'cloud_test'
export const AUTHORITY_RUNTIME_MESSAGE = consumerRuntime.message
const LGU_CASES_COLLECTION = 'authorityLguCaseViews'
const LGU_CASE_STATUSES = ['forwarded_lgu', 'resolved']
const LGU_CLAIM_ROLES = ['lgu', 'lgu_admin', 'market_admin']
export const isLguCaseRef = value => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
const runtimeEnv = import.meta.env || {}
export const transitionAuthorityCase = createAuthorityTransitionClient({
  endpoint: runtimeEnv.VITE_AUTHORITY_TRANSITION_ENDPOINT || (AUTHORITY_CASES_IS_CLOUD ? CLOUD_TRANSITION_ENDPOINT : 'http://127.0.0.1:5001/frish-app2026/asia-southeast1/transitionAuthorityCase'),
  mode: authorityRuntimeMode,
  getAuthSession: () => auth?.currentUser,
  getAuthToken: user => user.getIdToken(true),
  getAppCheckToken: getAuthorityAppCheckToken,
})

const AUTHORITY_CASE_VIEW_FIELDS = Object.freeze([
  'id', 'schemaVersion', 'caseId', 'sourceConcernReportId', 'sourceScanId',
  'reporterRef', 'sourceType', 'marketId', 'assignedMarket', 'title',
  'vendorOrStall', 'reason', 'description', 'reporterContactPolicy',
  'evidenceReferences', 'analysisSummary', 'analysisTrustState', 'status',
  'assignedInspectorId', 'assignedInspectorName', 'createdAt', 'updatedAt',
  'promotedAt', 'promotedBy', 'version',
])

export function sanitizeAuthorityCase(record) {
  if (!record || typeof record !== 'object') return null
  return Object.fromEntries(
    AUTHORITY_CASE_VIEW_FIELDS
      .filter((field) => Object.prototype.hasOwnProperty.call(record, field))
      .map((field) => [field, record[field]]),
  )
}

export function requireAuthorityCasesRuntime() {
  if (AUTHORITY_CASES_RUNTIME_ENABLED) return true
  const error = new Error('Consumer authority integration is not enabled for this build.')
  error.code = 'authority-cases-disabled'
  throw error
}

async function call(name, data = {}) {
  requireAuthorityCasesRuntime()
  // Refresh the token so newly issued BFAR cloud-test claims are used by the
  // callable immediately instead of waiting for Firebase Auth's token cache.
  if (!auth?.currentUser) throw Object.assign(new Error('Sign in again.'), { code: 'unauthenticated' })
  await auth.currentUser.getIdToken(true)
  return (await httpsCallable(functions, name)(data)).data
}

const intakeClient = createConsumerIntakeClient(call)
export const listPendingConsumerConcerns = intakeClient.list
export const getPendingConsumerConcern = intakeClient.detail
export const promoteConsumerConcern = intakeClient.accept
export const rejectConsumerConcern = intakeClient.reject

export function usesLguCaseView(user) {
  return AUTHORITY_CASES_IS_CLOUD
    && (user?.role === 'market_admin' || LGU_CLAIM_ROLES.includes(user?.consumerPermissions?.role))
}

function cloudReadDenied(user) {
  if (!AUTHORITY_CASES_IS_CLOUD) return null
  const { role, marketId, consumerPermissions } = user || {}
  if (consumerPermissions?.cases && (
    (role === 'bfar_admin' && consumerPermissions.role === 'bfar_admin')
    || (role === 'market_admin' && marketId === 'pasig' && LGU_CLAIM_ROLES.includes(consumerPermissions.role))
  )) return null
  return Object.assign(new Error('Signed case permissions do not match this session.'), { code: 'permission-denied' })
}

export function isAuthorityCaseRefForUser(caseId, user) {
  return !usesLguCaseView(user) || isLguCaseRef(caseId)
}

function caseListQuery(user, lguView) {
  const constraints = user?.role === 'market_admin'
    ? [where('marketId', '==', lguView ? 'pasig' : user.marketId || 'pasig'), where('status', 'in', LGU_CASE_STATUSES)]
    : [orderBy('createdAt', 'desc')]
  return query(collection(db, lguView ? LGU_CASES_COLLECTION : AUTHORITY_CASES_COLLECTION), ...constraints)
}

function readCaseSnapshot(snapshot, lguView) {
  const data = snapshot.data()
  if (!lguView) return sanitizeAuthorityCase({ id: snapshot.id, ...data })
  const { id } = snapshot
  if (!isLguCaseRef(id) || data?.caseId !== id || data.schemaVersion !== '1.0' || data.marketId !== 'pasig'
    || !LGU_CASE_STATUSES.includes(data.status) || !Number.isSafeInteger(data.version) || data.version < 1) return null
  const { schemaVersion, caseId, marketId, assignedMarket, title, vendorOrStall, reason, status, version, createdAt, updatedAt, promotedAt } = data
  if (![assignedMarket, title, vendorOrStall, reason].every(value => typeof value === 'string')
    || ![createdAt, updatedAt, promotedAt].every(value => value === null || typeof value?.toMillis === 'function'
      || (typeof value === 'string' && Number.isFinite(Date.parse(value))))) return null
  return { id, schemaVersion, caseId, marketId, assignedMarket, title, vendorOrStall, reason, status, version, createdAt, updatedAt, promotedAt }
}

function recordedCases(snapshot, lguView) {
  return snapshot.docs.map(record => readCaseSnapshot(record, lguView)).filter(Boolean)
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))
}

function isConfirmed(snapshot) {
  return !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites
}

function requireConfirmed(snapshot) {
  if (!isConfirmed(snapshot)) throw Object.assign(new Error('Waiting for a server snapshot.'), { code: 'unavailable' })
}

export async function listAuthorityCases(user = null) {
  requireAuthorityCasesRuntime()
  const denied = cloudReadDenied(user)
  if (denied) throw denied
  const lguView = usesLguCaseView(user)
  const ref = caseListQuery(lguView ? user : null, lguView)
  if (!lguView) {
    const snapshot = await getDocs(ref)
    return snapshot.docs.map(record => readCaseSnapshot(record, false))
  }
  const snapshot = await getDocsFromServer(ref)
  requireConfirmed(snapshot)
  return recordedCases(snapshot, lguView)
}

export async function getAuthorityCase(caseId, user = null) {
  requireAuthorityCasesRuntime()
  if (!isAuthorityCaseRefForUser(caseId, user)) return null
  const denied = cloudReadDenied(user)
  if (denied) throw denied
  const lguView = usesLguCaseView(user)
  const ref = doc(db, lguView ? LGU_CASES_COLLECTION : AUTHORITY_CASES_COLLECTION, caseId)
  const snapshot = lguView ? await getDocFromServer(ref) : await getDoc(ref)
  if (lguView) requireConfirmed(snapshot)
  return snapshot.exists() ? readCaseSnapshot(snapshot, lguView) : null
}

export function subscribeAuthorityCases(onData, onError = () => {}, user = null, onWaiting = () => {}) {
  requireAuthorityCasesRuntime()
  const denied = cloudReadDenied(user)
  if (denied) {
    onError(denied)
    return () => {}
  }
  const lguView = usesLguCaseView(user)
  return onSnapshot(
    caseListQuery(user, lguView),
    { includeMetadataChanges: lguView },
    (snapshot) => {
      if (lguView && !isConfirmed(snapshot)) {
        onWaiting()
        return
      }
      onData(recordedCases(snapshot, lguView))
    },
    onError,
  )
}

export function subscribeAuthorityCase(caseId, onData, onError = () => {}, onWaiting = () => {}, user = null) {
  requireAuthorityCasesRuntime()
  if (!isAuthorityCaseRefForUser(caseId, user)) {
    onData(null)
    return () => {}
  }
  const denied = cloudReadDenied(user)
  if (denied) {
    onError(denied)
    return () => {}
  }
  const lguView = usesLguCaseView(user)
  return onSnapshot(
    doc(db, lguView ? LGU_CASES_COLLECTION : AUTHORITY_CASES_COLLECTION, caseId),
    { includeMetadataChanges: true },
    (snapshot) => {
      if (!isConfirmed(snapshot)) {
        onWaiting()
        return
      }
      onData(snapshot.exists() ? readCaseSnapshot(snapshot, lguView) : null)
    },
    onError,
  )
}

export function authorityErrorMessage(error) {
  return authorityFailureMessage(error)
}

function timestampValue(value) {
  return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0)
}
