"""Paystack payment services: validation, idempotency, webhooks (mocked client)."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlmodel import Session, select

from app.api.v1.payments import services as payment_services
from app.core import paystack_client
from app.core.security import get_password_hash
from app.models import Order, PaystackInitIdempotency, User


def _user(session: Session, *, admin: bool = False) -> User:
    seed = str(id(session))
    u = User(
        username=f"u{admin}-{seed}",
        name=f"User {seed}",
        email=f"u{admin}-{id(session)}@example.com",
        hashed_password=get_password_hash("Pw123456!"),
        is_active=True,
        email_verified=True,
        is_admin=admin,
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def test_assert_charge_matches_order_ok(test_session: Session):
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=10.0,
        status="pending",
        paystack_reference="SKP-99-abcdef",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    sub = paystack_client.money_to_subunit(10.0)
    payment_services.assert_charge_matches_order(order, sub, "GHS")


def test_assert_charge_matches_order_wrong_amount(test_session: Session):
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=10.0,
        status="pending",
        paystack_reference="SKP-99-abcdef",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    with pytest.raises(HTTPException) as exc:
        payment_services.assert_charge_matches_order(
            order, paystack_client.money_to_subunit(10.0) + 500, "GHS"
        )
    assert exc.value.status_code == 400


def test_verify_rejects_amount_mismatch(test_session: Session, monkeypatch):
    monkeypatch.setenv("PAYSTACK_CURRENCY", "GHS")
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=25.0,
        status="pending",
        paystack_reference="SKP-REF-1",
        payment_status="pending",
    )
    test_session.add(order)
    test_session.commit()

    bad_amount = paystack_client.money_to_subunit(25.0) + 1000
    fake_verify = {
        "status": True,
        "data": {
            "status": "success",
            "amount": bad_amount,
            "currency": "GHS",
            "customer": {"email": u.email},
        },
    }

    with patch.object(
        payment_services.paystack_client, "is_configured", return_value=True
    ), patch.object(
        payment_services.paystack_client,
        "verify_transaction",
        return_value=fake_verify,
    ):
        with pytest.raises(HTTPException) as exc:
            payment_services.verify_paystack_reference(
                test_session, u.id, "SKP-REF-1"
            )
        assert exc.value.status_code == 400


def test_webhook_skips_payment_on_amount_mismatch(test_session: Session, monkeypatch):
    monkeypatch.setenv("PAYSTACK_CURRENCY", "GHS")
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=5.0,
        status="pending",
        paystack_reference="SKP-WH-1",
        payment_status="pending",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    body = json.dumps(
        {
            "event": "charge.success",
            "data": {
                "reference": "SKP-WH-1",
                "status": "success",
                "amount": paystack_client.money_to_subunit(5.0) + 999,
                "currency": "GHS",
            },
        }
    ).encode("utf-8")

    payment_services.handle_paystack_webhook(test_session, body)

    test_session.refresh(order)
    assert order.payment_status != "paid"


def test_verify_marks_paid_and_sends_confirmation_once(test_session: Session, monkeypatch):
    monkeypatch.setenv("PAYSTACK_CURRENCY", "GHS")
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=25.0,
        status="pending",
        paystack_reference="SKP-VERIFY-OK-1",
        payment_status="pending",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    ok_payload = {
        "status": True,
        "data": {
            "status": "success",
            "amount": paystack_client.money_to_subunit(25.0),
            "currency": "GHS",
            "id": "ps_tx_123",
            "channel": "card",
            "customer": {"email": u.email},
            "metadata": {"order_id": order.id},
            "paid_at": "2026-04-13T20:00:00Z",
        },
    }

    with patch.object(payment_services.paystack_client, "is_configured", return_value=True), patch.object(
        payment_services.paystack_client,
        "verify_transaction",
        return_value=ok_payload,
    ), patch.object(
        payment_services.email_service,
        "send_order_confirmation",
        return_value=True,
    ) as send_mock:
        out1 = payment_services.verify_paystack_reference(test_session, u.id, "SKP-VERIFY-OK-1")
        out2 = payment_services.verify_paystack_reference(test_session, u.id, "SKP-VERIFY-OK-1")

    assert out1["status"] == "paid"
    assert out2["already_confirmed"] is True
    assert send_mock.call_count == 1
    test_session.refresh(order)
    assert order.payment_status == "paid"
    assert order.confirmation_email_sent_at is not None


@patch.object(payment_services.paystack_client, "is_configured", return_value=True)
@patch.object(
    payment_services.paystack_client,
    "initialize_transaction",
    return_value={
        "status": True,
        "data": {
            "authorization_url": "https://pay.test/checkout",
            "access_code": "acc-1",
            "reference": "SKP-1-deadbeef",
        },
    },
)
def test_initialize_idempotency_returns_cached(
    mock_init: MagicMock,
    _ic: MagicMock,
    test_session: Session,
    monkeypatch,
):
    monkeypatch.setenv("PAYSTACK_CURRENCY", "GHS")
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=12.34,
        status="pending",
        payment_status="pending",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    key = "idem-key-001"
    out1 = payment_services.initialize_paystack_for_order(
        test_session,
        u.id,
        u.email,
        order.id,
        "https://app.example/cb",
        idempotency_key=key,
    )
    assert out1["authorization_url"] == "https://pay.test/checkout"
    assert mock_init.call_count == 1

    out2 = payment_services.initialize_paystack_for_order(
        test_session,
        u.id,
        u.email,
        order.id,
        "https://app.example/cb",
        idempotency_key=key,
    )
    assert out2 == out1
    assert mock_init.call_count == 1

    row = test_session.exec(
        select(PaystackInitIdempotency).where(
            PaystackInitIdempotency.idempotency_key == key
        )
    ).first()
    assert row is not None
    assert row.order_id == order.id


@patch.object(payment_services.paystack_client, "is_configured", return_value=True)
@patch.object(
    payment_services.paystack_client,
    "create_refund",
    return_value={
        "status": True,
        "message": "Refund has been queued for processing",
        "data": {
            "id": 999001,
            "amount": 2000,
            "currency": "GHS",
            "status": "pending",
        },
    },
)
def test_admin_refund_full(
    mock_refund: MagicMock,
    _ic: MagicMock,
    test_session: Session,
    monkeypatch,
):
    monkeypatch.setenv("PAYSTACK_CURRENCY", "GHS")
    u = _user(test_session)
    order = Order(
        user_id=u.id,
        total_price=20.0,
        status="processing",
        paystack_reference="SKP-PAID-1",
        payment_status="paid",
        payment_method="paystack",
    )
    test_session.add(order)
    test_session.commit()
    test_session.refresh(order)

    out = payment_services.admin_refund_paystack_order(
        test_session,
        order.id,
        amount_major=None,
        customer_note=None,
        merchant_note="admin test",
    )
    assert out["payment_status"] == "refunded"
    assert out["refund_id"] == 999001
    mock_refund.assert_called_once()

    test_session.refresh(order)
    assert order.payment_status == "refunded"
    assert order.status == "cancelled"
