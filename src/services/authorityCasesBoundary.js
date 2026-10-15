import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, authorityRuntimeMode, consumerRuntime, db, functions, getAuthorityAppCheckToken } from './firebase.js'
import { authorityFailureMessage } from './consumerAuthorityPolicy.js'
import { CLOUD_TRANSITION_ENDPOINT, createAuthorityTransitionClient } from './authorityTransitionClient.js'
import { createConsumerIntakeClient } from './authorityIntakeClient.js'

export const AUTHORITY_CASES_COLLECTION = 'authorityCases'
export const AUTHORITY_CASES_RUNTIME_MODE = authorityRuntimeMode
export const AUTHORITY_CASES_RUNTIME_ENABLED = authorityRuntimeMode !== 'disabled'
export const AUTHORITY_CASES_IS_CLOUD = authorityRuntimeMode === 'cloud_test'
export const AUTHORITY_RUNTIME_MESSAGE = consumerRuntime.message
const runtimeEnv = import.meta.env || {}
export const transitionAuthorityCase = createAuthorityTransitionClient({
  endpoint: runtimeEnv.VITE_AUTHORITY_TRANSITION_ENDPOINT || (AUTHORITY_CASES_IS_CLOUD ? CLOUD_TRANSITION_ENDPOINT : 'http://127.0.0.1:5001/frish-app2026/asia-southeast1/transitionAuthorityCase'),
  mode: authorityRuntimeMode,
  getAuthToken: async () => auth?.currentUser?.getIdToken(true),
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

export async function listAuthorityCases() {
  requireAuthorityCasesRuntime()
  const snapshot = await getDocs(query(collection(db, AUTHORITY_CASES_COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((record) => sanitizeAuthorityCase({ id: record.id, ...record.data() }))
}

export async function getAuthorityCase(caseId) {
  requireAuthorityCasesRuntime()
  const snapshot = await getDoc(doc(db, AUTHORITY_CASES_COLLECTION, caseId))
  return snapshot.exists() ? sanitizeAuthorityCase({ id: snapshot.id, ...snapshot.data() }) : null
}

export function subscribeAuthorityCases(onData, onError = () => {}, user = null) {
  requireAuthorityCasesRuntime()
  const constraints = user?.role === 'market_admin'
    ? [where('marketId', '==', user.marketId || 'pasig'), where('status', 'in', ['forwarded_lgu', 'resolved'])]
    : [orderBy('createdAt', 'desc')]
  return onSnapshot(
    query(collection(db, AUTHORITY_CASES_COLLECTION), ...constraints),
    (snapshot) => onData(snapshot.docs
      .map((record) => sanitizeAuthorityCase({ id: record.id, ...record.data() }))
      .sort((a, b) => timestampValue(b?.createdAt) - timestampValue(a?.createdAt))),
    onError,
  )
}

export function subscribeAuthorityCase(caseId, onData, onError = () => {}) {
  requireAuthorityCasesRuntime()
  return onSnapshot(
    doc(db, AUTHORITY_CASES_COLLECTION, caseId),
    (snapshot) => onData(snapshot.exists() ? sanitizeAuthorityCase({ id: snapshot.id, ...snapshot.data() }) : null),
    onError,
  )
}

export function authorityErrorMessage(error) {
  return authorityFailureMessage(error)
}

function timestampValue(value) {
  return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0)
}
