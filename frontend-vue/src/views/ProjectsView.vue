<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { projects as projectsApi } from '../api/client'
import { useAuth } from '../composables/useAuth'
import PageCard from '../components/PageCard.vue'

const { user } = useAuth()
const router = useRouter()

const list = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const form = ref({ title: '', description: '' })
const saving = ref(false)
const editOpen = ref(false)
const editForm = ref({ id: '', title: '', description: '' })
const savingEdit = ref(false)

const currentUserId = computed(() => user.value?.id)

onMounted(load)

async function load() {
  try {
    list.value = await projectsApi.list()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function createProject() {
  if (!form.value.title?.trim()) {
    message.error('Введите название проекта')
    return Promise.reject()
  }
  saving.value = true
  try {
    await projectsApi.create(form.value)
    modalOpen.value = false
    form.value = { title: '', description: '' }
    await load()
    message.success('Проект создан')
  } catch (err) {
    message.error(err.message)
    throw err
  } finally {
    saving.value = false
  }
}

function openEdit(project) {
  editForm.value = { id: project.id, title: project.title, description: project.description || '' }
  editOpen.value = true
}

async function saveEdit() {
  if (!editForm.value.title?.trim()) {
    message.error('Введите название')
    return Promise.reject()
  }
  savingEdit.value = true
  try {
    await projectsApi.update(editForm.value.id, {
      title: editForm.value.title,
      description: editForm.value.description || null,
    })
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

function removeProject(project) {
  Modal.confirm({
    title: 'Удалить проект?',
    content: `«${project.title}»`,
    okText: 'Удалить',
    okType: 'danger',
    cancelText: 'Отмена',
    async onOk() {
      await projectsApi.delete(project.id)
      await load()
      message.success('Удалено')
    },
  })
}
</script>

<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1>Проекты</h1>
        <p class="page-lead">Внутри проекта — задачи, чат и участники (для назначения исполнителей).</p>
      </div>
      <a-button type="primary" size="large" @click="modalOpen = true">+ Создать проект</a-button>
    </div>
    <a-spin v-if="loading" />
    <template v-else>
      <a-row v-if="list.length" :gutter="[22, 22]">
        <a-col v-for="project in list" :key="project.id" :xs="24" :sm="12" :lg="8">
          <div class="project-card-wrap">
            <PageCard :title="project.title">
              <p class="project-desc">{{ project.description || 'Без описания' }}</p>
              <a-space wrap>
                <a-button type="primary" @click="router.push('/projects/' + project.id)">Открыть</a-button>
                <template v-if="currentUserId === project.owner_id">
                  <a-button @click="openEdit(project)">Изменить</a-button>
                  <a-button danger @click="removeProject(project)">Удалить</a-button>
                </template>
              </a-space>
            </PageCard>
          </div>
        </a-col>
      </a-row>
      <p v-else class="muted">Нет проектов — создайте первый.</p>
    </template>

    <a-modal v-model:open="modalOpen" title="Новый проект" ok-text="Создать" :confirm-loading="saving" @ok="createProject">
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.title" placeholder="Название проекта" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-input v-model:value="form.description" placeholder="Описание" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="editOpen" title="Редактировать проект" ok-text="Сохранить" :confirm-loading="savingEdit" @ok="saveEdit">
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="editForm.title" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-input v-model:value="editForm.description" placeholder="Описание" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
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
.project-desc {
  color: var(--vue-text-muted);
  font-size: 0.9rem;
  margin-bottom: 12px;
  line-height: 1.5;
}
.project-card-wrap {
  transition: transform 0.22s ease;
  height: 100%;
}
.project-card-wrap:hover {
  transform: translateY(-2px);
}
</style>
