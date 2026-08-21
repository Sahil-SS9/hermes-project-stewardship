"""Hermes plugin registration surface.

This module is the contract between the incubating plugin and the Hermes
plugin loader. It deliberately contains NO business logic: every function
delegates to the same service layer used by CLI/RPC/gateway.

`register()` is called by the Hermes plugin loader with a runtime handle that
exposes tool/slash/hook registration APIs. The exact runtime API is documented
in docs/architecture.md (§ Hermes integration contracts) and is intentionally
defensive here so the engine works with or without a live Hermes process.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from .persistence.service import StewardshipService
from .persistence.store import Store

_DEFAULT_DB = Path("./stewardship.db")


class PluginState:
    """Process-wide singleton wiring for the plugin entry points."""

    _store: Optional[Store] = None
    _svc: Optional[StewardshipService] = None
    db_path: Path = _DEFAULT_DB

    @classmethod
    def services(cls) -> StewardshipService:
        if cls._svc is None:
            cls._store = Store(cls.db_path)
            cls._svc = StewardshipService(cls._store)
        return cls._svc

    @classmethod
    def reset(cls) -> None:
        if cls._store is not None:
            cls._store.close()
        cls._store = None
        cls._svc = None


# --------------------------------------------------------------------- #
# Typed tools exposed to agent profiles                                  #
# --------------------------------------------------------------------- #

def tool_steward_status(project_id: str) -> dict:
    svc = PluginState.services()
    return {"settings": svc.settings(project_id), "health": svc.latest_health(project_id)}


def tool_steward_run_cycle(project_id: str, idempotency_key: Optional[str] = None) -> dict:
    from .cycles.engine import CycleEngine

    engine = CycleEngine(PluginState.services())
    return engine.run_cycle(project_id, idempotency_key=idempotency_key)


def tool_steward_propose_initiative(
    project_id: str,
    title: str,
    rationale: str,
    expected_outcome: str = "",
    risk: str = "medium",
    dedupe_key: Optional[str] = None,
) -> dict:
    return PluginState.services().propose_initiative(
        project_id,
        title=title,
        rationale=rationale,
        expected_outcome=expected_outcome,
        risk=risk,
        dedupe_key=dedupe_key,
    )


def tool_steward_approve(ref: str, actor: str, interface: str = "tool") -> dict:
    return PluginState.services().approve_initiative(ref, actor=actor, interface=interface)


def tool_steward_reject(ref: str, actor: str, interface: str = "tool") -> dict:
    return PluginState.services().reject_initiative(ref, actor=actor, interface=interface)


TOOLS = {
    "steward_status": tool_steward_status,
    "steward_run_cycle": tool_steward_run_cycle,
    "steward_propose_initiative": tool_steward_propose_initiative,
    "steward_approve": tool_steward_approve,
    "steward_reject": tool_steward_reject,
}


# --------------------------------------------------------------------- #
# Loader hook                                                            #
# --------------------------------------------------------------------- #

def register(runtime: Any) -> dict:
    """Register tools + slash command routes with a Hermes plugin runtime.

    Returns a summary of what was registered. Never raises on missing
    optional surfaces; returns what succeeded so loaders can log honestly.
    """
    registered = {"tools": [], "commands": [], "hooks": []}
    for name, fn in TOOLS.items():
        try:
            runtime.register_tool(name, fn)
            registered["tools"].append(name)
        except AttributeError:
            # Runtime without tool registration (e.g. bare embed). The typed
            # functions remain importable and usable directly.
            break
    try:
        runtime.register_slash_group("project", routes=_slash_routes())
        registered["commands"].append("project")
    except AttributeError:
        pass
    return registered


def _slash_routes() -> dict:
    """Slash-command → service mapping. Presentation stays in the adapter."""
    svc = PluginState.services

    def status(project_id: str):
        s = svc().settings(project_id)
        h = svc().latest_health(project_id)
        state = h["status"] if h else "never-verified"
        return f"{project_id}: {state} | phase={s['phase']} | L{s['autonomy_level']}"

    def initiatives(project_id: str):
        rows = svc().initiatives(project_id)
        return [f"{r['ref']} [{r['status']}] {r['title']}" for r in rows]

    def approve(project_id: str, ref: str, actor: str):
        out = svc().approve_initiative(ref, actor=actor, interface="slash")
        return f"{out['ref']} approved"

    def pause(project_id: str, actor: str):
        s = svc().pause(project_id)
        return f"{project_id} phase={s['phase']}"

    return {
        "status": status,
        "initiatives": initiatives,
        "approve": approve,
        "pause": pause,
    }
