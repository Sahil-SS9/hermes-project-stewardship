"""RPC hardening middleware: bearer auth + rate limiting.

Auth (S5): when `auth_token` is configured, every /stewardship/* request must
carry `Authorization: Bearer <token>` (constant-time compare). /healthz stays
open for process monitors. No token configured = open API, intended for
localhost-only dev; production deployments MUST set a token.

Rate limit (S6): per-client token bucket on mutating endpoints. Client key =
token (when authed) or client host. 429 with Retry-After on exhaustion.
"""

from __future__ import annotations

import hmac
import threading
import time as _time
from contextvars import ContextVar
from typing import Callable, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


_CURRENT_PRINCIPAL: ContextVar[Optional[str]] = ContextVar(
    "stewardship_current_principal", default=None
)


def current_principal() -> Optional[str]:
    return _CURRENT_PRINCIPAL.get()


class BearerAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, token: str, principal: str = "rpc-token") -> None:
        super().__init__(app)
        self._token = token
        self._principal = principal

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path == "/healthz":
            return await call_next(request)
        header = request.headers.get("authorization", "")
        ok = header.startswith("Bearer ") and hmac.compare_digest(
            header[7:].strip(), self._token
        )
        if not ok:
            return JSONResponse(
                {"error": {"code": "unauthorized", "message": "missing or invalid bearer token"}},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
        request.state.principal = self._principal
        token = _CURRENT_PRINCIPAL.set(self._principal)
        try:
            return await call_next(request)
        finally:
            _CURRENT_PRINCIPAL.reset(token)


class MissingAuthMiddleware(BaseHTTPMiddleware):
    """Keep standalone deployments inert until an operator configures auth."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path == "/healthz":
            return await call_next(request)
        return JSONResponse(
            {"error": {
                "code": "auth_not_configured",
                "message": "STEWARD_RPC_TOKEN must be configured",
            }},
            status_code=503,
        )


class TokenBucket:
    def __init__(self, rate_per_minute: int, burst: Optional[int] = None) -> None:
        self.rate = rate_per_minute / 60.0
        self.capacity = float(burst or max(rate_per_minute, 1))
        self.tokens = self.capacity
        self.updated = _time.monotonic()
        self.lock = threading.Lock()

    def take(self, n: float = 1.0) -> bool:
        with self.lock:
            now = _time.monotonic()
            self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
            self.updated = now
            if self.tokens >= n:
                self.tokens -= n
                return True
            return False

    @property
    def retry_after(self) -> int:
        need = max(1.0 - self.tokens, 0.001)
        return max(int(need / self.rate), 1)


class RateLimitMiddleware(BaseHTTPMiddleware):
    MUTATING_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

    def __init__(
        self, app, requests_per_minute: int = 120, max_buckets: int = 2048
    ) -> None:
        super().__init__(app)
        self._rpm = requests_per_minute
        self._max_buckets = max(1, max_buckets)
        self._buckets: dict = {}
        self._lock = threading.Lock()

    def _bucket(self, key: str) -> TokenBucket:
        with self._lock:
            b = self._buckets.get(key)
            if b is None:
                if len(self._buckets) >= self._max_buckets:
                    oldest = next(iter(self._buckets))
                    self._buckets.pop(oldest, None)
                b = TokenBucket(self._rpm)
                self._buckets[key] = b
            return b

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method not in self.MUTATING_METHODS:
            return await call_next(request)
        client = request.client.host if request.client else "unknown"
        auth = request.headers.get("authorization", "")
        key = auth[7:].strip()[:32] if auth.startswith("Bearer ") else client
        bucket = self._bucket(key)
        if not bucket.take():
            return JSONResponse(
                {"error": {"code": "rate_limited",
                           "message": f"limit {self._rpm}/min exceeded"}},
                status_code=429,
                headers={"Retry-After": str(bucket.retry_after)},
            )
        return await call_next(request)


def error_envelope_handler(request: Request, exc: Exception) -> JSONResponse:
    """Uniform error shape for every non-2xx response."""
    status = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))
    default_code = {
        400: "bad_request", 401: "unauthorized", 403: "forbidden",
        404: "not_found", 409: "conflict", 413: "payload_too_large",
        422: "validation_error", 429: "rate_limited",
        500: "internal_error", 503: "host_unavailable",
    }.get(status, "error")
    if isinstance(detail, dict):
        error: dict[str, object] = {
            "code": str(detail.get("code") or default_code),
            "message": str(detail.get("message") or "request failed"),
        }
        fields = detail.get("fields")
        if isinstance(fields, dict) and fields:
            error["fields"] = fields
    else:
        error = {"code": default_code, "message": str(detail)}
    return JSONResponse({"error": error}, status_code=status)
