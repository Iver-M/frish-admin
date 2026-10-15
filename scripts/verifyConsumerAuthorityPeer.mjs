// In-memory verification only. No SDK initialization, network, accounts or writes
// to a Firebase project. Pass an existing Consumer PR #46 checkout explicitly.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import { createConsumerIntakeClient } from '../src/services/authorityIntakeClient.js'
import { createAuthorityTransitionClient, createCaseCommand } from '../src/services/authorityTransitionClient.js'

if (!process.argv[2]) throw new Error('Usage: node scripts/verifyConsumerAuthorityPeer.mjs <Consumer-checkout>')
const requireConsumer = createRequire(path.resolve(process.argv[2], 'functions/package.json'))
const { harness } = requireConsumer('./test/helpers/authorityCallableHarness.js')
const { createAuthorityService } = requireConsumer('./src/authorityPromotion.js')
const { createAuthorityCaseCallable, createAuthorityCallableHttpHandler } = requireConsumer('./src/authorityCaseCallable.js')
const { syntheticOperationPolicy } = requireConsumer('./emulator/authorityCallableSetup.js')
process.env.FUNCTIONS_EMULATOR = 'true'
process.env.GCLOUD_PROJECT = 'frish-app2026'

const h = harness()
const { db } = h
db.store.delete('authorityCases/case_synthetic_report_v1')
const nativeCollection = db.collection.bind(db)
function collection(name, filters = [], cursor = null, maximum = Infinity) {
  return {
    doc: id => nativeCollection(name).doc(id),
    where: (field, _operator, value) => collection(name, [...filters, [field, value]], cursor, maximum),
    orderBy: () => collection(name, filters, cursor, maximum),
    startAfter: value => collection(name, filters, value, maximum),
    limit: value => collection(name, filters, cursor, value),
    get: async () => ({ docs: [...db.store.entries()].filter(([key, value]) => key.startsWith(`${name}/`)
      && filters.every(([field, expected]) => value[field] === expected))
      .map(([key, value]) => ({ id: key.slice(name.length + 1), data: () => structuredClone(value) }))
      .filter(row => !cursor || row.id > cursor).sort((a, b) => a.id.localeCompare(b.id)).slice(0, maximum) }),
  }
}
db.collection = name => collection(name)
const now = () => new Date('2026-10-15T00:00:00.000Z')
db.store.set('concernReports/synthetic_report', {
  schemaVersion: '1.0', reportId: 'synthetic_report', scanId: 'synthetic_scan', ownerId: 'synthetic_owner',
  marketName: 'Synthetic market', reporterName: 'Private fixture', reporterEmail: 'private@example.test',
  vendorOrStall: 'Synthetic stall', reason: 'other', description: 'Synthetic findings', resultSummary: null,
  status: 'prototype_saved', deliveryMode: 'firebase_emulator_only', createdAt: now(), submittedAt: now(),
})
db.store.set('consumerScans/synthetic_scan', {
  schemaVersion: '1.1', scanId: 'synthetic_scan', ownerId: 'synthetic_owner', species: 'galunggong', includeGills: false,
  status: 'pending_analysis', evidence: { eyesAndSkin: { storagePath: 'consumerScans/synthetic_owner/synthetic_scan/eyesAndSkin' }, gills: null },
  createdAt: now(), updatedAt: now(),
})
const service = createAuthorityService({ db, FieldValue: { serverTimestamp: now } })
const handlers = { listPendingConsumerConcerns: service.listPending, getPendingConsumerConcern: service.getPending,
  promoteConsumerConcern: service.promote, rejectConsumerConcern: service.reject }
const staff = { uid: 'synthetic_staff', token: { role: 'bfar_admin', accountStatus: 'active' } }
const intake = createConsumerIntakeClient((name, data) => handlers[name]({ data, auth: staff }))
await assert.rejects(service.listPending({ data: {}, auth: { ...staff, token: {} } }), { code: 'permission-denied' })
const queue = await intake.list({ pageSize: 50 })
assert.equal(queue.concerns.length, 1)
assert.equal(queue.concerns[0].reporterEmail, undefined)
const detail = await intake.detail('synthetic_report')
assert.equal(detail.concern.vendorOrStall, 'Synthetic stall')
const accepted = await intake.accept('synthetic_report', { title: 'Consumer fish quality concern', assignedMarket: 'Synthetic market' })
assert.equal(accepted.alreadyPromoted, false)
assert.equal((await intake.accept('synthetic_report')).caseId, accepted.caseId)
assert.equal((await intake.accept('synthetic_report')).alreadyPromoted, true)
assert.equal([...db.store.keys()].filter(key => key.startsWith('authorityCases/')).length, 1)
await assert.rejects(intake.reject('synthetic_report', 'Synthetic reason'), { code: 'failed-precondition' })
db.store.set('concernReports/synthetic_rejection', { ...db.store.get('concernReports/synthetic_report'), reportId: 'synthetic_rejection' })
assert.equal((await intake.reject('synthetic_rejection', 'Synthetic reason')).decision, 'rejected')
assert.equal((await intake.reject('synthetic_rejection', 'Synthetic reason')).alreadyDecided, true)

const controller = createAuthorityCaseCallable({ ...h.config, serverTimestamp: now })
const handler = createAuthorityCallableHttpHandler({ controller, maxBodyBytes: 4096, allowedOrigins: ['http://127.0.0.1:5173'] })
let activeHandler = handler
let loseResponse = true
const sent = []
const invoke = createAuthorityTransitionClient({ mode: 'emulator', endpoint: 'http://127.0.0.1:5002/frish-app2026/asia-southeast1/transitionAuthorityCase',
  getAuthToken: async () => 'synthetic-auth', getAppCheckToken: async () => 'synthetic-app', fetchImpl: async (_url, options) => {
    sent.push(options.body)
    let status = 200, payload
    await activeHandler({ method: options.method, rawBody: Buffer.from(options.body), body: JSON.parse(options.body),
      get: name => ({ origin: 'http://127.0.0.1:5173', authorization: options.headers.Authorization,
        'content-type': options.headers['Content-Type'], 'x-firebase-appcheck': options.headers['X-Firebase-AppCheck'] })[name] },
    { set() {}, status(value) { status = value; return this }, json(value) { payload = value }, send() {} })
    if (loseResponse && status === 200) { loseResponse = false; throw new TypeError('Synthetic lost response after commit') }
    return { ok: status === 200, status, json: async () => payload }
  } })
const currentCase = () => db.store.get(`authorityCases/${accepted.caseId}`)
const assign = createCaseCommand(currentCase(), 'assign_inspector', { inspectorId: 'synthetic-inspector', inspectorName: 'Synthetic inspector' })
await assert.rejects(invoke(assign), { code: 'unavailable' })
assert.equal(currentCase().version, 2)
assert.equal((await invoke(assign)).version, 2)
assert.equal(sent[0], sent[1])
assert.equal([...db.store.keys()].filter(key => key.startsWith('authorityCaseTransitionRequests/')).length, 1)
const stale = createCaseCommand({ ...currentCase(), version: 1 }, 'start_investigation')
db.store.set('syntheticCallablePolicies/authority_case.start_investigation', syntheticOperationPolicy('start_investigation', ['bfar_admin']))
await assert.rejects(invoke(stale), error => error.code === 'aborted' && error.details.category === 'stale_version')
assert.equal((await invoke(createCaseCommand(currentCase(), 'start_investigation'))).status, 'in_progress')
db.store.set('syntheticCallablePolicies/authority_case.forward_to_lgu', syntheticOperationPolicy('forward_to_lgu', ['bfar_admin']))
assert.equal((await invoke(createCaseCommand(currentCase(), 'forward_to_lgu'))).status, 'forwarded_lgu')
db.store.set('syntheticCallablePolicies/authority_case.resolve', syntheticOperationPolicy('resolve', ['lgu']))
await assert.rejects(invoke(createCaseCommand(currentCase(), 'resolve')), { code: 'permission-denied' })
assert.equal(currentCase().status, 'forwarded_lgu')
const lgu = harness({ role: 'lgu' })
lgu.db.store = db.store
activeHandler = createAuthorityCallableHttpHandler({ controller: lgu.controller, maxBodyBytes: 4096, allowedOrigins: ['http://127.0.0.1:5173'] })
assert.equal((await invoke(createCaseCommand(currentCase(), 'resolve'))).status, 'resolved')
console.log('ADMIN_CONSUMER_PEER_PASS=intake_privacy,denied_claims,acceptance_one_case,rejection_and_retry,rejection_conflict,http_envelope,confirmed_assignment,lost_response_retry_one_receipt,stale_version,investigation,forward_to_lgu,bfar_resolution_denied,authorized_lgu_resolution')
