import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, authorityRuntimeMode, db, functions } from './firebase.js'

export const AUTHORITY_CASES_COLLECTION = 'authorityCases'
export const AUTHORITY_CASES_RUNTIME_MODE = authorityRuntimeMode
export const AUTHORITY_CASES_RUNTIME_ENABLED = authorityRuntimeMode !== 'disabled'
export const AUTHORITY_CASES_IS_CLOUD = authorityRuntimeMode === 'cloud_test'

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
  await auth?.currentUser?.getIdToken(true)
  return (await httpsCallable(functions, name)(data)).data
}

export function listPendingConsumerConcerns(options = {}) {
  return call('listPendingConsumerConcerns', options)
}

export function getPendingConsumerConcern(reportId) {
  return call('getPendingConsumerConcern', { reportId })
}

export function promoteConsumerConcern(reportId, intake = {}) {
  return call('promoteConsumerConcern', { reportId, ...intake })
}

export function rejectConsumerConcern(reportId, internalReason) {
  return call('rejectConsumerConcern', { reportId, internalReason })
}

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
  const code = String(error?.code || '')
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return AUTHORITY_CASES_IS_CLOUD
    ? 'Your Firebase account is missing the active BFAR cloud-test claims required for Consumer Intake. Ask the Firebase project owner to provision the BFAR claims, then sign out and sign in again.'
    : 'Your account is not authorized for BFAR Consumer Intake.'
  if (code.includes('not-found')) return 'This Consumer concern no longer exists.'
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) return error?.message || 'This concern is not eligible for promotion.'
  if (code.includes('deadline-exceeded') || code.includes('unavailable') || code.includes('internal')) return AUTHORITY_CASES_IS_CLOUD
    ? 'The Consumer authority service is temporarily unavailable. Check the connection and retry.'
    : 'The Firebase emulators are unavailable. Check the local emulator suite and retry.'
  return error?.message || 'The Consumer authority request failed. Please retry.'
}

function timestampValue(value) {
  return value?.toMillis?.() || (typeof value === 'string' ? Date.parse(value) || 0 : 0)
}
