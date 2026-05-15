import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'
import { stats } from '../api/client'
import { Card } from '../components/Card'

const statusLabels = {
  BACKLOG: 'Бэклог',
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  REVIEW: 'Ревью',
  DONE: 'Готово',
}

export function DashboardPage() {
  const [dash, setDash] = useState(null)
  const [periodStats, setPeriodStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [d, s] = await Promise.all([stats.dashboard(), stats.get('month')])
        if (!cancelled) {
          setDash(d)
          setPeriodStats(s)
        }
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

  const trendData = (periodStats?.completed_trend || []).map((row) => ({
    date: row.date?.slice(5) || row.date,
    count: row.count,
  }))

  const barData = Object.entries(dash?.by_status || {}).map(([key, count]) => ({
    name: statusLabels[key] || key,
    count,
  }))

  return (
    <div className="page-shell react-dash-page">
      <h1>Аналитика рабочего потока</h1>
      <p className="page-lead">
        Пример использования Recharts с тем же состоянием, что и остальное приложение — типичный React-поток данных «fetch → setState →
        рендер».
      </p>
      {loading && <p className="skeleton-text">Загрузка…</p>}
      {!loading && dash && (
        <>
          <div className="react-dash-chart-grid">
            <Card title="Динамика закрытых задач (30 дней)">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="cRmGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#cRmGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Задачи по статусам">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                    <XAxis dataKey="name" fontSize={11} interval={0} angle={-18} textAnchor="end" height={72} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="react-dash-cards">
            <Card title="Просрочено">
              <div className="react-dash-big-num">{dash.overdue_count || 0}</div>
            </Card>
            <Card title="Топ просроченных">
              {(dash.top_overdue || []).slice(0, 6).map((task) => (
                <div key={task.id} className="react-dash-row">
                  <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                </div>
              ))}
              {!(dash.top_overdue || []).length && <p className="muted">Нет просроченных</p>}
            </Card>
            <Card title="Недавно закрытые">
              {(dash.last_completed || []).slice(0, 6).map((task) => (
                <div key={task.id} className="react-dash-row">
                  <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                </div>
              ))}
              {!(dash.last_completed || []).length && <p className="muted">Нет выполненных</p>}
            </Card>
          </div>
        </>
      )}
      {!loading && !dash && <p className="muted">Нет данных</p>}
    </div>
  )
}
