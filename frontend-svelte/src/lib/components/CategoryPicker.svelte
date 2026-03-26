<script>
  /** @type {{ id: string, name: string, color: string }[]} */
  let { categories = [], selectedIds = $bindable([]) } = $props();

  function toggle(id) {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    selectedIds = [...s];
  }
</script>

{#if categories.length === 0}
  <p class="hint">Сначала создайте категории на вкладке «Категории».</p>
{:else}
  <div class="cat-grid">
    {#each categories as cat (cat.id)}
      <button
        type="button"
        class="cat-chip"
        class:selected={selectedIds.includes(cat.id)}
        onclick={() => toggle(cat.id)}
      >
        <span class="dot" style="background: {cat.color}"></span>
        <span class="name">{cat.name}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .hint {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.4;
  }
  .cat-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cat-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    color: var(--text);
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  }
  .cat-chip:hover {
    border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  }
  .cat-chip.selected {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, white);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .name {
    font-weight: 500;
  }
</style>
