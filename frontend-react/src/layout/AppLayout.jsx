import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { useClickOutside } from '../hooks/useClickOutside'
import { notifications as notificationsApi, searchApi } from '../api/client'
import { BellIcon } from '../components/BellIcon'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const refMenu = useClickOutside(closeMenu, menuOpen)
  const closeBell = useCallback(() => setBellOpen(false), [])
  const refBell = useClickOutside(closeBell, bellOpen)

  const refreshNotifications = useCallback(async () => {
    try {
      const rows = await notificationsApi.list(true, 15)
      setNotes(rows)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    if (bellOpen) refreshNotifications()
  }, [bellOpen, refreshNotifications])

  async function handleSearchSubmit(e) {
    e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    try {
      const res = await searchApi.query(q)
      const first = res.tasks?.[0]
      if (first) navigate(`/tasks/${first.id}`)
      else alert('Ничего не найдено')
    } catch (err) {
      alert(err.message || String(err))
    }
  }

  const unreadCount = notes?.length || 0

  const nav = (
    <>
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Аналитика
      </NavLink>
      <NavLink to="/board" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Kanban
      </NavLink>
      <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Проекты
      </NavLink>
      <NavLink to="/categories" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Метки
      </NavLink>
      <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : undefined)}>
        Чат
      </NavLink>
    </>
  )

  return (
    <div className="react-crm-shell">
      <aside className="react-crm-sider">
        <Link to="/" className="react-crm-brand">
          Pulse<span>Board</span>
        </Link>
        <nav className="react-crm-sider-nav">{nav}</nav>
        <div className="react-crm-sider-foot muted">React · SPA · Vite</div>
      </aside>
      <div className="react-crm-main">
        <header className="react-crm-topbar">
          <form className="react-crm-search" onSubmit={handleSearchSubmit}>
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Поиск задач по названию…"
              aria-label="Поиск"
            />
          </form>
          <div className="react-crm-topbar-actions">
            <ThemeToggle variant="onNav" />
            <div className="notif-wrap" ref={refBell}>
              <button
                type="button"
                className="notif-bell"
                aria-expanded={bellOpen}
                aria-label="Уведомления"
                title="Уведомления (например, когда вас назначили исполнителем)"
                onClick={() => setBellOpen((v) => !v)}
              >
                <BellIcon />
                <span className="notif-bell-label">Уведомления</span>
                {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
              </button>
              {bellOpen && (
                <div className="notif-dropdown">
                  <div className="notif-dropdown-head">
                    <strong>Уведомления</strong>
                    <button
                      type="button"
                      className="linkish"
                      onClick={async () => {
                        await notificationsApi.markAllRead()
                        await refreshNotifications()
                      }}
                    >
                      Прочитать все
                    </button>
                  </div>
                  <p className="notif-hint muted">
                    Здесь появляются события с сервера (например, назначение исполнителем). Если список пуст —
                    создайте второго пользователя и назначьте его на задачу или попросите коллегу назначить вас.
                  </p>
                  {notes.length === 0 && <p className="muted pad-sm">Нет непрочитанных</p>}
                  {notes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="notif-item"
                      onClick={async () => {
                        await notificationsApi.markRead(n.id)
                        await refreshNotifications()
                        setBellOpen(false)
                        if (n.link) {
                          const path = n.link.replace(/^.*#\//, '').replace(/^\//, '')
                          navigate('/' + path)
                        }
                      }}
                    >
                      <span className="notif-title">{n.title}</span>
                      <span className="notif-body">{n.body}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="user-menu-wrap" ref={refMenu}>
              <button type="button" className="user-btn" onClick={() => setMenuOpen((v) => !v)}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.display_name || user?.email}
                </span>
                <span aria-hidden>{'\u25be'}</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu()
                      logout()
                      navigate('/login', { replace: true })
                    }}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="react-crm-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
