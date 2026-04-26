import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { stats } from '../api/client'
import { Card } from '../components/Card'

const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнено' }

export function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await stats.dashboard()
        if (!cancelled) setData(d)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page-shell">
      <h1>Дашборд</h1>
      <p className="page-lead">Сводка по задачам: статусы, просроченные и недавно завершённые.</p>
      {loading && <p className="skeleton-text">Загрузка…</p>}
      {!loading && data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 20,
          }}
        >
          <Card title="По статусам">
            {Object.entries(data.by_status || {}).map(([status, count]) => (
              <div
                key={status}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '0.9rem',
                }}
              >
                <span>{statusLabels[status] || status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </Card>
          <Card title="Просрочено">
            <div style={{ display: 'flex', justifyContent: 'center', minHeight: 72, alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '4.25rem',
                  minWidth: '4.25rem',
                  padding: '0 1.1rem',
                  fontSize: 'clamp(1.5rem, 4vw, 1.85rem)',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  background: `linear-gradient(145deg, color-mix(in srgb, var(--primary) 14%, var(--surface)), color-mix(in srgb, var(--primary) 8%, var(--surface)))`,
                  borderRadius: 999,
                  border: `2px solid color-mix(in srgb, var(--primary) 28%, transparent)`,
                }}
              >
                {data.overdue_count || 0}
              </span>
            </div>
          </Card>
          <Card title="Топ просроченных">
            {(data.top_overdue || []).slice(0, 5).map((task) => (
              <div
                key={task.id}
                style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
              >
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              </div>
            ))}
            {!(data.top_overdue || []).length && <p className="muted">Нет просроченных</p>}
          </Card>
          <Card title="Последние выполненные">
            {(data.last_completed || []).slice(0, 5).map((task) => (
              <div
                key={task.id}
                style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
              >
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              </div>
            ))}
            {!(data.last_completed || []).length && <p className="muted">Нет выполненных</p>}
          </Card>
        </div>
      )}
      {!loading && !data && <p className="muted">Нет данных</p>}
    </div>
  )
}
