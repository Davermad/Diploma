import json

from fastapi import APIRouter, Depends, Query

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.db.config import get_db
from app.models.base import ActivityLog, Task, Project, project_members
from app.schemas.schemas import ActivityEntry
from app.api.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/", response_model=list[ActivityEntry])
async def feed(
    limit: int = Query(40, ge=1, le=200),
    task_id: str | None = None,
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(ActivityLog).options(selectinload(ActivityLog.user))

    if task_id:
        t = await db.execute(select(Task).where(Task.id == task_id))
        task = t.scalar_one_or_none()
        if not task:
            return []
        q = q.where(ActivityLog.entity_type == "task", ActivityLog.entity_id == task_id)
    elif project_id:
        p = await db.execute(select(Project).where(Project.id == project_id))
        proj = p.scalar_one_or_none()
        if not proj:
            return []
        if proj.owner_id != current_user.id:
            mem = await db.execute(
                select(project_members.c.user_id).where(
                    project_members.c.project_id == project_id,
                    project_members.c.user_id == current_user.id,
                )
            )
            if mem.first() is None:
                return []
        sub_tasks = select(Task.id).where(Task.project_id == project_id)
        q = q.where(
            or_(
                and_(ActivityLog.entity_type == "project", ActivityLog.entity_id == project_id),
                and_(ActivityLog.entity_type == "task", ActivityLog.entity_id.in_(sub_tasks)),
            )
        )
    else:
        q = q.where(ActivityLog.user_id == current_user.id)

    result = await db.execute(q.order_by(ActivityLog.created_at.desc()).limit(limit))
    rows = result.scalars().all()

    out: list[ActivityEntry] = []
    for r in rows:
        meta = None
        if r.meta_json:
            try:
                meta = json.loads(r.meta_json)
            except json.JSONDecodeError:
                meta = None
        out.append(
            ActivityEntry(
                id=r.id,
                user_id=r.user_id,
                user=r.user,
                action=r.action,
                entity_type=r.entity_type,
                entity_id=r.entity_id,
                meta=meta,
                created_at=r.created_at,
            )
        )
    return out
