import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiAlertCircle, FiClock, FiRefreshCw, FiStar } from 'react-icons/fi'
import { useAuth } from '../../../context/AuthContext.jsx'
import { getFeedback } from '../../../data/feedback.js'
import {
  CONSUMER_FEEDBACK_RUNTIME_ENABLED,
  canViewConsumerFeedback,
  consumerFeedbackErrorMessage,
  createFeedbackInboxRequestGuard,
  listConsumerFeedback,
} from '../../../services/consumerFeedbackInbox.js'
import './Feedback.css'

function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

function Rating({ value }) {
  return <span className="feedback-rating" aria-label={`${value} out of 5 stars`}>
    {Array.from({ length: 5 }, (_, index) => <FiStar key={index} aria-hidden="true" className={index < value ? 'is-filled' : ''} />)}
  </span>
}

function FeedbackCards({ items, live }) {
  return <div className="feedback-board__grid">
    {items.map((item) => <article className="feedback-card" key={live ? item.feedbackReference : item.id}>
      <div className="feedback-card__top">
        <div>
          <strong>{live ? item.feedbackReference : item.subject}</strong>
          <small>{live ? 'Anonymous Consumer feedback' : `${item.id} · Sample ${item.userType}`}</small>
        </div>
        {live && <Rating value={item.rating} />}
      </div>
      <p>{live ? item.feedbackText : item.comment}</p>
      <footer>
        <span><FiClock aria-hidden="true" /> {live ? formatSubmittedAt(item.submittedAt) : `${item.date} · ${item.time}`}</span>
        {live && <span>App {item.appVersion} · Android {item.platformVersion}</span>}
      </footer>
    </article>)}
  </div>
}

export default function Feedback() {
  const { user } = useAuth()
  const [state, setState] = useState({ status: 'idle', items: [], message: '' })
  const guardRef = useRef(null)
  if (!guardRef.current) guardRef.current = createFeedbackInboxRequestGuard()
  const canLoad = canViewConsumerFeedback(CONSUMER_FEEDBACK_RUNTIME_ENABLED, user)
  const userKey = `${user?.uid || 'none'}:${user?.role || 'none'}:${user?.accountStatus || 'none'}`

  useEffect(() => {
    guardRef.current.mount()
    return () => guardRef.current.unmount()
  }, [])

  const load = useCallback(async () => {
    if (!canLoad) return
    const token = guardRef.current.begin()
    setState((current) => ({ ...current, status: 'loading', message: '' }))
    try {
      const items = await listConsumerFeedback()
      if (guardRef.current.isCurrent(token)) setState({ status: 'success', items, message: '' })
    } catch (error) {
      if (guardRef.current.isCurrent(token)) {
        setState({ status: 'failure', items: [], message: consumerFeedbackErrorMessage(error?.category) })
      }
    }
  }, [canLoad, userKey])

  useEffect(() => {
    guardRef.current.invalidate()
    if (canLoad) void load()
    return () => guardRef.current.invalidate()
  }, [canLoad, load, userKey])

  const sampleItems = useMemo(() => getFeedback(), [])
  const live = CONSUMER_FEEDBACK_RUNTIME_ENABLED

  return <div className="page feedback-page">
    <div className="page-header-row">
      <div>
        <h2>User Feedback</h2>
        <p className="page-header-row__subtitle">Read Consumer comments submitted to the local Firebase emulators</p>
      </div>
      {canLoad && <button className="btn btn-outline btn-sm" onClick={load} disabled={state.status === 'loading'}>
        <FiRefreshCw aria-hidden="true" /> {state.status === 'failure' ? 'Retry' : 'Refresh'}
      </button>}
    </div>

    {!live && <section className="feedback-notice feedback-notice--sample" role="status">
      <FiAlertCircle aria-hidden="true" />
      <div><strong>Sample data</strong><p>The live Consumer feedback inbox is disabled. These placeholder cards are for interface demonstration only.</p></div>
    </section>}

    {live && !canLoad && <section className="feedback-notice feedback-notice--error" role="alert">
      <FiAlertCircle aria-hidden="true" />
      <div><strong>Feedback unavailable</strong><p>Only an active BFAR administrator signed in through the local Firebase Auth emulator can view Consumer feedback.</p></div>
    </section>}

    {!live && <section className="feedback-board">
      <div className="feedback-board__heading"><div><h3>Sample feedback</h3><p>Static demonstration content; no Firebase records are shown</p></div><span>{sampleItems.length} samples</span></div>
      <FeedbackCards items={sampleItems} live={false} />
    </section>}

    {canLoad && <section className="feedback-board" aria-busy={state.status === 'loading'}>
      <div className="feedback-board__heading"><div><h3>Consumer feedback inbox</h3><p>Read-only · Firebase emulators · newest submissions first</p></div><span>{state.items.length} records</span></div>
      {state.status === 'loading' && <div className="feedback-board__state" role="status">Loading Consumer feedback…</div>}
      {state.status === 'failure' && <div className="feedback-board__state feedback-board__state--error" role="alert"><p>{state.message}</p><button className="btn btn-outline btn-sm" onClick={load}>Retry</button></div>}
      {state.status === 'success' && state.items.length === 0 && <div className="feedback-board__state">No Consumer feedback has been submitted to this emulator.</div>}
      {state.status === 'success' && state.items.length > 0 && <FeedbackCards items={state.items} live />}
    </section>}
  </div>
}
