from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def _error_response(status: int, code: str, message: str, details: list | None = None) -> JSONResponse:
    body: dict = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        423: "ACCOUNT_LOCKED",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }.get(exc.status_code, "ERROR")
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        code = detail["code"]
        detail = detail.get("message", str(exc.detail))
    return _error_response(exc.status_code, code, str(detail))


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"field": ".".join(str(l) for l in e["loc"][1:]), "issue": e["msg"]}
        for e in exc.errors()
    ]
    return _error_response(422, "VALIDATION_ERROR", "Request body failed validation.", details)


def raise_not_found(resource: str = "Resource") -> None:
    raise HTTPException(status_code=404, detail=f"{resource} not found.")


def raise_conflict(message: str) -> None:
    raise HTTPException(status_code=409, detail=message)


def raise_forbidden(message: str = "Access denied.") -> None:
    raise HTTPException(status_code=403, detail=message)


def raise_unauthorized(message: str = "Authentication required.") -> None:
    raise HTTPException(status_code=401, detail=message)
