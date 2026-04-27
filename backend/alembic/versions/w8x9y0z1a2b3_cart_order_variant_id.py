"""cart + order items carry variant id/name

Revision ID: w8x9y0z1a2b3
Revises: v7w8x9y0z1a2
Create Date: 2026-04-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "w8x9y0z1a2b3"
down_revision: Union[str, None] = "v7w8x9y0z1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(insp, table: str):
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    # --- cartitem.variant_id ---
    ci_cols = _cols(insp, "cartitem")
    if "cartitem" in insp.get_table_names() and "variant_id" not in ci_cols:
        op.add_column(
            "cartitem",
            sa.Column("variant_id", sa.Integer(), nullable=True),
        )
        # FK + index are best-effort: on SQLite the FK add-in-place is a no-op.
        try:
            op.create_foreign_key(
                "fk_cartitem_variant_id_productvariant",
                "cartitem",
                "productvariant",
                ["variant_id"],
                ["id"],
            )
        except Exception:
            pass
        try:
            op.create_index(
                op.f("ix_cartitem_variant_id"), "cartitem", ["variant_id"], unique=False
            )
        except Exception:
            pass

    # --- orderitem.variant_id + variant_name ---
    oi_cols = _cols(insp, "orderitem")
    if "orderitem" in insp.get_table_names():
        if "variant_id" not in oi_cols:
            op.add_column(
                "orderitem",
                sa.Column("variant_id", sa.Integer(), nullable=True),
            )
            try:
                op.create_foreign_key(
                    "fk_orderitem_variant_id_productvariant",
                    "orderitem",
                    "productvariant",
                    ["variant_id"],
                    ["id"],
                )
            except Exception:
                pass
            try:
                op.create_index(
                    op.f("ix_orderitem_variant_id"),
                    "orderitem",
                    ["variant_id"],
                    unique=False,
                )
            except Exception:
                pass
        if "variant_name" not in oi_cols:
            op.add_column(
                "orderitem",
                sa.Column("variant_name", sa.String(length=160), nullable=True),
            )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    oi_cols = _cols(insp, "orderitem")
    if "variant_name" in oi_cols:
        op.drop_column("orderitem", "variant_name")
    if "variant_id" in oi_cols:
        try:
            op.drop_index(op.f("ix_orderitem_variant_id"), table_name="orderitem")
        except Exception:
            pass
        try:
            op.drop_constraint(
                "fk_orderitem_variant_id_productvariant", "orderitem", type_="foreignkey"
            )
        except Exception:
            pass
        op.drop_column("orderitem", "variant_id")

    ci_cols = _cols(insp, "cartitem")
    if "variant_id" in ci_cols:
        try:
            op.drop_index(op.f("ix_cartitem_variant_id"), table_name="cartitem")
        except Exception:
            pass
        try:
            op.drop_constraint(
                "fk_cartitem_variant_id_productvariant", "cartitem", type_="foreignkey"
            )
        except Exception:
            pass
        op.drop_column("cartitem", "variant_id")
