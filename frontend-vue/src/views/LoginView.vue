<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuth } from '../composables/useAuth'

const { login } = useAuth()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await login(email.value, password.value)
    const r = route.query.redirect
    router.push(typeof r === 'string' ? r : '/')
  } catch (e) {
    message.error(e.message || 'Ошибка входа')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <a-card class="auth-card" :bordered="false">
      <p class="auth-brand">Smart TODO</p>
      <h1>Вход</h1>
      <a-form layout="vertical" @finish="onSubmit">
        <a-form-item label="Email" name="email" :rules="[{ required: true, message: 'Введите email' }]">
          <a-input v-model:value="email" type="email" placeholder="email@example.com" size="large" />
        </a-form-item>
        <a-form-item label="Пароль" name="password" :rules="[{ required: true, message: 'Введите пароль' }]">
          <a-input-password v-model:value="password" placeholder="Пароль" size="large" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" block size="large" :loading="loading">Войти</a-button>
        </a-form-item>
      </a-form>
      <p class="auth-footer">
        Нет аккаунта?
        <router-link to="/register">Регистрация</router-link>
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: 14px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--vue-border) !important;
}
.auth-card::before {
  content: '';
  display: block;
  height: 4px;
  margin: -24px -24px 20px;
  border-radius: 14px 14px 0 0;
  background: linear-gradient(90deg, #0d5c3d, #178a5c, #3cb878);
}
.auth-brand {
  margin: 0 0 6px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #178a5c;
}
h1 {
  margin: 0 0 24px;
  text-align: center;
  font-size: 1.5rem;
}
.auth-footer {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--vue-text-muted);
}
</style>
