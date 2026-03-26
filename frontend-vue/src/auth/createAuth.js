import { ref, watch } from 'vue'
import { auth as authApi } from '../api/client'

export const AUTH_INJECTION_KEY = Symbol('auth')

export function createAuth() {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const authReady = ref(false)

  // Без flush: 'sync' watch откладывается — после login() me() уходит без Bearer (401), как в Svelte с subscribe.
  watch(
    token,
    (v) => {
      if (v) localStorage.setItem('token', v)
      else localStorage.removeItem('token')
    },
    { flush: 'sync' }
  )

  async function initAuth() {
    authReady.value = false
    try {
      const t = localStorage.getItem('token')
      if (!t) {
        user.value = null
        return
      }
      try {
        const u = await authApi.me()
        user.value = u
      } catch {
        token.value = null
        user.value = null
      }
    } finally {
      authReady.value = true
    }
  }

  async function login(email, password) {
    const { access_token } = await authApi.login(email, password)
    // Сразу в storage — getToken() в api/client.js читает localStorage; без этого me() после логина шёл без Bearer (401).
    localStorage.setItem('token', access_token)
    token.value = access_token
    const u = await authApi.me()
    user.value = u
    return u
  }

  async function register(email, password) {
    await authApi.register(email, password)
    return login(email, password)
  }

  function logout() {
    token.value = null
    user.value = null
  }

  return {
    user,
    token,
    authReady,
    initAuth,
    login,
    register,
    logout,
  }
}
