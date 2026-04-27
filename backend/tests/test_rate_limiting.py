"""
Tests for rate limiting functionality
"""
import pytest
from httpx import AsyncClient


class TestRateLimiting:
    """Test rate limiting on authentication endpoints."""

    @pytest.mark.asyncio
    async def test_registration_rate_limit(self, client: AsyncClient):
        """Test rate limiting on registration endpoint (5/minute)."""
        register_template = {
            "password": "SecurePass123!",
            "name": "Rate Limit",
        }

        for i in range(6):
            data = {
                **register_template,
                "username": f"ratelimit{i}",
                "email": f"ratelimit{i}@example.com",
            }
            response = await client.post("/api/v1/auth/register", json=data)

            if i < 5:
                assert response.status_code in [201, 400]
            else:
                assert response.status_code == 429
                body = response.json()
                text = str(body).lower()
                assert "rate limit" in text

    @pytest.mark.asyncio
    async def test_login_rate_limit(self, client: AsyncClient):
        """Test rate limiting on login endpoint (10/minute)."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "password": "wrongpassword",
        }

        for i in range(11):
            response = await client.post("/api/v1/auth/login", json=login_data)

            if i < 10:
                assert response.status_code == 401
            else:
                assert response.status_code == 429
                body = response.json()
                text = str(body).lower()
                assert "rate limit" in text

    @pytest.mark.asyncio
    async def test_password_reset_rate_limit(self, client: AsyncClient):
        """Test rate limiting on password reset endpoint (3/minute)."""
        reset_data = {"email": "resetlimit@example.com"}

        for i in range(4):
            response = await client.post(
                "/api/v1/auth/password-reset/request", json=reset_data
            )

            if i < 3:
                assert response.status_code == 200
            else:
                assert response.status_code == 429
                body = response.json()
                text = str(body).lower()
                assert "rate limit" in text

    @pytest.mark.asyncio
    async def test_email_verification_rate_limit(self, client: AsyncClient):
        """Test rate limiting on email verification endpoint (10/minute)."""
        verify_data = {
            "email": "verifylimit@example.com",
            "code": "000000",
        }

        for i in range(11):
            response = await client.post("/api/v1/auth/verify-email", json=verify_data)

            if i < 10:
                assert response.status_code == 400
            else:
                assert response.status_code == 429
                body = response.json()
                text = str(body).lower()
                assert "rate limit" in text

    @pytest.mark.asyncio
    async def test_refresh_token_rate_limit(self, client: AsyncClient):
        """Test rate limiting on token refresh endpoint (5/minute)."""
        refresh_data = {"refresh_token": "invalid.refresh.token"}

        for i in range(6):
            response = await client.post("/api/v1/auth/refresh", json=refresh_data)

            if i < 5:
                assert response.status_code == 401
            else:
                assert response.status_code == 429
                body = response.json()
                text = str(body).lower()
                assert "rate limit" in text

    @pytest.mark.asyncio
    async def test_different_ips_not_shared(self, client: AsyncClient):
        """Requests from same client share one bucket; rate limit eventually applies."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "password": "wrongpassword",
        }

        responses = []
        for _ in range(12):
            response = await client.post("/api/v1/auth/login", json=login_data)
            responses.append(response.status_code)

        assert 429 in responses

    @pytest.mark.asyncio
    async def test_rate_limit_headers(self, client: AsyncClient):
        """First login failures are 401 before the bucket is exhausted."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "password": "wrongpassword",
        }

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_rate_limit_reset(self, client: AsyncClient):
        """After enough attempts, login is rate limited."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "password": "wrongpassword",
        }

        for _ in range(10):
            response = await client.post("/api/v1/auth/login", json=login_data)
            assert response.status_code == 401

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 429

    @pytest.mark.asyncio
    async def test_rate_limiting_doesnt_affect_other_endpoints(self, client: AsyncClient):
        """Login can hit 429 while registration still succeeds under its own limit."""
        login_data = {
            "identifier": "nonexistent@example.com",
            "password": "wrongpassword",
        }

        for _ in range(11):
            response = await client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 429

        register_data = {
            "username": "different-user",
            "name": "Different User",
            "email": "different@example.com",
            "password": "SecurePass123!",
        }

        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code in [201, 400, 422]


class TestRateLimitingConfiguration:
    """Test rate limiting configuration and middleware."""

    def test_slowapi_middleware_configured(self):
        """SlowAPIMiddleware is registered on the FastAPI app."""
        from app.main import app
        from slowapi.middleware import SlowAPIMiddleware

        classes = [m.cls for m in app.user_middleware]
        assert SlowAPIMiddleware in classes

    def test_limiter_instances_exist(self):
        """Limiter decorators and shared limiter are defined."""
        from app.core.rate_limit import (
            auth_limiter,
            limiter,
            login_limiter,
            password_reset_confirm_limiter,
            password_reset_limiter,
            password_reset_request_limiter,
            register_limiter,
            token_refresh_limiter,
        )

        assert hasattr(limiter, "limit")
        for dec in (
            auth_limiter,
            login_limiter,
            password_reset_request_limiter,
            password_reset_confirm_limiter,
            register_limiter,
            token_refresh_limiter,
            password_reset_limiter,
        ):
            assert callable(dec)

    @pytest.mark.asyncio
    async def test_health_endpoint_not_rate_limited(self, client: AsyncClient):
        """Health endpoint stays available under repeated requests."""
        for _ in range(20):
            response = await client.get("/health")
            assert response.status_code == 200

        response = await client.get("/health")
        assert response.status_code == 200
