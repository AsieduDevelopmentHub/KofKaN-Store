"""Admin: search query analytics."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func

from app.api.v1.auth.dependencies import require_admin_permission
from app.db import get_session
from app.models import SearchQueryLog, User

router = APIRouter()


class TopSearchRow(BaseModel):
    query: str
    count: int
    avg_results: float
    last_seen_at: datetime


class ZeroResultRow(BaseModel):
    query: str
    count: int
    last_seen_at: datetime


class SearchSummary(BaseModel):
    total_searches: int
    unique_queries: int
    zero_result_searches: int
    period_days: int


def _since(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=max(days, 1))


@router.get("/summary", response_model=SearchSummary)
async def search_summary(
    days: int = Query(30, ge=1, le=365),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_analytics")),
):
    since = _since(days)
    total = session.exec(
        select(func.count(SearchQueryLog.id)).where(SearchQueryLog.created_at >= since)
    ).one()
    unique = session.exec(
        select(func.count(func.distinct(SearchQueryLog.normalized_query))).where(
            SearchQueryLog.created_at >= since
        )
    ).one()
    zero = session.exec(
        select(func.count(SearchQueryLog.id)).where(
            SearchQueryLog.created_at >= since,
            SearchQueryLog.result_count == 0,
        )
    ).one()
    return SearchSummary(
        total_searches=int(total or 0),
        unique_queries=int(unique or 0),
        zero_result_searches=int(zero or 0),
        period_days=days,
    )


@router.get("/top", response_model=List[TopSearchRow])
async def top_searches(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_analytics")),
):
    since = _since(days)
    stmt = (
        select(
            SearchQueryLog.normalized_query,
            func.count(SearchQueryLog.id),
            func.avg(SearchQueryLog.result_count),
            func.max(SearchQueryLog.created_at),
        )
        .where(SearchQueryLog.created_at >= since)
        .group_by(SearchQueryLog.normalized_query)
        .order_by(func.count(SearchQueryLog.id).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return [
        TopSearchRow(
            query=q or "",
            count=int(cnt or 0),
            avg_results=float(avg or 0.0),
            last_seen_at=seen_at,
        )
        for (q, cnt, avg, seen_at) in rows
    ]


@router.get("/zero-results", response_model=List[ZeroResultRow])
async def zero_result_searches(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin_permission("view_analytics")),
):
    since = _since(days)
    stmt = (
        select(
            SearchQueryLog.normalized_query,
            func.count(SearchQueryLog.id),
            func.max(SearchQueryLog.created_at),
        )
        .where(
            SearchQueryLog.created_at >= since,
            SearchQueryLog.result_count == 0,
        )
        .group_by(SearchQueryLog.normalized_query)
        .order_by(func.count(SearchQueryLog.id).desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return [
        ZeroResultRow(
            query=q or "",
            count=int(cnt or 0),
            last_seen_at=seen_at,
        )
        for (q, cnt, seen_at) in rows
    ]
