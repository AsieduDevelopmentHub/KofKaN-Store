"""add composite index for product listing filters

Revision ID: n3o4p5q6r7s8
Revises: m1n2o3p4q5r6
Create Date: 2026-04-19

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect


revision: str = "n3o4p5q6r7s8"
down_revision: Union[str, None] = "m1n2o3p4q5r6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("product"):
        return
    cols = {c["name"] for c in inspector.get_columns("product")}
    idx = {ix["name"] for ix in inspector.get_indexes("product")}
    name = "ix_product_list_active_cat_created"
    if name not in idx:
        # `category` was replaced with `category_id` in the KofKaN schema.
        cat_col = "category_id" if "category_id" in cols else ("category" if "category" in cols else None)
        if cat_col is None:
            return
        op.create_index(
            name,
            "product",
            ["is_active", cat_col, "created_at"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("product"):
        return
    idx = {ix["name"] for ix in inspector.get_indexes("product")}
    name = "ix_product_list_active_cat_created"
    if name in idx:
        op.drop_index(name, table_name="product")
