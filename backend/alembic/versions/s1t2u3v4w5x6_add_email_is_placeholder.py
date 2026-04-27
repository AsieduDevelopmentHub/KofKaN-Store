"""add email_is_placeholder to user

Revision ID: s1t2u3v4w5x6
Revises: r4s5t6u7v8w9
Create Date: 2026-04-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "s1t2u3v4w5x6"
down_revision: Union[str, None] = "r4s5t6u7v8w9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "email_is_placeholder",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.alter_column("user", "email_is_placeholder", server_default=None)


def downgrade() -> None:
    op.drop_column("user", "email_is_placeholder")
