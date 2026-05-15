"""
Миграция схемы к PulseCRM (колонки и таблицы). Запуск:
  set DATABASE_URL=postgresql+asyncpg://...
  python migrations/crm_v2.py

Для «чистой» БД достаточно create_all при старте бэкенда.
"""
import asyncio
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def migrate():
    from dotenv import load_dotenv

    load_dotenv()
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:password123@localhost:5432/diplom_db",
    )
    engine = create_async_engine(url)

    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS key_prefix VARCHAR DEFAULT 'PRJ'",
        "ALTER TABLE project_members ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'MEMBER'",
        """CREATE TABLE IF NOT EXISTS sprints (
            id VARCHAR PRIMARY KEY,
            project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            goal TEXT,
            start_date DATE,
            end_date DATE,
            is_active BOOLEAN DEFAULT FALSE
        )""",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS issue_type VARCHAR DEFAULT 'TASK'",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id VARCHAR REFERENCES tasks(id) ON DELETE SET NULL",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points INTEGER",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_id VARCHAR REFERENCES sprints(id)",
        """CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action VARCHAR(80) NOT NULL,
            entity_type VARCHAR(40) NOT NULL,
            entity_id VARCHAR NOT NULL,
            meta_json TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            body TEXT NOT NULL,
            link VARCHAR(500),
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS work_logs (
            id VARCHAR PRIMARY KEY,
            task_id VARCHAR NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            minutes_spent INTEGER NOT NULL,
            note TEXT,
            logged_at TIMESTAMPTZ DEFAULT NOW()
        )""",
    ]

    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))
    print("crm_v2 migration done.")


if __name__ == "__main__":
    asyncio.run(migrate())
