export function Card({ title, extra, children }) {
  return (
    <div className="card">
      {(title || extra) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}
