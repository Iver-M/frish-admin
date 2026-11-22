import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

const asModule = source => `data:text/javascript,${encodeURIComponent(source)}`
const firestore = asModule(`
  export const listeners = []
  export const reads = []
  export const records = new Map()
  export const doc = (_, collection, id) => ({ collection, id })
  export const collection = (_, name) => name
  export const query = (collection, ...constraints) => ({ collection, constraints })
  export const where = (...args) => args
  export const orderBy = (...args) => args
  export const getDoc = () => { throw new Error('Expected a server-only detail read') }
  export const getDocs = () => { throw new Error('Expected a server-only list read') }
  export const getDocFromServer = async (ref) => {
    reads.push(ref)
    return records.get(ref.id)
  }
  export const getDocsFromServer = async (ref) => {
    reads.push(ref)
    return { docs: [...records.values()], metadata: { fromCache: false, hasPendingWrites: false } }
  }
  export function onSnapshot(ref, options, next) {
    if (typeof options === 'function') { next = options; options = undefined }
    listeners.push({ ref, options, next })
    return () => {}
  }
`)

async function loadBoundary(mode) {
  const boundary = new URL(`../src/services/authorityCasesBoundary.js?test=${mode}`, import.meta.url)
  const authorityRuntime = asModule(`
    export const authorityRuntimeMode = '${mode}'
    export const consumerRuntime = { message: '' }
    export const auth = null, db = null, functions = null, getAuthorityAppCheckToken = () => null
  `)
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === boundary.href) {
        if (specifier === 'firebase/firestore') return { url: firestore, shortCircuit: true }
        if (specifier === './authorityFirebase.js') return { url: authorityRuntime, shortCircuit: true }
      }
      return nextResolve(specifier, context)
    },
  })
  try {
    return await import(boundary.href)
  } finally {
    hooks.deregister()
  }
}

const { listeners, reads, records } = await import(firestore)
const lgu = { role: 'market_admin', marketId: 'pasig', consumerPermissions: { cases: true, role: 'lgu' } }
const projectionId = '409e4cc1-396b-4f3a-bffa-247aa1e4a956'
const projection = {
  schemaVersion: '1.0', caseId: projectionId, marketId: 'pasig', assignedMarket: 'Pasig Public Market',
  title: 'Consumer fish quality concern', vendorOrStall: 'Stall 18', reason: 'spoiled_at_scan',
  status: 'forwarded_lgu', version: 4, createdAt: '2026-11-18T04:00:00Z',
  updatedAt: '2026-11-21T04:00:00Z', promotedAt: '2026-11-19T04:00:00Z',
}
const leakedFields = {
  id: 'case_report_consumer-1_scan-1', sourceConcernReportId: 'report_consumer-1_scan-1',
  sourceScanId: 'scan-1', reporterRef: 'reporter-1', ownerId: 'consumer-1', reporterEmail: 'private@example.test',
  description: 'Private findings', evidenceReferences: ['evidence'], promotedBy: { uid: 'staff-1' },
  assignedInspectorName: 'Assigned inspector', auditEventId: 'raw-audit-id',
}
const lguQuery = {
  collection: 'authorityLguCaseViews',
  constraints: [['marketId', '==', 'pasig'], ['status', 'in', ['forwarded_lgu', 'resolved']]],
}

function serverSnapshot(id, data) {
  return {
    id,
    metadata: { fromCache: false, hasPendingWrites: false },
    exists: () => true,
    data: () => data,
  }
}

test('emulator detail waits for a server snapshot and recovers on the same listener', async () => {
  const { subscribeAuthorityCase } = await loadBoundary('emulator')
  const updates = []
  subscribeAuthorityCase('case-1', record => updates.push(record), assert.fail, () => updates.push('waiting'), lgu)
  const listener = listeners.at(-1)
  assert.deepEqual(listener.ref, { collection: 'authorityCases', id: 'case-1' })
  assert.equal(listener.options.includeMetadataChanges, true)

  listener.next({ metadata: { fromCache: true, hasPendingWrites: false }, exists: assert.fail })
  const confirmed = { id: 'case-1', caseId: 'case-1', status: 'assigned' }
  const saved = serverSnapshot(confirmed.id, { ...confirmed, reporterEmail: 'private@example.test' })
  listener.next(saved)
  listener.next({ metadata: { fromCache: false, hasPendingWrites: true }, exists: assert.fail })
  listener.next(saved)
  assert.deepEqual(updates, ['waiting', confirmed, 'waiting', confirmed])
  assert.equal(listeners.at(-1), listener)
})

test('cloud LGU lists emit only confirmed Pasig projections and use the document UUID', async () => {
  const { subscribeAuthorityCases } = await loadBoundary('cloud_test')
  const updates = []
  subscribeAuthorityCases(value => updates.push(value), assert.fail, lgu, () => updates.push('waiting'))
  const listener = listeners.at(-1)
  assert.deepEqual(listener.ref, lguQuery)
  assert.equal(listener.options.includeMetadataChanges, true)
  listener.next({ metadata: { fromCache: true, hasPendingWrites: false } })
  listener.next({ metadata: { fromCache: false, hasPendingWrites: true } })
  listener.next({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [
    serverSnapshot(projectionId, { ...projection, ...leakedFields }),
    serverSnapshot(projectionId, { ...projection, caseId: leakedFields.id }),
    serverSnapshot(projectionId, { ...projection, marketId: 'elsewhere' }),
    serverSnapshot(projectionId, { ...projection, status: 'submitted' }),
    serverSnapshot(projectionId, { ...projection, title: { ownerId: 'consumer-1' } }),
    serverSnapshot(projectionId, { ...projection, createdAt: { toMillis: 'malformed timestamp' } }),
    serverSnapshot(leakedFields.id, { ...projection, caseId: leakedFields.id }),
  ] })
  assert.deepEqual(updates, ['waiting', 'waiting', [{ id: projectionId, ...projection }]])
})

test('cloud LGU detail subscribes to the projection and omits BFAR-only fields', async () => {
  const { subscribeAuthorityCase } = await loadBoundary('cloud_test')
  const updates = []
  subscribeAuthorityCase(projectionId, value => updates.push(value), assert.fail, () => updates.push('waiting'), lgu)
  const listener = listeners.at(-1)
  assert.deepEqual(listener.ref, { collection: 'authorityLguCaseViews', id: projectionId })
  listener.next({ metadata: { fromCache: true, hasPendingWrites: false }, exists: assert.fail })
  listener.next(serverSnapshot(projectionId, { ...projection, ...leakedFields, status: 'resolved', promotedAt: null }))
  assert.deepEqual(updates, ['waiting', { id: projectionId, ...projection, status: 'resolved', promotedAt: null }])
})

test('cloud LGU old bookmarks return no case without making any Firestore request', async () => {
  const { getAuthorityCase, subscribeAuthorityCase } = await loadBoundary('cloud_test')
  const subscriptionsBefore = listeners.length
  const readsBefore = reads.length
  const updates = []
  const unsubscribe = subscribeAuthorityCase(leakedFields.id, value => updates.push(value), assert.fail, assert.fail, lgu)
  assert.equal(await getAuthorityCase(leakedFields.id, lgu), null)
  assert.deepEqual(updates, [null])
  assert.equal(listeners.length, subscriptionsBefore)
  assert.equal(reads.length, readsBefore)
  unsubscribe()
})

test('one-time cloud LGU reads request the same projection and only use server results', async () => {
  const { getAuthorityCase, listAuthorityCases } = await loadBoundary('cloud_test')
  records.set(projectionId, serverSnapshot(projectionId, { ...projection, ...leakedFields }))
  assert.deepEqual(await listAuthorityCases(lgu), [{ id: projectionId, ...projection }])
  assert.deepEqual(await getAuthorityCase(projectionId, lgu), { id: projectionId, ...projection })
  assert.deepEqual(reads.slice(-2), [lguQuery, { collection: 'authorityLguCaseViews', id: projectionId }])
})

test('a BFAR portal profile with a signed LGU role cannot subscribe to cached BFAR case data', async () => {
  const { subscribeAuthorityCases, subscribeAuthorityCase } = await loadBoundary('cloud_test')
  const changed = { ...lgu, role: 'bfar_admin' }
  const subscriptionsBefore = listeners.length
  const errors = []
  subscribeAuthorityCases(assert.fail, error => errors.push(error.code), changed)
  subscribeAuthorityCase(leakedFields.id, value => assert.equal(value, null), assert.fail, assert.fail, changed)
  assert.equal(listeners.length, subscriptionsBefore)
  assert.deepEqual(errors, ['permission-denied'])
})

test('cloud BFAR still subscribes to original case documents', async () => {
  const { subscribeAuthorityCase } = await loadBoundary('cloud_test')
  const updates = []
  subscribeAuthorityCase(leakedFields.id, value => updates.push(value), assert.fail, assert.fail, { role: 'bfar_admin', consumerPermissions: { role: 'bfar_admin', cases: true } })
  const listener = listeners.at(-1)
  assert.deepEqual(listener.ref, { collection: 'authorityCases', id: leakedFields.id })
  listener.next(serverSnapshot(leakedFields.id, { ...projection, caseId: leakedFields.id, ...leakedFields }))
  assert.equal(updates[0].sourceConcernReportId, leakedFields.sourceConcernReportId)
  assert.equal(updates[0].reporterEmail, undefined)
})
