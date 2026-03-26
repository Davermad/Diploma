import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Локальный Postgres без SSL: asyncpg иначе может уходить в SSL-handshake и ловить TimeoutError.
# В проде с SSL: DATABASE_SSL=true в .env
_use_ssl = os.getenv("DATABASE_SSL", "").strip().lower() in ("1", "true", "yes")
_connect_args = {}
if not _use_ssl:
    _connect_args["ssl"] = False

engine = create_async_engine(
    DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session