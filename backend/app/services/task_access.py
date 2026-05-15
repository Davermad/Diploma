"""Единая проверка доступа к задачам (включая участников проекта)."""
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Task, User, Project, project_members, task_observers


def user_can_access_task_loaded(task: Task, user: User) -> bool:
    """Доступ без запроса к БД: нужны загруженные observers."""
    if task.creator_id == user.id or task.owner_id == user.id:
        return True
    if task.executor_id == user.id:
        return True
    if task.observers and any(o.id == user.id for o in task.observers):
        return True
    return False


async def user_can_access_task(db: AsyncSession, task: Task, user: User) -> bool:
    if user_can_access_task_loaded(task, user):
        return True
    if not task.project_id:
        return False
    owner_row = await db.execute(select(Project.owner_id).where(Project.id == task.project_id))
    oid = owner_row.scalar_one_or_none()
    if oid == user.id:
        return True
    mem = await db.execute(
        select(project_members.c.user_id).where(
            project_members.c.project_id == task.project_id,
            project_members.c.user_id == user.id,
        )
    )
    return mem.first() is not None


async def user_can_edit_task_metadata(db: AsyncSession, task: Task, user: User) -> bool:
    """Редактирование полей задачи: автор/владелец или админ проекта."""
    if task.creator_id == user.id or task.owner_id == user.id:
        return True
    if not task.project_id:
        return False
    owner_row = await db.execute(select(Project.owner_id).where(Project.id == task.project_id))
    if owner_row.scalar_one_or_none() == user.id:
        return True
    role_row = await db.execute(
        select(project_members.c.role).where(
            project_members.c.project_id == task.project_id,
            project_members.c.user_id == user.id,
        )
    )
    r = role_row.scalar_one_or_none()
    return r == "ADMIN"


def tasks_visible_filter(user_id: str):
    """Условие SQLAlchemy: задачи, видимые пользователю."""
    subq_obs = select(task_observers.c.task_id).where(task_observers.c.user_id == user_id)
    member_projects = select(project_members.c.project_id).where(project_members.c.user_id == user_id)
    owned_projects = select(Project.id).where(Project.owner_id == user_id)
    return or_(
        Task.owner_id == user_id,
        Task.creator_id == user_id,
        Task.executor_id == user_id,
        Task.id.in_(subq_obs),
        Task.project_id.in_(member_projects),
        Task.project_id.in_(owned_projects),
    )
