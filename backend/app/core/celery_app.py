"""
Celery application instance.

Workers are started separately:
    celery -A app.core.celery_app worker --loglevel=info
    celery -A app.core.celery_app beat   --loglevel=info   # for scheduled tasks

Both the broker and the result backend use Redis.  Set CELERY_BROKER_URL and
CELERY_RESULT_BACKEND in your .env (they default to the same Redis DB as the
cache, but using separate DBs is recommended for clarity).
"""
from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab

_broker = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/1"))
_backend = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/2"))

celery_app = Celery(
    "kofkan",
    broker=_broker,
    backend=_backend,
    include=["app.core.tasks"],  # auto-discover task module
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Do not store successful results (saves Redis memory)
    task_ignore_result=True,
    # Retry connection on startup so workers don't crash on transient Redis blip
    broker_connection_retry_on_startup=True,
    # Beat schedule — periodic / maintenance tasks
    beat_schedule={
        # Prune expired token blacklist entries every hour
        "cleanup-expired-blacklist": {
            "task": "app.core.tasks.cleanup_expired_blacklist_task",
            "schedule": crontab(minute=0),  # every hour on the hour
        },
        # Prune expired + used OTP codes every 6 hours
        "cleanup-expired-otps": {
            "task": "app.core.tasks.cleanup_expired_otps_task",
            "schedule": crontab(minute=0, hour="*/6"),
        },
    },
)
