<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { theme as antTheme } from 'ant-design-vue'
import { useAuth } from './composables/useAuth'
import { themeMode } from './composables/appTheme'
import ThemeToggle from './components/ThemeToggle.vue'
import { searchApi, notifications as notificationsApi } from './api/client'

const { user, logout } = useAuth()
const router = useRouter()
const route = useRoute()
const userMenuOpen = ref(false)
const collapsed = ref(false)
const selectedKeys = ref(['dash'])
const searchVal = ref('')
const notifs = ref([])

watch(
  () => route.path,
  (p) => {
    if (p === '/') selectedKeys.value = ['dash']
    else if (p.startsWith('/projects')) selectedKeys.value = ['projects']
    else if (p.startsWith('/categories')) selectedKeys.value = ['categories']
    else if (p.startsWith('/chat')) selectedKeys.value = ['chat']
    else selectedKeys.value = []
  },
  { immediate: true }
)

function doLogout() {
  userMenuOpen.value = false
  logout()
  router.push('/login')
}

function onMenuClick({ key }) {
  const paths = { dash: '/', projects: '/projects', categories: '/categories', chat: '/chat' }
  if (paths[key]) router.push(paths[key])
}

async function fetchNotifs() {
  try {
    notifs.value = await notificationsApi.list(true, 14)
  } catch {
    notifs.value = []
  }
}

onMounted(fetchNotifs)

function onNotifOpen(open) {
  if (open) fetchNotifs()
}

async function onGlobalSearch() {
  const q = searchVal.value.trim()
  if (!q) return
  try {
    const res = await searchApi.query(q)
    const first = res.tasks?.[0]
    if (first) router.push('/tasks/' + first.id)
    else window.alert('Ничего не найдено')
  } catch (e) {
    window.alert(e.message || String(e))
  }
}

async function openNotification(n) {
  try {
    await notificationsApi.markRead(n.id)
    await fetchNotifs()
    if (n.link) {
      const path = n.link.replace(/^.*#\//, '').replace(/^\//, '')
      router.push('/' + path)
    }
  } catch {
    /* ignore */
  }
}

async function clearAllNotifs() {
  await notificationsApi.markAllRead()
  await fetchNotifs()
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
      colorBgLayout: '#f5f5f4',
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
        <a-layout class="vue-crm-layout">
          <a-layout-sider
            v-model:collapsed="collapsed"
            collapsible
            theme="dark"
            class="vue-crm-sider"
            width="228"
            :collapsed-width="72"
          >
            <div class="vue-crm-logo" :class="{ 'vue-crm-logo--collapsed': collapsed }">
              <template v-if="!collapsed">Pulse<span>CRM</span></template>
              <template v-else>P</template>
            </div>
            <a-menu
              theme="dark"
              mode="inline"
              :inline-collapsed="collapsed"
              :selected-keys="selectedKeys"
              @click="onMenuClick"
            >
              <a-menu-item key="dash" title="Рабочий стол">
                <template #icon>
                  <span class="vue-menu-ico" aria-hidden="true">⌂</span>
                </template>
                <span>Рабочий стол</span>
              </a-menu-item>
              <a-menu-item key="projects" title="Проекты и задачи">
                <template #icon>
                  <span class="vue-menu-ico" aria-hidden="true">▦</span>
                </template>
                <span>Проекты и задачи</span>
              </a-menu-item>
              <a-menu-item key="categories" title="Метки">
                <template #icon>
                  <span class="vue-menu-ico" aria-hidden="true">◆</span>
                </template>
                <span>Метки</span>
              </a-menu-item>
              <a-menu-item key="chat" title="Общий чат">
                <template #icon>
                  <span class="vue-menu-ico" aria-hidden="true">💬</span>
                </template>
                <span>Общий чат</span>
              </a-menu-item>
            </a-menu>
            <div v-if="!collapsed" class="vue-crm-sider-note">Vue 3 · Ant Design Vue</div>
          </a-layout-sider>
          <a-layout>
            <a-layout-header class="vue-crm-header">
              <div class="vue-crm-search-wrap">
                <a-input-search
                  v-model:value="searchVal"
                  placeholder="Глобальный поиск задач…"
                  allow-clear
                  enter-button
                  style="max-width: 420px"
                  @search="onGlobalSearch"
                />
              </div>
              <div class="vue-crm-header-right">
                <ThemeToggle />
                <a-popover trigger="click" placement="bottomRight" @open-change="onNotifOpen">
                  <template #content>
                    <div class="vue-notif-panel">
                      <div class="vue-notif-head">
                        <strong>Уведомления</strong>
                        <a-button type="link" size="small" @click="clearAllNotifs">Очистить</a-button>
                      </div>
                      <p class="vue-notif-hint muted">
                        Список приходит с сервера. Событие создаётся, например, когда вас назначили исполнителем задачи (другим
                        пользователем).
                      </p>
                      <div v-if="!notifs.length" class="vue-notif-empty muted">Нет непрочитанных</div>
                      <button
                        v-for="n in notifs"
                        :key="n.id"
                        type="button"
                        class="vue-notif-row"
                        @click="openNotification(n)"
                      >
                        <span class="vue-notif-title">{{ n.title }}</span>
                        <span class="vue-notif-body">{{ n.body }}</span>
                      </button>
                    </div>
                  </template>
                  <a-badge :count="notifs.length" :overflow-count="99">
                    <a-button type="default" class="vue-notif-btn" title="Уведомления">
                      <svg class="vue-bell-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                      </svg>
                      <span class="vue-notif-btn-label">Уведомления</span>
                    </a-button>
                  </a-badge>
                </a-popover>
                <div v-click-outside="() => (userMenuOpen = false)" class="user-menu">
                  <a-button type="text" class="user-btn" @click.stop="userMenuOpen = !userMenuOpen">
                    {{ user.display_name || user.email }} ▾
                  </a-button>
                  <div v-show="userMenuOpen" class="user-dropdown">
                    <button type="button" class="dropdown-item" @click="doLogout">Выйти</button>
                  </div>
                </div>
              </div>
            </a-layout-header>
            <a-layout-content class="vue-crm-content">
              <router-view />
            </a-layout-content>
          </a-layout>
        </a-layout>
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
.vue-crm-layout {
  min-height: 100vh;
}
.vue-crm-sider {
  position: relative;
}
.vue-crm-logo {
  padding: 18px 16px 12px;
  font-weight: 800;
  font-size: 1.05rem;
  color: #fafaf9;
  letter-spacing: -0.03em;
}
.vue-crm-logo span {
  color: #86efac;
}
.vue-crm-logo--collapsed {
  padding: 18px 8px 12px;
  text-align: center;
  font-size: 1.25rem;
}
.vue-menu-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
}
.vue-crm-sider-note {
  position: absolute;
  bottom: 48px;
  left: 16px;
  right: 16px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
}
.vue-crm-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: var(--vue-surface);
  border-bottom: 1px solid var(--vue-border);
}
.vue-crm-search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
}
.vue-crm-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.vue-crm-content {
  margin: 20px 24px 32px;
  min-height: 280px;
}
.user-menu {
  position: relative;
}
.user-btn {
  color: var(--vue-text) !important;
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
}
.dropdown-item:hover {
  background: var(--vue-surface-hover);
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
.vue-notif-btn {
  display: inline-flex !important;
  align-items: center;
  gap: 8px;
}
.vue-notif-btn-label {
  font-weight: 600;
  font-size: 0.8125rem;
}
@media (max-width: 960px) {
  .vue-notif-btn-label {
    display: none;
  }
}
.vue-bell-svg {
  flex-shrink: 0;
  color: var(--vue-text);
}
.vue-notif-hint {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.78rem;
  line-height: 1.45;
  border-bottom: 1px solid var(--vue-border);
}
.vue-notif-panel {
  width: 320px;
  max-height: 360px;
  overflow-y: auto;
  background: var(--vue-surface);
  border-radius: 8px;
  box-shadow: var(--vue-shadow-card);
  border: 1px solid var(--vue-border);
}
.vue-notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--vue-border);
}
.vue-notif-empty {
  padding: 14px 12px;
  font-size: 0.875rem;
}
.vue-notif-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--vue-border);
  background: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.vue-notif-row:hover {
  background: var(--vue-surface-hover);
}
.vue-notif-title {
  font-weight: 600;
  font-size: 0.8125rem;
}
.vue-notif-body {
  font-size: 0.75rem;
  color: var(--vue-text-secondary);
}
</style>
