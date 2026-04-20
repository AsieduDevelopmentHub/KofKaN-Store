from __future__ import annotations

from app.core.config import settings


def is_production_environment() -> bool:
    if settings.debug:
        return False
    return "localhost" not in settings.frontend_base_url and "127.0.0.1" not in settings.frontend_base_url


def validate_production_config_or_raise() -> None:
    if not is_production_environment():
        return
    errors: list[str] = []
    if settings.secret_key == "change-me-in-production":
        errors.append("SECRET_KEY must be set to a strong value")
    if not settings.https_enabled:
        errors.append("HTTPS_ENABLED must be true in production")
    if settings.disable_openapi is False:
        errors.append("DISABLE_OPENAPI should be true in production")
    if not settings.paystack_webhook_secret.strip():
        errors.append("PAYSTACK_WEBHOOK_SECRET must be configured in production")
    if errors:
        raise RuntimeError("Invalid production configuration: " + "; ".join(errors))


def warn_dev_secret() -> None:
    if settings.secret_key == "change-me-in-production":
        print("WARNING: using default SECRET_KEY; change it before production.")
