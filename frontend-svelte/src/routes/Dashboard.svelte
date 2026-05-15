<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import Card from '../lib/components/Card.svelte';
  import { activity, stats } from '../lib/api.js';

  let feed = [];
  let data = null;
  let loading = true;

  const statusLabels = {
    BACKLOG: 'Бэклог',
    TODO: 'К выполнению',
    IN_PROGRESS: 'В работе',
    REVIEW: 'Ревью',
    DONE: 'Готово',
  };

  function actionVerb(action) {
    const map = {
      task_created: 'создал(а) задачу',
      task_created_in_project: 'добавил(а) в проект',
      task_updated: 'обновил(а)',
      status_changed: 'сменил(а) статус',
      comment_added: 'комментирует',
    };
    return map[action] || action;
  }

  onMount(async () => {
    try {
      const [f, d] = await Promise.all([
        activity.feed({ limit: 48 }),
        stats.dashboard(),
      ]);
      feed = Array.isArray(f) ? f : [];
      data = d;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="sv-dash page-shell">
  <header class="sv-dash-intro">
    <h1>Лента активности</h1>
    <p class="page-lead">
      Интерфейс заточен под сильные стороны Svelte: минимальный рантайм, переходы <code>transition:*</code> и простые реактивные
      блоки без лишних абстракций.
    </p>
  </header>

  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else}
    <div class="sv-dash-layout">
      <section class="sv-feed">
        {#if feed.length === 0}
          <p class="muted">Пока нет событий — выполните действие с задачей или создайте проект.</p>
        {/if}
        {#each feed as row (row.id)}
          <article class="sv-feed-row" in:fly={{ y: 10, duration: 260 }}>
            <div class="sv-feed-dot" aria-hidden="true"></div>
            <div class="sv-feed-main">
              <div class="sv-feed-meta">
                <strong>{row.user?.display_name || row.user?.email || 'Участник'}</strong>
                <span class="muted">{actionVerb(row.action)}</span>
                {#if row.meta?.title}
                  <span class="sv-chip">{row.meta.title}</span>
                {/if}
              </div>
              {#if row.entity_type === 'task'}
                <a href="#/tasks/{row.entity_id}" class="sv-feed-link">Открыть задачу →</a>
              {:else}
                <span class="muted sv-feed-sub">{row.entity_type} · {row.entity_id}</span>
              {/if}
            </div>
            <time class="sv-feed-time muted">{new Date(row.created_at).toLocaleString()}</time>
          </article>
        {/each}
      </section>

      <aside class="sv-dash-aside" in:fly={{ x: 14, duration: 280 }}>
        {#if data}
          <Card title="Сводка">
            {#each Object.entries(data.by_status || {}) as [status, count]}
              <div class="stat-row">
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
          <Card title="Срочно посмотреть">
            {#each (data.top_overdue || []).slice(0, 5) as task}
              <div class="task-row">
                <a href="#/tasks/{task.id}">{task.title}</a>
              </div>
            {:else}
              <p class="empty muted">Нет просроченных</p>
            {/each}
          </Card>
        {:else}
          <p class="muted">Не удалось загрузить сводку.</p>
        {/if}
      </aside>
    </div>
  {/if}
</div>

<style>
  .sv-dash-intro code {
    font-size: 0.85em;
    padding: 2px 6px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--primary) 10%, var(--surface));
    color: var(--text);
  }
  .sv-dash-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
    gap: 28px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .sv-dash-layout {
      grid-template-columns: 1fr;
    }
  }
  .sv-feed {
    border-left: 2px solid color-mix(in srgb, var(--primary) 25%, var(--border));
    padding-left: 18px;
  }
  .sv-feed-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .sv-feed-dot {
    width: 10px;
    height: 10px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 22%, transparent);
  }
  .sv-feed-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
    font-size: 0.9rem;
  }
  .sv-chip {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary) 14%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
  }
  .sv-feed-link {
    display: inline-block;
    margin-top: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--primary);
    text-decoration: none;
  }
  .sv-feed-link:hover {
    text-decoration: underline;
  }
  .sv-feed-sub {
    font-size: 0.78rem;
  }
  .sv-feed-time {
    font-size: 0.72rem;
    white-space: nowrap;
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
    min-height: 4rem;
    min-width: 4rem;
    padding: 0 1rem;
    font-size: clamp(1.4rem, 3vw, 1.75rem);
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
