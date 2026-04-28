"""Add authentication models - 2FA, OTP, token blacklist

Revision ID: b3c2f1a8e9d4
Revises: a4011e455772
Create Date: 2026-04-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'b3c2f1a8e9d4'
down_revision = 'a4011e455772'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    def _has_col(table: str, col: str) -> bool:
        return col in [c["name"] for c in inspector.get_columns(table)]

    # Add new columns to 'user' table (idempotent: initial schema may already include them)
    if not _has_col("user", "email_verified"):
        op.add_column(
            "user",
            sa.Column(
                "email_verified",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if not _has_col("user", "phone"):
        op.add_column("user", sa.Column("phone", sa.String(), nullable=True))
    if not _has_col("user", "first_name"):
        op.add_column("user", sa.Column("first_name", sa.String(), nullable=True))
    if not _has_col("user", "last_name"):
        op.add_column("user", sa.Column("last_name", sa.String(), nullable=True))
    if not _has_col("user", "two_fa_enabled"):
        op.add_column(
            "user",
            sa.Column(
                "two_fa_enabled",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
    if not _has_col("user", "two_fa_method"):
        op.add_column("user", sa.Column("two_fa_method", sa.String(), nullable=True))
    if not _has_col("user", "updated_at"):
        op.add_column(
            "user",
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )

    # Create 'tokenblacklist' table
    if not inspector.has_table("tokenblacklist"):
        op.create_table(
            "tokenblacklist",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token"),
        )
        op.create_index(op.f("ix_tokenblacklist_user_id"), "tokenblacklist", ["user_id"], unique=False)
        op.create_index(op.f("ix_tokenblacklist_token"), "tokenblacklist", ["token"], unique=False)

    # Create 'otpcode' table
    if not inspector.has_table("otpcode"):
        op.create_table(
            "otpcode",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("purpose", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_otpcode_user_id"), "otpcode", ["user_id"], unique=False)
        op.create_index(op.f("ix_otpcode_code"), "otpcode", ["code"], unique=False)

    # Create 'twofactorsecret' table
    if not inspector.has_table("twofactorsecret"):
        op.create_table(
            "twofactorsecret",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("secret", sa.String(), nullable=False),
            sa.Column("backup_codes", sa.String(), nullable=False),
            sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
        )
        op.create_index(op.f("ix_twofactorsecret_user_id"), "twofactorsecret", ["user_id"], unique=False)

    # Create 'passwordreset' table
    if not inspector.has_table("passwordreset"):
        op.create_table(
            "passwordreset",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token"),
        )
        op.create_index(op.f("ix_passwordreset_user_id"), "passwordreset", ["user_id"], unique=False)
        op.create_index(op.f("ix_passwordreset_token"), "passwordreset", ["token"], unique=False)


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
