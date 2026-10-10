import assert from 'node:assert/strict'
import { test } from 'node:test'
import { consumerPhotoEvidence } from '../src/utils/consumerPhotoEvidence.js'
import { normalizeReportRecord } from '../src/utils/reportRecord.js'

test('Consumer photo presentation excludes Inspector readings, decisions and private scan fields', () => {
  const record = normalizeReportRecord({ sourceType: 'consumer', assessment: {
    imageUrl: 'https://example.test/fish.jpg', fishType: 'Milkfish', freshness: 'Fresh',
    sensor: { temperature: 25, humidity: 75, ammonia: 4, gasResistance: 10 },
    overallStatus: 'Pass', confidence: 99, shelfLife: 8, storageRecommendation: 'Ice',
    location: { latitude: 14, longitude: 121 }, scanId: 'private-scan',
  } })
  assert.deepEqual(consumerPhotoEvidence(record.assessment), {
    imageUrl: 'https://example.test/fish.jpg', fishType: 'Milkfish', freshness: 'Fresh',
  })
  // Removing these fields from presentation must not modify the stored assessment.
  assert.equal(record.assessment.sensor.temperature, 25)
  assert.equal(record.assessment.overallStatus, 'Pass')
})

test('missing Consumer evidence produces no Inspector placeholders or invented estimate', () => {
  for (const assessment of [undefined, {}, { sensor: { temperature: 25 }, overallStatus: 'Pass' }, { image: 'file:///private.jpg' }]) {
    assert.equal(consumerPhotoEvidence(normalizeReportRecord({ sourceType: 'consumer', assessment }).assessment), null)
  }
  assert.deepEqual(consumerPhotoEvidence({ imageUrl: 'https://example.test/fish.jpg' }), { imageUrl: 'https://example.test/fish.jpg', fishType: '', freshness: '' })
})

test('Consumer estimates preserve only existing supported freshness labels', () => {
  for (const freshness of ['Fresh', 'Moderately Fresh', 'Not Fresh', 'Uncertain estimate']) assert.equal(consumerPhotoEvidence({ freshness }).freshness, freshness)
  for (const freshness of ['Pass', 'Conditional', 'Fail', 'Safe', 'Not recorded', '']) assert.equal(consumerPhotoEvidence({ freshness }), null)
})
