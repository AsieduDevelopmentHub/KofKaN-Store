"""add username/name and make email optional

Revision ID: z1y2x3w4v5u6
Revises: k7l8m9n0o1p2
Create Date: 2026-04-14
"""
from __future__ import annotations

import re

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "z1y2x3w4v5u6"
down_revision = "k7l8m9n0o1p2"
branch_labels = None
depends_on = None


def _slug_username(raw: str) -> str:
    s = (raw or "").strip().lower()
    s = re.sub(r"[^a-z0-9._-]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    if not s:
        s = "user"
    return s[:50]


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("user"):
        return

    cols = {c["name"] for c in inspector.get_columns("user")}
    if "username" not in cols:
        op.add_column("user", sa.Column("username", sa.String(length=50), nullable=True))
    if "name" not in cols:
        op.add_column("user", sa.Column("name", sa.String(length=120), nullable=True))

    # Allow nullable email for username-only users.
    with op.batch_alter_table("user") as batch:
        batch.alter_column("email", existing_type=sa.String(), nullable=True)

    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT id, email, first_name, last_name, username, name
            FROM "user"
            ORDER BY id
            """
        )
    ).mappings().all()

    taken_usernames: set[str] = set()
    for r in rows:
        if r.get("username"):
            taken_usernames.add(str(r["username"]).lower())

    for r in rows:
        uid = int(r["id"])
        first = (r.get("first_name") or "").strip()
        last = (r.get("last_name") or "").strip()
        email = (r.get("email") or "").strip().lower()
        old_username = (r.get("username") or "").strip().lower()
        old_name = (r.get("name") or "").strip()

        full_name = old_name or " ".join([p for p in (first, last) if p]).strip()
        if not full_name:
            full_name = email.split("@")[0] if email else f"User {uid}"

        candidate = old_username or _slug_username(
            email.split("@")[0] if email else full_name
        )
        if not candidate:
            candidate = f"user{uid}"
        candidate = candidate[:50]
        unique_name = candidate
        i = 1
        while unique_name in taken_usernames:
            suffix = str(i)
            unique_name = f"{candidate[: max(1, 50 - len(suffix) - 1)]}-{suffix}"
            i += 1
        taken_usernames.add(unique_name)

        conn.execute(
            sa.text(
                """
                UPDATE "user"
                SET username = :username, name = :name, first_name = :first_name, last_name = :last_name
                WHERE id = :id
                """
            ),
            {
                "id": uid,
                "username": unique_name,
                "name": full_name[:120],
                "first_name": full_name[:120],  # keep legacy compatibility
                "last_name": None,
            },
        )

    with op.batch_alter_table("user") as batch:
        batch.alter_column("username", existing_type=sa.String(length=50), nullable=False)
        batch.alter_column("name", existing_type=sa.String(length=120), nullable=False)
        batch.create_unique_constraint("uq_user_username", ["username"])

    op.create_index("ix_user_username", "user", ["username"], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("user"):
        return

    # Downgrade safety: synthesize an email where missing before making email non-null.
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE "user"
            SET email = COALESCE(email, username || '@example.local')
            WHERE email IS NULL
            """
        )
    )

    with op.batch_alter_table("user") as batch:
        batch.alter_column("email", existing_type=sa.String(), nullable=False)
        batch.drop_constraint("uq_user_username", type_="unique")
    op.drop_index("ix_user_username", table_name="user")
    op.drop_column("user", "name")
    op.drop_column("user", "username")
