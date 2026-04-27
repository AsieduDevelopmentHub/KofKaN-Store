"""Create an admin account for the Sikapa backend."""
import argparse
import getpass
import re
import secrets
import sys
from pathlib import Path

# tools/admin/createadminaccount.py -> backend/
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from sqlmodel import Session, select

from app.db import engine, create_db_and_tables
from app.api.v1.auth.services import register_user
from app.api.v1.admin.permission_catalog import KNOWN_ADMIN_PERMISSION_KEYS
from app.core.pg_rls_auth import fetch_user_by_email_exact, pg_rls_enabled, username_exists
from app.models import User

load_dotenv()


def _find_user_by_email(session: Session, email: str) -> User | None:
    em = email.strip().lower()
    if pg_rls_enabled():
        return fetch_user_by_email_exact(session, em)
    return session.exec(select(User).where(User.email == em)).first()


def _pick_username(session: Session, email: str) -> str:
    """Derive a valid unique username from the email local-part (matches register_user rules)."""
    local = email.split("@")[0].strip().lower()
    raw = re.sub(r"[^a-z0-9._-]", "", local) or "admin"
    if len(raw) < 3:
        raw = (raw + "adm")[:50]
    base = raw[:50]
    candidate = base
    for _ in range(200):
        if len(candidate) >= 3 and len(candidate) <= 50 and not username_exists(session, candidate):
            return candidate
        suffix = str(secrets.randbelow(900000) + 100000)
        candidate = (base[: max(3, 50 - len(suffix))] + suffix)[:50]
    return (base[:40] + secrets.token_hex(4))[:50]


def _apply_admin_access(user: User, *, super_admin: bool) -> None:
    """Match API semantics: super_admin bypasses permission checks; otherwise grant all catalog keys."""
    user.is_admin = True
    if super_admin:
        user.admin_role = "super_admin"
        user.admin_permissions = ""
    else:
        user.admin_role = "admin"
        user.admin_permissions = ",".join(sorted(KNOWN_ADMIN_PERMISSION_KEYS))


def create_admin_account(
    email: str,
    password: str,
    display_name: str | None,
    *,
    super_admin: bool,
) -> User:
    """Create or promote an admin user."""
    create_db_and_tables()

    email = email.strip().lower()

    with Session(engine) as session:
        existing = _find_user_by_email(session, email)
        if existing:
            _apply_admin_access(existing, super_admin=super_admin)
            existing.is_active = True
            existing.email_verified = True
            if display_name:
                existing.name = display_name.strip()
                existing.first_name = display_name.strip()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

        name = (display_name or "").strip() or email.split("@")[0].replace(".", " ").title()
        username = _pick_username(session, email)

        user = register_user(session, username, name, password, email=email)
        _apply_admin_access(user, super_admin=super_admin)
        user.is_active = True
        user.email_verified = True
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


def _resolve_super_admin(args: argparse.Namespace) -> bool:
    """Default: super_admin. --no-super-admin opts out. Interactive prompts when credentials were typed."""
    if args.no_super_admin:
        return False

    prompted_for_login = args.email is None or args.password is None
    if prompted_for_login and sys.stdin.isatty():
        hint = (
            "Super admin has full access (bypasses the permission list). "
            "Otherwise the account gets the 'admin' role with every permission key enabled "
            "(but cannot assign super_admin to others)."
        )
        print(hint)
        ans = input("Grant super admin? [Y/n]: ").strip().lower()
        return ans in ("", "y", "yes")

    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote an admin account for Sikapa.")
    parser.add_argument("--email", help="Admin email address.")
    parser.add_argument("--password", help="Admin password.")
    parser.add_argument(
        "--name",
        dest="display_name",
        help="Display name (stored on User.name). Defaults to the email local-part.",
    )
    parser.add_argument(
        "--no-super-admin",
        action="store_true",
        help="Use role 'admin' with all permission keys instead of super_admin (full CLI default is super_admin).",
    )
    args = parser.parse_args()

    email = args.email or input("Admin email: ").strip()
    password = args.password or getpass.getpass("Admin password: ")
    display_name = args.display_name or input("Display name (optional): ").strip() or None

    if not email or not password:
        raise SystemExit("Email and password are required.")

    want_super = _resolve_super_admin(args)

    admin = create_admin_account(email, password, display_name, super_admin=want_super)
    role = (admin.admin_role or "").strip() or "customer"
    print(
        f"Admin account ready: {admin.email} (id={admin.id}, username={admin.username}, role={role})"
    )


if __name__ == "__main__":
    main()
