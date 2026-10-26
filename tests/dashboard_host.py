"""Small authenticated-host double for proxy unit tests, not Hermes auth code.

The real Hermes gate/provider are exercised separately in native-host checks.
Unlike mounting a naked APIRouter, this preserves the outer authentication
boundary when testing the proxy's *different* backend credential.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


def authenticated_host(router, *, session_token=None, native_token=None, prefix=""):
    app = FastAPI()

    @app.middleware("http")
    async def authenticate(request: Request, call_next):
        authorization = request.headers.get("authorization")
        if authorization is not None:
            allowed = authorization == "Bearer accepted-native"
            if native_token:
                allowed = allowed or authorization == f"Bearer {native_token}"
            if session_token:
                allowed = allowed or authorization == f"Bearer {session_token}"
        else:
            allowed = request.cookies.get("hermes_session_at") == "accepted-cookie"
            if session_token:
                allowed = allowed or request.headers.get("x-hermes-session-token") == session_token
        if not allowed:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)

    app.include_router(router, prefix=prefix)
    return app
