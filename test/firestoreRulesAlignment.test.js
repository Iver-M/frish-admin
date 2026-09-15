import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')

test('merged Firestore rules retain every Inspector and admin collection boundary', () => {
  for (const collection of [
    'users',
    'assessments',
    'scans',
    'predictions',
    'vendors',
    'reports',
    'reporterNotifications',
    'auditLogs',
    'feedback',
  ]) {
    assert.match(rules, new RegExp(`match /${collection}/\\{`), `${collection} rules are missing`)
  }
})

test('Inspector self-registration is fixed to the inspector role', () => {
  assert.match(rules, /function isInspectorSelfProfileCreate/)
  assert.match(rules, /request\.resource\.data\.role == 'inspector'/)
  assert.match(rules, /request\.resource\.data\.accountStatus == 'active'/)
})

test('admins can update only their own non-security profile fields', () => {
  assert.match(rules, /function isAdminSelfProfileUpdate/)
  assert.match(rules, /'phone'/)
  assert.match(rules, /'department'/)
  assert.match(rules, /request\.resource\.data\.role == resource\.data\.role/)
})

test('mobile scan ownership and notification acknowledgement remain protected', () => {
  assert.match(rules, /resource\.data\.createdBy\.uid == request\.auth\.uid/)
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[\s*'readAt'/)
})

test('BFAR feedback updates support the portal response lifecycle', () => {
  for (const field of ['adminReply', 'resolvedBy', 'resolvedAt']) {
    assert.match(rules, new RegExp(`'${field}'`))
  }
  assert.match(rules, /'in-progress'/)
  assert.match(rules, /'resolved'/)
})
