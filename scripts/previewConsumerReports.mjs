// Local synthetic UI review. Does not initialize Firebase or load .env files.
// Run: node scripts/previewConsumerReports.mjs, then open http://127.0.0.1:5176
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = '/scripts/fixtures/consumerAuthorityPreview.js'
const server = await createServer({ root, configFile: false, envFile: false, plugins: [react(), {
  name: 'synthetic-consumer-review',
  enforce: 'pre',
  load(id) {
    const file = id.replaceAll('\\', '/')
    if (file.endsWith('/src/services/authorityCasesBoundary.js')) return `export * from '${fixture}'`
    if (file.endsWith('/src/context/AuthContext.jsx')) return `export { useAuth } from '${fixture}'`
    if (file.endsWith('/src/services/firestoreService.js')) return `export { listActiveInspectors } from '${fixture}'`
    if (file.endsWith('/src/services/firebase.js')) return 'export const auth = null; export const isAuthorityEmulatorEnabled = false; export const isFirebaseEnabled = false;'
    if (file.endsWith('/src/services/authorityFirebase.js')) return 'export const auth = null; export const isAuthorityEmulatorEnabled = false;'
  },
  configureServer(instance) {
    instance.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/' && req.url?.split('?')[0] !== '/reports') return next()
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Consumer report review</title></head><body><div id="root"></div><script type="module" src="/scripts/fixtures/consumerAuthorityPreviewEntry.jsx"></script></body></html>`
      res.setHeader('Content-Type', 'text/html'); res.end(await instance.transformIndexHtml(req.url, html))
    })
  },
}], server: { host: '127.0.0.1', port: 5176, strictPort: true } })
await server.listen()
console.log('Synthetic review only: http://127.0.0.1:5176 (scenario=disabled|error|empty|unauthorized|lost|lgu)')
