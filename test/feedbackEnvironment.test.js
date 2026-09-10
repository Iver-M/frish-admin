import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSubscribeLegacyAdminData, resolveFeedbackMode } from '../src/services/feedbackEnvironment.js'
test('online environment rejects missing, contradictory, debug, production and wrong-project settings', () => {
  const env = { DEV: false, VITE_FEEDBACK_ENVIRONMENT: 'online_test', VITE_PRODUCTION_FIREBASE_APPROVED: 'false', VITE_ONLINE_TEST_APPROVED: 'true', VITE_FIREBASE_PROJECT_ID: 'frish-app2026', VITE_AUTHORITY_CASES_EMULATOR: 'false', VITE_CONSUMER_FEEDBACK_EMULATOR: 'false' }
  assert.equal(resolveFeedbackMode(env), 'online_test')
  for (const key of Object.keys(env)) { const missing = { ...env }; delete missing[key]; assert.equal(resolveFeedbackMode(missing), 'blocked') }
  for (const change of [{ DEV: true }, { VITE_FEEDBACK_ENVIRONMENT: 'production' }, { VITE_FIREBASE_PROJECT_ID: 'wrong' }, { VITE_AUTHORITY_CASES_EMULATOR: 'true' }, { VITE_ONLINE_TEST_APPROVED: 'false' }]) assert.equal(resolveFeedbackMode({ ...env, ...change }), 'blocked')
})

test('online feedback mode preserves existing Firestore-backed Admin modules', () => {
  assert.equal(canSubscribeLegacyAdminData('online_test', true), true)
  assert.equal(canSubscribeLegacyAdminData('blocked', true), false)
  assert.equal(canSubscribeLegacyAdminData('emulator', false), false)
  assert.equal(canSubscribeLegacyAdminData('emulator', true), true)
})
