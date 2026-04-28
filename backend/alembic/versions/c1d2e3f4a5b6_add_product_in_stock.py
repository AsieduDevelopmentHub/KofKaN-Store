"""add product in_stock

Revision ID: c1d2e3f4a5b6
Revises: f55ebb63af35
Create Date: 2026-04-28

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "c1d2e3f4a5b6"
down_revision = "f55ebb63af35"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table("product"):
        return

    cols = {c["name"] for c in insp.get_columns("product")}
    if "in_stock" not in cols:
        op.add_column(
            "product",
            sa.Column(
                "in_stock",
                sa.Integer(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )

    # Backfill from legacy column if it exists (older schemas used stock_quantity).
    cols = {c["name"] for c in insp.get_columns("product")}
    if "stock_quantity" in cols and "in_stock" in cols:
        op.execute(sa.text("UPDATE product SET in_stock = COALESCE(in_stock, stock_quantity)"))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if not insp.has_table("product"):
        return
    cols = {c["name"] for c in insp.get_columns("product")}
    if "in_stock" in cols:
        op.drop_column("product", "in_stock")

