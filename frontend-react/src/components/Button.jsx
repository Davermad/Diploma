export function Button({
  type = 'primary',
  htmlType = 'button',
  disabled = false,
  loading = false,
  size = 'md',
  className = '',
  children,
  onClick,
}) {
  const cls = `btn btn-${type} btn-${size} ${className}`.trim()
  return (
    <button type={htmlType} className={cls} disabled={disabled || loading} onClick={onClick}>
      {loading && <span className="btn-loading" aria-hidden />}
      <span>{children}</span>
    </button>
  )
}
