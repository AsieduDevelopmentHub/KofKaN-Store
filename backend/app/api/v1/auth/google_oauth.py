"""Google OAuth 2.0 authorization code flow (sign-in / sign-up)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from sqlmodel import Session

from app.core.security import SECRET_KEY, get_password_hash
from app.core.pg_rls_auth import fetch_user_by_email_exact, fetch_user_by_google_sub, username_exists
from app.db import apply_postgres_session_user
from app.models import User

GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URI = "https://www.googleapis.com/oauth2/v3/userinfo"

STATE_MAX_AGE_SEC = 600

_USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,50}$")


def _b64pad(s: str) -> str:
    return s + "=" * (-len(s) % 4)


def create_google_oauth_state() -> str:
    payload = {"t": int(time.time()), "n": secrets.token_urlsafe(16)}
    raw = json.dumps(payload, separators=(",", ":")).encode()
    b64 = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    sig = hmac.new(SECRET_KEY.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def verify_google_oauth_state(state: str | None) -> None:
    if not state or "." not in state:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    b64, sig = state.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode(), b64.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    try:
        padded = _b64pad(b64)
        data = json.loads(base64.urlsafe_b64decode(padded.encode()))
        ts = int(data.get("t", 0))
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth state")
    if int(time.time()) - ts > STATE_MAX_AGE_SEC:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OAuth state expired")


def get_google_oauth_settings() -> tuple[str, str, str]:
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "").strip().rstrip("/")
    return client_id, client_secret, redirect_uri


def google_oauth_configured() -> bool:
    cid, secret, redir = get_google_oauth_settings()
    return bool(cid and secret and redir)


def build_google_authorize_url(state: str) -> str:
    client_id, _, redirect_uri = get_google_oauth_settings()
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URI}?{urlencode(params)}"


def exchange_code_for_tokens(code: str) -> dict:
    client_id, client_secret, redirect_uri = get_google_oauth_settings()
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(GOOGLE_TOKEN_URI, data=data)
    if r.status_code != 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not complete Google sign-in")
    body = r.json()
    if not isinstance(body, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token response")
    return body


def fetch_google_userinfo(google_access_token: str) -> dict:
    with httpx.Client(timeout=30.0) as client:
        r = client.get(
            GOOGLE_USERINFO_URI,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Could not read Google profile")
    body = r.json()
    if not isinstance(body, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid profile response")
    return body


def _unique_username(session: Session, base: str) -> str:
    raw = re.sub(r"[^a-z0-9._-]", "", base.lower()) or "user"
    stem = raw[:46]
    for _ in range(500):
        suffix = "" if _ == 0 else str(secrets.randbelow(900000) + 100000)
        candidate = (stem + suffix)[:50]
        if _USERNAME_RE.fullmatch(candidate):
            if not username_exists(session, candidate):
                return candidate
    raise HTTPException(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Could not allocate a username for this account",
    )


def find_or_create_user_from_google(session: Session, profile: dict) -> User:
    sub = profile.get("sub")
    if not isinstance(sub, str) or not sub.strip():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Google did not return a stable account id.",
        )
    sub = sub.strip()

    email_raw = profile.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) else ""
    name_raw = profile.get("name")
    if isinstance(name_raw, str) and name_raw.strip():
        name = name_raw.strip()[:120]
    elif email:
        name = email.split("@")[0][:120]
    else:
        name = "Google user"

    verified = bool(profile.get("email_verified"))

    if not email:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Google did not share an email address. Allow email scope to sign in.",
        )
    if not verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Your Google email must be verified to use Google sign-in.",
        )

    user = fetch_user_by_google_sub(session, sub)
    if user:
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "User account is inactive")
        return user

    by_email = fetch_user_by_email_exact(session, email)
    if by_email:
        if by_email.google_sub and by_email.google_sub != sub:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "This email is already linked to a different Google account.",
            )
        by_email.google_sub = sub
        if not by_email.email_verified:
            by_email.email_verified = True
        session.add(by_email)
        session.commit()
        session.refresh(by_email)
        apply_postgres_session_user(session, by_email.id)
        return by_email

    username = _unique_username(session, email.split("@")[0])
    placeholder_pw = secrets.token_urlsafe(48)
    user = User(
        username=username,
        name=name,
        email=email,
        hashed_password=get_password_hash(placeholder_pw),
        google_sub=sub,
        email_verified=True,
        email_is_placeholder=False,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    apply_postgres_session_user(session, user.id)
    return user


def resolve_google_oauth_user(session: Session, code: str | None, state: str | None) -> User:
    """Validate OAuth state, exchange code, resolve or create the Sikapa user (no JWTs yet)."""
    verify_google_oauth_state(state)
    if not code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing authorization code")
    token_payload = exchange_code_for_tokens(code)
    g_access = token_payload.get("access_token")
    if not isinstance(g_access, str) or not g_access:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token response")
    profile = fetch_google_userinfo(g_access)
    return find_or_create_user_from_google(session, profile)
