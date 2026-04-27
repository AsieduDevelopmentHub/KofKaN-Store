"""order item variant snapshots; inventory adjustment variant_id

Revision ID: p5q6r7s8t9u0
Revises: n3o4p5q6r7s8
Create Date: 2026-04-20
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "p5q6r7s8t9u0"
down_revision: Union[str, None] = "n3o4p5q6r7s8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(insp, table: str) -> set:
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    oi = _cols(insp, "orderitem")
    if "orderitem" in insp.get_table_names():
        if "variant_image_url" not in oi:
            op.add_column(
                "orderitem",
                sa.Column("variant_image_url", sa.String(length=1024), nullable=True),
            )
        if "variant_detail_snapshot" not in oi:
            op.add_column(
                "orderitem",
                sa.Column("variant_detail_snapshot", sa.String(length=4000), nullable=True),
            )

    ia = _cols(insp, "inventoryadjustment")
    if "inventoryadjustment" in insp.get_table_names():
        if "variant_id" not in ia:
            op.add_column(
                "inventoryadjustment",
                sa.Column("variant_id", sa.Integer(), nullable=True),
            )
            try:
                op.create_foreign_key(
                    "fk_inventoryadjustment_variant_id_productvariant",
                    "inventoryadjustment",
                    "productvariant",
                    ["variant_id"],
                    ["id"],
                )
            except Exception:
                pass
            try:
                op.create_index(
                    op.f("ix_inventoryadjustment_variant_id"),
                    "inventoryadjustment",
                    ["variant_id"],
                    unique=False,
                )
            except Exception:
                pass


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    ia = _cols(insp, "inventoryadjustment")
    if "inventoryadjustment" in insp.get_table_names() and "variant_id" in ia:
        try:
            op.drop_index(
                op.f("ix_inventoryadjustment_variant_id"),
                table_name="inventoryadjustment",
            )
        except Exception:
            pass
        try:
            op.drop_constraint(
                "fk_inventoryadjustment_variant_id_productvariant",
                "inventoryadjustment",
                type_="foreignkey",
            )
        except Exception:
            pass
        op.drop_column("inventoryadjustment", "variant_id")

    oi = _cols(insp, "orderitem")
    if "orderitem" in insp.get_table_names():
        if "variant_detail_snapshot" in oi:
            op.drop_column("orderitem", "variant_detail_snapshot")
        if "variant_image_url" in oi:
            op.drop_column("orderitem", "variant_image_url")
