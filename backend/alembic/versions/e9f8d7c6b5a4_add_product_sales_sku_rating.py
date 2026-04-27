"""add product sales_count sku avg_rating weight

Revision ID: e9f8d7c6b5a4
Revises: d7e8f9a0b1c2
Create Date: 2026-04-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "e9f8d7c6b5a4"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("product"):
        return
    cols = {c["name"] for c in inspector.get_columns("product")}
    if "sales_count" not in cols:
        op.add_column(
            "product",
            sa.Column(
                "sales_count",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )
    if "sku" not in cols:
        op.add_column("product", sa.Column("sku", sa.String(), nullable=True))
    if "avg_rating" not in cols:
        op.add_column(
            "product",
            sa.Column(
                "avg_rating",
                sa.Float(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )
    if "weight" not in cols:
        op.add_column("product", sa.Column("weight", sa.Float(), nullable=True))

    idx = {ix["name"] for ix in inspector.get_indexes("product")}
    if "ix_product_sku" not in idx:
        try:
            op.create_index("ix_product_sku", "product", ["sku"], unique=False)
        except Exception:
            pass
    if "ix_product_sales_count" not in idx:
        try:
            op.create_index(
                "ix_product_sales_count", "product", ["sales_count"], unique=False
            )
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("product"):
        return
    idx = {ix["name"] for ix in inspector.get_indexes("product")}
    if "ix_product_sales_count" in idx:
        op.drop_index("ix_product_sales_count", table_name="product")
    if "ix_product_sku" in idx:
        op.drop_index("ix_product_sku", table_name="product")
    cols = {c["name"] for c in inspector.get_columns("product")}
    for col in ("weight", "avg_rating", "sku", "sales_count"):
        if col in cols:
            op.drop_column("product", col)
