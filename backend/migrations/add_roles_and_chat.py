"""
Migration: add creator_id, executor_id, task_observers, task_comments, project_messages, project_members.
Run: uv run python migrations/add_roles_and_chat.py
For fresh DB: app startup create_all handles everything.
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def migrate():
    from dotenv import load_dotenv
    load_dotenv()
    url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/mydatabase")
    engine = create_async_engine(url)

    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN creator_id VARCHAR REFERENCES users(id)"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN executor_id VARCHAR REFERENCES users(id)"))
        except Exception:
            pass
        try:
            await conn.execute(text("UPDATE tasks SET creator_id = owner_id WHERE creator_id IS NULL"))
            await conn.execute(text("ALTER TABLE tasks ALTER COLUMN creator_id SET NOT NULL"))
        except Exception:
            pass

        for stmt in [
            """CREATE TABLE IF NOT EXISTS task_observers (
                task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (task_id, user_id))""",
            """CREATE TABLE IF NOT EXISTS project_members (
                project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (project_id, user_id))""",
            """CREATE TABLE IF NOT EXISTS task_comments (
                id VARCHAR PRIMARY KEY,
                task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW())""",
            """CREATE TABLE IF NOT EXISTS project_messages (
                id VARCHAR PRIMARY KEY,
                project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW())""",
            """CREATE TABLE IF NOT EXISTS global_messages (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW())""",
        ]:
            await conn.execute(text(stmt))
    print("Migration done.")

if __name__ == "__main__":
    asyncio.run(migrate())
