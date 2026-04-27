"""
Background jobs for marketing emails — runs outside the HTTP request thread.
Uses a fresh DB session per task (request session must not cross threads).
"""
from __future__ import annotations

import logging
import os
from typing import Literal

from sqlmodel import Session

from app.db import engine
from app.models import Product
from app.api.v1.subscriptions.services import newsletter_recipients
from app.core.email_service import EmailService

logger = logging.getLogger(__name__)

_email = EmailService()
_NEWSLETTER_CAP = int(os.getenv("NEWSLETTER_MAX_RECIPIENTS", "1000"))


def newsletter_product_alerts_enabled() -> bool:
    if os.getenv("EMAIL_ENABLED", "false").strip().lower() not in {"1", "true", "yes"}:
        return False
    return os.getenv("NEWSLETTER_PRODUCT_ALERTS_ENABLED", "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }


def run_product_newsletter_job(
    product_id: int,
    update_type: Literal["new_product", "price_drop"],
    previous_price: float | None,
) -> None:
    """
    Send product-update emails to verified subscribers.
    Intended for FastAPI BackgroundTasks (runs after response is prepared).
    """
    if not newsletter_product_alerts_enabled():
        return
    try:
        with Session(engine) as session:
            prod = session.get(Product, product_id)
            if prod is None or not prod.is_active:
                logger.info("Newsletter skip: product %s missing or inactive", product_id)
                return

            if update_type == "price_drop":
                if previous_price is None:
                    return
                if float(prod.price) >= float(previous_price):
                    logger.info("Newsletter skip: price did not decrease for product %s", product_id)
                    return

            recipients = newsletter_recipients(session)
            if not recipients:
                return

            for sub in recipients[:_NEWSLETTER_CAP]:
                try:
                    _email.send_newsletter_product_update(
                        sub.email,
                        product_name=prod.name,
                        product_slug=prod.slug,
                        current_price=float(prod.price),
                        category=prod.category,
                        update_type=update_type,
                        previous_price=previous_price if update_type == "price_drop" else None,
                        unsubscribe_token=sub.verification_token,
                    )
                except Exception as exc:  # pragma: no cover
                    logger.exception("Newsletter send failed for %s: %s", sub.email, exc)
    except Exception as exc:
        logger.exception("Newsletter job failed for product %s: %s", product_id, exc)
