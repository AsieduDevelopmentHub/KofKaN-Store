"""
PostgreSQL + RLS helpers — SECURITY DEFINER SQL functions bypass row policies for
controlled lookups (login, JWT subject resolution, password reset, newsletter).

SQLite and non-Postgres URLs are no-ops; callers keep using normal ORM queries.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from types import SimpleNamespace

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import DATABASE_URL
from app.models import EmailSubscription, PasswordReset, User


def pg_rls_enabled() -> bool:
    return DATABASE_URL.startswith("postgresql")


def fetch_user_for_login(session: Session, identifier: str) -> User | None:
    ident = identifier.strip().lower()
    if not pg_rls_enabled():
        # Match LoginRequest identifier rules (email vs username)
        if "@" in ident and "." in ident:
            return session.exec(select(User).where(User.email == ident)).first()
        return session.exec(select(User).where(User.username == ident)).first()

    row = session.connection().execute(
        text("SELECT * FROM app.user_for_login(:ident) LIMIT 1"),
        {"ident": ident},
    ).mappings().first()
    return User.model_validate(dict(row)) if row else None


def username_exists(session: Session, username: str) -> bool:
    u = username.strip().lower()
    if not pg_rls_enabled():
        return session.exec(select(User).where(User.username == u)).first() is not None
    r = session.connection().execute(
        text("SELECT app.username_taken(:u) AS v"),
        {"u": u},
    ).scalar()
    return bool(r)


def username_taken_except(session: Session, username: str, except_user_id: int) -> bool:
    u = username.strip().lower()
    if not pg_rls_enabled():
        row = session.exec(
            select(User).where(User.username == u, User.id != except_user_id),
        ).first()
        return row is not None
    r = session.connection().execute(
        text("SELECT app.username_taken_except(:u, :eid) AS v"),
        {"u": u, "eid": except_user_id},
    ).scalar()
    return bool(r)


def email_taken_except(session: Session, email: str, except_user_id: int) -> bool:
    e = email.strip().lower()
    if not pg_rls_enabled():
        row = session.exec(
            select(User).where(User.email == e, User.id != except_user_id),
        ).first()
        return row is not None
    r = session.connection().execute(
        text("SELECT app.email_taken_except(:e, :eid) AS v"),
        {"e": e, "eid": except_user_id},
    ).scalar()
    return bool(r)


def email_exists(session: Session, email: str) -> bool:
    e = email.strip().lower()
    if not pg_rls_enabled():
        return session.exec(select(User).where(User.email == e)).first() is not None
    r = session.connection().execute(
        text("SELECT app.email_taken(:e) AS v"),
        {"e": e},
    ).scalar()
    return bool(r)


def fetch_user_by_subject(session: Session, subject: str) -> User | None:
    sub = str(subject).strip()
    if not pg_rls_enabled():
        if sub.isdigit():
            return session.get(User, int(sub))
        s = sub.lower()
        return session.exec(
            select(User).where((User.email == s) | (User.username == s)),
        ).first()

    row = session.connection().execute(
        text("SELECT * FROM app.resolve_user_subject(:sub) LIMIT 1"),
        {"sub": sub},
    ).mappings().first()
    return User.model_validate(dict(row)) if row else None


def fetch_password_reset_row(session: Session, token: str) -> PasswordReset | None:
    if not pg_rls_enabled():
        return session.exec(
            select(PasswordReset).where(
                PasswordReset.token == token,
                PasswordReset.used == False,  # noqa: E712
            ),
        ).first()

    row = session.connection().execute(
        text(
            "SELECT * FROM app.fetch_password_reset_active(:t) LIMIT 1",
        ),
        {"t": token},
    ).mappings().first()
    return PasswordReset.model_validate(dict(row)) if row else None


def users_public_profiles_for_ids(session: Session, user_ids: list[int]) -> dict[int, SimpleNamespace]:
    """Minimal user fields for public review display (anon-safe)."""
    ids = [i for i in {i for i in user_ids if i is not None}]
    if not ids:
        return {}
    if not pg_rls_enabled():
        rows = session.exec(select(User).where(User.id.in_(ids))).all()
        return {int(u.id): u for u in rows if u.id is not None}

    out: dict[int, SimpleNamespace] = {}
    conn = session.connection()
    for uid in ids:
        row = conn.execute(
            text("SELECT * FROM app.user_public_profile(:id) LIMIT 1"),
            {"id": uid},
        ).mappings().first()
        if row:
            d = dict(row)
            out[uid] = SimpleNamespace(**d)
    return out


def emailsubscription_by_email(session: Session, email: str) -> EmailSubscription | None:
    em = email.strip().lower()
    if not pg_rls_enabled():
        return session.exec(
            select(EmailSubscription).where(EmailSubscription.email == em),
        ).first()

    row = session.connection().execute(
        text("SELECT * FROM app.emailsubscription_by_email(:e) LIMIT 1"),
        {"e": em},
    ).mappings().first()
    return EmailSubscription.model_validate(dict(row)) if row else None


def fetch_user_by_google_sub(session: Session, google_sub: str) -> User | None:
    sub = google_sub.strip()
    if not pg_rls_enabled():
        return session.exec(select(User).where(User.google_sub == sub)).first()
    row = session.connection().execute(
        text("SELECT * FROM app.user_by_google_sub(:s) LIMIT 1"),
        {"s": sub},
    ).mappings().first()
    return User.model_validate(dict(row)) if row else None


def fetch_user_by_email_exact(session: Session, email: str) -> User | None:
    em = email.strip().lower()
    if not pg_rls_enabled():
        return session.exec(select(User).where(User.email == em)).first()
    row = session.connection().execute(
        text("SELECT * FROM app.user_by_email_exact(:e) LIMIT 1"),
        {"e": em},
    ).mappings().first()
    return User.model_validate(dict(row)) if row else None


def newsletter_active_subscribers(session: Session) -> list[EmailSubscription]:
    """Used by background jobs (no JWT / GUC). Bypasses RLS via SECURITY DEFINER SQL."""
    if not pg_rls_enabled():
        return list(
            session.exec(
                select(EmailSubscription).where(
                    EmailSubscription.is_subscribed == True,  # noqa: E712
                    EmailSubscription.verified == True,  # noqa: E712
                ),
            ).all()
        )

    rows = session.connection().execute(
        text("SELECT * FROM app.newsletter_active_recipients()"),
    ).mappings().all()
    return [EmailSubscription.model_validate(dict(r)) for r in rows]


def newsletter_run_reactivate(session: Session, email: str) -> EmailSubscription | None:
    """Reactivate newsletter row by email (anon-safe via SECURITY DEFINER)."""
    em = email.strip().lower()
    if not pg_rls_enabled():
        row = session.exec(
            select(EmailSubscription).where(EmailSubscription.email == em),
        ).first()
        if row and not row.is_subscribed:
            row.is_subscribed = True
            row.unsubscribed_at = None
            session.add(row)
            session.commit()
            session.refresh(row)
            return row
        return row

    row = session.connection().execute(
        text("SELECT * FROM app.emailsubscription_reactivate(:e) LIMIT 1"),
        {"e": em},
    ).mappings().first()
    session.commit()
    return EmailSubscription.model_validate(dict(row)) if row else None


def newsletter_run_verify(session: Session, token: str) -> EmailSubscription | None:
    if not pg_rls_enabled():
        row = session.exec(
            select(EmailSubscription).where(
                EmailSubscription.verification_token == token,
            ),
        ).first()
        if row and not row.verified:
            row.verified = True
            session.add(row)
            session.commit()
            session.refresh(row)
            return row
        return row

    row = session.connection().execute(
        text("SELECT * FROM app.emailsubscription_verify_done(:t) LIMIT 1"),
        {"t": token},
    ).mappings().first()
    session.commit()
    return EmailSubscription.model_validate(dict(row)) if row else None


def newsletter_run_unsubscribe_email(session: Session, email: str) -> None:
    em = email.strip().lower()
    if not pg_rls_enabled():
        row = session.exec(
            select(EmailSubscription).where(EmailSubscription.email == em),
        ).first()
        if row and row.is_subscribed:
            row.is_subscribed = False
            row.unsubscribed_at = datetime.utcnow()
            session.add(row)
            session.commit()
        return

    session.connection().execute(
        text("SELECT app.emailsubscription_unsubscribe_email(:e) AS _"),
        {"e": em},
    )
    session.commit()


def newsletter_run_unsubscribe_token(session: Session, token: str) -> None:
    if not pg_rls_enabled():
        row = session.exec(
            select(EmailSubscription).where(
                EmailSubscription.verification_token == token,
            ),
        ).first()
        if row and row.is_subscribed:
            row.is_subscribed = False
            row.unsubscribed_at = datetime.now(timezone.utc)
            session.add(row)
            session.commit()
        return

    session.connection().execute(
        text("SELECT app.emailsubscription_unsubscribe_token(:t) AS _"),
        {"t": token},
    )
    session.commit()


def emailsubscription_by_verify_token(session: Session, token: str) -> EmailSubscription | None:
    if not pg_rls_enabled():
        return session.exec(
            select(EmailSubscription).where(
                EmailSubscription.verification_token == token,
            ),
        ).first()

    row = session.connection().execute(
        text("SELECT * FROM app.emailsubscription_by_verify_token(:t) LIMIT 1"),
        {"t": token},
    ).mappings().first()
    return EmailSubscription.model_validate(dict(row)) if row else None
