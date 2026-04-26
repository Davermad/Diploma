import { useEffect, useState, useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { tasks as tasksApi, categories as categoriesApi, projects as projectsApi, getToken, getWsUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { FormItem } from '../components/FormItem'
import { CategoryBadges } from '../components/CategoryBadges'
import { CategoryPicker } from '../components/CategoryPicker'

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

export function TaskDetailPage() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [projectForTask, setProjectForTask] = useState(null)
  const [executorId, setExecutorId] = useState('')
  const [savingExec, setSavingExec] = useState(false)
  const [allCategories, setAllCategories] = useState([])
  const [categoryIds, setCategoryIds] = useState([])
  const [savingCats, setSavingCats] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    deadline: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [completing, setCompleting] = useState(false)
  const wsRef = useRef(null)

  const memberOptions = useMemo(() => {
    const p = projectForTask
    if (!p?.members?.length) return []
    const byId = new Map(p.members.map((u) => [u.id, u]))
    return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''))
  }, [projectForTask])

  const canEditTask =
    user && task && (user.id === task.creator_id || user.id === task.owner_id)

  async function load() {
    if (!taskId) return
    wsRef.current?.close()
    wsRef.current = null
    setWsConnected(false)
    setLoading(true)
    try {
      const [t, cats] = await Promise.all([tasksApi.get(taskId), categoriesApi.list().catch(() => [])])
      setTask(t)
      setExecutorId(t.executor_id || '')
      setProjectForTask(t.project_id ? await projectsApi.get(t.project_id).catch(() => null) : null)
      setAllCategories(cats)
      setCategoryIds((t.categories || []).map((c) => c.id))
      setComments(await tasksApi.getComments(taskId))
      const token = getToken()
      if (token) {
        const url = getWsUrl(`/chat/ws/tasks/${taskId}?token=${encodeURIComponent(token)}`)
        const ws = new WebSocket(url)
        wsRef.current = ws
        ws.onopen = () => setWsConnected(true)
        ws.onclose = () => setWsConnected(false)
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'message') {
            const row = { id: msg.id, text: msg.text, user: { email: msg.email }, created_at: msg.created_at }
            setComments((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]))
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    return () => wsRef.current?.close()
  }, [taskId])

  async function sendComment() {
    const text = newComment.trim()
    if (!text) return
    try {
      if (wsRef.current && wsConnected) {
        wsRef.current.send(JSON.stringify({ text }))
        setNewComment('')
      } else {
        const c = await tasksApi.addComment(taskId, text)
        setComments((prev) => [...prev, c])
        setNewComment('')
      }
    } catch (e) {
      alert(e.message || 'Не удалось отправить')
    }
  }

  async function saveCategories() {
    setSavingCats(true)
    try {
      const updated = await tasksApi.update(taskId, { category_ids: categoryIds })
      setTask(updated)
      setCategoryIds((updated.categories || []).map((c) => c.id))
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingCats(false)
    }
  }

  function openTaskEdit() {
    if (!task) return
    setEditForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? String(task.deadline).slice(0, 16) : '',
    })
    setEditOpen(true)
  }

  async function saveTaskEdit(e) {
    e.preventDefault()
    setSavingEdit(true)
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
      }
      const updated = await tasksApi.update(taskId, payload)
      setTask(updated)
      setEditOpen(false)
      await load()
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteTask() {
    if (!confirm('Удалить задачу?')) return
    try {
      const pid = task?.project_id
      await tasksApi.delete(taskId)
      navigate(pid ? `/projects/${pid}` : '/projects')
    } catch (e) {
      alert(e.message)
    }
  }

  async function saveExecutor() {
    setSavingExec(true)
    try {
      const updated = await tasksApi.update(taskId, { executor_id: executorId || null })
      setTask(updated)
      setExecutorId(updated.executor_id || '')
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingExec(false)
    }
  }

  async function completeTask() {
    if (!task || task.status === 'DONE') return
    setCompleting(true)
    try {
      const updated = await tasksApi.update(taskId, { status: 'DONE' })
      setTask(updated)
      await load()
    } catch (e) {
      alert(e.message || 'Не удалось завершить задачу')
    } finally {
      setCompleting(false)
    }
  }

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    font: 'inherit',
    color: 'var(--text)',
  }

  if (loading) return <div className="page-shell"><p className="skeleton-text">Загрузка…</p></div>
  if (!task) return <div className="page-shell"><p className="muted">Задача не найдена</p></div>

  return (
    <div className="page-shell task-detail">
      <Link
        to={task.project_id ? `/projects/${task.project_id}` : '/projects'}
        style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 16, display: 'inline-block' }}
      >
        ← {task.project_id ? 'К проекту' : 'К проектам'}
      </Link>

      <div
        style={{
          marginBottom: 28,
          padding: '22px 24px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h1 style={{ marginBottom: 12 }}>{task.title}</h1>
        <CategoryBadges items={task.categories || []} empty="Категории не заданы" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {user && task.status !== 'DONE' && (
            <Button type="primary" size="sm" loading={completing} onClick={completeTask}>
              Завершить
            </Button>
          )}
          {canEditTask && (
            <>
              <Button type="default" size="sm" onClick={openTaskEdit}>
                Редактировать задачу
              </Button>
              <Button type="danger" size="sm" onClick={deleteTask}>
                Удалить задачу
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid-2">
        <Card title="Детали">
          <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {task.description || 'Без описания'}
          </p>
          <dl style={{ display: 'grid', gap: 12, margin: 0 }}>
            <div>
              <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                Статус
              </dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>{statusLabels[task.status] || task.status}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                Приоритет
              </dt>
              <dd style={{ margin: 0, fontWeight: 500 }}>{priorityLabels[task.priority] || task.priority}</dd>
            </div>
            {task.creator && (
              <div>
                <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                  Постановщик
                </dt>
                <dd style={{ margin: 0, fontWeight: 500 }}>{task.creator.email}</dd>
              </div>
            )}
            {task.executor && (
              <div>
                <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                  Исполнитель
                </dt>
                <dd style={{ margin: 0, fontWeight: 500 }}>{task.executor.email}</dd>
              </div>
            )}
          </dl>
        </Card>

        {canEditTask && projectForTask && (
          <Card title="Исполнитель">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.45 }}>
              Назначьте участника проекта. Нет в списке — владелец добавляет его на странице проекта по email.
            </p>
            <select style={{ ...selectStyle, marginBottom: 12 }} value={executorId} onChange={(e) => setExecutorId(e.target.value)}>
              <option value="">Не назначен</option>
              {memberOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
            <Button type="primary" onClick={saveExecutor} loading={savingExec}>
              Сохранить
            </Button>
          </Card>
        )}

        <Card title="Категории">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
            Метки для фильтрации и наглядности.
          </p>
          <div style={{ marginBottom: 16 }}>
            <CategoryPicker categories={allCategories} selectedIds={categoryIds} onChange={setCategoryIds} />
          </div>
          <Button type="primary" onClick={saveCategories} loading={savingCats}>
            Сохранить категории
          </Button>
        </Card>
      </div>

      <Card title="Чат задачи" extra={null}>
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>
                {c.user?.email || 'Аноним'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{c.text}</span>
            </div>
          ))}
          {!comments.length && <p className="muted">Пока нет сообщений</p>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Сообщение…"
            onKeyDown={(e) => e.key === 'Enter' && sendComment()}
          />
          <Button type="primary" onClick={sendComment}>
            Отправить
          </Button>
        </div>
        {!wsConnected && (
          <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Чат по WebSocket не подключён — используется отправка через API.
          </p>
        )}
      </Card>

      <Modal open={editOpen} title="Редактировать задачу" onClose={() => setEditOpen(false)}>
        <form onSubmit={saveTaskEdit}>
          <FormItem label="Название">
            <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
          </FormItem>
          <FormItem label="Описание">
            <Input
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
            />
          </FormItem>
          <FormItem label="Статус">
            <select
              style={selectStyle}
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
            >
              {statusOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormItem>
          <FormItem label="Приоритет">
            <select
              style={selectStyle}
              value={editForm.priority}
              onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {priorityOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormItem>
          <FormItem label="Дедлайн">
            <input
              type="datetime-local"
              style={selectStyle}
              value={editForm.deadline}
              onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </FormItem>
          <Button type="primary" htmlType="submit" loading={savingEdit}>
            Сохранить
          </Button>
        </form>
      </Modal>
    </div>
  )
}
