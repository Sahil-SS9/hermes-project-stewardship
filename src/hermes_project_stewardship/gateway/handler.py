"""Gateway command contract: platform-neutral stewardship commands.

One implementation for Discord/Buzz/any adapter. Adapters translate platform
messages into `CommandRequest` and render the returned `CommandResponse`.
The adapter owns ONLY presentation and platform auth; permission binding is
checked here against stored per-project grants.

Approval idempotency: approving an already-approved initiative returns the
current state with `already_done=True` rather than erroring — safe redelivery.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..persistence.service import ServiceError, StewardshipService
from .errors import CommandError


@dataclass(frozen=True)
class CommandRequest:
    platform: str            # "discord" | "buzz" | ...
    sender_id: str           # platform user id
    command: str             # e.g. "status", "approve", "run"
    project_id: str
    args: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CommandResponse:
    ok: bool
    text: str                       # human-readable one-liner
    data: Dict[str, Any] = field(default_factory=dict)
    already_done: bool = False      # idempotent replay marker


class GatewayCommandHandler:
    def __init__(self, service: StewardshipService, *, cycle_engine=None) -> None:
        self.svc = service
        self.engine = cycle_engine

    # ------------------------------------------------------------------ #

    def handle(self, req: CommandRequest) -> CommandResponse:
        try:
            perm = self.svc.gateway_permission(
                req.project_id, platform=req.platform, sender_id=req.sender_id
            )
            cmd = req.command.strip().lower()
            if cmd in ("status", "health", "initiatives"):
                return self._read(req)
            if cmd == "approve":
                if not perm["can_approve"]:
                    return CommandResponse(False, "not permitted to approve")
                return self._approve(req)
            if cmd == "reject":
                if not perm["can_approve"]:
                    return CommandResponse(False, "not permitted to approve")
                return self._reject(req)
            if cmd == "run":
                if not perm["can_trigger"]:
                    return CommandResponse(False, "not permitted to trigger cycles")
                return self._run(req)
            return CommandResponse(False, f"unknown command '{req.command}'")
        except ServiceError as e:
            raise CommandError(str(e)) from e

    # ------------------------------------------------------------------ #

    def _read(self, req: CommandRequest) -> CommandResponse:
        cmd = req.command.strip().lower()
        if cmd in ("status", "health"):
            health = self.svc.latest_health(req.project_id)
            settings = self.svc.settings(req.project_id)
            state = health["status"] if health else "unknown"
            return CommandResponse(
                True,
                f"{req.project_id}: {state} (phase={settings['phase']}, "
                f"autonomy L{settings['autonomy_level']})",
                data={"health": health, "phase": settings["phase"]},
            )
        inis = self.svc.initiatives(req.project_id)
        pending = [i for i in inis if i["status"] == "pending_approval"]
        listing = "\n".join(
            f"- {i['ref']} [{i['status']}] {i['title']}" for i in inis[:10]
        ) or "(none)"
        return CommandResponse(
            True,
            f"{len(pending)} pending approval\n{listing}",
            data={"initiatives": inis[:25]},
        )

    def _approve(self, req: CommandRequest) -> CommandResponse:
        ref = str(req.args.get("initiative_ref", "")).strip()
        if not ref:
            raise CommandError("approve requires initiative_ref")
        ini = self.svc.initiative_by_ref(ref)  # raises if unknown
        if ini["status"] == "approved":
            return CommandResponse(True, f"{ref} already approved", already_done=True)
        out = self.svc.approve_initiative(ref, actor=f"{req.platform}:{req.sender_id}", interface="gateway")
        return CommandResponse(True, f"{ref} approved", data=out)

    def _reject(self, req: CommandRequest) -> CommandResponse:
        ref = str(req.args.get("initiative_ref", "")).strip()
        if not ref:
            raise CommandError("reject requires initiative_ref")
        ini = self.svc.initiative_by_ref(ref)
        if ini["status"] == "rejected":
            return CommandResponse(True, f"{ref} already rejected", already_done=True)
        out = self.svc.reject_initiative(
            ref, actor=f"{req.platform}:{req.sender_id}", interface="gateway"
        )
        return CommandResponse(True, f"{ref} rejected (suppression window applied)",
                               data={"ref": out["ref"]})

    def _run(self, req: CommandRequest) -> CommandResponse:
        if self.engine is None:
            raise CommandError("cycle engine not wired to this handler")
        result = self.engine.run_cycle(
            req.project_id,
            trigger_type="gateway",
            trigger_ref=f"{req.platform}:{req.sender_id}",
        )
        h = result["health"]
        return CommandResponse(
            True,
            f"cycle done: {h['state']} ({len(result['initiatives'])} initiatives)",
            data=result,
        )
