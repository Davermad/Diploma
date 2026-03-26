<script>
  export let title = '';
  export let extra = '';
</script>

<div class="card">
  {#if title || extra}
    <div class="card-header">
      {#if title}<h3 class="card-title">{title}</h3>{/if}
      {#if extra}<div class="card-extra">{extra}</div>{/if}
    </div>
  {/if}
  <div class="card-body">
    <slot />
  </div>
</div>

<style>
  .card {
    background: var(--surface, #fff);
    border-radius: var(--radius, 14px);
    border: 1px solid color-mix(in srgb, var(--border) 92%, var(--text) 8%);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: box-shadow 0.22s var(--ease-out, ease), border-color 0.22s ease;
  }
  .card-header {
    padding: 16px 22px;
    border-bottom: 1px solid var(--border, #e8e0d6);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(180deg, var(--surface-2, #fffdfb) 0%, var(--surface, #fff) 55%);
  }
  .card-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .card-body {
    padding: 20px 22px;
  }
</style>
