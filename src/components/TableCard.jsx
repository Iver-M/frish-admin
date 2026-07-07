import './TableCard.css'

/**
 * Generic card-wrapped table.
 * columns: [{ key, header, render?(row) }]
 * rows: array of data objects
 */
export default function TableCard({ title, subtitle, columns, rows, emptyMessage = 'No records found.', action }) {
  return (
    <div className="table-card">
      {(title || action) && (
        <div className="table-card__header">
          <div>
            {title && <h3 className="table-card__title">{title}</h3>}
            {subtitle && <p className="table-card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}

      <div className="table-card__scroll">
        <table className="table-card__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-card__empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id || idx}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
