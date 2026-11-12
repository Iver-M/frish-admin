import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const contractPath = path.join('contracts', 'shared-report-contract')
const local = path.resolve(import.meta.dirname, '..', contractPath)
const files = ['fixtures.json', 'validator.cjs']

function makePeer(t) {
  const parent = path.resolve(tmpdir())
  const prefix = 'frish-peer-'
  const root = mkdtempSync(path.join(parent, prefix))
  t.after(() => {
    const target = path.resolve(root)
    assert.equal(path.dirname(target), parent)
    assert.ok(path.basename(target).startsWith(prefix))
    rmSync(target, { recursive: true })
  })
  return root
}

function copyContract(root, names = files) {
  const directory = path.join(root, contractPath)
  mkdirSync(directory, { recursive: true })
  for (const name of names) copyFileSync(path.join(local, name), path.join(directory, name))
  return directory
}

function verify(root) {
  const run = spawnSync(process.execPath, [path.join(local, 'verify-peer-drift.cjs'), root], { encoding: 'utf8' })
  if (run.error) throw run.error
  return run
}

for (const layout of ['legacy', 'compact', 'explicit shared directory']) {
  test(`verifies both peer files using the ${layout} layout`, (t) => {
    const root = makePeer(t)
    const shared = path.join(root, 'shared')
    copyContract(layout === 'legacy' ? root : shared)
    const { status, stdout, stderr } = verify(layout === 'explicit shared directory' ? shared : root)
    assert.equal(status, 0, stderr)
    assert.match(stdout.trim(), /^CONTRACT_DRIFT_PASS=fixtures\.json:[a-f0-9]{64}\r?\nCONTRACT_DRIFT_PASS=validator\.cjs:[a-f0-9]{64}$/)
  })
}

test('rejects a peer with the contract files split across layouts', (t) => {
  const root = makePeer(t)
  copyContract(root, ['fixtures.json'])
  copyContract(path.join(root, 'shared'), ['validator.cjs'])
  const { status, stdout } = verify(root)
  assert.equal(status, 1)
  assert.equal(stdout, '')
})

test('rejects two complete peer contracts even when their bytes match', (t) => {
  const root = makePeer(t)
  copyContract(root)
  copyContract(path.join(root, 'shared'))
  const { status, stdout } = verify(root)
  assert.equal(status, 1)
  assert.equal(stdout, '')
})

for (const file of files) {
  test(`rejects byte drift in ${file}`, (t) => {
    const root = makePeer(t)
    const directory = copyContract(root)
    appendFileSync(path.join(directory, file), '\n')
    const { status, stderr } = verify(root)
    assert.equal(status, 1)
    assert.ok(stderr.includes(`${file} drift detected`), stderr)
  })
}
