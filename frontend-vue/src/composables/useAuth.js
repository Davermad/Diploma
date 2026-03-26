import { inject } from 'vue'
import { AUTH_INJECTION_KEY } from '../auth/createAuth'

export function useAuth() {
  const a = inject(AUTH_INJECTION_KEY)
  if (!a) {
    throw new Error('useAuth: нет AuthProvider')
  }
  return a
}
