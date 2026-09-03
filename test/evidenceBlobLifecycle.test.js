import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createEvidenceBlobLifecycle } from '../src/services/evidenceBlobLifecycle.js'

const viewerSource = await readFile(new URL('../src/pages/admin/authority-cases/AuthorityEvidenceViewer.jsx', import.meta.url), 'utf8')

test('Blob lifecycle replaces and revokes every temporary URL without persistence', () => {
  const created = []
  const revoked = []
  const lifecycle = createEvidenceBlobLifecycle({
    createObjectURL: () => `blob:temporary-${created.push(true)}`,
    revokeObjectURL: (url) => revoked.push(url),
  })
  assert.equal(lifecycle.replace(new Blob(['eyes'])), 'blob:temporary-1')
  assert.equal(lifecycle.replace(new Blob(['gills'])), 'blob:temporary-2')
  assert.deepEqual(revoked, ['blob:temporary-1'])
  assert.equal(lifecycle.clear(), true)
  assert.deepEqual(revoked, ['blob:temporary-1', 'blob:temporary-2'])
  assert.equal(lifecycle.clear(), false)
})

test('failed or cancelled requests cannot create an object URL in the lifecycle', () => {
  let creations = 0
  const lifecycle = createEvidenceBlobLifecycle({
    createObjectURL: () => { creations += 1; return 'blob:unexpected' },
    revokeObjectURL: () => {},
  })
  lifecycle.clear()
  assert.equal(creations, 0)
})

test('viewer source enforces cleanup, cancellation, temporary display, and no persistence or download', () => {
  assert.match(viewerSource, /URL is controlled by createEvidenceBlobLifecycle|createEvidenceBlobLifecycle/)
  assert.match(viewerSource, /controller\.current\?\.abort\(\)/)
  assert.match(viewerSource, /lifecycle\.current\.clear\(\)/)
  assert.match(viewerSource, /record\.caseId,/)
  assert.match(viewerSource, /record\.status,/)
  assert.match(viewerSource, /user\?\.accountStatus,/)
  assert.match(viewerSource, /user\?\.role,/)
  assert.match(viewerSource, /user\?\.uid,/)
  assert.match(viewerSource, /<img src=\{objectUrl\}/)
  assert.doesNotMatch(viewerSource, /localStorage|sessionStorage|indexedDB|download=|getDownloadURL|storagePath|Base64/)
})
