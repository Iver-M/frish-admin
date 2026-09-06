import { httpsCallable } from 'firebase/functions'
import { auth, functions, isAuthorityEmulatorEnabled, isFirebaseEnabled } from './firebase.js'

const EXPECTED_PROJECT_ID = 'frish-app2026'
const RESPONSE_FIELDS = Object.freeze([
  'schemaVersion', 'feedbackReference', 'rating', 'feedbackText', 'appVersion',
  'platform', 'platformVersion', 'submittedAt',
])
const runtimeEnv = import.meta.env || {}

export function evaluateConsumerFeedbackEnvironment({ dev, firebaseEnabled, authorityEmulatorEnabled, feedbackFlag, projectId }) {
  return Boolean(dev && firebaseEnabled && authorityEmulatorEnabled && feedbackFlag === 'true' && projectId === EXPECTED_PROJECT_ID)
}

export const CONSUMER_FEEDBACK_RUNTIME_ENABLED = evaluateConsumerFeedbackEnvironment({
  dev: runtimeEnv.DEV,
  firebaseEnabled: isFirebaseEnabled,
  authorityEmulatorEnabled: isAuthorityEmulatorEnabled,
  feedbackFlag: runtimeEnv.VITE_CONSUMER_FEEDBACK_EMULATOR,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
})

export function canViewConsumerFeedback(runtimeEnabled, user) {
  return Boolean(runtimeEnabled && user?.role === 'bfar_admin' && user?.accountStatus === 'active')
}

function hasExactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const actual = Object.keys(value).sort()
  const keys = [...expected].sort()
  return actual.length === keys.length && actual.every((key, index) => key === keys[index])
}

function isCanonicalTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value
}

export function validateFeedbackProjection(value) {
  if (!hasExactKeys(value, RESPONSE_FIELDS)) return null
  const valid = value.schemaVersion === '1.0'
    && /^FB-[A-F0-9]{16}$/.test(value.feedbackReference)
    && Number.isInteger(value.rating) && value.rating >= 1 && value.rating <= 5
    && typeof value.feedbackText === 'string' && value.feedbackText.trim() === value.feedbackText
    && value.feedbackText.length >= 1 && value.feedbackText.length <= 2000
    && typeof value.appVersion === 'string' && value.appVersion.length >= 1 && value.appVersion.length <= 40
    && value.platform === 'android'
    && typeof value.platformVersion === 'string' && value.platformVersion.length >= 1 && value.platformVersion.length <= 40
    && isCanonicalTimestamp(value.submittedAt)
  return valid ? Object.fromEntries(RESPONSE_FIELDS.map((key) => [key, value[key]])) : null
}

export class ConsumerFeedbackInboxError extends Error {
  constructor(category, message) {
    super(message || consumerFeedbackErrorMessage(category))
    this.name = 'ConsumerFeedbackInboxError'
    this.category = category
  }
}

export function consumerFeedbackErrorMessage(category) {
  if (category === 'disabled') return 'Live Consumer feedback is disabled. Enable the local emulator feature flag to use this inbox.'
  if (category === 'authentication_required') return 'Sign in to the Firebase Auth emulator and retry.'
  if (category === 'account_not_authorized') return 'Only an active BFAR administrator can view Consumer feedback.'
  if (category === 'invalid_response') return 'The emulator returned an invalid feedback response. No records were displayed.'
  return 'The Consumer feedback emulators are unavailable. Check the local emulator suite and retry.'
}

function mapCallableError(error) {
  const code = String(error?.code || '')
  if (code.includes('unauthenticated')) return 'authentication_required'
  if (code.includes('permission-denied')) return 'account_not_authorized'
  return 'service_unavailable'
}

export function createConsumerFeedbackInboxClient({ authInstance, invoke, runtimeEnabled = CONSUMER_FEEDBACK_RUNTIME_ENABLED } = {}) {
  let activeRequest = null
  function list() {
    if (activeRequest) return activeRequest
    activeRequest = (async () => {
      if (!runtimeEnabled) throw new ConsumerFeedbackInboxError('disabled')
      const firebaseUser = authInstance?.currentUser
      if (!firebaseUser) throw new ConsumerFeedbackInboxError('authentication_required')
      let token
      try { token = await firebaseUser.getIdTokenResult(true) } catch { throw new ConsumerFeedbackInboxError('authentication_required') }
      if (token?.claims?.role !== 'bfar_admin' || token?.claims?.accountStatus !== 'active') {
        throw new ConsumerFeedbackInboxError('account_not_authorized')
      }
      let result
      try { result = await invoke({ pageSize: 50 }) } catch (error) { throw new ConsumerFeedbackInboxError(mapCallableError(error)) }
      if (!hasExactKeys(result, ['feedback']) || !Array.isArray(result.feedback) || result.feedback.length > 50) {
        throw new ConsumerFeedbackInboxError('invalid_response')
      }
      const feedback = result.feedback.map(validateFeedbackProjection)
      if (feedback.some((item) => item === null)) throw new ConsumerFeedbackInboxError('invalid_response')
      return feedback
    })().finally(() => { activeRequest = null })
    return activeRequest
  }
  return { list }
}

const defaultClient = createConsumerFeedbackInboxClient({
  authInstance: auth,
  runtimeEnabled: CONSUMER_FEEDBACK_RUNTIME_ENABLED,
  invoke: async (data) => (await httpsCallable(functions, 'listConsumerFeedback')(data)).data,
})

export function listConsumerFeedback() { return defaultClient.list() }

export function createFeedbackInboxRequestGuard() {
  let generation = 0
  let active = true
  return {
    begin() { generation += 1; return generation },
    isCurrent(token) { return active && token === generation },
    invalidate() { generation += 1 },
    unmount() { active = false; generation += 1 },
  }
}
