from fastapi import APIRouter, Depends, Query

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.config import get_db
from app.models.base import Task
from app.schemas.schemas import SearchResponse, SearchHitTask
from app.api.auth import get_current_user
from app.services.task_access import tasks_visible_filter

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/", response_model=SearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, max_length=120),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    term = f"%{q.strip()}%"
    stmt = (
        select(Task)
        .where(Task.title.ilike(term), tasks_visible_filter(current_user.id))
        .order_by(Task.sort_order.asc(), Task.title.asc())
        .limit(30)
    )
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    hits = [
        SearchHitTask(
            id=t.id,
            title=t.title,
            status=t.status if isinstance(t.status, str) else getattr(t.status, "value", str(t.status)),
            issue_type=t.issue_type
            if isinstance(t.issue_type, str)
            else getattr(t.issue_type, "value", str(t.issue_type)),
            project_id=t.project_id,
        )
        for t in tasks
    ]
    return SearchResponse(tasks=hits)
