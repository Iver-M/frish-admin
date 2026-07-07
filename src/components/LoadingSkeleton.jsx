import './LoadingSkeleton.css'

/**
 * Simple placeholder shimmer, useful once real async fetches are wired up.
 * rows: number of skeleton rows to render when type="table"
 */
export default function LoadingSkeleton({ type = 'block', rows = 4 }) {
  if (type === 'table') {
    return (
      <div className="skeleton-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div className="skeleton skeleton-table__row" key={i} />
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return <div className="skeleton skeleton-card" />
  }

  return <div className="skeleton skeleton-block" />
}
