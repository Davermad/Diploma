<script>
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Card from '../lib/components/Card.svelte';
  import { stats } from '../lib/api.js';

  let data = null;
  let loading = true;
  const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнено' };

  onMount(async () => {
    try {
      data = await stats.dashboard();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="dashboard page-shell">
  <h1>Дашборд</h1>
  <p class="page-lead">Сводка по задачам: статусы, просроченные и недавно завершённые.</p>
  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else if data}
    <div class="stats-grid">
      <Card title="По статусам">
        {#each Object.entries(data.by_status || {}) as [status, count]}
          <div class="stat-row" in:slide out:slide>
            <span>{statusLabels[status] || status}</span>
            <strong>{count}</strong>
          </div>
        {/each}
      </Card>
      <Card title="Просрочено">
        <div class="stat-overdue-wrap">
          <span class="stat-big">{data.overdue_count || 0}</span>
        </div>
      </Card>
      <Card title="Топ просроченных">
        {#each (data.top_overdue || []).slice(0, 5) as task}
          <div class="task-row">
            <a href="#/tasks/{task.id}">{task.title}</a>
          </div>
        {:else}
          <p class="empty muted">Нет просроченных</p>
        {/each}
      </Card>
      <Card title="Последние выполненные">
        {#each (data.last_completed || []).slice(0, 5) as task}
          <div class="task-row">
            <a href="#/tasks/{task.id}">{task.title}</a>
          </div>
        {:else}
          <p class="empty muted">Нет выполненных</p>
        {/each}
      </Card>
    </div>
  {:else}
    <p class="muted">Нет данных</p>
  {/if}
</div>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }
  .stat-row:last-child {
    border-bottom: none;
  }
  .stat-overdue-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 72px;
  }
  .stat-big {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 4.25rem;
    min-width: 4.25rem;
    padding: 0 1.1rem;
    font-size: clamp(1.5rem, 4vw, 1.85rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    color: var(--primary);
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--primary) 14%, var(--surface)) 0%,
      color-mix(in srgb, var(--primary) 8%, var(--surface)) 100%
    );
    border-radius: 999px;
    border: 2px solid color-mix(in srgb, var(--primary) 28%, transparent);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--primary) 15%, transparent);
  }
  .task-row {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }
  .task-row:last-child {
    border-bottom: none;
  }
  .task-row a {
    color: var(--primary);
    font-weight: 500;
  }
  .empty {
    margin: 0;
    font-size: 0.9rem;
  }
</style>
