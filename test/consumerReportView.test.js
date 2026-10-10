import assert from 'node:assert/strict'
import { test } from 'node:test'
import { combineReportViews, consumerReportView, loadPendingReportPages, reportRouteRoot, reportTimestamp, reportViewPath } from '../src/utils/consumerReportView.js'

test('Consumer presentation uses Inspector card fields while excluding private and evidence fields', () => {
  const view = consumerReportView({ reportId: 'report_one', vendorOrStall: 'Vendor · Stall 18', reason: 'other', description: 'Observed concern', reporterEmail: 'private@example.test', ownerId: 'secret', latitude: 14, imageUrl: 'private', assessment: { overallStatus: 'Pass' } }, 'concern')
  assert.equal(view.sourceType, 'consumer')
  assert.equal(view.vendorName, 'Vendor · Stall 18')
  assert.equal(view.status, 'awaiting-review')
  assert.equal(view.statusLabel, 'Awaiting BFAR review')
  for (const field of ['reporterEmail', 'ownerId', 'latitude', 'imageUrl', 'assessment']) assert.equal(Object.hasOwn(view, field), false)
  assert.equal(reportViewPath(view), '/reports/consumer/report_one')
})

test('promoted concerns appear once, keep their report code, and never collide with Inspector IDs', () => {
  const concerns = [{ reportId: 'same', vendorOrStall: 'Vendor' }, { reportId: 'pending' }]
  const cases = [{ caseId: 'same', sourceConcernReportId: 'same', sourceType: 'consumer', status: 'assigned' }]
  const views = combineReportViews([{ id: 'same', sourceType: 'inspector' }], concerns, cases)
  assert.equal(views.length, 3)
  assert.equal(new Set(views.map(item => item.viewKey)).size, 3)
  const promoted = views.find(item => item.viewKind === 'authority')
  assert.equal(promoted.statusLabel, 'Under review')
  assert.equal(promoted.reportCode, consumerReportView(concerns[0], 'concern').reportCode)
  assert.equal(reportViewPath(promoted), '/reports/authority/same')
  assert.equal(reportViewPath(views[0]), '/reports/same')
})

test('authority status mapping preserves no-violation closure and rejects wrong-source cases', () => {
  for (const [status, expected] of [['in_progress', 'in progress'], ['forwarded_lgu', 'forwarded-lgu'], ['closed_no_violation', 'closed_no_violation']]) assert.equal(consumerReportView({ caseId: 'case', sourceType: 'consumer', status }, 'authority').status, expected)
  assert.equal(consumerReportView({ caseId: 'case', sourceType: 'inspector' }, 'authority'), null)
  assert.equal(consumerReportView({}, 'concern'), null)
})

test('Consumer detail URLs use the BFAR-only route gate, including base paths', () => {
  for (const path of ['/reports/consumer/report', '/reports/authority/case', '/reports/consumer', '/consumer-intake/report']) assert.equal(reportRouteRoot(path), '/consumer-intake')
  assert.equal(reportRouteRoot('/authority-cases/case'), '/authority-cases')
  assert.equal(reportRouteRoot('/reports/inspector'), '/reports')
  assert.equal(reportRouteRoot('/profile'), '/profile')
})

test('pending concerns paginate beyond fifty, deduplicate, and discard abandoned sessions', async () => {
  const requests = []
  const all = await loadPendingReportPages(async options => {
    requests.push(options)
    return options.pageToken ? { concerns: [{ reportId: 'one' }, { reportId: 'two' }], nextPageToken: null } : { concerns: [{ reportId: 'one' }], nextPageToken: 'cursor' }
  })
  assert.deepEqual(requests, [{ pageSize: 50 }, { pageSize: 50, pageToken: 'cursor' }])
  assert.deepEqual(all.map(item => item.reportId), ['one', 'two'])
  assert.deepEqual(await loadPendingReportPages(async () => ({ concerns: [{ reportId: 'private' }] }), () => false), [])
  await assert.rejects(loadPendingReportPages(async () => ({ concerns: [], nextPageToken: 'repeated' })), /pagination/)
})

test('timestamps support Firestore and serialized callable dates without inventing missing dates', () => {
  assert.equal(reportTimestamp({ _seconds: 1000 }), 1000000)
  assert.equal(reportTimestamp({ seconds: 1000 }), 1000000)
  assert.equal(reportTimestamp({ toMillis: () => 1000000 }), 1000000)
  assert.equal(reportTimestamp('1970-01-01T00:16:40Z'), 1000000)
  for (const value of [null, {}, 'invalid', { seconds: Infinity }]) assert.equal(reportTimestamp(value), 0)
})
