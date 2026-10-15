// Only Consumer services may use the named emulator app. Never reconnect the
// primary cloud app or copy its authenticated user/credentials into this app.
export function createAuthorityFirebaseClient({ mode, firebaseEnabled, config, primary, sdk, connectedApps }) {
  if (!firebaseEnabled || mode === 'disabled') return { app: null, auth: null, db: null, storage: null, functions: null }
  if (mode === 'cloud_test') return primary
  if (mode !== 'emulator' || config.projectId !== 'frish-app2026') throw new Error('Invalid Consumer Firebase runtime.')
  const app = sdk.getApps().find(candidate => candidate.name === 'frish-consumer-authority-emulator')
    || sdk.initializeApp(config, 'frish-consumer-authority-emulator')
  const client = { app, auth: sdk.getAuth(app), db: sdk.getFirestore(app), storage: sdk.getStorage(app), functions: sdk.getFunctions(app, 'asia-southeast1') }
  if (!connectedApps.has(app)) {
    sdk.connectAuthEmulator(client.auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    sdk.connectFirestoreEmulator(client.db, '127.0.0.1', 8080)
    sdk.connectStorageEmulator(client.storage, '127.0.0.1', 9199)
    sdk.connectFunctionsEmulator(client.functions, '127.0.0.1', 5001)
    connectedApps.add(app)
  }
  return client
}
