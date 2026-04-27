"""align schema with architecture

Revision ID: f55ebb63af35
Revises: d41ce5bf95a7
Create Date: 2026-04-27 16:41:26.384098

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = 'f55ebb63af35'
down_revision = 'd41ce5bf95a7'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    def col_exists(table, column):
        cols = [c['name'] for c in inspector.get_columns(table)]
        return column in cols

    def add_col_idempotent(table, col, type_sql):
        if not col_exists(table, col):
            op.execute(f'ALTER TABLE "{table}" ADD COLUMN {col} {type_sql}')

    # 1. Order Table
    add_col_idempotent('order', 'total_price', 'FLOAT')
    if col_exists('order', 'total_amount'):
        op.execute("UPDATE \"order\" SET total_price = total_amount WHERE total_price IS NULL")
    op.execute("UPDATE \"order\" SET total_price = 0 WHERE total_price IS NULL")
    op.alter_column('order', 'total_price', nullable=False)

    add_col_idempotent('order', 'subtotal_amount', 'FLOAT')
    add_col_idempotent('order', 'delivery_fee', 'FLOAT')
    op.execute("UPDATE \"order\" SET delivery_fee = 0 WHERE delivery_fee IS NULL")
    op.alter_column('order', 'delivery_fee', nullable=False)

    for col in ['shipping_method', 'shipping_region', 'shipping_city', 'shipping_contact_name', 
                'shipping_contact_phone', 'shipping_address', 'shipping_provider', 'tracking_number',
                'cancel_reason', 'payment_method', 'notes', 'paystack_reference', 'idempotency_key']:
        add_col_idempotent('order', col, 'VARCHAR')
    
    for col in ['estimated_delivery', 'delivered_at', 'confirmation_email_sent_at', 'updated_at']:
        add_col_idempotent('order', col, 'TIMESTAMP')
    
    add_col_idempotent('order', 'payment_status', 'VARCHAR')
    op.execute("UPDATE \"order\" SET payment_status = 'pending' WHERE payment_status IS NULL")
    op.alter_column('order', 'payment_status', nullable=False)
    
    op.execute("UPDATE \"order\" SET updated_at = NOW() WHERE updated_at IS NULL")

    # 2. OrderItem Table
    add_col_idempotent('orderitem', 'variant_id', 'INTEGER')
    add_col_idempotent('orderitem', 'variant_name', 'VARCHAR')
    add_col_idempotent('orderitem', 'variant_image_url', 'VARCHAR')
    add_col_idempotent('orderitem', 'variant_detail_snapshot', 'VARCHAR')
    add_col_idempotent('orderitem', 'price_at_purchase', 'FLOAT')
    if col_exists('orderitem', 'unit_price'):
        op.execute("UPDATE orderitem SET price_at_purchase = unit_price WHERE price_at_purchase IS NULL")
    op.execute("UPDATE orderitem SET price_at_purchase = 0 WHERE price_at_purchase IS NULL")
    op.alter_column('orderitem', 'price_at_purchase', nullable=False)

    # 3. User Table
    add_col_idempotent('user', 'name', 'VARCHAR')
    if col_exists('user', 'full_name'):
        op.execute("UPDATE \"user\" SET name = full_name WHERE name IS NULL")
    op.execute("UPDATE \"user\" SET name = username WHERE name IS NULL")
    op.execute("UPDATE \"user\" SET name = 'Unknown' WHERE name IS NULL")
    op.alter_column('user', 'name', nullable=False)

    add_col_idempotent('user', 'hashed_password', 'VARCHAR')
    if col_exists('user', 'password_hash'):
        op.execute("UPDATE \"user\" SET hashed_password = password_hash WHERE (hashed_password IS NULL OR hashed_password = '')")
    op.execute("UPDATE \"user\" SET hashed_password = 'NOT_SET' WHERE hashed_password IS NULL OR hashed_password = ''")
    op.alter_column('user', 'hashed_password', nullable=False)

    add_col_idempotent('user', 'email_verified', 'BOOLEAN')
    if col_exists('user', 'is_email_verified'):
        op.execute("UPDATE \"user\" SET email_verified = is_email_verified WHERE email_verified IS NULL")
    op.execute("UPDATE \"user\" SET email_verified = false WHERE email_verified IS NULL")
    op.alter_column('user', 'email_verified', nullable=False)

    add_col_idempotent('user', 'email_is_placeholder', 'BOOLEAN')
    op.execute("UPDATE \"user\" SET email_is_placeholder = false WHERE email_is_placeholder IS NULL")
    op.alter_column('user', 'email_is_placeholder', nullable=False)

    add_col_idempotent('user', 'two_fa_enabled', 'BOOLEAN')
    op.execute("UPDATE \"user\" SET two_fa_enabled = false WHERE two_fa_enabled IS NULL")
    op.alter_column('user', 'two_fa_enabled', nullable=False)

    for col in ['first_name', 'last_name', 'two_fa_method', 'shipping_region', 'shipping_city',
                'shipping_address_line1', 'shipping_address_line2', 'shipping_landmark',
                'shipping_contact_name', 'shipping_contact_phone']:
        add_col_idempotent('user', col, 'VARCHAR')
    
    add_col_idempotent('user', 'deleted_at', 'TIMESTAMP')

    op.execute("UPDATE \"user\" SET username = split_part(email, '@', 1) WHERE username IS NULL")
    op.execute("UPDATE \"user\" SET username = 'user_' || id::text WHERE username IS NULL OR username = ''")
    op.alter_column('user', 'username', nullable=False)

    # 4. Product Table
    add_col_idempotent('product', 'weight', 'FLOAT')
    add_col_idempotent('product', 'sales_count', 'INTEGER')
    op.execute("UPDATE product SET sales_count = 0 WHERE sales_count IS NULL")
    op.alter_column('product', 'sales_count', nullable=False)

    add_col_idempotent('product', 'avg_rating', 'FLOAT')
    op.execute("UPDATE product SET avg_rating = 0 WHERE avg_rating IS NULL")
    op.alter_column('product', 'avg_rating', nullable=False)
    
    add_col_idempotent('product', 'deleted_at', 'TIMESTAMP')

    # 5. Drop old columns if they still exist
    for table, col in [('order', 'total_amount'), ('orderitem', 'unit_price'), 
                       ('user', 'full_name'), ('user', 'password_hash'), ('user', 'is_email_verified')]:
        if col_exists(table, col):
            op.drop_column(table, col)

def downgrade():
    pass
