from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, cast, select
from sqlalchemy.types import Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.config import get_db
from app.models.base import Task, Project, StatusEnum
from app.api.auth import get_current_user
from app.services.task_access import tasks_visible_filter

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/")
async def get_stats(
    period: str = Query("all", description="week|month|all"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.utcnow()
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    else:
        start = None

    uid = current_user.id

    q = (
        select(Task.status, func.count(Task.id))
        .where(tasks_visible_filter(uid))
        .group_by(Task.status)
    )
    status_result = await db.execute(q)
    by_status = dict(status_result.all())

    overdue_q = (
        select(func.count(Task.id))
        .where(tasks_visible_filter(uid))
        .where(Task.deadline.is_not(None))
        .where(Task.deadline < now)
        .where(Task.status != StatusEnum.DONE.value)
    )
    overdue_result = await db.execute(overdue_q)
    overdue_count = overdue_result.scalar() or 0

    completed_q = (
        select(func.count(Task.id))
        .where(tasks_visible_filter(uid))
        .where(Task.status == StatusEnum.DONE.value)
    )
    if start:
        completed_q = completed_q.where(Task.deadline.is_not(None)).where(Task.deadline >= start)
    completed_res = await db.execute(completed_q)
    completed_count = completed_res.scalar() or 0

    trend = []
    if start:
        trend_q = (
            select(
                cast(Task.deadline, Date).label("day"),
                func.count(Task.id).label("cnt"),
            )
            .where(tasks_visible_filter(uid))
            .where(Task.status == StatusEnum.DONE.value)
            .where(Task.deadline.is_not(None))
            .where(Task.deadline >= start)
            .group_by(cast(Task.deadline, Date))
        )
        trend_res = await db.execute(trend_q)
        trend = [{"date": str(r.day), "count": r.cnt} for r in trend_res.all()]

    overdue_proj_q = (
        select(Project.title, Project.id, func.count(Task.id))
        .join(Task, Task.project_id == Project.id)
        .where(tasks_visible_filter(uid))
        .where(Task.deadline.is_not(None))
        .where(Task.deadline < now)
        .where(Task.status != StatusEnum.DONE.value)
        .group_by(Project.id, Project.title)
    )
    overdue_proj_res = await db.execute(overdue_proj_q)
    overdue_by_project = [{"project_id": r.id, "project_title": r.title, "count": r[2]} for r in overdue_proj_res.all()]

    perf_done_q = (
        select(func.count(Task.id))
        .where(Task.executor_id == uid)
        .where(Task.status == StatusEnum.DONE.value)
    )
    perf_overdue_q = (
        select(func.count(Task.id))
        .where(Task.executor_id == uid)
        .where(Task.deadline.is_not(None))
        .where(Task.deadline < now)
        .where(Task.status != StatusEnum.DONE.value)
    )
    if start:
        perf_done_q = perf_done_q.where(Task.deadline.is_not(None)).where(Task.deadline >= start)
        perf_overdue_q = perf_overdue_q.where(Task.deadline.is_not(None)).where(Task.deadline >= start)
    perf_done = (await db.execute(perf_done_q)).scalar() or 0
    perf_overdue = (await db.execute(perf_overdue_q)).scalar() or 0

    return {
        "by_status": by_status,
        "overdue": overdue_count,
        "completed_count": completed_count,
        "completed_trend": trend,
        "overdue_by_project": overdue_by_project,
        "my_performance": {"completed": perf_done, "overdue": perf_overdue},
    }


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    now = datetime.utcnow()
    uid = current_user.id

    status_q = (
        select(Task.status, func.count(Task.id))
        .where(tasks_visible_filter(uid))
        .group_by(Task.status)
    )
    by_status = dict((await db.execute(status_q)).all())

    overdue_q = (
        select(func.count(Task.id))
        .where(tasks_visible_filter(uid))
        .where(Task.deadline.is_not(None))
        .where(Task.deadline < now)
        .where(Task.status != StatusEnum.DONE.value)
    )
    overdue = (await db.execute(overdue_q)).scalar() or 0

    top_overdue_q = (
        select(Task)
        .where(tasks_visible_filter(uid))
        .where(Task.deadline.is_not(None))
        .where(Task.deadline < now)
        .where(Task.status != StatusEnum.DONE.value)
        .order_by(Task.deadline.asc())
        .limit(10)
    )
    top_overdue = (await db.execute(top_overdue_q)).scalars().all()
    top_overdue_list = [{"id": t.id, "title": t.title, "deadline": t.deadline.isoformat() if t.deadline else None} for t in top_overdue]

    last_done_q = (
        select(Task)
        .where(tasks_visible_filter(uid))
        .where(Task.status == StatusEnum.DONE.value)
        .order_by(Task.deadline.desc().nullslast())
        .limit(10)
    )
    last_done = (await db.execute(last_done_q)).scalars().all()
    last_done_list = [{"id": t.id, "title": t.title, "deadline": t.deadline.isoformat() if t.deadline else None} for t in last_done]

    return {
        "by_status": by_status,
        "overdue_count": overdue,
        "top_overdue": top_overdue_list,
        "last_completed": last_done_list,
    }
