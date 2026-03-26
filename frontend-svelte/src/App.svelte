<script>
  import Router, { push } from 'svelte-spa-router';
  import { onMount } from 'svelte';
  import { user, location, initAuth, logout, authReady } from './lib/stores.js';
  import Dashboard from './routes/Dashboard.svelte';
  import Login from './routes/Login.svelte';
  import Register from './routes/Register.svelte';
  import Projects from './routes/Projects.svelte';
  import ProjectDetail from './routes/ProjectDetail.svelte';
  import TaskDetail from './routes/TaskDetail.svelte';
  import Categories from './routes/Categories.svelte';
  import GlobalChat from './routes/GlobalChat.svelte';
  import { clickOutside } from './lib/actions.js';

  const routes = {
    '/': Dashboard,
    '/login': Login,
    '/register': Register,
    '/projects': Projects,
    '/projects/:id': ProjectDetail,
    '/tasks/:id': TaskDetail,
    '/categories': Categories,
    '/chat': GlobalChat,
  };

  let userMenuOpen = false;

  onMount(initAuth);

  $: if ($authReady && !$user && $location !== '/login' && $location !== '/register') {
    push('/login');
  }
</script>

<svelte:head>
  <title>Smart TODO — Svelte</title>
</svelte:head>

<div class="app">
  {#if !$authReady}
    <div class="auth-loading" role="status" aria-live="polite">
      <div class="auth-loading-inner">
        <span class="auth-spinner"></span>
        <span>Проверка сессии…</span>
      </div>
    </div>
  {:else if $user}
    <nav class="navbar">
      <a href="#/" class="logo">Smart TODO</a>
      <div class="nav-links">
        <a href="#/">Дашборд</a>
        <a href="#/projects">Проекты</a>
        <a href="#/categories">Категории</a>
        <a href="#/chat">Общий чат</a>
      </div>
      <div class="user-menu" use:clickOutside={() => (userMenuOpen = false)}>
        <button class="user-btn" on:click={() => (userMenuOpen = !userMenuOpen)}>
          {$user.email} ▾
        </button>
        {#if userMenuOpen}
          <div class="user-dropdown">
            <button on:click={() => { logout(); push('/login'); userMenuOpen = false; }}>Выйти</button>
          </div>
        {/if}
      </div>
    </nav>
    <main class="main">
      <div class="main-inner">
        <Router {routes} />
      </div>
    </main>
  {:else}
    <Router {routes} />
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    background: var(--bg);
  }
  .auth-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    background-image: var(--bg-accent);
  }
  .auth-loading-inner {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-muted);
    font-size: 0.95rem;
  }
  .auth-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .navbar {
    display: flex;
    align-items: center;
    padding: 0 22px 0 24px;
    min-height: 58px;
    background: linear-gradient(125deg, #c75008 0%, var(--primary) 42%, #e8943d 100%);
    color: white;
    box-shadow: 0 8px 32px color-mix(in srgb, var(--primary) 28%, transparent);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .logo {
    font-weight: 700;
    font-size: 1.08rem;
    letter-spacing: -0.03em;
    margin-right: 32px;
    color: white;
    text-decoration: none;
    padding: 6px 0;
  }
  .logo:hover {
    text-decoration: none;
    opacity: 0.94;
  }
  .nav-links {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
  }
  .nav-links a {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid transparent;
    transition:
      background 0.18s var(--ease-out, ease),
      border-color 0.18s ease,
      color 0.15s ease;
  }
  .nav-links a:hover {
    color: white;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .user-menu {
    position: relative;
  }
  .user-btn {
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.28);
    color: white;
    padding: 9px 16px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }
  .user-btn:hover {
    background: rgba(255, 255, 255, 0.26);
    border-color: rgba(255, 255, 255, 0.38);
  }
  .user-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.35);
  }
  .user-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 10px;
    background: var(--surface);
    color: var(--text);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    min-width: 160px;
  }
  .user-dropdown button {
    display: block;
    width: 100%;
    padding: 11px 18px;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--text);
    transition: background 0.15s ease;
  }
  .user-dropdown button:hover {
    background: var(--surface-hover, #fffaf5);
  }
  .user-dropdown button:focus-visible {
    outline: none;
    background: var(--surface-hover);
  }
  .main {
    padding: 0;
    min-height: calc(100vh - 56px);
  }
  .main-inner {
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
