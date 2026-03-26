<script>
  import { onMount } from 'svelte';
  import { categories as categoriesApi } from '../lib/api.js';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Modal from '../lib/components/Modal.svelte';
  import Input from '../lib/components/Input.svelte';
  import FormItem from '../lib/components/FormItem.svelte';

  let list = [];
  let loading = true;
  let modalOpen = false;
  let form = { name: '', color: '#e07820' };
  let saving = false;

  let editOpen = false;
  let editForm = { id: '', name: '', color: '#e07820' };
  let savingEdit = false;

  onMount(load);

  async function load() {
    try {
      list = await categoriesApi.list();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function createCat(e) {
    e.preventDefault();
    saving = true;
    try {
      await categoriesApi.create(form);
      modalOpen = false;
      form = { name: '', color: '#e07820' };
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      saving = false;
    }
  }

  function openEdit(cat) {
    editForm = { id: cat.id, name: cat.name, color: cat.color };
    editOpen = true;
  }

  async function saveEdit(e) {
    e.preventDefault();
    savingEdit = true;
    try {
      await categoriesApi.update(editForm.id, { name: editForm.name, color: editForm.color });
      editOpen = false;
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      savingEdit = false;
    }
  }

  async function removeCat(cat) {
    if (!confirm(`Удалить категорию «${cat.name}»?`)) return;
    try {
      await categoriesApi.delete(cat.id);
      await load();
    } catch (e) {
      alert(e.message);
    }
  }
</script>

<div class="categories-page page-shell">
  <div class="page-intro">
    <h1>Категории</h1>
    <p class="page-lead">
      Метки для задач: на проекте при создании задачи и на странице задачи можно назначить одну или несколько
      категорий.
    </p>
    <Button type="primary" on:click={() => (modalOpen = true)}>+ Создать категорию</Button>
  </div>

  {#if loading}
    <p class="skeleton-text">Загрузка…</p>
  {:else if list.length === 0}
    <Card title="Пока пусто">
      <p class="muted">Добавьте первую категорию — она появится в форме задачи на странице проекта.</p>
    </Card>
  {:else}
    <div class="cat-grid">
      {#each list as cat}
        <div class="cat-card" style="--accent: {cat.color}">
          <span class="cat-dot"></span>
          <span class="cat-name">{cat.name}</span>
          <span class="cat-hex">{cat.color}</span>
          <div class="cat-actions">
            <Button type="default" size="sm" on:click={() => openEdit(cat)}>Изменить</Button>
            <Button type="danger" size="sm" on:click={() => removeCat(cat)}>Удалить</Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal open={modalOpen} title="Новая категория" onClose={() => (modalOpen = false)}>
  <form on:submit={createCat}>
    <FormItem label="Название">
      <Input bind:value={form.name} placeholder="Например: Срочно" required />
    </FormItem>
    <FormItem label="Цвет">
      <div class="color-row">
        <input type="color" bind:value={form.color} class="color-input" aria-label="Цвет категории" />
        <span class="muted">{form.color}</span>
      </div>
    </FormItem>
    <Button type="primary" htmlType="submit" loading={saving}>Создать</Button>
  </form>
</Modal>

<Modal open={editOpen} title="Редактировать категорию" onClose={() => (editOpen = false)}>
  <form on:submit={saveEdit}>
    <FormItem label="Название">
      <Input bind:value={editForm.name} required />
    </FormItem>
    <FormItem label="Цвет">
      <div class="color-row">
        <input type="color" bind:value={editForm.color} class="color-input" aria-label="Цвет" />
        <span class="muted">{editForm.color}</span>
      </div>
    </FormItem>
    <Button type="primary" htmlType="submit" loading={savingEdit}>Сохранить</Button>
  </form>
</Modal>

<style>
  .page-intro {
    margin-bottom: 28px;
  }
  .page-intro :global(.btn) {
    margin-top: 4px;
  }
  .cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
  .cat-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 18px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    border-left: 4px solid var(--accent);
    transition:
      box-shadow 0.22s var(--ease-out, ease),
      transform 0.22s var(--ease-out, ease);
  }
  .cat-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  .cat-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, white);
  }
  .cat-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
  }
  .cat-hex {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }
  .cat-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .color-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .color-input {
    width: 52px;
    height: 40px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: var(--surface);
  }
</style>
