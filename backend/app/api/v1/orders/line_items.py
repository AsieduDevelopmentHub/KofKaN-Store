"""Build order line payloads for APIs (variant-first display)."""

from __future__ import annotations

import json
from sqlmodel import Session

from app.api.v1.orders.schemas import OrderItemLineSchema
from app.models import OrderItem, Product, ProductVariant


def variant_detail_snapshot_from_model(variant: ProductVariant) -> str | None:
    """Text snapshot for order rows (formatted variant details)."""
    if not variant.attributes:
        return variant.description.strip() if variant.description and variant.description.strip() else None
    
    try:
        # Parse attributes as JSON
        attrs = variant.attributes
        if isinstance(attrs, str):
            attrs = json.loads(attrs)
        
        if not isinstance(attrs, dict):
            return variant.description.strip() if variant.description and variant.description.strip() else None
        
        # Format attributes professionally
        entries = []
        for key, value in attrs.items():
            if value is not None and str(value).strip():
                pretty_key = key.replace('_', ' ').replace('-', ' ').title()
                entries.append(f"{pretty_key}: {str(value).strip()}")
        
        variant_text = "Variant: " + ", ".join(entries)
        
        # Add description if present
        if variant.description and variant.description.strip():
            variant_text += f"\n\n{variant.description.strip()}"
        
        return variant_text
    except (json.JSONDecodeError, TypeError):
        # Fallback to description only
        return variant.description.strip() if variant.description and variant.description.strip() else None


def build_order_item_line_schema(
    session: Session, item: OrderItem, product: Product | None
) -> OrderItemLineSchema:
    base_name = product.name if product else f"Product #{item.product_id}"
    # Professional display name:
    # - Non-variant: parent product name
    # - Variant: parent product name + variant label (distinct sellable unit)
    v_label = (item.variant_name or "").strip()
    disp_name = f"{base_name} — {v_label}" if item.variant_id and v_label else base_name
    variant_detail: str | None = (item.variant_detail_snapshot or "").strip() or None
    img: str | None = None
    variant_row: ProductVariant | None = None

    if item.variant_id:
        variant_row = session.get(ProductVariant, item.variant_id)
        img = (item.variant_image_url or "").strip() or None
        if not img and variant_row and variant_row.image_url:
            img = str(variant_row.image_url).strip() or None
        if not variant_detail and variant_row:
            variant_detail = variant_detail_snapshot_from_model(variant_row)
    else:
        img = product.image_url if product else None

    return OrderItemLineSchema(
        id=item.id,  # type: ignore[arg-type]
        order_id=item.order_id,
        product_id=item.product_id,
        variant_id=item.variant_id,
        variant_name=item.variant_name,
        variant_detail_snapshot=variant_detail,
        quantity=item.quantity,
        price_at_purchase=item.price_at_purchase,
        created_at=item.created_at,
        product_name=disp_name,
        product_image_url=img,
    )
