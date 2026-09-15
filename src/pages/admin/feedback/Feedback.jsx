import { useEffect, useMemo, useState } from 'react'
import {
  FiClock,
  FiEye,
  FiMeh,
  FiMessageSquare,
  FiRotateCcw,
  FiStar,
  FiThumbsDown,
  FiThumbsUp,
} from 'react-icons/fi'
import ConfirmDialog from '../../../components/ConfirmDialog.jsx'
import Modal from '../../../components/Modal.jsx'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getFeedback } from '../../../data/feedback.js'
import {
  replyToFeedback,
  resolveFeedback,
  subscribeMarketRecords,
} from '../../../services/firestoreService.js'
import {
  feedbackTimestampValue,
  formatFeedbackTimestamp,
  normalizeFeedbackRecord,
} from '../../../utils/feedbackRecord.js'
import './Feedback.css'

const FILTERS = [
  { value: 'all', label: 'All feedback' },
  { value: 'pending', label: 'Pending review' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

export default function Feedback() {
  const { user, isFirebaseEnabled } = useAuth()
  const [feedback, setFeedback] = useState(() => fallbackFeedback(isFirebaseEnabled))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewingId, setViewingId] = useState('')
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(isFirebaseEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false)

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setFeedback(fallbackFeedback(false))
      setLoading(false)
      return undefined
    }

    setLoading(true)
    return subscribeMarketRecords(
      'feedback',
      user,
      (records) => {
        setFeedback(records.map(normalizeFeedbackRecord).sort(newestFirst))
        setLoading(false)
        setError('')
      },
      (firebaseError) => {
        setFeedback([])
        setLoading(false)
        setError(feedbackErrorMessage(firebaseError))
      },
    )
  }, [isFirebaseEnabled, user])

  const viewing = useMemo(
    () => feedback.find((item) => item.id === viewingId) || null,
    [feedback, viewingId],
  )

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return feedback.filter((item) => {
      const searchable = [
        item.feedbackCode,
        item.user,
        item.userEmail,
        item.subject,
        item.comment,
      ].join(' ').toLowerCase()
      return (!search || searchable.includes(search))
        && (statusFilter === 'all' || item.status === statusFilter)
    })
  }, [feedback, query, statusFilter])

  function openFeedback(item) {
    setViewingId(item.id)
    setReplyText(item.adminReply?.message || '')
    setError('')
    setNotice('')
  }

  async function handleSaveReply() {
    if (!viewing || !replyText.trim() || !isFirebaseEnabled) return
    if (replyText.trim().length > 800) {
      setError('Keep the administrator response within 800 characters.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await replyToFeedback(
        viewing.id,
        {
          message: replyText.trim(),
          sentByUid: user.uid,
          sentByName: user.name || 'BFAR-NCR Admin',
        },
        feedbackAudit(user, 'Responded to mobile feedback', viewing.feedbackCode),
      )
      setNotice('The response was saved to the feedback record.')
    } catch (firebaseError) {
      setError(feedbackErrorMessage(firebaseError, 'The response could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkResolved() {
    if (!viewing || !isFirebaseEnabled || viewing.status === 'resolved') return false

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await resolveFeedback(
        viewing.id,
        { uid: user.uid, name: user.name || 'BFAR-NCR Admin' },
        feedbackAudit(user, 'Resolved mobile feedback', viewing.feedbackCode),
      )
      setNotice('Feedback marked as resolved.')
      return true
    } catch (firebaseError) {
      setError(feedbackErrorMessage(firebaseError, 'The feedback could not be resolved.'))
      return false
    } finally {
      setSaving(false)
    }
  }

  function closeFeedback() {
    if (saving) return
    setViewingId('')
    setReplyText('')
    setError('')
    setNotice('')
  }

  return (
    <div className="page feedback-page">
      <div className="page-header-row feedback-page__header">
        <div>
          <p className="workspace-kicker">USER EXPERIENCE</p>
          <h2>User Feedback</h2>
          <p className="page-header-row__subtitle">Review ratings, comments, and concerns submitted through the FRISH Inspector app.</p>
        </div>
        <span className={`feedback-source ${isFirebaseEnabled ? 'feedback-source--live' : ''}`}>
          <i /> {isFirebaseEnabled ? 'Live updates' : 'Demo records'}
        </span>
      </div>

      <div className="toolbar workspace-toolbar feedback-page__toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search feedback, user, email, or message..." />
        <select className="select-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter feedback by status">
          {FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
        </select>
        {(query || statusFilter !== 'all') && <button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setStatusFilter('all') }}><FiRotateCcw size={14} /> Clear filters</button>}
      </div>

      {error && !viewing && <p className="feedback-alert feedback-alert--error" role="alert">{error}</p>}

      <section className="feedback-board">
        <div className="feedback-board__heading">
          <div><h3>Feedback inbox</h3><p>Review user experiences and follow up on concerns. New feedback appears here automatically.</p></div>
          <span>{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'feedback item' : 'feedback items'}`}</span>
        </div>
        {loading ? <div className="feedback-board__empty">Loading mobile feedback…</div> : filtered.length ? (
          <div className="feedback-board__grid">
            {filtered.map((item) => <FeedbackCard item={item} key={item.id} onOpen={openFeedback} />)}
          </div>
        ) : <div className="feedback-board__empty">{error ? 'Feedback is temporarily unavailable.' : 'No feedback matches the selected filters.'}</div>}
      </section>

      <Modal
        open={Boolean(viewing)}
        onClose={closeFeedback}
        title={viewing?.subject || 'Feedback review'}
        size="lg"
        footer={viewing && <>
          <button className="btn btn-outline" onClick={() => { setError(''); setResolveConfirmOpen(true) }} disabled={!isFirebaseEnabled || saving || viewing.status === 'resolved'}>
            {viewing.status === 'resolved' ? 'Resolved' : 'Mark resolved'}
          </button>
          <button className="btn btn-outline" onClick={closeFeedback} disabled={saving}>Close</button>
        </>}
      >
        {viewing && <FeedbackDetail
          item={viewing}
          replyText={replyText}
          onReplyChange={setReplyText}
          onSaveReply={handleSaveReply}
          saving={saving}
          canPersist={isFirebaseEnabled}
          error={error}
          notice={notice}
        />}
      </Modal>
      <ConfirmDialog
        open={resolveConfirmOpen}
        onClose={() => !saving && setResolveConfirmOpen(false)}
        onConfirm={handleMarkResolved}
        title="Mark this feedback as resolved?"
        message="This confirms that the administrator has completed the required follow-up. The feedback record and any saved response will remain available."
        details={viewing ? [
          { label: 'Feedback', value: viewing.feedbackCode },
          { label: 'Submitted by', value: viewing.user },
          { label: 'New status', value: 'Resolved' },
        ] : []}
        confirmLabel="Mark resolved"
        pendingLabel="Resolving…"
        error={error}
      />
    </div>
  )
}

function FeedbackCard({ item, onOpen }) {
  const SentimentIcon = item.sentiment === 'positive' ? FiThumbsUp : item.sentiment === 'negative' ? FiThumbsDown : FiMeh
  return <article className="feedback-card">
    <div className="feedback-card__top">
      <span className={`feedback-card__sentiment feedback-card__sentiment--${item.sentiment}`}><SentimentIcon /></span>
      <div><strong>{item.subject}</strong><small>{item.feedbackCode} · {item.userType}</small></div>
      <StatusBadge status={item.status} />
    </div>
    <div className="feedback-card__rating" aria-label={`${item.rating || 0} out of 5 stars`}><FiStar /> {item.rating ? `${item.rating}/5` : 'Unrated'}</div>
    <p>{item.comment}</p>
    <footer><span><FiClock /> {formatFeedbackTimestamp(item.createdAt)}</span><button className="btn btn-outline btn-sm" onClick={() => onOpen(item)}><FiEye size={13} /> Review</button></footer>
  </article>
}

function FeedbackDetail({ item, replyText, onReplyChange, onSaveReply, saving, canPersist, error, notice }) {
  return <div className="feedback-detail">
    <dl className="feedback-detail__facts">
      <Fact label="Feedback code" value={item.feedbackCode} />
      <Fact label="Submitted by" value={`${item.user} · ${item.userType}`} />
      <Fact label="Email" value={item.userEmail || 'Not included'} />
      <Fact label="Rating" value={item.rating ? `${item.rating} out of 5` : 'Not rated'} />
      <Fact label="Source" value={`${capitalize(item.platform)} · app ${item.appVersion}`} />
      <Fact label="Submitted" value={formatFeedbackTimestamp(item.createdAt)} />
      <Fact label="Status" value={<StatusBadge status={item.status} />} />
    </dl>
    <blockquote className="feedback-modal-comment">{item.comment}</blockquote>

    {item.adminReply?.sentAt && <div className="feedback-saved-reply"><FiMessageSquare /><span><strong>Latest administrator response</strong><small>{item.adminReply.sentByName || 'BFAR-NCR Admin'} · {formatFeedbackTimestamp(item.adminReply.sentAt)}</small><p>{item.adminReply.message}</p></span></div>}

    <label className="feedback-reply-field">
      <span>Administrator response</span>
      <textarea rows={5} maxLength={800} placeholder="Record the response or follow-up action…" value={replyText} onChange={(event) => onReplyChange(event.target.value)} disabled={!canPersist || saving || item.status === 'resolved'} />
      <small>{replyText.length}/800</small>
    </label>
    <p className="feedback-delivery-note">This response is saved as an internal follow-up note. It is not sent to the Inspector app yet.</p>
    {error && <p className="feedback-alert feedback-alert--error" role="alert">{error}</p>}
    {notice && <p className="feedback-alert feedback-alert--success" role="status">{notice}</p>}
    <button className="btn btn-primary" onClick={onSaveReply} disabled={!canPersist || saving || item.status === 'resolved' || !replyText.trim()}><FiMessageSquare /> {saving ? 'Saving…' : 'Save response'}</button>
  </div>
}

function Fact({ label, value }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function fallbackFeedback(isFirebaseEnabled) {
  return isFirebaseEnabled ? [] : getFeedback().map(normalizeFeedbackRecord).sort(newestFirst)
}

function newestFirst(a, b) {
  return feedbackTimestampValue(b.createdAt) - feedbackTimestampValue(a.createdAt)
}

function feedbackAudit(user, action, feedbackCode) {
  return {
    actorId: user?.uid || 'bfar-admin',
    actorName: user?.name || 'BFAR-NCR Admin',
    action,
    details: feedbackCode,
    category: 'User Feedback',
    marketId: 'pasig',
  }
}

function feedbackErrorMessage(error, fallback = 'Feedback could not be loaded.') {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '')
  if (code.includes('permission-denied') || /insufficient permissions/i.test(message)) {
    return 'The current Firestore rules do not allow BFAR to manage feedback. Publish the merged feedback rules and try again.'
  }
  if (code.includes('unavailable')) return 'Feedback is temporarily unavailable. Check the connection and try again.'
  return fallback
}

function capitalize(value) {
  return String(value || 'Not recorded').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
