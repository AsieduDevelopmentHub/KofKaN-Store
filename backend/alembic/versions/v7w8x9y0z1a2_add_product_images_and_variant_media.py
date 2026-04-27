"""product images gallery, per-variant media + description

Revision ID: v7w8x9y0z1a2
Revises: u1v2w3x4y5z6
Create Date: 2026-04-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "v7w8x9y0z1a2"
down_revision: Union[str, None] = "u1v2w3x4y5z6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(insp, table: str):
    if table not in insp.get_table_names():
        return set()
    return {col["name"] for col in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # --- productimage: gallery of images per product -------------------------
    if "productimage" not in insp.get_table_names():
        op.create_table(
            "productimage",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("image_url", sa.String(length=1024), nullable=False),
            sa.Column("alt_text", sa.String(length=255), nullable=True),
            sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_productimage_product_id"), "productimage", ["product_id"], unique=False)

    # --- productvariant: per-variant media + short description override -----
    pv_cols = _column_names(insp, "productvariant")
    if "productvariant" in insp.get_table_names():
        if "image_url" not in pv_cols:
            op.add_column(
                "productvariant",
                sa.Column("image_url", sa.String(length=1024), nullable=True),
            )
        if "description" not in pv_cols:
            op.add_column(
                "productvariant",
                sa.Column("description", sa.String(length=4000), nullable=True),
            )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    pv_cols = _column_names(insp, "productvariant")
    if "description" in pv_cols:
        op.drop_column("productvariant", "description")
    if "image_url" in pv_cols:
        op.drop_column("productvariant", "image_url")

    if "productimage" in insp.get_table_names():
        op.drop_index(op.f("ix_productimage_product_id"), table_name="productimage")
        op.drop_table("productimage")
