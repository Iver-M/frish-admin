import { httpsCallable } from 'firebase/functions'
import { auth, functions, isConsumerFeedbackOnlineTestEnabled } from './firebase.js'

export const CONSUMER_FEEDBACK_RUNTIME_ENABLED = isConsumerFeedbackOnlineTestEnabled

export async function listConsumerFeedback(pageSize = 50) {
  if (!CONSUMER_FEEDBACK_RUNTIME_ENABLED) return []
  await auth?.currentUser?.getIdToken(true)
  const result = await httpsCallable(functions, 'listConsumerFeedback')({ pageSize })
  return Array.isArray(result.data?.feedback) ? result.data.feedback.map(normalizeConsumerFeedback) : []
}

export function consumerFeedbackErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  if (code.includes('permission-denied') || code.includes('unauthenticated')) return 'Consumer feedback is protected. Ask the Firebase project owner to provision the BFAR feedback claim, then sign out and sign in again.'
  if (code.includes('failed-precondition')) return 'The controlled Consumer feedback environment is not enabled on the deployed Function.'
  return 'Consumer feedback is temporarily unavailable. Inspector feedback remains available.'
}

function normalizeConsumerFeedback(record) {
  return {
    id: record.feedbackReference,
    feedbackCode: record.feedbackReference,
    user: 'Anonymous Consumer',
    userType: 'Consumer',
    userEmail: '',
    role: 'consumer',
    rating: record.rating,
    message: record.feedbackText,
    subject: 'Consumer app feedback',
    status: 'pending',
    platform: record.platform,
    platformVersion: record.platformVersion,
    appVersion: record.appVersion,
    submittedAt: record.submittedAt,
    readOnly: true,
  }
}
