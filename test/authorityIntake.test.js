import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  AUTHORITY_CASES_RUNTIME_ENABLED,
  authorityErrorMessage,
  sanitizeAuthorityCase,
} from '../src/services/authorityCasesBoundary.js'

const intakeSource = await readFile(new URL('../src/pages/admin/consumer-intake/ConsumerIntake.jsx', import.meta.url), 'utf8')
const caseSource = await readFile(new URL('../src/pages/admin/authority-cases/AuthorityCases.jsx', import.meta.url), 'utf8')
const layoutSource = await readFile(new URL('../src/layout/AdminLayout.jsx', import.meta.url), 'utf8')
const reportsSource = await readFile(new URL('../src/pages/admin/reports/Reports.jsx', import.meta.url), 'utf8')
const sidebarSource = await readFile(new URL('../src/components/Sidebar.jsx', import.meta.url), 'utf8')

test('authority runtime is off without the explicit development emulator flag', () => {
  assert.equal(AUTHORITY_CASES_RUNTIME_ENABLED, false)
})

test('intake renders the shared-runtime disclosure, safe state, confirmation, and pending guard', () => {
  assert.match(intakeSource, /Configured for the shared Consumer cloud-test intake\./)
  assert.match(intakeSource, /Saved Consumer concern/)
  assert.match(intakeSource, /Accept as an authority case\?/)
  assert.match(intakeSource, /if \(promoting \|\| !concern\) return/)
  assert.doesNotMatch(intakeSource, /concern\.reporterEmail|concern\.ownerId|concern\.reporterName/)
})

test('Consumer Intake is BFAR-only while forwarded Authority Cases are available to scoped LGU admins', () => {
  assert.match(layoutSource, /'\/consumer-intake': \['bfar_admin'\]/)
  assert.match(layoutSource, /'\/authority-cases': \['bfar_admin', 'market_admin'\]/)
})

test('Consumer and Inspector workflows share one visible Report Management module without merging storage', () => {
  assert.match(sidebarSource, /label: 'Report Management'/)
  assert.doesNotMatch(sidebarSource, /label: 'Consumer Reports'|label: 'Authority Cases'/)
  assert.match(reportsSource, /label: isBfarAdmin \? 'Inspector Reports' : 'Inspector Escalations'/)
  assert.match(reportsSource, /label: 'Consumer Intake'/)
  assert.match(reportsSource, /label: 'Consumer Cases'/)
  assert.match(reportsSource, /<ConsumerIntake embedded/)
  assert.match(reportsSource, /<AuthorityCases embedded/)
})

test('general authority case view calls out privacy exclusions and status separation', () => {
  assert.match(caseSource, /kept separate from Inspector reports/)
  assert.match(caseSource, /Reporter contacts are protected/)
  assert.match(caseSource, /LGU and Inspectors do not receive/)
  assert.match(caseSource, /no precise GPS, image data, Storage path/)
})

test('authority records are defensively allowlisted before general rendering', () => {
  const safe = sanitizeAuthorityCase({
    id: 'case-1', caseId: 'case-1', title: 'Concern', status: 'submitted',
    reporterEmail: 'private@example.test', ownerId: 'consumer-1',
    imageBytes: 'base64', downloadUrl: 'https://example.test/private',
    latitude: 14.5, longitude: 121.0,
  })
  assert.deepEqual(safe, { id: 'case-1', caseId: 'case-1', title: 'Concern', status: 'submitted' })
})

test('intake explains protected contacts and unavailable linked evidence without leaking fields', () => {
  assert.match(intakeSource, /Reporter contacts are protected/)
  assert.match(intakeSource, /LGU and Inspectors do not receive them/)
  assert.match(intakeSource, /remains linked to its Consumer scan even though images are not shown/)
  assert.match(intakeSource, /secure evidence viewing is not yet enabled/i)
})

test('callable failures map to actionable authorization, validation, and runtime messages', () => {
  assert.match(authorityErrorMessage({ code: 'functions/permission-denied' }), /access was denied/)
  assert.match(authorityErrorMessage({ code: 'functions/not-found', operation: 'intake-detail' }), /no longer exists/)
  assert.match(authorityErrorMessage({ code: 'functions/not-found' }), /endpoint was not found/)
  assert.match(authorityErrorMessage({ code: 'functions/unavailable' }), /service is unavailable/)
  assert.match(authorityErrorMessage({ code: 'functions/failed-precondition', message: 'Private backend detail.' }), /environment or current record/)
  assert.doesNotMatch(authorityErrorMessage({ code: 'functions/failed-precondition', message: 'Private backend detail.' }), /Private backend detail/)
})
