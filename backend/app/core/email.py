"""
Email service integration using Resend API.
"""
import os
from typing import Optional
from resend import Resend
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        if not self.api_key:
            print("⚠️  WARNING: RESEND_API_KEY not set. Email functionality will be disabled.")
            self.client = None
        else:
            self.client = Resend(api_key=self.api_key)

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str = "KofKaN Technologies <no-reply@kofkan.auralenx.com>"
    ) -> bool:
        """
        Send email using Resend API.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            from_email: Sender email (default: KofKaN Store <no-reply@kofkan.auralenx.com>)

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.client:
            print(f"📧 [DEBUG] Email would be sent to {to_email}: {subject}")
            print(f"📧 [DEBUG] Content: {html_content[:100]}...")
            return True  # Simulate success for development

        try:
            response = self.client.emails.send({
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_content,
            })
            print(f"📧 Email sent successfully to {to_email}: {response['id']}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: {e}")
            return False

    def send_verification_email(self, email: str, otp_code: str) -> bool:
        """Send email verification OTP."""
        subject = "Verify Your KofKaN Account"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to KofKaN!</h2>
            <p>Please verify your email address to complete your registration.</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <h3 style="color: #007bff; margin: 0;">Your Verification Code</h3>
                <div style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px; margin: 10px 0;">
                    {otp_code}
                </div>
                <p style="color: #666; margin: 10px 0;">This code expires in 24 hours</p>
            </div>

            <p>If you didn't create an account, please ignore this email.</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                KofKaN Store - Secure E-commerce Platform
            </p>
        </div>
        """
        return self.send_email(email, subject, html_content)

    def send_password_reset_email(self, email: str, reset_link: str) -> bool:
        """Send password reset email with secure link."""
        subject = "Reset Your KofKaN Password"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>We received a request to reset your password for your KofKaN account.</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <a href="{reset_link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
                <p style="color: #666; margin: 10px 0; font-size: 14px;">
                    This link expires in 1 hour for security reasons.
                </p>
            </div>

            <p style="color: #dc3545; font-weight: bold;">
                If you didn't request this password reset, please ignore this email.
            </p>

            <p>For security reasons, this link can only be used once and will expire in 1 hour.</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                KofKaN Store - Secure E-commerce Platform
            </p>
        </div>
        """
        return self.send_email(email, subject, html_content)

    def send_welcome_email(self, email: str, first_name: str = None) -> bool:
        """Send welcome email after successful registration."""
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        subject = "Welcome to KofKaN!"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to KofKaN! 🎉</h2>
            <p>{greeting}</p>
            <p>Thank you for joining KofKaN Store - your secure e-commerce platform.</p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #28a745; margin-top: 0;">What's Next?</h3>
                <ul style="color: #666;">
                    <li>Complete your profile</li>
                    <li>Explore our product catalog</li>
                    <li>Set up two-factor authentication for enhanced security</li>
                    <li>Start shopping with confidence</li>
                </ul>
            </div>

            <p>Your account is now fully activated and ready to use!</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                KofKaN Store - Secure E-commerce Platform<br>
                Need help? Contact our support team.
            </p>
        </div>
        """
        return self.send_email(email, subject, html_content)

    def send_2fa_enabled_email(self, email: str, first_name: str = None) -> bool:
        """Send notification when 2FA is enabled."""
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        subject = "Two-Factor Authentication Enabled"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">🔐 Security Enhanced</h2>
            <p>{greeting}</p>
            <p>Two-factor authentication has been successfully enabled on your KofKaN account.</p>

            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #155724; margin: 0; font-weight: bold;">
                    ✅ Your account is now protected with 2FA
                </p>
            </div>

            <p><strong>What this means:</strong></p>
            <ul style="color: #666;">
                <li>Login requires both password and authenticator code</li>
                <li>You have 10 backup codes saved securely</li>
                <li>Enhanced protection against unauthorized access</li>
            </ul>

            <p style="color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 3px;">
                <strong>Important:</strong> Keep your backup codes in a safe place. You'll need them if you lose access to your authenticator app.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                KofKaN Store - Secure E-commerce Platform
            </p>
        </div>
        """
        return self.send_email(email, subject, html_content)

    def send_account_deleted_email(self, email: str, first_name: str = None) -> bool:
        """Send confirmation when account is deleted."""
        greeting = f"Hello {first_name}," if first_name else "Hello,"
        subject = "Account Deletion Confirmation"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Account Deletion Confirmed</h2>
            <p>{greeting}</p>
            <p>This email confirms that your KofKaN account has been successfully deleted.</p>

            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #721c24; margin: 0; font-weight: bold;">
                    Your account and all associated data have been removed.
                </p>
            </div>

            <p>If you change your mind, you can always create a new account.</p>

            <p>Thank you for using KofKaN Store.</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                KofKaN Store - Secure E-commerce Platform
            </p>
        </div>
        """
        return self.send_email(email, subject, html_content)


# Global email service instance
email_service = EmailService()