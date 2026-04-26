import { ref, watch } from 'vue'

/** Общий ключ с Svelte — тема синхронизируется между веб-клиентами на одном origin */
export const THEME_STORAGE_KEY = 'smart-todo-theme'

export const themeMode = ref('light')

export function initAppTheme() {
  if (typeof document === 'undefined') return
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY)
    if (t === 'dark' || t === 'light') themeMode.value = t
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.theme = themeMode.value
  watch(themeMode, (m) => {
    document.documentElement.dataset.theme = m
    try {
      localStorage.setItem(THEME_STORAGE_KEY, m)
    } catch {
      /* ignore */
    }
  })
}

export function toggleAppTheme() {
  themeMode.value = themeMode.value === 'dark' ? 'light' : 'dark'
}
