import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions, isAuthorityEmulatorEnabled } from './firebase.js'

export const AUTHORITY_CASES_COLLECTION = 'authorityCases'
export const AUTHORITY_CASES_RUNTIME_ENABLED = isAuthorityEmulatorEnabled

export function requireAuthorityCasesRuntime() {
  if (AUTHORITY_CASES_RUNTIME_ENABLED) return true
  const error = new Error('Authority cases are available only when the local emulator feature flag is enabled.')
  error.code = 'authority-cases-disabled'
  throw error
}

async function call(name, data = {}) {
  requireAuthorityCasesRuntime()
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

export async function listAuthorityCases() {
  requireAuthorityCasesRuntime()
  const snapshot = await getDocs(query(collection(db, AUTHORITY_CASES_COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
}

export async function getAuthorityCase(caseId) {
  requireAuthorityCasesRuntime()
  const snapshot = await getDoc(doc(db, AUTHORITY_CASES_COLLECTION, caseId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export function authorityErrorMessage(error) {
  const code = String(error?.code || '')
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'Your account is not authorized for BFAR Consumer Intake.'
  if (code.includes('not-found')) return 'This prototype concern no longer exists.'
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) return error?.message || 'This concern is not eligible for promotion.'
  if (code.includes('deadline-exceeded') || code.includes('unavailable') || code.includes('internal')) return 'The Firebase emulators are unavailable. Check the local emulator suite and retry.'
  return error?.message || 'The emulator request failed. Please retry.'
}
