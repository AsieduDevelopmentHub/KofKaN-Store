"""Add authentication models - 2FA, OTP, token blacklist

Revision ID: b3c2f1a8e9d4
Revises: a4011e455772
Create Date: 2026-04-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b3c2f1a8e9d4'
down_revision = 'a4011e455772'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to 'user' table
    op.add_column('user', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('user', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('user', sa.Column('last_name', sa.String(), nullable=True))
    op.add_column('user', sa.Column('two_fa_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user', sa.Column('two_fa_method', sa.String(), nullable=True))
    op.add_column('user', sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()))

    # Create 'tokenblacklist' table
    op.create_table(
        'tokenblacklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_tokenblacklist_user_id'), 'tokenblacklist', ['user_id'], unique=False)
    op.create_index(op.f('ix_tokenblacklist_token'), 'tokenblacklist', ['token'], unique=False)

    # Create 'otpcode' table
    op.create_table(
        'otpcode',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('purpose', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_otpcode_user_id'), 'otpcode', ['user_id'], unique=False)
    op.create_index(op.f('ix_otpcode_code'), 'otpcode', ['code'], unique=False)

    # Create 'twofactorsecret' table
    op.create_table(
        'twofactorsecret',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('secret', sa.String(), nullable=False),
        sa.Column('backup_codes', sa.String(), nullable=False),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_twofactorsecret_user_id'), 'twofactorsecret', ['user_id'], unique=False)

    # Create 'passwordreset' table
    op.create_table(
        'passwordreset',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token')
    )
    op.create_index(op.f('ix_passwordreset_user_id'), 'passwordreset', ['user_id'], unique=False)
    op.create_index(op.f('ix_passwordreset_token'), 'passwordreset', ['token'], unique=False)


def downgrade() -> None:
    # Drop tables and indexes in reverse order
    op.drop_index(op.f('ix_passwordreset_token'), table_name='passwordreset')
    op.drop_index(op.f('ix_passwordreset_user_id'), table_name='passwordreset')
    op.drop_table('passwordreset')

    op.drop_index(op.f('ix_twofactorsecret_user_id'), table_name='twofactorsecret')
    op.drop_table('twofactorsecret')

    op.drop_index(op.f('ix_otpcode_code'), table_name='otpcode')
    op.drop_index(op.f('ix_otpcode_user_id'), table_name='otpcode')
    op.drop_table('otpcode')

    op.drop_index(op.f('ix_tokenblacklist_token'), table_name='tokenblacklist')
    op.drop_index(op.f('ix_tokenblacklist_user_id'), table_name='tokenblacklist')
    op.drop_table('tokenblacklist')

    # Remove columns from 'user' table
    op.drop_column('user', 'updated_at')
    op.drop_column('user', 'two_fa_method')
    op.drop_column('user', 'two_fa_enabled')
    op.drop_column('user', 'last_name')
    op.drop_column('user', 'first_name')
    op.drop_column('user', 'phone')
    op.drop_column('user', 'email_verified')
