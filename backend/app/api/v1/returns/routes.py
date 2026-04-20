from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.v1.auth.dependencies import get_current_active_user
from app.db import get_session
from app.models import User
from app.api.v1.returns.schemas import ReturnCreateRequest, ReturnReadResponse
from app.api.v1.returns.services import create_order_return, list_user_returns

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.get("")
def list_my_returns(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    rows = list_user_returns(session=session, user=current_user)
    return [
        ReturnReadResponse(
            id=item.id or 0,
            order_id=item.order_id,
            user_id=item.user_id,
            reason=item.reason,
            status=item.status,
            created_at=item.created_at,
        )
        for item in rows
    ]


@router.post("")
def create_return(
    payload: ReturnCreateRequest, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)
) -> ReturnReadResponse:
    item = create_order_return(session=session, user=current_user, order_id=payload.order_id, reason=payload.reason)
    return ReturnReadResponse(
        id=item.id or 0,
        order_id=item.order_id,
        user_id=item.user_id,
        reason=item.reason,
        status=item.status,
        created_at=item.created_at,
    )
