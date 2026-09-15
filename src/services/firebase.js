import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const runtimeEnv = import.meta.env || {}
const firebaseConfig = {
  apiKey: runtimeEnv.VITE_FIREBASE_API_KEY,
  authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: runtimeEnv.VITE_FIREBASE_APP_ID,
}

export const isFirebaseEnabled = runtimeEnv.VITE_USE_FIREBASE === 'true'
  && firebaseConfig.projectId === 'frish-app2026'
  && Boolean(firebaseConfig.apiKey && firebaseConfig.appId)

// Consumer intake, authority cases, and evidence remain isolated until their
// cloud contract is explicitly enabled. The primary Admin client must continue
// to use cloud Firebase for the existing Inspector/Admin workflow.
export const isAuthorityEmulatorEnabled = false

const app = isFirebaseEnabled ? (getApps()[0] || initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functions = app ? getFunctions(app, 'asia-southeast1') : null
