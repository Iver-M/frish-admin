import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import {
  AUTHORITY_CASES_COLLECTION,
  AUTHORITY_CASES_RUNTIME_ENABLED,
  requireAuthorityCasesRuntime,
} from '../src/services/authorityCasesBoundary.js'

const require = createRequire(import.meta.url)
const fixtures = require('../contracts/shared-report-contract/fixtures.json')
const {
  AUTHORITY_STATUSES,
  CONTRACT_VERSION,
  validateAuthorityCase,
  validateConcern,
  validateFixture,
} = require('../contracts/shared-report-contract/validator.cjs')
const fixture = (name) => fixtures.fixtures.find((candidate) => candidate.name === name)

test('all shared contract fixtures have the pinned expected result', () => {
  assert.equal(fixtures.contractVersion, CONTRACT_VERSION)
  for (const candidate of fixtures.fixtures) {
    const validation = validateFixture(candidate, fixtures)
    assert.deepEqual(validation, {
      valid: candidate.expected === 'accept',
      code: candidate.expected === 'accept' ? null : candidate.rejectionCode,
    }, candidate.name)
  }
})

test('consumer status cannot enter the authority vocabulary', () => {
  assert.equal(AUTHORITY_STATUSES.has('prototype_saved'), false)
  assert.deepEqual(
    validateFixture(fixture('rejected_prototype_saved_to_submitted_implicit_mapping'), fixtures),
    { valid: false, code: 'trusted_promotion_required' },
  )
})

test('unknown fields and invalid status values fail closed', () => {
  const concern = fixture('valid_immutable_consumer_concern').document
  assert.deepEqual(validateConcern({ ...concern, extra: true }), { valid: false, code: 'unknown_or_missing_field' })
  assert.deepEqual(validateConcern({ ...concern, status: 'submitted' }), { valid: false, code: 'invalid_consumer_status' })

  const authority = fixture('authority_case_with_unavailable_analysis').document
  assert.deepEqual(validateAuthorityCase({ ...authority, extra: true }), { valid: false, code: 'unknown_or_missing_field' })
  assert.deepEqual(validateAuthorityCase({ ...authority, status: 'prototype_saved' }), { valid: false, code: 'invalid_authority_status' })
})

test('invalid field types, sizes, timestamps, and deterministic IDs fail closed', () => {
  const concern = fixture('valid_immutable_consumer_concern').document
  assert.deepEqual(validateConcern({ ...concern, description: 'x'.repeat(2001) }), { valid: false, code: 'invalid_field_type_or_size' })
  assert.deepEqual(validateConcern({ ...concern, createdAt: 123 }), { valid: false, code: 'invalid_timestamp' })

  const authority = fixture('authority_case_with_unavailable_analysis').document
  assert.deepEqual(validateAuthorityCase({ ...authority, title: false }), { valid: false, code: 'invalid_field_type_or_size' })
  assert.deepEqual(validateAuthorityCase({ ...authority, caseId: 'case_random_v1' }), { valid: false, code: 'invalid_deterministic_case_id' })
})

test('contract version mismatch is detected', () => {
  assert.deepEqual(
    validateFixture(fixture('valid_immutable_consumer_concern'), { ...fixtures, contractVersion: '2.0.0' }),
    { valid: false, code: 'contract_version_mismatch' },
  )
})

test('authority cases service boundary remains disabled without the emulator flag', () => {
  assert.equal(AUTHORITY_CASES_COLLECTION, 'authorityCases')
  assert.equal(AUTHORITY_CASES_RUNTIME_ENABLED, false)
  assert.throws(requireAuthorityCasesRuntime, (error) => error.code === 'authority-cases-disabled')
})
