import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { transformWithEsbuild } from 'vite'
import * as transitions from '../src/services/authorityTransitionClient.js'
import * as policy from '../src/services/consumerAuthorityPolicy.js'

const source = await readFile(new URL('../src/pages/admin/authority-cases/AuthorityCaseActions.jsx', import.meta.url), 'utf8')
const { code } = await transformWithEsbuild(source, 'AuthorityCaseActions.jsx', { format: 'cjs', jsx: 'automatic' })
const require = createRequire(import.meta.url)
const record = { caseId: '66666666-6666-4666-8666-666666666666', marketId: 'pasig', version: 4, status: 'forwarded_lgu' }
const user = { uid: 'synthetic', consumerPermissions: { role: 'lgu' } }

// Drive two consecutive component lifetimes while the original HTTP call is outstanding.
function mount(storage, send) {
  const slots = [], effects = [], cleanups = []
  let cursor, initialized = false
  const hooks = {
    useState(initial) {
      const i = cursor++
      if (!initialized) slots[i] = initial
      return [slots[i], value => { slots[i] = value }]
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useEffect(effect) { if (!initialized) effects.push(effect) },
  }
  const modules = {
    '../../../components/ConfirmDialog.jsx': () => null,
    react: hooks, 'react/jsx-runtime': require('react/jsx-runtime'),
    '../../../context/AuthContext.jsx': { useAuth: () => ({}) },
    '../../../services/authorityCasesBoundary.js': { AUTHORITY_CASES_RUNTIME_MODE: 'cloud_test', transitionAuthorityCase: send, authorityErrorMessage: e => e.code },
    '../../../services/consumerAuthorityPolicy.js': policy, '../../../services/authorityTransitionClient.js': transitions,
  }
  const module = { exports: {} }
  new Function('module', 'exports', 'require', 'window', code)(module, module.exports, id => modules[id] || {}, { sessionStorage: storage })
  function render(row) {
    cursor = 0
    const element = module.exports.default({ record: row, user, lguView: true })
    initialized = true
    return element
  }
  render(record)
  for (const effect of effects) cleanups.push(effect())
  return { render, unmount() { for (const cleanup of cleanups) cleanup?.() } }
}

function retryButton(element) {
  if (!element?.props) return
  if (element.type === 'button' && element.props.children === 'Retry same action') return element
  return [element.props.children].flat(Infinity).map(retryButton).find(Boolean)
}

for (const outcome of ['accepted', 'lost', 'replacement']) {
  test('retained resolution across case remount: ' + outcome, async () => {
    const values = new Map()
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
    const journal = transitions.transitionJournal(storage, 'cloud_test:synthetic:' + record.caseId)
    const command = transitions.createCaseCommand(record, 'resolve')
    journal.save(command)
    const http = Promise.withResolvers()
    const dispatched = Promise.withResolvers()
    const send = transitions.createAuthorityTransitionClient({
      mode: 'cloud_test', endpoint: transitions.CLOUD_TRANSITION_ENDPOINT, getAuthSession: () => user,
      getAuthToken: async () => 'auth', getAppCheckToken: async () => 'app',
      fetchImpl: async (_, options) => { assert.deepEqual(JSON.parse(options.body).data, command); dispatched.resolve(); return http.promise },
    })
    const first = mount(storage, send)
    const pending = retryButton(first.render(record)).props.onClick()
    await dispatched.promise
    first.unmount()
    const retained = outcome === 'replacement' ? transitions.createCaseCommand(record, 'resolve') : command
    journal.save(retained)
    const next = mount(storage, send)
    const resolved = { ...record, status: 'resolved', version: 5 }
    try {
      assert.ok(retryButton(next.render(resolved)))
      if (outcome === 'lost') http.reject(new TypeError('response lost'))
      else http.resolve({ ok: true, status: 200, json: async () => ({ result: { schemaVersion: '1.0', outcome: 'accepted', caseId: record.caseId, status: 'resolved', version: 5 } }) })
      await pending
      assert.deepEqual(journal.read(), outcome === 'accepted' ? null : retained)
      assert.equal(Boolean(retryButton(next.render(resolved))), outcome !== 'accepted')
    } finally { next.unmount() }
  })
}
