"""merge heads: google_sub (q2) + cart/order variant columns (w8)

Revision ID: m1n2o3p4q5r6
Revises: q2r3s4t5u6v7, w8x9y0z1a2b3
Create Date: 2026-04-18
"""

from typing import Sequence, Union

from alembic import op


revision: str = "m1n2o3p4q5r6"
down_revision: Union[str, tuple[str, ...], None] = ("q2r3s4t5u6v7", "w8x9y0z1a2b3")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No schema changes — joins parallel branches after v7w8x9y0z1a2."""
    pass


def downgrade() -> None:
    pass
