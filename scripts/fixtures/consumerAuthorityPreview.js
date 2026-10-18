import { authorityFailureMessage } from '../../src/services/consumerAuthorityPolicy.js'
const scenario = new URLSearchParams(window.location.search).get('scenario')
export const AUTHORITY_CASES_RUNTIME_ENABLED = scenario !== 'disabled'
export const AUTHORITY_CASES_IS_CLOUD = false
export const AUTHORITY_CASES_RUNTIME_MODE = 'emulator'
export const AUTHORITY_RUNTIME_MESSAGE = 'Synthetic local fixture. Firebase is disconnected.'
export const authorityErrorMessage = authorityFailureMessage
const role = scenario === 'lgu' ? 'lgu' : 'bfar_admin'
const user = { uid: 'synthetic-reviewer', role: scenario === 'lgu' ? 'market_admin' : 'bfar_admin', accountStatus: 'active', consumerPermissions: { role, cases: scenario !== 'unauthorized', intake: scenario !== 'unauthorized' && role === 'bfar_admin' } }
export function useAuth() { return { user, isBfarAdmin: user.role === 'bfar_admin', isMarketAdmin: user.role === 'market_admin', refreshProfile: async () => user } }
const concern = { reportId: 'synthetic_report', vendorOrStall: 'Synthetic vendor · Stall 17', marketName: 'Synthetic Pasig market', reason: 'other', description: 'Synthetic findings for layout review.', createdAt: { _seconds: 1792022400 } }
let record = { id: 'case_synthetic_report_v1', caseId: 'case_synthetic_report_v1', sourceConcernReportId: 'synthetic_report', marketId: 'pasig', title: 'Consumer fish quality concern', assignedMarket: concern.marketName, vendorOrStall: concern.vendorOrStall, reason: 'other', description: concern.description, status: scenario === 'lgu' ? 'forwarded_lgu' : 'submitted', version: scenario === 'lgu' ? 4 : 1, assignedInspectorName: scenario === 'lgu' ? 'Synthetic inspector' : null, promotedAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' }
const listeners = new Set()
async function check() {
  await new Promise(resolve => setTimeout(resolve, 250))
  if (scenario === 'error') throw Object.assign(new Error(), { code: 'unavailable' })
  if (scenario === 'unauthorized') throw Object.assign(new Error(), { code: 'permission-denied' })
}
export async function listPendingConsumerConcerns() { await check(); return { concerns: scenario === 'empty' ? [] : [concern], nextPageToken: null } }
export async function getPendingConsumerConcern() { await check(); return { concern } }
export async function promoteConsumerConcern() { await check(); return { caseId: record.caseId, status: record.status, alreadyPromoted: false } }
export async function rejectConsumerConcern() { await check(); return { reportId: concern.reportId, decision: 'rejected' } }
export function subscribeAuthorityCase(_id, onData, onError) {
  let active = true
  const notify = () => { if (active) onData(record) }
  listeners.add(notify)
  check().then(notify, error => { if (active) onError(error) })
  return () => { active = false; listeners.delete(notify) }
}
export function subscribeAuthorityCases(onData, onError) { return subscribeAuthorityCase('', () => onData(scenario === 'empty' ? [] : [record]), onError) }
export async function listActiveInspectors() { return [{ id: 'synthetic-inspector', name: 'Synthetic inspector', accountStatus: 'active' }] }
const receipts = new Map()
let loseResponse = scenario === 'lost'
export async function transitionAuthorityCase(command) {
  await check()
  if (receipts.has(command.requestId)) return receipts.get(command.requestId)
  if (command.expectedVersion !== record.version) throw Object.assign(new Error(), { code: 'aborted', details: { category: 'stale_version' } })
  const status = { assign_inspector: 'assigned', start_investigation: 'in_progress', forward_to_lgu: 'forwarded_lgu', close_no_violation: 'closed_no_violation', resolve: 'resolved' }[command.transition]
  record = { ...record, status, version: record.version + 1, updatedAt: new Date().toISOString(), ...(command.assignment ? { assignedInspectorName: command.assignment.inspectorName } : {}) }
  const result = { schemaVersion: '1.0', outcome: 'accepted', caseId: record.caseId, status, version: record.version }
  receipts.set(command.requestId, result); listeners.forEach(notify => notify())
  if (loseResponse) { loseResponse = false; throw Object.assign(new Error(), { code: 'unavailable' }) }
  return result
}
