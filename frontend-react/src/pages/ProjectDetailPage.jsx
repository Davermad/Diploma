import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { projects as projectsApi, tasks as tasksApi, categories as categoriesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { FormItem } from '../components/FormItem'
import { CategoryPicker } from '../components/CategoryPicker'
import { CategoryBadges } from '../components/CategoryBadges'

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

export function ProjectDetailPage() {
  const { id: projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [allCategories, setAllCategories] = useState([])
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    category_ids: [],
    executor_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [projectEditOpen, setProjectEditOpen] = useState(false)
  const [projectForm, setProjectForm] = useState({ title: '', description: '' })
  const [savingProject, setSavingProject] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState(null)

  const memberOptions = useMemo(() => {
    const m = project?.members
    if (!m?.length) return []
    const byId = new Map(m.map((u) => [u.id, u]))
    return [...byId.values()].sort((a, b) => (a.email || '').localeCompare(b.email || ''))
  }, [project])

  const isOwner = user && project && user.id === project.owner_id

  async function load() {
    if (!projectId) return
    setLoading(true)
    try {
      const [p, t, chat, cats] = await Promise.all([
        projectsApi.get(projectId),
        tasksApi.list({ project_id: projectId }),
        projectsApi.getChat(projectId).catch(() => []),
        categoriesApi.list().catch(() => []),
      ])
      setProject(p)
      setTasks(t)
      setChatMessages(chat)
      setAllCategories(cats)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  async function addMember(e) {
    e.preventDefault()
    const em = inviteEmail.trim()
    if (!em) return
    setInviting(true)
    try {
      const r = await projectsApi.addMember(projectId, { email: em })
      setInviteEmail('')
      if (r.status === 'already_member') alert('Этот пользователь уже в проекте')
      else alert('Участник добавлен')
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return
    try {
      const msg = await projectsApi.sendMessage(projectId, chatInput.trim())
      setChatMessages((prev) => [...prev, msg])
      setChatInput('')
    } catch (e) {
      console.error(e)
    }
  }

  async function createTask(e) {
    e.preventDefault()
    if (!taskForm.title?.trim()) {
      alert('Введите название задачи')
      return
    }
    setSaving(true)
    try {
      await tasksApi.create({
        ...taskForm,
        project_id: projectId,
        category_ids: taskForm.category_ids,
        executor_id: taskForm.executor_id || null,
      })
      setTaskModalOpen(false)
      setTaskForm({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        category_ids: [],
        executor_id: '',
      })
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function completeTaskRow(taskId) {
    setCompletingTaskId(taskId)
    try {
      await tasksApi.update(taskId, { status: 'DONE' })
      await load()
    } catch (err) {
      alert(err.message || 'Не удалось завершить задачу')
    } finally {
      setCompletingTaskId(null)
    }
  }

  function openProjectEdit() {
    setProjectForm({ title: project.title, description: project.description || '' })
    setProjectEditOpen(true)
  }

  async function saveProject(e) {
    e.preventDefault()
    if (!projectForm.title?.trim()) {
      alert('Введите название')
      return
    }
    setSavingProject(true)
    try {
      await projectsApi.update(projectId, {
        title: projectForm.title,
        description: projectForm.description || null,
      })
      setProjectEditOpen(false)
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingProject(false)
    }
  }

  function deleteProject() {
    if (!confirm('Удалить проект? Связанные задачи могут остаться в БД в зависимости от настроек.')) return
    projectsApi
      .delete(projectId)
      .then(() => navigate('/projects'))
      .catch((e) => alert(e.message))
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
  if (!project) return <div className="page-shell"><p className="muted">Проект не найден</p></div>

  return (
    <div className="page-shell project-detail">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link to="/projects" className="muted" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            ← К проектам
          </Link>
          <h1 style={{ marginTop: 10 }}>{project.title}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 10, maxWidth: '60ch', lineHeight: 1.55 }}>
            {project.description || 'Без описания'}
          </p>
          {isOwner && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <Button type="default" size="sm" onClick={openProjectEdit}>
                Изменить проект
              </Button>
              <Button type="danger" size="sm" onClick={deleteProject}>
                Удалить проект
              </Button>
            </div>
          )}
        </div>
        <Button type="primary" onClick={() => setTaskModalOpen(true)}>
          + Добавить задачу
        </Button>
      </div>

      {isOwner && (
        <Card title="Участники проекта" extra={null}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Исполнителем задачи может быть только участник проекта. Добавьте пользователя по email (он должен быть
            уже зарегистрирован).
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: '1.2em' }}>
            {memberOptions.map((u) => (
              <li key={u.id}>{u.email}</li>
            ))}
            {!memberOptions.length && <li className="muted">Нет участников</li>}
          </ul>
          <form onSubmit={addMember} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email коллеги"
              style={{ maxWidth: 280 }}
            />
            <Button type="primary" htmlType="submit" loading={inviting}>
              Добавить в проект
            </Button>
          </form>
        </Card>
      )}

      <div className="grid-2" style={{ marginTop: 20 }}>
        <Card title="Задачи">
          {tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                margin: '0 -14px',
                borderBottom: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <Link to={`/tasks/${task.id}`} style={{ fontWeight: 600, color: 'var(--text)' }}>
                  {task.title}
                </Link>
                <CategoryBadges items={task.categories || []} empty="Без категорий" />
                {task.executor && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→ {task.executor.email}</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {statusLabels[task.status] || task.status}
                </span>
                {user && task.status !== 'DONE' && (
                  <Button
                    type="primary"
                    size="sm"
                    loading={completingTaskId === task.id}
                    onClick={() => completeTaskRow(task.id)}
                  >
                    Завершить
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!tasks.length && <p className="empty">Пока нет задач — добавьте первую.</p>}
        </Card>

        <Card title="Чат проекта">
          <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {chatMessages.map((m) => (
              <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>
                  {m.user?.email || 'Аноним'}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{m.text}</span>
              </div>
            ))}
            {!chatMessages.length && <p className="muted">Нет сообщений</p>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Сообщение…"
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            />
            <Button type="primary" onClick={sendChat}>
              Отправить
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={taskModalOpen} title="Новая задача" onClose={() => setTaskModalOpen(false)}>
        <form onSubmit={createTask}>
          <FormItem label="Название">
            <Input
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Название"
              required
            />
          </FormItem>
          <FormItem label="Описание">
            <Input
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
            />
          </FormItem>
          <FormItem label="Категории">
            <CategoryPicker
              categories={allCategories}
              selectedIds={taskForm.category_ids}
              onChange={(ids) => setTaskForm((f) => ({ ...f, category_ids: ids }))}
            />
          </FormItem>
          <FormItem label="Исполнитель">
            <select
              style={selectStyle}
              value={taskForm.executor_id}
              onChange={(e) => setTaskForm((f) => ({ ...f, executor_id: e.target.value }))}
            >
              <option value="">Не назначен</option>
              {memberOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Только участники проекта.</p>
          </FormItem>
          <FormItem label="Статус">
            <select
              style={selectStyle}
              value={taskForm.status}
              onChange={(e) => setTaskForm((f) => ({ ...f, status: e.target.value }))}
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
              value={taskForm.priority}
              onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {priorityOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormItem>
          <Button type="primary" htmlType="submit" loading={saving}>
            Создать
          </Button>
        </form>
      </Modal>

      <Modal open={projectEditOpen} title="Редактировать проект" onClose={() => setProjectEditOpen(false)}>
        <form onSubmit={saveProject}>
          <FormItem label="Название">
            <Input
              value={projectForm.title}
              onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </FormItem>
          <FormItem label="Описание">
            <Input
              value={projectForm.description}
              onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
            />
          </FormItem>
          <Button type="primary" htmlType="submit" loading={savingProject}>
            Сохранить
          </Button>
        </form>
      </Modal>
    </div>
  )
}
