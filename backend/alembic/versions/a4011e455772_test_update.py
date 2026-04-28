"""test update

Revision ID: a4011e455772
Revises: a83bbcaf54ed
Create Date: 2026-04-10 08:45:52.818452

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'a4011e455772'
down_revision = 'a83bbcaf54ed'
branch_labels = None
depends_on = None


def upgrade():
    # Legacy migration: originally created partial `product`/`user` tables.
    # The canonical baseline is now `787cd71d6603_initial_schema.py`, so this
    # revision must be a no-op to avoid conflicting DDL on fresh databases.
    pass


def downgrade():
    # No-op (see upgrade()).
    pass
