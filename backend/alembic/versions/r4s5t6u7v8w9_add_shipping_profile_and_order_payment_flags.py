"""add shipping profile and order payment flags

Revision ID: r4s5t6u7v8w9
Revises: z1y2x3w4v5u6
Create Date: 2026-04-13 21:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "r4s5t6u7v8w9"
down_revision: Union[str, None] = "z1y2x3w4v5u6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("shipping_region", sa.String(length=80), nullable=True))
    op.add_column("user", sa.Column("shipping_city", sa.String(length=120), nullable=True))
    op.add_column("user", sa.Column("shipping_address_line1", sa.String(length=255), nullable=True))
    op.add_column("user", sa.Column("shipping_address_line2", sa.String(length=255), nullable=True))
    op.add_column("user", sa.Column("shipping_landmark", sa.String(length=255), nullable=True))
    op.add_column("user", sa.Column("shipping_contact_name", sa.String(length=120), nullable=True))
    op.add_column("user", sa.Column("shipping_contact_phone", sa.String(length=32), nullable=True))

    op.add_column("order", sa.Column("shipping_city", sa.String(length=120), nullable=True))
    op.add_column("order", sa.Column("shipping_contact_name", sa.String(length=120), nullable=True))
    op.add_column("order", sa.Column("shipping_contact_phone", sa.String(length=32), nullable=True))
    op.add_column("order", sa.Column("confirmation_email_sent_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("order", "confirmation_email_sent_at")
    op.drop_column("order", "shipping_contact_phone")
    op.drop_column("order", "shipping_contact_name")
    op.drop_column("order", "shipping_city")

    op.drop_column("user", "shipping_contact_phone")
    op.drop_column("user", "shipping_contact_name")
    op.drop_column("user", "shipping_landmark")
    op.drop_column("user", "shipping_address_line2")
    op.drop_column("user", "shipping_address_line1")
    op.drop_column("user", "shipping_city")
    op.drop_column("user", "shipping_region")
