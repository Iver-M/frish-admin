import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { test } from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => readFile(path.join(root, relative), 'utf8')
const [app, layout, sidebar, firebase, auth, feedback, environment] = await Promise.all([
  read('src/App.jsx'), read('src/layout/AdminLayout.jsx'), read('src/components/Sidebar.jsx'),
  read('src/services/firebase.js'), read('src/services/authService.js'),
  read('src/services/consumerFeedbackInbox.js'), read('src/services/feedbackEnvironment.js'),
])

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(target) : /\.(js|jsx)$/.test(entry.name) ? [target] : []
  }))
  return nested.flat()
}

test('original Admin routes and role-based sidebar remain available in online feedback mode', () => {
  for (const route of ['/dashboard', '/assessments', '/reports', '/inspectors', '/audit-trail', '/admins', '/profile', '/notifications']) {
    assert.match(app, new RegExp(`path=["']${route.replace('/', '\\/')}`))
  }
  for (const label of ['Dashboard', 'Freshness Assessments', 'Reports', 'Inspectors', 'Audit Trail', 'Manage Admins', 'Profile']) {
    assert.match(sidebar, new RegExp(`label: '${label}'`))
  }
  assert.doesNotMatch(sidebar, /FEEDBACK_MODE.*item\.to === '\/feedback'/)
  assert.doesNotMatch(layout, /location\.pathname !== '\/feedback'/)
  assert.doesNotMatch(layout, /Navigate to="\/feedback"/)
  assert.equal((sidebar.match(/label: 'User Feedback'/g) || []).length, 1)
})

test('feedback authorization stays route-specific and original sign-out and role gates remain', () => {
  assert.match(layout, /'\/feedback': \['bfar_admin'\]/)
  assert.match(sidebar, /to: '\/feedback'.*roles: \['bfar_admin'\]/)
  assert.match(layout, /if \(!user\).*Navigate to="\/"/s)
  assert.match(layout, /allowedRoles.*!allowedRoles\.includes\(user\.role\)/s)
  assert.match(sidebar, /onClick=\{onLogout\}/)
  assert.match(auth, /feedbackOnlineTest: onlineToken\?\.claims\.feedbackOnlineTest \|\| null/)
  assert.match(feedback, /feedbackOnlineTest !== 'consumer-feedback-v1'/)
})

test('online mode keeps Firebase and legacy Firestore pages without enabling Storage or authority modules', () => {
  assert.match(firebase, /export const db = app \? getFirestore\(app\) : null/)
  assert.match(firebase, /export const storage = app && FEEDBACK_MODE === 'emulator' \? getStorage\(app\) : null/)
  assert.match(environment, /PRODUCTION_FIREBASE_APPROVED = false/)
  assert.match(sidebar, /AUTHORITY_CASES_RUNTIME_ENABLED \? \[/)
})

test('only the feedback module invokes the feedback callable and never accesses Firestore or Storage directly', async () => {
  assert.match(feedback, /httpsCallable\(functions, 'listConsumerFeedback'\)/)
  assert.doesNotMatch(feedback, /firebase\/(firestore|storage)/)
  assert.doesNotMatch(feedback, /collection\(|getDocs\(|onSnapshot\(|getStorage\(|uploadBytes\(/)
  const files = await sourceFiles(path.join(root, 'src'))
  const offenders = []
  for (const file of files) {
    const relative = path.relative(root, file).replaceAll('\\', '/')
    if (relative === 'src/services/consumerFeedbackInbox.js' || relative === 'src/pages/admin/feedback/Feedback.jsx') continue
    if ((await readFile(file, 'utf8')).includes('listConsumerFeedback')) offenders.push(relative)
  }
  assert.deepEqual(offenders, [])
})
