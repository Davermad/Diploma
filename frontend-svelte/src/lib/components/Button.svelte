<script>
  export let type = 'primary';
  export let htmlType = 'button';
  export let disabled = false;
  export let loading = false;
  /** @type {'sm' | 'md'} */
  export let size = 'md';
</script>

<button
  type={htmlType}
  class="btn btn-{type} btn-{size}"
  disabled={disabled || loading}
  on:click
>
  {#if loading}
    <span class="btn-loading" aria-hidden="true"></span>
  {/if}
  <span class="btn-label"><slot /></span>
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: var(--radius-sm, 10px);
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background 0.18s var(--ease-out, ease),
      border-color 0.18s var(--ease-out, ease),
      box-shadow 0.18s var(--ease-out, ease),
      color 0.15s ease,
      transform 0.15s var(--ease-spring, ease);
    font-family: inherit;
    line-height: 1.25;
    white-space: nowrap;
  }
  .btn:focus-visible {
    outline: none;
    box-shadow: var(--focus-ring);
  }
  .btn-md {
    padding: 10px 20px;
    font-size: 0.9rem;
    min-height: 42px;
  }
  .btn-sm {
    padding: 7px 14px;
    font-size: 0.8125rem;
    min-height: 34px;
    border-radius: var(--radius-xs, 8px);
  }
  .btn-primary {
    background: var(--primary);
    color: #fff;
    border-color: transparent;
    box-shadow: none;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--primary-dark);
    box-shadow: none;
  }
  .btn-primary:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary-dark) 88%, #000);
    box-shadow: none;
  }
  .btn-default {
    background: var(--surface-hover);
    color: var(--text);
    border-color: transparent;
    box-shadow: none;
  }
  .btn-default:hover:not(:disabled) {
    color: var(--primary-dark);
    background: color-mix(in srgb, var(--primary) 10%, var(--surface-hover));
    box-shadow: none;
  }
  .btn-default:active:not(:disabled) {
    background: color-mix(in srgb, var(--primary) 14%, var(--surface-hover));
  }
  .btn-danger {
    background: color-mix(in srgb, var(--danger) 12%, var(--surface));
    color: var(--danger);
    border-color: transparent;
    box-shadow: none;
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--danger);
    color: #fff;
    box-shadow: none;
  }
  .btn-danger:active:not(:disabled) {
    background: color-mix(in srgb, var(--danger) 90%, #000);
    color: #fff;
  }
  .btn-ghost {
    background: transparent;
    color: var(--text-muted);
    border-color: transparent;
    box-shadow: none;
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 8%, transparent);
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-loading {
    display: inline-block;
    width: 15px;
    height: 15px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    flex-shrink: 0;
  }
  .btn-primary .btn-loading {
    border-color: rgba(255, 255, 255, 0.35);
    border-top-color: #fff;
  }
  .btn-label {
    display: inline-flex;
    align-items: center;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>

