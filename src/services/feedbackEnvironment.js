export const PRODUCTION_FIREBASE_APPROVED = false
export function resolveFeedbackMode(env) {
  if (env.VITE_PRODUCTION_FIREBASE_APPROVED !== 'false' || env.VITE_FIREBASE_PROJECT_ID !== 'frish-app2026') return 'blocked'
  if (env.DEV === true && env.VITE_FEEDBACK_ENVIRONMENT === 'emulator' && env.VITE_ONLINE_TEST_APPROVED === 'false' && env.VITE_AUTHORITY_CASES_EMULATOR === 'true') return 'emulator'
  if (env.DEV === false && env.VITE_FEEDBACK_ENVIRONMENT === 'online_test' && env.VITE_ONLINE_TEST_APPROVED === 'true' && env.VITE_AUTHORITY_CASES_EMULATOR === 'false' && env.VITE_CONSUMER_FEEDBACK_EMULATOR === 'false') return 'online_test'
  return 'blocked'
}
export const FEEDBACK_MODE = resolveFeedbackMode(import.meta.env || {})
