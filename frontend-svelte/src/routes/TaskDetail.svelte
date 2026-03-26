<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { tasks as tasksApi, categories as categoriesApi, projects as projectsApi } from '../lib/api.js';
  import { user } from '../lib/stores.js';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import Input from '../lib/components/Input.svelte';
  import FormItem from '../lib/components/FormItem.svelte';
  import CategoryBadges from '../lib/components/CategoryBadges.svelte';
  import CategoryPicker from '../lib/components/CategoryPicker.svelte';
  import { getToken, getWsUrl } from '../lib/api.js';

  let { params = {} } = $props();
  let taskId = $derived(params.id);

  let task = $state(null);
  let projectForTask = $state(null);
  let executorId = $state('');
  let savingExec = $state(false);
  let allCategories = $state([]);
  let categoryIds = $state([]);
  let savingCats = $state(false);
  let comments = $state([]);
  let newComment = $state('');
  let loading = $state(true);
  let ws = $state(null);
  let wsConnected = $state(false);

  $effect(() => {
    if (taskId) load();
  });

  onMount(() => () => ws?.close());

  async function load() {
    if (!taskId) return;
    task = null;
    loading = true;
    try {
      const [t, cats] = await Promise.all([
        tasksApi.get(taskId),
        categoriesApi.list().catch(() => []),
      ]);
      task = t;
      executorId = t.executor_id || '';
      projectForTask = t.project_id
        ? await projectsApi.get(t.project_id).catch(() => null)
        : null;
      allCategories = cats;
      categoryIds = (t.categories || []).map((c) => c.id);
      comments = await tasksApi.getComments(taskId);
      connectWs();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function connectWs() {
    const token = getToken();
    if (!token) return;
    const url = getWsUrl(`/chat/ws/tasks/${taskId}?token=${token}`);
    ws = new WebSocket(url);
    ws.onopen = () => (wsConnected = true);
    ws.onclose = () => (wsConnected = false);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'message') {
        const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at };
        if (comments.some((c) => c.id === row.id)) return;
        comments = [...comments, row];
      }
    };
  }

  async function sendComment() {
    const text = newComment.trim();
    if (!text) return;
    try {
      if (ws && wsConnected) {
        ws.send(JSON.stringify({ text }));
        newComment = '';
      } else {
        const c = await tasksApi.addComment(taskId, text);
        comments = [...comments, c];
        newComment = '';
      }
    } catch (e) {
      alert(e.message || 'Не удалось отправить');
    }
  }

  async function saveCategories() {
    savingCats = true;
    try {
      const updated = await tasksApi.update(taskId, { category_ids: categoryIds });
      task = updated;
      categoryIds = (updated.categories || []).map((c) => c.id);
    } catch (e) {
      alert(e.message);
    } finally {
      savingCats = false;
    }
  }

  const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнено' };
  const priorityLabels = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' };

  let memberOptions = $derived.by(() => {
    const p = projectForTask;
    if (!p?.members?.length) return [];
    const byId = new Map(p.members.map((u) => [u.id, u]));
    return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  });

  let canEditTask = $derived(
    $user && task && ($user.id === task.creator_id || $user.id === task.owner_id)
  );

  let editOpen = $state(false);
  let editForm = $state({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    deadline: '',
  });
  let savingEdit = $state(false);

  const statusOpts = [
    { value: 'TODO', label: 'К выполнению' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'DONE', label: 'Выполнено' },
  ];
  const priorityOpts = [
    { value: 'LOW', label: 'Низкий' },
    { value: 'MEDIUM', label: 'Средний' },
    { value: 'HIGH', label: 'Высокий' },
  ];

  function openTaskEdit() {
    if (!task) return;
    editForm = {
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? String(task.deadline).slice(0, 16) : '',
    };
    editOpen = true;
  }

  async function saveTaskEdit(ev) {
    ev.preventDefault();
    savingEdit = true;
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
      };
      payload.deadline = editForm.deadline ? new Date(editForm.deadline).toISOString() : null;
      const updated = await tasksApi.update(taskId, payload);
      task = updated;
      editOpen = false;
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      savingEdit = false;
    }
  }

  async function deleteTask() {
    if (!confirm('Удалить задачу?')) return;
    try {
      const pid = task?.project_id;
      await tasksApi.delete(taskId);
      push(pid ? `/projects/${pid}` : '/projects');
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveExecutor() {
    if (!taskId) return;
    savingExec = true;
    try {
      const updated = await tasksApi.update(taskId, { executor_id: executorId || null });
      task = updated;
      executorId = updated.executor_id || '';
    } catch (e) {
      alert(e.message);
    } finally {
      savingExec = false;
    }
  }
</script>

<div class="task-detail page-shell">
  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else if task}
    <a
      href={task.project_id ? `#/projects/${task.project_id}` : '#/projects'}
      class="back"
    >
      ← {task.project_id ? 'К проекту' : 'К проектам'}
    </a>

    <div class="hero">
      <h1>{task.title}</h1>
      <CategoryBadges items={task.categories || []} empty="Категории не заданы" />
      {#if canEditTask}
        <div class="task-admin-actions">
          <Button type="default" size="sm" on:click={openTaskEdit}>Редактировать задачу</Button>
          <Button type="danger" size="sm" on:click={deleteTask}>Удалить задачу</Button>
        </div>
      {/if}
    </div>

    <div class="grid-2">
      <Card title="Детали">
        <p class="desc">{task.description || 'Без описания'}</p>
        <dl class="meta">
          <div>
            <dt>Статус</dt>
            <dd>{statusLabels[task.status] || task.status}</dd>
          </div>
          <div>
            <dt>Приоритет</dt>
            <dd>{priorityLabels[task.priority] || task.priority}</dd>
          </div>
          {#if task.creator}
            <div>
              <dt>Постановщик</dt>
              <dd>{task.creator.email}</dd>
            </div>
          {/if}
          {#if task.executor}
            <div>
              <dt>Исполнитель</dt>
              <dd>{task.executor.email}</dd>
            </div>
          {/if}
        </dl>
      </Card>

      {#if canEditTask && projectForTask}
        <Card title="Исполнитель">
          <p class="hint">Назначьте участника проекта. Нет в списке — владелец добавляет его на странице проекта по email.</p>
          <select bind:value={executorId} class="select exec-select">
            <option value="">Не назначен</option>
            {#each memberOptions as u}
              <option value={u.id}>{u.email}</option>
            {/each}
          </select>
          <div class="exec-actions">
            <Button type="primary" on:click={saveExecutor} loading={savingExec}>Сохранить</Button>
          </div>
        </Card>
      {/if}

      <Card title="Категории">
        <p class="hint">Те же метки, что на вкладке «Категории». Можно менять для фильтрации и наглядности.</p>
        <div class="picker-wrap">
          <CategoryPicker categories={allCategories} bind:selectedIds={categoryIds} />
        </div>
        <Button type="primary" on:click={saveCategories} loading={savingCats}>Сохранить категории</Button>
      </Card>
    </div>

    <Card title="Чат задачи">
      <div class="chat-messages">
        {#each comments as c}
          <div class="chat-msg">
            <span class="chat-user">{c.user?.email || 'Аноним'}</span>
            <span class="chat-body">{c.text}</span>
          </div>
        {:else}
          <p class="empty muted">Пока нет сообщений</p>
        {/each}
      </div>
      <div class="chat-input">
        <Input bind:value={newComment} placeholder="Сообщение…" on:keydown={(e) => e.key === 'Enter' && sendComment()} />
        <Button type="primary" on:click={sendComment}>Отправить</Button>
      </div>
      {#if !wsConnected}
        <p class="ws-note muted">Чат по WebSocket не подключён — используется отправка через API.</p>
      {/if}
    </Card>
  {/if}
</div>

<Modal open={editOpen} title="Редактировать задачу" onClose={() => (editOpen = false)}>
  <form on:submit={saveTaskEdit}>
    <FormItem label="Название">
      <Input bind:value={editForm.title} required />
    </FormItem>
    <FormItem label="Описание">
      <Input bind:value={editForm.description} placeholder="Описание" />
    </FormItem>
    <FormItem label="Статус">
      <select bind:value={editForm.status} class="select">
        {#each statusOpts as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </FormItem>
    <FormItem label="Приоритет">
      <select bind:value={editForm.priority} class="select">
        {#each priorityOpts as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </FormItem>
    <FormItem label="Дедлайн">
      <input type="datetime-local" bind:value={editForm.deadline} class="select" />
    </FormItem>
    <Button type="primary" htmlType="submit" loading={savingEdit}>Сохранить</Button>
  </form>
</Modal>

<style>
  .task-detail {
    padding-bottom: 48px;
  }
  .back {
    color: var(--primary);
    font-size: 0.8125rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
    padding: 6px 12px;
    margin-left: -4px;
    border-radius: 999px;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .back:hover {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    text-decoration: none;
  }
  .hero {
    margin-bottom: 28px;
    padding: 22px 24px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
    box-shadow: var(--shadow-sm);
  }
  .hero h1 {
    margin-bottom: 12px;
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  }
  .task-admin-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }
  .select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font: inherit;
  }
  .grid-2 {
    display: grid;
    gap: 20px;
    margin-bottom: 20px;
  }
  @media (min-width: 800px) {
    .grid-2 {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }
  .exec-select {
    width: 100%;
    margin-bottom: 12px;
  }
  .exec-actions {
    margin-top: 4px;
  }
  .desc {
    margin: 0 0 16px;
    color: var(--text-muted);
    line-height: 1.55;
  }
  .meta {
    display: grid;
    gap: 12px;
    margin: 0;
  }
  .meta dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin: 0 0 4px;
  }
  .meta dd {
    margin: 0;
    font-weight: 500;
  }
  .picker-wrap {
    margin-bottom: 16px;
  }
  .hint {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0 0 12px;
    line-height: 1.45;
  }
  .chat-messages {
    max-height: 320px;
    overflow-y: auto;
    margin-bottom: 16px;
  }
  .chat-msg {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .chat-msg:last-child {
    border-bottom: none;
  }
  .chat-user {
    font-weight: 600;
    font-size: 0.8rem;
    display: block;
    margin-bottom: 4px;
  }
  .chat-body {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  .chat-input {
    display: flex;
    gap: 10px;
  }
  .chat-input :global(.input) {
    flex: 1;
  }
  .empty {
    margin: 0;
    font-size: 0.9rem;
  }
  .ws-note {
    margin: 10px 0 0;
    font-size: 0.8rem;
  }
</style>
