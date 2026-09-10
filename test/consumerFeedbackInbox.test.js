import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  CONSUMER_FEEDBACK_RUNTIME_ENABLED,
  createConsumerFeedbackInboxClient,
  createFeedbackInboxRequestGuard,
  evaluateConsumerFeedbackEnvironment,
  validateFeedbackProjection,
} from '../src/services/consumerFeedbackInbox.js'

const pageSource = await readFile(new URL('../src/pages/admin/feedback/Feedback.jsx', import.meta.url), 'utf8')
const layoutSource = await readFile(new URL('../src/layout/AdminLayout.jsx', import.meta.url), 'utf8')
const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')

const projection = (overrides = {}) => ({
  schemaVersion: '1.0', feedbackReference: 'FB-0123456789ABCDEF', rating: 5,
  feedbackText: 'Helpful app', appVersion: '1.0', platform: 'android',
  platformVersion: '33', submittedAt: '2026-09-07T01:00:00.000Z', ...overrides,
})

function activeAuth(claimOverrides = {}) {
  return { currentUser: { getIdTokenResult: async (fresh) => {
    assert.equal(fresh, true)
    return { claims: { role: 'bfar_admin', accountStatus: 'active', ...claimOverrides } }
  } } }
}

test('feature gate requires development, Firebase emulators, exact project, and explicit feedback flag', () => {
  const valid = { dev: true, firebaseEnabled: true, authorityEmulatorEnabled: true, feedbackFlag: 'true', projectId: 'frish-app2026' }
  assert.equal(evaluateConsumerFeedbackEnvironment(valid), true)
  for (const override of [
    { dev: false }, { firebaseEnabled: false }, { authorityEmulatorEnabled: false },
    { feedbackFlag: 'false' }, { projectId: 'production-project' },
  ]) assert.equal(evaluateConsumerFeedbackEnvironment({ ...valid, ...override }), false)
  assert.equal(CONSUMER_FEEDBACK_RUNTIME_ENABLED, false)
})

test('client refreshes claims, sends only pageSize, and deduplicates an active request', async () => {
  let release
  const calls = []
  const client = createConsumerFeedbackInboxClient({
    authInstance: activeAuth(), runtimeEnabled: true,
    invoke: async (data) => {
      calls.push(data)
      await new Promise((resolve) => { release = resolve })
      return { feedback: [projection()] }
    },
  })
  const first = client.list()
  const duplicate = client.list()
  assert.equal(first, duplicate)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.deepEqual(calls, [{ pageSize: 50 }])
  release()
  assert.deepEqual(await first, [projection()])
})

test('client denies missing, arbitrary, inactive, and non-BFAR Firebase claims', async () => {
  const invoke = async () => { throw new Error('must not call') }
  await assert.rejects(createConsumerFeedbackInboxClient({ authInstance: { currentUser: null }, invoke, runtimeEnabled: true }).list(), { category: 'authentication_required' })
  for (const claims of [
    { role: 'market_admin' }, { role: 'lgu' }, { role: 'inspector' },
    { role: 'bfar_admin', accountStatus: 'inactive' }, { role: 'arbitrary', accountStatus: 'active' },
  ]) await assert.rejects(createConsumerFeedbackInboxClient({ authInstance: activeAuth(claims), invoke, runtimeEnabled: true }).list(), { category: 'account_not_authorized' })
})

test('response validation is exact and rejects private or malformed fields', async () => {
  assert.deepEqual(validateFeedbackProjection(projection()), projection())
  for (const changed of [
    { ownerId: 'guest-private' }, { feedbackId: 'stored-private-id' }, { rating: 0 },
    { submittedAt: 'invalid' }, { platform: 'ios' }, { feedbackText: ' padded ' },
  ]) assert.equal(validateFeedbackProjection(projection(changed)), null)
  const client = createConsumerFeedbackInboxClient({ authInstance: activeAuth(), runtimeEnabled: true, invoke: async () => ({ feedback: [projection({ ownerId: 'private' })] }) })
  await assert.rejects(client.list(), { category: 'invalid_response' })
})

test('request guard rejects stale, retry-replaced, sign-out, and unmounted results', () => {
  const guard = createFeedbackInboxRequestGuard()
  const first = guard.begin()
  const retry = guard.begin()
  assert.equal(guard.isCurrent(first), false)
  assert.equal(guard.isCurrent(retry), true)
  guard.invalidate()
  assert.equal(guard.isCurrent(retry), false)
  const afterAccountChange = guard.begin()
  guard.unmount()
  assert.equal(guard.isCurrent(afterAccountChange), false)
  guard.mount()
  const afterStrictModeRemount = guard.begin()
  assert.equal(guard.isCurrent(afterStrictModeRemount), true)
})

test('feedback page is read-only, handles every load state, and never renders private fields in live cards', () => {
  for (const text of ['Sample data', 'Loading Consumer feedback', 'No Consumer feedback', 'Retry', 'Refresh', 'Read-only']) assert.match(pageSource, new RegExp(text))
  for (const action of ['Send Reply', 'Mark Resolved', 'sentiment', 'assignment', 'moderation']) assert.doesNotMatch(pageSource, new RegExp(action, 'i'))
  for (const field of ['ownerId', 'feedbackId', 'submissionId', 'location', 'scanId', 'reportId', 'storagePath']) assert.doesNotMatch(pageSource, new RegExp(`item\\.${field}`))
  assert.match(layoutSource, /'\/feedback': \['bfar_admin'\]/)
  assert.match(sidebarSource, /to: '\/feedback'.*roles: \['bfar_admin'\]/)
})

test('online mode requires versioned claims and accepts only the online projection', async () => {
  const denied = createConsumerFeedbackInboxClient({ authInstance: activeAuth(), runtimeEnabled: true, mode: 'online_test', invoke() { throw new Error('must not call') } })
  await assert.rejects(denied.list(), { category: 'account_not_authorized' })
  const allowed = createConsumerFeedbackInboxClient({ authInstance: activeAuth({ feedbackOnlineTest: 'consumer-feedback-v1' }), runtimeEnabled: true, mode: 'online_test', invoke: async () => ({ feedback: [projection({ schemaVersion: '1.1' })] }) })
  assert.equal((await allowed.list())[0].schemaVersion, '1.1')
  assert.equal(validateFeedbackProjection(projection(), 'online_test'), null)
  assert.match(pageSource, /Online test environment/)
  assert.match(pageSource, /does not mean BFAR review or reply/)
})
