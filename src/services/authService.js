import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getIdTokenResult,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, isAuthorityEmulatorEnabled, isFirebaseEnabled } from './firebase.js'

const AUTH_ERROR_MESSAGES = {
  'auth/invalid-credential': 'The email or password is incorrect. Check your details and try again.',
  'auth/user-not-found': 'The email or password is incorrect. Check your details and try again.',
  'auth/wrong-password': 'The email or password is incorrect. Check your details and try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been disabled. Contact BFAR-NCR for assistance.',
  'auth/too-many-requests': 'Too many unsuccessful attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Unable to connect to the sign-in service. Check your internet connection and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the Firebase project. Contact the system administrator.',
  'auth/popup-closed-by-user': 'Google Sign-In was cancelled before it finished.',
  'auth/cancelled-popup-request': 'Another Google Sign-In request is already open.',
  'auth/popup-blocked': 'The browser blocked the Google Sign-In window. Allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'This website is not authorized in Firebase Authentication. Add its domain in the Firebase console.',
  'auth/account-exists-with-different-credential': 'This email is already registered with another sign-in method. Ask the system administrator to link the Google account.',
  'auth/requires-recent-login': 'For security, sign out and sign in again before changing your password.',
  'auth/weak-password': 'Use a stronger password with at least eight characters.',
  'auth/internal-error': 'The sign-in service is temporarily unavailable. Please try again.',
  'firestore/permission-denied': 'We could not verify this account’s administrator access. Contact the system administrator.',
  'permission-denied': 'We could not verify this account’s administrator access. Contact the system administrator.',
  'firestore/unavailable': 'The account service is temporarily unavailable. Please try again.',
  unavailable: 'The account service is temporarily unavailable. Please try again.',
}

const PROFILE_ERROR_MESSAGES = new Set([
  'This account has no FRISH user profile.',
  'This account is not authorized for the admin portal.',
  'Use a verified Google account to access the FRISH Admin Portal.',
  'This sign-in method is not supported for administrator access.',
  'This account has been suspended. Contact BFAR-NCR.',
  'This admin account is inactive. Contact BFAR-NCR.',
  'This LGU account is not assigned to Pasig Public Market.',
])

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/** Converts Firebase errors into safe, actionable messages for administrators. */
export function getFriendlyAuthErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  if (AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code]
  if (PROFILE_ERROR_MESSAGES.has(error?.message)) return error.message
  return 'Unable to sign in right now. Please try again.'
}

export async function signInAdminWithGoogle() {
  if (!isFirebaseEnabled) {
    throw new Error('Firebase is not configured. Add the Firebase Web App values to .env.local and restart the portal.')
  }

  let credential = null
  try {
    credential = await signInWithPopup(auth, googleProvider)
    return await getAdminProfile(credential.user)
  } catch (error) {
    // Google authentication may succeed while the Firestore allowlist check
    // fails. Clear the partial session before returning to the login screen.
    if (credential?.user || auth.currentUser) await signOut(auth).catch(() => {})
    throw new Error(getFriendlyAuthErrorMessage(error))
  }
}

export async function signInAdminWithCredentials(email, password) {
  if (!isFirebaseEnabled) {
    throw new Error('Firebase is not configured. Add the Firebase Web App values to .env.local and restart the portal.')
  }

  let credential = null
  try {
    credential = await signInWithEmailAndPassword(auth, email, password)
    return await getAdminProfile(credential.user)
  } catch (error) {
    if (credential?.user || auth.currentUser) await signOut(auth).catch(() => {})
    throw new Error(getFriendlyAuthErrorMessage(error))
  }
}

export async function getAdminProfile(firebaseUser) {
  // The authority emulator relies on freshly issued custom claims. Normal
  // Firebase sessions continue to use the Firestore profile as the role source.
  const token = await getIdTokenResult(firebaseUser, isAuthorityEmulatorEnabled)
  const provider = token.claims.firebase?.sign_in_provider
  if (!['google.com', 'password'].includes(provider)) {
    throw new Error('This sign-in method is not supported for administrator access.')
  }
  if (provider === 'google.com' && !firebaseUser.emailVerified) {
    throw new Error('Use a verified Google account to access the FRISH Admin Portal.')
  }

  const profileSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid))
  if (!profileSnapshot.exists()) throw new Error('This account has no FRISH user profile.')

  const profile = profileSnapshot.data()
  const role = isAuthorityEmulatorEnabled ? token.claims.role : profile.role
  const accountStatus = String(
    isAuthorityEmulatorEnabled
      ? token.claims.accountStatus
      : (profile.accountStatus || profile.status || 'active'),
  ).toLowerCase()
  const marketId = isAuthorityEmulatorEnabled
    ? (token.claims.marketId || profile.marketId || null)
    : (profile.marketId || null)

  if (!['bfar_admin', 'market_admin'].includes(role)) {
    throw new Error('This account is not authorized for the admin portal.')
  }
  if (accountStatus === 'suspended') {
    throw new Error('This account has been suspended. Contact BFAR-NCR.')
  }
  if (['inactive', 'disabled'].includes(accountStatus)) {
    throw new Error('This admin account is inactive. Contact BFAR-NCR.')
  }
  if (role === 'market_admin' && marketId !== 'pasig') {
    throw new Error('This LGU account is not assigned to Pasig Public Market.')
  }

  const authorization = { role, accountStatus, marketId }

  return {
    uid: firebaseUser.uid,
    name: profile.name || firebaseUser.displayName || firebaseUser.email,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL || null,
    phone: profile.phone || '',
    department: profile.department || defaultDepartment(role),
    createdAt: profile.createdAt || firebaseUser.metadata.creationTime || null,
    lastLoginAt: firebaseUser.metadata.lastSignInTime || null,
    authProvider: provider,
    ...authorization,
    marketName: profile.marketName || null,
  }
}

export async function refreshAdminSession() {
  if (!isFirebaseEnabled || !auth.currentUser) return null
  return getAdminProfile(auth.currentUser)
}

export async function changeAdminPassword(currentPassword, newPassword) {
  if (!isFirebaseEnabled || !auth.currentUser?.email) {
    throw new Error('Your authenticated account could not be loaded. Sign in again and retry.')
  }

  const supportsPassword = auth.currentUser.providerData?.some((provider) => provider.providerId === 'password')
  if (!supportsPassword) {
    throw new Error('This account uses Google Sign-In. Manage its password through your Google account.')
  }

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updatePassword(auth.currentUser, newPassword)
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error))
  }
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
      console.error('Unable to load the FRISH administrator profile.', error)
      await signOut(auth).catch(() => {})
      callback(null)
    }
  })
}

export function signOutAdmin() {
  return isFirebaseEnabled ? signOut(auth) : Promise.resolve()
}

function defaultDepartment(role) {
  return role === 'market_admin'
    ? 'Pasig City Market Administration Office'
    : 'Bureau of Fisheries and Aquatic Resources (BFAR)'
}
