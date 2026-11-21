import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

const asModule = source => `data:text/javascript,${encodeURIComponent(source)}`
const firestore = asModule(`
  export const listeners = []
  export const doc = (_, collection, id) => ({ collection, id })
  export function onSnapshot(ref, options, next) {
    listeners.push({ ref, options, next })
    return () => {}
  }
  export const collection = undefined, getDoc = undefined, getDocs = undefined
  export const orderBy = undefined, query = undefined, where = undefined
`)
const authorityRuntime = asModule(`
  export const authorityRuntimeMode = 'emulator'
  export const consumerRuntime = { message: '' }
  export const auth = null, db = null, functions = null, getAuthorityAppCheckToken = () => null
`)

test('case detail waits for a server snapshot and recovers on the same listener', async () => {
  const boundary = new URL('../src/services/authorityCasesBoundary.js?case-waiting-regression', import.meta.url)
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === boundary.href) {
        if (specifier === 'firebase/firestore') return { url: firestore, shortCircuit: true }
        if (specifier === './authorityFirebase.js') return { url: authorityRuntime, shortCircuit: true }
      }
      return nextResolve(specifier, context)
    },
  })
  try {
    const { subscribeAuthorityCase } = await import(boundary.href)
    const { listeners } = await import(firestore)
    const updates = []
    subscribeAuthorityCase('case-1', record => updates.push(record), assert.fail, () => updates.push('waiting'))
    assert.equal(listeners.length, 1)
    const [listener] = listeners
    assert.deepEqual(listener.ref, { collection: 'authorityCases', id: 'case-1' })
    assert.equal(listener.options.includeMetadataChanges, true)

    listener.next({ metadata: { fromCache: true, hasPendingWrites: false }, exists: assert.fail })
    assert.deepEqual(updates, ['waiting'])
    const confirmed = { id: 'case-1', caseId: 'case-1', status: 'assigned' }
    const serverSnapshot = {
      id: confirmed.id,
      metadata: { fromCache: false, hasPendingWrites: false },
      exists: () => true,
      data: () => ({ ...confirmed, reporterEmail: 'private@example.test' }),
    }
    listener.next(serverSnapshot)
    assert.deepEqual(updates, ['waiting', confirmed])

    listener.next({ metadata: { fromCache: false, hasPendingWrites: true }, exists: assert.fail })
    listener.next(serverSnapshot)
    assert.deepEqual(updates, ['waiting', confirmed, 'waiting', confirmed])
    assert.equal(listeners.length, 1)
  } finally {
    hooks.deregister()
  }
})
