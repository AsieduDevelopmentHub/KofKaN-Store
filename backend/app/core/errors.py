"""
Standardized HTTP error responses for consistent API error handling.
"""
from typing import Optional, Any
from pydantic import BaseModel
from fastapi import HTTPException, status


class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: str
    message: str
    details: Optional[dict[str, Any]] = None
    field: Optional[str] = None  # For field validation errors


class ErrorResponse(BaseModel):
    """Standardized error response returned to clients."""
    success: bool = False
    error: ErrorDetail
    request_id: Optional[str] = None  # For debugging/support
    timestamp: Optional[str] = None


# ============ Predefined Error Codes ============

# Authentication (4xx)
class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Authentication failed", code: str = "AUTH_001"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorResponse(
                error=ErrorDetail(code=code, message=detail)
            ).model_dump()
        )


class InvalidCredentialsError(AuthenticationError):
    def __init__(self):
        super().__init__(
            detail="Invalid email or password",
            code="AUTH_002"
        )


class TokenExpiredError(AuthenticationError):
    def __init__(self):
        super().__init__(
            detail="Token has expired. Please log in again",
            code="AUTH_003"
        )


class TokenInvalidError(AuthenticationError):
    def __init__(self):
        super().__init__(
            detail="Invalid or malformed token",
            code="AUTH_004"
        )


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Not authorized to access this resource", code: str = "AUTHZ_001"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorResponse(
                error=ErrorDetail(code=code, message=detail)
            ).model_dump()
        )


# Validation (422)
class ValidationError(HTTPException):
    def __init__(
        self, 
        message: str = "Validation failed",
        code: str = "VAL_001",
        field: Optional[str] = None,
        details: Optional[dict] = None
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code=code,
                    message=message,
                    field=field,
                    details=details
                )
            ).model_dump()
        )


class DuplicateError(ValidationError):
    def __init__(self, field: str, value: str):
        super().__init__(
            message=f"{field} '{value}' already exists",
            code="VAL_002",
            field=field
        )


class InvalidInputError(ValidationError):
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(
            message=message,
            code="VAL_003",
            field=field
        )


# Resource (4xx)
class ResourceNotFoundError(HTTPException):
    def __init__(self, resource: str, identifier: Any = None):
        detail = f"{resource} not found"
        if identifier:
            detail += f": {identifier}"
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="RES_001",
                    message=detail
                )
            ).model_dump()
        )


class ConflictError(HTTPException):
    def __init__(self, detail: str = "Resource conflict", code: str = "RES_002"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorResponse(
                error=ErrorDetail(code=code, message=detail)
            ).model_dump()
        )


# Server errors (5xx)
class InternalServerError(HTTPException):
    def __init__(self, detail: str = "Internal server error", code: str = "SRV_001"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error=ErrorDetail(code=code, message=detail)
            ).model_dump()
        )


class DatabaseError(InternalServerError):
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(
            detail=detail,
            code="DB_001"
        )


# Rate limiting
class RateLimitError(HTTPException):
    def __init__(self, retry_after: Optional[int] = None):
        detail = "Too many requests. Please try again later"
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=ErrorResponse(
                error=ErrorDetail(
                    code="LIMIT_001",
                    message=detail,
                    details={"retry_after_seconds": retry_after} if retry_after else None
                )
            ).model_dump(),
            headers={"Retry-After": str(retry_after)} if retry_after else None
        )


# ============ Helper Functions ============

def create_error_response(
    code: str,
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    field: Optional[str] = None,
    details: Optional[dict] = None,
) -> HTTPException:
    """Factory function for creating custom HTTPExceptions."""
    return HTTPException(
        status_code=status_code,
        detail=ErrorResponse(
            error=ErrorDetail(
                code=code,
                message=message,
                field=field,
                details=details
            )
        ).model_dump()
    )
