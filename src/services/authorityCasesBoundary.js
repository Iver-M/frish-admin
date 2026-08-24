export const AUTHORITY_CASES_COLLECTION = 'authorityCases'
export const AUTHORITY_CASES_RUNTIME_ENABLED = false

export function requireAuthorityCasesRuntime() {
  const error = new Error(
    'Authority cases are disabled until trusted backend promotion, combined rules, and privacy policy are approved.',
  )
  error.code = 'authority-cases-disabled'
  throw error
}
