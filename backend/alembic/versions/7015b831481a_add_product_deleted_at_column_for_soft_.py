"""add product deleted_at column for soft delete

Revision ID: 7015b831481a
Revises: p5q6r7s8t9u0
Create Date: 2026-04-22 23:12:00.960744

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect



# revision identifiers, used by Alembic.
revision = '7015b831481a'
down_revision = 'p5q6r7s8t9u0'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Check if product table exists and if deleted_at column is missing
    if inspector.has_table("product"):
        cols = {c["name"] for c in inspector.get_columns("product")}
        if "deleted_at" not in cols:
            op.add_column(
                "product",
                sa.Column(
                    "deleted_at",
                    sa.DateTime(timezone=True),
                    nullable=True,
                    index=True,
                ),
            )
    
    # Also check for 'products' table in case it exists
    if inspector.has_table("products"):
        cols = {c["name"] for c in inspector.get_columns("products")}
        if "deleted_at" not in cols:
            op.add_column(
                "products",
                sa.Column(
                    "deleted_at",
                    sa.DateTime(timezone=True),
                    nullable=True,
                    index=True,
                ),
            )


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    
    # Try to drop from product table
    if inspector.has_table("product"):
        cols = {c["name"] for c in inspector.get_columns("product")}
        if "deleted_at" in cols:
            op.drop_column("product", "deleted_at")
    
    # Also try to drop from products table if it exists
    if inspector.has_table("products"):
        cols = {c["name"] for c in inspector.get_columns("products")}
        if "deleted_at" in cols:
            op.drop_column("products", "deleted_at")
