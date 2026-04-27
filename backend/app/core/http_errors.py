from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


def _field_label(loc: tuple[Any, ...]) -> str:
    if not loc:
        return "This field"
    tail = loc[-1]
    if isinstance(tail, int):
        return "An item in the list"
    mapping = {
        "code": "The code",
        "email": "Email",
        "password": "Password",
        "title": "Title",
        "content": "Review text",
        "shipping_address": "Shipping address",
        "body": "Request",
    }
    return mapping.get(str(tail), str(tail).replace("_", " ").title())


def friendly_validation_message(errors: list[dict[str, Any]]) -> str:
    if not errors:
        return "Please check your input and try again."
    parts: list[str] = []
    for err in errors[:4]:
        loc = err.get("loc") or ()
        label = _field_label(tuple(loc))
        typ = str(err.get("type") or "")
        ctx = err.get("ctx") or {}
        if typ == "string_too_short":
            m = ctx.get("min_length")
            parts.append(f"{label} must be at least {m} character{'s' if (m or 0) != 1 else ''}.")
        elif typ == "string_too_long":
            m = ctx.get("max_length")
            parts.append(f"{label} is too long (maximum {m} characters).")
        elif typ in ("greater_than", "greater_than_equal"):
            parts.append(f"{label} is too small.")
        elif typ in ("less_than", "less_than_equal"):
            parts.append(f"{label} is too large.")
        elif typ == "value_error.missing":
            parts.append(f"{label} is required.")
        elif typ == "int_parsing":
            parts.append(f"{label} must be a whole number.")
        else:
            parts.append(f"{label} is not valid.")
    return " ".join(parts)


async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    msg = friendly_validation_message(exc.errors())
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": msg})


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "This action could not be completed. Check that products exist and try again."},
    )
