from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi import Request

from app.api.v1.routes import router as api_v1_router
from app.core.config import settings
from app.db import create_db_and_tables
from app.seed import seed_demo_data

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="KofKaN electronics commerce API powered by FastAPI + Supabase-ready SQLModel.",
    docs_url=None if settings.disable_openapi else "/docs",
    redoc_url=None if settings.disable_openapi else "/redoc",
    openapi_url=None if settings.disable_openapi else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1200)

if settings.https_enabled and not settings.debug:
    app.add_middleware(HTTPSRedirectMiddleware)

app.include_router(api_v1_router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    seed_demo_data()


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    if settings.https_enabled:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


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
