<script>
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { projects as projectsApi } from '../lib/api.js';
  import { user } from '../lib/stores.js';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import Input from '../lib/components/Input.svelte';
  import FormItem from '../lib/components/FormItem.svelte';

  let list = [];
  let loading = true;
  let modalOpen = false;
  let form = { title: '', description: '' };
  let saving = false;

  let editOpen = false;
  let editForm = { id: '', title: '', description: '' };
  let savingEdit = false;

  onMount(load);

  async function load() {
    try {
      list = await projectsApi.list();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function createProject(e) {
    e.preventDefault();
    saving = true;
    try {
      await projectsApi.create(form);
      modalOpen = false;
      form = { title: '', description: '' };
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      saving = false;
    }
  }

  function openEdit(project) {
    editForm = { id: project.id, title: project.title, description: project.description || '' };
    editOpen = true;
  }

  async function saveEdit(e) {
    e.preventDefault();
    savingEdit = true;
    try {
      await projectsApi.update(editForm.id, {
        title: editForm.title,
        description: editForm.description || null,
      });
      editOpen = false;
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      savingEdit = false;
    }
  }

  async function removeProject(project) {
    if (!confirm(`Удалить проект «${project.title}»?`)) return;
    try {
      await projectsApi.delete(project.id);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }
</script>

<div class="projects-page page-shell">
  <div class="page-header">
    <div>
      <h1>Проекты</h1>
      <p class="page-lead">Внутри проекта — задачи, чат и участники (для назначения исполнителей).</p>
    </div>
    <Button type="primary" on:click={() => (modalOpen = true)}>+ Создать проект</Button>
  </div>
  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else}
    <div class="projects-grid">
      {#each list as project}
        <div class="project-card-wrap">
          <Card title={project.title}>
            <p class="project-desc">{project.description || 'Без описания'}</p>
            <div class="card-actions">
              <Button type="primary" size="sm" on:click={() => push(`/projects/${project.id}`)}>Открыть</Button>
              {#if $user?.id === project.owner_id}
                <Button type="default" size="sm" on:click={() => openEdit(project)}>Изменить</Button>
                <Button type="danger" size="sm" on:click={() => removeProject(project)}>Удалить</Button>
              {/if}
            </div>
          </Card>
        </div>
      {:else}
        <p class="muted">Нет проектов — создайте первый.</p>
      {/each}
    </div>
  {/if}
</div>

<Modal open={modalOpen} title="Новый проект" onClose={() => (modalOpen = false)}>
  <form on:submit={createProject}>
    <FormItem label="Название">
      <Input bind:value={form.title} placeholder="Название проекта" required />
    </FormItem>
    <FormItem label="Описание">
      <Input bind:value={form.description} placeholder="Описание" />
    </FormItem>
    <Button type="primary" htmlType="submit" loading={saving}>Создать</Button>
  </form>
</Modal>

<Modal open={editOpen} title="Редактировать проект" onClose={() => (editOpen = false)}>
  <form on:submit={saveEdit}>
    <FormItem label="Название">
      <Input bind:value={editForm.title} required />
    </FormItem>
    <FormItem label="Описание">
      <Input bind:value={editForm.description} placeholder="Описание" />
    </FormItem>
    <Button type="primary" htmlType="submit" loading={savingEdit}>Сохранить</Button>
  </form>
</Modal>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 28px;
  }
  .page-header h1 {
    margin-bottom: 4px;
  }
  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 22px;
  }
  .project-card-wrap {
    transition: transform 0.22s var(--ease-out, ease);
  }
  .project-card-wrap :global(.card) {
    height: 100%;
    transition:
      box-shadow 0.22s var(--ease-out, ease),
      border-color 0.22s ease;
  }
  .project-card-wrap:hover :global(.card) {
    box-shadow: var(--shadow-md);
    border-color: color-mix(in srgb, var(--primary) 18%, var(--border));
  }
  .project-card-wrap:hover {
    transform: translateY(-2px);
  }
  .project-desc {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
