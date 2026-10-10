import { useEffect, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import { listActiveInspectors } from '../../../services/firestoreService.js'
import { transitionAuthorityCase } from '../../../services/authorityCasesBoundary.js'
import {
  availableAuthorityActions, buildAuthorityCommand, authorityStatusLabel, authorityAction,
  authorityWorkflowError, isAmbiguousAuthorityFailure,
} from '../../../services/authorityWorkflow.js'

export default function AuthorityCaseWorkflow({ record, user, onReload }) {
  const actions = availableAuthorityActions(record, user)
  const [inspectors, setInspectors] = useState([])
  const [inspectorId, setInspectorId] = useState('')
  const [loadingInspectors, setLoadingInspectors] = useState(false)
  const [directoryError, setDirectoryError] = useState('')
  const [directoryAttempt, setDirectoryAttempt] = useState(0)
  const [command, setCommand] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const mounted = useRef(true)
  const canAssign = actions.some(action => action.transition === 'assign_inspector')

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (!canAssign) return undefined
    let active = true
    setLoadingInspectors(true)
    setDirectoryError('')
    listActiveInspectors().then(items => { if (active) setInspectors(items) })
      .catch(() => { if (active) setDirectoryError('Unable to load active inspectors.') })
      .finally(() => { if (active) setLoadingInspectors(false) })
    return () => { active = false }
  }, [canAssign, directoryAttempt])

  function prepare(transition) {
    setError(''); setMessage('')
    try {
      if (!globalThis.crypto?.randomUUID) throw new Error('Use a secure browser connection to prepare this case action.')
      const next = buildAuthorityCommand(record, user, transition,
        inspectors.find(inspector => inspector.id === inspectorId), globalThis.crypto.randomUUID())
      setCommand(next); setConfirmOpen(true)
    } catch (item) { setError(item.message || 'This browser cannot prepare a case request.') }
  }

  async function submit() {
    if (busy.current || !command) return false
    busy.current = true; setPending(true); setError('')
    try {
      const result = await transitionAuthorityCase(command)
      if (!mounted.current) return false
      setMessage(`Case action confirmed: ${authorityStatusLabel(result.status)}.`)
      setCommand(null); setConfirmOpen(false)
      return true
    } catch (item) {
      if (!mounted.current) return false
      setError(authorityWorkflowError(item)); setConfirmOpen(false)
      // Unknown outcomes retain the exact UUID/version/payload for idempotent retry.
      if (!isAmbiguousAuthorityFailure(item)) {
        setCommand(null)
        if (String(item.code || '').includes('aborted')) onReload()
      }
      return false
    } finally {
      busy.current = false
      if (mounted.current) setPending(false)
    }
  }

  const selected = command && authorityAction(command.transition)
  return <section className="authority-workflow" aria-label="Consumer case review">
    <p>Changes here update the report’s progress. Photo estimates remain separate from the case status.</p>
    {record.status === 'forwarded_lgu' && <p>Awaiting the LGU decision. BFAR cannot mark this case resolved.</p>}
    {['resolved', 'closed_no_violation'].includes(record.status) && <p>This case is complete. No further status action is available.</p>}
    {!actions.length && !['forwarded_lgu', 'resolved', 'closed_no_violation'].includes(record.status)
      && <p>No BFAR action is available for this case and account.</p>}
    {canAssign && <label className="authority-workflow-field">
      <span>Assigned inspector</span>
      <select value={inspectorId} onChange={event => setInspectorId(event.target.value)} disabled={loadingInspectors || pending || Boolean(command)}>
        <option value="">{loadingInspectors ? 'Loading inspectors…' : 'Choose an active inspector…'}</option>
        {inspectors.map(inspector => <option key={inspector.id} value={inspector.id}>{inspector.name || inspector.displayName || inspector.email}</option>)}
      </select>
    </label>}
    {directoryError && <p role="alert">{directoryError} <button className="btn btn-outline btn-sm" onClick={() => setDirectoryAttempt(value => value + 1)}>Retry inspector list</button></p>}
    {canAssign && !loadingInspectors && !directoryError && !inspectors.length && <p>No active inspectors are available for assignment.</p>}
    <div className="authority-workflow-actions">
      {actions.map(action => <button key={action.transition} className="btn btn-primary" disabled={pending || Boolean(command) || (canAssign && (!inspectorId || loadingInspectors || Boolean(directoryError)))} onClick={() => prepare(action.transition)}>{action.label}</button>)}
      {command && !confirmOpen && <button className="btn btn-outline" disabled={pending} aria-busy={pending} onClick={submit}>{pending ? 'Checking request…' : 'Retry same request'}</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status" aria-live="polite">{message}</p>}
    <ConfirmDialog open={confirmOpen} onClose={() => { setConfirmOpen(false); if (!busy.current) setCommand(null) }} onConfirm={submit}
      title={selected ? `${selected.label}?` : 'Update this case?'}
      message={`The report’s Consumer-facing status will become “${selected?.consumerLabel || authorityStatusLabel(record.status)}”. This does not change the photo estimate or imply food-safety approval.`}
      confirmLabel={selected?.label || 'Confirm case action'} pendingLabel="Saving case action…" danger={command?.transition === 'close_no_violation'} />
  </section>
}
