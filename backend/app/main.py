from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, projects, tasks, categories, stats, comments, websocket_chat
from app.db.config import engine
from app.models.base import Base

app = FastAPI(title="Smart TODO API")

# Явный origin / regex: с Authorization + другой порт (5173 vs 8000) браузеру нужен
# конкретный Access-Control-Allow-Origin, не «тихий» ответ без CORS на 500.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(categories.router)
app.include_router(stats.router)
app.include_router(comments.router)
app.include_router(websocket_chat.router)