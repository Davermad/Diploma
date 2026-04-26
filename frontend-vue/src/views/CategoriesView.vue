<script setup>
import { ref, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { categories as categoriesApi } from '../api/client'
import PageCard from '../components/PageCard.vue'

const list = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const form = ref({ name: '', color: '#16a34a' })
const saving = ref(false)
const editOpen = ref(false)
const editForm = ref({ id: '', name: '', color: '#16a34a' })
const savingEdit = ref(false)

onMounted(load)

async function load() {
  try {
    list.value = await categoriesApi.list()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function createCat() {
  if (!form.value.name?.trim()) {
    message.error('Введите название')
    return Promise.reject()
  }
  saving.value = true
  try {
    await categoriesApi.create(form.value)
    modalOpen.value = false
    form.value = { name: '', color: '#16a34a' }
    await load()
    message.success('Категория создана')
  } catch (err) {
    message.error(err.message)
    throw err
  } finally {
    saving.value = false
  }
}

function openEdit(cat) {
  editForm.value = { id: cat.id, name: cat.name, color: cat.color }
  editOpen.value = true
}

async function saveEdit() {
  if (!editForm.value.name?.trim()) {
    message.error('Введите название')
    return Promise.reject()
  }
  savingEdit.value = true
  try {
    await categoriesApi.update(editForm.value.id, { name: editForm.value.name, color: editForm.value.color })
    editOpen.value = false
    await load()
    message.success('Сохранено')
  } catch (err) {
    message.error(err.message)
    throw err
  } finally {
    savingEdit.value = false
  }
}

function removeCat(cat) {
  Modal.confirm({
    title: 'Удалить категорию?',
    content: `«${cat.name}»`,
    okType: 'danger',
    async onOk() {
      await categoriesApi.delete(cat.id)
      await load()
    },
  })
}
</script>

<template>
  <div class="page-shell">
    <div class="page-intro">
      <h1>Категории</h1>
      <p class="page-lead">
        Метки для задач: при создании задачи и на странице задачи можно назначить одну или несколько категорий.
      </p>
      <a-button type="primary" size="large" @click="modalOpen = true">+ Создать категорию</a-button>
    </div>

    <a-spin v-if="loading" />
    <PageCard v-else-if="list.length === 0" title="Пока пусто">
      <p class="muted">Добавьте первую категорию — она появится в форме задачи на странице проекта.</p>
    </PageCard>
    <div v-else class="cat-grid">
      <div
        v-for="cat in list"
        :key="cat.id"
        class="cat-card"
        :style="{ '--accent': cat.color }"
      >
        <span class="cat-dot" />
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-hex">{{ cat.color }}</span>
        <a-space wrap>
          <a-button size="small" @click="openEdit(cat)">Изменить</a-button>
          <a-button size="small" danger @click="removeCat(cat)">Удалить</a-button>
        </a-space>
      </div>
    </div>

    <a-modal v-model:open="modalOpen" title="Новая категория" ok-text="Создать" :confirm-loading="saving" @ok="createCat">
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.name" placeholder="Например: Срочно" />
        </a-form-item>
        <a-form-item label="Цвет">
          <input v-model="form.color" type="color" class="color-input" aria-label="Цвет категории" />
          <span class="muted" style="margin-left: 8px">{{ form.color }}</span>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="editOpen" title="Редактировать категорию" ok-text="Сохранить" :confirm-loading="savingEdit" @ok="saveEdit">
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="editForm.name" />
        </a-form-item>
        <a-form-item label="Цвет">
          <input v-model="editForm.color" type="color" class="color-input" aria-label="Цвет" />
          <span class="muted" style="margin-left: 8px">{{ editForm.color }}</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.page-intro {
  margin-bottom: 28px;
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
  background: var(--vue-surface);
  border: 1px solid var(--vue-border);
  border-radius: 14px;
  border-left: 4px solid var(--accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.cat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(23, 138, 92, 0.1);
}
.cat-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
}
.cat-name {
  font-weight: 600;
  font-size: 1rem;
}
.cat-hex {
  font-size: 0.75rem;
  color: var(--vue-text-muted);
  font-family: ui-monospace, monospace;
}
.color-input {
  width: 52px;
  height: 40px;
  padding: 4px;
  border: 1px solid var(--vue-border);
  border-radius: 8px;
  cursor: pointer;
}
</style>
