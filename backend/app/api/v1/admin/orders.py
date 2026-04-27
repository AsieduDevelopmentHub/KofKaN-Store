"""
Admin order management routes
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlmodel import Session, select
from pydantic import BaseModel

from app.db import get_session
from app.api.v1.auth.dependencies import require_admin_permission
from app.models import User, Order, Product
from app.api.v1.admin.schemas import OrderManagementRead
from app.api.v1.admin.services import (
    get_all_orders_admin,
    update_order_status,
)
from app.api.v1.orders.schemas import (
    OrderDetailSchema,
    OrderItemLineSchema,
    OrderSchema,
    InvoiceSchema,
)
from app.api.v1.orders.services import (
    generate_invoice_pdf,
    get_order_items,
    get_invoice_for_order,
    update_order_status_and_notify,
)
from app.api.v1.orders.line_items import build_order_item_line_schema
from app.api.v1.payments import services as payment_services
from app.api.v1.payments.schemas import (
    PaystackRefundRequestBody,
    PaystackRefundResponse,
)

router = APIRouter()


class OrderStatusUpdate(BaseModel):
    status: str


class OrderTrackingUpdate(BaseModel):
    """Update order with tracking information"""
    status: str
    tracking_number: Optional[str] = None
    shipping_provider: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    cancel_reason: Optional[str] = None


@router.get("/", response_model=List[OrderManagementRead])
async def list_orders_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """List all orders for admin management."""
    return await get_all_orders_admin(
        session,
        skip=skip,
        limit=limit,
        status=status,
    )


@router.get("/{order_id}", response_model=OrderDetailSchema)
async def admin_get_order_detail(
    order_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """Full order with line items and invoice (admin)."""
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    raw_items = await get_order_items(session, order_id)
    invoice = await get_invoice_for_order(session, order_id)
    lines: list[OrderItemLineSchema] = []
    for it in raw_items:
        prod = session.exec(select(Product).where(Product.id == it.product_id)).first()
        lines.append(build_order_item_line_schema(session, it, prod))
    inv_schema = InvoiceSchema.model_validate(invoice) if invoice else None
    base = OrderSchema.model_validate(order)
    return OrderDetailSchema(**base.model_dump(), items=lines, invoice=inv_schema)


@router.post(
    "/{order_id}/paystack/refund",
    response_model=PaystackRefundResponse,
    status_code=status.HTTP_200_OK,
)
async def admin_paystack_refund(
    order_id: int,
    body: PaystackRefundRequestBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """
    Initiate a Paystack refund for a paid order (full refund if `amount` is omitted).
    """
    data = payment_services.admin_refund_paystack_order(
        session,
        order_id,
        amount_major=body.amount,
        customer_note=body.customer_note,
        merchant_note=body.merchant_note,
    )
    return PaystackRefundResponse(**data)


@router.patch("/{order_id}/status")
async def update_order_status_endpoint(
    order_id: int,
    status_update: OrderStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """Update order status."""
    order = await update_order_status(session, order_id, status_update.status)
    return order


@router.patch("/{order_id}/tracking")
async def update_order_tracking(
    order_id: int,
    tracking_update: OrderTrackingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """
    Update order status with full tracking information.
    
    This endpoint handles shipment notifications with tracking details,
    and automatically sends email notifications to customers.
    """
    order = await update_order_status_and_notify(
        session=session,
        order_id=order_id,
        new_status=tracking_update.status,
        tracking_number=tracking_update.tracking_number,
        shipping_provider=tracking_update.shipping_provider,
        estimated_delivery=tracking_update.estimated_delivery
    )
    
    if tracking_update.status == "cancelled" and tracking_update.cancel_reason:
        order.cancel_reason = tracking_update.cancel_reason
        session.add(order)
        session.commit()
        session.refresh(order)
    
    return order


@router.get("/{order_id}/invoice/pdf")
async def download_invoice_pdf(
    order_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("manage_orders")),
):
    """
    Download invoice as PDF for an order.
    
    Returns the PDF invoice with order details, items, and totals.
    """
    try:
        pdf_bytes = await generate_invoice_pdf(session, order_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice-{order_id}.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice PDF: {str(e)}"
        )
