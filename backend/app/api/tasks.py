from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.db.config import get_db
from app.models.base import (
    Category,
    IssueTypeEnum,
    Project,
    Sprint,
    StatusEnum,
    Task,
    TaskComment,
    User,
    WorkLog,
)
from app.schemas.schemas import (
    TaskCommentCreate,
    TaskComment as TaskCommentSchema,
    TaskCreate,
    TaskUpdate,
    Task as TaskSchema,
    WorkLogCreate,
    WorkLog as WorkLogSchema,
)
from app.services.crm_hooks import log_activity, notify_user
from app.services.task_access import (
    tasks_visible_filter,
    user_can_access_task,
    user_can_edit_task_metadata,
)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _task_enums_to_str(data: dict) -> dict:
    for key in ("status", "priority", "issue_type"):
        v = data.get(key)
        if v is not None and hasattr(v, "value"):
            data[key] = v.value
    return data


def _normalize_deadline_for_db(data: dict) -> None:
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
        selectinload(Task.sprint),
        selectinload(Task.parent),
    )


def _tasks_query_for_user(user_id: str):
    return _task_base_query().where(tasks_visible_filter(user_id))


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


async def _validate_sprint_project(db: AsyncSession, sprint_id: Optional[str], project_id: Optional[str]) -> None:
    if not sprint_id:
        return
    res = await db.execute(select(Sprint).where(Sprint.id == sprint_id))
    sp = res.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=400, detail="Спринт не найден")
    if project_id and sp.project_id != project_id:
        raise HTTPException(status_code=400, detail="Спринт принадлежит другому проекту")


async def _validate_parent(db: AsyncSession, parent_id: Optional[str], project_id: Optional[str]) -> None:
    if not parent_id:
        return
    res = await db.execute(select(Task).where(Task.id == parent_id))
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=400, detail="Родительская задача не найдена")
    if project_id and p.project_id != project_id:
        raise HTTPException(status_code=400, detail="Эпик или родитель должны быть в том же проекте")


@router.post("/", response_model=TaskSchema)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = _task_enums_to_str(task_data.model_dump())
    _normalize_deadline_for_db(data)
    category_ids = data.pop("category_ids", [])
    executor_id = data.pop("executor_id", None)
    observer_ids = data.pop("observer_ids", [])
    sprint_id = data.get("sprint_id")
    project_id = data.get("project_id")
    parent_id = data.get("parent_id")

    await _ensure_executor_in_project(db, project_id, executor_id)
    await _validate_sprint_project(db, sprint_id, project_id)
    await _validate_parent(db, parent_id, project_id)

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
    await db.flush()

    await log_activity(
        db,
        user_id=current_user.id,
        action="task_created",
        entity_type="task",
        entity_id=new_task.id,
        meta={"title": new_task.title},
    )
    if project_id:
        await log_activity(
            db,
            user_id=current_user.id,
            action="task_created_in_project",
            entity_type="project",
            entity_id=project_id,
            meta={"task_id": new_task.id, "title": new_task.title},
        )

    if executor_id and executor_id != current_user.id:
        await notify_user(
            db,
            user_id=executor_id,
            title="Вас назначили исполнителем",
            body=new_task.title,
            link=f"/#/tasks/{new_task.id}",
        )

    await db.commit()
    result = await db.execute(_task_base_query().where(Task.id == new_task.id))
    return result.scalar_one()


@router.get("/", response_model=list[TaskSchema])
async def get_tasks(
    project_id: str | None = Query(None),
    sprint_id: str | None = Query(None),
    status: StatusEnum | None = Query(None),
    issue_type: IssueTypeEnum | None = Query(None),
    parent_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _tasks_query_for_user(current_user.id)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if sprint_id:
        query = query.where(Task.sprint_id == sprint_id)
    if status:
        sv = status.value if hasattr(status, "value") else str(status)
        query = query.where(Task.status == sv)
    if issue_type:
        iv = issue_type.value if hasattr(issue_type, "value") else str(issue_type)
        query = query.where(Task.issue_type == iv)
    if parent_id:
        query = query.where(Task.parent_id == parent_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{task_id}/comments", response_model=list[TaskCommentSchema])
async def get_task_comments(
    task_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_tasks_query_for_user(current_user.id).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not await user_can_access_task(db, task, current_user):
        raise HTTPException(status_code=403, detail="No access")

    cmt_result = await db.execute(
        select(TaskComment)
        .options(selectinload(TaskComment.user))
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return cmt_result.scalars().all()


@router.post("/{task_id}/comments", response_model=TaskCommentSchema)
async def create_task_comment(
    task_id: str,
    data: TaskCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_task_base_query().where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not await user_can_access_task(db, task, current_user):
        raise HTTPException(status_code=403, detail="No access")

    comment = TaskComment(task_id=task_id, user_id=current_user.id, text=data.text)
    db.add(comment)
    await log_activity(
        db,
        user_id=current_user.id,
        action="comment_added",
        entity_type="task",
        entity_id=task_id,
        meta={"preview": data.text[:120]},
    )
    await db.commit()
    await db.refresh(comment)
    await db.refresh(comment, ["user"])
    return comment


@router.get("/{task_id}/work-logs", response_model=list[WorkLogSchema])
async def list_work_logs(
    task_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or not await user_can_access_task(db, task, current_user):
        raise HTTPException(status_code=404, detail="Task not found")

    wl_result = await db.execute(
        select(WorkLog)
        .options(selectinload(WorkLog.user))
        .where(WorkLog.task_id == task_id)
        .order_by(WorkLog.logged_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return wl_result.scalars().all()


@router.post("/{task_id}/work-logs", response_model=WorkLogSchema)
async def add_work_log(
    task_id: str,
    data: WorkLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or not await user_can_access_task(db, task, current_user):
        raise HTTPException(status_code=404, detail="Task not found")

    wl = WorkLog(task_id=task_id, user_id=current_user.id, minutes_spent=data.minutes_spent, note=data.note)
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    await db.refresh(wl, ["user"])
    return wl


@router.get("/{task_id}", response_model=TaskSchema)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_tasks_query_for_user(current_user.id).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(_task_base_query().where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not await user_can_access_task(db, task, current_user):
        raise HTTPException(status_code=403, detail="No access")

    can_meta = await user_can_edit_task_metadata(db, task, current_user)
    prev_executor = task.executor_id
    raw = task_data.model_dump(exclude_unset=True)
    data = _task_enums_to_str(raw.copy())
    _normalize_deadline_for_db(data)

    executor_explicit = "executor_id" in raw
    category_ids = data.pop("category_ids", None)
    executor_id = data.pop("executor_id", None)
    observer_ids = data.pop("observer_ids", None)

    if can_meta:
        merged_project = data["project_id"] if "project_id" in data else task.project_id
        merged_sprint = data["sprint_id"] if "sprint_id" in data else task.sprint_id
        merged_parent = data["parent_id"] if "parent_id" in data else task.parent_id

        await _validate_sprint_project(db, merged_sprint, merged_project)
        await _validate_parent(db, merged_parent, merged_project)

        for k, v in data.items():
            setattr(task, k, v)

        if executor_explicit:
            if executor_id is None:
                task.executor_id = None
            else:
                await _ensure_executor_in_project(db, task.project_id, executor_id)
                ex_row = await db.execute(select(User).where(User.id == executor_id))
                ex = ex_row.scalar_one_or_none()
                task.executor_id = executor_id if ex else None

            if task.executor_id and task.executor_id != prev_executor and task.executor_id != current_user.id:
                await notify_user(
                    db,
                    user_id=task.executor_id,
                    title="Вас назначили исполнителем",
                    body=task.title,
                    link=f"/#/tasks/{task.id}",
                )

        if observer_ids is not None:
            obs_row = await db.execute(select(User).where(User.id.in_(observer_ids)))
            task.observers = obs_row.scalars().all()

        if category_ids is not None:
            cat_row = await db.execute(select(Category).where(Category.id.in_(category_ids)))
            task.categories = cat_row.scalars().all()

        await log_activity(
            db,
            user_id=current_user.id,
            action="task_updated",
            entity_type="task",
            entity_id=task.id,
            meta={"fields": list(raw.keys())},
        )
    else:
        if task.executor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Недостаточно прав для изменения задачи")

        if "status" in data:
            setattr(task, "status", data["status"])
            await log_activity(
                db,
                user_id=current_user.id,
                action="status_changed",
                entity_type="task",
                entity_id=task.id,
                meta={"status": data["status"]},
            )

    await db.commit()
    result = await db.execute(_task_base_query().where(Task.id == task_id))
    return result.scalar_one()


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.creator_id != current_user.id and task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only creator can delete")
    await db.delete(task)
    await db.commit()
