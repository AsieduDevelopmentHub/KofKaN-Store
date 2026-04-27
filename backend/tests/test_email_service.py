"""
Tests for email service integration
"""
import pytest
from unittest.mock import patch

from app.core.email_service import EmailService


class TestEmailService:
    """Test email service functionality."""

    @pytest.fixture
    def email_service(self):
        """Email service fixture."""
        return EmailService

    def test_email_service_initialization(self):
        """Test email service can be imported and used."""
        # EmailService is a class with static methods, no initialization needed
        assert EmailService is not None

    def test_send_welcome_email_debug_mode(self, email_service):
        """Test sending welcome email in debug mode."""
        with patch('builtins.print') as mock_print:
            result = email_service.send_welcome_email(
                email="test@example.com",
                first_name="Test"
            )

            # Should return True in debug mode (simulated success)
            assert result is True

            assert mock_print.call_count >= 1
            combined = " ".join(
                str(c.args[0]) for c in mock_print.call_args_list if c.args
            )
            assert "[DEBUG] Would send email to test@example.com" in combined
            assert "Welcome" in combined

    def test_send_email_verification_debug_mode(self, email_service):
        """Test sending email verification in debug mode."""
        with patch('builtins.print') as mock_print:
            result = email_service.send_email_verification(
                email="test@example.com",
                otp_code="123456",
                first_name="Test"
            )

            # Should return True in debug mode (simulated success)
            assert result is True

            assert mock_print.call_count >= 1
            combined = " ".join(
                str(c.args[0]) for c in mock_print.call_args_list if c.args
            )
            assert "[DEBUG] Would send email to test@example.com" in combined
            assert "Verify your email" in combined

    def test_send_password_reset_debug_mode(self, email_service):
        """Test sending password reset email in debug mode."""
        with patch('builtins.print') as mock_print:
            result = email_service.send_password_reset(
                email="test@example.com",
                reset_token="reset-token-123",
                first_name="Test"
            )

            # Should return True in debug mode (simulated success)
            assert result is True

            assert mock_print.call_count >= 1
            combined = " ".join(
                str(c.args[0]) for c in mock_print.call_args_list if c.args
            )
            assert "[DEBUG] Would send email to test@example.com" in combined

    def test_send_2fa_enabled_debug_mode(self, email_service):
        """Test sending 2FA enabled email in debug mode."""
        with patch('builtins.print') as mock_print:
            result = email_service.send_2fa_enabled(
                email="test@example.com",
                first_name="Test"
            )

            # Should return True in debug mode (simulated success)
            assert result is True

            assert mock_print.call_count >= 1
            combined = " ".join(
                str(c.args[0]) for c in mock_print.call_args_list if c.args
            )
            assert "[DEBUG] Would send email to test@example.com" in combined

    def test_send_account_deletion_debug_mode(self, email_service):
        """Test sending account deletion email in debug mode."""
        with patch('builtins.print') as mock_print:
            result = email_service.send_account_deletion(
                email="test@example.com",
                first_name="Test"
            )

            # Should return True in debug mode (simulated success)
            assert result is True

            assert mock_print.call_count >= 1
            combined = " ".join(
                str(c.args[0]) for c in mock_print.call_args_list if c.args
            )
            assert "[DEBUG] Would send email to test@example.com" in combined