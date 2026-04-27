#!/usr/bin/env python3
"""
DESTRUCTIVE: Delete all application data from PostgreSQL (Supabase) and empty configured
Storage bucket(s). Schema, RLS policies, and SQL functions are preserved.

Requires:
  - DATABASE_URL=postgresql://...
  - SUPABASE_WIPE_CONFIRM=DELETE_ALL_DATA (or pass --i-am-sure)
  - SUPABASE_URL + SUPABASE_SERVICE_KEY to empty buckets (optional; skip if unset)

Usage:
  cd backend
  set SUPABASE_WIPE_CONFIRM=DELETE_ALL_DATA
  python tools/supabase_wipe_data.py
  python tools/supabase_wipe_data.py --i-am-sure --skip-storage
"""

from __future__ import annotations

import argparse
import os
import sys

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
WIPE_ENV = "SUPABASE_WIPE_CONFIRM"
EXPECTED_CONFIRM = "DELETE_ALL_DATA"


# All public application tables (SQLModel / Alembic). Order handled by TRUNCATE CASCADE.
_TRUNCATE_TABLES_SQL = """
TRUNCATE TABLE
  reviewmedia,
  review,
  productimage,
  productvariant,
  cartitem,
  wishlistitem,
  orderitem,
  invoice,
  paystack_transaction,
  paystack_init_idempotency,
  orderreturnitem,
  orderreturn,
  couponusage,
  coupon,
  inventoryadjustment,
  searchquerylog,
  emailsubscription,
  "order",
  adminauditlog,
  businesssetting,
  tokenblacklist,
  otpcode,
  twofactorsecret,
  passwordreset,
  product,
  category,
  "user"
RESTART IDENTITY CASCADE;
"""


def _require_confirm(cli_sure: bool) -> None:
    if cli_sure:
        return
    if os.getenv(WIPE_ENV, "").strip() == EXPECTED_CONFIRM:
        return
    print(
        f"Refusing to wipe: set {WIPE_ENV}={EXPECTED_CONFIRM} "
        f"or pass --i-am-sure",
        file=sys.stderr,
    )
    sys.exit(1)


def _truncate_postgres() -> None:
    if not DATABASE_URL.startswith("postgresql"):
        print("DATABASE_URL is not PostgreSQL; nothing to truncate.", file=sys.stderr)
        sys.exit(1)

    engine = create_engine(DATABASE_URL, echo=False)
    with engine.begin() as conn:
        conn.execute(text(_TRUNCATE_TABLES_SQL))
    print("PostgreSQL: all application tables truncated (schema preserved).")


def _empty_storage_buckets() -> None:
    from app.core.supabase import (  # noqa: WPS433 — runtime import after env
        SUPABASE_STORAGE_BUCKET,
        get_supabase_client,
    )

    client = get_supabase_client()
    if not client:
        print("Supabase client not configured; skipping storage wipe.")
        return

    buckets = [SUPABASE_STORAGE_BUCKET]
    extra = os.getenv("SUPABASE_STORAGE_BUCKET_NAMES", "").strip()
    if extra:
        buckets.extend(x.strip() for x in extra.split(",") if x.strip())
    buckets = list(dict.fromkeys(buckets))

    def delete_prefix(bucket: str, prefix: str) -> None:
        items = client.storage.from_(bucket).list(prefix)
        if not items:
            return
        paths: list[str] = []
        for it in items:
            name = it.get("name")
            if not name:
                continue
            full = f"{prefix}/{name}" if prefix else name
            if it.get("id") is None and not it.get("metadata"):
                delete_prefix(bucket, full)
            else:
                paths.append(full)
        if paths:
            client.storage.from_(bucket).remove(paths)

    for b in buckets:
        try:
            delete_prefix(b, "")
            print(f"Storage: emptied bucket {b!r} (best-effort recursive).")
        except Exception as exc:
            print(f"Storage: failed to empty {b!r}: {exc}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Wipe Sikapa data from Postgres + Supabase Storage.")
    parser.add_argument(
        "--i-am-sure",
        action="store_true",
        help=f"Skip {WIPE_ENV} check (still requires PostgreSQL DATABASE_URL).",
    )
    parser.add_argument(
        "--skip-storage",
        action="store_true",
        help="Only truncate Postgres; do not touch Supabase Storage.",
    )
    args = parser.parse_args()

    _require_confirm(args.i_am_sure)
    _truncate_postgres()
    if not args.skip_storage:
        _empty_storage_buckets()


if __name__ == "__main__":
    main()
