from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db import get_session
from app.models import TokenResponse, User, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer = HTTPBearer(auto_error=False)


def _as_user_read(user: User) -> UserRead:
    return UserRead(id=user.id or 0, email=user.email, full_name=user.full_name, is_admin=user.is_admin)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    subject = decode_access_token(credentials.credentials)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = session.get(User, int(subject))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_as_user_read(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email.lower())).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_as_user_read(user))


@router.get("/profile", response_model=UserRead)
def profile(current_user: User = Depends(get_current_user)):
    return _as_user_read(current_user)


@router.get("/google/url")
def google_oauth_url():
    # Frontend can still use Supabase OAuth directly; this route keeps parity in API surface.
    return {"provider": "google", "url": f"{settings.frontend_base_url}/auth/google/callback"}


@router.get("/google/callback", response_model=TokenResponse)
def google_callback(
    email: str = Query(...),
    name: str = Query(default="Google User"),
    sub: str = Query(...),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.google_sub == sub)).first()
    if not user:
        user = session.exec(select(User).where(User.email == email.lower())).first()
        if user:
            user.google_sub = sub
        else:
            user = User(
                email=email.lower(),
                full_name=name,
                password_hash=hash_password(sub),
                google_sub=sub,
            )
            session.add(user)
        session.commit()
        session.refresh(user)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_as_user_read(user))
