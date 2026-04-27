"""Validate dangerous defaults before accepting traffic (production hardening)."""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = "supersecretkey123"
_MIN_SECRET_LEN = 32


def is_production_environment() -> bool:
    raw = os.getenv("ENVIRONMENT", "").strip().lower()
    if raw in {"production", "prod", "live"}:
        return True
    return os.getenv("PRODUCTION", "").strip().lower() in {"1", "true", "yes"}


def validate_production_config_or_raise() -> None:
    """Fail fast when production is enabled but secrets are unsafe."""
    if not is_production_environment():
        return

    secret = os.getenv("SECRET_KEY", "").strip()
    if not secret or secret == _DEFAULT_SECRET or len(secret) < _MIN_SECRET_LEN:
        logger.critical(
            "Production startup blocked: set a strong SECRET_KEY (>= %s chars), not the default.",
            _MIN_SECRET_LEN,
        )
        raise RuntimeError(
            "Production requires SECRET_KEY set to a long random value (>= "
            f"{_MIN_SECRET_LEN} characters). Do not use the default placeholder."
        )



def warn_dev_secret() -> None:
    """Log a prominent warning when running with the default JWT secret."""
    if is_production_environment():
        return
    secret = os.getenv("SECRET_KEY", "").strip()
    if not secret or secret == _DEFAULT_SECRET:
        logger.warning(
            "Using default SECRET_KEY — JWTs are forgeable by anyone who knows the source. "
            "Set SECRET_KEY in backend/.env for real deployments.",
        )
