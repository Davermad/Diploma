<script>
  import { theme, toggleTheme } from '../stores.js';

  /** @type {'default' | 'onNav'} */
  export let variant = 'default';
</script>

<button
  type="button"
  class="theme-toggle theme-toggle--{variant}"
  on:click={toggleTheme}
  aria-label={$theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
  title={$theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
>
  {#if $theme === 'dark'}
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  {:else}
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    transition:
      background 0.18s var(--ease-out, ease),
      border-color 0.18s ease,
      color 0.15s ease,
      box-shadow 0.18s ease,
      transform 0.15s var(--ease-spring, ease);
  }
  .theme-toggle:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .theme-toggle:active:not(:disabled) {
    transform: scale(0.96);
  }
  .theme-toggle--default {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-muted);
    box-shadow: var(--shadow-sm);
  }
  .theme-toggle--default:hover {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
    background: var(--surface-hover);
    box-shadow: var(--shadow-md);
  }
  .theme-toggle--onNav {
    background: var(--nav-control-bg);
    border: 1px solid var(--nav-control-border);
    color: var(--nav-control-fg);
    box-shadow: none;
  }
  .theme-toggle--onNav:hover {
    background: var(--nav-control-bg-hover);
    border-color: var(--nav-control-border-hover);
    color: var(--nav-control-fg);
  }
  .theme-toggle--onNav:focus-visible {
    box-shadow: 0 0 0 3px var(--nav-focus-ring);
  }
  .icon {
    width: 20px;
    height: 20px;
  }
</style>
