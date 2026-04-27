"""
Database migration utilities for Sikapa Enterprise.

Provides both CLI wrapper functions and programmatic migration management.
"""

from typing import Optional
from alembic.config import Config
from alembic.command import upgrade, downgrade, current, revision as create_revision
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect


def get_alembic_config() -> Config:
    """Get Alembic configuration instance."""
    return Config("alembic.ini")


def get_current_revision(engine=None) -> Optional[str]:
    """
    Get the current database revision.
    
    Args:
        engine: SQLAlchemy engine (optional, uses default if not provided)
    
    Returns:
        Current revision ID or None if no revisions applied
    """
    try:
        alembic_cfg = get_alembic_config()
        if engine:
            with engine.connect() as conn:
                context = MigrationContext.configure(conn)
                return context.get_current_revision()
        else:
            # Fallback: try to read from alembic_version table
            current(alembic_cfg)
    except Exception as e:
        print(f"Could not get current revision: {e}")
        return None


def upgrade_database(revision: str = "head") -> bool:
    """
    Upgrade database to a specific revision.
    
    Args:
        revision: Target revision (default: "head" for latest)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        alembic_cfg = get_alembic_config()
        upgrade(alembic_cfg, revision)
        print(f"✓ Database upgraded to {revision}")
        return True
    except Exception as e:
        print(f"✗ Upgrade failed: {e}")
        return False


def downgrade_database(revision: str = "-1") -> bool:
    """
    Downgrade database to a previous revision.
    
    Args:
        revision: Target revision (default: "-1" for one step back)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        alembic_cfg = get_alembic_config()
        downgrade(alembic_cfg, revision)
        print(f"✓ Database downgraded to {revision}")
        return True
    except Exception as e:
        print(f"✗ Downgrade failed: {e}")
        return False


def create_migration(message: str, autogenerate: bool = True) -> bool:
    """
    Create a new migration.
    
    Args:
        message: Migration description
        autogenerate: Auto-detect schema changes (default: True)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        alembic_cfg = get_alembic_config()
        if autogenerate:
            create_revision(alembic_cfg, message=message, autogenerate=True)
        else:
            create_revision(alembic_cfg, message=message)
        print(f"✓ Migration created: {message}")
        return True
    except Exception as e:
        print(f"✗ Migration creation failed: {e}")
        return False


def validate_migrations_sql(revision: str = "head") -> bool:
    """
    Validate migration SQL without applying (dry run).
    
    Args:
        revision: Target revision to validate
    
    Returns:
        True if valid, False otherwise
    """
    try:
        alembic_cfg = get_alembic_config()
        upgrade(alembic_cfg, revision, sql=True)
        print(f"✓ Migration SQL valid for {revision}")
        return True
    except Exception as e:
        print(f"✗ SQL validation failed: {e}")
        return False


def auto_upgrade_on_startup() -> None:
    """
    Automatically upgrade database to latest on app startup.
    
    Raises:
        Exception if migration fails (prevents app startup)
    """
    try:
        current_rev = get_current_revision()
        if upgrade_database("head"):
            print(f"✓ Migrations applied (was on {current_rev or 'base'})")
        else:
            raise Exception("Failed to apply migrations")
    except Exception as e:
        print(f"✗ Critical: {e}")
        raise


def clear_all_tables(engine) -> bool:
    """
    Drop all tables in the database (DANGER: use carefully).
    
    Args:
        engine: SQLAlchemy engine
    
    Returns:
        True if successful, False otherwise
    """
    try:
        inspector = inspect(engine)
        from sqlmodel import SQLModel
        from app.models import *  # Import all models
        
        SQLModel.metadata.drop_all(engine)
        print("✓ All database tables dropped")
        return True
    except Exception as e:
        print(f"✗ Drop tables failed: {e}")
        return False


# CLI-style functions for scripts
def migrate_cli(command: str, *args, **kwargs):
    """
    CLI-style migration interface.
    
    Usage:
        migrate_cli("upgrade")  # Upgrade to head
        migrate_cli("downgrade")  # Downgrade one step
        migrate_cli("create", "add_new_table")  # Create migration
        migrate_cli("current")  # Show current revision
    """
    try:
        if command == "upgrade":
            revision = args[0] if args else "head"
            upgrade_database(revision)
        elif command == "downgrade":
            revision = args[0] if args else "-1"
            downgrade_database(revision)
        elif command == "create":
            message = args[0] if args else "auto migration"
            create_migration(message)
        elif command == "current":
            rev = get_current_revision()
            print(f"Current revision: {rev or 'base'}")
        elif command == "validate":
            revision = args[0] if args else "head"
            validate_migrations_sql(revision)
        else:
            print(f"Unknown command: {command}")
    except Exception as e:
        print(f"Error: {e}")
