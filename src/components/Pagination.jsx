import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import './Pagination.css'

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 0) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="pagination">
      <span className="pagination__info">
        Showing {totalItems === 0 ? 0 : start}–{end} of {totalItems}
      </span>
      <div className="pagination__controls">
        <button
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <FiChevronLeft size={16} />
        </button>
        <span className="pagination__page">
          Page {page} of {totalPages}
        </span>
        <button
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
