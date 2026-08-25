"""Service layer: all stewardship operations against the canonical store.

This is the single write path every surface (CLI, RPC, gateway, desktop)
shares. Surfaces never touch SQL directly.

Fail-closed rules enforced here:
- mutating operations on a paused/frozen project are refused;
- approvals require an eligible actor with permission binding;
- initiative execution requires approval when policy says so.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import tempfile
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

from ..domain.constants import (
    ApprovalState,
    InitiativeStatus,
    KnowledgeType,
    ProjectPhase,
    TriggerType,
)
from ..domain.models import Initiative, Objective
from .store import Store, iso


class ServiceError(RuntimeError):
    """Refusal surfaced to users (bad state, bad policy, not found)."""


_CONTENT_TYPES = {
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
_MAX_CONTENT_BYTES = 5 * 1024 * 1024
_TEXT_PREVIEW_BYTES = 100_000


class StewardshipService:
    def __init__(
        self,
        store: Store,
        *,
        clock=None,
        default_suppression_days: int = 14,
    ) -> None:
        self.store = store
        self._clock = clock or store._clock
        self.default_suppression_days = default_suppression_days

    # ------------------------------------------------------------------ #
    # Enable / lifecycle                                                 #
    # ------------------------------------------------------------------ #

    def enable(
        self,
        project_id: str,
        *,
        mission: str = "",
        lead_profile: Optional[str] = None,
        member_profiles: Optional[Sequence[str]] = None,
        autonomy_level: int = 0,
        verification_policy: Optional[Dict[str, Any]] = None,
        release_policy: Optional[Dict[str, Any]] = None,
        notification_policy: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO project_stewardship(
                    project_id, enabled, mission, owner_lead_profile,
                    member_profiles_json, autonomy_level,
                    verification_policy_json, release_policy_json,
                    notification_policy_json, phase, created_at, updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(project_id) DO UPDATE SET
                    enabled=1,
                    mission=excluded.mission,
                    owner_lead_profile=excluded.owner_lead_profile,
                    member_profiles_json=excluded.member_profiles_json,
                    autonomy_level=excluded.autonomy_level,
                    verification_policy_json=excluded.verification_policy_json,
                    release_policy_json=excluded.release_policy_json,
                    notification_policy_json=excluded.notification_policy_json,
                    updated_at=excluded.updated_at,
                    phase='active', paused_at=NULL
                """,
                (
                    project_id,
                    1,
                    mission,
                    lead_profile,
                    json.dumps(list(member_profiles or [])),
                    int(autonomy_level),
                    self.store._j(verification_policy or {}),
                    self.store._j(release_policy or {}),
                    self.store._j(notification_policy or {}),
                    ProjectPhase.ACTIVE.value,
                    now,
                    now,
                ),
            )
        self.store.audit(
            actor=lead_profile or "system",
            interface="service",
            action="stewardship.enabled",
            subject=project_id,
            detail={"autonomy_level": autonomy_level},
        )
        return self.settings(project_id)

    def disable(self, project_id: str) -> Dict[str, Any]:
        self._require(project_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=0, updated_at=? WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(actor="system", interface="service", action="stewardship.disabled", subject=project_id)
        r = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        return self._row_settings(r)

    def re_enable(self, project_id: str) -> Dict[str, Any]:
        """Re-enable an existing project without replacing its configuration."""
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if row["enabled"]:
            return self._row_settings(row)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET enabled=1, phase='active',"
                " paused_at=NULL, updated_at=? WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(
            actor="system",
            interface="service",
            action="stewardship.re_enabled",
            subject=project_id,
        )
        return self.settings(project_id)

    def pause(self, project_id: str) -> Dict[str, Any]:
        return self._set_phase(project_id, ProjectPhase.PAUSED)

    def resume(self, project_id: str) -> Dict[str, Any]:
        return self._set_phase(project_id, ProjectPhase.ACTIVE)

    def freeze(self, project_id: str) -> Dict[str, Any]:
        """Emergency freeze: no cycles, no mutations until explicit resume."""
        return self._set_phase(project_id, ProjectPhase.FROZEN)

    def _set_phase(self, project_id: str, phase: ProjectPhase) -> Dict[str, Any]:
        self._require(project_id)
        paused_at = iso(self._clock()) if phase in (ProjectPhase.PAUSED, ProjectPhase.FROZEN) else None
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET phase=?, paused_at=?, updated_at=?"
                " WHERE project_id=?",
                (phase.value, paused_at, iso(self._clock()), project_id),
            )
        self.store.audit(actor="system", interface="service", action=f"stewardship.{phase.value}", subject=project_id)
        return self.settings(project_id)

    # ------------------------------------------------------------------ #
    # Reads                                                              #
    # ------------------------------------------------------------------ #

    def _require(self, project_id: str) -> sqlite3.Row:
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if not row["enabled"]:
            raise ServiceError(f"stewardship is disabled for project '{project_id}'")
        return row

    def _require_known(self, project_id: str) -> sqlite3.Row:
        """Require a configured project without requiring it to be enabled."""
        row = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if row is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        return row

    def _row_settings(self, r: sqlite3.Row) -> Dict[str, Any]:
        """Serialise a raw stewardship row regardless of enabled flag."""
        return {
            "project_id": r["project_id"],
            "enabled": bool(r["enabled"]),
            "mission": r["mission"],
            "owner": {
                "lead_profile": r["owner_lead_profile"],
                "member_profiles": self.store._uj(r["member_profiles_json"], []),
                "owner_team_id": r["owner_team_id"],
            },
            "autonomy_level": r["autonomy_level"],
            "policies": {
                "autonomy": self.store._uj(r["autonomy_policy_json"], {}),
                "verification": self.store._uj(r["verification_policy_json"], {}),
                "release": self.store._uj(r["release_policy_json"], {}),
                "notification": self.store._uj(r["notification_policy_json"], {}),
            },
            "phase": r["phase"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "paused_at": r["paused_at"],
        }

    def settings(self, project_id: str, *,
                 include_disabled: bool = False) -> Dict[str, Any]:
        r = self.store._conn.execute(
            "SELECT * FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if r is None:
            raise ServiceError(f"stewardship not enabled for project '{project_id}'")
        if not r["enabled"] and not include_disabled:
            raise ServiceError(f"stewardship is disabled for project '{project_id}'")
        return self._row_settings(r)

    def update_settings(
        self,
        project_id: str,
        *,
        mission: Optional[str] = None,
        lead_profile: Optional[str] = None,
        member_profiles: Optional[Sequence[str]] = None,
        autonomy_level: Optional[int] = None,
        autonomy_policy: Optional[Dict[str, Any]] = None,
        verification_policy: Optional[Dict[str, Any]] = None,
        release_policy: Optional[Dict[str, Any]] = None,
        notification_policy: Optional[Dict[str, Any]] = None,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Patch project configuration without discarding unknown policy keys."""
        current = self.settings(project_id)
        changed: List[str] = []

        if mission is not None:
            if not isinstance(mission, str) or len(mission.strip()) > 2000:
                raise ServiceError("mission must be text of at most 2000 characters")
            current["mission"] = mission.strip()
            changed.append("mission")
        if lead_profile is not None:
            if not isinstance(lead_profile, str) or len(lead_profile.strip()) > 100:
                raise ServiceError("lead_profile must be text of at most 100 characters")
            current["owner"]["lead_profile"] = lead_profile.strip() or None
            changed.append("lead_profile")
        if member_profiles is not None:
            members = list(member_profiles)
            if len(members) > 32 or any(
                not isinstance(profile, str) or not profile.strip() or len(profile.strip()) > 100
                for profile in members
            ):
                raise ServiceError("member_profiles must contain at most 32 valid profile names")
            current["owner"]["member_profiles"] = [profile.strip() for profile in members]
            changed.append("member_profiles")
        if autonomy_level is not None:
            if isinstance(autonomy_level, bool) or not isinstance(autonomy_level, int) or not 0 <= autonomy_level <= 5:
                raise ServiceError("autonomy_level must be an integer from 0 to 5")
            current["autonomy_level"] = autonomy_level
            changed.append("autonomy_level")

        def merge_policy(name: str, patch: Optional[Dict[str, Any]]) -> None:
            if patch is None:
                return
            if not isinstance(patch, dict):
                raise ServiceError(f"{name}_policy must be an object")

            def deep_merge(base: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
                merged = dict(base)
                for key, value in incoming.items():
                    if isinstance(value, dict) and isinstance(merged.get(key), dict):
                        merged[key] = deep_merge(merged[key], value)
                    else:
                        merged[key] = value
                return merged

            current["policies"][name] = deep_merge(current["policies"][name], patch)
            changed.append(f"{name}_policy")

        merge_policy("autonomy", autonomy_policy)
        merge_policy("verification", verification_policy)
        merge_policy("release", release_policy)
        merge_policy("notification", notification_policy)

        if not changed:
            return current

        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                """
                UPDATE project_stewardship SET
                    mission=?, owner_lead_profile=?, member_profiles_json=?,
                    autonomy_level=?, autonomy_policy_json=?,
                    verification_policy_json=?, release_policy_json=?,
                    notification_policy_json=?, updated_at=?
                WHERE project_id=?
                """,
                (
                    current["mission"],
                    current["owner"]["lead_profile"],
                    self.store._j(current["owner"]["member_profiles"]),
                    current["autonomy_level"],
                    self.store._j(current["policies"]["autonomy"]),
                    self.store._j(current["policies"]["verification"]),
                    self.store._j(current["policies"]["release"]),
                    self.store._j(current["policies"]["notification"]),
                    now,
                    project_id,
                ),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="project.settings_updated",
            subject=project_id,
            detail={"fields": changed},
        )
        return self.settings(project_id)

    def archive_mission(
        self,
        project_id: str,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Preserve the active mission in history, then clear it atomically."""
        current = self.settings(project_id)
        mission = str(current.get("mission") or "").strip()
        if not mission:
            raise ServiceError("project has no active mission to archive")
        archived_at = iso(self._clock())
        archive_id = f"MISSION-{uuid.uuid4().hex[:12].upper()}"
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO project_mission_archive(archive_id, project_id, mission,"
                " archived_by, archived_at) VALUES(?,?,?,?,?)",
                (archive_id, project_id, mission, actor, archived_at),
            )
            cx.execute(
                "UPDATE project_stewardship SET mission='', updated_at=?"
                " WHERE project_id=?",
                (archived_at, project_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="mission.archived",
            subject=project_id,
            detail={"archive_id": archive_id},
        )
        return {
            "archive_id": archive_id,
            "project_id": project_id,
            "mission": mission,
            "archived_by": actor,
            "archived_at": archived_at,
        }

    def archived_missions(self, project_id: str) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        rows = self.store._conn.execute(
            "SELECT archive_id, project_id, mission, archived_by, archived_at"
            " FROM project_mission_archive WHERE project_id=?"
            " ORDER BY archived_at DESC, archive_id DESC",
            (project_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def remove_mission(
        self,
        project_id: str,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        """Clear the active mission without retaining its text in mission history."""
        current = self.settings(project_id)
        if not str(current.get("mission") or "").strip():
            raise ServiceError("project has no active mission to remove")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_stewardship SET mission='', updated_at=?"
                " WHERE project_id=?",
                (iso(self._clock()), project_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="mission.removed",
            subject=project_id,
        )
        return {"project_id": project_id, "removed": True}

    def is_active(self, project_id: str) -> bool:
        try:
            s = self.settings(project_id)
        except ServiceError:
            return False
        return s["enabled"] and s["phase"] == ProjectPhase.ACTIVE.value

    def list_projects(self) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT project_id, enabled, phase, autonomy_level FROM project_stewardship"
            " ORDER BY project_id"
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------ #
    # Objectives                                                         #
    # ------------------------------------------------------------------ #

    def _objective_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "name": row["name"],
            "description": row["description"],
            "evaluator_type": row["evaluator_type"],
            "target": row["target"],
            "severity": row["severity"],
            "enabled": bool(row["enabled"]),
            "command": self.store._uj(row["command_json"], None),
            "integration": row["integration"],
            "window": row["window"],
        }

    def _validate_objective(
        self,
        *,
        name: str,
        evaluator_type: str,
        target: str,
        severity: str,
        description: str,
        command: Optional[Sequence[str]],
        integration: Optional[str],
        window: str,
    ) -> Dict[str, Any]:
        clean_name = name.strip() if isinstance(name, str) else ""
        clean_target = target.strip() if isinstance(target, str) else ""
        clean_description = description.strip() if isinstance(description, str) else ""
        clean_window = window.strip() if isinstance(window, str) else ""
        if not clean_name or len(clean_name) > 200:
            raise ServiceError("objective name must be 1 to 200 characters")
        if not clean_target or len(clean_target) > 500:
            raise ServiceError("objective target must be 1 to 500 characters")
        if len(clean_description) > 2000:
            raise ServiceError("objective description must be at most 2000 characters")
        if not clean_window or len(clean_window) > 50:
            raise ServiceError("objective window must be 1 to 50 characters")
        if evaluator_type not in ("manual", "command", "integration"):
            raise ServiceError(f"unsupported evaluator_type '{evaluator_type}'")
        if severity not in ("info", "low", "medium", "high"):
            raise ServiceError(f"unsupported objective severity '{severity}'")
        clean_command = list(command) if command is not None else None
        if evaluator_type == "command":
            if not clean_command:
                raise ServiceError("command objective requires a command argv list")
            if isinstance(command, str) or any(
                not isinstance(part, str) or not part for part in clean_command
            ):
                raise ServiceError("command must be an argv list (no shell strings)")
        clean_integration = integration.strip() if isinstance(integration, str) else None
        if evaluator_type == "integration" and not clean_integration:
            raise ServiceError("integration objective requires an integration name")
        return {
            "name": clean_name,
            "evaluator_type": evaluator_type,
            "target": clean_target,
            "severity": severity,
            "description": clean_description,
            "command": clean_command,
            "integration": clean_integration,
            "window": clean_window,
        }

    def add_objective(
        self,
        project_id: str,
        *,
        name: str,
        evaluator_type: str,
        target: str,
        severity: str = "medium",
        description: str = "",
        command: Optional[Sequence[str]] = None,
        integration: Optional[str] = None,
        window: str = "30d",
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        values = self._validate_objective(
            name=name,
            evaluator_type=evaluator_type,
            target=target,
            severity=severity,
            description=description,
            command=command,
            integration=integration,
            window=window,
        )
        try:
            with self.store.tx() as cx:
                cx.execute(
                    """
                    INSERT INTO project_objectives(
                        project_id, name, description, evaluator_type, target,
                        severity, enabled, command_json, integration, window)
                    VALUES(?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        project_id,
                        values["name"],
                        values["description"],
                        values["evaluator_type"],
                        values["target"],
                        values["severity"],
                        1,
                        self.store._j(values["command"]) if values["command"] else None,
                        values["integration"],
                        values["window"],
                    ),
                )
        except sqlite3.IntegrityError as error:
            message = str(error)
            if (
                "UNIQUE constraint failed" in message
                and "project_objectives.project_id" in message
                and "project_objectives.name" in message
            ):
                raise ServiceError(
                    "an objective with that name already exists"
                ) from None
            raise
        row = self.store._conn.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND name=?",
            (project_id, values["name"]),
        ).fetchone()
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.added",
            subject=f"{project_id}:{values['name']}",
        )
        return self._objective_dict(row)

    def _objective_row(self, project_id: str, objective_id: int) -> sqlite3.Row:
        self._require(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_objectives WHERE project_id=? AND id=?",
            (project_id, objective_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown objective {objective_id} for project '{project_id}'")
        return row

    def update_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        name: Optional[str] = None,
        evaluator_type: Optional[str] = None,
        target: Optional[str] = None,
        severity: Optional[str] = None,
        description: Optional[str] = None,
        command: Optional[Sequence[str]] = None,
        integration: Optional[str] = None,
        window: Optional[str] = None,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        row = self._objective_row(project_id, objective_id)
        existing = self._objective_dict(row)
        selected_type = evaluator_type or existing["evaluator_type"]
        selected_command = command
        if command is None and selected_type == existing["evaluator_type"]:
            selected_command = existing["command"]
        selected_integration = integration
        if integration is None and selected_type == existing["evaluator_type"]:
            selected_integration = existing["integration"]
        values = self._validate_objective(
            name=existing["name"] if name is None else name,
            evaluator_type=selected_type,
            target=existing["target"] if target is None else target,
            severity=existing["severity"] if severity is None else severity,
            description=existing["description"] if description is None else description,
            command=selected_command,
            integration=selected_integration,
            window=existing["window"] if window is None else window,
        )
        try:
            with self.store.tx() as cx:
                cx.execute(
                    """UPDATE project_objectives SET name=?, description=?,
                    evaluator_type=?, target=?, severity=?, command_json=?,
                    integration=?, window=? WHERE project_id=? AND id=?""",
                    (
                        values["name"],
                        values["description"],
                        values["evaluator_type"],
                        values["target"],
                        values["severity"],
                        self.store._j(values["command"]) if values["command"] else None,
                        values["integration"],
                        values["window"],
                        project_id,
                        objective_id,
                    ),
                )
        except sqlite3.IntegrityError as error:
            raise ServiceError("an objective with that name already exists") from error
        updated = self._objective_row(project_id, objective_id)
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.updated",
            subject=f"{project_id}:{objective_id}",
        )
        return self._objective_dict(updated)

    def archive_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._objective_row(project_id, objective_id)
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_objectives SET enabled=0 WHERE project_id=? AND id=?",
                (project_id, objective_id),
            )
        archived = self._objective_row(project_id, objective_id)
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.archived",
            subject=f"{project_id}:{objective_id}",
        )
        return self._objective_dict(archived)

    def remove_objective(
        self,
        project_id: str,
        objective_id: int,
        *,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._objective_row(project_id, objective_id)
        with self.store.tx() as cx:
            cx.execute(
                "DELETE FROM project_objectives WHERE project_id=? AND id=?",
                (project_id, objective_id),
            )
        self.store.audit(
            actor=actor,
            interface=interface,
            action="objective.removed",
            subject=f"{project_id}:{objective_id}",
        )
        return {"id": objective_id, "removed": True}

    def objectives(self, project_id: str, *, include_disabled: bool = False) -> List[Objective]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_objectives WHERE project_id=?"
        if not include_disabled:
            sql += " AND enabled=1"
        sql += " ORDER BY id"
        rows = self.store._conn.execute(sql, (project_id,)).fetchall()
        return [Objective(**self._objective_dict(row)) for row in rows]

    # ------------------------------------------------------------------ #
    # Project supporting content                                         #
    # ------------------------------------------------------------------ #

    def _content_root(self) -> Path:
        root = (self.store.db_path.parent / "project-content").resolve()
        root.mkdir(parents=True, exist_ok=True, mode=0o700)
        return root

    def _content_metadata(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "content_id": row["content_id"],
            "project_id": row["project_id"],
            "filename": row["filename"],
            "media_type": row["media_type"],
            "size_bytes": row["size_bytes"],
            "sha256": row["sha256"],
            "uploaded_by": row["uploaded_by"],
            "uploaded_at": row["uploaded_at"],
        }

    def _validate_content_bytes(self, media_type: str, content: bytes) -> None:
        if media_type in ("text/plain", "text/markdown"):
            try:
                content.decode("utf-8")
            except UnicodeDecodeError as error:
                raise ServiceError("text project content must be valid UTF-8") from error
            if b"\x00" in content:
                raise ServiceError("text project content cannot contain null bytes")
            return
        signatures = {
            "application/pdf": content.startswith(b"%PDF-"),
            "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/jpeg": content.startswith(b"\xff\xd8\xff"),
            "image/webp": len(content) >= 12
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP",
        }
        if not signatures.get(media_type, False):
            raise ServiceError("project content does not match its declared media type")

    def upload_project_content(
        self,
        project_id: str,
        *,
        filename: str,
        media_type: str,
        content: bytes,
        actor: str = "system",
        interface: str = "service",
    ) -> Dict[str, Any]:
        self._require(project_id)
        clean_filename = filename.strip() if isinstance(filename, str) else ""
        if (
            not clean_filename
            or len(clean_filename) > 180
            or Path(clean_filename).name != clean_filename
            or "/" in clean_filename
            or "\\" in clean_filename
            or clean_filename in (".", "..")
        ):
            raise ServiceError("filename must be a safe single filename")
        clean_media_type = media_type.split(";", 1)[0].strip().lower()
        extension = _CONTENT_TYPES.get(clean_media_type)
        if extension is None:
            raise ServiceError("supported project content types are text, Markdown, PDF and images")
        if not isinstance(content, bytes):
            raise ServiceError("project content must be bytes")
        if not content:
            raise ServiceError("project content cannot be empty")
        if len(content) > _MAX_CONTENT_BYTES:
            raise ServiceError("project content cannot exceed 5 MB")
        self._validate_content_bytes(clean_media_type, content)

        content_id = f"CONTENT-{uuid.uuid4().hex[:16].upper()}"
        project_dir_name = hashlib.sha256(project_id.encode("utf-8")).hexdigest()[:20]
        root = self._content_root()
        project_dir = root / project_dir_name
        project_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        final_path = (project_dir / f"{content_id}{extension}").resolve()
        if root not in final_path.parents:
            raise ServiceError("project content path escaped its storage root")
        fd, temporary_name = tempfile.mkstemp(prefix=".upload-", dir=project_dir)
        temporary_path = Path(temporary_name)
        try:
            os.fchmod(fd, 0o600)
            with os.fdopen(fd, "wb") as handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, final_path)
            stored_path = str(final_path.relative_to(root))
            uploaded_at = iso(self._clock())
            digest = hashlib.sha256(content).hexdigest()
            try:
                with self.store.tx() as cx:
                    cx.execute(
                        """INSERT INTO project_content(
                        content_id, project_id, filename, stored_path, media_type,
                        size_bytes, sha256, uploaded_by, uploaded_at)
                        VALUES(?,?,?,?,?,?,?,?,?)""",
                        (
                            content_id,
                            project_id,
                            clean_filename,
                            stored_path,
                            clean_media_type,
                            len(content),
                            digest,
                            actor,
                            uploaded_at,
                        ),
                    )
            except BaseException:
                final_path.unlink(missing_ok=True)
                raise
        finally:
            temporary_path.unlink(missing_ok=True)
        row = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=? AND content_id=?",
            (project_id, content_id),
        ).fetchone()
        self.store.audit(
            actor=actor,
            interface=interface,
            action="project.content_uploaded",
            subject=f"{project_id}:{content_id}",
            detail={"filename": clean_filename, "size_bytes": len(content)},
        )
        return self._content_metadata(row)

    def project_content(self, project_id: str) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        rows = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=?"
            " ORDER BY uploaded_at DESC, content_id DESC",
            (project_id,),
        ).fetchall()
        return [self._content_metadata(row) for row in rows]

    def project_content_preview(
        self, project_id: str, content_id: str
    ) -> Dict[str, Any]:
        self._require_known(project_id)
        row = self.store._conn.execute(
            "SELECT * FROM project_content WHERE project_id=? AND content_id=?",
            (project_id, content_id),
        ).fetchone()
        if row is None:
            raise ServiceError(f"unknown project content '{content_id}'")
        root = self._content_root()
        try:
            path = (root / row["stored_path"]).resolve(strict=True)
            if root not in path.parents or not path.is_file():
                raise FileNotFoundError("content path is outside its storage root")
            raw = path.read_bytes()
        except (OSError, RuntimeError) as error:
            raise ServiceError("project content file is unavailable") from error
        if (
            len(raw) != row["size_bytes"]
            or hashlib.sha256(raw).hexdigest() != row["sha256"]
        ):
            raise ServiceError("project content failed its integrity check")
        metadata = self._content_metadata(row)
        if row["media_type"] in ("text/plain", "text/markdown"):
            preview = raw[:_TEXT_PREVIEW_BYTES].decode("utf-8", errors="ignore")
            return {
                **metadata,
                "preview_kind": "text",
                "text": preview,
                "truncated": len(raw) > _TEXT_PREVIEW_BYTES,
            }
        return {**metadata, "preview_kind": "metadata", "text": None, "truncated": False}

    # ------------------------------------------------------------------ #
    # Health snapshots                                                   #
    # ------------------------------------------------------------------ #

    def record_health_snapshot(
        self,
        project_id: str,
        *,
        status: str,
        score: Optional[float],
        evidence: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]],
    ) -> int:
        self._require(project_id)
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_health_snapshots(
                    project_id, status, score, evidence_json, contradictions_json, created_at)
                VALUES(?,?,?,?,?,?)
                """,
                (
                    project_id,
                    status,
                    score,
                    self.store._j(evidence),
                    self.store._j(contradictions),
                    iso(self._clock()),
                ),
            )
        return int(cur.lastrowid)

    def latest_health(self, project_id: str) -> Optional[Dict[str, Any]]:
        row = self.store._conn.execute(
            "SELECT * FROM project_health_snapshots WHERE project_id=?"
            " ORDER BY id DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "project_id": row["project_id"],
            "status": row["status"],
            "score": row["score"],
            "evidence": self.store._uj(row["evidence_json"], []),
            "contradictions": self.store._uj(row["contradictions_json"], []),
            "created_at": row["created_at"],
        }

    # ------------------------------------------------------------------ #
    # Cycles                                                             #
    # ------------------------------------------------------------------ #

    def cycle_start(
        self,
        project_id: str,
        *,
        trigger_type: str,
        trigger_ref: Optional[str],
        idempotency_key: Optional[str],
    ) -> int:
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_cycles(project_id, trigger_type, trigger_ref,
                                           idempotency_key, state, started_at)
                VALUES(?,?,?,?, 'running', ?)
                """,
                (project_id, trigger_type, trigger_ref, idempotency_key, iso(self._clock())),
            )
        return int(cur.lastrowid)

    def cycle_finish(
        self,
        cycle_id: int,
        *,
        state: str,
        summary: str,
    ) -> None:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_cycles SET state=?, summary=?, completed_at=? WHERE id=?",
                (state, summary, iso(self._clock()), cycle_id),
            )

    def recent_cycles(self, project_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM project_cycles WHERE project_id=? ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "trigger_type": r["trigger_type"],
                "state": r["state"],
                "started_at": r["started_at"],
                "completed_at": r["completed_at"],
                "summary": r["summary"],
            }
            for r in rows
        ]

    def cycles_since(self, project_id: str, since: str) -> int:
        row = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_cycles WHERE project_id=? AND started_at >= ?",
            (project_id, since),
        ).fetchone()
        return int(row["n"])

    # ------------------------------------------------------------------ #
    # Initiatives                                                        #
    # ------------------------------------------------------------------ #

    def propose_initiative(
        self,
        project_id: str,
        *,
        title: str,
        rationale: str,
        expected_outcome: str = "",
        risk: str = "low",
        dedupe_key: Optional[str] = None,
        source_cycle_id: Optional[int] = None,
        validation_contract: Optional[Dict[str, Any]] = None,
        requires_approval: Optional[bool] = None,
        priority: int = 0,
    ) -> Dict[str, Any]:
        """Create a bounded change proposal.

        Enforces anti-busywork controls:
        - evidence-bearing rationale required;
        - dedupe against active/recent initiatives by exact key;
        - suppression windows after rejection;
        - per-project concurrency cap on open initiatives.
        """
        row = self._require(project_id)
        if not rationale.strip():
            raise ServiceError("initiative requires a rationale (anti-busywork rule)")

        settings = self.settings(project_id)
        auto_approve_below_risk = settings["policies"]["release"].get(
            "auto_approve_below_risk"
        )
        if requires_approval is None:
            requires_approval = True  # V1 default: everything needs approval

        dk = dedupe_key or f"{title.strip().lower()[:80]}"

        open_states = (
            InitiativeStatus.PROPOSED.value,
            InitiativeStatus.PENDING_APPROVAL.value,
            InitiativeStatus.APPROVED.value,
            InitiativeStatus.EXECUTING.value,
        )
        approval_state = (
            ApprovalState.PENDING.value if requires_approval else ApprovalState.NOT_REQUIRED.value
        )
        status = (
            InitiativeStatus.PENDING_APPROVAL.value
            if requires_approval
            else InitiativeStatus.APPROVED.value
        )

        # ALL anti-busywork checks + insert run inside ONE BEGIN IMMEDIATE tx:
        # writers are serialised, so dedupe/cap decisions cannot race.
        with self.store.tx() as cx:
            suppressed = cx.execute(
                "SELECT suppressed_until, reason FROM initiative_suppression"
                " WHERE project_id=? AND dedupe_key=?",
                (project_id, dk),
            ).fetchone()
            if suppressed and suppressed["suppressed_until"] > iso(self._clock()):
                raise ServiceError(
                    f"initiative '{dk}' is suppressed until"
                    f" {suppressed['suppressed_until']} ({suppressed['reason']})"
                )
            dup = cx.execute(
                f"SELECT ref FROM project_initiatives WHERE project_id=? AND dedupe_key=?"
                f" AND status IN ({','.join('?' * len(open_states))})",
                (project_id, dk, *open_states),
            ).fetchone()
            if dup:
                raise ServiceError(f"duplicate of open initiative {dup['ref']}")
            cap = int(settings["policies"].get("notification", {}).get("max_open_initiatives", 5))
            cap = int(settings["policies"]["verification"].get("max_open_initiatives", cap))
            open_count = cx.execute(
                f"SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?"
                f" AND status IN ({','.join('?' * len(open_states))})",
                (project_id, *open_states),
            ).fetchone()["n"]
            if open_count >= cap:
                raise ServiceError(
                    f"open-initiative cap reached ({cap}); resolve existing work first"
                )
            slug = "".join(ch for ch in project_id.upper() if ch.isalnum())[:8] or "PROJ"
            n = int(cx.execute(
                "SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?",
                (project_id,),
            ).fetchone()["n"]) + 1
            while True:
                ref = f"INIT-{slug}-{n:04d}"
                try:
                    cx.execute(
                        """
                        INSERT INTO project_initiatives(
                            ref, project_id, title, rationale, expected_outcome, risk,
                            status, approval_state, priority, dedupe_key, source_cycle_id,
                            validation_contract_json, created_at)
                        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            ref,
                            project_id,
                            title,
                            rationale,
                            expected_outcome,
                            risk,
                            status,
                            approval_state,
                            priority,
                            dk,
                            source_cycle_id,
                            self.store._j(validation_contract or {}),
                            iso(self._clock()),
                        ),
                    )
                    break
                except sqlite3.IntegrityError:
                    n += 1  # concurrent writer took this number; bump and retry
        self.store.audit(
            actor="system",
            interface="cycle",
            action="initiative.proposed",
            subject=ref,
            detail={"title": title, "risk": risk, "dedupe_key": dk},
        )
        return self.initiative_by_ref(ref)

    def _next_ref(self, project_id: str) -> str:
        slug = "".join(ch for ch in project_id.upper() if ch.isalnum())[:8] or "PROJ"
        row = self.store._conn.execute(
            "SELECT COUNT(*) AS n FROM project_initiatives WHERE project_id=?",
            (project_id,),
        ).fetchone()
        n = int(row["n"]) + 1
        while True:
            ref = f"INIT-{slug}-{n:04d}"
            exists = self.store._conn.execute(
                "SELECT 1 FROM project_initiatives WHERE ref=?", (ref,)
            ).fetchone()
            if not exists:
                return ref
            n += 1

    def initiative_by_ref(self, ref: str) -> Dict[str, Any]:
        r = self.store._conn.execute(
            "SELECT * FROM project_initiatives WHERE ref=?", (ref,)
        ).fetchone()
        if r is None:
            raise ServiceError(f"no such initiative '{ref}'")
        return self._initiative_row(r)

    def _initiative_row(self, r: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": r["id"],
            "ref": r["ref"],
            "project_id": r["project_id"],
            "title": r["title"],
            "rationale": r["rationale"],
            "expected_outcome": r["expected_outcome"],
            "risk": r["risk"],
            "status": r["status"],
            "approval_state": r["approval_state"],
            "priority": r["priority"],
            "dedupe_key": r["dedupe_key"],
            "source_cycle_id": r["source_cycle_id"],
            "board_slug": r["board_slug"],
            "validation_contract": self.store._uj(r["validation_contract_json"], {}),
            "outcome": self.store._uj(r["outcome_json"], {}),
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
        }

    def initiatives(self, project_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        self._require_known(project_id)
        sql = "SELECT * FROM project_initiatives WHERE project_id=?"
        args: List[Any] = [project_id]
        if status:
            sql += " AND status=?"
            args.append(status)
        sql += " ORDER BY priority DESC, id ASC"
        rows = self.store._conn.execute(sql, tuple(args)).fetchall()
        return [self._initiative_row(r) for r in rows]

    def approve_initiative(self, ref: str, *, actor: str, interface: str) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] != InitiativeStatus.PENDING_APPROVAL.value:
            raise ServiceError(
                f"initiative {ref} is not pending approval (status={ini['status']})"
            )
        with self.store.tx() as cx:
            res = cx.execute(
                "UPDATE project_initiatives SET status='approved',"
                " approval_state='approved' WHERE ref=? AND status='pending_approval'",
                (ref,),
            )
            if res.rowcount != 1:
                raise ServiceError(f"initiative {ref} changed state concurrently")
        self.store.audit(
            actor=actor,
            interface=interface,
            action="initiative.approved",
            subject=ref,
        )
        return self.initiative_by_ref(ref)

    def reject_initiative(
        self,
        ref: str,
        *,
        actor: str,
        interface: str,
        suppress_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] not in (InitiativeStatus.PENDING_APPROVAL.value, InitiativeStatus.PROPOSED.value):
            raise ServiceError(f"initiative {ref} cannot be rejected from status={ini['status']}")
        days = suppress_days if suppress_days is not None else self.default_suppression_days
        # Legacy/demo imports created before dedupe enforcement may have NULL
        # keys. Reconstruct the same fallback propose_initiative uses so a
        # rejection remains atomic and still suppresses the repeated proposal.
        dedupe_key = ini["dedupe_key"] or ini["title"].strip().lower()[:80] or ref.lower()
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status='rejected',"
                " approval_state='rejected', dedupe_key=? WHERE ref=?",
                (dedupe_key, ref),
            )
            cx.execute(
                """
                INSERT INTO initiative_suppression(project_id, dedupe_key,
                    suppressed_until, reason)
                VALUES(?,?,?,?)
                ON CONFLICT(project_id, dedupe_key) DO UPDATE SET
                    suppressed_until=excluded.suppressed_until,
                    reason=excluded.reason
                """,
                (
                    ini["project_id"],
                    dedupe_key,
                    iso(self._clock() + timedelta(days=days)),
                    "rejected",
                ),
            )
        self.store.audit(
            actor=actor, interface=interface, action="initiative.rejected", subject=ref,
            detail={"suppression_days": days},
        )
        return self.initiative_by_ref(ref)

    def start_execution(self, ref: str) -> Dict[str, Any]:
        ini = self.initiative_by_ref(ref)
        if ini["status"] != InitiativeStatus.APPROVED.value:
            raise ServiceError(f"initiative {ref} is not approved (status={ini['status']})")
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status='executing' WHERE ref=?", (ref,)
            )
        self.store.audit(actor="system", interface="kanban_bridge", action="initiative.execution_started", subject=ref)
        return self.initiative_by_ref(ref)

    def complete_initiative(
        self,
        ref: str,
        *,
        outcome: Dict[str, Any],
        regressed: bool = False,
    ) -> Dict[str, Any]:
        new_status = InitiativeStatus.REGRESSED.value if regressed else InitiativeStatus.COMPLETED.value
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET status=?, outcome_json=?, completed_at=?"
                " WHERE ref=?",
                (new_status, self.store._j(outcome), iso(self._clock()), ref),
            )
        self.store.audit(
            actor="system",
            interface="outcome_evaluator",
            action="initiative.completed" if not regressed else "initiative.regressed",
            subject=ref,
            detail=outcome,
        )
        return self.initiative_by_ref(ref)

    def bind_board(self, ref: str, board_slug: str) -> Dict[str, Any]:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE project_initiatives SET board_slug=? WHERE ref=?", (board_slug, ref)
            )
        return self.initiative_by_ref(ref)

    # ------------------------------------------------------------------ #
    # Knowledge                                                          #
    # ------------------------------------------------------------------ #

    def add_knowledge(
        self,
        project_id: str,
        *,
        type: str,
        statement: str,
        source: str,
        confidence: float = 0.5,
        supersedes_id: Optional[int] = None,
    ) -> int:
        self._require(project_id)
        if type not in ("decision", "finding", "incident"):
            raise ServiceError(f"invalid knowledge type '{type}'")
        with self.store.tx() as cx:
            cur = cx.execute(
                """
                INSERT INTO project_knowledge(project_id, type, statement, source,
                                              confidence, supersedes_id, created_at)
                VALUES(?,?,?,?,?,?,?)
                """,
                (project_id, type, statement, source, confidence, supersedes_id, iso(self._clock())),
            )
        return int(cur.lastrowid)

    def knowledge(self, project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.store._conn.execute(
            "SELECT * FROM project_knowledge WHERE project_id=? ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------ #
    # Gateway permissions                                                #
    # ------------------------------------------------------------------ #

    def set_gateway_permission(
        self,
        project_id: str,
        *,
        platform: str,
        sender_id: str,
        can_approve: bool = False,
        can_trigger: bool = False,
    ) -> Dict[str, Any]:
        self._require(project_id)
        with self.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO gateway_permissions(project_id, platform, sender_id,
                                                can_approve, can_trigger)
                VALUES(?,?,?,?,?)
                ON CONFLICT(project_id, platform, sender_id) DO UPDATE SET
                    can_approve=excluded.can_approve,
                    can_trigger=excluded.can_trigger
                """,
                (project_id, platform, sender_id, int(can_approve), int(can_trigger)),
            )
        self.store.audit(
            actor="admin",
            interface="gateway",
            action="gateway.permission_set",
            subject=f"{project_id}:{platform}:{sender_id}",
            detail={"can_approve": can_approve, "can_trigger": can_trigger},
        )
        return {"project_id": project_id, "platform": platform, "sender_id": sender_id,
                "can_approve": can_approve, "can_trigger": can_trigger}

    def gateway_permission(
        self, project_id: str, *, platform: str, sender_id: str
    ) -> Dict[str, bool]:
        row = self.store._conn.execute(
            "SELECT can_approve, can_trigger FROM gateway_permissions"
            " WHERE project_id=? AND platform=? AND sender_id=?",
            (project_id, platform, sender_id),
        ).fetchone()
        if row is None:
            return {"can_approve": False, "can_trigger": False}
        return {"can_approve": bool(row["can_approve"]), "can_trigger": bool(row["can_trigger"])}


__all__ = ["StewardshipService", "ServiceError"]
