<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { chat, getToken, getWsUrl } from '../api/client'
import PageCard from '../components/PageCard.vue'

const messages = ref([])
const newMsg = ref('')
const loading = ref(true)
let ws = null

onMounted(async () => {
  try {
    messages.value = await chat.globalMessages()
    connectWs()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  ws?.close()
})

function connectWs() {
  const token = getToken()
  if (!token) return
  const url = getWsUrl(`/chat/ws/global?token=${encodeURIComponent(token)}`)
  ws = new WebSocket(url)
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.type === 'message') {
      const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at }
      if (messages.value.some((m) => m.id === row.id)) return
      messages.value = [...messages.value, row]
    }
  }
  ws.onerror = () => console.warn('WebSocket global chat error')
}

async function send() {
  const text = newMsg.value.trim()
  if (!text) return
  try {
    const saved = await chat.sendGlobalMessage(text)
    newMsg.value = ''
    const row = {
      id: saved.id,
      text: saved.text,
      user: saved.user || { email: '' },
      created_at: saved.created_at,
    }
    if (!messages.value.some((m) => m.id === row.id)) {
      messages.value = [...messages.value, row]
    }
  } catch (e) {
    message.error(e.message || 'Не удалось отправить')
  }
}
</script>

<template>
  <div class="page-shell">
    <h1>Общий чат</h1>
    <p class="page-lead">Сообщения видны всем авторизованным пользователям.</p>
    <PageCard title="Сообщения">
      <a-spin v-if="loading" />
      <template v-else>
        <div class="chat-messages">
          <div v-for="m in messages" :key="m.id" class="chat-msg">
            <span class="chat-user">{{ m.user?.email || 'Аноним' }}</span>
            <span class="chat-text">{{ m.text }}</span>
          </div>
          <p v-if="!messages.length" class="muted">Пока тихо — напишите первым.</p>
        </div>
        <a-input-group compact style="display: flex; margin-top: 8px">
          <a-input v-model:value="newMsg" placeholder="Сообщение…" style="flex: 1" @press-enter="send" />
          <a-button type="primary" @click="send">Отправить</a-button>
        </a-input-group>
      </template>
    </PageCard>
  </div>
</template>

<style scoped>
.chat-messages {
  max-height: min(420px, 55vh);
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
.chat-text {
  color: var(--vue-text-muted);
  font-size: 0.95rem;
  line-height: 1.45;
}
</style>
