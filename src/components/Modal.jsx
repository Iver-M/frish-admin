import { useEffect, useId } from 'react'
import { FiX } from 'react-icons/fi'
import './Modal.css'

export default function Modal({ open, onClose, title, children, footer, size = 'md', className = '' }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal--${size} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal__header">
          <h3 id={titleId}>{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
