<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { tasks as tasksApi, categories as categoriesApi, projects as projectsApi, getToken, getWsUrl } from '../api/client'
import { useAuth } from '../composables/useAuth'
import PageCard from '../components/PageCard.vue'
import CategoryBadges from '../components/CategoryBadges.vue'
import CategoryPicker from '../components/CategoryPicker.vue'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const taskId = computed(() => route.params.id)

const task = ref(null)
const projectForTask = ref(null)
const executorId = ref(null)
const savingExec = ref(false)
const allCategories = ref([])
const categoryIds = ref([])
const savingCats = ref(false)
const comments = ref([])
const newComment = ref('')
const loading = ref(true)
let ws = null
const wsConnected = ref(false)

const statusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Выполнено' }
const priorityLabels = { LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий' }

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

const memberOptions = computed(() => {
  const p = projectForTask.value
  if (!p?.members?.length) return []
  const byId = new Map(p.members.map((u) => [u.id, u]))
  return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''))
})

const canEditTask = computed(
  () => user.value && task.value && (user.value.id === task.value.creator_id || user.value.id === task.value.owner_id)
)

const editOpen = ref(false)
const editForm = ref({
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  deadline: '',
})
const savingEdit = ref(false)

watch(
  taskId,
  () => {
    if (taskId.value) load()
  },
  { immediate: true }
)

onUnmounted(() => {
  ws?.close()
})

async function load() {
  const id = taskId.value
  if (!id) return
  ws?.close()
  ws = null
  wsConnected.value = false
  task.value = null
  loading.value = true
  try {
    const [t, cats] = await Promise.all([tasksApi.get(id), categoriesApi.list().catch(() => [])])
    task.value = t
    executorId.value = t.executor_id || null
    projectForTask.value = t.project_id ? await projectsApi.get(t.project_id).catch(() => null) : null
    allCategories.value = cats
    categoryIds.value = (t.categories || []).map((c) => c.id)
    comments.value = await tasksApi.getComments(id)
    connectWs()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function connectWs() {
  const token = getToken()
  if (!token || !taskId.value) return
  const url = getWsUrl(`/chat/ws/tasks/${taskId.value}?token=${encodeURIComponent(token)}`)
  ws = new WebSocket(url)
  ws.onopen = () => {
    wsConnected.value = true
  }
  ws.onclose = () => {
    wsConnected.value = false
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'message') {
      const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at }
      if (comments.value.some((c) => c.id === row.id)) return
      comments.value = [...comments.value, row]
    }
  }
}

async function sendComment() {
  const text = newComment.value.trim()
  if (!text) return
  try {
    if (ws && wsConnected.value) {
      ws.send(JSON.stringify({ text }))
      newComment.value = ''
    } else {
      const c = await tasksApi.addComment(taskId.value, text)
      comments.value = [...comments.value, c]
      newComment.value = ''
    }
  } catch (e) {
    message.error(e.message || 'Не удалось отправить')
  }
}

async function saveCategories() {
  savingCats.value = true
  try {
    const updated = await tasksApi.update(taskId.value, { category_ids: categoryIds.value })
    task.value = updated
    categoryIds.value = (updated.categories || []).map((c) => c.id)
    message.success('Категории сохранены')
  } catch (e) {
    message.error(e.message)
  } finally {
    savingCats.value = false
  }
}

function openTaskEdit() {
  if (!task.value) return
  const t = task.value
  editForm.value = {
    title: t.title,
    description: t.description || '',
    status: t.status,
    priority: t.priority,
    deadline: t.deadline ? String(t.deadline).slice(0, 16) : '',
  }
  editOpen.value = true
}

async function saveTaskEdit() {
  if (!editForm.value.title?.trim()) {
    message.error('Введите название')
    return Promise.reject()
  }
  savingEdit.value = true
  try {
    const payload = {
      title: editForm.value.title,
      description: editForm.value.description,
      status: editForm.value.status,
      priority: editForm.value.priority,
      deadline: editForm.value.deadline ? new Date(editForm.value.deadline).toISOString() : null,
    }
    const updated = await tasksApi.update(taskId.value, payload)
    task.value = updated
    editOpen.value = false
    await load()
    message.success('Сохранено')
  } catch (e) {
    message.error(e.message)
    throw e
  } finally {
    savingEdit.value = false
  }
}

function deleteTask() {
  Modal.confirm({
    title: 'Удалить задачу?',
    okType: 'danger',
    async onOk() {
      const pid = task.value?.project_id
      await tasksApi.delete(taskId.value)
      router.push(pid ? `/projects/${pid}` : '/projects')
    },
  })
}

async function saveExecutor() {
  savingExec.value = true
  try {
    const updated = await tasksApi.update(taskId.value, { executor_id: executorId.value || null })
    task.value = updated
    executorId.value = updated.executor_id || null
    message.success('Исполнитель сохранён')
  } catch (e) {
    message.error(e.message)
  } finally {
    savingExec.value = false
  }
}
</script>

<template>
  <div class="page-shell task-detail">
    <a-spin v-if="loading" />
    <template v-else-if="task">
      <router-link
        :to="task.project_id ? '/projects/' + task.project_id : '/projects'"
        class="back"
      >
        ← {{ task.project_id ? 'К проекту' : 'К проектам' }}
      </router-link>

      <div class="hero">
        <h1>{{ task.title }}</h1>
        <CategoryBadges :items="task.categories || []" empty="Категории не заданы" />
        <a-space v-if="canEditTask" wrap style="margin-top: 16px">
          <a-button @click="openTaskEdit">Редактировать задачу</a-button>
          <a-button danger @click="deleteTask">Удалить задачу</a-button>
        </a-space>
      </div>

      <a-row :gutter="[20, 20]" class="grid-2">
        <a-col :xs="24" :md="12">
          <PageCard title="Детали">
            <p class="desc">{{ task.description || 'Без описания' }}</p>
            <dl class="meta">
              <div>
                <dt>Статус</dt>
                <dd>{{ statusLabels[task.status] || task.status }}</dd>
              </div>
              <div>
                <dt>Приоритет</dt>
                <dd>{{ priorityLabels[task.priority] || task.priority }}</dd>
              </div>
              <div v-if="task.creator">
                <dt>Постановщик</dt>
                <dd>{{ task.creator.email }}</dd>
              </div>
              <div v-if="task.executor">
                <dt>Исполнитель</dt>
                <dd>{{ task.executor.email }}</dd>
              </div>
            </dl>
          </PageCard>
        </a-col>

        <a-col v-if="canEditTask && projectForTask" :xs="24" :md="12">
          <PageCard title="Исполнитель">
            <p class="hint">Назначьте участника проекта. Нет в списке — владелец добавляет по email на странице проекта.</p>
            <a-select
              v-model:value="executorId"
              allow-clear
              placeholder="Не назначен"
              style="width: 100%; margin-bottom: 12px"
              :options="memberOptions.map((u) => ({ value: u.id, label: u.email }))"
            />
            <a-button type="primary" :loading="savingExec" @click="saveExecutor">Сохранить</a-button>
          </PageCard>
        </a-col>

        <a-col :xs="24" :md="12">
          <PageCard title="Категории">
            <p class="hint">Метки для фильтрации и наглядности.</p>
            <CategoryPicker v-model:selected-ids="categoryIds" :categories="allCategories" />
            <a-button type="primary" :loading="savingCats" style="margin-top: 12px" @click="saveCategories">
              Сохранить категории
            </a-button>
          </PageCard>
        </a-col>
      </a-row>

      <PageCard title="Чат задачи" style="margin-top: 20px">
        <div class="chat-messages">
          <div v-for="c in comments" :key="c.id" class="chat-msg">
            <span class="chat-user">{{ c.user?.email || 'Аноним' }}</span>
            <span class="chat-body">{{ c.text }}</span>
          </div>
          <p v-if="!comments.length" class="muted">Пока нет сообщений</p>
        </div>
        <a-input-group compact style="display: flex; margin-top: 8px">
          <a-input v-model:value="newComment" placeholder="Сообщение…" style="flex: 1" @press-enter="sendComment" />
          <a-button type="primary" @click="sendComment">Отправить</a-button>
        </a-input-group>
        <p v-if="!wsConnected" class="ws-note muted">Чат по WebSocket не подключён — используется отправка через API.</p>
      </PageCard>
    </template>

    <a-modal
      v-model:open="editOpen"
      title="Редактировать задачу"
      ok-text="Сохранить"
      :confirm-loading="savingEdit"
      @ok="saveTaskEdit"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="editForm.title" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea v-model:value="editForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="Статус">
          <a-select v-model:value="editForm.status" :options="statusOpts.map((o) => ({ value: o.value, label: o.label }))" />
        </a-form-item>
        <a-form-item label="Приоритет">
          <a-select
            v-model:value="editForm.priority"
            :options="priorityOpts.map((o) => ({ value: o.value, label: o.label }))"
          />
        </a-form-item>
        <a-form-item label="Дедлайн">
          <a-input v-model:value="editForm.deadline" type="datetime-local" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.task-detail {
  padding-bottom: 48px;
}
.back {
  color: #178a5c;
  font-weight: 600;
  display: inline-block;
  margin-bottom: 16px;
}
.hero {
  margin-bottom: 28px;
  padding: 22px 24px;
  border-radius: 12px;
  border: 1px solid var(--vue-border);
  background: linear-gradient(135deg, #fff 0%, #f4faf6 100%);
}
.hero h1 {
  margin-bottom: 12px;
}
.desc {
  color: var(--vue-text-muted);
  line-height: 1.55;
  margin-bottom: 16px;
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
  color: var(--vue-text-muted);
  margin: 0 0 4px;
}
.meta dd {
  margin: 0;
  font-weight: 500;
}
.hint {
  font-size: 0.875rem;
  color: var(--vue-text-muted);
  margin-bottom: 12px;
}
.chat-messages {
  max-height: 320px;
  overflow-y: auto;
}
.chat-msg {
  padding: 12px 0;
  border-bottom: 1px solid var(--vue-border);
}
.chat-user {
  font-weight: 600;
  font-size: 0.8rem;
  display: block;
  margin-bottom: 4px;
}
.chat-body {
  color: var(--vue-text-muted);
  font-size: 0.9rem;
}
.ws-note {
  margin-top: 10px;
  font-size: 0.8rem;
}
</style>
