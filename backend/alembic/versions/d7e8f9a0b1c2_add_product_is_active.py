"""add product is_active column

Revision ID: d7e8f9a0b1c2
Revises: 5aa7b199e4b3
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "5aa7b199e4b3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "product",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade():
    op.drop_column("product", "is_active")
