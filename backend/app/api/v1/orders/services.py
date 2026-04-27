"""
Orders business logic
"""
import os
import uuid
from datetime import datetime

from fastapi import HTTPException, status, BackgroundTasks
from sqlmodel import Session, select

from app.models import Order, OrderItem, CartItem, Product, ProductVariant, Invoice, User
from app.api.v1.orders.schemas import OrderCreateSchema
from app.api.v1.orders.line_items import variant_detail_snapshot_from_model
from app.core.email_service import EmailService
from app.core.invoice_service import InvoiceService
from app.core.order_mail import line_items_for_order_email

email_service = EmailService()
invoice_service = InvoiceService()


async def create_order_from_cart(
    session: Session,
    user_id: int,
    subtotal: float,
    delivery_fee: float,
    order_data: OrderCreateSchema,
    cart_items: list[CartItem],
    idempotency_key: str | None = None
) -> Order:
    """Create order from cart items."""
    total_price = round(float(subtotal) + float(delivery_fee), 2)
    region_key = (
        (order_data.shipping_region or "").strip().lower().replace(" ", "-")
        if order_data.shipping_region
        else None
    )
    provider = order_data.shipping_provider
    if order_data.shipping_method == "pickup":
        provider = provider or "Local pickup (store)"
        region_key = None
    order = Order(
        user_id=user_id,
        total_price=total_price,
        subtotal_amount=round(float(subtotal), 2),
        delivery_fee=round(float(delivery_fee), 2),
        shipping_method=order_data.shipping_method,
        shipping_region=region_key,
        shipping_city=order_data.shipping_city,
        status="pending",
        shipping_address=order_data.shipping_address,
        shipping_provider=provider,
        shipping_contact_name=order_data.shipping_contact_name,
        shipping_contact_phone=order_data.shipping_contact_phone,
        notes=order_data.notes,
        idempotency_key=idempotency_key
    )
    session.add(order)
    session.flush()

    # Batch-load products / variants to avoid N+1 DB calls.
    product_ids = {ci.product_id for ci in cart_items}
    products: dict[int, Product] = {}
    if product_ids:
        rows = session.exec(select(Product).where(Product.id.in_(product_ids))).all()
        products = {p.id: p for p in rows if p.id is not None}
    variant_ids = {ci.variant_id for ci in cart_items if getattr(ci, "variant_id", None)}
    variants: dict[int, ProductVariant] = {}
    if variant_ids:
        v_rows = session.exec(select(ProductVariant).where(ProductVariant.id.in_(variant_ids))).all()
        variants = {v.id: v for v in v_rows if v.id is not None}

    for cart_item in cart_items:
        product = products.get(cart_item.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {cart_item.product_id} not found during order creation"
            )

        # Resolve variant (if any) so we can (a) charge the variant-adjusted
        # price, (b) decrement the variant's stock instead of the parent's,
        # and (c) snapshot the variant label on the order row.
        variant: ProductVariant | None = None
        variant_id = getattr(cart_item, "variant_id", None)
        if variant_id is not None:
            variant = variants.get(int(variant_id)) if variant_id else None
            if not variant or variant.product_id != product.id or not variant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected option for product {product.id} is no longer available",
                )

        unit_price = float(product.price) + float(variant.price_delta) if variant else float(product.price)

        v_img = (
            str(variant.image_url).strip()
            if variant and variant.image_url
            else None
        )
        v_detail = variant_detail_snapshot_from_model(variant) if variant else None

        order_item = OrderItem(
            order_id=order.id,
            product_id=cart_item.product_id,
            variant_id=variant.id if variant else None,
            variant_name=variant.name if variant else None,
            variant_image_url=v_img,
            variant_detail_snapshot=v_detail,
            quantity=cart_item.quantity,
            price_at_purchase=round(unit_price, 2),
        )
        session.add(order_item)

        if variant:
            variant.in_stock = max(0, variant.in_stock - cart_item.quantity)
            session.add(variant)
        else:
            product.in_stock -= cart_item.quantity
        product.sales_count += cart_item.quantity
        session.add(product)

    session.commit()
    session.refresh(order)

    for cart_item in cart_items:
        session.delete(cart_item)

    session.commit()
    return order


async def get_user_orders(session: Session, user_id: int) -> list[Order]:
    """Get all orders for a user."""
    return session.exec(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    ).all()


async def get_order_detail(session: Session, order_id: int, user_id: int) -> Order:
    """Get order details with ownership validation."""
    order = session.exec(
        select(Order).where(Order.id == order_id)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )

    return order


async def get_order_items(session: Session, order_id: int) -> list[OrderItem]:
    return session.exec(
        select(OrderItem).where(OrderItem.order_id == order_id)
    ).all()


async def get_invoice_for_order(session: Session, order_id: int) -> Invoice | None:
    return session.exec(
        select(Invoice).where(Invoice.order_id == order_id)
    ).first()


async def create_invoice_for_order(
    session: Session,
    order: Order,
    tax_rate: float = 0.0,
    shipping: float = 0.0,
    payment_method: str = "card",
    issued_at: datetime | None = None,
    initial_status: str = "pending",
) -> Invoice:
    """Create an invoice record for an order."""
    if order.subtotal_amount is not None:
        line_subtotal = float(order.subtotal_amount)
        shipping_fee = float(order.delivery_fee or 0)
    else:
        line_subtotal = float(order.total_price)
        shipping_fee = float(shipping)
    subtotal = line_subtotal
    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax + shipping_fee, 2)
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{order.id}-{uuid.uuid4().hex[:8]}"

    invoice = Invoice(
        order_id=order.id,
        invoice_number=invoice_number,
        subtotal=subtotal,
        tax=tax,
        shipping=shipping_fee,
        total=total,
        payment_method=payment_method,
        status=initial_status,
        issued_at=issued_at or datetime.utcnow(),
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return invoice


async def send_order_confirmation_email(
    session: Session,
    order: Order,
    user_id: int,
    background_tasks: BackgroundTasks | None = None
) -> None:
    """Send order confirmation email to the user."""
    user = session.exec(select(User).where(User.id == user_id)).first()
    if not user or not user.email:
        return

    currency = os.getenv("PAYSTACK_CURRENCY", "GHS").strip().upper()
    lines = line_items_for_order_email(session, order.id)
    email_service.send_order_confirmation(
        user.email,
        order.id,
        order.total_price,
        user.name or user.username or user.email,
        currency=currency,
        line_items=lines,
        background_tasks=background_tasks
    )


async def generate_invoice_pdf(
    session: Session,
    order_id: int,
    company_name: str = "Sikapa Enterprise",
) -> bytes:
    """
    Generate PDF invoice for an order.
    
    Args:
        session: Database session
        order_id: Order ID
        company_name: Brand name on the invoice header
        
    Returns:
        bytes: PDF content
    """
    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if (order.payment_status or "").lower() != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice PDF is available only for paid orders",
        )
    
    invoice = session.exec(select(Invoice).where(Invoice.order_id == order_id)).first()
    if not invoice:
        # Backfill missing invoice for already-paid historical orders.
        invoice = await create_invoice_for_order(
            session,
            order,
            shipping=float(order.delivery_fee or 0),
            payment_method=order.payment_method or "card",
            issued_at=order.created_at,
            initial_status="paid",
        )
        invoice.paid_at = order.updated_at or datetime.utcnow()
        session.add(invoice)
        session.commit()
        session.refresh(invoice)
    
    user = session.exec(select(User).where(User.id == order.user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    order_items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    product_ids = list({i.product_id for i in order_items})
    products_by_id: dict[int, Product] = {}
    if product_ids:
        products = session.exec(select(Product).where(Product.id.in_(product_ids))).all()
        products_by_id = {p.id: p for p in products if p.id is not None}
    variant_ids = list({i.variant_id for i in order_items if i.variant_id})
    variants_by_id: dict[int, ProductVariant] = {}
    if variant_ids:
        vars_ = session.exec(
            select(ProductVariant).where(ProductVariant.id.in_(variant_ids))
        ).all()
        variants_by_id = {v.id: v for v in vars_ if v.id is not None}

    currency = os.getenv("PAYSTACK_CURRENCY", "GHS").strip().upper()

    return invoice_service.generate_invoice_pdf(
        invoice=invoice,
        order=order,
        user=user,
        order_items=order_items,
        products_by_id=products_by_id,
        variants_by_id=variants_by_id,
        company_name=company_name,
        currency_code=currency,
    )


async def send_shipment_notification_email(
    session: Session,
    order_id: int
) -> None:
    """
    Send shipment/tracking notification email to customer.
    
    Args:
        session: Database session
        order_id: Order ID
    """
    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    user = session.exec(select(User).where(User.id == order.user_id)).first()
    if not user or not user.email:
        return
    
    currency = os.getenv("PAYSTACK_CURRENCY", "GHS").strip().upper()
    lines = line_items_for_order_email(session, order_id)
    est = (
        order.estimated_delivery.strftime("%Y-%m-%d")
        if order.estimated_delivery
        else None
    )
    email_service.send_order_shipped(
        user.email,
        order.id,
        order.tracking_number,
        user.name or user.username or user.email,
        shipping_provider=order.shipping_provider,
        estimated_delivery=est,
        line_items=lines,
        currency=currency,
    )


async def update_order_status_and_notify(
    session: Session,
    order_id: int,
    new_status: str,
    tracking_number: str | None = None,
    shipping_provider: str | None = None,
    estimated_delivery: datetime | None = None
) -> Order:
    """
    Update order status and send appropriate notification emails.
    
    Args:
        session: Database session
        order_id: Order ID
        new_status: New order status (processing, shipped, delivered, cancelled)
        tracking_number: Optional tracking number for shipped orders
        shipping_provider: Optional shipping provider name
        estimated_delivery: Optional estimated delivery date
        
    Returns:
        Order: Updated order
    """
    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    order.status = new_status
    
    # Update tracking info if provided
    if new_status == "shipped":
        if tracking_number:
            order.tracking_number = tracking_number
        if shipping_provider:
            order.shipping_provider = shipping_provider
        if estimated_delivery:
            order.estimated_delivery = estimated_delivery
    
    # Mark as delivered if status is delivered
    if new_status == "delivered":
        order.delivered_at = datetime.utcnow()
    
    session.add(order)
    session.commit()
    session.refresh(order)
    
    # Send appropriate email notification
    if new_status == "shipped":
        await send_shipment_notification_email(session, order_id)
    elif new_status == "cancelled":
        user = session.exec(select(User).where(User.id == order.user_id)).first()
        if user and user.email:
            email_service.send_order_cancelled(
                user.email,
                order.id,
                user.name or user.username or user.email,
                reason=order.cancel_reason or "No reason provided",
            )
    
    return order
