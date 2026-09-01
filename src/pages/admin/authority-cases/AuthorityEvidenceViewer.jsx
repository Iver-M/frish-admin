import { useCallback, useEffect, useRef, useState } from 'react'
import Modal from '../../../components/Modal.jsx'
import {
  authorityEvidenceClient,
  evidenceErrorMessage,
  isAuthorityEvidenceStatusEligible,
  isAuthorityEvidenceViewerEnabled,
} from '../../../services/authorityEvidenceService.js'
import { createEvidenceBlobLifecycle } from '../../../services/evidenceBlobLifecycle.js'
import './AuthorityEvidenceViewer.css'

const EVIDENCE_LABELS = Object.freeze({
  eyesAndSkin: 'Eyes and skin',
  gills: 'Gills',
})

export default function AuthorityEvidenceViewer({ record, user, client = authorityEvidenceClient }) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [evidenceType, setEvidenceType] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorCategory, setErrorCategory] = useState(null)
  const lifecycle = useRef(null)
  const controller = useRef(null)
  const action = useRef(0)
  const mounted = useRef(true)

  if (!lifecycle.current) lifecycle.current = createEvidenceBlobLifecycle()

  const clearTemporaryEvidence = useCallback(() => {
    action.current += 1
    controller.current?.abort()
    controller.current = null
    lifecycle.current.clear()
    if (mounted.current) {
      setObjectUrl(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      action.current += 1
      controller.current?.abort()
      lifecycle.current.clear()
    }
  }, [])

  useEffect(() => {
    clearTemporaryEvidence()
    setViewerOpen(false)
    setEvidenceType(null)
    setErrorCategory(null)
  }, [
    clearTemporaryEvidence,
    record.caseId,
    record.status,
    user?.accountStatus,
    user?.role,
    user?.uid,
  ])

  const closeViewer = useCallback(() => {
    clearTemporaryEvidence()
    setViewerOpen(false)
    setErrorCategory(null)
  }, [clearTemporaryEvidence])

  const openEvidence = useCallback(async (nextType) => {
    if (loading || !isAuthorityEvidenceStatusEligible(record.status)) return
    clearTemporaryEvidence()
    const nextAction = action.current
    const nextController = new AbortController()
    controller.current = nextController
    setEvidenceType(nextType)
    setViewerOpen(true)
    setLoading(true)
    setErrorCategory(null)
    try {
      const result = await client.retrieve({
        authorityCaseId: record.caseId,
        evidenceType: nextType,
        caseStatus: record.status,
        signal: nextController.signal,
      })
      if (!mounted.current || nextAction !== action.current || nextController.signal.aborted) return
      const nextUrl = lifecycle.current.replace(result.blob)
      setObjectUrl(nextUrl)
      setLoading(false)
      controller.current = null
    } catch (error) {
      if (!mounted.current || nextAction !== action.current) return
      setLoading(false)
      controller.current = null
      setErrorCategory(error?.category || 'retrieval_failed')
    }
  }, [clearTemporaryEvidence, client, loading, record.caseId, record.status])

  if (!isAuthorityEvidenceViewerEnabled(user)) return null

  const eligible = isAuthorityEvidenceStatusEligible(record.status)
  return (
    <section className="authority-evidence" aria-labelledby="authority-evidence-title">
      <div className="authority-evidence__header">
        <div>
          <p className="workspace-kicker">AUTHORIZED CASE REVIEW</p>
          <h3 id="authority-evidence-title">Submitted scan evidence</h3>
        </div>
        <span>Emulator only</span>
      </div>
      <p className="authority-evidence__policy">
        Evidence is displayed temporarily for authorized case review. It must not be copied or shared outside the approved case workflow. Access is audited, closing the viewer removes the temporary browser copy, and production evidence access remains disabled.
      </p>
      {eligible ? (
        <div className="authority-evidence__actions">
          <button className="btn btn-outline" disabled={loading} onClick={() => openEvidence('eyesAndSkin')}>View eyes and skin evidence</button>
          <button className="btn btn-outline" disabled={loading} onClick={() => openEvidence('gills')}>View gills evidence</button>
        </div>
      ) : (
        <p className="authority-evidence__unavailable">Evidence viewing is disabled for this case status.</p>
      )}
      <Modal
        open={viewerOpen}
        onClose={closeViewer}
        title={`${EVIDENCE_LABELS[evidenceType] || 'Scan'} evidence`}
        size="lg"
        footer={<><button className="btn btn-outline" disabled={loading} onClick={() => openEvidence('eyesAndSkin')}>Show eyes and skin</button><button className="btn btn-outline" disabled={loading} onClick={() => openEvidence('gills')}>Show gills</button><button className="btn btn-outline" onClick={closeViewer}>Close viewer</button></>}
      >
        <div className="authority-evidence__viewer" aria-live="polite">
          {loading && <p role="status">Retrieving authorized evidence…</p>}
          {!loading && objectUrl && <img src={objectUrl} alt={`${EVIDENCE_LABELS[evidenceType]} evidence for authorized case review`} />}
          {!loading && errorCategory && <div className="authority-evidence__error" role="alert"><p>{evidenceErrorMessage(errorCategory)}</p><button className="btn btn-outline" onClick={() => openEvidence(evidenceType)}>Retry</button></div>}
          <p className="authority-evidence__notice">This temporary browser copy is removed when the viewer closes. There is no download or sharing action.</p>
        </div>
      </Modal>
    </section>
  )
}
