"""
Pytest configuration and shared fixtures for E2E tests
"""
import asyncio
import os
from typing import Generator

# Test environment must be set before importing the FastAPI app.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
os.environ["JWT_REFRESH_SECRET_KEY"] = "test-jwt-refresh-secret-key"
os.environ["RESEND_API_KEY"] = "test-resend-api-key"
os.environ["EMAIL_FROM"] = "test@example.com"
os.environ["FRONTEND_URL"] = "http://localhost:3000"
os.environ["EMAIL_ENABLED"] = "false"
os.environ["HTTPS_ENABLED"] = "false"
os.environ["DEBUG"] = "false"
os.environ["TESTING"] = "true"

import pytest
from httpx import AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel, Session

from app.db import get_session
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    # Use shared in-memory SQLite for tests
    test_database_url = "sqlite:///:memory:"

    engine = create_engine(
        test_database_url,
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create all tables
    SQLModel.metadata.create_all(engine)

    yield engine

    # Cleanup
    engine.dispose()


@pytest.fixture(scope="function")
def test_session(test_engine) -> Generator[Session, None, None]:
    """Create test database session."""
    SessionLocal = sessionmaker(
        bind=test_engine,
        class_=Session,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    with SessionLocal() as session:
        # Clear all tables before each test
        for table in reversed(SQLModel.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()

        yield session

        # Rollback any uncommitted changes
        session.rollback()


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Clear SlowAPI counters between tests so limits do not leak across tests."""
    from app.core.rate_limit import limiter

    try:
        limiter.reset()
    except Exception:
        pass
    yield
    try:
        limiter.reset()
    except Exception:
        pass


@pytest.fixture(scope="function")
async def client(test_session) -> Generator[AsyncClient, None, None]:
    """Create test client with database session override."""

    def override_get_session() -> Generator[Session, None, None]:
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client

    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="session", autouse=True)
def set_test_env():
    """Set test environment variables."""
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["JWT_REFRESH_SECRET_KEY"] = "test-jwt-refresh-secret-key"
    os.environ["RESEND_API_KEY"] = "test-resend-api-key"  # For testing email service
    os.environ["EMAIL_FROM"] = "test@example.com"
    os.environ["FRONTEND_URL"] = "http://localhost:3000"
    os.environ["HTTPS_ENABLED"] = "false"  # Disable HTTPS for tests
    os.environ["DEBUG"] = "false"
    os.environ["TESTING"] = "true"


@pytest.fixture(scope="function")
async def test_user(client: AsyncClient, test_session: Session):
    """Create a test user and return user data with tokens."""
    from app.models import User

    # Register user
    register_data = {
        "username": "testuser",
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "TestPass123!",
    }

    response = await client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 201
    user_data = response.json()

    # Get OTP and verify email
    from app.models import OTPCode
    from sqlalchemy import select

    otp_query = select(OTPCode).where(OTPCode.user_id == user_data["id"])
    result = test_session.execute(otp_query)
    otp_record = result.scalar_one()

    verify_data = {
        "email": "testuser@example.com",
        "code": otp_record.code
    }

    response = await client.post("/api/v1/auth/verify-email", json=verify_data)
    assert response.status_code == 200

    # Login to get tokens
    login_data = {
        "identifier": "testuser",
        "password": "TestPass123!"
    }

    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    tokens = response.json()

    return {
        "user": user_data,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"]
    }


@pytest.fixture(scope="function")
async def authenticated_client(client: AsyncClient, test_user):
    """Create authenticated test client."""
    client.headers.update({"Authorization": f"Bearer {test_user['access_token']}"})
    return client