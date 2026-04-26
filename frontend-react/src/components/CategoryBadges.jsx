export function CategoryBadges({ items = [], empty = '—' }) {
  if (!items?.length) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{empty}</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {items.map((c) => (
        <span
          key={c.id || c.name}
          style={{
            display: 'inline-block',
            padding: '4px 11px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            background: `color-mix(in srgb, ${c.color || 'var(--primary)'} 14%, var(--surface))`,
            color: `color-mix(in srgb, ${c.color || 'var(--primary)'} 52%, var(--text))`,
            border: `1px solid color-mix(in srgb, ${c.color || 'var(--primary)'} 32%, transparent)`,
          }}
        >
          {c.name}
        </span>
      ))}
    </div>
  )
}
