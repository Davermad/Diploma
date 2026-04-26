import { writable, derived } from 'svelte/store';

const THEME_STORAGE_KEY = 'smart-todo-theme';

/** @returns {'light' | 'dark'} */
function readStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === 'dark' || t === 'light') return t;
  } catch {
    /* ignore */
  }
  return 'light';
}

function applyThemeToDocument(/** @type {'light' | 'dark'} */ t) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
}

const initialTheme = readStoredTheme();
applyThemeToDocument(initialTheme);

/** Светлая / тёмная тема (stone + оранжевый акцент Svelte, стиль близкий к Loops) */
export const theme = writable(/** @type {'light' | 'dark'} */ (initialTheme));

theme.subscribe((t) => {
  applyThemeToDocument(t);
});

export function toggleTheme() {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}

export const location = writable(typeof window !== 'undefined' ? (window.location.hash.slice(1) || '/').split('?')[0] : '/');
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    location.set((window.location.hash.slice(1) || '/').split('?')[0]);
  });
}
import { auth as authApi } from './api.js';

export const user = writable(null);
export const token = writable(localStorage.getItem('token'));
/** false до первой проверки токена — чтобы не показывать дашборд без шапки и форму входа одновременно */
export const authReady = writable(false);

export const isAuthenticated = derived([user, token], ([$user, $token]) => !!$user || !!$token);

token.subscribe((t) => {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
});

export async function initAuth() {
  authReady.set(false);
  try {
    const t = localStorage.getItem('token');
    if (!t) {
      user.set(null);
      return;
    }
    try {
      const u = await authApi.me();
      user.set(u);
    } catch {
      token.set(null);
      user.set(null);
    }
  } finally {
    authReady.set(true);
  }
}

export async function login(email, password) {
  const { access_token } = await authApi.login(email, password);
  token.set(access_token);
  const u = await authApi.me();
  user.set(u);
  return u;
}

export async function register(email, password) {
  await authApi.register(email, password);
  return login(email, password);
}

export function logout() {
  token.set(null);
  user.set(null);
}
