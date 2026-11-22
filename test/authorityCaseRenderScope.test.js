import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import { transformWithEsbuild } from 'vite'

const dependencies = `data:text/javascript,${encodeURIComponent(`
  export const state = { user: null, path: '/authority-cases', params: {} }
  export const useAuth = () => ({
    user: state.user,
    isBfarAdmin: state.user?.role === 'bfar_admin',
    isMarketAdmin: state.user?.role === 'market_admin',
    authLoading: state.authLoading,
    switchingSession: state.switchingSession,
  })
  export const useLocation = () => ({ pathname: state.path, search: state.search || '' })
  export const useParams = () => state.params
  export const useNavigate = () => () => {}
  export const useState = value => [value, () => {}]
  export const useEffect = () => {}
  export const useContext = () => null
  export const createContext = () => ({ Provider: 'test-context' })
  export const createPortal = () => null
  export const AUTHORITY_CASES_IS_CLOUD = true, AUTHORITY_CASES_RUNTIME_ENABLED = true
  export const FEEDBACK_MODE = 'disabled', AUTHORITY_RUNTIME_MESSAGE = ''
  export const subscribeAuthorityCase = null, subscribeAuthorityCases = null
  export const authorityErrorMessage = null, formatConsumerDate = null
  export const usesLguCaseView = user => user?.role === 'market_admin' || user?.consumerPermissions?.role === 'lgu'
  export const isLguCaseRef = caseId => caseId === '409e4cc1-396b-4f3a-bffa-247aa1e4a956'
  export const isAuthorityCaseRefForUser = isLguCaseRef
  export const Link = 'a', Outlet = 'test-route', Navigate = 'test-redirect'
  export default 'test-component'
`)}`

async function loadView(relativePath) {
  const target = new URL(relativePath, import.meta.url)
  const code = await readFile(target, 'utf8')
  const { code: source } = await transformWithEsbuild(code, target.pathname, { jsx: 'automatic' })
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === target.href && specifier !== 'react/jsx-runtime') {
        return { url: dependencies, shortCircuit: true }
      }
      return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
      if (url === target.href) return { format: 'module', source, shortCircuit: true }
      return nextLoad(url, context)
    },
  })
  try {
    return (await import(target.href)).default
  } finally {
    hooks.deregister()
  }
}

const { state } = await import(dependencies)
const bfar = { uid: 'staff-1', role: 'bfar_admin', consumerPermissions: { role: 'bfar_admin', cases: true } }

test('signed-in layout gives Topbar and routed views fresh state when authorization changes', async () => {
  const layout = await loadView('../src/layout/AdminLayout.jsx')
  const renderKey = user => {
    state.user = user
    return layout().props.children.key
  }
  const bfarKey = renderKey(bfar)
  assert.equal(renderKey({ ...bfar }), bfarKey)
  assert.notEqual(renderKey({ ...bfar, role: 'market_admin' }), bfarKey)
  assert.notEqual(renderKey({ ...bfar, uid: 'staff-2' }), bfarKey)
  assert.notEqual(renderKey({ ...bfar, consumerPermissions: { role: null, cases: false } }), bfarKey)
})

test('LGU replaces open legacy Consumer case URLs before rendering the signed-in layout', async () => {
  const layout = await loadView('../src/layout/AdminLayout.jsx')
  const rawId = 'case_report_consumer-1_scan-1_v1'
  const lgu = { uid: 'staff-2', role: 'market_admin', marketId: 'pasig', consumerPermissions: { role: 'lgu', cases: true } }
  for (const [path, search] of [
    ['/authority-cases/' + rawId, ''],
    ['/Authority-Cases/' + rawId, ''],
    ['/Reports', '?view=consumer-cases&caseId=' + rawId],
    ['/reports', '?view=consumer-cases&caseId=' + rawId],
    ['/reports', '?view=consumer-cases&caseId=409e4cc1-396b-4f3a-bffa-247aa1e4a956&caseId=' + rawId],
  ]) {
    Object.assign(state, { path, search, user: bfar })
    assert.notEqual(layout().type, 'test-redirect')
    Object.assign(state, { user: null, authLoading: true, switchingSession: true })
    assert.deepEqual(layout().props, { to: '/reports?view=consumer-cases', replace: true })
    Object.assign(state, { user: lgu, authLoading: false, switchingSession: false })
    const result = layout()
    assert.equal(result.type, 'test-redirect')
    assert.deepEqual(result.props, { to: '/reports?view=consumer-cases', replace: true })
  }
  state.search = '?view=consumer-cases&caseId=409e4cc1-396b-4f3a-bffa-247aa1e4a956'
  assert.notEqual(layout().type, 'test-redirect')
  state.search = ''
  Object.assign(state, { path: '/audit-trail', user: bfar })
  assert.notEqual(layout().type, 'test-redirect')
  state.user = { ...bfar, consumerPermissions: lgu.consumerPermissions }
  assert.deepEqual(layout().props, { to: '/dashboard', replace: true })
  state.path = '/Audit-Trail/'
  assert.deepEqual(layout().props, { to: '/dashboard', replace: true })
})

test('authority case navigation gives each list and detail its own state', async () => {
  const authorityCases = await loadView('../src/pages/admin/authority-cases/AuthorityCases.jsx')
  state.user = bfar
  state.params = {}
  const listKey = authorityCases({ embedded: true }).key
  const embeddedDetailKey = authorityCases({ embedded: true, selectedCaseId: 'case-one' }).key
  state.params = { caseId: 'case-two' }
  const routedDetailKey = authorityCases({}).key
  assert.notEqual(embeddedDetailKey, listKey)
  assert.notEqual(routedDetailKey, embeddedDetailKey)
})

test('the auth observer clears BFAR while LGU verification is pending and ignores a late BFAR result', async () => {
  const target = new URL('../src/services/authService.js', import.meta.url)
  const firebase = `data:text/javascript,${encodeURIComponent(`
    export const state = { profiles: new Map() }, auth = {}, db = {}, isFirebaseEnabled = true
    export const authorityRuntimeMode = 'cloud_test'
    export const FEEDBACK_MODE = 'disabled'
    export const consumerPermissions = claims => ({ role: claims.role, cases: Boolean(claims.role) })
    export const onIdTokenChanged = (_, listener) => { state.listener = listener; return () => {} }
    export const onAuthStateChanged = null
    export const getIdTokenResult = async user => ({ claims: { role: user.claimRole, firebase: { sign_in_provider: 'password' } } })
    export const doc = (_, collection, uid) => uid
    export const getDoc = async uid => {
      const profile = await state.profiles.get(uid)
      return { exists: () => true, data: () => profile }
    }
    export class GoogleAuthProvider { setCustomParameters() {} }
    export const EmailAuthProvider = null, reauthenticateWithCredential = null, signInWithEmailAndPassword = null
    export const signInWithPopup = null, signOut = null, updatePassword = null
  `)}`
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === target.href) return { url: firebase, shortCircuit: true }
      return nextResolve(specifier, context)
    },
  })
  let observe
  try { ({ observeAdminSession: observe } = await import(target.href)) }
  finally { hooks.deregister() }
  const { state: session, auth } = await import(firebase)
  const updates = []
  const unsubscribe = observe((profile, loading = false) => updates.push([profile?.role || null, loading]))
  const bfarUser = { uid: 'staff-bfar', metadata: {}, claimRole: 'bfar_admin' }
  const lguUser = { uid: 'staff-lgu', metadata: {}, claimRole: 'lgu' }
  const emit = user => { auth.currentUser = user; return session.listener(user) }
  session.profiles.set(bfarUser.uid, { role: 'bfar_admin' })
  session.profiles.set(lguUser.uid, { role: 'market_admin', marketId: 'pasig' })
  await emit(bfarUser)
  await emit(bfarUser) // A token refresh with unchanged permissions keeps the current view.
  const delayed = Promise.withResolvers()
  session.profiles.set(lguUser.uid, delayed.promise)
  const next = emit(lguUser)
  assert.deepEqual(updates, [['bfar_admin', false], [null, true]])
  delayed.resolve({ role: 'market_admin', marketId: 'pasig' })
  await next
  assert.deepEqual(updates.at(-1), ['market_admin', false])

  await emit(bfarUser)
  const stale = Promise.withResolvers()
  session.profiles.set(bfarUser.uid, stale.promise)
  const earlier = emit({ ...bfarUser, claimRole: 'lgu' })
  await Promise.resolve()
  assert.deepEqual(updates.at(-1), [null, true])
  await emit(lguUser)
  stale.resolve({ role: 'bfar_admin' })
  await earlier
  assert.deepEqual(updates.at(-1), ['market_admin', false])
  unsubscribe()
})
