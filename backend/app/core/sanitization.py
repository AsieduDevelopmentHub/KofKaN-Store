"""
Strip dangerous markup and normalize user-supplied text for storage and display.
Uses nh3 (Rust-backed, actively maintained) instead of deprecated bleach.
"""
from __future__ import annotations

import re
from typing import Optional

import nh3

# No HTML tags allowed in plain-text fields.
_ALLOWED_TAGS: set[str] = set()   # nh3.clean with empty set strips all tags


def sanitize_plain_text(
    value: Optional[str],
    *,
    max_length: Optional[int] = None,
    single_line: bool = True,
) -> Optional[str]:
    """Remove HTML/script; trim whitespace; optional max length."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    cleaned = nh3.clean(text, tags=_ALLOWED_TAGS).strip()
    if single_line:
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if max_length is not None and len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip()
    return cleaned or None


def sanitize_multiline_text(value: Optional[str], *, max_length: Optional[int] = None) -> Optional[str]:
    """Like sanitize_plain_text but keeps newlines (still no HTML)."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    cleaned = nh3.clean(text, tags=_ALLOWED_TAGS).strip()
    if max_length is not None and len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip()
    return cleaned or None


_slug_re = re.compile(r"[^a-z0-9-]+")


def sanitize_slug(value: str) -> str:
    """Lowercase slug: only a-z, 0-9, hyphens."""
    s = str(value).strip().lower()
    s = _slug_re.sub("-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s


def sanitize_phone(value: Optional[str]) -> Optional[str]:
    """Keep common phone characters only."""
    if value is None:
        return None
    raw = nh3.clean(str(value).strip(), tags=_ALLOWED_TAGS)
    if not raw:
        return None
    allowed = re.sub(r"[^\d+\-().\s]", "", raw)
    allowed = re.sub(r"\s+", " ", allowed).strip()
    return allowed or None
