from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import router as api_v1_router
from app.core.config import settings
from app.db import create_db_and_tables
from app.seed import seed_demo_data

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="KofKaN electronics commerce API powered by FastAPI + Supabase-ready SQLModel.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    seed_demo_data()


@app.get("/")
def root() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict:
    return {"status": "healthy", "service": settings.app_name}
