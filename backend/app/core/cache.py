"""
Redis cache layer — thin wrapper around redis-py.

Usage
-----
from app.core.cache import cache

data = await cache.get("my:key")           # returns dict | list | None
await cache.set("my:key", data, ttl=300)  # TTL in seconds
await cache.delete("my:key")
await cache.delete_pattern("product:*")   # wildcard invalidation

Graceful degradation
--------------------
If REDIS_URL is unset or Redis is unreachable, every call is a no-op so the
application falls back to the database transparently — critical for test
environments and cold starts.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# TTL constants (seconds)
# ---------------------------------------------------------------------------
TTL_CATEGORIES = 600       # 10 min — rarely changes
TTL_PRODUCT = 300          # 5 min  — single product by id / slug
TTL_PRODUCT_LIST = 120     # 2 min  — filtered/paginated product pages
TTL_SEARCH = 60            # 1 min  — search results (more volatile)
TTL_USER_PROFILE = 180     # 3 min  — cached user profile reads


import time

class InMemoryCache:
    """
    Simple in-memory TTL cache for 'lite' deployments without Redis.
    Limits growth by number of keys to avoid memory leaks.
    """
    def __init__(self, maxsize: int = 1000) -> None:
        self._data: dict[str, tuple[Any, float]] = {}
        self._maxsize = maxsize

    def get(self, key: str) -> Any | None:
        if key not in self._data:
            return None
        val, expiry = self._data[key]
        if time.time() > expiry:
            del self._data[key]
            return None
        return val

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        # Basic eviction if full
        if len(self._data) >= self._maxsize:
            # Delete first key found (not perfect LRU but fast)
            first_key = next(iter(self._data))
            del self._data[first_key]
        
        self._data[key] = (value, time.time() + ttl)

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def delete_pattern(self, pattern: str) -> None:
        import fnmatch
        keys_to_del = [k for k in self._data.keys() if fnmatch.fnmatch(k, pattern)]
        for k in keys_to_del:
            del self._data[k]

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        self._data.clear()


class RedisCache:
    """Async-compatible Redis cache backed by redis-py (sync client run in thread pool)."""

    def __init__(self, redis_url: str) -> None:
        import redis as redis_lib  # local import — optional dependency

        self._client = redis_lib.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
        )
        logger.info("Redis cache connected: %s", redis_url.split("@")[-1])

    # ------------------------------------------------------------------
    # Public API (all sync under the hood; FastAPI sync routes use these
    # directly; async routes may call them from a thread via anyio)
    # ------------------------------------------------------------------

    def get(self, key: str) -> Any | None:  # noqa: ANN401
        try:
            raw = self._client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as exc:
            logger.warning("cache.get(%s) failed: %s", key, exc)
            return None

    def set(self, key: str, value: Any, ttl: int = 300) -> None:  # noqa: ANN401
        try:
            self._client.setex(key, ttl, json.dumps(value, default=str))
        except Exception as exc:
            logger.warning("cache.set(%s) failed: %s", key, exc)

    def delete(self, key: str) -> None:
        try:
            self._client.delete(key)
        except Exception as exc:
            logger.warning("cache.delete(%s) failed: %s", key, exc)

    def delete_pattern(self, pattern: str) -> None:
        """Delete all keys matching a glob pattern (uses SCAN to avoid blocking)."""
        try:
            cursor = 0
            while True:
                cursor, keys = self._client.scan(cursor, match=pattern, count=100)
                if keys:
                    self._client.delete(*keys)
                if cursor == 0:
                    break
        except Exception as exc:
            logger.warning("cache.delete_pattern(%s) failed: %s", pattern, exc)

    def ping(self) -> bool:
        try:
            return bool(self._client.ping())
        except Exception:
            return False

    def close(self) -> None:
        try:
            self._client.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Module-level singleton — resolved at import time
# ---------------------------------------------------------------------------

def _build_cache() -> RedisCache | InMemoryCache:
    url = os.getenv("REDIS_URL", "").strip()
    if not url or "localhost" in url:
        # Fallback to in-memory if no Redis URL or just localhost (likely dev)
        # unless user explicitly wants Redis on localhost. 
        # But for this user, they don't want Redis billing.
        logger.info("Using InMemoryCache (LRU-lite)")
        return InMemoryCache()
    try:
        c = RedisCache(url)
        if c.ping():
            return c
        logger.warning("Redis ping failed — falling back to InMemoryCache")
        return InMemoryCache()
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — falling back to InMemoryCache", exc)
        return InMemoryCache()


cache = _build_cache()
