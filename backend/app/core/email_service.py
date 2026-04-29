"""
Email service using Resend API for sending emails.
"""
import os
from typing import Optional
from urllib.parse import quote
import resend
from dotenv import load_dotenv

from app.core import email_templates as T
from app.core.placeholder_email import is_undeliverable_placeholder_email

load_dotenv()

resend_api_key = os.getenv("RESEND_API_KEY")
email_enabled = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
default_from_email = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "KofKaN Technologies <no-reply@localhost>",
)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

if email_enabled and resend_api_key:
    resend.api_key = resend_api_key
else:
    if email_enabled and not resend_api_key:
        print("⚠️  WARNING: EMAIL_ENABLED=true but RESEND_API_KEY is missing.")
    if not email_enabled:
        print("⚠️  INFO: Emails are disabled for local development (EMAIL_ENABLED=false).")


from fastapi import BackgroundTasks
from app.core.tasks import send_email_immediate

class EmailService:
    """Service for sending emails via Resend API."""

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> Optional[str]:
        if from_email is None:
            from_email = default_from_email

        # 1. Preferred: FastAPI BackgroundTasks (Process-native, No billing)
        if background_tasks:
            background_tasks.add_task(
                send_email_immediate,
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                from_email=from_email,
            )
            return "queued-in-background"

        # 2. Reliability fallback: send immediately.
        # Many call sites (orders/payments/admin actions) don't pass FastAPI BackgroundTasks.
        # Queueing to Celery without a running worker results in "email never sent".
        return send_email_immediate(to_email, subject, html_content, from_email)

    @staticmethod
    def send_welcome_email(email: str, first_name: str | None = None, background_tasks: BackgroundTasks | None = None) -> bool:
        name = first_name or "there"
        subject = "Welcome to KofKaN Technologies"
        inner = (
            T.greeting_line(name)
            + T.paragraph(
                "Thank you for joining us. Your account is ready—verify your email when "
                "prompted to unlock the full experience."
            )
            + T.muted_paragraph(
                "If you have questions, reply to this message or reach out through the store."
            )
        )
        html_content = T.wrap_email(
            title="Welcome",
            preheader="Your KofKaN account is ready.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content, background_tasks=background_tasks) is not None

    @staticmethod
    def send_email_verification(email: str, otp_code: str, first_name: str | None = None, background_tasks: BackgroundTasks | None = None) -> bool:
        name = first_name or "there"
        subject = "Verify your email — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph("Use this code to verify your email address:")
            + T.otp_box(otp_code)
            + T.muted_paragraph("This code expires in 24 hours. If you did not request it, you can ignore this email.")
        )
        html_content = T.wrap_email(
            title="Verify your email",
            preheader=f"Your code: {otp_code}",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content, background_tasks=background_tasks) is not None

    @staticmethod
    def send_password_reset(email: str, reset_token: str, first_name: str | None = None, background_tasks: BackgroundTasks | None = None) -> bool:
        name = first_name or "there"
        reset_url = T.reset_password_url(reset_token)
        subject = "Reset your password — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph("We received a request to reset your password. Choose a new one using the button below.")
            + T.primary_button(reset_url, "Reset password")
            + T.link_fallback(reset_url)
            + T.muted_paragraph("This link expires in one hour. If you did not ask for a reset, you can ignore this email.")
        )
        html_content = T.wrap_email(
            title="Reset your password",
            preheader="Secure your KofKaN account with a new password.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content, background_tasks=background_tasks) is not None

    @staticmethod
    def send_2fa_enabled(email: str, first_name: str | None = None) -> bool:
        name = first_name or "there"
        subject = "Two-factor authentication enabled — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph(
                "Two-factor authentication is now on for your account. You will need your password "
                "and your authenticator code to sign in."
            )
            + T.muted_paragraph("Store your backup codes somewhere safe in case you lose your device.")
        )
        html_content = T.wrap_email(
            title="2FA is on",
            preheader="Your KofKaN account is more secure.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_account_deletion(email: str, first_name: str | None = None, background_tasks: BackgroundTasks | None = None) -> bool:
        name = first_name or "there"
        subject = "Account deleted — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph("Your KofKaN account has been deleted as requested.")
            + T.muted_paragraph("Personal data is removed according to our privacy policy. You are welcome back anytime.")
        )
        html_content = T.wrap_email(
            title="Account deleted",
            preheader="Your KofKaN account has been removed.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content, background_tasks=background_tasks) is not None

    @staticmethod
    def send_subscription_confirmation(email: str, verification_token: str) -> bool:
        base = (frontend_url or "").rstrip("/")
        verify_url = f"{base}/api/v1/subscriptions/verify/{quote(verification_token, safe='')}"
        subject = "Confirm your newsletter — KofKaN"
        inner = (
            T.paragraph("Thanks for subscribing. Confirm your email to start receiving updates.")
            + T.primary_button(verify_url, "Confirm subscription")
            + T.link_fallback(verify_url)
        )
        html_content = T.wrap_email(
            title="Confirm subscription",
            preheader="One click to join the KofKaN list.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_account_deactivated(email: str, first_name: str | None = None) -> bool:
        name = first_name or "there"
        subject = "Account deactivated — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph("Your account has been deactivated by an administrator.")
            + T.muted_paragraph("If you believe this is a mistake, contact support.")
        )
        html_content = T.wrap_email(
            title="Account deactivated",
            preheader="Your KofKaN access is paused.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_account_reactivated(email: str, first_name: str | None = None) -> bool:
        name = first_name or "there"
        subject = "Account reactivated — KofKaN"
        inner = (
            T.greeting_line(name)
            + T.paragraph("Good news—your account is active again. You can sign in and shop as usual.")
        )
        html_content = T.wrap_email(
            title="Welcome back",
            preheader="Your KofKaN account is active again.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_order_confirmation(
        email: str,
        order_id: int,
        order_total: float,
        first_name: str | None = None,
        *,
        currency: str = "GHS",
        line_items: list[dict] | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> bool:
        name = first_name or "Customer"
        cur = (currency or "GHS").strip().upper()
        base = (frontend_url or "").rstrip("/")
        order_url = f"{base}/orders/{order_id}"
        n_items = len(line_items or [])
        summary_bit = f"{n_items} item{'s' if n_items != 1 else ''}" if n_items else "your purchase"
        subject = f"Order confirmed — {summary_bit} · KofKaN"

        inner = (
            T.greeting_line(name)
            + T.paragraph("Thank you. Payment is confirmed and we are preparing your order.")
        )
        if line_items:
            inner += T.order_lines_table(line_items, cur)
        inner += T.order_total_bar(float(order_total), cur)
        inner += (
            T.muted_paragraph(f"Reference: order #{order_id}")
            + T.primary_button(order_url, "View order")
            + T.link_fallback(order_url)
            + T.muted_paragraph("We will notify you when your order ships.")
        )
        html_content = T.wrap_email(
            title="Your order is confirmed",
            preheader=f"Thank you — {cur} {order_total:,.2f} total.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content, background_tasks=background_tasks) is not None

    @staticmethod
    def send_order_shipped(
        email: str,
        order_id: int,
        tracking_number: str | None = None,
        first_name: str | None = None,
        *,
        shipping_provider: str | None = None,
        estimated_delivery: str | None = None,
        line_items: list[dict] | None = None,
        currency: str = "GHS",
    ) -> bool:
        name = first_name or "Customer"
        cur = (currency or "GHS").strip().upper()
        base = (frontend_url or "").rstrip("/")
        order_url = f"{base}/orders/{order_id}"
        subject = "Your order has shipped — KofKaN"

        inner = T.greeting_line(name) + T.paragraph("Your order is on its way.")
        if line_items:
            inner += T.order_lines_table(line_items, cur)
        if shipping_provider:
            inner += T.muted_paragraph(f"Carrier: {shipping_provider}")
        if tracking_number:
            inner += T.muted_paragraph(f"Tracking: {tracking_number}")
        if estimated_delivery:
            inner += T.muted_paragraph(f"Estimated delivery: {estimated_delivery}")
        inner += T.primary_button(order_url, "View order") + T.link_fallback(order_url)
        html_content = T.wrap_email(
            title="Shipped",
            preheader="Your KofKaN parcel is on the move.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_order_cancelled(
        email: str,
        order_id: int,
        first_name: str | None = None,
        reason: str | None = None,
    ) -> bool:
        name = first_name or "Customer"
        subject = f"Order #{order_id} cancelled — KofKaN"
        r = (reason or "No reason provided").strip()
        inner = (
            T.greeting_line(name)
            + T.paragraph(f"Order #{order_id} has been cancelled.")
            + T.muted_paragraph(f"Reason: {r}")
        )
        html_content = T.wrap_email(
            title="Order cancelled",
            preheader=f"Order #{order_id} was cancelled.",
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None

    @staticmethod
    def send_newsletter_product_update(
        email: str,
        *,
        product_name: str,
        product_slug: str,
        current_price: float,
        category: str | None = None,
        update_type: str = "product_update",
        previous_price: float | None = None,
        unsubscribe_token: str | None = None,
    ) -> bool:
        base = (frontend_url or "").rstrip("/")
        product_url = f"{base}/product/{quote(str(product_slug), safe='')}"
        if update_type == "new_product":
            subject = f"Just dropped: {product_name} — KofKaN"
            lead = "A new item is now live in our catalog."
        elif previous_price is not None and current_price < previous_price:
            subject = f"Price drop: {product_name} — KofKaN"
            lead = f"Good news: this item is now lower than before (was GHS {previous_price:,.2f})."
        else:
            subject = f"Catalog update: {product_name} — KofKaN"
            lead = "One of our products has been updated."

        inner = (
            T.paragraph(lead)
            + T.paragraph(f"Product: {product_name}")
            + T.muted_paragraph(f"Current price: GHS {current_price:,.2f}")
        )
        if category:
            inner += T.muted_paragraph(f"Category: {category}")
        inner += T.primary_button(product_url, "View product") + T.link_fallback(product_url)
        if unsubscribe_token:
            unsub_url = f"{base}/api/v1/subscriptions/unsubscribe/{quote(unsubscribe_token, safe='')}"
            inner += T.muted_paragraph("You can unsubscribe anytime:")
            inner += T.link_fallback(unsub_url)

        html_content = T.wrap_email(
            title="KofKaN newsletter",
            preheader=subject,
            inner_html=inner,
        )
        return EmailService.send_email(email, subject, html_content) is not None


email_service = EmailService()
