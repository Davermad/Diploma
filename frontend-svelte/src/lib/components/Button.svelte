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
    box-shadow: var(--focus-ring, 0 0 0 3px rgba(224, 120, 32, 0.25));
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
    background: linear-gradient(165deg, var(--primary-light, #f4a742) 0%, var(--primary) 52%, var(--primary-dark, #c45f12) 100%);
    color: #fff;
    border-color: color-mix(in srgb, var(--primary-dark) 55%, #000);
    box-shadow: var(--shadow-button, 0 2px 8px rgba(192, 90, 20, 0.2));
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
  }
  .btn-primary:hover:not(:disabled) {
    filter: brightness(1.04);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 35%, transparent);
    transform: translateY(-1px);
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
    filter: brightness(0.98);
  }
  .btn-default {
    background: var(--surface, #fff);
    color: var(--text);
    border-color: var(--border);
    box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.04));
  }
  .btn-default:hover:not(:disabled) {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    background: var(--surface-hover, #fffaf5);
    box-shadow: 0 4px 14px rgba(26, 23, 20, 0.06);
    transform: translateY(-1px);
  }
  .btn-default:active:not(:disabled) {
    transform: translateY(0);
  }
  .btn-danger {
    background: var(--surface, #fff);
    color: var(--danger, #c23b3b);
    border-color: var(--danger-border);
    box-shadow: var(--shadow-sm);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--danger-soft, #fdf4f4);
    border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
    box-shadow: 0 4px 14px color-mix(in srgb, var(--danger) 12%, transparent);
    transform: translateY(-1px);
  }
  .btn-danger:active:not(:disabled) {
    transform: translateY(0);
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
