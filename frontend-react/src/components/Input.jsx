export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  required,
  minLength,
  className = '',
  style,
  onKeyDown,
}) {
  return (
    <input
      type={type}
      className={`input-field ${className}`.trim()}
      style={style}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      minLength={minLength}
      onKeyDown={onKeyDown}
    />
  )
}
