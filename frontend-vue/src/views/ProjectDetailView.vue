<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { projects as projectsApi, tasks as tasksApi, categories as categoriesApi } from '../api/client'
import { useAuth } from '../composables/useAuth'
import PageCard from '../components/PageCard.vue'
import CategoryPicker from '../components/CategoryPicker.vue'
import CategoryBadges from '../components/CategoryBadges.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const projectId = computed(() => route.params.id)

const project = ref(null)
const tasks = ref([])
const chatMessages = ref([])
const chatInput = ref('')
const loading = ref(true)
const taskModalOpen = ref(false)
const allCategories = ref([])
const taskForm = ref({
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  category_ids: [],
  executor_id: null,
})
const saving = ref(false)
const completingTaskId = ref(null)

const statusOpts = [
  { value: 'TODO', label: 'К выполнению' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'DONE', label: 'Выполнено' },
]
const priorityOpts = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'MEDIUM', label: 'Средний' },
  { value: 'HIGH', label: 'Высокий' },
]
const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Готово' }

const memberOptions = computed(() => {
  const m = project.value?.members
  if (!m?.length) return []
  const byId = new Map(m.map((u) => [u.id, u]))
  return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''))
})

const isOwner = computed(() => user.value && project.value && user.value.id === project.value.owner_id)

const inviteEmail = ref('')
const inviting = ref(false)
const projectEditOpen = ref(false)
const projectForm = ref({ title: '', description: '' })
const savingProject = ref(false)

watch(
  projectId,
  (id) => {
    if (id) load()
  },
  { immediate: true }
)

async function completeTaskRow(taskId) {
  completingTaskId.value = taskId
  try {
    await tasksApi.update(taskId, { status: 'DONE' })
    message.success('Задача выполнена')
    await load()
  } catch (e) {
    message.error(e.message || 'Не удалось завершить задачу')
  } finally {
    completingTaskId.value = null
  }
}

async function load() {
  const id = projectId.value
  if (!id) return
  loading.value = true
  try {
    const [p, t, chat, cats] = await Promise.all([
      projectsApi.get(id),
      tasksApi.list({ project_id: id }),
      projectsApi.getChat(id).catch(() => []),
      categoriesApi.list().catch(() => []),
    ])
    project.value = p
    tasks.value = t
    chatMessages.value = chat
    allCategories.value = cats
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function addMember() {
  const em = inviteEmail.value.trim()
  if (!em) return
  inviting.value = true
  try {
    const r = await projectsApi.addMember(projectId.value, { email: em })
    inviteEmail.value = ''
    if (r.status === 'already_member') message.info('Этот пользователь уже в проекте')
    else message.success('Участник добавлен')
    await load()
  } catch (err) {
    message.error(err.message)
  } finally {
    inviting.value = false
  }
}

function openProjectEdit() {
  projectForm.value = { title: project.value.title, description: project.value.description || '' }
  projectEditOpen.value = true
}

function deleteProject() {
  Modal.confirm({
    title: 'Удалить проект?',
    content: 'Связанные задачи могут остаться в БД в зависимости от настроек.',
    okType: 'danger',
    async onOk() {
      await projectsApi.delete(projectId.value)
      router.push('/projects')
    },
  })
}

async function sendChat() {
  if (!chatInput.value.trim()) return
  try {
    const msg = await projectsApi.sendMessage(projectId.value, chatInput.value.trim())
    chatMessages.value = [...chatMessages.value, msg]
    chatInput.value = ''
  } catch (e) {
    console.error(e)
  }
}

async function createTask() {
  if (!taskForm.value.title?.trim()) {
    message.error('Введите название задачи')
    return Promise.reject()
  }
  saving.value = true
  try {
    await tasksApi.create({
      ...taskForm.value,
      project_id: projectId.value,
      category_ids: taskForm.value.category_ids,
      executor_id: taskForm.value.executor_id || null,
    })
    taskModalOpen.value = false
    taskForm.value = {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      category_ids: [],
      executor_id: null,
    }
    await load()
    message.success('Задача создана')
  } catch (err) {
    message.error(err.message)
    throw err
  } finally {
    saving.value = false
  }
}

async function saveProject() {
  if (!projectForm.value.title?.trim()) {
    message.error('Введите название')
    return Promise.reject()
  }
  savingProject.value = true
  try {
    await projectsApi.update(projectId.value, {
      title: projectForm.value.title,
      description: projectForm.value.description || null,
    })
    projectEditOpen.value = false
    await load()
    message.success('Сохранено')
  } catch (err) {
    message.error(err.message)
    throw err
  } finally {
    savingProject.value = false
  }
}
</script>

<template>
  <div class="page-shell project-detail">
    <a-spin v-if="loading" />
    <template v-else-if="project">
      <div class="page-header">
        <div>
          <router-link to="/projects" class="back">← К проектам</router-link>
          <h1>{{ project.title }}</h1>
          <p class="project-desc">{{ project.description || 'Без описания' }}</p>
          <a-space v-if="isOwner" wrap style="margin-top: 12px">
            <a-button @click="openProjectEdit">Изменить проект</a-button>
            <a-button danger @click="deleteProject">Удалить проект</a-button>
          </a-space>
        </div>
        <a-button type="primary" size="large" @click="taskModalOpen = true">+ Добавить задачу</a-button>
      </div>

      <PageCard v-if="isOwner" title="Участники проекта" style="margin-bottom: 20px">
        <p class="field-hint">
          Исполнителем задачи может быть только участник проекта. Добавьте пользователя по email (он должен быть
          уже зарегистрирован).
        </p>
        <ul class="member-list">
          <li v-for="u in memberOptions" :key="u.id">{{ u.email }}</li>
          <li v-if="!memberOptions.length" class="muted">Нет участников</li>
        </ul>
        <a-form layout="inline" @finish="addMember">
          <a-form-item>
            <a-input v-model:value="inviteEmail" type="email" placeholder="email коллеги" style="min-width: 220px" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="inviting">Добавить в проект</a-button>
          </a-form-item>
        </a-form>
      </PageCard>

      <a-row :gutter="[20, 20]">
        <a-col :xs="24" :lg="12">
          <PageCard title="Задачи">
            <div v-for="task in tasks" :key="task.id" class="task-item">
              <div class="task-main">
                <router-link class="task-title" :to="'/tasks/' + task.id">{{ task.title }}</router-link>
                <CategoryBadges :items="task.categories || []" empty="Без категорий" />
                <span v-if="task.executor" class="task-exec">→ {{ task.executor.email }}</span>
              </div>
              <div class="task-item-right">
                <span class="task-status">{{ statusLabels[task.status] || task.status }}</span>
                <a-button
                  v-if="user && task.status !== 'DONE'"
                  type="primary"
                  size="small"
                  :loading="completingTaskId === task.id"
                  @click="completeTaskRow(task.id)"
                >
                  Завершить
                </a-button>
              </div>
            </div>
            <p v-if="!tasks.length" class="muted">Пока нет задач — добавьте первую.</p>
          </PageCard>
        </a-col>
        <a-col :xs="24" :lg="12">
          <PageCard title="Чат проекта">
            <div class="chat-messages">
              <div v-for="m in chatMessages" :key="m.id || m.text" class="chat-msg">
                <span class="chat-user">{{ m.user?.email || 'Аноним' }}</span>
                <span class="chat-text">{{ m.text }}</span>
              </div>
              <p v-if="!chatMessages.length" class="muted">Нет сообщений</p>
            </div>
            <a-input-group compact style="display: flex; margin-top: 8px">
              <a-input v-model:value="chatInput" placeholder="Сообщение…" style="flex: 1" @press-enter="sendChat" />
              <a-button type="primary" @click="sendChat">Отправить</a-button>
            </a-input-group>
          </PageCard>
        </a-col>
      </a-row>
    </template>

    <a-modal
      v-model:open="taskModalOpen"
      title="Новая задача"
      ok-text="Создать"
      :confirm-loading="saving"
      width="560px"
      @ok="createTask"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="taskForm.title" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea v-model:value="taskForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="Категории">
          <CategoryPicker v-model:selected-ids="taskForm.category_ids" :categories="allCategories" />
        </a-form-item>
        <a-form-item label="Исполнитель">
          <a-select
            v-model:value="taskForm.executor_id"
            allow-clear
            placeholder="Не назначен"
            :options="memberOptions.map((u) => ({ value: u.id, label: u.email }))"
          />
          <p class="field-hint">Только участники проекта.</p>
        </a-form-item>
        <a-form-item label="Статус">
          <a-select v-model:value="taskForm.status" :options="statusOpts.map((o) => ({ value: o.value, label: o.label }))" />
        </a-form-item>
        <a-form-item label="Приоритет">
          <a-select
            v-model:value="taskForm.priority"
            :options="priorityOpts.map((o) => ({ value: o.value, label: o.label }))"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="projectEditOpen"
      title="Редактировать проект"
      ok-text="Сохранить"
      :confirm-loading="savingProject"
      @ok="saveProject"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="projectForm.title" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-input v-model:value="projectForm.description" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.project-detail {
  padding-bottom: 48px;
}
.back {
  color: var(--vue-primary);
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 10px;
  display: inline-block;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.project-desc {
  color: var(--vue-text-muted);
  margin: 10px 0 0;
  max-width: 60ch;
  line-height: 1.55;
}
.field-hint {
  font-size: 12px;
  color: var(--vue-text-muted);
  margin-top: 8px;
}
.member-list {
  margin: 0 0 12px;
  padding-left: 1.2em;
}
.task-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  margin: 0 -8px;
  border-radius: 10px;
  border-bottom: 1px solid var(--vue-border);
}
.task-item:hover {
  background: color-mix(in srgb, var(--vue-primary) 6%, var(--vue-surface));
}
.task-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.task-title {
  font-weight: 600;
  color: inherit;
}
.task-exec {
  font-size: 12px;
  color: var(--vue-text-muted);
}
.task-status {
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--vue-border);
  white-space: nowrap;
}
.chat-messages {
  max-height: 280px;
  overflow-y: auto;
}
.chat-msg {
  padding: 10px 0;
  border-bottom: 1px solid var(--vue-border);
  font-size: 0.9rem;
}
.chat-user {
  font-weight: 600;
  font-size: 0.8rem;
  display: block;
  margin-bottom: 4px;
}
.chat-text {
  color: var(--vue-text-muted);
}
</style>
