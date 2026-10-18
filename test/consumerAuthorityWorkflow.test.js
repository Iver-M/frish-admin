import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { authorityFailureMessage, consumerPermissions, evaluateConsumerRuntime, permittedCaseActions, formatConsumerDate } from '../src/services/consumerAuthorityPolicy.js'
import { approvedTransitionEndpoint, CLOUD_TRANSITION_ENDPOINT, createAuthorityTransitionClient, createCaseCommand, transitionJournal } from '../src/services/authorityTransitionClient.js'
import { createConsumerIntakeClient } from '../src/services/authorityIntakeClient.js'

const configured = { VITE_USE_FIREBASE: 'true', VITE_FIREBASE_API_KEY: 'synthetic', VITE_FIREBASE_PROJECT_ID: 'frish-app2026', VITE_FIREBASE_APP_ID: 'synthetic-app', VITE_CONSUMER_AUTHORITY_MODE: 'cloud_test' }
const claims = { role: 'bfar_admin', accountStatus: 'active', environment: 'staging', cloudTestApproved: true, claimVersion: 'frish-cloud-test-v1', policyVersion: 'frish-cloud-test-v1', marketIds: ['pasig'] }
const record = { caseId: 'case_synthetic_v1', version: 1, status: 'submitted', marketId: 'pasig' }
const assignment = { inspectorId: 'synthetic-inspector', inspectorName: 'Synthetic inspector' }
const id = '550e8400-e29b-41d4-a716-446655440000'
const command = () => createCaseCommand(record, 'assign_inspector', assignment, id)
const result = { schemaVersion: '1.0', outcome: 'accepted', caseId: record.caseId, status: 'assigned', version: 2 }
const response = (body, status = 200) => ({ ok: status === 200, status, json: async () => body })
const client = overrides => createAuthorityTransitionClient({ endpoint: CLOUD_TRANSITION_ENDPOINT, mode: 'cloud_test', getAuthToken: async () => 'synthetic-auth', getAppCheckToken: async () => 'synthetic-app', fetchImpl: async () => response({ result }), ...overrides })

test('configuration diagnoses disabled, incomplete, wrong-project and conflicting environments without enabling access', () => {
  assert.equal(evaluateConsumerRuntime().mode, 'disabled')
  assert.match(evaluateConsumerRuntime({ ...configured, VITE_FIREBASE_API_KEY: '' }).message, /incomplete/)
  assert.match(evaluateConsumerRuntime({ ...configured, VITE_FIREBASE_PROJECT_ID: 'other' }).message, /different environment/)
  assert.equal(evaluateConsumerRuntime(configured).mode, 'cloud_test')
  assert.equal(evaluateConsumerRuntime({ ...configured, DEV: true, VITE_AUTHORITY_CASES_EMULATOR: 'true' }).mode, 'disabled')
  assert.equal(evaluateConsumerRuntime({ ...configured, DEV: true, VITE_AUTHORITY_CASES_EMULATOR: 'true', VITE_CONSUMER_AUTHORITY_MODE: 'disabled' }).mode, 'emulator')
  assert.equal(evaluateConsumerRuntime({ ...configured, DEV: false, VITE_AUTHORITY_CASES_EMULATOR: 'true', VITE_CONSUMER_AUTHORITY_MODE: 'disabled' }).mode, 'disabled')
})

test('portal profile role alone never establishes signed Consumer permissions', () => {
  assert.equal(consumerPermissions({ role: 'bfar_admin' }, 'cloud_test').intake, false)
  assert.equal(consumerPermissions(claims, 'disabled').intake, false)
  assert.equal(consumerPermissions(claims, 'cloud_test').intake, true)
  for (const changes of [{ accountStatus: 'suspended' }, { environment: 'production' }, { cloudTestApproved: false }, { marketIds: [] }, { claimVersion: 'old' }, { policyVersion: 'old' }]) {
    assert.equal(consumerPermissions({ ...claims, ...changes }, 'cloud_test').cases, false)
  }
  assert.deepEqual(consumerPermissions({ ...claims, role: 'market_admin' }, 'cloud_test'), { role: 'market_admin', intake: false, cases: true })
})

test('actions follow backend role, status, assignment and version restrictions; BFAR cannot resolve', () => {
  const bfar = { role: 'bfar_admin' }
  assert.deepEqual(permittedCaseActions(record, bfar), ['assign_inspector'])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'assigned' }, bfar), ['start_investigation'])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'in_progress' }, bfar), ['forward_to_lgu', 'close_no_violation'])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'forwarded_lgu' }, bfar), [])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'forwarded_lgu' }, { role: 'market_admin' }), [])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'forwarded_lgu' }, { role: 'lgu' }), ['resolve'])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'assigned', assignedInspectorId: 'i1' }, { role: 'inspector', uid: 'i2' }), [])
  assert.deepEqual(permittedCaseActions({ ...record, status: 'resolved' }, { role: 'lgu' }), [])
  assert.deepEqual(permittedCaseActions({ ...record, version: undefined }, bfar), [])
})

test('HTTP client sends the exact backend command envelope and both credentials', async () => {
  let sent
  const invoke = client({ fetchImpl: async (url, options) => { sent = { url, ...options }; return response({ result }) } })
  assert.deepEqual(await invoke(command()), result)
  assert.equal(sent.url, CLOUD_TRANSITION_ENDPOINT)
  assert.deepEqual(JSON.parse(sent.body), { data: command() })
  assert.deepEqual(Object.keys(JSON.parse(sent.body).data), ['schemaVersion', 'requestId', 'caseId', 'expectedVersion', 'transition', 'assignment', 'reasonCode'])
  assert.equal(sent.headers.Authorization, 'Bearer synthetic-auth')
  assert.equal(sent.headers['X-Firebase-AppCheck'], 'synthetic-app')
  assert.equal(sent.redirect, 'error')
  assert.equal(sent.credentials, 'omit')
})

test('no request is sent for a disabled runtime, wrong host, missing identity or missing App Check', async () => {
  let calls = 0
  const fetchImpl = async () => { calls++; return response({ result }) }
  for (const [overrides, code] of [[{ mode: 'disabled' }, 'authority-cases-disabled'], [{ endpoint: 'https://example.test' }, 'authority-cases-disabled'], [{ getAuthToken: async () => null }, 'unauthenticated'], [{ getAppCheckToken: async () => null }, 'app-check-required']]) {
    await assert.rejects(client({ fetchImpl, ...overrides })(command()), { code })
  }
  assert.equal(calls, 0)
  assert.equal(approvedTransitionEndpoint(CLOUD_TRANSITION_ENDPOINT, 'emulator'), false)
  assert.equal(approvedTransitionEndpoint('http://127.0.0.1:5002/frish-app2026/asia-southeast1/transitionAuthorityCase', 'emulator'), true)
})

test('denial, stale version and transport failure remain failures without trusting server message text', async () => {
  for (const [status, code] of [['PERMISSION_DENIED', 'permission-denied'], ['UNAUTHENTICATED', 'unauthenticated'], ['ABORTED', 'aborted']]) {
    await assert.rejects(client({ fetchImpl: async () => response({ error: { status, message: 'private secret', details: { category: 'stale_version' } } }, 403) })(command()), error => error.code === code && !error.message.includes('secret'))
  }
  await assert.rejects(client({ fetchImpl: async () => { throw new TypeError('network secret') } })(command()), { code: 'unavailable' })
})

test('malformed or mismatched successful responses never confirm completion', async () => {
  for (const bad of [null, {}, { ...result, caseId: 'other' }, { ...result, version: 3 }, { ...result, status: 'resolved' }, { ...result, outcome: 'pending' }]) {
    await assert.rejects(client({ fetchImpl: async () => response({ result: bad }) })(command()), { code: 'invalid-response' })
  }
})

test('lost response and reload retry retain byte-identical request/version and converge to one receipt', async () => {
  const stored = new Map()
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  const journal = transitionJournal(storage, 'cloud_test:synthetic-user:synthetic-case')
  const first = command()
  journal.save(first)
  const sent = []; const receipts = new Map()
  const invoke = client({ fetchImpl: async (_url, options) => {
    sent.push(options.body)
    const value = JSON.parse(options.body).data
    if (!receipts.has(value.requestId)) { receipts.set(value.requestId, result); throw new TypeError('response lost after commit') }
    return response({ result: receipts.get(value.requestId) })
  } })
  await assert.rejects(invoke(first), { code: 'unavailable' })
  const restored = transitionJournal(storage, 'cloud_test:synthetic-user:synthetic-case').read()
  assert.deepEqual(await invoke(restored), result)
  assert.equal(receipts.size, 1); assert.equal(sent[0], sent[1])
  assert.equal(transitionJournal(storage, 'cloud_test:other-user:synthetic-case').read(), null)
  journal.clear(); assert.equal(journal.read(), null)
})

test('invalid commands cannot invent versions or assignments', () => {
  for (const version of [0, -1, 1.5, undefined, Number.MAX_SAFE_INTEGER]) assert.throws(() => createCaseCommand({ ...record, version }, 'assign_inspector', assignment, id))
  assert.throws(() => createCaseCommand(record, 'assign_inspector', null, id))
  assert.throws(() => createCaseCommand(record, 'assign_inspector', { ...assignment, inspectorName: '\nprivate' }, id))
  assert.throws(() => createCaseCommand(record, 'resolve', assignment, id))
  assert.throws(() => createCaseCommand(record, 'invented', null, id))
  assert.throws(() => createCaseCommand(record, 'constructor', null, id))
})

test('intake uses protected endpoint payloads and validates confirmed acceptance and rejection', async () => {
  const sent = []
  const intake = createConsumerIntakeClient(async (name, data) => {
    sent.push([name, data])
    if (name === 'promoteConsumerConcern') return { caseId: 'case_synthetic_v1', alreadyPromoted: true }
    if (name === 'rejectConsumerConcern') return { reportId: 'synthetic', decision: 'rejected' }
    return { concerns: [], nextPageToken: null }
  })
  assert.deepEqual(await intake.list({ pageSize: 50, pageToken: 'cursor' }), { concerns: [], nextPageToken: null })
  assert.equal((await intake.accept('synthetic', { title: 'Concern', assignedMarket: 'Market', role: 'bfar_admin' })).alreadyPromoted, true)
  assert.deepEqual(sent[1], ['promoteConsumerConcern', { reportId: 'synthetic', title: 'Concern', assignedMarket: 'Market' }])
  assert.equal((await intake.reject('synthetic', 'Internal reason')).decision, 'rejected')
})

test('malformed intake responses never become a successful empty queue or accepted case', async () => {
  for (const value of [null, {}, { concerns: null, nextPageToken: null }]) {
    await assert.rejects(createConsumerIntakeClient(async () => value).list(), { code: 'invalid-response' })
  }
  await assert.rejects(createConsumerIntakeClient(async () => ({ caseId: 'wrong', alreadyPromoted: true })).accept('synthetic'), { code: 'invalid-response' })
  await assert.rejects(createConsumerIntakeClient(async () => ({ reportId: 'other', decision: 'rejected' })).reject('synthetic', 'Reason'), { code: 'invalid-response' })
})

test('transition timeout aborts the request and remains unconfirmed', async () => {
  await assert.rejects(client({ timeoutMs: 5, fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  }) })(command()), { code: 'unavailable' })
})

test('dates use recorded timestamps only, including callable serialized Firestore timestamps', () => {
  assert.equal(formatConsumerDate(null), 'Not recorded')
  assert.equal(formatConsumerDate({}), 'Not recorded')
  assert.equal(formatConsumerDate({ _seconds: 1000 }), formatConsumerDate({ seconds: 1000 }))
  assert.equal(formatConsumerDate('invalid'), 'Not recorded')
  assert.equal(formatConsumerDate({ seconds: Number.MAX_SAFE_INTEGER }), 'Not recorded')
})

test('diagnostics distinguish deployment, missing index, claims, App Check, conflicts and unavailable service', () => {
  assert.match(authorityFailureMessage({ code: 'permission-denied' }), /Portal access does not grant/)
  assert.match(authorityFailureMessage({ code: 'not-found' }), /endpoint/)
  assert.match(authorityFailureMessage({ code: 'failed-precondition', message: 'query requires an index' }), /Firestore index/)
  assert.match(authorityFailureMessage({ code: 'aborted', details: { category: 'stale_version' } }), /case changed/)
  assert.match(authorityFailureMessage({ code: 'app-check-required' }), /App Check/)
  assert.match(authorityFailureMessage({ code: 'unavailable' }), /service is unavailable/)
})

test('report failure branches exclude the successful empty/list/detail branch and disabled tabs stay discoverable', async () => {
  for (const path of ['consumer-intake/ConsumerIntake.jsx', 'authority-cases/AuthorityCases.jsx']) {
    const source = await readFile(new URL(`../src/pages/admin/${path}`, import.meta.url), 'utf8')
    assert.match(source, /: error \? null :/)
  }
  const source = await readFile(new URL('../src/pages/admin/reports/Reports.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /AUTHORITY_CASES_RUNTIME_ENABLED/)
})
