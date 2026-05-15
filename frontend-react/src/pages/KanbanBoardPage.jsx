import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { tasks, projects } from '../api/client'

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
const COL_LABELS = {
  BACKLOG: 'Бэклог',
  TODO: 'К выполнению',
  IN_PROGRESS: 'В работе',
  REVIEW: 'Ревью',
  DONE: 'Готово',
}

function Column({ status, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className={`kanban-col ${isOver ? 'kanban-col-over' : ''}`}>
      <div className="kanban-col-head">{COL_LABELS[status] || status}</div>
      <div ref={setNodeRef} className="kanban-col-body">
        {children}
      </div>
    </div>
  )
}

function DraggableTask({ task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px,${transform.y}px,0)`,
        opacity: isDragging ? 0.35 : 1,
      }
    : undefined
  return (
    <div ref={setNodeRef} style={style} className="kanban-card">
      <button type="button" className="kanban-drag-handle" {...listeners} {...attributes} aria-label="Перетащить">
       ⠿
      </button>
      <div className="kanban-card-body">
        <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        <div className="kanban-card-meta">
          <span>{task.issue_type}</span>
          {task.story_points != null ? <span>{task.story_points} sp</span> : null}
        </div>
      </div>
    </div>
  )
}

export function KanbanBoardPage() {
  const [taskList, setTaskList] = useState([])
  const [projectList, setProjectList] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    projects.list().then(setProjectList).catch(console.error)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const params = {}
        if (projectId) params.project_id = projectId
        const data = await tasks.list(params)
        if (!cancelled) setTaskList(data)
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const byStatus = useMemo(() => {
    const m = Object.fromEntries(STATUSES.map((s) => [s, []]))
    taskList.forEach((t) => {
      const s = typeof t.status === 'string' ? t.status : t.status?.value ?? 'TODO'
      const bucket = STATUSES.includes(s) ? s : 'TODO'
      m[bucket].push(t)
    })
    return m
  }, [taskList])

  function handleDragStart(e) {
    setActiveId(e.active.id)
  }

  async function handleDragEnd(e) {
    const { active, over } = e
    setActiveId(null)
    if (!over || !STATUSES.includes(String(over.id))) return
    const taskId = active.id
    const newStatus = String(over.id)
    const task = taskList.find((x) => x.id === taskId)
    if (!task || task.status === newStatus) return
    try {
      await tasks.update(taskId, { status: newStatus })
      setTaskList((prev) => prev.map((x) => (x.id === taskId ? { ...x, status: newStatus } : x)))
    } catch (err) {
      console.error(err)
      alert(err.message || String(err))
    }
  }

  const activeTask = activeId ? taskList.find((t) => t.id === activeId) : null

  return (
    <div className="kanban-page">
      <header className="kanban-toolbar">
        <div>
          <h1>Kanban-доска</h1>
          <p className="muted">
            Интерфейс заточен под экосистему React: декларативный UI и перетаскивание через @dnd-kit.
          </p>
        </div>
        <label className="kanban-filter">
          Проект{' '}
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Все доступные</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </header>
      {loading && <p className="muted">Загрузка карточек…</p>}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="kanban-board">
          {STATUSES.map((status) => (
            <Column key={status} status={status}>
              {(byStatus[status] || []).map((task) => (
                <DraggableTask key={task.id} task={task} />
              ))}
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects }}>
          {activeTask ? (
            <div className="kanban-card kanban-card-overlay">
              <span className="kanban-drag-handle muted">⠿</span>
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
