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
  details = [],
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
      <p className="confirm-dialog__message">{message}</p>
      {details.length > 0 && (
        <dl className="confirm-dialog__details">
          {details.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>
      )}
      {error && (
        <p className="confirm-dialog__error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
