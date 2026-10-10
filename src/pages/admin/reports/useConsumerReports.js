import { useEffect, useState } from 'react'
import { AUTHORITY_CASES_RUNTIME_ENABLED, authorityErrorMessage, listPendingConsumerConcerns, subscribeAuthorityCases } from '../../../services/authorityCasesBoundary.js'
import { loadPendingReportPages } from '../../../utils/consumerReportView.js'

export default function useConsumerReports(user, enabled) {
  const scope = `${user?.uid || ''}:${user?.role || ''}:${user?.accountStatus || ''}:${enabled}`
  const [state, setState] = useState({ scope: '', concerns: [], cases: [], intakeError: '', caseError: '', loading: true, casesReady: false })
  useEffect(() => {
    if (!enabled || !AUTHORITY_CASES_RUNTIME_ENABLED || user?.role !== 'bfar_admin' || user.accountStatus !== 'active') return undefined
    let active = true
    let busy = false
    let unsubscribe
    const patch = values => { if (active) setState(current => ({ ...current, scope, ...values })) }
    setState({ scope, concerns: [], cases: [], intakeError: '', caseError: '', loading: true, casesReady: false })
    async function load() {
      if (!active || busy || document.visibilityState === 'hidden') return
      busy = true
      try { patch({ concerns: await loadPendingReportPages(listPendingConsumerConcerns, () => active), intakeError: '', loading: false }) }
      catch (error) { patch({ concerns: [], intakeError: authorityErrorMessage(error), loading: false }) }
      finally { busy = false }
    }
    try { unsubscribe = subscribeAuthorityCases(null, cases => patch({ cases, casesReady: true, caseError: '' }), error => patch({ cases: [], casesReady: false, caseError: authorityErrorMessage(error) })) }
    catch (error) { patch({ cases: [], casesReady: false, caseError: authorityErrorMessage(error) }) }
    void load()
    // Pending intake has a protected callable rather than a public collection listener.
    const timer = setInterval(load, 30000)
    document.addEventListener('visibilitychange', load)
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', load); unsubscribe?.() }
  }, [scope, enabled, user?.uid, user?.role, user?.accountStatus])
  // A concern retains prototype_saved after promotion. Suppress it until the
  // case subscription is ready to identify its promoted counterpart.
  return state.scope === scope ? { ...state, concerns: state.casesReady ? state.concerns : [], loading: state.loading || (!state.casesReady && !state.caseError) }
    : { concerns: [], cases: [], intakeError: '', caseError: '', loading: enabled && AUTHORITY_CASES_RUNTIME_ENABLED }
}
