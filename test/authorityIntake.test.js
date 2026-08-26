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

test('authority runtime is off without the explicit development emulator flag', () => {
  assert.equal(AUTHORITY_CASES_RUNTIME_ENABLED, false)
})

test('intake renders the emulator disclosure, prototype state, confirmation, and pending guard', () => {
  assert.match(intakeSource, /Emulator prototype — not connected to production Firebase\./)
  assert.match(intakeSource, /prototype_saved/)
  assert.match(intakeSource, /Accept as an authority case\?/)
  assert.match(intakeSource, /if \(promoting \|\| !concern\) return/)
  assert.doesNotMatch(intakeSource, /concern\.reporterEmail|concern\.ownerId|concern\.reporterName/)
})

test('Consumer Intake and Authority Cases routes are BFAR-only', () => {
  assert.match(layoutSource, /'\/consumer-intake': \['bfar_admin'\]/)
  assert.match(layoutSource, /'\/authority-cases': \['bfar_admin'\]/)
})

test('general authority case view calls out privacy exclusions and status separation', () => {
  assert.match(caseSource, /separate from legacy Inspector reports/)
  assert.match(caseSource, /Reporter contacts are protected/)
  assert.match(caseSource, /LGU and Inspectors do not receive/)
  assert.match(caseSource, /Secure evidence viewing is not yet enabled/)
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

test('callable failures map to actionable authorization, validation, and emulator messages', () => {
  assert.match(authorityErrorMessage({ code: 'functions/permission-denied' }), /not authorized/)
  assert.match(authorityErrorMessage({ code: 'functions/not-found' }), /no longer exists/)
  assert.match(authorityErrorMessage({ code: 'functions/unavailable' }), /emulators are unavailable/)
  assert.equal(authorityErrorMessage({ code: 'functions/failed-precondition', message: 'Invalid concern.' }), 'Invalid concern.')
})
