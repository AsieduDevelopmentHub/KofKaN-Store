"""add paystack_init_idempotency table

Revision ID: g1h2i3j4k5l6
Revises: f8e7d6c5b4a3
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "g1h2i3j4k5l6"
down_revision = "f8e7d6c5b4a3"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if inspector.has_table("paystack_init_idempotency"):
        return
    op.create_table(
        "paystack_init_idempotency",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.String(length=128), nullable=False),
        sa.Column("authorization_url", sa.String(), nullable=False),
        sa.Column("access_code", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_paystack_init_idempotency_idempotency_key",
        "paystack_init_idempotency",
        ["idempotency_key"],
        unique=True,
    )
    op.create_index(
        "ix_paystack_init_idempotency_order_id",
        "paystack_init_idempotency",
        ["order_id"],
        unique=False,
    )
    op.create_index(
        "ix_paystack_init_idempotency_user_id",
        "paystack_init_idempotency",
        ["user_id"],
        unique=False,
    )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("paystack_init_idempotency"):
        return
    idx = {ix["name"] for ix in inspector.get_indexes("paystack_init_idempotency")}
    for name in (
        "ix_paystack_init_idempotency_user_id",
        "ix_paystack_init_idempotency_order_id",
        "ix_paystack_init_idempotency_idempotency_key",
    ):
        if name in idx:
            op.drop_index(name, table_name="paystack_init_idempotency")
    op.drop_table("paystack_init_idempotency")
