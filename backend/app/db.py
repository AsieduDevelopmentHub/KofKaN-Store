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
    """Add new columns to existing SQLite tables so older dev DBs keep booting.

    SQLModel's `create_all` only creates *missing* tables; it never alters
    existing ones. When we add new fields to a model we need to extend this
    patch so legacy DB files don't 500 on first query.
    """
    with engine.begin() as connection:
        user_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info('user')")).fetchall()
        }
        if user_columns:
            if "is_active" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            if "admin_role" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN admin_role VARCHAR(32) DEFAULT 'customer'"))
            if "admin_permissions" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN admin_permissions VARCHAR(4000) DEFAULT ''"))
            if "google_sub" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN google_sub VARCHAR(255)"))
            if "username" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN username VARCHAR(120)"))
            if "phone" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN phone VARCHAR(40)"))
            if "is_email_verified" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN is_email_verified BOOLEAN DEFAULT 0"))
            if "updated_at" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN updated_at DATETIME"))

        product_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info('product')")).fetchall()
        }
        if product_columns:
            if "brand" not in product_columns:
                connection.execute(text("ALTER TABLE product ADD COLUMN brand VARCHAR(120)"))
            if "voltage_spec" not in product_columns:
                connection.execute(text("ALTER TABLE product ADD COLUMN voltage_spec VARCHAR(120)"))
            if "warranty_months" not in product_columns:
                connection.execute(text("ALTER TABLE product ADD COLUMN warranty_months INTEGER DEFAULT 12"))
            if "tech_specs" not in product_columns:
                connection.execute(text("ALTER TABLE product ADD COLUMN tech_specs VARCHAR(4000)"))
            if "currency" not in product_columns:
                connection.execute(text("ALTER TABLE product ADD COLUMN currency VARCHAR(8) DEFAULT 'GHS'"))
