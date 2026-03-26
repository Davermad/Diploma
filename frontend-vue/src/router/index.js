import { createRouter, createWebHashHistory } from 'vue-router'
import { auth } from '../auth'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('../views/ProjectsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:id',
    name: 'project-detail',
    component: () => import('../views/ProjectDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks/:id',
    name: 'task-detail',
    component: () => import('../views/TaskDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/chat',
    name: 'global-chat',
    component: () => import('../views/GlobalChatView.vue'),
    meta: { requiresAuth: true },
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  if (!auth.authReady.value) {
    next()
    return
  }
  if (to.meta.requiresAuth && !auth.user.value) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  if (to.meta.guestOnly && auth.user.value) {
    next({ name: 'dashboard' })
    return
  }
  next()
})
