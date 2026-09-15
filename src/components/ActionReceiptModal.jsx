import { FiCheckCircle, FiPrinter } from 'react-icons/fi'
import Modal from './Modal.jsx'

export default function ActionReceiptModal({ open, onClose, title, reference, details = [], nextStep = '' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Action completed"
      size="sm"
      className="action-receipt-modal"
      footer={
        <>
          <button className="btn btn-outline btn-sm" type="button" onClick={() => window.print()}>
            <FiPrinter /> Print receipt
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={onClose} autoFocus>
            Done
          </button>
        </>
      }
    >
      <div className="action-receipt" role="status" aria-live="polite">
        <div className="action-receipt__summary">
          <span className="action-receipt__icon"><FiCheckCircle size={28} /></span>
          <h4>{title}</h4>
          {reference && <p className="action-receipt__reference">{reference}</p>}
        </div>
        {details.length > 0 && (
          <dl className="action-receipt__details">
            {details.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
        )}
        {nextStep && <p className="action-receipt__next-step"><strong>What happens next:</strong> {nextStep}</p>}
      </div>
    </Modal>
  )
}
