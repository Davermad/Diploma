<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { theme as antTheme } from 'ant-design-vue'
import { useAuth } from './composables/useAuth'
import { themeMode } from './composables/appTheme'
import ThemeToggle from './components/ThemeToggle.vue'

const { user, logout } = useAuth()
const router = useRouter()
const userMenuOpen = ref(false)

function doLogout() {
  userMenuOpen.value = false
  logout()
  router.push('/login')
}

const antDesignTheme = computed(() => {
  const light = {
    token: {
      colorPrimary: '#16a34a',
      colorLink: '#15803d',
      colorSuccess: '#16a34a',
      borderRadius: 6,
      colorBorder: '#e7e5e4',
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorText: '#1c1917',
      colorTextSecondary: '#78716c',
      colorBgLayout: '#fafaf9',
      fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
      boxShadow: '0 1px 2px rgba(28, 25, 23, 0.06)',
      boxShadowSecondary: '0 6px 24px rgba(28, 25, 23, 0.08)',
    },
  }
  if (themeMode.value === 'dark') {
    return {
      algorithm: antTheme.darkAlgorithm,
      token: {
        colorPrimary: '#22c55e',
        colorLink: '#86efac',
        colorSuccess: '#22c55e',
        borderRadius: 6,
        colorBorder: '#44403c',
        colorBgContainer: '#292524',
        colorBgElevated: '#32302f',
        colorText: '#e7e5e4',
        colorTextSecondary: '#a8a29e',
        colorBgLayout: '#1c1917',
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        boxShadowSecondary: '0 8px 28px rgba(0, 0, 0, 0.35)',
      },
    }
  }
  return light
})
</script>

<template>
  <a-config-provider :theme="antDesignTheme">
    <div class="app-root">
      <template v-if="user">
        <header class="app-navbar">
          <router-link to="/" class="logo">Smart TODO</router-link>
          <nav class="nav-links">
            <router-link to="/">Дашборд</router-link>
            <router-link to="/projects">Проекты</router-link>
            <router-link to="/categories">Категории</router-link>
            <router-link to="/chat">Общий чат</router-link>
          </nav>
          <div class="nav-actions">
            <ThemeToggle />
            <div v-click-outside="() => (userMenuOpen = false)" class="user-menu">
              <a-button type="text" class="user-btn" @click.stop="userMenuOpen = !userMenuOpen">
                {{ user.email }} ▾
              </a-button>
              <div v-show="userMenuOpen" class="user-dropdown">
                <button type="button" class="dropdown-item" @click="doLogout">Выйти</button>
              </div>
            </div>
          </div>
        </header>
        <main class="main">
          <div class="main-inner">
            <router-view />
          </div>
        </main>
      </template>
      <div v-else class="guest-shell">
        <div class="guest-chrome">
          <ThemeToggle />
        </div>
        <router-view />
      </div>
    </div>
  </a-config-provider>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}
.app-navbar {
  display: flex;
  align-items: center;
  padding: 0 20px 0 22px;
  min-height: 56px;
  background: color-mix(in srgb, var(--vue-surface) 92%, var(--vue-bg) 8%);
  color: var(--vue-text);
  border-bottom: 1px solid var(--vue-border);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--vue-text) 6%, transparent);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.logo {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.03em;
  margin-right: 28px;
  color: var(--vue-primary) !important;
  text-decoration: none !important;
  padding: 8px 10px 8px 4px;
  border-radius: 6px;
  transition: background 0.18s ease;
}
.logo:hover {
  background: color-mix(in srgb, var(--vue-primary) 8%, var(--vue-surface)) !important;
}
.nav-links {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}
.nav-links a {
  color: var(--vue-nav-hover-fg);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 9px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.15s ease;
}
.nav-links a:hover {
  color: var(--vue-primary-dark);
  background: color-mix(in srgb, var(--vue-primary) 8%, var(--vue-surface));
  border-color: color-mix(in srgb, var(--vue-primary) 22%, var(--vue-border));
}
.nav-links a.router-link-active {
  color: var(--vue-primary-dark);
  background: color-mix(in srgb, var(--vue-primary) 10%, var(--vue-surface));
  border-color: color-mix(in srgb, var(--vue-primary) 28%, var(--vue-border));
}
.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 12px;
}
.user-menu {
  position: relative;
}
.user-btn {
  color: var(--vue-text) !important;
  background: var(--vue-surface) !important;
  border: 1px solid var(--vue-border) !important;
  border-radius: 6px !important;
  height: auto !important;
  padding: 8px 14px !important;
}
.user-btn:hover {
  background: var(--vue-surface-hover) !important;
  border-color: color-mix(in srgb, var(--vue-primary) 28%, var(--vue-border)) !important;
}
.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  background: var(--vue-surface);
  border-radius: 6px;
  border: 1px solid var(--vue-border);
  box-shadow: var(--vue-shadow-card);
  min-width: 160px;
  overflow: hidden;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 11px 18px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--vue-text);
  transition: background 0.15s ease;
}
.dropdown-item:hover {
  background: var(--vue-surface-hover);
}
.main {
  padding: 0;
  min-height: calc(100vh - 56px);
}
.guest-shell {
  position: relative;
  min-height: 100vh;
}
.guest-chrome {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 40;
}
</style>
