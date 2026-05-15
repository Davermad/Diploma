"""Запись активности и простые уведомления для CRM-событий."""
import json
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import ActivityLog, Notification


async def log_activity(
    db: AsyncSession,
    *,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    meta: Optional[dict[str, Any]] = None,
) -> None:
    row = ActivityLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        meta_json=json.dumps(meta, ensure_ascii=False) if meta is not None else None,
    )
    db.add(row)


async def notify_user(
    db: AsyncSession,
    *,
    user_id: str,
    title: str,
    body: str,
    link: Optional[str] = None,
) -> None:
    db.add(Notification(user_id=user_id, title=title, body=body, link=link))
