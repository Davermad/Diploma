<script setup>
import { themeMode, toggleAppTheme } from '../composables/appTheme'
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="themeMode === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'"
    :title="themeMode === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
    @click="toggleAppTheme"
  >
    <svg
      v-if="themeMode === 'dark'"
      class="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg
      v-else
      class="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  background: var(--vue-surface);
  border: 1px solid var(--vue-border);
  color: var(--vue-text-muted);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--vue-text) 6%, transparent);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.15s ease;
}
.theme-toggle:hover {
  color: var(--vue-primary);
  border-color: color-mix(in srgb, var(--vue-primary) 35%, var(--vue-border));
  background: var(--vue-surface-hover);
}
.theme-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--vue-surface), 0 0 0 4px color-mix(in srgb, var(--vue-primary) 30%, transparent);
}
.icon {
  width: 20px;
  height: 20px;
}
</style>
