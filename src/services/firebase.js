import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { evaluateConsumerRuntime } from './consumerAuthorityPolicy.js'

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
export const consumerRuntime = evaluateConsumerRuntime(runtimeEnv)
export const isAuthorityEmulatorEnabled = consumerRuntime.mode === 'emulator'
export const isAuthorityCloudTestEnabled = consumerRuntime.mode === 'cloud_test'
export const isConsumerFeedbackOnlineTestEnabled = Boolean(
  runtimeEnv.VITE_CONSUMER_FEEDBACK_MODE === 'online_test'
  && firebaseConfig.projectId === 'frish-app2026'
  && isFirebaseEnabled,
)
export const authorityRuntimeMode = isAuthorityEmulatorEnabled
  ? 'emulator'
  : isAuthorityCloudTestEnabled
    ? 'cloud_test'
    : 'disabled'

const app = isFirebaseEnabled ? (getApps()[0] || initializeApp(firebaseConfig)) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
export const functions = app ? getFunctions(app, 'asia-southeast1') : null
// This explicit opt-in uses a real configured provider. No debug token,
// synthetic credential, or automatic claim/account provisioning is supplied.
let authorityAppCheck = null
export async function getAuthorityAppCheckToken() {
  if (!app || !isAuthorityCloudTestEnabled || !runtimeEnv.VITE_AUTHORITY_APP_CHECK_SITE_KEY || typeof window === 'undefined') return null
  // A bad optional App Check configuration must not prevent Inspector login.
  authorityAppCheck ||= initializeAppCheck(app, { provider: new ReCaptchaV3Provider(runtimeEnv.VITE_AUTHORITY_APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true })
  return (await getToken(authorityAppCheck, false)).token
}

if (isAuthorityEmulatorEnabled && !globalThis.__FRISH_AUTHORITY_EMULATORS_CONNECTED__) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
  globalThis.__FRISH_AUTHORITY_EMULATORS_CONNECTED__ = true
}
