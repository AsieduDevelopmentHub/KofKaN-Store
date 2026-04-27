"""add order paystack_reference and payment_status

Revision ID: f8e7d6c5b4a3
Revises: e9f8d7c6b5a4
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "f8e7d6c5b4a3"
down_revision = "e9f8d7c6b5a4"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("order"):
        return
    cols = {c["name"] for c in inspector.get_columns("order")}
    if "paystack_reference" not in cols:
        op.add_column(
            "order",
            sa.Column("paystack_reference", sa.String(), nullable=True),
        )
    if "payment_status" not in cols:
        op.add_column(
            "order",
            sa.Column(
                "payment_status",
                sa.String(),
                nullable=False,
                server_default=sa.text("'pending'"),
            ),
        )
    idx = {ix["name"] for ix in inspector.get_indexes("order")}
    if "ix_order_paystack_reference" not in idx:
        try:
            op.create_index(
                "ix_order_paystack_reference",
                "order",
                ["paystack_reference"],
                unique=False,
            )
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("order"):
        return
    idx = {ix["name"] for ix in inspector.get_indexes("order")}
    if "ix_order_paystack_reference" in idx:
        op.drop_index("ix_order_paystack_reference", table_name="order")
    cols = {c["name"] for c in inspector.get_columns("order")}
    if "payment_status" in cols:
        op.drop_column("order", "payment_status")
    if "paystack_reference" in cols:
        op.drop_column("order", "paystack_reference")
