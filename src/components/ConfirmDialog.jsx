import { useState } from 'react'
import Modal from './Modal.jsx'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  pendingLabel = 'Working…',
  danger = false,
  error = '',
}) {
  const [isPending, setPending] = useState(false)

  function handleClose() {
    if (!isPending) onClose?.()
  }

  async function handleConfirm() {
    if (isPending) return
    setPending(true)

    try {
      const shouldClose = await onConfirm?.()
      if (shouldClose !== false) onClose?.()
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-outline btn-sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className={`btn btn-sm ${danger ? 'btn-danger-outline' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
      {error && (
        <p
          role="alert"
          style={{
            color: 'var(--color-danger)',
            background: 'var(--color-danger-bg)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            lineHeight: 1.45,
            marginTop: 'var(--space-3)',
            padding: '10px 12px',
          }}
        >
          {error}
        </p>
      )}
    </Modal>
  )
}
