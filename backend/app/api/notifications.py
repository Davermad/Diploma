from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.db.config import get_db
from app.models.base import Notification
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = select(Notification).where(Notification.user_id == current_user.id).order_by(
        Notification.created_at.desc()
    )
    if unread_only:
        q = q.where(Notification.read_at.is_(None))
    result = await db.execute(q.limit(limit))
    return result.scalars().all()


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(n)
    return n


@router.post("/read-all", status_code=204)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    now = datetime.now(timezone.utc)
    for n in result.scalars().all():
        n.read_at = now
    await db.commit()
