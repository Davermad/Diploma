from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.config import get_db
from app.models.base import Project, Sprint
from app.schemas.schemas import SprintCreate, SprintUpdate, Sprint as SprintSchema
from app.api.auth import get_current_user
from app.api.projects import _get_project_with_access

router = APIRouter(prefix="/projects", tags=["Sprints"])


@router.get("/{project_id}/sprints", response_model=list[SprintSchema])
async def list_sprints(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    result = await db.execute(select(Sprint).where(Sprint.project_id == project_id).order_by(Sprint.start_date.desc()))
    return result.scalars().all()


@router.post("/{project_id}/sprints", response_model=SprintSchema)
async def create_sprint(
    project_id: str,
    data: SprintCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только владелец проекта управляет спринтами")

    sp = Sprint(project_id=project_id, **data.model_dump())
    db.add(sp)
    await db.commit()
    await db.refresh(sp)
    return sp


@router.put("/{project_id}/sprints/{sprint_id}", response_model=SprintSchema)
async def update_sprint(
    project_id: str,
    sprint_id: str,
    data: SprintUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только владелец проекта управляет спринтами")

    result = await db.execute(
        select(Sprint).where(Sprint.id == sprint_id, Sprint.project_id == project_id)
    )
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Sprint not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sp, k, v)

    await db.commit()
    await db.refresh(sp)
    return sp


@router.delete("/{project_id}/sprints/{sprint_id}", status_code=204)
async def delete_sprint(
    project_id: str,
    sprint_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = await _get_project_with_access(project_id, db, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только владелец проекта управляет спринтами")

    result = await db.execute(
        select(Sprint).options(selectinload(Sprint.tasks)).where(
            Sprint.id == sprint_id, Sprint.project_id == project_id
        )
    )
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Sprint not found")
    for t in sp.tasks:
        t.sprint_id = None
    await db.delete(sp)
    await db.commit()
