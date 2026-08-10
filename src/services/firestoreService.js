import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseEnabled } from './firebase.js'

function requireFirebase() { if (!isFirebaseEnabled) throw new Error('Firebase is not configured.') }

export async function listMarketRecords(collectionName, user, options = {}) {
  requireFirebase()
  const constraints = []
  // Reports from older/mobile builds may not have a top-level marketId yet.
  // Load them for the LGU and let the report UI filter normalized workflow
  // statuses so forwarded cases are not silently excluded by Firestore.
  if (user.role === 'market_admin' && collectionName !== 'reports') {
    constraints.push(where('marketId', '==', user.marketId))
  }
  if (options.orderBy) constraints.push(orderBy(options.orderBy, options.direction || 'desc'))
  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints))
  return snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
}

export function subscribeMarketRecords(collectionName, user, callback, onError = console.error) {
  requireFirebase()
  const constraints = []
  // Keep report subscriptions compatible with nested Inspector submissions
  // that are forwarded before canonical market fields are written.
  if (user.role === 'market_admin' && collectionName !== 'reports') {
    constraints.push(where('marketId', '==', user.marketId))
  }
  return onSnapshot(
    query(collection(db, collectionName), ...constraints),
    (snapshot) => callback(snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))),
    onError,
  )
}

export function subscribeRecord(collectionName, id, callback, onError = console.error) {
  requireFirebase()
  return onSnapshot(doc(db, collectionName, id), (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null), onError)
}

export async function listActiveInspectors() {
  requireFirebase()
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'inspector')))
  return snapshot.docs
    .map((record) => ({ id: record.id, ...record.data() }))
    .filter((inspector) => inspector.accountStatus === 'active')
    .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
}

export function subscribeInspectorProfiles(callback, onError = console.error) {
  requireFirebase()
  return onSnapshot(
    query(collection(db, 'users'), where('role', '==', 'inspector')),
    (snapshot) => callback(
      snapshot.docs
        .map((record) => ({ id: record.id, ...record.data() }))
        .sort((a, b) => (a.name || a.displayName || a.email || '').localeCompare(
          b.name || b.displayName || b.email || '',
        )),
    ),
    onError,
  )
}

export function subscribeAdminProfiles(callback, onError = console.error) {
  requireFirebase()
  return onSnapshot(
    query(collection(db, 'users'), where('role', 'in', ['bfar_admin', 'market_admin'])),
    (snapshot) => callback(
      snapshot.docs
        .map((record) => ({ id: record.id, ...record.data() }))
        .sort((a, b) => (a.name || a.displayName || a.email || '').localeCompare(
          b.name || b.displayName || b.email || '',
        )),
    ),
    onError,
  )
}

export async function createAdminProfile(uid, data, auditLog = null) {
  requireFirebase()
  const normalizedUid = normalizeInspectorUid(uid)
  const userRef = doc(db, 'users', normalizedUid)
  const auditRef = auditLog ? doc(collection(db, 'auditLogs')) : null

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(userRef)
    if (existing.exists()) {
      const error = new Error('An administrator profile already exists for this Authentication UID.')
      error.code = 'already-exists'
      throw error
    }

    transaction.set(userRef, {
      ...data,
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    if (auditRef) transaction.set(auditRef, auditLogPayload(auditLog))
  })
}

export async function updateAdminProfile(uid, data, auditLog = null) {
  requireFirebase()
  const normalizedUid = normalizeInspectorUid(uid)
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', normalizedUid), { ...data, updatedAt: serverTimestamp() })
  if (auditLog) batch.set(doc(collection(db, 'auditLogs')), auditLogPayload(auditLog))
  return batch.commit()
}

export async function createInspectorProfile(uid, data, auditLog = null) {
  requireFirebase()
  const normalizedUid = normalizeInspectorUid(uid)
  const userRef = doc(db, 'users', normalizedUid)
  const auditRef = auditLog ? doc(collection(db, 'auditLogs')) : null

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(userRef)
    if (existing.exists()) {
      const error = new Error('An inspector profile already exists for this Authentication UID.')
      error.code = 'already-exists'
      throw error
    }

    transaction.set(userRef, {
      ...data,
      role: 'inspector',
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    if (auditRef) transaction.set(auditRef, auditLogPayload(auditLog))
  })
}

export async function updateInspectorProfile(uid, data, auditLog = null) {
  requireFirebase()
  const normalizedUid = normalizeInspectorUid(uid)
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', normalizedUid), { ...data, updatedAt: serverTimestamp() })
  if (auditLog) batch.set(doc(collection(db, 'auditLogs')), auditLogPayload(auditLog))
  return batch.commit()
}

export async function updateReportWithAudit(reportId, data, auditLog) {
  requireFirebase()
  const batch = writeBatch(db)
  batch.update(doc(db, 'reports', reportId), { ...data, updatedAt: serverTimestamp() })
  batch.set(doc(collection(db, 'auditLogs')), auditLogPayload(auditLog))
  return batch.commit()
}

export async function getRecord(collectionName, id) { requireFirebase(); const snapshot = await getDoc(doc(db, collectionName, id)); return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null }
export async function createRecord(collectionName, data) { requireFirebase(); return addDoc(collection(db, collectionName), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export async function updateRecord(collectionName, id, data) { requireFirebase(); return updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() }) }

export async function sendReporterUpdate(reportId, reporterUpdate, notification, auditLog) {
  requireFirebase()
  const batch = writeBatch(db)

  batch.update(doc(db, 'reports', reportId), {
    reporterUpdate: {
      ...reporterUpdate,
      sentAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(collection(db, 'reporterNotifications')), {
    ...notification,
    sentAt: serverTimestamp(),
    readAt: null,
  })
  batch.set(doc(collection(db, 'auditLogs')), auditLogPayload(auditLog))

  return batch.commit()
}

export async function writeAuditLog({ actorId, actorName, action, details, category, marketId = 'pasig' }) {
  return createRecord('auditLogs', { actorId, actorName, action, details, category, marketId })
}

function normalizeInspectorUid(uid) {
  const normalizedUid = String(uid || '').trim()
  if (!normalizedUid || normalizedUid.includes('/')) {
    const error = new Error('The Firebase Authentication UID is invalid.')
    error.code = 'invalid-argument'
    throw error
  }
  return normalizedUid
}

function auditLogPayload({ actorId, actorName, action, details, category, marketId = 'pasig' }) {
  return {
    actorId,
    actorName,
    action,
    details,
    category,
    marketId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
