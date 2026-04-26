import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { FormItem } from '../components/FormItem'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const q = searchParams.get('redirect')
      const from = location.state?.from
      const target =
        (q && q.startsWith('/') ? q : null) ||
        (typeof from === 'string' ? from : from?.pathname) ||
        '/'
      navigate(target, { replace: true })
    } catch (err) {
      setError(err.message || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <p className="auth-brand">Smart TODO</p>
        <h1>Вход</h1>
        <form onSubmit={onSubmit}>
          {error && (
            <div className="form-banner-error" role="alert">
              {error}
            </div>
          )}
          <FormItem label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </FormItem>
          <FormItem label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              required
            />
          </FormItem>
          <Button type="primary" htmlType="submit" loading={loading}>
            Войти
          </Button>
        </form>
        <p className="auth-footer">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </div>
  )
}
