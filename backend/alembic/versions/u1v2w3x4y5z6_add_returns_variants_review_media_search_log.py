"""add returns, variants, review media, and search analytics tables

Revision ID: u1v2w3x4y5z6
Revises: t9u0v1w2x3y4
Create Date: 2026-04-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "u1v2w3x4y5z6"
down_revision: Union[str, None] = "t9u0v1w2x3y4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    def has_table(name: str) -> bool:
        return name in insp.get_table_names()

    def has_index(table: str, idx: str) -> bool:
        if not has_table(table):
            return False
        return any(i["name"] == idx for i in insp.get_indexes(table))

    # ---- orderreturn ----
    if not has_table("orderreturn"):
        op.create_table(
            "orderreturn",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("reason", sa.String(length=120), nullable=False),
            sa.Column("details", sa.String(length=4000), nullable=True),
            sa.Column("preferred_outcome", sa.String(length=24), nullable=False, server_default="refund"),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="pending"),
            sa.Column("admin_notes", sa.String(length=4000), nullable=True),
            sa.Column("resolved_by", sa.Integer(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["order_id"], ["order.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.ForeignKeyConstraint(["resolved_by"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    for idx_col in ("order_id", "user_id", "status", "resolved_by"):
        idx_name = op.f(f"ix_orderreturn_{idx_col}")
        if has_table("orderreturn") and not has_index("orderreturn", idx_name):
            op.create_index(idx_name, "orderreturn", [idx_col], unique=False)

    # ---- orderreturnitem ----
    if not has_table("orderreturnitem"):
        op.create_table(
            "orderreturnitem",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("return_id", sa.Integer(), nullable=False),
            sa.Column("order_item_id", sa.Integer(), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["return_id"], ["orderreturn.id"]),
            sa.ForeignKeyConstraint(["order_item_id"], ["orderitem.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    for idx_col in ("return_id", "order_item_id"):
        idx_name = op.f(f"ix_orderreturnitem_{idx_col}")
        if has_table("orderreturnitem") and not has_index("orderreturnitem", idx_name):
            op.create_index(idx_name, "orderreturnitem", [idx_col], unique=False)

    # ---- searchquerylog ----
    if not has_table("searchquerylog"):
        op.create_table(
            "searchquerylog",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("query", sa.String(length=200), nullable=False),
            sa.Column("normalized_query", sa.String(length=200), nullable=False),
            sa.Column("result_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("ip_hash", sa.String(length=64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    for idx_col in ("query", "normalized_query", "user_id", "created_at"):
        idx_name = op.f(f"ix_searchquerylog_{idx_col}")
        if has_table("searchquerylog") and not has_index("searchquerylog", idx_name):
            op.create_index(idx_name, "searchquerylog", [idx_col], unique=False)

    # ---- productvariant ----
    if not has_table("productvariant"):
        op.create_table(
            "productvariant",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("sku", sa.String(length=120), nullable=True),
            sa.Column("attributes", sa.String(length=2000), nullable=True),
            sa.Column("price_delta", sa.Float(), nullable=False, server_default=sa.text("0")),
            sa.Column("in_stock", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    for idx_col in ("product_id", "sku"):
        idx_name = op.f(f"ix_productvariant_{idx_col}")
        if has_table("productvariant") and not has_index("productvariant", idx_name):
            op.create_index(idx_name, "productvariant", [idx_col], unique=False)

    # ---- reviewmedia ----
    if not has_table("reviewmedia"):
        op.create_table(
            "reviewmedia",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("review_id", sa.Integer(), nullable=False),
            sa.Column("url", sa.String(length=1024), nullable=False),
            sa.Column("kind", sa.String(length=16), nullable=False, server_default="image"),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["review_id"], ["review.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    idx_name = op.f("ix_reviewmedia_review_id")
    if has_table("reviewmedia") and not has_index("reviewmedia", idx_name):
        op.create_index(idx_name, "reviewmedia", ["review_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reviewmedia_review_id"), table_name="reviewmedia")
    op.drop_table("reviewmedia")

    for idx_col in ("sku", "product_id"):
        op.drop_index(op.f(f"ix_productvariant_{idx_col}"), table_name="productvariant")
    op.drop_table("productvariant")

    for idx_col in ("created_at", "user_id", "normalized_query", "query"):
        op.drop_index(op.f(f"ix_searchquerylog_{idx_col}"), table_name="searchquerylog")
    op.drop_table("searchquerylog")

    for idx_col in ("order_item_id", "return_id"):
        op.drop_index(op.f(f"ix_orderreturnitem_{idx_col}"), table_name="orderreturnitem")
    op.drop_table("orderreturnitem")

    for idx_col in ("resolved_by", "status", "user_id", "order_id"):
        op.drop_index(op.f(f"ix_orderreturn_{idx_col}"), table_name="orderreturn")
    op.drop_table("orderreturn")
