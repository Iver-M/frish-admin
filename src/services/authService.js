import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, isFirebaseEnabled } from './firebase.js'

const AUTH_ERROR_MESSAGES = {
  'auth/invalid-credential': 'The email or password is incorrect. Please check your details and try again.',
  'auth/user-not-found': 'The email or password is incorrect. Please check your details and try again.',
  'auth/wrong-password': 'The email or password is incorrect. Please check your details and try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been disabled. Contact BFAR-NCR for assistance.',
  'auth/too-many-requests': 'Too many unsuccessful attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed': 'Unable to connect. Check your internet connection and try again.',
  'auth/operation-not-allowed': 'Email and password sign-in is not available. Contact the system administrator.',
  'auth/internal-error': 'The sign-in service is temporarily unavailable. Please try again.',
  'firestore/permission-denied': 'We could not verify this account\'s admin access. Contact the system administrator.',
  'permission-denied': 'We could not verify this account\'s admin access. Contact the system administrator.',
  'firestore/unavailable': 'The account service is temporarily unavailable. Please try again.',
  unavailable: 'The account service is temporarily unavailable. Please try again.',
}

const PROFILE_ERROR_MESSAGES = new Set([
  'This account has no FRISH user profile.',
  'This account is not authorized for the admin portal.',
  'This account has been suspended. Contact BFAR-NCR.',
  'This admin account is inactive. Contact BFAR-NCR.',
])

/**
 * Converts Firebase/Auth and Firestore errors into safe, actionable messages.
 * Unknown backend details are intentionally not exposed on the login screen.
 */
export function getFriendlyAuthErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  if (PROFILE_ERROR_MESSAGES.has(error?.message)) return error.message
  return 'Unable to sign in right now. Please try again.'
}

export async function signInAdmin(email, password) {
  if (!isFirebaseEnabled) throw new Error('The sign-in service is not configured. Contact the system administrator.')

  let credential = null
  try {
    credential = await signInWithEmailAndPassword(auth, email, password)
    return await getAdminProfile(credential.user)
  } catch (error) {
    // Firebase Auth may succeed even when the Firestore profile is missing or
    // unauthorized. Clear that partial session before returning to the form.
    if (credential?.user) await signOut(auth).catch(() => {})
    throw new Error(getFriendlyAuthErrorMessage(error))
  }
}

export async function getAdminProfile(firebaseUser) {
  const profileSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid))
  if (!profileSnapshot.exists()) throw new Error('This account has no FRISH user profile.')
  const profile = profileSnapshot.data()
  if (!['bfar_admin', 'market_admin'].includes(profile.role)) throw new Error('This account is not authorized for the admin portal.')
  const accountStatus = String(profile.accountStatus || profile.status || 'active').toLowerCase()
  if (accountStatus === 'suspended') throw new Error('This account has been suspended. Contact BFAR-NCR.')
  if (['inactive', 'disabled'].includes(accountStatus)) throw new Error('This admin account is inactive. Contact BFAR-NCR.')
  return { uid: firebaseUser.uid, name: profile.name || firebaseUser.displayName || firebaseUser.email, email: firebaseUser.email, role: profile.role, marketId: profile.marketId || null, marketName: profile.marketName || null }
}

export function observeAdminSession(callback) {
  if (!isFirebaseEnabled) return () => {}
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null)
      return
    }

    try {
      callback(await getAdminProfile(firebaseUser))
    } catch (error) {
      console.error('Unable to load the FRISH admin profile.', error)
      void signOut(auth).catch(() => {})
      callback(null)
    }
  })
}

export function signOutAdmin() { return isFirebaseEnabled ? signOut(auth) : Promise.resolve() }
