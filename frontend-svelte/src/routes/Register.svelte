<script>
  import { push } from 'svelte-spa-router';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';
  import FormItem from '../lib/components/FormItem.svelte';
  import { register } from '../lib/stores.js';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    loading = true;
    try {
      await register(email, password);
      push('/');
    } catch (err) {
      error = err.message || 'Ошибка регистрации';
    } finally {
      loading = false;
    }
  }
</script>

<div class="register-page">
  <div class="register-box">
    <p class="auth-brand">Smart TODO</p>
    <h1>Регистрация</h1>
    <form on:submit={handleSubmit}>
      {#if error}
        <div class="form-banner-error" role="alert">{error}</div>
      {/if}
      <FormItem label="Email">
        <Input type="email" bind:value={email} placeholder="email@example.com" required />
      </FormItem>
      <FormItem label="Пароль">
        <Input type="password" bind:value={password} placeholder="Пароль" required minlength={8} />
      </FormItem>
      <Button type="primary" htmlType="submit" {loading}>Зарегистрироваться</Button>
    </form>
    <p class="register-footer">
      Уже есть аккаунт? <a href="#/login">Войти</a>
    </p>
  </div>
</div>

<style>
  .register-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--bg);
    background-image: var(--bg-accent);
    background-attachment: fixed;
  }
  .register-box {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: var(--surface);
    padding: 36px 36px 32px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .register-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-dark), var(--primary), var(--primary-light));
  }
  .auth-brand {
    margin: 0 0 6px;
    text-align: center;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--primary);
  }
  .register-box h1 {
    margin: 0 0 26px;
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: -0.03em;
  }
  .register-footer {
    margin-top: 16px;
    text-align: center;
    font-size: 14px;
  }
  .register-footer a {
    color: var(--primary);
  }
  .form-banner-error {
    background: var(--danger-soft, #fdf4f4);
    border: 1px solid var(--danger-border);
    color: var(--danger, #c23b3b);
    padding: 12px 14px;
    border-radius: var(--radius-sm);
    margin-bottom: 18px;
    font-size: 0.875rem;
    line-height: 1.45;
  }
</style>
