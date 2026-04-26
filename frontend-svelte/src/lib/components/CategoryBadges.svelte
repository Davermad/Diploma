<script>
  /** @type {{ id?: string, name: string, color?: string }[]} */
  let { items = [], empty = '—' } = $props();
</script>

{#if items && items.length}
  <div class="badges">
    {#each items as c (c.id || c.name)}
      <span class="badge" style="--c: {c.color || 'var(--primary)'}">{c.name}</span>
    {/each}
  </div>
{:else}
  <span class="empty">{empty}</span>
{/if}

<style>
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .badge {
    display: inline-block;
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    background: color-mix(in srgb, var(--c) 14%, var(--surface));
    color: color-mix(in srgb, var(--c) 52%, var(--text));
    border: 1px solid color-mix(in srgb, var(--c) 32%, transparent);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--c) 8%, transparent);
  }
  .empty {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
