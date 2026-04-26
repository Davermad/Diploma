import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeToggle } from './components/ThemeToggle'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { TaskDetailPage } from './pages/TaskDetailPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { GlobalChatPage } from './pages/GlobalChatPage'

function ProtectedLayout() {
  const { user, authReady } = useAuth()
  const location = useLocation()
  if (!authReady) {
    return (
      <div className="auth-loading" role="status">
        <span className="auth-spinner" />
        <span>Проверка сессии…</span>
      </div>
    )
  }
  if (!user) {
    const to = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={to} replace state={{ from: location }} />
  }
  return <AppLayout />
}

function GuestChrome({ children }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="guest-chrome">
        <ThemeToggle />
      </div>
      {children}
    </div>
  )
}

function LoginRoute() {
  const { user, authReady } = useAuth()
  if (!authReady) {
    return (
      <div className="auth-loading" role="status">
        <span className="auth-spinner" />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />
  return (
    <GuestChrome>
      <LoginPage />
    </GuestChrome>
  )
}

function RegisterRoute() {
  const { user, authReady } = useAuth()
  if (!authReady) {
    return (
      <div className="auth-loading" role="status">
        <span className="auth-spinner" />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />
  return (
    <GuestChrome>
      <RegisterPage />
    </GuestChrome>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="chat" element={<GlobalChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
