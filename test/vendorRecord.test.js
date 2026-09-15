import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVendorRecords, deriveVendorCompliance } from '../src/utils/vendorRecord.js'

test('vendor history is derived from nested Inspector reports', () => {
  const records = buildVendorRecords([], [{
    id: 'report-1',
    status: 'submitted',
    sourceType: 'inspector',
    vendor: { vendorName: 'Geri', stallNumber: '6' },
    inspector: { findings: 'Spoiled' },
    marketId: 'pasig',
  }])

  assert.equal(records.length, 1)
  assert.equal(records[0].ownerName, 'Geri')
  assert.equal(records[0].stallNo, '6')
  assert.equal(records[0].reportCount, 1)
  assert.equal(records[0].openCaseCount, 1)
  assert.equal(records[0].compliance, 'Under review')
})

test('managed vendor records merge with reports even when a report omits the stall number', () => {
  const records = buildVendorRecords([
    { id: 'vendor-1', ownerName: 'Geri', stallNo: '6', marketId: 'pasig', status: 'suspended' },
  ], [
    { id: 'report-1', vendorName: 'Geri', marketId: 'pasig', status: 'resolved' },
  ])

  assert.equal(records.length, 1)
  assert.equal(records[0].id, 'vendor-1')
  assert.equal(records[0].reportCount, 1)
  assert.equal(records[0].compliance, 'Non-compliant')
})

test('open cases take precedence while suspended status remains non-compliant', () => {
  assert.equal(deriveVendorCompliance(1, 'Compliant', 'active'), 'Under review')
  assert.equal(deriveVendorCompliance(0, 'Compliant', 'suspended'), 'Non-compliant')
})
