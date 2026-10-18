import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createAuthorityFirebaseClient } from '../src/services/authorityFirebaseClient.js'

function fixture() {
  const cloudApp = { name: '[DEFAULT]' }
  const primary = { app: cloudApp, auth: { app: cloudApp, currentUser: { uid: 'cloud-staff' } }, db: { app: cloudApp }, storage: { app: cloudApp }, functions: { app: cloudApp } }
  const apps = [cloudApp]; const calls = []; const services = new Map()
  const service = (name, app) => {
    const key = `${app.name}:${name}`
    if (!services.has(key)) services.set(key, { app, currentUser: null })
    return services.get(key)
  }
  const sdk = { getApps: () => apps, initializeApp: (_config, name) => { const app = { name }; apps.push(app); return app },
    getAuth: app => service('auth', app), getFirestore: app => service('db', app), getStorage: app => service('storage', app),
    getFunctions: (app, region) => { assert.equal(region, 'asia-southeast1'); return service('functions', app) } }
  for (const name of ['connectAuthEmulator', 'connectFirestoreEmulator', 'connectStorageEmulator', 'connectFunctionsEmulator']) {
    sdk[name] = (...args) => { assert.notEqual(args[0].app, cloudApp); calls.push([name, ...args]) }
  }
  return { mode: 'emulator', firebaseEnabled: true, config: { projectId: 'frish-app2026' }, primary, sdk, connectedApps: new WeakSet(), apps, calls }
}

test('disabled Consumer runtime initializes nothing and never alters primary cloud clients', () => {
  const f = fixture()
  for (const options of [{ mode: 'disabled' }, { firebaseEnabled: false }]) {
    assert.deepEqual(createAuthorityFirebaseClient({ ...f, ...options }), { app: null, auth: null, db: null, storage: null, functions: null })
  }
  assert.equal(f.apps.length, 1); assert.equal(f.calls.length, 0)
  assert.equal(f.primary.auth.currentUser.uid, 'cloud-staff')
})

test('approved Consumer cloud-test shares primary cloud identity and clients without emulator calls', () => {
  const f = fixture()
  assert.equal(createAuthorityFirebaseClient({ ...f, mode: 'cloud_test' }), f.primary)
  assert.equal(f.apps.length, 1); assert.equal(f.calls.length, 0)
})

test('Consumer emulator clients use only the named app and never copy the cloud user', () => {
  const f = fixture()
  const local = createAuthorityFirebaseClient(f)
  assert.equal(local.app.name, 'frish-consumer-authority-emulator')
  for (const name of ['auth', 'db', 'storage', 'functions']) assert.notEqual(local[name], f.primary[name])
  assert.equal(local.auth.currentUser, null)
  assert.equal(f.primary.auth.currentUser.uid, 'cloud-staff')
  assert.deepEqual(f.calls.map(([name, _client, ...address]) => [name, ...address]), [
    ['connectAuthEmulator', 'http://127.0.0.1:9099', { disableWarnings: true }],
    ['connectFirestoreEmulator', '127.0.0.1', 8080], ['connectStorageEmulator', '127.0.0.1', 9199], ['connectFunctionsEmulator', '127.0.0.1', 5001],
  ])
  assert.equal(createAuthorityFirebaseClient(f).app, local.app)
  assert.equal(f.calls.length, 4, 'reused app must not reconnect clients')
})

test('unsupported Consumer project/runtime cannot create or reconnect clients', () => {
  const f = fixture()
  assert.throws(() => createAuthorityFirebaseClient({ ...f, mode: 'production' }))
  assert.throws(() => createAuthorityFirebaseClient({ ...f, config: { projectId: 'other' } }))
  assert.equal(f.apps.length, 1); assert.equal(f.calls.length, 0)
})

test('merged auth preserves portal profile authorization, signed feedback claims and separate Consumer permissions', async () => {
  const auth = await readFile(new URL('../src/services/authService.js', import.meta.url), 'utf8')
  assert.match(auth, /const role = profile\.role/)
  assert.doesNotMatch(auth, /const role = .*token\.claims\.role/)
  assert.match(auth, /feedbackOnlineTest: onlineToken\?\.claims\.feedbackOnlineTest \|\| null/)
  assert.match(auth, /authorityRuntimeMode === 'cloud_test' \|\| FEEDBACK_MODE === 'online_test'/)
  assert.match(auth, /consumerClaims = authorityRuntimeMode === 'cloud_test' \? token\.claims : \{\}/)
  assert.match(auth, /getIdTokenResult\(authorityAuth\.currentUser, true\)/)
  assert.match(auth, /consumerPermissions\(consumerClaims, authorityRuntimeMode\)/)
  assert.match(auth, /signInAdmin = signInAdminWithCredentials/)
  assert.match(auth, /signOut\(authorityAuth\)/)
  assert.doesNotMatch(auth, /console\.error\([^\n]*, error\)/)
})

test('Inspector feedback actions remain separate from the validated read-only Consumer component', async () => {
  const parent = await readFile(new URL('../src/pages/admin/feedback/Feedback.jsx', import.meta.url), 'utf8')
  const child = await readFile(new URL('../src/pages/admin/feedback/ConsumerFeedbackInbox.jsx', import.meta.url), 'utf8')
  assert.match(parent, /subscribeMarketRecords\(/)
  assert.match(parent, /replyToFeedback\(/); assert.match(parent, /resolveFeedback\(/)
  assert.match(parent, /<ConsumerFeedbackInbox \/>/)
  assert.doesNotMatch(parent, /consumerFeedbackBoundary|listConsumerFeedback/)
  assert.match(child, /from '\.\.\/\.\.\/\.\.\/services\/consumerFeedbackInbox\.js'/)
  assert.match(child, /canViewConsumerFeedback\(CONSUMER_FEEDBACK_RUNTIME_ENABLED, user\)/)
  assert.doesNotMatch(child, /replyToFeedback|resolveFeedback|subscribeMarketRecords/)
})
