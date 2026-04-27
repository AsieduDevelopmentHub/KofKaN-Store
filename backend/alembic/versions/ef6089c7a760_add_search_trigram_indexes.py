"""add_search_trigram_indexes

Revision ID: ef6089c7a760
Revises: 579b53d42293
Create Date: 2026-04-26 23:21:39.615208

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ef6089c7a760'
down_revision = '579b53d42293'
branch_labels = None
depends_on = None


def upgrade():
    # Enable pg_trgm extension for fuzzy search and fast ilike '%term%'
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    
    # Create GIN indexes with gin_trgm_ops
    # These significantly speed up 'ilike %...%' queries as the catalog grows
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_product_name_trgm ON product USING gin (name gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_product_description_trgm ON product USING gin (description gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_product_sku_trgm ON product USING gin (sku gin_trgm_ops)"
    )


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_product_sku_trgm")
    op.execute("DROP INDEX IF EXISTS ix_product_description_trgm")
    op.execute("DROP INDEX IF EXISTS ix_product_name_trgm")
    # We typically don't drop the extension in downgrade as other things might use it
