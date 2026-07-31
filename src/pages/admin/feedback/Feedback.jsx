import { useMemo, useState } from 'react'
import { FiEye, FiThumbsUp, FiThumbsDown, FiMessageSquare, FiRotateCcw, FiClock } from 'react-icons/fi'
import SearchBar from '../../../components/SearchBar.jsx'
import StatusBadge from '../../../components/StatusBadge.jsx'
import Modal from '../../../components/Modal.jsx'
import { getFeedback } from '../../../data/feedback.js'
import './Feedback.css'

const FILTERS = [
  { value: 'all', label: 'All Records' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

export default function Feedback() {
  const [feedback, setFeedback] = useState(getFeedback())
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [replyText, setReplyText] = useState('')

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      const matchesQuery =
        f.id.toLowerCase().includes(query.toLowerCase()) ||
        f.user.toLowerCase().includes(query.toLowerCase()) ||
        f.subject.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [feedback, query, statusFilter])

  function handleSendReply() {
    // UI only — wire this up to a real messaging/notification API later.
    if (!viewing) return
    setFeedback((prev) => prev.map((f) => (f.id === viewing.id ? { ...f, status: 'in-progress' } : f)))
    alert(`Reply sent to ${viewing.user} (UI only, not persisted).`)
    setViewing(null)
    setReplyText('')
  }

  function handleMarkResolved() {
    if (!viewing) return
    setFeedback((prev) => prev.map((f) => (f.id === viewing.id ? { ...f, status: 'resolved' } : f)))
    setViewing((prev) => (prev ? { ...prev, status: 'resolved' } : prev))
  }

  const columns = [
    { key: 'id', header: 'Feedback ID' },
    {
      key: 'dateTime',
      header: 'Date & Time',
      render: (row) => (
        <span className="reports-datetime">
          <span>{row.date}</span>
          <span className="reports-datetime__time">{row.time}</span>
        </span>
      ),
    },
    { key: 'userType', header: 'User Type' },
    { key: 'category', header: 'Category' },
    { key: 'subject', header: 'Subject' },
    {
      key: 'sentiment',
      header: 'Sentiment',
      render: (row) =>
        row.sentiment === 'positive' ? (
          <FiThumbsUp size={15} className="sentiment-icon sentiment-icon--positive" />
        ) : (
          <FiThumbsDown size={15} className="sentiment-icon sentiment-icon--negative" />
        ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          className="table-icon-btn"
          onClick={() => {
            setViewing(row)
            setReplyText('')
          }}
          aria-label="View feedback"
        >
          <FiEye size={16} />
        </button>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h2>User Feedback</h2>
          <p className="page-header-row__subtitle">Review and manage user comments, suggestions, and feedback</p>
        </div>
      </div>

      <div className="toolbar">
        <SearchBar value={query} onChange={setQuery} placeholder="Search by ID, user, or subject..." />
        <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {(query || statusFilter !== 'all') && <button className="btn btn-outline btn-sm feedback-clear" onClick={() => { setQuery(''); setStatusFilter('all') }}><FiRotateCcw size={14} /> Clear filters</button>}

      <section className="feedback-board"><div className="feedback-board__heading"><div><h3>Feedback inbox</h3><p>Comments, suggestions, and feedback from inspectors and consumers</p></div><span>{filtered.length} conversations</span></div>{filtered.length ? <div className="feedback-board__grid">{filtered.map((item) => <article className="feedback-card" key={item.id}><div className="feedback-card__top"><span className={`feedback-card__sentiment feedback-card__sentiment--${item.sentiment}`}>{item.sentiment === 'positive' ? <FiThumbsUp /> : <FiThumbsDown />}</span><div><strong>{item.subject}</strong><small>{item.id} · {item.userType}</small></div><StatusBadge status={item.status} /></div><p>{item.comment}</p><footer><span><FiClock /> {item.date} · {item.time}</span><button className="btn btn-outline btn-sm" onClick={() => { setViewing(item); setReplyText('') }}><FiEye size={13} /> Review</button></footer></article>)}</div> : <div className="feedback-board__empty">No feedback matches the selected filters.</div>}</section>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? viewing.subject : ''}
        size="lg"
        footer={
          <>
            <button className="btn btn-outline btn-sm" onClick={handleMarkResolved} disabled={viewing?.status === 'resolved'}>
              Mark Resolved
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>
              Close
            </button>
          </>
        }
      >
        {viewing && (
          <div className="detail-grid">
            <p><strong>From:</strong> {viewing.user} ({viewing.userType})</p>
            <p><strong>Category:</strong> {viewing.category}</p>
            <p><strong>Submitted:</strong> {viewing.date} · {viewing.time}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewing.status} /></p>
            <p className="feedback-modal-comment">"{viewing.comment}"</p>

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
            <button className="btn btn-primary btn-sm" onClick={handleSendReply} disabled={!replyText.trim()}>
              <FiMessageSquare size={13} /> Send Reply
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
