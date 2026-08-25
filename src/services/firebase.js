import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const runtimeEnv = import.meta.env || {}
const firebaseConfig = {
  apiKey: runtimeEnv.VITE_FIREBASE_API_KEY,
  authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: runtimeEnv.VITE_FIREBASE_APP_ID,
}

export const isFirebaseEnabled = runtimeEnv.VITE_USE_FIREBASE === 'true' && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
export const isAuthorityEmulatorEnabled = Boolean(runtimeEnv.DEV
  && runtimeEnv.VITE_AUTHORITY_CASES_EMULATOR === 'true'
  && firebaseConfig.projectId === 'frish-app2026'
  && isFirebaseEnabled)

const app = isFirebaseEnabled ? (getApps()[0] || initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functions = app ? getFunctions(app, 'asia-southeast1') : null

if (isAuthorityEmulatorEnabled && !globalThis.__FRISH_AUTHORITY_EMULATORS_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  globalThis.__FRISH_AUTHORITY_EMULATORS_CONNECTED__ = true
}
