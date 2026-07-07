import { useState } from 'react'
import { FiStar, FiMessageSquare } from 'react-icons/fi'
import Modal from '../../../components/Modal.jsx'
import { getFeedback } from '../../../data/feedback.js'
import './Feedback.css'

export default function Feedback() {
  const feedback = getFeedback()
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  function handleSendReply() {
    // UI only — wire this up to a real messaging/notification API later.
    alert(`Reply sent to ${replyTo.user} (UI only, not persisted).`)
    setReplyTo(null)
    setReplyText('')
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>User Feedback</h2>
      </div>

      <div className="feedback-grid">
        {feedback.map((f) => (
          <div className="feedback-card" key={f.id}>
            <div className="feedback-card__top">
              <div className="feedback-card__user">
                <div className="feedback-card__avatar">{f.user.charAt(0)}</div>
                <div>
                  <p className="feedback-card__name">{f.user}</p>
                  <p className="feedback-card__date">{f.date}</p>
                </div>
              </div>
              <div className="feedback-card__rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <FiStar
                    key={i}
                    size={14}
                    className={i < f.rating ? 'star star--filled' : 'star'}
                  />
                ))}
              </div>
            </div>

            <p className="feedback-card__comment">{f.comment}</p>

            <button className="btn btn-outline btn-sm" onClick={() => setReplyTo(f)}>
              <FiMessageSquare size={13} /> Reply
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={!!replyTo}
        onClose={() => setReplyTo(null)}
        title={replyTo ? `Reply to ${replyTo.user}` : ''}
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setReplyTo(null)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSendReply} disabled={!replyText.trim()}>
              Send Reply
            </button>
          </>
        }
      >
        {replyTo && (
          <div>
            <p className="feedback-card__comment" style={{ marginBottom: 'var(--space-4)' }}>
              "{replyTo.comment}"
            </p>
            <div className="form-group">
              <label>Your Reply</label>
              <textarea
                className="text-input"
                rows={4}
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
