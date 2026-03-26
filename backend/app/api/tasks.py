from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from app.models.base import task_observers

from app.db.config import get_db
from app.models.base import Task, Category, User, StatusEnum, TaskComment, Project
from app.schemas.schemas import TaskCreate, TaskUpdate, Task as TaskSchema, TaskCommentCreate, TaskComment as TaskCommentSchema
from app.api.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _task_enums_to_str(data: dict) -> dict:
    """Колонки status/priority — VARCHAR; asyncpg не принимает Python Enum."""
    for key in ("status", "priority"):
        v = data.get(key)
        if v is not None and hasattr(v, "value"):
            data[key] = v.value
    return data


def _normalize_deadline_for_db(data: dict) -> None:
    """TIMESTAMP WITHOUT TIME ZONE: убираем tzinfo (иначе asyncpg: naive vs aware)."""
    if "deadline" not in data or data["deadline"] is None:
        return
    d = data["deadline"]
    if isinstance(d, datetime) and d.tzinfo is not None:
        data["deadline"] = d.astimezone(timezone.utc).replace(tzinfo=None)


def _task_base_query():
    return select(Task).options(
        selectinload(Task.categories),
        selectinload(Task.project).selectinload(Project.members),
        selectinload(Task.creator),
        selectinload(Task.executor),
        selectinload(Task.observers),
    )


def _tasks_for_user(user_id: str):
    """Tasks visible to user: owner, creator, executor, or observer."""
    subq = select(Task.id).join(task_observers).where(task_observers.c.user_id == user_id)
    return _task_base_query().where(
        or_(
            Task.owner_id == user_id,
            Task.creator_id == user_id,
            Task.executor_id == user_id,
            Task.id.in_(subq),
        )
    )


def _user_can_edit_task(task: Task, user: User) -> bool:
    """Creator has full access."""
    return task.creator_id == user.id or task.owner_id == user.id


async def _ensure_executor_in_project(
    db: AsyncSession,
    project_id: Optional[str],
    executor_id: Optional[str],
) -> None:
    if not executor_id or not project_id:
        return
    res = await db.execute(
        select(Project).options(selectinload(Project.members)).where(Project.id == project_id)
    )
    proj = res.scalar_one_or_none()
    if not proj:
        return
    allowed = {proj.owner_id} | {m.id for m in (proj.members or [])}
    if executor_id not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Исполнитель должен быть участником проекта (владелец или участник)",
        )


def _user_can_access_task(task: Task, user: User) -> bool:
    """Creator, executor, or observer can access (read + chat)."""
    if task.creator_id == user.id or task.owner_id == user.id:
        return True
    if task.executor_id == user.id:
        return True
    return any(o.id == user.id for o in task.observers)


@router.post("/", response_model=TaskSchema)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = _task_enums_to_str(task_data.model_dump())
    _normalize_deadline_for_db(data)
    category_ids = data.pop("category_ids", [])
    executor_id = data.pop("executor_id", None)
    observer_ids = data.pop("observer_ids", [])

    await _ensure_executor_in_project(db, data.get("project_id"), executor_id)

    new_task = Task(
        **data,
        owner_id=current_user.id,
        creator_id=current_user.id,
        executor_id=executor_id,
    )

    if category_ids:
        result = await db.execute(select(Category).where(Category.id.in_(category_ids)))
        new_task.categories = result.scalars().all()

    if observer_ids:
        result = await db.execute(select(User).where(User.id.in_(observer_ids)))
        new_task.observers = result.scalars().all()

    db.add(new_task)
    await db.commit()
    # Иначе response_model тянет creator/categories/... лениво → MissingGreenlet и 500 без CORS
    result = await db.execute(_task_base_query().where(Task.id == new_task.id))
    return result.scalar_one()


@router.get("/", response_model=list[TaskSchema])
async def get_tasks(
    project_id: str | None = Query(None),
    status: StatusEnum | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = _tasks_for_user(current_user.id)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if status:
        query = query.where(Task.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{task_id}/comments", response_model=list[TaskCommentSchema])
async def get_task_comments(
    task_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        _tasks_for_user(current_user.id).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _user_can_access_task(task, current_user):
        raise HTTPException(status_code=403, detail="No access")
    from sqlalchemy.orm import selectinload
    cmt_result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.user))
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    comments = cmt_result.scalars().all()
    return comments


@router.post("/{task_id}/comments", response_model=TaskCommentSchema)
async def create_task_comment(
    task_id: str,
    data: TaskCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        _task_base_query().where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _user_can_access_task(task, current_user):
        raise HTTPException(status_code=403, detail="No access")
    comment = TaskComment(task_id=task_id, user_id=current_user.id, text=data.text)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    await db.refresh(comment, ["user"])
    return comment


@router.get("/{task_id}", response_model=TaskSchema)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        _tasks_for_user(current_user.id).where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        _task_base_query().where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _user_can_access_task(task, current_user):
        raise HTTPException(status_code=403, detail="No access")
    # Only creator can change executor/observers/title/description; executor can change status
    data = _task_enums_to_str(task_data.model_dump(exclude_unset=True))
    _normalize_deadline_for_db(data)
    executor_explicit = "executor_id" in data
    category_ids = data.pop("category_ids", None)
    executor_id = data.pop("executor_id", None)
    observer_ids = data.pop("observer_ids", None)

    if _user_can_edit_task(task, current_user):
        for k, v in data.items():
            setattr(task, k, v)
        if executor_explicit:
            if executor_id is None:
                task.executor_id = None
            else:
                await _ensure_executor_in_project(db, task.project_id, executor_id)
                result = await db.execute(select(User).where(User.id == executor_id))
                ex = result.scalar_one_or_none()
                task.executor_id = executor_id if ex else None
        if observer_ids is not None:
            result = await db.execute(select(User).where(User.id.in_(observer_ids)))
            task.observers = result.scalars().all()
        if category_ids is not None:
            result = await db.execute(select(Category).where(Category.id.in_(category_ids)))
            task.categories = result.scalars().all()
    else:
        # Executor/observer: only status
        if "status" in data:
            setattr(task, "status", data["status"])
        data.pop("status", None)
        for k, v in data.items():
            if k in ("title", "description", "priority", "deadline", "project_id"):
                pass  # skip
            else:
                setattr(task, k, v)

    await db.commit()
    result = await db.execute(_task_base_query().where(Task.id == task_id))
    return result.scalar_one()


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not _user_can_edit_task(task, current_user):
        raise HTTPException(status_code=403, detail="Only creator can delete")
    await db.delete(task)
    await db.commit()
