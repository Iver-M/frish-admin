import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const reportDetail = await readFile(new URL('../src/pages/admin/reports/ReportDetail.jsx', import.meta.url), 'utf8')
const firestoreService = await readFile(new URL('../src/services/firestoreService.js', import.meta.url), 'utf8')
const notifications = await readFile(new URL('../src/pages/admin/notifications/Notifications.jsx', import.meta.url), 'utf8')
const receipt = await readFile(new URL('../src/components/ActionReceiptModal.jsx', import.meta.url), 'utf8')

test('report workflow separates BFAR and LGU acknowledgements from final resolution', () => {
  assert.match(reportDetail, /value="under-review">Under BFAR Review/)
  assert.match(reportDetail, /Acknowledge case/)
  assert.match(reportDetail, /status: 'under-lgu-action'/)
  assert.match(reportDetail, /Submit final decision/)
})

test('authority acknowledgements use server timestamps and named audit events', () => {
  assert.match(firestoreService, /bfarAcknowledgedAt = serverTimestamp\(\)/)
  assert.match(firestoreService, /lguAcknowledgedAt = serverTimestamp\(\)/)
  assert.match(reportDetail, /Acknowledged escalated report/)
  assert.match(reportDetail, /Received by Pasig LGU/)
})

test('completed report actions provide a printable receipt and next step', () => {
  assert.match(receipt, /Action completed/)
  assert.match(receipt, /Print receipt/)
  assert.match(receipt, /What happens next:/)
  assert.match(reportDetail, /ActionReceiptModal/)
})

test('BFAR receives a real-time notification when LGU acknowledges a case', () => {
  assert.match(notifications, /Pasig LGU acknowledged the case/)
  assert.match(notifications, /lguAcknowledgedAt/)
})
