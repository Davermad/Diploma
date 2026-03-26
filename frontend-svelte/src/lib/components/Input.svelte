<script>
  export let value = '';
  export let type = 'text';
  export let placeholder = '';
  export let disabled = false;
  export let required = false;
  /** @type {number | undefined} */
  export let minlength = undefined;
</script>

<input
  type={type}
  bind:value
  {placeholder}
  {disabled}
  {required}
  minlength={minlength}
  class="input"
  on:input
  on:change
  on:keydown
/>

<style>
  .input {
    width: 100%;
    padding: 11px 14px;
    font-size: 0.9rem;
    border: 1px solid var(--border, #e8e0d6);
    border-radius: var(--radius-sm, 10px);
    background: var(--surface, #fff);
    color: var(--text);
    transition:
      border-color 0.18s var(--ease-out, ease),
      box-shadow 0.18s var(--ease-out, ease);
  }
  .input:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
  }
  .input:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--primary) 50%, var(--border));
    box-shadow: var(--focus-ring, 0 0 0 3px rgba(224, 120, 32, 0.22));
  }
  .input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
</style>
