export function FormItem({ label, error, children }) {
  return (
    <div className="form-item">
      {label && <label className="form-label">{label}</label>}
      {children}
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.8125rem', marginTop: 6 }}>{error}</div>
      )}
    </div>
  )
}
