from __future__ import annotations

from os import getenv

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

API_RATE_LIMIT_ENABLED = getenv("API_RATE_LIMIT_ENABLED", "true").strip().lower() in {"1", "true", "yes"}


def _decorator(limit_value: str):
    def _inner(func):
        if not API_RATE_LIMIT_ENABLED:
            return func
        return limiter.limit(limit_value)(func)

    return _inner


register_limiter = _decorator("5/minute")
login_limiter = _decorator("10/minute")
token_refresh_limiter = _decorator("10/minute")
auth_limiter = _decorator("20/minute")
