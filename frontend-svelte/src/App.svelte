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
  <title>Pulse — Svelte</title>
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
    <header class="sv-topnav">
      <div class="sv-topnav-inner">
        <a href="#/" class="sv-brand">pulse<span>svelte</span></a>
        <nav class="sv-pills">
          <a href="#/" class:sv-active={$location === '/' }>Лента</a>
          <a href="#/projects" class:sv-active={$location.startsWith('/projects')}>Проекты</a>
          <a href="#/categories" class:sv-active={$location.startsWith('/categories')}>Метки</a>
          <a href="#/chat" class:sv-active={$location.startsWith('/chat')}>Чат</a>
        </nav>
        <div class="nav-actions">
          <ThemeToggle variant="onNav" />
          <div class="user-menu" use:clickOutside={() => (userMenuOpen = false)}>
            <button type="button" class="user-btn" on:click={() => (userMenuOpen = !userMenuOpen)}>
              <span class="user-email">{$user.display_name || $user.email}</span>
              <span class="user-chevron" aria-hidden="true">▾</span>
            </button>
            {#if userMenuOpen}
              <div class="user-dropdown">
                <button type="button" on:click={() => { logout(); push('/login'); userMenuOpen = false; }}>Выйти</button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </header>
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
  .sv-topnav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
    box-shadow: 0 12px 40px color-mix(in srgb, var(--text) 6%, transparent);
  }
  .sv-topnav-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .sv-brand {
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: -0.05em;
    color: var(--text);
    text-decoration: none;
    margin-right: 8px;
  }
  .sv-brand span {
    color: var(--primary);
    margin-left: 2px;
  }
  .sv-pills {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
  .sv-pills a {
    text-decoration: none;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid transparent;
    color: var(--nav-link-fg);
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.15s ease;
  }
  .sv-pills a:hover {
    background: var(--nav-link-hover-bg);
    border-color: var(--nav-link-hover-border);
    color: var(--primary-dark);
  }
  .sv-pills a.sv-active {
    background: color-mix(in srgb, var(--primary) 14%, var(--surface));
    border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
    color: var(--primary-dark);
  }
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
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
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 16px;
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
