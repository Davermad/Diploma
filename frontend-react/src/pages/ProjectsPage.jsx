import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projects as projectsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { FormItem } from '../components/FormItem'

export function ProjectsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', title: '', description: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  async function load() {
    try {
      setList(await projectsApi.list())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createProject(e) {
    e.preventDefault()
    if (!form.title?.trim()) {
      alert('Введите название проекта')
      return
    }
    setSaving(true)
    try {
      await projectsApi.create(form)
      setModalOpen(false)
      setForm({ title: '', description: '' })
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editForm.title?.trim()) {
      alert('Введите название')
      return
    }
    setSavingEdit(true)
    try {
      await projectsApi.update(editForm.id, {
        title: editForm.title,
        description: editForm.description || null,
      })
      setEditOpen(false)
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  function openEdit(p) {
    setEditForm({ id: p.id, title: p.title, description: p.description || '' })
    setEditOpen(true)
  }

  async function removeProject(p) {
    if (!confirm(`Удалить проект «${p.title}»?`)) return
    try {
      await projectsApi.delete(p.id)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="page-shell">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1>Проекты</h1>
          <p className="page-lead">
            Внутри проекта — задачи, чат и участники (для назначения исполнителей).
          </p>
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Создать проект
        </Button>
      </div>
      {loading && <p className="skeleton-text">Загрузка…</p>}
      {!loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 22,
          }}
        >
          {list.map((project) => (
            <Card key={project.id} title={project.title}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
                {project.description || 'Без описания'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button type="primary" size="sm" onClick={() => navigate(`/projects/${project.id}`)}>
                  Открыть
                </Button>
                {user?.id === project.owner_id && (
                  <>
                    <Button type="default" size="sm" onClick={() => openEdit(project)}>
                      Изменить
                    </Button>
                    <Button type="danger" size="sm" onClick={() => removeProject(project)}>
                      Удалить
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {!loading && !list.length && <p className="muted">Нет проектов — создайте первый.</p>}

      <Modal open={modalOpen} title="Новый проект" onClose={() => setModalOpen(false)}>
        <form onSubmit={createProject}>
          <FormItem label="Название">
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Название проекта"
              required
            />
          </FormItem>
          <FormItem label="Описание">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
            />
          </FormItem>
          <Button type="primary" htmlType="submit" loading={saving}>
            Создать
          </Button>
        </form>
      </Modal>

      <Modal open={editOpen} title="Редактировать проект" onClose={() => setEditOpen(false)}>
        <form onSubmit={saveEdit}>
          <FormItem label="Название">
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </FormItem>
          <FormItem label="Описание">
            <Input
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Описание"
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
