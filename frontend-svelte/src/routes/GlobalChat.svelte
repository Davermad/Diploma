<script>
  import { onMount } from 'svelte';
  import { chat, getToken, getWsUrl } from '../lib/api.js';
  import Card from '../lib/components/Card.svelte';
  import Input from '../lib/components/Input.svelte';
  import Button from '../lib/components/Button.svelte';

  let messages = [];
  let newMsg = '';
  let loading = true;
  let ws = null;

  onMount(async () => {
    try {
      messages = await chat.globalMessages();
      connectWs();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
    return () => ws?.close();
  });

  function connectWs() {
    const token = getToken();
    if (!token) return;
    const url = getWsUrl(`/chat/ws/global?token=${token}`);
    ws = new WebSocket(url);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'message') {
        const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at };
        if (messages.some((m) => m.id === row.id)) return;
        messages = [...messages, row];
      }
    };
    ws.onerror = () => console.warn('WebSocket global chat error');
  }

  async function send() {
    const text = newMsg.trim();
    if (!text) return;
    try {
      const saved = await chat.sendGlobalMessage(text);
      newMsg = '';
      const row = {
        id: saved.id,
        text: saved.text,
        user: saved.user || { email: '' },
        created_at: saved.created_at,
      };
      if (!messages.some((m) => m.id === row.id)) {
        messages = [...messages, row];
      }
    } catch (e) {
      alert(e.message || 'Не удалось отправить');
    }
  }
</script>

<div class="global-chat page-shell">
  <h1>Общий чат</h1>
  <p class="page-lead">Сообщения видны всем авторизованным пользователям.</p>
  <Card title="Сообщения">
    {#if loading}
      <p class="skeleton-text">Загрузка…</p>
    {:else}
      <div class="chat-messages">
        {#each messages as m}
          <div class="chat-msg">
            <span class="chat-user">{m.user?.email || 'Аноним'}</span>
            <span class="chat-text">{m.text}</span>
          </div>
        {:else}
          <p class="empty muted">Пока тихо — напишите первым.</p>
        {/each}
      </div>
      <div class="chat-input">
        <Input bind:value={newMsg} placeholder="Сообщение…" on:keydown={(e) => e.key === 'Enter' && send()} />
        <Button type="primary" on:click={send}>Отправить</Button>
      </div>
    {/if}
  </Card>
</div>

<style>
  .chat-messages {
    max-height: min(420px, 55vh);
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
    color: var(--text);
  }
  .chat-text {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.45;
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
</style>
