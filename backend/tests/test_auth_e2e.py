"""
End-to-End tests for Sikapa Authentication System
"""
import pytest
from httpx import AsyncClient
from sqlmodel import select, Session

from app.models import User, OTPCode, PasswordReset


@pytest.mark.asyncio
class TestAuthenticationE2E:
    """End-to-end tests for the complete authentication flow."""

    async def test_complete_user_registration_flow(self, client: AsyncClient, test_session: Session):
        """Test complete user registration flow: register -> verify email -> login."""
        register_data = {
            "username": "testuser001",
            "name": "Test User",
            "email": "test@example.com",
            "password": "SecurePass123!",
        }

        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 201
        user_data = response.json()
        assert user_data["email"] == "test@example.com"
        assert user_data["email_verified"] is False

        otp_query = select(OTPCode).where(OTPCode.user_id == user_data["id"])
        result = test_session.execute(otp_query)
        otp_record = result.scalar_one()
        otp_code = otp_record.code

        verify_data = {
            "email": "test@example.com",
            "code": otp_code
        }

        response = await client.post("/api/v1/auth/verify-email", json=verify_data)
        assert response.status_code == 200
        verify_response = response.json()
        assert verify_response["verified"] is True

        login_data = {
            "identifier": "testuser001",
            "password": "SecurePass123!"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        tokens = response.json()
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"

    async def test_username_or_email_login(self, client: AsyncClient):
        register_data = {
            "username": "dual-login-user",
            "name": "Dual Login User",
            "email": "dual@example.com",
            "password": "SecurePass123!",
        }
        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 201

        by_username = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "dual-login-user", "password": "SecurePass123!"},
        )
        assert by_username.status_code == 200

        by_email = await client.post(
            "/api/v1/auth/login",
            json={"identifier": "dual@example.com", "password": "SecurePass123!"},
        )
        assert by_email.status_code == 200

    async def test_optional_email_registration(self, client: AsyncClient):
        register_data = {
            "username": "username-only",
            "name": "Username Only",
            "password": "SecurePass123!",
        }
        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 201
        user_data = response.json()
        assert user_data["username"] == "username-only"
        assert user_data.get("email") is None

    async def test_password_reset_flow(self, client: AsyncClient, test_session: Session, test_user):
        """Test password reset flow."""
        reset_request = {"email": test_user["user"]["email"]}

        response = await client.post("/api/v1/auth/password-reset/request", json=reset_request)
        assert response.status_code == 200

        reset_query = select(PasswordReset).join(User).where(User.email == test_user["user"]["email"])
        result = test_session.execute(reset_query)
        reset_record = result.scalar_one()
        reset_token = reset_record.token

        reset_confirm = {
            "token": reset_token,
            "new_password": "NewSecurePass456!"
        }

        response = await client.post("/api/v1/auth/password-reset/confirm", json=reset_confirm)
        assert response.status_code == 200

        login_data = {
            "identifier": test_user["user"]["username"],
            "password": "NewSecurePass456!"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200

    async def test_profile_management(self, authenticated_client: AsyncClient, test_user):
        """Test user profile management."""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}

        response = await authenticated_client.get("/api/v1/auth/profile", headers=headers)
        assert response.status_code == 200
        profile = response.json()
        assert profile["email"] == test_user["user"]["email"]
        assert profile["name"] == "Test User"

        update_data = {
            "name": "Updated Name",
            "username": "updated-name",
            "phone": "+1234567890"
        }

        response = await authenticated_client.put("/api/v1/auth/profile", json=update_data, headers=headers)
        assert response.status_code == 200
        updated_profile = response.json()
        assert updated_profile["name"] == "Updated Name"
        assert updated_profile["username"] == "updated-name"
        assert updated_profile["phone"] == "+1234567890"

    async def test_two_factor_authentication_flow(self, authenticated_client: AsyncClient, test_user):
        """Test 2FA setup and usage."""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}

        response = await authenticated_client.post("/api/v1/auth/2fa/setup", headers=headers)
        assert response.status_code == 200
        setup_data = response.json()
        assert "secret" in setup_data
        assert "qr_code" in setup_data
        assert "backup_codes" in setup_data
        assert len(setup_data["backup_codes"]) == 10

        secret = setup_data["secret"]
        backup_codes = setup_data["backup_codes"]

        import pyotp
        totp = pyotp.TOTP(secret)

        enable_data = {
            "secret": secret,
            "backup_codes": backup_codes,
            "verification_code": totp.now()
        }

        response = await authenticated_client.post("/api/v1/auth/2fa/enable", json=enable_data, headers=headers)
        assert response.status_code == 200

        response = await authenticated_client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200

        login_data = {
            "identifier": test_user["user"]["username"],
            "password": "TestPass123!",
            "code": totp.now()
        }

        response = await authenticated_client.post("/api/v1/auth/login-2fa", json=login_data)
        assert response.status_code == 200
        new_tokens = response.json()
        assert "access_token" in new_tokens

    async def test_token_refresh(self, client: AsyncClient, test_user):
        """Test token refresh functionality."""
        refresh_data = {"refresh_token": test_user["refresh_token"]}

        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        assert response.status_code == 200
        new_tokens = response.json()
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens and new_tokens["refresh_token"]
        assert new_tokens["token_type"] == "bearer"

    async def test_password_change(self, client: AsyncClient, test_user):
        """Test password change functionality."""
        headers = {"Authorization": f"Bearer {test_user['access_token']}"}

        change_data = {
            "current_password": "TestPass123!",
            "new_password": "FinalSecurePass789!"
        }

        response = await client.post("/api/v1/auth/password/change", json=change_data, headers=headers)
        assert response.status_code == 200

        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 200

        login_data = {
            "identifier": test_user["user"]["username"],
            "password": "FinalSecurePass789!"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200

    async def test_account_deletion(self, client: AsyncClient, test_session: Session, test_user):
        """Test account deletion."""
        login_data = {
            "identifier": test_user["user"]["username"],
            "password": "TestPass123!"
        }

        response = await client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        tokens = response.json()
        access_token = tokens["access_token"]

        headers = {"Authorization": f"Bearer {access_token}"}
        delete_data = {"password": "TestPass123!"}

        response = await client.post("/api/v1/auth/account/delete", json=delete_data, headers=headers)
        assert response.status_code == 200

        user_query = select(User).where(User.email == test_user["user"]["email"])
        result = test_session.execute(user_query)
        user = result.scalar_one()
        assert user.is_active is False

    async def test_rate_limiting(self, client: AsyncClient):
        """Test rate limiting on auth endpoints."""
        login_data = {
            "identifier": "nonexistent",
            "password": "wrongpassword"
        }

        statuses = []
        for _ in range(15):
            response = await client.post("/api/v1/auth/login", json=login_data)
            statuses.append(response.status_code)

        assert 429 in statuses
        assert all(status in (401, 429) for status in statuses)

    async def test_security_headers(self, client: AsyncClient):
        """Test security headers are present."""
        response = await client.get("/health")

        if "HTTPS_ENABLED=true" in str(response.headers):
            assert "strict-transport-security" in response.headers
            assert "x-content-type-options" in response.headers

            assert "x-frame-options" in response.headers
            assert "x-xss-protection" in response.headers

    async def test_invalid_token_handling(self, client: AsyncClient):
        """Test handling of invalid tokens."""
        invalid_headers = {"Authorization": "Bearer invalid.jwt.token"}

        response = await client.get("/api/v1/auth/profile", headers=invalid_headers)
        assert response.status_code == 401

        response_data = response.json()
        assert "Invalid token" in response_data["detail"]

    async def test_missing_auth_header(self, client: AsyncClient):
        """Test handling of missing authorization header."""
        response = await client.get("/api/v1/auth/profile")
        assert response.status_code == 401

        response_data = response.json()
        assert "Missing or invalid authorization header" in response_data["detail"]


@pytest.mark.asyncio
class TestErrorHandling:
    """Test error handling and edge cases."""

    async def test_duplicate_email_registration(self, client: AsyncClient):
        """Test registration with duplicate email."""
        # First registration
        register_data = {
            "username": "duplicate-user-1",
            "name": "Test User",
            "email": "duplicate@example.com",
            "password": "SecurePass123!",
        }

        response = await client.post(
            "/api/v1/auth/register",
            json={**register_data, "username": "duplicate-user-2"},
        )
        assert response.status_code == 201

        # Second registration with same email
        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    async def test_duplicate_username_registration(self, client: AsyncClient):
        register_data = {
            "username": "taken-name",
            "name": "User One",
            "email": "first@example.com",
            "password": "SecurePass123!",
        }
        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 201

        second = {
            "username": "taken-name",
            "name": "User Two",
            "email": "second@example.com",
            "password": "SecurePass123!",
        }
        response = await client.post("/api/v1/auth/register", json=second)
        assert response.status_code == 400
        assert "Username already taken" in response.json()["detail"]

    async def test_invalid_otp_verification(self, client: AsyncClient):
        """Test verification with invalid OTP."""
        verify_data = {
            "email": "nonexistent@example.com",
            "code": "000000"
        }

        response = await client.post("/api/v1/auth/verify-email", json=verify_data)
        assert response.status_code == 400
        assert "Invalid or expired OTP code" in response.json()["detail"]

    async def test_weak_password_registration(self, client: AsyncClient):
        """Test registration with weak password."""
        register_data = {
            "username": "weak-user",
            "name": "Test User",
            "email": "weak@example.com",
            "password": "123",  # Too short
        }

        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code == 422  # Validation error

    async def test_invalid_username_format(self, client: AsyncClient):
        """Test registration with invalid username format."""
        register_data = {
            "username": "bad space",
            "name": "Test User",
            "email": "valid@example.com",
            "password": "SecurePass123!",
        }

        response = await client.post("/api/v1/auth/register", json=register_data)
        assert response.status_code in (400, 422)

    async def test_expired_reset_token(self, client: AsyncClient):
        """Test password reset with expired token."""
        reset_data = {
            "token": "expired.reset.token",
            "new_password": "NewSecurePass123!"
        }

        response = await client.post("/api/v1/auth/password-reset/confirm", json=reset_data)
        assert response.status_code == 400
        assert "Invalid or expired reset token" in response.json()["detail"]