from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.config import get_db
from app.models.base import Task, TaskComment, User
from app.schemas.schemas import TaskCommentUpdate, TaskComment as TaskCommentSchema
from app.api.auth import get_current_user
from app.services.task_access import user_can_access_task

router = APIRouter(prefix="/comments", tags=["Task Comments"])


async def _get_task_with_access(task_id: str, db: AsyncSession, user: User) -> Task | None:
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.creator), selectinload(Task.executor), selectinload(Task.observers))
        .where(Task.id == task_id)
    )
    task = result.scalar_one_or_none()
    if not task or not await user_can_access_task(db, task, user):
        return None
    return task


@router.put("/{comment_id}", response_model=TaskCommentSchema)
async def update_comment(
    comment_id: str,
    data: TaskCommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TaskComment).options(selectinload(TaskComment.user)).where(TaskComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit own comment")

    task = await _get_task_with_access(comment.task_id, db, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or no access")

    comment.text = data.text
    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TaskComment).where(TaskComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete own comment")

    task = await _get_task_with_access(comment.task_id, db, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or no access")

    await db.delete(comment)
    await db.commit()
