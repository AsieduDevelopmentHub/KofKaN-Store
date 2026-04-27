"""add order subtotal_amount, delivery_fee, shipping_method, shipping_region

Revision ID: k7l8m9n0o1p2
Revises: h3i4j5k6l7m8
Create Date: 2026-04-13

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "k7l8m9n0o1p2"
down_revision = "h3i4j5k6l7m8"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("order"):
        return
    cols = {c["name"] for c in inspector.get_columns("order")}
    if "subtotal_amount" not in cols:
        op.add_column("order", sa.Column("subtotal_amount", sa.Float(), nullable=True))
    if "delivery_fee" not in cols:
        op.add_column(
            "order",
            sa.Column(
                "delivery_fee",
                sa.Float(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )
    if "shipping_method" not in cols:
        op.add_column("order", sa.Column("shipping_method", sa.String(), nullable=True))
    if "shipping_region" not in cols:
        op.add_column("order", sa.Column("shipping_region", sa.String(), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("order"):
        return
    cols = {c["name"] for c in inspector.get_columns("order")}
    if "shipping_region" in cols:
        op.drop_column("order", "shipping_region")
    if "shipping_method" in cols:
        op.drop_column("order", "shipping_method")
    if "delivery_fee" in cols:
        op.drop_column("order", "delivery_fee")
    if "subtotal_amount" in cols:
        op.drop_column("order", "subtotal_amount")
