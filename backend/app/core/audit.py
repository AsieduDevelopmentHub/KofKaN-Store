"""
Audit logging utilities for tracking changes and admin actions.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Optional
from sqlmodel import Session

logger = logging.getLogger(__name__)


class AuditLogger:
    """Utility for logging audit trails to database."""
    
    @staticmethod
    def log_user_action(
        session: Session,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: Optional[int] = None,
        changes: Optional[dict] = None,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log an action to audit trail.
        
        Args:
            session: Database session
            user_id: ID of user performing action
            action: Action performed (e.g., "create", "update", "delete")
            resource_type: Type of resource (e.g., "product", "user", "order")
            resource_id: ID of affected resource
            changes: Dict of field changes {field: {old: value, new: value}}
            status: "success" or "failed"
            error_message: Error message if status is "failed"
        """
        try:
            from app.models import AuditLog
            
            audit_entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                changes=changes,
                status=status,
                error_message=error_message,
            )
            session.add(audit_entry)
            session.commit()
            
            logger.debug(
                f"Audit log: user {user_id} {action} {resource_type}:{resource_id}"
            )
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")
            # Don't raise - audit logging failure shouldn't break the app


    @staticmethod
    def log_auth_event(
        session: Session,
        user_id: Optional[int],
        event_type: str,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log authentication event.
        
        Args:
            session: Database session
            user_id: ID of user (None for failed login)
            event_type: "login", "logout", "password_reset", "2fa_setup", etc.
            success: Whether event succeeded
            ip_address: Client IP address
            user_agent: Client user agent
            error_message: Error message if failed
        """
        try:
            from app.models import AuditLog
            
            audit_entry = AuditLog(
                user_id=user_id,
                action=event_type,
                resource_type="auth",
                status="success" if success else "failed",
                error_message=error_message,
                changes={
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                } if ip_address or user_agent else None,
            )
            session.add(audit_entry)
            session.commit()
            
            logger.info(
                f"Auth event: {event_type} for user {user_id} - {'SUCCESS' if success else 'FAILED'}"
            )
        except Exception as e:
            logger.error(f"Failed to log auth event: {e}")
