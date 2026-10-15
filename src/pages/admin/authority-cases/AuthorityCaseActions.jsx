import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { listActiveInspectors } from '../../../services/firestoreService.js'
import { AUTHORITY_CASES_RUNTIME_MODE, authorityErrorMessage, transitionAuthorityCase } from '../../../services/authorityCasesBoundary.js'
import { createCaseCommand, transitionJournal } from '../../../services/authorityTransitionClient.js'
import { CASE_ACTIONS, permittedCaseActions } from '../../../services/consumerAuthorityPolicy.js'

export default function AuthorityCaseActions({ record, user }) {
  const [inspectors, setInspectors] = useState([])
  const [inspectorId, setInspectorId] = useState('')
  const [inspectorError, setInspectorError] = useState('')
  const [command, setCommand] = useState(null)
  const [confirmed, setConfirmed] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(true)
  const attempted = useRef(false)
  const journal = useRef(null)
  const [journalReady, setJournalReady] = useState(false)
  const actor = { uid: user?.uid, role: user?.consumerPermissions?.role }
  const actions = permittedCaseActions(record, actor)

  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    try {
      journal.current = transitionJournal(window.sessionStorage, `${AUTHORITY_CASES_RUNTIME_MODE}:${user.uid}:${record.caseId}`)
      const saved = journal.current.read()
      if (saved && saved.caseId !== record.caseId) throw new Error('Retained case does not match.')
      if (saved) { attempted.current = true; setCommand(saved) }
      setJournalReady(true)
    } catch { setError('Unconfirmed action storage is unavailable or invalid. Preserve this tab and contact the project owner before sending another action.') }
  }, [user.uid, record.caseId])
  useEffect(() => {
    if (!actions.includes('assign_inspector')) return undefined
    let active = true
    listActiveInspectors().then(next => { if (active) setInspectors(next) }).catch(() => {
      if (active) setInspectorError('Active inspectors could not be loaded. Refresh the case to retry; assignment is unavailable.')
    })
    return () => { active = false }
  }, [record.caseId, record.status, actor.role])

  function prepare(transition) {
    try {
      const inspector = inspectors.find(item => item.id === inspectorId)
      const assignment = transition === 'assign_inspector' && inspector
        ? { inspectorId: inspector.id, inspectorName: inspector.name || inspector.displayName || 'Inspector' } : null
      setCommand(createCaseCommand(record, transition, assignment))
      setError(''); setConfirmed(null); attempted.current = false
    } catch (prepareError) { setError(authorityErrorMessage(prepareError)) }
  }
  async function submit() {
    if (busy.current || !command || !journalReady) return
    busy.current = true; attempted.current = true; setPending(true); setError('')
    try {
      // Persist before sending. No token, private Consumer facts or evidence is stored.
      try { journal.current.save(command) }
      catch { throw Object.assign(new Error(), { code: 'request-storage-unavailable' }) }
      const result = await transitionAuthorityCase(command)
      if (!mounted.current) return
      setConfirmed(result); setCommand(null)
      try { journal.current.clear() }
      catch { setJournalReady(false); setError('The server confirmed this action, but this tab could not clear its retained request. Restore session storage and refresh before preparing another action.') }
    } catch (actionError) {
      if (mounted.current) setError(authorityErrorMessage(actionError))
    } finally { busy.current = false; if (mounted.current) setPending(false) }
    // ConfirmDialog otherwise calls onClose after our promise settles, which
    // would discard an unconfirmed command even when its response was lost.
    return false
  }
  return <section className="authority-case-actions" aria-label="Consumer case actions" aria-busy={pending}>
    <h3>Permitted case actions</h3>
    <p>Every action is checked by the Consumer backend against your signed role, current account, market, assignment and case version.</p>
    {error && <p role="alert">{error}</p>}
    {confirmed && <p role="status">Server confirmed {CASE_ACTIONS[Object.keys(CASE_ACTIONS).find(name => CASE_ACTIONS[name].to === confirmed.status)]?.label} (version {confirmed.version}). {record.version < confirmed.version ? 'Waiting for the recorded case to update…' : 'The recorded case is up to date.'}</p>}
    {!command && journalReady && !(confirmed && record.version < confirmed.version) && <>
      {actions.includes('assign_inspector') && <label>Active inspector<select className="select-input" value={inspectorId} onChange={event => setInspectorId(event.target.value)}><option value="">Select an inspector</option>{inspectors.map(item => <option key={item.id} value={item.id}>{item.name || item.displayName || 'Inspector'}</option>)}</select></label>}
      {inspectorError && <p role="alert">{inspectorError}</p>}
      <div className="intake-actions">{actions.map(transition => <button key={transition} className="btn btn-primary" disabled={pending || (transition === 'assign_inspector' && (!inspectorId || Boolean(inspectorError)))} onClick={() => prepare(transition)}>{CASE_ACTIONS[transition].label}</button>)}</div>
      {!actions.length && <p>{record.status === 'forwarded_lgu' ? 'Resolution requires an authorized LGU account with the signed lgu role. BFAR cannot resolve this case.' : 'No workflow action is available for this signed role and recorded status.'}</p>}
    </>}
    {command && attempted.current && !pending && <div role="status"><p>This request has not been confirmed. Retrying sends the same request ID, version and payload. Review the recorded case before abandoning a request; it may already have completed.</p><button className="btn btn-primary" onClick={submit}>Retry same action</button><button className="btn btn-outline" onClick={() => { try { journal.current.clear(); setCommand(null); setError('') } catch { setError('Unable to clear the retained request. Keep this tab and retry later.') } }}>Abandon retained request</button></div>}
    <ConfirmDialog open={Boolean(command) && !attempted.current} title={command ? `${CASE_ACTIONS[command.transition].label}?` : 'Confirm action'} message={`Apply this action to recorded version ${command?.expectedVersion ?? ''}? Only a confirmed server response establishes completion.`} confirmLabel="Confirm action" pendingLabel="Waiting for server…" pending={pending} onConfirm={submit} onClose={() => { if (!busy.current) setCommand(null) }} />
    {pending && <p role="status">Waiting for server confirmation…</p>}
  </section>
}
