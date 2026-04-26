<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { projects as projectsApi, tasks as tasksApi, categories as categoriesApi } from '../lib/api.js';
  import { user } from '../lib/stores.js';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import Input from '../lib/components/Input.svelte';
  import FormItem from '../lib/components/FormItem.svelte';
  import CategoryPicker from '../lib/components/CategoryPicker.svelte';
  import CategoryBadges from '../lib/components/CategoryBadges.svelte';

  let { params = {} } = $props();
  let projectId = $derived(params.id);

  let project = $state(null);
  let tasks = $state([]);
  let chatMessages = $state([]);
  let chatInput = $state('');
  let loading = $state(true);
  let taskModalOpen = $state(false);
  let allCategories = $state([]);
  let taskForm = $state({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    category_ids: [],
    executor_id: '',
  });

  /** Участники проекта для выбора исполнителя (владелец в списке members после создания проекта) */
  let memberOptions = $derived.by(() => {
    if (!project?.members?.length) return [];
    const byId = new Map(project.members.map((u) => [u.id, u]));
    return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  });
  let saving = $state(false);

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

  const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Готово' };

  let isOwner = $derived($user && project && $user.id === project.owner_id);
  let inviteEmail = $state('');
  let inviting = $state(false);
  let projectEditOpen = $state(false);
  let projectForm = $state({ title: '', description: '' });
  let savingProject = $state(false);

  onMount(() => projectId && load());

  async function addMember(ev) {
    ev?.preventDefault?.();
    const em = inviteEmail.trim();
    if (!em) return;
    inviting = true;
    try {
      const r = await projectsApi.addMember(projectId, { email: em });
      inviteEmail = '';
      if (r.status === 'already_member') alert('Этот пользователь уже в проекте');
      else alert('Участник добавлен');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      inviting = false;
    }
  }

  function openProjectEdit() {
    projectForm = { title: project.title, description: project.description || '' };
    projectEditOpen = true;
  }

  async function saveProject(ev) {
    ev.preventDefault();
    savingProject = true;
    try {
      await projectsApi.update(projectId, {
        title: projectForm.title,
        description: projectForm.description || null,
      });
      projectEditOpen = false;
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      savingProject = false;
    }
  }

  async function deleteProject() {
    if (!confirm('Удалить проект? Связанные задачи могут остаться в БД в зависимости от настроек.')) return;
    try {
      await projectsApi.delete(projectId);
      push('/projects');
    } catch (e) {
      alert(e.message);
    }
  }

  async function load() {
    if (!projectId) return;
    try {
      const [p, t, chat, cats] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.list({ project_id: projectId }),
        projectsApi.getChat(projectId).catch(() => []),
        categoriesApi.list().catch(() => []),
      ]);
      project = p;
      tasks = t;
      chatMessages = chat;
      allCategories = cats;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    try {
      const msg = await projectsApi.sendMessage(projectId, chatInput.trim());
      chatMessages = [...chatMessages, msg];
      chatInput = '';
    } catch (e) {
      console.error(e);
    }
  }

  let completingTaskId = $state(null);

  async function completeTask(taskId) {
    completingTaskId = taskId;
    try {
      await tasksApi.update(taskId, { status: 'DONE' });
      await load();
    } catch (err) {
      alert(err.message || 'Не удалось завершить задачу');
    } finally {
      completingTaskId = null;
    }
  }

  async function createTask(e) {
    e.preventDefault();
    saving = true;
    try {
      await tasksApi.create({
        ...taskForm,
        project_id: projectId,
        category_ids: taskForm.category_ids,
        executor_id: taskForm.executor_id || null,
      });
      taskModalOpen = false;
      taskForm = {
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        category_ids: [],
        executor_id: '',
      };
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      saving = false;
    }
  }
</script>

<div class="project-detail page-shell">
  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else if project}
    <div class="page-header">
      <div>
        <a href="#/projects" class="back">← К проектам</a>
        <h1>{project.title}</h1>
        <p class="project-desc">{project.description || 'Без описания'}</p>
        {#if isOwner}
          <div class="owner-actions">
            <Button type="default" size="sm" on:click={openProjectEdit}>Изменить проект</Button>
            <Button type="danger" size="sm" on:click={deleteProject}>Удалить проект</Button>
          </div>
        {/if}
      </div>
      <Button type="primary" on:click={() => (taskModalOpen = true)}>+ Добавить задачу</Button>
    </div>

    {#if isOwner}
      <Card title="Участники проекта">
        <p class="field-hint">
          Исполнителем задачи может быть только участник проекта. Добавьте пользователя по email (он должен быть
          уже зарегистрирован).
        </p>
        <ul class="member-list">
          {#each memberOptions as u}
            <li>{u.email}</li>
          {:else}
            <li class="muted">Нет участников</li>
          {/each}
        </ul>
        <form class="invite-form" on:submit|preventDefault={addMember}>
          <Input bind:value={inviteEmail} type="email" placeholder="email коллеги" />
          <Button type="primary" htmlType="submit" loading={inviting}>Добавить в проект</Button>
        </form>
      </Card>
    {/if}

    <div class="grid-2">
      <Card title="Задачи">
        {#each tasks as task}
          <div class="task-item">
            <div class="task-main">
              <a class="task-title" href="#/tasks/{task.id}">{task.title}</a>
              <CategoryBadges items={task.categories || []} empty="Без категорий" />
              {#if task.executor}
                <span class="task-exec" title="Исполнитель">→ {task.executor.email}</span>
              {/if}
            </div>
            <div class="task-item-right">
              <span class="task-status" title="Статус">{statusLabels[task.status] || task.status}</span>
              {#if $user && task.status !== 'DONE'}
                <Button
                  type="primary"
                  size="sm"
                  loading={completingTaskId === task.id}
                  on:click={() => completeTask(task.id)}
                >
                  Завершить
                </Button>
              {/if}
            </div>
          </div>
        {:else}
          <p class="empty">Пока нет задач — добавьте первую.</p>
        {/each}
      </Card>

      <Card title="Чат проекта">
        <div class="chat-messages">
          {#each chatMessages as m}
            <div class="chat-msg">
              <span class="chat-user">{m.user?.email || 'Аноним'}</span>
              <span class="chat-text">{m.text}</span>
            </div>
          {:else}
            <p class="empty muted">Нет сообщений</p>
          {/each}
        </div>
        <div class="chat-input">
          <Input bind:value={chatInput} placeholder="Сообщение…" on:keydown={(e) => e.key === 'Enter' && sendChat()} />
          <Button type="primary" on:click={sendChat}>Отправить</Button>
        </div>
      </Card>
    </div>
  {/if}
</div>

<Modal open={taskModalOpen} title="Новая задача" onClose={() => (taskModalOpen = false)}>
  <form on:submit={createTask}>
    <FormItem label="Название">
      <Input bind:value={taskForm.title} placeholder="Название" required />
    </FormItem>
    <FormItem label="Описание">
      <Input bind:value={taskForm.description} placeholder="Описание" />
    </FormItem>
    <FormItem label="Категории">
      <CategoryPicker bind:selectedIds={taskForm.category_ids} categories={allCategories} />
    </FormItem>
    <FormItem label="Исполнитель">
      <select bind:value={taskForm.executor_id} class="select">
        <option value="">Не назначен</option>
        {#each memberOptions as u}
          <option value={u.id}>{u.email}</option>
        {/each}
      </select>
      <p class="field-hint">Только участники проекта (см. блок «Участники» выше — владелец добавляет по email).</p>
    </FormItem>
    <FormItem label="Статус">
      <select bind:value={taskForm.status} class="select">
        {#each statusOpts as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </FormItem>
    <FormItem label="Приоритет">
      <select bind:value={taskForm.priority} class="select">
        {#each priorityOpts as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </FormItem>
    <Button type="primary" htmlType="submit" loading={saving}>Создать</Button>
  </form>
</Modal>

<Modal open={projectEditOpen} title="Редактировать проект" onClose={() => (projectEditOpen = false)}>
  <form on:submit={saveProject}>
    <FormItem label="Название">
      <Input bind:value={projectForm.title} required />
    </FormItem>
    <FormItem label="Описание">
      <Input bind:value={projectForm.description} placeholder="Описание" />
    </FormItem>
    <Button type="primary" htmlType="submit" loading={savingProject}>Сохранить</Button>
  </form>
</Modal>

<style>
  .owner-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .member-list {
    margin: 0 0 12px;
    padding-left: 1.2em;
    color: var(--text);
  }
  .invite-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .invite-form :global(.input) {
    flex: 1;
    min-width: 200px;
  }
  .project-detail {
    padding-bottom: 48px;
  }
  .back {
    color: var(--primary);
    font-size: 0.8125rem;
    font-weight: 600;
    margin-bottom: 10px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
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
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 28px;
  }
  .project-desc {
    color: var(--text-muted);
    margin: 10px 0 0;
    max-width: 60ch;
    line-height: 1.55;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 900px) {
    .grid-2 {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }
  .task-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    margin: 0 -14px;
    border-radius: var(--radius-sm);
    border-bottom: 1px solid var(--border);
    transition: background 0.15s ease;
  }
  .task-item:last-child {
    border-bottom: none;
    padding-bottom: 12px;
  }
  .task-item:hover {
    background: var(--surface-hover);
  }
  .task-main {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .task-title {
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }
  .task-title:hover {
    color: var(--primary);
    text-decoration: none;
  }
  .task-exec {
    font-size: 12px;
    color: var(--text-muted);
  }
  .field-hint {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }
  .task-item-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .task-status {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--text-muted);
    white-space: nowrap;
    padding: 6px 10px;
    background: linear-gradient(180deg, var(--surface-2) 0%, color-mix(in srgb, var(--surface-2) 88%, var(--border)) 100%);
    border-radius: 999px;
    border: 1px solid var(--border);
  }
  .empty {
    margin: 0;
    font-size: 0.9rem;
  }
  .select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font: inherit;
  }
  .chat-messages {
    max-height: 280px;
    overflow-y: auto;
    margin-bottom: 16px;
  }
  .chat-msg {
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }
  .chat-msg:last-child {
    border-bottom: none;
  }
  .chat-user {
    font-weight: 600;
    color: var(--text);
    display: block;
    font-size: 0.8rem;
    margin-bottom: 4px;
  }
  .chat-text {
    color: var(--text-muted);
  }
  .chat-input {
    display: flex;
    gap: 10px;
  }
  .chat-input :global(.input) {
    flex: 1;
  }
</style>
