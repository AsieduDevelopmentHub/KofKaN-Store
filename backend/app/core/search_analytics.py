"""
Lightweight logging of product-search queries for admin analytics.

Failures are swallowed: search UX must never break because of logging.
"""
from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

from sqlmodel import Session

from app.models import SearchQueryLog

logger = logging.getLogger(__name__)

_whitespace_re = re.compile(r"\s+")


def normalize_query(q: str) -> str:
    return _whitespace_re.sub(" ", str(q or "").strip().lower())[:200]


def hash_ip(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:64]


def log_search(
    session: Session,
    *,
    query: str,
    result_count: int,
    user_id: Optional[int] = None,
    ip: Optional[str] = None,
) -> None:
    try:
        cleaned = str(query or "").strip()[:200]
        if not cleaned:
            return
        row = SearchQueryLog(
            query=cleaned,
            normalized_query=normalize_query(cleaned),
            result_count=max(int(result_count or 0), 0),
            user_id=user_id,
            ip_hash=hash_ip(ip),
        )
        session.add(row)
        session.commit()
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Failed to log search query: %s", exc)
        try:
            session.rollback()
        except Exception:
            pass
