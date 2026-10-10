import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  authorityAction, authorityStatusLabel, availableAuthorityActions,
  buildAuthorityCommand, createAuthorityTransitionClient,
  authorityWorkflowError, isAmbiguousAuthorityFailure, validateAuthorityResult,
} from '../src/services/authorityWorkflow.js'

const user = { uid: 'bfar-1', role: 'bfar_admin', accountStatus: 'active' }
const inspector = { id: 'inspector-1', name: 'Inspector One', role: 'inspector', accountStatus: 'active' }
const record = { caseId: 'case_report_guest_scan_v1', sourceType: 'consumer', status: 'submitted', version: 1 }
const requestId = '123e4567-e89b-42d3-a456-426614174000'
const command = () => buildAuthorityCommand(record, user, 'assign_inspector', inspector, requestId)
const result = () => ({ schemaVersion: '1.0', outcome: 'accepted', caseId: record.caseId, status: 'assigned', version: 2 })

test('BFAR receives only the legal next actions and cannot resolve for LGU', () => {
  for (const [status, expected] of Object.entries({
    submitted: ['assign_inspector'], assigned: ['start_investigation'],
    in_progress: ['forward_to_lgu', 'close_no_violation'],
    forwarded_lgu: [], resolved: [], closed_no_violation: [], unknown: [],
  })) assert.deepEqual(availableAuthorityActions({ ...record, status }, user).map(action => action.transition), expected)
  assert.equal(authorityAction('resolve'), null)
})

test('inactive, missing and non-BFAR accounts or non-Consumer records have no controls', () => {
  for (const invalid of [null, { ...user, uid: '' }, { ...user, role: 'inspector' }, { ...user, accountStatus: 'inactive' }]) {
    assert.deepEqual(availableAuthorityActions(record, invalid), [])
  }
  for (const invalid of [{ ...record, sourceType: 'inspector' }, { ...record, version: 0 }, { ...record, version: 1.5 }]) {
    assert.deepEqual(availableAuthorityActions(invalid, user), [])
  }
})

test('assignment command contains exactly the backend v1 fields, current version and active selection', () => {
  assert.deepEqual(command(), {
    schemaVersion: '1.0', requestId, caseId: record.caseId, expectedVersion: 1,
    transition: 'assign_inspector', assignment: { inspectorId: 'inspector-1', inspectorName: 'Inspector One' }, reasonCode: 'workflow',
  })
  for (const invalid of [null, { ...inspector, accountStatus: 'inactive' }, { ...inspector, role: 'bfar_admin' },
    { ...inspector, id: ' inspector-1' }, { ...inspector, name: 'bad\nname' }, { ...inspector, name: 'a'.repeat(121) }]) {
    assert.throws(() => buildAuthorityCommand(record, user, 'assign_inspector', invalid, requestId), /active inspector/)
  }
})

test('non-assignment transitions never carry inspector, role or free-form status fields', () => {
  const next = buildAuthorityCommand({ ...record, status: 'assigned', version: 2 }, user, 'start_investigation', inspector, requestId)
  assert.equal(next.assignment, null)
  assert.equal(next.expectedVersion, 2)
  assert.equal(Object.hasOwn(next, 'status'), false)
  assert.equal(Object.hasOwn(next, 'role'), false)
  assert.throws(() => buildAuthorityCommand(record, user, 'forward_to_lgu', null, requestId), /Reload/)
  assert.throws(() => buildAuthorityCommand(record, user, 'resolve', null, requestId), /Reload/)
})

test('bad case IDs, overflowing versions and invalid UUIDs fail before the callable', () => {
  for (const invalid of [{ ...record, caseId: '../another-case' }, { ...record, version: Number.MAX_SAFE_INTEGER }]) {
    assert.throws(() => buildAuthorityCommand(invalid, user, 'assign_inspector', inspector, requestId))
  }
  assert.throws(() => buildAuthorityCommand(record, user, 'assign_inspector', inspector, 'not-a-request'))
})

test('the status reader uses fixed public labels and never displays an unknown raw value', () => {
  assert.equal(authorityStatusLabel('assigned'), 'Under review')
  assert.equal(authorityStatusLabel('in_progress'), 'Investigating')
  assert.equal(authorityStatusLabel('private-internal-state'), 'Status unavailable')
  const action = authorityAction('assign_inspector')
  action.consumerLabel = 'corrupted'
  assert.equal(authorityAction('assign_inspector').consumerLabel, 'Under review')
})

test('a timeout can be retried with the same UUID, expected version and payload', async () => {
  const received = []
  const send = createAuthorityTransitionClient(async value => {
    received.push(value)
    if (received.length === 1) throw { code: 'functions/deadline-exceeded' }
    return result()
  })
  const pending = command()
  await assert.rejects(send(pending), error => isAmbiguousAuthorityFailure(error))
  assert.deepEqual(await send(pending), result())
  assert.equal(received[0], received[1])
})

test('cross-case, stale, impossible or unaccepted responses cannot be presented as success', () => {
  for (const invalid of [null, { ...result(), caseId: 'case_foreign' }, { ...result(), status: 'resolved' },
    { ...result(), version: 1 }, { ...result(), outcome: 'denied' }, { ...result(), schemaVersion: '2.0' },
    { ...result(), internalNote: 'private' }]) {
    assert.throws(() => validateAuthorityResult(command(), invalid), error => isAmbiguousAuthorityFailure(error))
  }
})

test('workflow failures give safe retry/conflict guidance without backend messages', () => {
  assert.match(authorityWorkflowError({ code: 'functions/aborted', message: 'private UID' }), /latest status/)
  assert.match(authorityWorkflowError({ code: 'functions/unavailable' }), /same request/)
  assert.match(authorityWorkflowError({ code: 'functions/permission-denied' }), /not authorized/)
  assert.doesNotMatch(authorityWorkflowError({ code: 'functions/internal', message: 'secret-token' }), /secret-token/)
  assert.equal(isAmbiguousAuthorityFailure({ code: 'functions/permission-denied' }), false)
  assert.equal(isAmbiguousAuthorityFailure(new TypeError('network interrupted')), true)
})
