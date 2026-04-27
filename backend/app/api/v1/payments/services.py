"""
Paystack payment orchestration for orders.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from sqlalchemy import text

from app.db import DATABASE_URL, apply_postgres_session_user
from app.models import Order, Invoice, PaystackInitIdempotency, PaystackTransaction, User
from app.core import paystack_client
from app.core.email_service import EmailService
from app.core.order_mail import line_items_for_order_email

logger = logging.getLogger(__name__)
email_service = EmailService()

# Allowed mismatch between Paystack subunits and float-derived order total (rounding).
_AMOUNT_SUBUNIT_TOLERANCE = 1


def _upsert_paystack_transaction(
    session: Session,
    order: Order,
    reference: str,
    *,
    status: str,
    amount_subunit: int | None = None,
    currency: str | None = None,
    paystack_transaction_id: str | None = None,
    channel: str | None = None,
    customer_email: str | None = None,
    gateway_message: str | None = None,
    raw_last_event: str | None = None,
    paid_at: datetime | None = None,
    failed_at: datetime | None = None,
) -> PaystackTransaction:
    row = session.exec(
        select(PaystackTransaction).where(PaystackTransaction.reference == reference)
    ).first()
    now = datetime.utcnow()
    amt = amount_subunit if amount_subunit is not None else paystack_client.money_to_subunit(order.total_price)
    cur = (currency or _currency()).upper()[:8]
    if row is None:
        row = PaystackTransaction(
            order_id=order.id,
            user_id=order.user_id,
            reference=reference,
            status=status,
            amount_subunit=amt,
            currency=cur,
            paystack_transaction_id=paystack_transaction_id,
            channel=channel,
            customer_email=customer_email,
            gateway_message=gateway_message,
            raw_last_event=raw_last_event,
            paid_at=paid_at,
            failed_at=failed_at,
            created_at=now,
            updated_at=now,
        )
    else:
        row.status = status
        row.amount_subunit = amt
        row.currency = cur
        if paystack_transaction_id is not None:
            row.paystack_transaction_id = paystack_transaction_id
        if channel is not None:
            row.channel = channel
        if customer_email is not None:
            row.customer_email = customer_email
        if gateway_message is not None:
            row.gateway_message = gateway_message
        if raw_last_event is not None:
            row.raw_last_event = raw_last_event
        if paid_at is not None:
            row.paid_at = paid_at
        if failed_at is not None:
            row.failed_at = failed_at
        row.updated_at = now
    session.add(row)
    return row


def _currency() -> str:
    return os.getenv("PAYSTACK_CURRENCY", "GHS").upper()


def _public_key() -> str | None:
    pk = os.getenv("PAYSTACK_PUBLIC_KEY", "").strip()
    return pk or None


def build_order_reference(order_id: int) -> str:
    return f"SKP-{order_id}-{uuid.uuid4().hex[:10]}"


def _expected_amount_subunit(order: Order) -> int:
    return paystack_client.money_to_subunit(order.total_price)


def assert_charge_matches_order(
    order: Order,
    amount_subunit: int | None,
    currency: str | None,
) -> None:
    """Ensure Paystack-reported amount/currency match this order (strict, small float tolerance)."""
    if amount_subunit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paystack payload missing amount",
        )
    exp = _expected_amount_subunit(order)
    got = int(amount_subunit)
    if abs(got - exp) > _AMOUNT_SUBUNIT_TOLERANCE:
        logger.warning(
            "Paystack amount mismatch for order %s: expected %s subunits, got %s",
            order.id,
            exp,
            got,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount does not match order total",
        )
    cur = (currency or "").strip().upper() or _currency()
    if cur != _currency():
        logger.warning(
            "Paystack currency mismatch for order %s: expected %s, got %s",
            order.id,
            _currency(),
            cur,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment currency does not match configured currency",
        )


def _normalize_idempotency_key(raw: str | None) -> str | None:
    if raw is None:
        return None
    key = raw.strip()
    if not key:
        return None
    if len(key) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key must be at most 128 characters",
        )
    return key


def initialize_paystack_for_order(
    session: Session,
    user_id: int,
    user_email: str,
    order_id: int,
    callback_url: str,
    idempotency_key: str | None = None,
) -> dict:
    if not paystack_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured (missing PAYSTACK_SECRET_KEY)",
        )

    idem = _normalize_idempotency_key(idempotency_key)
    if idem:
        cached = session.exec(
            select(PaystackInitIdempotency).where(
                PaystackInitIdempotency.idempotency_key == idem
            )
        ).first()
        if cached:
            if cached.order_id != order_id or cached.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Idempotency-Key already used for a different order",
                )
            order = session.exec(select(Order).where(Order.id == order_id)).first()
            if not order or order.user_id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Order not found",
                )
            if order.payment_status == "paid":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Order is already paid",
                )
            return {
                "authorization_url": cached.authorization_url,
                "access_code": cached.access_code,
                "reference": cached.reference,
                "public_key": _public_key(),
            }

    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already paid",
        )
    if order.total_price <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order total must be greater than zero",
        )

    reference = build_order_reference(order_id)
    amount_sub = paystack_client.money_to_subunit(order.total_price)
    meta = {"order_id": order_id, "user_id": user_id}

    resp = paystack_client.initialize_transaction(
        email=user_email,
        amount_subunit=amount_sub,
        reference=reference,
        callback_url=callback_url,
        metadata=meta,
        currency=_currency(),
    )
    if not resp.get("status") or not resp.get("data"):
        msg = str(resp.get("message", "Paystack initialization failed"))
        hint = ""
        if "ip" in msg.lower():
            hint = (
                " Your server's outgoing IP is not in Paystack's whitelist. "
                "Fix: go to https://dashboard.paystack.com/#/settings/developer "
                "→ 'IP Whitelist' → either add your server's IP or disable the whitelist. "
                f"(Key mode: {paystack_client.key_mode()})"
            )
        logger.error(
            "Paystack initialization rejected (mode=%s): %s",
            paystack_client.key_mode(), msg,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=msg + hint,
        )

    data = resp["data"]
    order.paystack_reference = reference
    order.payment_method = "paystack"
    session.add(order)
    ref_final = str(data.get("reference", reference))
    _upsert_paystack_transaction(
        session,
        order,
        ref_final,
        status="pending",
        gateway_message=str(resp.get("message", ""))[:2000] or None,
    )

    if idem:
        row = PaystackInitIdempotency(
            idempotency_key=idem,
            order_id=order_id,
            user_id=user_id,
            reference=data.get("reference", reference),
            authorization_url=data["authorization_url"],
            access_code=data["access_code"],
        )
        session.add(row)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            existing = session.exec(
                select(PaystackInitIdempotency).where(
                    PaystackInitIdempotency.idempotency_key == idem
                )
            ).first()
            if (
                existing
                and existing.order_id == order_id
                and existing.user_id == user_id
            ):
                return {
                    "authorization_url": existing.authorization_url,
                    "access_code": existing.access_code,
                    "reference": existing.reference,
                    "public_key": _public_key(),
                }
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency-Key conflict; retry with the same key",
            ) from None
    else:
        session.commit()

    session.refresh(order)

    return {
        "authorization_url": data["authorization_url"],
        "access_code": data["access_code"],
        "reference": data.get("reference", reference),
        "public_key": _public_key(),
    }


def _apply_successful_payment(session: Session, order: Order, reference: str) -> Order:
    order.payment_status = "paid"
    order.payment_method = "paystack"
    if order.status == "pending":
        order.status = "processing"
    order.updated_at = datetime.utcnow()
    session.add(order)

    inv = session.exec(
        select(Invoice).where(Invoice.order_id == order.id)
    ).first()
    if inv and inv.status != "paid":
        inv.status = "paid"
        inv.paid_at = datetime.utcnow()
        session.add(inv)
    elif inv is None:
        # Invoice is generated only after payment succeeds.
        subtotal = float(order.subtotal_amount) if order.subtotal_amount is not None else float(order.total_price)
        shipping = float(order.delivery_fee or 0)
        tax = 0.0
        total = round(subtotal + tax + shipping, 2)
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{order.id}-{uuid.uuid4().hex[:8]}"
        inv = Invoice(
            order_id=order.id,
            invoice_number=invoice_number,
            subtotal=subtotal,
            tax=tax,
            shipping=shipping,
            total=total,
            payment_method=order.payment_method or "card",
            status="paid",
            # Keep invoice date aligned to order creation date.
            issued_at=order.created_at,
            paid_at=datetime.utcnow(),
        )
        session.add(inv)

    session.commit()
    session.refresh(order)
    _send_order_confirmation_once(session, order)
    return order


def _send_order_confirmation_once(session: Session, order: Order) -> None:
    """
    Send order confirmation once, after payment is confirmed as paid.
    Uses `confirmation_email_sent_at` as the idempotency guard.
    """
    if order.confirmation_email_sent_at is not None:
        return
    user = session.get(User, order.user_id)
    if not user or not user.email:
        return
    currency = os.getenv("PAYSTACK_CURRENCY", "GHS").strip().upper()
    lines = line_items_for_order_email(session, order.id)
    sent = email_service.send_order_confirmation(
        user.email,
        order.id,
        order.total_price,
        user.name or user.username or user.email,
        currency=currency,
        line_items=lines,
    )
    if not sent:
        logger.warning("Order confirmation email failed for order %s", order.id)
        return
    order.confirmation_email_sent_at = datetime.utcnow()
    order.updated_at = datetime.utcnow()
    session.add(order)
    session.commit()


def verify_paystack_reference(
    session: Session,
    user_id: int | None,
    reference: str,
) -> dict:
    if not paystack_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    order = session.exec(
        select(Order).where(Order.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No order for this payment reference",
        )
    if user_id is not None and order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to verify this payment",
        )

    if order.payment_status == "paid":
        _send_order_confirmation_once(session, order)
        return _serialize_verify(order, reference, already=True)

    raw = paystack_client.verify_transaction(reference)
    if not raw.get("status") or not raw.get("data"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=raw.get("message", "Verification failed"),
        )

    pdata = raw["data"]
    if pdata.get("status") != "success":
        order.payment_status = "failed"
        session.add(order)
        _upsert_paystack_transaction(
            session,
            order,
            reference,
            status="failed",
            amount_subunit=int(pdata.get("amount") or 0) or None,
            currency=str(pdata.get("currency") or "") or None,
            paystack_transaction_id=str(pdata.get("id") or "") or None,
            channel=str(pdata.get("channel") or "") or None,
            gateway_message=str(pdata.get("gateway_response") or pdata.get("message") or "")[:2000]
            or None,
            failed_at=datetime.utcnow(),
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment not successful: {pdata.get('status')}",
        )

    raw_amt = pdata.get("amount")
    paid_sub = int(raw_amt) if raw_amt is not None else None
    assert_charge_matches_order(
        order,
        paid_sub,
        str(pdata.get("currency") or "") or None,
    )

    paid_at = pdata.get("paid_at")
    cust = pdata.get("customer")
    cust_email = cust.get("email") if isinstance(cust, dict) else None
    _upsert_paystack_transaction(
        session,
        order,
        reference,
        status="success",
        amount_subunit=paid_sub,
        currency=str(pdata.get("currency", _currency())),
        paystack_transaction_id=str(pdata.get("id") or "") or None,
        channel=str(pdata.get("channel") or "") or None,
        customer_email=cust_email,
        paid_at=datetime.utcnow(),
    )
    _apply_successful_payment(session, order, reference)
    return _serialize_verify(
        order,
        reference,
        paid_at=paid_at,
        amount_subunit=int(pdata.get("amount", 0)),
        currency=str(pdata.get("currency", _currency())),
        customer_email=(pdata.get("customer") or {}).get("email")
        if isinstance(pdata.get("customer"), dict)
        else None,
        metadata=pdata.get("metadata"),
    )


def _serialize_verify(
    order: Order,
    reference: str,
    *,
    already: bool = False,
    paid_at: str | None = None,
    amount_subunit: int = 0,
    currency: str | None = None,
    customer_email: str | None = None,
    metadata: dict | None = None,
) -> dict:
    return {
        "status": "paid" if order.payment_status == "paid" else order.payment_status,
        "reference": reference,
        "amount_subunit": amount_subunit
        or paystack_client.money_to_subunit(order.total_price),
        "currency": currency or _currency(),
        "paid_at": paid_at,
        "customer_email": customer_email,
        "metadata": metadata,
        "already_confirmed": already,
        "order_id": order.id,
    }


def verify_paystack_signature(payload: bytes, signature: str | None) -> bool:
    secret = os.getenv("PAYSTACK_SECRET_KEY", "")
    if not secret or not signature:
        return False
    digest = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(digest, signature)


def handle_paystack_webhook(session: Session, payload: bytes) -> bool:
    import json

    try:
        body = json.loads(payload.decode("utf-8"))
    except Exception:
        logger.warning("Paystack webhook invalid JSON")
        return False

    event = body.get("event")
    data = body.get("data") or {}
    reference = data.get("reference")
    if not reference:
        return False

    if event == "charge.success":
        if DATABASE_URL.startswith("postgresql"):
            row_uid = session.connection().execute(
                text("SELECT app.get_order_user_for_paystack(:r)"),
                {"r": str(reference)},
            ).scalar()
            if row_uid is not None:
                apply_postgres_session_user(session, int(row_uid))
        order = session.exec(
            select(Order).where(Order.paystack_reference == reference)
        ).first()
        if not order:
            logger.info("Webhook: unknown reference %s", reference)
            return True
        if order.payment_status == "paid":
            logger.info("Webhook duplicate charge.success for paid order %s", order.id)
            _send_order_confirmation_once(session, order)
            return True
        if data.get("status") != "success":
            return True
        raw_amt = data.get("amount")
        paid_sub = int(raw_amt) if raw_amt is not None else None
        try:
            assert_charge_matches_order(
                order,
                paid_sub,
                str(data.get("currency") or "") or None,
            )
        except HTTPException as e:
            logger.warning(
                "Webhook: rejected charge.success for order %s: %s",
                order.id,
                getattr(e, "detail", e),
            )
            return True
        raw_ev = json.dumps({"event": event, "data": data})[:8000]
        _upsert_paystack_transaction(
            session,
            order,
            reference,
            status="success",
            amount_subunit=paid_sub,
            currency=str(data.get("currency", _currency())),
            paystack_transaction_id=str(data.get("id") or "") or None,
            channel=str(data.get("channel") or "") or None,
            raw_last_event=raw_ev,
            paid_at=datetime.utcnow(),
        )
        _apply_successful_payment(session, order, reference)
        return True

    return True


def admin_refund_paystack_order(
    session: Session,
    order_id: int,
    *,
    amount_major: float | None,
    customer_note: str | None,
    merchant_note: str | None,
) -> dict:
    if not paystack_client.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack is not configured",
        )

    order = session.exec(select(Order).where(Order.id == order_id)).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.payment_status in ("refunded", "partially_refunded"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order payment is already refunded or partially refunded",
        )
    if order.payment_status != "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paid orders can be refunded via Paystack",
        )
    if not order.paystack_reference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order has no Paystack transaction reference",
        )

    total_sub = paystack_client.money_to_subunit(order.total_price)
    amount_sub: int | None
    if amount_major is None:
        amount_sub = None
    else:
        amount_sub = paystack_client.money_to_subunit(amount_major)
        if amount_sub <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund amount must be positive",
            )
        if amount_sub > total_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund amount cannot exceed order total",
            )

    resp = paystack_client.create_refund(
        order.paystack_reference,
        amount_subunit=amount_sub,
        currency=_currency(),
        customer_note=customer_note,
        merchant_note=merchant_note,
    )
    if not resp.get("status") or not resp.get("data"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(resp.get("message", "Paystack refund failed")),
        )

    rdata = resp["data"]
    refund_amount = int(rdata.get("amount", amount_sub or total_sub))
    full = amount_sub is None or refund_amount >= total_sub - _AMOUNT_SUBUNIT_TOLERANCE

    if full:
        order.payment_status = "refunded"
        if order.status in ("pending", "processing"):
            order.status = "cancelled"
    else:
        order.payment_status = "partially_refunded"
    order.updated_at = datetime.utcnow()
    session.add(order)

    inv = session.exec(
        select(Invoice).where(Invoice.order_id == order.id)
    ).first()
    if inv and full:
        inv.status = "refunded"
        session.add(inv)

    pst = session.exec(
        select(PaystackTransaction).where(
            PaystackTransaction.reference == order.paystack_reference
        )
    ).first()
    if pst:
        pst.status = order.payment_status
        pst.gateway_message = str(resp.get("message", ""))[:2000] or pst.gateway_message
        pst.updated_at = datetime.utcnow()
        session.add(pst)

    session.commit()
    session.refresh(order)

    return {
        "order_id": order.id,
        "payment_status": order.payment_status,
        "refund_id": rdata.get("id"),
        "amount_subunit": refund_amount,
        "currency": str(rdata.get("currency", _currency())),
        "paystack_status": str(rdata.get("status", "")),
        "message": str(resp.get("message", "")),
    }
