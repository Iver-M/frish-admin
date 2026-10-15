// Compatibility adapter: main owns Consumer feedback gating and validation.
import { CONSUMER_FEEDBACK_RUNTIME_ENABLED, listConsumerFeedback as listValidatedFeedback,
  consumerFeedbackErrorMessage as inboxErrorMessage } from './consumerFeedbackInbox.js'
export { CONSUMER_FEEDBACK_RUNTIME_ENABLED }
export async function listConsumerFeedback() {
  return (await listValidatedFeedback()).map(normalizeConsumerFeedback)
}
export function consumerFeedbackErrorMessage(error) { return inboxErrorMessage(error?.category) }

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
