import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth as authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setAuthReady(false)
      try {
        const t = localStorage.getItem('token')
        if (!t) {
          if (!cancelled) setUser(null)
          return
        }
        try {
          const u = await authApi.me()
          if (!cancelled) setUser(u)
        } catch {
          localStorage.removeItem('token')
          if (!cancelled) setUser(null)
        }
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token } = await authApi.login(email, password)
    localStorage.setItem('token', access_token)
    const u = await authApi.me()
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (email, password, display_name) => {
    await authApi.register(email, password, display_name)
    return login(email, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, authReady, login, register, logout }),
    [user, authReady, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth: AuthProvider required')
  return ctx
}
