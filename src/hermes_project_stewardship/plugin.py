"""Vanilla Hermes plugin registration for Project Stewardship."""
from __future__ import annotations

import argparse
import json
import shlex
from pathlib import Path
from typing import Any, Optional

from .persistence.service import StewardshipService
from .persistence.store import Store

_DEFAULT_DB = Path("./stewardship.db")


class PluginState:
    """Process-wide service wiring owned by the plugin lifecycle."""

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


def tool_steward_status(project_id: str) -> dict:
    svc = PluginState.services()
    return {"settings": svc.settings(project_id), "health": svc.latest_health(project_id)}


def tool_steward_run_cycle(project_id: str, idempotency_key: Optional[str] = None) -> dict:
    from .cycles.engine import CycleEngine

    return CycleEngine(PluginState.services()).run_cycle(
        project_id, idempotency_key=idempotency_key
    )


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


# Approval/rejection are intentionally not model tools. They remain on authenticated
# RPC/dashboard and permission-bound gateway surfaces.
TOOLS = {
    "steward_status": tool_steward_status,
    "steward_run_cycle": tool_steward_run_cycle,
    "steward_propose_initiative": tool_steward_propose_initiative,
}

_TOOL_PROPERTIES = {
    "steward_status": {
        "project_id": {"type": "string", "description": "Stewardship project id"},
    },
    "steward_run_cycle": {
        "project_id": {"type": "string", "description": "Stewardship project id"},
        "idempotency_key": {"type": "string"},
    },
    "steward_propose_initiative": {
        "project_id": {"type": "string"},
        "title": {"type": "string"},
        "rationale": {"type": "string"},
        "expected_outcome": {"type": "string"},
        "risk": {"type": "string", "enum": ["low", "medium", "high"]},
        "dedupe_key": {"type": "string"},
    },
}
_TOOL_REQUIRED = {
    "steward_status": ["project_id"],
    "steward_run_cycle": ["project_id"],
    "steward_propose_initiative": ["project_id", "title", "rationale"],
}


def _tool_handler(fn):
    def handle(args=None, **_kwargs):
        return json.dumps(fn(**dict(args or {})), sort_keys=True, default=str)

    return handle


def _schema(name: str) -> dict:
    return {
        "name": name,
        "description": name.replace("_", " "),
        "parameters": {
            "type": "object",
            "properties": _TOOL_PROPERTIES[name],
            "required": _TOOL_REQUIRED[name],
            "additionalProperties": False,
        },
    }


def _slash_routes() -> dict[str, Any]:
    svc = PluginState.services

    def status(raw_args: str):
        project_id = raw_args.strip()
        if not project_id:
            return "usage: /project-status <project-id>"
        settings = svc().settings(project_id)
        health = svc().latest_health(project_id)
        state = health["status"] if health else "never-verified"
        return f"{project_id}: {state} | phase={settings['phase']} | L{settings['autonomy_level']}"

    def initiatives(raw_args: str):
        project_id = raw_args.strip()
        if not project_id:
            return "usage: /project-initiatives <project-id>"
        rows = svc().initiatives(project_id)
        return "\n".join(f"{r['ref']} [{r['status']}] {r['title']}" for r in rows) or "(none)"

    def pause(raw_args: str):
        parts = shlex.split(raw_args)
        if len(parts) != 1:
            return "usage: /project-pause <project-id>"
        result = svc().pause(parts[0])
        return f"{parts[0]} phase={result['phase']}"

    return {
        "project-status": status,
        "project-initiatives": initiatives,
        "project-pause": pause,
    }


def _setup_cli(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("args", nargs=argparse.REMAINDER)


def _run_cli(namespace: argparse.Namespace) -> int:
    from .cli.app import main

    return main(list(namespace.args))


def register(runtime: Any) -> dict:
    """Register only APIs shipped by vanilla Hermes PluginContext."""
    registered = {"tools": [], "commands": [], "hooks": []}
    for name, fn in TOOLS.items():
        try:
            runtime.register_tool(
                name=name,
                toolset="project-stewardship",
                schema=_schema(name),
                handler=_tool_handler(fn),
            )
        except AttributeError:
            break
        registered["tools"].append(name)

    for name, handler in _slash_routes().items():
        try:
            runtime.register_command(
                name=name,
                handler=handler,
                description=name.replace("-", " "),
                args_hint="<project-id>",
            )
        except AttributeError:
            break
        registered["commands"].append(name)

    skill_path = Path(__file__).resolve().parents[2] / "skill" / "project-stewardship"
    if skill_path.is_dir():
        try:
            runtime.register_skill("project-stewardship", skill_path)
        except AttributeError:
            pass

    try:
        runtime.register_cli_command(
            name="stewardship",
            help="Project Stewardship control plane",
            setup_fn=_setup_cli,
            handler_fn=_run_cli,
        )
    except AttributeError:
        pass
    return registered
