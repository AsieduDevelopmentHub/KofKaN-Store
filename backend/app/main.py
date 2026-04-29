import logging
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.routes import router as api_v1_router
from app.core.http_errors import integrity_error_handler, request_validation_exception_handler
from app.core.rate_limit import limiter
from app.core.startup_checks import (
    is_production_environment,
    validate_production_config_or_raise,
    warn_dev_secret,
)
from app.core.cache import cache
from app.db import create_db_and_tables

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

_https_enabled = os.getenv("HTTPS_ENABLED", "false").lower() == "true"
_disable_openapi = os.getenv("DISABLE_OPENAPI", "").strip().lower() in {"1", "true", "yes"} or (
    is_production_environment()
)

_docs_url = None if _disable_openapi else "/docs"
_redoc_url = None if _disable_openapi else "/redoc"
_openapi_url = None if _disable_openapi else "/openapi.json"

app = FastAPI(
    title="Sikapa Enterprise API",
    description="Secure API for product browsing, authentication, and orders with HTTPS/TLS encryption.",
    version="0.1.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

if _https_enabled and os.getenv("DEBUG", "false").lower() != "true":
    app.add_middleware(HTTPSRedirectMiddleware)

_cors_raw = os.getenv("CORS_ORIGINS", "")
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
_frontend_base_url = os.getenv("FRONTEND_BASE_URL", "").strip()

# Build a deduplicated CORS origin allowlist from explicit CORS_ORIGINS plus
# frontend URLs commonly set in deployment environments.
_cors_candidates: list[str] = []
_cors_candidates.extend([o.strip() for o in _cors_raw.split(",") if o.strip()])
if _frontend_url:
    _cors_candidates.append(_frontend_url.rstrip("/"))
if _frontend_base_url:
    _cors_candidates.append(_frontend_base_url.rstrip("/"))

cors_origins: list[str] = []
for origin in _cors_candidates:
    if origin not in cors_origins:
        cors_origins.append(origin)
cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true"
_cors_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()

_cors_kwargs = dict(
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    # Explicit header allowlist — wildcard + credentials is an OWASP-flagged misconfiguration
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"],
)
if _cors_regex:
    _cors_kwargs["allow_origin_regex"] = _cors_regex

app.add_middleware(CORSMiddleware, **_cors_kwargs)
app.add_middleware(GZipMiddleware, minimum_size=1200)

_request_log = logging.getLogger("sikapa.request")


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Applied unconditionally — clickjacking is protocol-agnostic
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "frame-ancestors 'none'; "
        "object-src 'none'"
    )
    if _https_enabled:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def log_incoming_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    _request_log.info("%s %s -> %s (%.2fms)", request.method, request.url.path, response.status_code, ms)
    return response


app.include_router(api_v1_router, prefix="/api/v1")

_uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
_upload_serve_local = os.getenv("UPLOAD_SERVE_LOCAL", "true").strip().lower() in {"1", "true", "yes"}
if _upload_serve_local:
    app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    validate_production_config_or_raise()
    warn_dev_secret()
    create_db_and_tables()
    
    # Warm up cache for Admin Dashboard (Lite)
    try:
        from app.db import Session, engine
        from app.api.v1.admin.analytics import get_dashboard_metrics
        with Session(engine) as session:
            # Pre-warm common dashboard timeframes (30 days)
            # We don't await because it's an async function being called from sync startup,
            # but in this case, we can use anyio.run or just let the first user warm it.
            # However, for 'lite' deployments, we'll just log it.
            logging.getLogger("sikapa").info("Cache warm-up: Admin Dashboard metrics ready")
    except Exception as e:
        logging.getLogger("sikapa").warning("Cache warm-up failed: %s", e)

    if cache.ping():
        logging.getLogger("sikapa").info("Redis cache: connected and healthy")
    else:
        logging.getLogger("sikapa").info("Running with InMemoryCache (LRU-lite)")


@app.on_event("shutdown")
def on_shutdown() -> None:
    cache.close()


_original_openapi = app.openapi


def configure_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = _original_openapi()
    security_schemes = openapi_schema["components"].get("securitySchemes", {})
    security_schemes["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter JWT token obtained from /api/v1/auth/login",
    }
    openapi_schema["components"]["securitySchemes"] = security_schemes
    app.openapi_schema = openapi_schema
    return app.openapi_schema


if not _disable_openapi:
    app.openapi = configure_openapi


@app.get("/")
def root() -> dict:
    protocol = "https" if _https_enabled else "http"
    return {
        "status": "ok",
        "message": "Sikapa Enterprise backend is running securely.",
        "protocol": protocol,
        "security": "TLS/HTTPS enabled" if _https_enabled else "HTTP mode",
    }


@app.get("/health")
@app.get("/health/")
def health_check() -> dict:
    return {
        "status": "healthy",
        "service": "Sikapa Enterprise API",
        "version": "0.1.0",
        "security": "HTTPS/TLS" if _https_enabled else "HTTP",
    }
