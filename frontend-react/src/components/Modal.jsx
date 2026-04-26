import { createPortal } from 'react-dom'
import { useEffect } from 'react'

export function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-panel"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          maxWidth: 'min(440px, 100%)',
          width: '100%',
          maxHeight: 'min(88vh, 720px)',
          overflow: 'auto',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%)',
          }}
        >
          <h3 id="modal-title" style={{ margin: 0, fontSize: '1.05rem' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.35rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
