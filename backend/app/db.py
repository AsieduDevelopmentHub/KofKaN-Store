import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Request
from sqlalchemy import event, inspect, text
from sqlmodel import Session, SQLModel, create_engine, select

# Load environment variables from .env file
load_dotenv()

# Get the backend directory path
backend_dir = Path(__file__).parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{backend_dir}/db/sikapa.db")

# Configure connection arguments based on database type
connect_args = {}
engine_kwargs = {
    "echo": os.getenv("DEBUG", "false").lower() == "true",
}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif DATABASE_URL.startswith("postgresql"):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_pre_ping"] = True

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs,
)


if DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _connection_record) -> None:
        if os.getenv("SQLITE_WAL", "true").lower() != "true":
            return
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def apply_postgres_session_user(session: Session, user_id: int | None) -> None:
    """Transaction-local GUC for RLS (PostgreSQL only). Call after you know the acting user id."""
    if not DATABASE_URL.startswith("postgresql"):
        return
    val = "" if user_id is None else str(int(user_id))
    session.connection().execute(
        text("SELECT set_config('app.current_user_id', :v, true)"),
        {"v": val},
    )


def _configure_postgres_rls_for_request(session: Session, request: Request) -> None:
    """Set app.current_user_id from Bearer JWT (same rules as get_current_user blacklist check)."""
    if not DATABASE_URL.startswith("postgresql"):
        return

    from app.core.security import decode_access_token
    from app.models import TokenBlacklist

    conn = session.connection()

    def _clear() -> None:
        conn.execute(
            text("SELECT set_config('app.current_user_id', :v, true)"),
            {"v": ""},
        )

    auth_header = (
        request.headers.get("authorization") or request.headers.get("Authorization") or ""
    )
    token = ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()

    if not token:
        _clear()
        return

    try:
        payload = decode_access_token(token)
    except Exception:
        _clear()
        return

    subject = payload.get("sub")
    if not subject:
        _clear()
        return

    from app.core.pg_rls_auth import fetch_user_by_subject

    user = fetch_user_by_subject(session, str(subject))
    if not user:
        _clear()
        return

    conn.execute(
        text("SELECT set_config('app.current_user_id', :v, true)"),
        {"v": str(user.id)},
    )
    bl = session.exec(
        select(TokenBlacklist).where(TokenBlacklist.token == token)
    ).first()
    if bl:
        _clear()


def get_session():
    """Dependency: DB session.

    Note: RLS request-context (app.current_user_id) is disabled in this dependency for now
    because injecting `Request` into generator dependencies was causing runtime errors
    in some environments. You can still set `app.current_user_id` explicitly via
    `apply_postgres_session_user(session, user_id)` in code paths that need it.
    """
    with Session(engine) as session:
        yield session


from contextlib import contextmanager

@contextmanager
def get_session_context():
    """Context manager for background tasks where FastAPI dependency injection is not available."""
    with Session(engine) as session:
        yield session


def create_db_and_tables() -> None:
    """Create all database tables from SQLModel definitions."""
    SQLModel.metadata.create_all(engine)
    _ensure_emailsubscription_schema_compat()


def _ensure_emailsubscription_schema_compat() -> None:
    """
    Backward-compatible newsletter schema fix-up.

    Some deployed databases were created from an older migration where
    `emailsubscription` lacks newer columns (`user_id`, `subscribed_at`,
    `unsubscribed_at`, `verification_token`, `verified`). That causes
    runtime 500s when the ORM selects/inserts with the current model.
    """
    insp = inspect(engine)
    if not insp.has_table("emailsubscription"):
        return

    cols = {c["name"] for c in insp.get_columns("emailsubscription")}
    with engine.begin() as conn:
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE emailsubscription ADD COLUMN user_id INTEGER"))
        if "subscribed_at" not in cols:
            conn.execute(text("ALTER TABLE emailsubscription ADD COLUMN subscribed_at TIMESTAMP"))
        if "unsubscribed_at" not in cols:
            conn.execute(text("ALTER TABLE emailsubscription ADD COLUMN unsubscribed_at TIMESTAMP"))
        if "verification_token" not in cols:
            conn.execute(text("ALTER TABLE emailsubscription ADD COLUMN verification_token VARCHAR(255)"))
        if "verified" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE emailsubscription ADD COLUMN verified BOOLEAN NOT NULL DEFAULT false"
                )
            )

        # Backfill `subscribed_at` from legacy `created_at` when present.
        cols_after = {c["name"] for c in inspect(conn).get_columns("emailsubscription")}
        if "subscribed_at" in cols_after and "created_at" in cols_after:
            conn.execute(
                text(
                    "UPDATE emailsubscription "
                    "SET subscribed_at = COALESCE(subscribed_at, created_at)"
                )
            )
            # Legacy schemas often kept `created_at` as NOT NULL without a DB default.
            # Current model writes `subscribed_at` instead, so ensure inserts still work.
            conn.execute(
                text(
                    "ALTER TABLE emailsubscription "
                    "ALTER COLUMN created_at SET DEFAULT NOW()"
                )
            )
