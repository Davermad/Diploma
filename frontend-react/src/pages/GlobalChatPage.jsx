import { useEffect, useState, useRef } from 'react'
import { chat, getToken, getWsUrl } from '../api/client'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export function GlobalChatPage() {
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const wsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const m = await chat.globalMessages()
        if (!cancelled) setMessages(m)
        const token = getToken()
        if (token) {
          const url = getWsUrl(`/chat/ws/global?token=${encodeURIComponent(token)}`)
          const ws = new WebSocket(url)
          wsRef.current = ws
          ws.onmessage = (e) => {
            const msg = JSON.parse(e.data)
            if (msg.type === 'message') {
              const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at }
              setMessages((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]))
            }
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [])

  async function send() {
    const text = newMsg.trim()
    if (!text) return
    try {
      const saved = await chat.sendGlobalMessage(text)
      setNewMsg('')
      const row = {
        id: saved.id,
        text: saved.text,
        user: saved.user || { email: '' },
        created_at: saved.created_at,
      }
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
    } catch (e) {
      alert(e.message || 'Не удалось отправить')
    }
  }

  return (
    <div className="page-shell">
      <h1>Общий чат</h1>
      <p className="page-lead">Сообщения видны всем авторизованным пользователям.</p>
      <Card title="Сообщения">
        {loading && <p className="skeleton-text">Загрузка…</p>}
        {!loading && (
          <>
            <div style={{ maxHeight: 'min(420px, 55vh)', overflowY: 'auto' }}>
              {messages.map((m) => (
                <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>
                    {m.user?.email || 'Аноним'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{m.text}</span>
                </div>
              ))}
              {!messages.length && <p className="muted">Пока тихо — напишите первым.</p>}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Сообщение…"
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <Button type="primary" onClick={send}>
                Отправить
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
