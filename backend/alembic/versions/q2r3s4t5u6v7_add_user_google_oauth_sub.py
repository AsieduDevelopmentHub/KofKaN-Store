"""add google_sub for Google OAuth sign-in

Revision ID: q2r3s4t5u6v7
Revises: v7w8x9y0z1a2
Create Date: 2026-04-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "q2r3s4t5u6v7"
down_revision: Union[str, None] = "v7w8x9y0z1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("user")} if insp.has_table("user") else set()
    if "google_sub" not in cols:
        op.add_column("user", sa.Column("google_sub", sa.String(length=255), nullable=True))

    idx = {i["name"] for i in insp.get_indexes("user")} if insp.has_table("user") else set()
    idx_name = op.f("ix_user_google_sub")
    if idx_name not in idx:
        op.create_index(idx_name, "user", ["google_sub"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_google_sub"), table_name="user")
    op.drop_column("user", "google_sub")
