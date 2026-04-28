"""align product columns for KofKaN

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-04-28

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "d4e5f6a7b8c9"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table("product"):
        return

    cols = {c["name"] for c in insp.get_columns("product")}

    # Backfill in_stock from legacy stock_quantity.
    if "in_stock" in cols and "stock_quantity" in cols:
        op.execute(sa.text("UPDATE product SET in_stock = COALESCE(in_stock, stock_quantity)"))

    # Drop legacy columns that the current API/models don't use.
    for legacy in ("stock_quantity", "currency", "is_featured", "updated_at"):
        cols = {c["name"] for c in insp.get_columns("product")}
        if legacy in cols:
            op.drop_column("product", legacy)

    # Make SKU nullable (some flows may create products before SKU assignment).
    cols = {c["name"] for c in insp.get_columns("product")}
    if "sku" in cols:
        op.alter_column("product", "sku", existing_type=sa.String(length=120), nullable=True)


def downgrade() -> None:
    # Non-trivial; intentionally left as a no-op for now.
    pass

