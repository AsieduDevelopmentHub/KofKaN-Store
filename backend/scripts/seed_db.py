import os
import sys
from pathlib import Path


def main() -> None:
    """
    Seed the configured database with demo categories/products/admin.

    Usage:
      - SQLite dev:
          set DATABASE_URL=sqlite:///./db/kofkan.db
          .\\venv\\Scripts\\python.exe scripts\\seed_db.py

      - Supabase Postgres:
          set DATABASE_URL=postgresql://your_username:your_password@your_host:your_port/your_database
          .\\venv\\Scripts\\python.exe -m alembic upgrade head
          .\\venv\\Scripts\\python.exe scripts\\seed_db.py
    """

    backend_root = Path(__file__).resolve().parents[1]
    sys.path.append(str(backend_root))

    # Load backend/.env so running the script is consistent with Alembic/uvicorn.
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        load_dotenv = None  # type: ignore[assignment]
    if load_dotenv is not None:
        load_dotenv(dotenv_path=backend_root / ".env")

    if not os.getenv("DATABASE_URL"):
        raise SystemExit(
            "DATABASE_URL is not set. Put it in backend/.env or set it in this terminal session."
        )

    # Import after DATABASE_URL is available, so app.db binds the right engine.
    from app.seed import seed_demo_data

    seed_demo_data()
    print("Seed complete.")


if __name__ == "__main__":
    main()

