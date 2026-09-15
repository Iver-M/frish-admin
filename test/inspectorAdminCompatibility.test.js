import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeFeedbackRecord } from '../src/utils/feedbackRecord.js'
import {
  assessMarketLocation,
  PASIG_PUBLIC_MARKET_GEOFENCE,
} from '../src/utils/locationIntegrity.js'
import { normalizeReportRecord } from '../src/utils/reportRecord.js'
import { normalizeScanRecord } from '../src/utils/scanRecord.js'

const inspectorUid = 'FyvkHoJs9XO5MVfkop4x0DAn9JB2'

test('admin normalizes the Inspector mobile report document without losing evidence', () => {
  const report = normalizeReportRecord({
    assessment: {
      fishType: 'Bangus',
      freshness: 'Fresh',
      confidence: 69,
      overallStatus: 'WARNING',
      image: 'file:///data/user/0/com.frish_inspector/cache/scan.jpg',
      location: { latitude: 14.5586, longitude: 121.0841 },
      sensor: { ammonia: 'Low', temperature: 4 },
      detectedParts: [{ class: 'Eyes', confidence: 0.74 }],
    },
    vendor: { vendorName: 'Geri', stallNumber: '6', contactNumber: '09854631278' },
    inspector: { findings: 'Spoiled', actionTaken: 'Verbal' },
    sourceType: 'inspector',
    status: 'submitted',
    createdBy: { uid: inspectorUid, role: 'inspector' },
  })

  assert.equal(report.vendorName, 'Geri')
  assert.equal(report.description, 'Spoiled')
  assert.equal(report.actionTaken, 'Verbal')
  assert.equal(report.sourceType, 'inspector')
  assert.equal(report.status, 'submitted')
  assert.equal(report.assessment.fishType, 'Bangus')
  assert.equal(report.assessment.localImagePath.startsWith('file:///'), true)
  assert.equal(report.assessment.imageUrl, '')
  assert.equal(report.compatibility.legacyMobileSchema, true)
})

test('admin normalizes Inspector mobile scan records and device-local images safely', () => {
  const scan = normalizeScanRecord({
    id: 'mobile-scan-001',
    fishType: 'Galunggong (Round Scad)',
    freshness: 'Fresh',
    confidence: 88,
    imagePath: 'file:///data/user/0/com.frish_inspector/cache/scan.jpg',
    createdBy: { uid: inspectorUid, email: 'inspector@example.com', role: 'inspector' },
  })

  assert.equal(scan.assessmentCode.startsWith('GG - '), true)
  assert.equal(scan.species, 'Galunggong (Round Scad)')
  assert.equal(scan.status, 'fresh')
  assert.equal(scan.inspectorUid, inspectorUid)
  assert.equal(scan.photo, '')
  assert.equal(scan.imageAvailability, 'Device-local path only')
})

test('admin normalizes mobile feedback for the BFAR feedback inbox', () => {
  const feedback = normalizeFeedbackRecord({
    id: 'feedback-001',
    userId: inspectorUid,
    userEmail: 'inspector@example.com',
    userName: 'Inspector Demo',
    role: 'inspector',
    rating: 2,
    message: 'The scan took too long.',
    status: 'pending',
    platform: 'mobile',
    appVersion: '0.1.0',
  })

  assert.equal(feedback.user, 'Inspector Demo')
  assert.equal(feedback.userType, 'Inspector')
  assert.equal(feedback.sentiment, 'negative')
  assert.equal(feedback.status, 'pending')
  assert.equal(feedback.feedbackCode.startsWith('FDB-'), true)
})

test('location integrity distinguishes missing, inside, and outside coordinates', () => {
  assert.equal(assessMarketLocation({ latitude: 0, longitude: 0 }).state, 'missing')
  assert.equal(assessMarketLocation({
    latitude: PASIG_PUBLIC_MARKET_GEOFENCE.latitude,
    longitude: PASIG_PUBLIC_MARKET_GEOFENCE.longitude,
  }).state, 'verified')
  assert.equal(assessMarketLocation({ latitude: 14.5995, longitude: 120.9842 }).state, 'outside')
})
