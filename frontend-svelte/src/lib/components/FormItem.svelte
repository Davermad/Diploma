<script>
  export let label = '';
  export let error = '';
</script>

<div class="form-item">
  {#if label}
    <label class="form-label">{label}</label>
  {/if}
  <div class="form-control">
    <slot />
  </div>
  {#if error}
    <div class="form-error">{error}</div>
  {/if}
</div>

<style>
  .form-item {
    margin-bottom: 16px;
  }
  .form-label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-muted);
  }
  .form-error {
    color: var(--danger, #c23b3b);
    font-size: 0.8125rem;
    margin-top: 6px;
    line-height: 1.35;
  }
</style>
