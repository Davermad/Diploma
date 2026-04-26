import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from '../components/ThemeToggle'
import { useClickOutside } from '../hooks/useClickOutside'

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const ref = useClickOutside(closeMenu, menuOpen)

  return (
    <>
      <header className="app-navbar">
        <Link to="/" className="logo">
          Smart TODO
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Дашборд
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Проекты
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Категории
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Общий чат
          </NavLink>
        </nav>
        <div className="nav-actions">
          <ThemeToggle variant="onNav" />
          <div className="user-menu-wrap" ref={ref}>
            <button type="button" className="user-btn" onClick={() => setMenuOpen((v) => !v)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
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
      <main style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="main-inner">
          <Outlet />
        </div>
      </main>
    </>
  )
}
