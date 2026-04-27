"""
Structured logging configuration for production environments.
"""
import logging
import json
import sys
from datetime import datetime, timezone
from typing import Any, Optional
from pythonjsonlogger import jsonlogger


def setup_structured_logging(
    level: str = "INFO",
    log_json: bool = True,
    log_file: Optional[str] = None,
) -> logging.Logger:
    """
    Configure structured logging with JSON output for production.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_json: Whether to use JSON formatting (recommended for production)
        log_file: Optional file path to write logs to
    
    Returns:
        Configured root logger
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level))
    
    # Clear existing handlers
    root_logger.handlers = []
    
    # Create formatter
    if log_json:
        formatter = jsonlogger.JsonFormatter(
            fmt='%(timestamp)s %(level)s %(name)s %(message)s %(exc_info)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            root_logger.error(f"Failed to setup file logging to {log_file}: {e}")
    
    return root_logger


class StructuredLogger:
    """Wrapper for structured logging with context."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.context = {}
    
    def set_context(self, **kwargs) -> None:
        """Set contextual information (e.g., request_id, user_id)."""
        self.context.update(kwargs)
    
    def clear_context(self) -> None:
        """Clear all context."""
        self.context = {}
    
    def _log(
        self,
        level: str,
        message: str,
        exc_info: Optional[BaseException] = None,
        **kwargs
    ) -> None:
        """Internal logging method."""
        extra = {
            **self.context,
            **kwargs,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
        
        log_func = getattr(self.logger, level.lower())
        
        if exc_info:
            log_func(message, exc_info=exc_info, extra=extra)
        else:
            log_func(message, extra=extra)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self._log("debug", message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self._log("info", message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self._log("warning", message, **kwargs)
    
    def error(self, message: str, exc_info: Optional[BaseException] = None, **kwargs) -> None:
        """Log error message."""
        self._log("error", message, exc_info=exc_info, **kwargs)
    
    def critical(self, message: str, exc_info: Optional[BaseException] = None, **kwargs) -> None:
        """Log critical message."""
        self._log("critical", message, exc_info=exc_info, **kwargs)


# Common logging utilities

def log_auth_attempt(
    logger: StructuredLogger,
    email: str,
    success: bool,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
) -> None:
    """Log authentication attempt."""
    logger.info(
        f"Authentication {'successful' if success else 'failed'}",
        email=email,
        ip_address=ip_address,
        reason=reason,
        action="auth_attempt"
    )


def log_sensitive_action(
    logger: StructuredLogger,
    user_id: int,
    action: str,
    resource: str,
    changes: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Log sensitive administrative or security actions."""
    logger.warning(
        f"Sensitive action: {action}",
        user_id=user_id,
        action=action,
        resource=resource,
        changes=changes,
        ip_address=ip_address,
    )


def log_database_error(
    logger: StructuredLogger,
    operation: str,
    table: str,
    exc: BaseException,
) -> None:
    """Log database errors."""
    logger.error(
        f"Database error during {operation}",
        operation=operation,
        table=table,
        exc_info=exc,
        error_type=type(exc).__name__,
    )
