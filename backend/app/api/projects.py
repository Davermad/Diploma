from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from sqlalchemy.orm import selectinload

from app.db.config import get_db
from app.models.base import Project, User, ProjectMessage, project_members
from app.schemas.schemas import (
    ProjectCreate,
    ProjectMemberOut,
    ProjectMemberAdd,
    ProjectMessageCreate,
    ProjectMessage as ProjectMessageSchema,
    ProjectUpdate,
    Project as ProjectSchema,
    UserOut,
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


async def _get_project_with_access(project_id: str, db: AsyncSession, user: User) -> Project | None:
    result = await db.execute(
        select(Project).options(selectinload(Project.members)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        return None
    if project.owner_id == user.id:
        return project
    if any(m.id == user.id for m in (project.members or [])):
        return project
    return None


@router.post("/", response_model=ProjectSchema)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_project = Project(**project_data.model_dump(), owner_id=current_user.id)
    db.add(new_project)
    await db.flush()
    # Явная вставка в association: append() к M2M в async-сессии часто даёт MissingGreenlet / 500
    await db.execute(
        insert(project_members).values(
            project_id=new_project.id,
            user_id=current_user.id,
            role="ADMIN",
        )
    )
    await db.commit()
    # members в response_model — без selectinload сериализация тянет lazy → MissingGreenlet
    result = await db.execute(
        select(Project).options(selectinload(Project.members)).where(Project.id == new_project.id)
    )
    return result.scalar_one()


@router.get("/", response_model=list[ProjectSchema])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    subq = select(project_members.c.project_id).where(project_members.c.user_id == current_user.id)
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.members))
        .where(or_(Project.owner_id == current_user.id, Project.id.in_(subq)))
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for k, v in project_data.model_dump(exclude_unset=True).items():
        setattr(project, k, v)

    await db.commit()
    result = await db.execute(
        select(Project).options(selectinload(Project.members)).where(Project.id == project_id)
    )
    return result.scalar_one()


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()


# --- Project Chat ---
@router.get("/{project_id}/chat/messages", response_model=list[ProjectMessageSchema])
async def get_project_chat_messages(
    project_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or no access")

    result = await db.execute(
        select(ProjectMessage)
        .options(selectinload(ProjectMessage.user))
        .where(ProjectMessage.project_id == project_id)
        .order_by(ProjectMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/{project_id}/members")
async def add_project_member(
    project_id: str,
    data: ProjectMemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found or only owner can add members")

    if data.email:
        user_result = await db.execute(select(User).where(User.email == str(data.email)))
        target = user_result.scalar_one_or_none()
        if not target:
            raise HTTPException(status_code=404, detail="Пользователь с таким email не найден")
        user_id = target.id
    else:
        user_id = data.user_id
        user_result = await db.execute(select(User).where(User.id == user_id))
        if not user_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="User not found")

    dup = (
        await db.execute(
            select(project_members.c.user_id).where(
                project_members.c.project_id == project_id,
                project_members.c.user_id == user_id,
            )
        )
    ).first()
    if dup:
        return {"status": "already_member"}

    await db.execute(
        insert(project_members).values(project_id=project_id, user_id=user_id, role=data.role)
    )
    await db.commit()
    return {"status": "added"}


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
async def list_project_members(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(User, project_members.c.role)
        .join(project_members, User.id == project_members.c.user_id)
        .where(project_members.c.project_id == project_id)
    )
    rows = result.all()
    return [
        ProjectMemberOut(user=UserOut.model_validate(user_row), role=role_val or "MEMBER")
        for user_row, role_val in rows
    ]


@router.post("/{project_id}/chat/messages", response_model=ProjectMessageSchema)
async def create_project_message(
    project_id: str,
    data: ProjectMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or no access")

    msg = ProjectMessage(project_id=project_id, user_id=current_user.id, text=data.text)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    await db.refresh(msg, ["user"])
    return msg
