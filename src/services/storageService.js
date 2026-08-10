import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage, isFirebaseEnabled } from './firebase.js'

export async function uploadEvidence(file, path) {
  if (!isFirebaseEnabled) throw new Error('Firebase is not configured.')
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, file, { contentType: file.type })
  return getDownloadURL(fileRef)
}
