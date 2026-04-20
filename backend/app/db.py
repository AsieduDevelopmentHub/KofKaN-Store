from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    if settings.database_url.startswith("sqlite"):
        _apply_sqlite_compat_patches()
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def _apply_sqlite_compat_patches() -> None:
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info('user')")).fetchall()
        }
        if columns:
            if "is_active" not in columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            if "admin_role" not in columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN admin_role VARCHAR(32) DEFAULT 'customer'"))
            if "admin_permissions" not in columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN admin_permissions VARCHAR(4000) DEFAULT ''"))
