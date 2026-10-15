import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, initializeAuth, inMemoryPersistence } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { auth as primaryAuth, db as primaryDb, storage as primaryStorage, functions as primaryFunctions, isFirebaseEnabled } from './firebase.js'
import { evaluateConsumerRuntime } from './consumerAuthorityPolicy.js'
import { createAuthorityFirebaseClient } from './authorityFirebaseClient.js'

const runtimeEnv = import.meta.env || {}
export const consumerRuntime = evaluateConsumerRuntime(runtimeEnv)
export const authorityRuntimeMode = consumerRuntime.mode
export const isAuthorityEmulatorEnabled = authorityRuntimeMode === 'emulator'
export const isAuthorityCloudTestEnabled = authorityRuntimeMode === 'cloud_test'
const config = { apiKey: runtimeEnv.VITE_FIREBASE_API_KEY, authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID, storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: runtimeEnv.VITE_FIREBASE_APP_ID }
const connectedApps = globalThis.__FRISH_CONSUMER_AUTHORITY_EMULATOR_APPS__ ||= new WeakSet()
const client = createAuthorityFirebaseClient({ mode: authorityRuntimeMode, firebaseEnabled: isFirebaseEnabled, config,
  primary: { app: primaryAuth?.app, auth: primaryAuth, db: primaryDb, storage: primaryStorage, functions: primaryFunctions }, connectedApps,
  sdk: { getApps, initializeApp, getAuth: app => initializeAuth(app, { persistence: inMemoryPersistence }), getFirestore, getStorage, getFunctions,
    connectAuthEmulator, connectFirestoreEmulator, connectStorageEmulator, connectFunctionsEmulator } })
export const { auth, db, storage, functions } = client
let authorityAppCheck = null
export async function getAuthorityAppCheckToken() {
  if (!client.app || !isAuthorityCloudTestEnabled || !runtimeEnv.VITE_AUTHORITY_APP_CHECK_SITE_KEY || typeof window === 'undefined') return null
  // Optional App Check configuration never runs during Inspector/Admin startup.
  authorityAppCheck ||= initializeAppCheck(client.app, { provider: new ReCaptchaV3Provider(runtimeEnv.VITE_AUTHORITY_APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true })
  return (await getToken(authorityAppCheck, false)).token
}
