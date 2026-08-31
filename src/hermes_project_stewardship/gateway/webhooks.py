"""Webhook receiver: GitHub-compatible HMAC validation → targeted cycles.

Security posture (threat-model §2: webhook payloads are untrusted):
- HMAC-SHA256 signature over the RAW body with a per-project shared secret;
- constant-time comparison; replay protection via the store's trigger keys;
- payload fields are metadata ONLY — never authority; the cycle still runs
  its own deterministic verification before any mutation.

Framework-free core (`validate_and_enqueue`) so it mounts on FastAPI, an
ASGI handler, or tests without HTTP.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Optional

MAX_BODY_BYTES = 256 * 1024


class WebhookRejected(Exception):
    def __init__(self, reason: str, status: int = 400) -> None:
        super().__init__(reason)
        self.reason = reason
        self.status = status


@dataclass(frozen=True)
class WebhookResult:
    accepted: bool
    project_id: str
    trigger_key: str
    event: str
    detail: str


def verify_signature(secret: str, body: bytes, signature_header: str) -> bool:
    """GitHub 'X-Hub-Signature-256' style: sha256=<hex>."""
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        secret.encode("utf-8"), body, hashlib.sha256
    ).hexdigest()
    provided = signature_header.split("=", 1)[1].strip().lower()
    return hmac.compare_digest(expected, provided)


class WebhookReceiver:
    def __init__(self, service, cycle_engine) -> None:
        self.svc = service
        self.engine = cycle_engine

    def handle(
        self,
        *,
        project_id: str,
        body: bytes,
        signature: Optional[str],
        delivery_id: Optional[str] = None,
    ) -> WebhookResult:
        if len(body) > MAX_BODY_BYTES:
            raise WebhookRejected("payload too large", 413)

        # Resolve project + secret BEFORE trusting anything else.
        try:
            settings = self.svc.settings(project_id)
        except Exception:
            raise WebhookRejected("unknown project", 404)
        secret = settings["policies"].get("verification", {}).get("webhook_secret")
        if not secret:
            raise WebhookRejected("project has no webhook_secret configured", 403)

        if not verify_signature(secret, body, signature or ""):
            raise WebhookRejected("invalid signature", 401)

        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise WebhookRejected("malformed JSON", 400)
        if not isinstance(payload, dict):
            raise WebhookRejected("JSON object expected", 400)

        event = str(payload.get("event") or payload.get("action") or "push")
        trigger_key = f"webhook:{project_id}:{delivery_id or hashlib.sha256(body).hexdigest()[:24]}"

        result = self.engine.run_cycle(
            project_id,
            trigger_type="webhook",
            trigger_ref=f"{event}:{delivery_id or 'unsigned-delivery'}",
            idempotency_key=trigger_key,
        )
        h = result["health"]
        return WebhookResult(
            accepted=True,
            project_id=project_id,
            trigger_key=trigger_key,
            event=event,
            detail=f"cycle {result['cycle_id']}: {h['state']}",
        )
