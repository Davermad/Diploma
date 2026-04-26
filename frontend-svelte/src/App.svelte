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
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
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
      <div class="nav-actions">
        <ThemeToggle variant="onNav" />
        <div class="user-menu" use:clickOutside={() => (userMenuOpen = false)}>
          <button type="button" class="user-btn" on:click={() => (userMenuOpen = !userMenuOpen)}>
            <span class="user-email">{$user.email}</span>
            <span class="user-chevron" aria-hidden="true">▾</span>
          </button>
          {#if userMenuOpen}
            <div class="user-dropdown">
              <button type="button" on:click={() => { logout(); push('/login'); userMenuOpen = false; }}>Выйти</button>
            </div>
          {/if}
        </div>
      </div>
    </nav>
    <main class="main">
      <div class="main-inner">
        <Router {routes} />
      </div>
    </main>
  {:else}
    <div class="guest-shell">
      <div class="guest-chrome">
        <ThemeToggle variant="default" />
      </div>
      <Router {routes} />
    </div>
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
    padding: 0 20px 0 22px;
    min-height: 56px;
    background: var(--nav-bg);
    color: var(--nav-control-fg);
    box-shadow: var(--nav-shadow);
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .logo {
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: -0.03em;
    margin-right: 28px;
    color: var(--primary);
    text-decoration: none;
    padding: 8px 10px 8px 4px;
    border-radius: var(--radius-sm);
    transition:
      background 0.18s ease,
      opacity 0.15s ease;
  }
  .logo:hover {
    text-decoration: none;
    background: var(--nav-link-hover-bg);
    opacity: 1;
  }
  .logo:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--nav-focus-ring);
  }
  .nav-links {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 10px;
    align-items: center;
  }
  .nav-links a {
    color: var(--nav-link-fg);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 9px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    transition:
      background 0.18s var(--ease-out, ease),
      border-color 0.18s ease,
      color 0.15s ease;
  }
  .nav-links a:hover {
    color: var(--primary-dark);
    text-decoration: none;
    background: var(--nav-link-hover-bg);
    border-color: var(--nav-link-hover-border);
  }
  .nav-links a:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--nav-focus-ring);
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
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: min(240px, 36vw);
    background: var(--nav-control-bg);
    border: 1px solid var(--nav-control-border);
    color: var(--nav-control-fg);
    padding: 8px 14px;
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
  .user-email {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .user-chevron {
    flex-shrink: 0;
    opacity: 0.85;
    font-size: 0.7rem;
  }
  .user-btn:hover {
    background: var(--nav-control-bg-hover);
    border-color: var(--nav-control-border-hover);
  }
  .user-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--nav-focus-ring);
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
    background: var(--surface-hover);
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
