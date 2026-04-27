"""
Shared SlowAPI limiter for middleware and route decorators.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque

from slowapi import Limiter
from slowapi.util import get_remote_address

def _get_limiter() -> Limiter:
    redis_url = os.getenv("REDIS_URL", "").strip()
    if redis_url:
        return Limiter(key_func=get_remote_address, storage_uri=redis_url)
    return Limiter(key_func=get_remote_address)

limiter = _get_limiter()

login_limiter = limiter.limit("10/minute")
register_limiter = limiter.limit("5/minute")
password_reset_limiter = limiter.limit("2/minute")
auth_limiter = limiter.limit("10/minute")
password_reset_request_limiter = limiter.limit("3/minute")
password_reset_confirm_limiter = limiter.limit("5/minute")
token_refresh_limiter = limiter.limit("5/minute")

def parse_rate_limited_prefixes() -> list[str]:
    raw = os.getenv(
        "API_RATE_LIMIT_PATH_PREFIXES",
        "/api/v1/admin,/api/v1/orders,/api/v1/payments",
    ).strip()
    if not raw:
        return []
    return [p.strip() for p in raw.split(",") if p.strip()]
