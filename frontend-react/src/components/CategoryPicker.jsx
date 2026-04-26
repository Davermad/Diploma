export function CategoryPicker({ categories = [], selectedIds, onChange }) {
  function toggle(id) {
    const s = new Set(selectedIds)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    onChange([...s])
  }

  if (!categories.length) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
        Сначала создайте категории на вкладке «Категории».
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {categories.map((cat) => {
        const selected = selectedIds.includes(cat.id)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 999,
              border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
              background: selected ? 'color-mix(in srgb, var(--primary) 10%, var(--surface))' : 'var(--surface)',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: 13,
              color: 'var(--text)',
              boxShadow: selected ? '0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent)' : 'none',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: cat.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 500 }}>{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}
