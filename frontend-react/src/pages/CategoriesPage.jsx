import { useEffect, useState } from 'react'
import { categories as categoriesApi } from '../api/client'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { FormItem } from '../components/FormItem'

const DEFAULT_COLOR = '#2563eb'

export function CategoriesPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', color: DEFAULT_COLOR })
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', name: '', color: DEFAULT_COLOR })
  const [savingEdit, setSavingEdit] = useState(false)

  async function load() {
    try {
      setList(await categoriesApi.list())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createCat(e) {
    e.preventDefault()
    if (!form.name?.trim()) {
      alert('Введите название')
      return
    }
    setSaving(true)
    try {
      await categoriesApi.create(form)
      setModalOpen(false)
      setForm({ name: '', color: DEFAULT_COLOR })
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editForm.name?.trim()) {
      alert('Введите название')
      return
    }
    setSavingEdit(true)
    try {
      await categoriesApi.update(editForm.id, { name: editForm.name, color: editForm.color })
      setEditOpen(false)
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  function openEdit(cat) {
    setEditForm({ id: cat.id, name: cat.name, color: cat.color })
    setEditOpen(true)
  }

  async function removeCat(cat) {
    if (!confirm(`Удалить категорию «${cat.name}»?`)) return
    try {
      await categoriesApi.delete(cat.id)
      await load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="page-shell">
      <div style={{ marginBottom: 28 }}>
        <h1>Категории</h1>
        <p className="page-lead">
          Метки для задач: при создании задачи и на странице задачи можно назначить одну или несколько категорий.
        </p>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          + Создать категорию
        </Button>
      </div>
      {loading && <p className="skeleton-text">Загрузка…</p>}
      {!loading && list.length === 0 && (
        <Card title="Пока пусто">
          <p className="muted">Добавьте первую категорию — она появится в форме задачи на странице проекта.</p>
        </Card>
      )}
      {!loading && list.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {list.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
                padding: '18px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                borderLeft: `4px solid ${cat.color}`,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: cat.color,
                }}
              />
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>{cat.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                {cat.color}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Button type="default" size="sm" onClick={() => openEdit(cat)}>
                  Изменить
                </Button>
                <Button type="danger" size="sm" onClick={() => removeCat(cat)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="Новая категория" onClose={() => setModalOpen(false)}>
        <form onSubmit={createCat}>
          <FormItem label="Название">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например: Срочно"
              required
            />
          </FormItem>
          <FormItem label="Цвет">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              style={{ width: 52, height: 40, padding: 4, border: '1px solid var(--border)', borderRadius: 8 }}
            />
            <span className="muted" style={{ marginLeft: 8 }}>
              {form.color}
            </span>
          </FormItem>
          <Button type="primary" htmlType="submit" loading={saving}>
            Создать
          </Button>
        </form>
      </Modal>

      <Modal open={editOpen} title="Редактировать категорию" onClose={() => setEditOpen(false)}>
        <form onSubmit={saveEdit}>
          <FormItem label="Название">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormItem>
          <FormItem label="Цвет">
            <input
              type="color"
              value={editForm.color}
              onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
              style={{ width: 52, height: 40, padding: 4, border: '1px solid var(--border)', borderRadius: 8 }}
            />
            <span className="muted" style={{ marginLeft: 8 }}>
              {editForm.color}
            </span>
          </FormItem>
          <Button type="primary" htmlType="submit" loading={savingEdit}>
            Сохранить
          </Button>
        </form>
      </Modal>
    </div>
  )
}
