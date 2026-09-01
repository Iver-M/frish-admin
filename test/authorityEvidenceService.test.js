import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AUTHORITY_EVIDENCE_MAX_BYTES,
  AuthorityEvidenceError,
  createAuthorityEvidenceClient,
  evaluateAuthorityEvidenceEnvironment,
  evaluateAuthorityEvidenceViewer,
} from '../src/services/authorityEvidenceService.js'

const endpoint = 'http://127.0.0.1:5001/frish-app2026/asia-southeast1/getAuthorityCaseEvidence'
const caseId = 'case_report_guest_scan_v1'
const uuids = [
  '123e4567-e89b-42d3-a456-426614174000',
  '223e4567-e89b-42d3-a456-426614174001',
  '323e4567-e89b-42d3-a456-426614174002',
]

function activeAuth(overrides = {}) {
  return {
    currentUser: {
      getIdTokenResult: async (forceRefresh) => {
        assert.equal(forceRefresh, true)
        return {
          token: 'fresh-emulator-token',
          claims: { role: 'bfar_admin', accountStatus: 'active', ...overrides },
        }
      },
    },
  }
}

function imageResponse(type = 'image/jpeg', bytes = new Uint8Array([1, 2, 3])) {
  const blob = new Blob([bytes], { type })
  return new Response(blob, {
    status: 200,
    headers: { 'Content-Type': type, 'Content-Length': String(blob.size) },
  })
}

function client(options = {}) {
  let index = 0
  return createAuthorityEvidenceClient({
    authInstance: activeAuth(), endpoint, runtimeEnabled: true,
    makeRequestId: () => uuids[index++], timeoutMs: 100,
    fetchImpl: async () => imageResponse(),
    ...options,
  })
}

const action = (overrides = {}) => ({
  authorityCaseId: caseId,
  evidenceType: 'eyesAndSkin',
  caseStatus: 'submitted',
  ...overrides,
})

test('feature gate requires development, emulators, exact project, flag, local endpoint, and approved page origin', () => {
  const valid = {
    dev: true, firebaseEnabled: true, authorityEmulatorEnabled: true,
    evidenceFlag: 'true', projectId: 'frish-app2026', endpoint,
    pageOrigin: 'http://localhost:5173',
  }
  assert.equal(evaluateAuthorityEvidenceEnvironment(valid), true)
  for (const override of [
    { dev: false }, { firebaseEnabled: false }, { authorityEmulatorEnabled: false },
    { evidenceFlag: 'false' }, { projectId: 'other' },
    { endpoint: 'https://example.test/evidence' },
    { pageOrigin: 'http://192.168.1.2:5173' },
  ]) assert.equal(evaluateAuthorityEvidenceEnvironment({ ...valid, ...override }), false)
  assert.equal(evaluateAuthorityEvidenceViewer(true, { role: 'bfar_admin', accountStatus: 'active' }), true)
  for (const user of [
    { role: 'bfar_admin', accountStatus: 'inactive' },
    { role: 'market_admin', accountStatus: 'active' },
    { role: 'inspector', accountStatus: 'active' }, null,
  ]) assert.equal(evaluateAuthorityEvidenceViewer(true, user), false)
})

test('request sends only exact fields with a fresh bearer token and accepts JPEG and PNG', async () => {
  const calls = []
  const service = client({
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return calls.length === 1 ? imageResponse('image/jpeg') : imageResponse('image/png')
    },
  })
  const jpeg = await service.retrieve(action())
  const png = await service.retrieve(action({ evidenceType: 'gills' }))
  assert.equal(jpeg.contentType, 'image/jpeg')
  assert.equal(png.contentType, 'image/png')
  assert.equal(calls[0].url, endpoint)
  assert.equal(calls[0].options.headers.Authorization, 'Bearer fresh-emulator-token')
  assert.deepEqual(Object.keys(JSON.parse(calls[0].options.body)).sort(), [
    'authorityCaseId', 'evidenceType', 'requestId',
  ])
  const serialized = calls.map(({ options }) => options.body).join('')
  for (const forbidden of ['storagePath', 'scanId', 'ownerId', 'role', 'bucket', 'location', 'analysis']) {
    assert.equal(serialized.includes(forbidden), false)
  }
})

test('duplicate active retrieval shares one request while manual retry gets a new UUID', async () => {
  let release
  let calls = 0
  const service = client({ fetchImpl: async () => {
    calls += 1
    if (calls === 1) await new Promise((resolve) => { release = resolve })
    return imageResponse()
  } })
  const first = service.retrieve(action())
  const duplicate = service.retrieve(action())
  assert.equal(first, duplicate)
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(calls, 1)
  release()
  assert.equal((await first).requestId, uuids[0])
  const retry = await service.retrieve(action())
  assert.equal(retry.requestId, uuids[1])
  assert.equal(calls, 2)
})

test('invalid requests, role/status denial, and authentication failures map safely', async () => {
  await assert.rejects(client().retrieve(action({ authorityCaseId: '../private' })), { category: 'invalid_request' })
  await assert.rejects(client().retrieve(action({ caseStatus: 'resolved' })), { category: 'case_status_not_eligible' })
  await assert.rejects(client({ authInstance: { currentUser: null } }).retrieve(action()), { category: 'authentication_required' })
  await assert.rejects(client({ authInstance: activeAuth({ role: 'market_admin' }) }).retrieve(action()), { category: 'account_not_authorized' })
})

test('HTTP failures use stable categories without exposing private response details', async () => {
  for (const [status, category] of [[401, 'authentication_required'], [403, 'account_not_authorized'], [404, 'evidence_unavailable'], [503, 'service_unavailable']]) {
    const service = client({ fetchImpl: async () => new Response('private backend source/path detail', { status }) })
    await assert.rejects(service.retrieve(action()), (error) => {
      assert.equal(error.category, category)
      assert.equal(error.message.includes('private backend'), false)
      return true
    })
  }
})

test('invalid MIME, missing MIME, invalid length, and oversized bodies fail closed', async () => {
  const responses = [
    imageResponse('application/pdf'),
    new Response(new Blob([new Uint8Array([1])]), { status: 200 }),
    new Response(new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Content-Length': 'invalid' } }),
    new Response(new Blob([new Uint8Array([1])], { type: 'image/jpeg' }), { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Content-Length': String(AUTHORITY_EVIDENCE_MAX_BYTES + 1) } }),
  ]
  for (const response of responses) {
    await assert.rejects(client({ fetchImpl: async () => response }).retrieve(action()), { category: 'invalid_response' })
  }
})

test('timeout and caller cancellation abort requests safely', async () => {
  const waitingFetch = async (_url, options) => new Promise((_resolve, reject) => {
    if (options.signal.aborted) {
      reject(new DOMException('aborted', 'AbortError'))
      return
    }
    options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  })
  await assert.rejects(client({ fetchImpl: waitingFetch, timeoutMs: 1 }).retrieve(action()), { category: 'timeout' })
  const controller = new AbortController()
  const pending = client({ fetchImpl: waitingFetch }).retrieve(action({ signal: controller.signal }))
  controller.abort()
  await assert.rejects(pending, { category: 'request_cancelled' })
})

test('unexpected retrieval failures use a generic safe category', async () => {
  const service = client({ fetchImpl: async () => { throw new Error('private linkage') } })
  await assert.rejects(service.retrieve(action()), (error) => {
    assert.ok(error instanceof AuthorityEvidenceError)
    assert.equal(error.category, 'retrieval_failed')
    assert.equal(error.message.includes('private linkage'), false)
    return true
  })
})
