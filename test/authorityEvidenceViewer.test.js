import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const viewerSource = await readFile(new URL('../src/pages/admin/authority-cases/AuthorityEvidenceViewer.jsx', import.meta.url), 'utf8')
const caseSource = await readFile(new URL('../src/pages/admin/authority-cases/AuthorityCases.jsx', import.meta.url), 'utf8')
const authSource = await readFile(new URL('../src/services/authService.js', import.meta.url), 'utf8')
const environmentExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8')
const serviceSource = await readFile(new URL('../src/services/authorityEvidenceService.js', import.meta.url), 'utf8')

test('case detail integrates evidence only through the dedicated gated viewer', () => {
  assert.match(caseSource, /<AuthorityEvidenceViewer record=\{record\} user=\{user\}/)
  assert.match(viewerSource, /if \(!isAuthorityEvidenceViewerEnabled\(user\)\) return null/)
  assert.match(viewerSource, /isAuthorityEvidenceStatusEligible\(record\.status\)/)
  assert.match(authSource, /role, accountStatus, marketId/)
})

test('eligible viewer offers independent eyes-skin and optional gills actions', () => {
  assert.match(viewerSource, /View eyes and skin evidence/)
  assert.match(viewerSource, /openEvidence\('eyesAndSkin'\)/)
  assert.match(viewerSource, /View gills evidence/)
  assert.match(viewerSource, /openEvidence\('gills'\)/)
  assert.match(viewerSource, /Show eyes and skin/)
  assert.match(viewerSource, /Show gills/)
  assert.match(viewerSource, /Evidence viewing is disabled for this case status/)
})

test('viewer exposes accessible loading, display, safe error, retry, and close states', () => {
  assert.match(viewerSource, /role="status">Retrieving authorized evidence/)
  assert.match(viewerSource, /aria-live="polite"/)
  assert.match(viewerSource, /role="alert"/)
  assert.match(viewerSource, />Retry</)
  assert.match(viewerSource, />Close viewer</)
  assert.match(viewerSource, /disabled=\{loading\}/)
})

test('privacy and audit disclosure is explicit and no download or sensitive field is rendered', () => {
  for (const wording of [
    'displayed temporarily for authorized case review',
    'must not be copied or shared outside the approved case workflow',
    'Access is audited',
    'closing the viewer removes the temporary browser copy',
    'production evidence access remains disabled',
  ]) assert.equal(viewerSource.includes(wording), true)
  for (const forbidden of [
    'Download', 'Save evidence', 'storagePath', 'sourceScanId', 'sourceConcernReportId',
    'ownerId', 'reporterEmail', 'latitude', 'longitude', 'analysisSummary',
  ]) assert.equal(viewerSource.includes(forbidden), false)
})

test('environment default is disabled and evidence service has no direct Storage dependency', () => {
  assert.match(environmentExample, /^VITE_AUTHORITY_EVIDENCE_EMULATOR=false$/m)
  assert.match(environmentExample, /^VITE_AUTHORITY_EVIDENCE_ENDPOINT=http:\/\/127\.0\.0\.1:5001\/frish-app2026\/asia-southeast1\/getAuthorityCaseEvidence$/m)
  assert.doesNotMatch(serviceSource, /firebase\/storage|getStorage|getDownloadURL|storagePath/)
})
