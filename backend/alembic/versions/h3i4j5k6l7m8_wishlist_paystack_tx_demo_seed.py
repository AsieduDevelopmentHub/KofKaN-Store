"""wishlist, paystack_transaction, demo seed data

Revision ID: h3i4j5k6l7m8
Revises: g1h2i3j4k5l6
Create Date: 2026-04-12

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision = "h3i4j5k6l7m8"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("wishlistitem"):
        op.create_table(
            "wishlistitem",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
            sa.ForeignKeyConstraint(["product_id"], ["product.id"]),
            sa.UniqueConstraint("user_id", "product_id", name="uq_wishlistitem_user_product"),
        )
        op.create_index("ix_wishlistitem_user_id", "wishlistitem", ["user_id"], unique=False)
        op.create_index("ix_wishlistitem_product_id", "wishlistitem", ["product_id"], unique=False)

    if not inspector.has_table("paystack_transaction"):
        op.create_table(
            "paystack_transaction",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("order_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("reference", sa.String(length=128), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("amount_subunit", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=False),
            sa.Column("paystack_transaction_id", sa.String(length=64), nullable=True),
            sa.Column("channel", sa.String(length=64), nullable=True),
            sa.Column("customer_email", sa.String(length=255), nullable=True),
            sa.Column("gateway_message", sa.String(), nullable=True),
            sa.Column("raw_last_event", sa.String(), nullable=True),
            sa.Column("paid_at", sa.DateTime(), nullable=True),
            sa.Column("failed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["order_id"], ["order.id"]),
        )
        op.create_index(
            "ix_paystack_transaction_order_id",
            "paystack_transaction",
            ["order_id"],
            unique=False,
        )
        op.create_index(
            "ix_paystack_transaction_reference",
            "paystack_transaction",
            ["reference"],
            unique=True,
        )
        op.create_index(
            "ix_paystack_transaction_user_id",
            "paystack_transaction",
            ["user_id"],
            unique=False,
        )

    _seed_demo_catalog(bind)


def _seed_demo_catalog(bind):
    if not inspect(bind).has_table("category") or not inspect(bind).has_table("product"):
        return

    now_fn = "CURRENT_TIMESTAMP" if bind.dialect.name == "sqlite" else "NOW()"

    cat_count = bind.execute(text("SELECT COUNT(*) FROM category")).scalar() or 0
    if cat_count == 0:
        bind.execute(
            text(
                f"""
                INSERT INTO category (name, slug, description, image_url, is_active, sort_order, created_at)
                VALUES
                ('Electronics', 'electronics', 'Demo devices and accessories', NULL, true, 1, {now_fn}),
                ('Home & Living', 'home-living', 'Demo home products', NULL, true, 2, {now_fn}),
                ('Fashion', 'fashion', 'Demo apparel', NULL, true, 3, {now_fn})
                """
            )
        )

    prod_count = bind.execute(text("SELECT COUNT(*) FROM product")).scalar() or 0
    if prod_count > 0:
        return

    rows = bind.execute(
        text("SELECT id, slug FROM category ORDER BY sort_order, id LIMIT 10")
    ).fetchall()
    if not rows:
        return

    def cid_for(slug: str) -> int:
        for r in rows:
            if r[1] == slug:
                return int(r[0])
        return int(rows[0][0])

    eid = cid_for("electronics")
    hid = cid_for("home-living")
    fid = cid_for("fashion")

    bind.execute(
        text(
            f"""
            INSERT INTO product (
                name, slug, description, price, image_url, category, in_stock,
                created_at, is_active, sales_count, sku, avg_rating, weight
            ) VALUES
            (:n1, :s1, :d1, 129.99, NULL, :c1, 25, {now_fn}, true, 12, 'DEMO-EL-001', 4.5, 0.4),
            (:n2, :s2, :d2, 45.00, NULL, :c1, 80, {now_fn}, true, 40, 'DEMO-EL-002', 4.2, 0.1),
            (:n3, :s3, :d3, 899.99, NULL, :c1, 8, {now_fn}, true, 3, 'DEMO-EL-003', 4.8, 2.1),
            (:n4, :s4, :d4, 34.50, NULL, :c2, 120, {now_fn}, true, 55, 'DEMO-HM-001', 4.0, 0.6),
            (:n5, :s5, :d5, 18.00, NULL, :c2, 200, {now_fn}, true, 90, 'DEMO-HM-002', 4.6, 0.3),
            (:n6, :s6, :d6, 59.99, NULL, :c3, 45, {now_fn}, true, 22, 'DEMO-FS-001', 4.3, 0.5)
            """
        ),
        {
            "n1": "Demo Wireless Earbuds",
            "s1": "demo-wireless-earbuds",
            "d1": "Test product: Bluetooth earbuds with charging case.",
            "n2": "Demo USB-C Hub",
            "s2": "demo-usb-c-hub",
            "d2": "Test product: 7-in-1 USB-C hub.",
            "n3": "Demo Laptop 14",
            "s3": "demo-laptop-14",
            "d3": "Test product: Lightweight laptop for development.",
            "n4": "Demo Desk Lamp LED",
            "s4": "demo-desk-lamp-led",
            "d4": "Test product: Adjustable LED desk lamp.",
            "n5": "Demo Ceramic Mug Set",
            "s5": "demo-ceramic-mug-set",
            "d5": "Test product: Set of 2 ceramic mugs.",
            "n6": "Demo Canvas Tote Bag",
            "s6": "demo-canvas-tote-bag",
            "d6": "Test product: Everyday canvas tote.",
            "c1": str(eid),
            "c2": str(hid),
            "c3": str(fid),
        },
    )


def downgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    if insp.has_table("paystack_transaction"):
        idx = {ix["name"] for ix in insp.get_indexes("paystack_transaction")}
        for name in (
            "ix_paystack_transaction_user_id",
            "ix_paystack_transaction_reference",
            "ix_paystack_transaction_order_id",
        ):
            if name in idx:
                op.drop_index(name, table_name="paystack_transaction")
        op.drop_table("paystack_transaction")
    insp = inspect(bind)
    if insp.has_table("wishlistitem"):
        idx = {ix["name"] for ix in insp.get_indexes("wishlistitem")}
        for name in ("ix_wishlistitem_product_id", "ix_wishlistitem_user_id"):
            if name in idx:
                op.drop_index(name, table_name="wishlistitem")
        op.drop_table("wishlistitem")
