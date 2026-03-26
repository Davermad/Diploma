<script setup>
import { ref, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'
import HelpPanel from './components/HelpPanel.vue'

/** Provide / Inject (ТЗ Vue): тема для дочерних компонентов */
provide('appTheme', { primary: '#178a5c' })

const { user, logout } = useAuth()
const router = useRouter()
const userMenuOpen = ref(false)
const helpOpen = ref(false)

function doLogout() {
  userMenuOpen.value = false
  logout()
  router.push('/login')
}

const greenTheme = {
  token: {
    colorPrimary: '#178a5c',
    colorLink: '#1a9d6a',
    borderRadius: 10,
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
}
</script>

<template>
  <a-config-provider :theme="greenTheme">
    <div class="app-root">
      <template v-if="user">
        <header class="app-navbar">
          <router-link to="/" class="logo">Smart TODO</router-link>
          <nav class="nav-links">
            <router-link to="/">Дашборд</router-link>
            <router-link to="/projects">Проекты</router-link>
            <router-link to="/categories">Категории</router-link>
            <router-link to="/chat">Общий чат</router-link>
            <a-button type="link" class="help-link" @click="helpOpen = true">Справка</a-button>
          </nav>
          <div v-click-outside="() => (userMenuOpen = false)" class="user-menu">
            <a-button type="text" class="user-btn" @click.stop="userMenuOpen = !userMenuOpen">
              {{ user.email }} ▾
            </a-button>
            <div v-show="userMenuOpen" class="user-dropdown">
              <button type="button" class="dropdown-item" @click="doLogout">Выйти</button>
            </div>
          </div>
        </header>
        <main class="main">
          <div class="main-inner">
            <router-view />
          </div>
        </main>
      </template>
      <router-view v-else />
    </div>

    <HelpPanel v-model:open="helpOpen" />
  </a-config-provider>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}
.app-navbar {
  display: flex;
  align-items: center;
  padding: 0 22px 0 24px;
  min-height: 58px;
  background: linear-gradient(125deg, #0d5c3d 0%, #178a5c 42%, #3cb878 100%);
  color: #fff;
  box-shadow: 0 8px 28px rgba(23, 138, 92, 0.28);
  position: sticky;
  top: 0;
  z-index: 100;
}
.logo {
  font-weight: 700;
  font-size: 1.08rem;
  letter-spacing: -0.03em;
  margin-right: 28px;
  color: #fff !important;
  text-decoration: none !important;
}
.nav-links {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
}
.nav-links a {
  color: rgba(255, 255, 255, 0.92);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.nav-links a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.2);
}
.nav-links a.router-link-active {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.25);
}
.help-link {
  color: rgba(255, 255, 255, 0.95) !important;
  font-weight: 600;
}
.user-menu {
  position: relative;
}
.user-btn {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.16) !important;
  border: 1px solid rgba(255, 255, 255, 0.28) !important;
}
.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--vue-border);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
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
}
.dropdown-item:hover {
  background: #f4faf6;
}
.main {
  padding: 0;
  min-height: calc(100vh - 58px);
}
</style>
