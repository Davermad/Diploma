<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuth } from '../composables/useAuth'

const { register } = useAuth()
const router = useRouter()

const formState = reactive({
  email: '',
  password: '',
})
const loading = ref(false)

const passwordRules = [
  { required: true, message: 'Введите пароль' },
  { type: 'string', min: 8, message: 'Минимум 8 символов' },
]

async function onSubmit() {
  loading.value = true
  try {
    await register(formState.email, formState.password)
    router.push('/')
  } catch (e) {
    message.error(e.message || 'Ошибка регистрации')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <a-card class="auth-card" :bordered="false">
      <p class="auth-brand">Smart TODO</p>
      <h1>Регистрация</h1>
      <a-form :model="formState" layout="vertical" @finish="onSubmit">
        <a-form-item label="Email" name="email" :rules="[{ required: true, message: 'Введите email' }]">
          <a-input v-model:value="formState.email" type="email" placeholder="email@example.com" size="large" />
        </a-form-item>
        <a-form-item label="Пароль" name="password" :rules="passwordRules">
          <a-input-password v-model:value="formState.password" placeholder="Пароль" size="large" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" block size="large" :loading="loading">
            Зарегистрироваться
          </a-button>
        </a-form-item>
      </a-form>
      <p class="auth-footer">
        Уже есть аккаунт?
        <router-link to="/login">Войти</router-link>
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
  border-radius: 8px !important;
  box-shadow: var(--vue-shadow-card);
  border: 1px solid var(--vue-border) !important;
}
.auth-card::before {
  content: '';
  display: block;
  height: 3px;
  margin: -24px -24px 20px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, var(--vue-primary-dark), var(--vue-primary), var(--vue-primary-light));
}
.auth-brand {
  margin: 0 0 6px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vue-primary);
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
