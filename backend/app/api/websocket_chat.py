import json
import os
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.config import AsyncSessionLocal, get_db
from app.models.base import User, Task, TaskComment, GlobalMessage
from app.api.auth import get_current_user
from app.schemas.schemas import GlobalMessage as GlobalMessageSchema, GlobalMessageCreate

router = APIRouter(prefix="/chat", tags=["Chat"])
SECRET_KEY = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super-secret-key"))
ALGORITHM = "HS256"


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, list[tuple[WebSocket, User]]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user: User, room: str):
        await websocket.accept()
        self.rooms[room].append((websocket, user))

    def disconnect(self, websocket: WebSocket, room: str):
        conns = self.rooms.get(room, [])
        self.rooms[room] = [(ws, u) for ws, u in conns if ws != websocket]
        if not self.rooms[room]:
            del self.rooms[room]

    async def broadcast(self, room: str, message: dict, exclude: Optional[WebSocket] = None):
        for ws, _ in self.rooms.get(room, []):
            if ws != exclude and ws.client_state.name == "CONNECTED":
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


async def get_user_from_token(token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


def _user_can_access_task(task: Task, user: User) -> bool:
    if task.creator_id == user.id or task.owner_id == user.id:
        return True
    if task.executor_id == user.id:
        return True
    return any(o.id == user.id for o in (task.observers or []))


@router.get("/global/messages", response_model=list[GlobalMessageSchema])
async def get_global_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """History of global chat (all registered users)."""
    result = await db.execute(
        select(GlobalMessage)
        .options(selectinload(GlobalMessage.user))
        .order_by(GlobalMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/global/messages", response_model=GlobalMessageSchema)
async def post_global_message(
    body: GlobalMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Пустое сообщение")
    gm = GlobalMessage(user_id=current_user.id, text=text)
    db.add(gm)
    await db.commit()
    await db.refresh(gm)
    await db.refresh(gm, ["user"])
    payload = {
        "type": "message",
        "id": gm.id,
        "user_id": current_user.id,
        "email": current_user.email,
        "text": text,
        "created_at": gm.created_at.isoformat() if gm.created_at else None,
    }
    await manager.broadcast("global", payload)
    return gm


@router.websocket("/ws/global")
async def websocket_global_chat(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token"),
):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, user, "global")
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            text = msg.get("text", "").strip()
            if not text:
                continue

            async with AsyncSessionLocal() as db:
                gm = GlobalMessage(user_id=user.id, text=text)
                db.add(gm)
                await db.commit()
                await db.refresh(gm)
                await db.refresh(gm, ["user"])

            payload = {
                "type": "message",
                "id": gm.id,
                "user_id": user.id,
                "email": user.email,
                "text": text,
                "created_at": gm.created_at.isoformat() if gm.created_at else None,
            }
            await manager.broadcast("global", payload)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, "global")


@router.websocket("/ws/tasks/{task_id}")
async def websocket_task_chat(
    websocket: WebSocket,
    task_id: str,
    token: str = Query(..., description="JWT token"),
):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Task)
            .options(selectinload(Task.creator), selectinload(Task.executor), selectinload(Task.observers))
            .where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        if not task or not _user_can_access_task(task, user):
            await websocket.close(code=4003)
            return

    room = f"task_{task_id}"
    await manager.connect(websocket, user, room)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            text = msg.get("text", "").strip()
            if not text:
                continue

            async with AsyncSessionLocal() as db:
                tc = TaskComment(task_id=task_id, user_id=user.id, text=text)
                db.add(tc)
                await db.commit()
                await db.refresh(tc)
                await db.refresh(tc, ["user"])

            payload = {
                "type": "message",
                "id": tc.id,
                "task_id": task_id,
                "user_id": user.id,
                "email": user.email,
                "text": text,
                "created_at": tc.created_at.isoformat() if tc.created_at else None,
            }
            await manager.broadcast(room, payload)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, room)
