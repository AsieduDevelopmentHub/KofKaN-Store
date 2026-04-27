"""Build order-related payloads for transactional email (line items, image URLs)."""
from __future__ import annotations

import os

from sqlmodel import Session, select

from app.models import OrderItem, Product, ProductVariant


def _absolute_product_image_url(raw: str | None) -> str | None:
    if not raw or not str(raw).strip():
        return None
    u = str(raw).strip()
    if u.startswith("https://"):
        return u
    if u.startswith("http://"):
        return u
    if u.startswith("/"):
        base = os.getenv("EMAIL_IMAGE_BASE_URL", "").rstrip("/")
        if not base:
            return None
        return f"{base}{u}"
    return None


def line_items_for_order_email(session: Session, order_id: int) -> list[dict]:
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    items_sorted = sorted(items, key=lambda x: (x.id or 0))
    product_ids = {i.product_id for i in items_sorted}
    products: dict[int, Product] = {}
    if product_ids:
        prods = session.exec(select(Product).where(Product.id.in_(product_ids))).all()
        products = {p.id: p for p in prods if p.id is not None}
    variant_ids = {i.variant_id for i in items_sorted if i.variant_id}
    variants: dict[int, ProductVariant] = {}
    if variant_ids:
        vs = session.exec(
            select(ProductVariant).where(ProductVariant.id.in_(variant_ids))
        ).all()
        variants = {v.id: v for v in vs if v.id is not None}
    out: list[dict] = []
    for it in items_sorted:
        p = products.get(it.product_id)
        v = variants.get(it.variant_id) if it.variant_id else None
        if it.variant_id:
            base_name = (p.name if p else None) or f"Product #{it.product_id}"
            v_name = (it.variant_name or "").strip() or (v.name if v else None) or "Variant"
            name = f"{base_name} — {v_name}"
            raw_img = (it.variant_image_url or "").strip() or None
            if not raw_img and v and v.image_url:
                raw_img = str(v.image_url).strip() or None
            detail = (it.variant_detail_snapshot or "").strip() or None
            if not detail and v:
                if v.description and v.description.strip():
                    detail = v.description.strip()
                elif v.attributes and v.attributes.strip():
                    detail = v.attributes.strip()
        else:
            name = (p.name if p else None) or f"Product #{it.product_id}"
            raw_img = p.image_url if p else None
            detail = None
        qty = int(it.quantity)
        unit = float(it.price_at_purchase)
        line_total = qty * unit
        img = _absolute_product_image_url(raw_img)
        row = {
            "name": name,
            "qty": qty,
            "unit_price": unit,
            "line_total": line_total,
            "image_url": img,
        }
        if detail:
            row["detail"] = detail
        out.append(row)
    return out
