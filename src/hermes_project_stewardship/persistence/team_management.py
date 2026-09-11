"""Phase 4 project-team reads and durable canonical work transfer orchestration."""
from __future__ import annotations

import json
import uuid
from typing import Any

from ..domain.constants import TransferEligibility
from .membership import MembershipService
from .service import ServiceError, StewardshipService
from .store import Store
from .transfer import TransferSaga, preview_fingerprint


class PreviewConflict(RuntimeError):
    """A transfer preview is stale, incomplete, or does not match execution scope."""


class _PendingDeparture:
    """Let the saga open departure atomically but reserve final departure for a scope recheck."""

    def __init__(self, membership: MembershipService) -> None:
        self.membership = membership

    def set_state_in_tx(self, cx, project_id: str, profile_slug: str, state: str) -> None:
        self.membership.set_state_in_tx(cx, project_id, profile_slug, state)

    def set_state(self, project_id: str, profile_slug: str, state: str) -> None:
        if state != "departed":
            self.membership.set_state(project_id, profile_slug, state)


class TeamManagementService:
    """Composes existing membership, revision, authority and saga contracts."""

    def __init__(
        self,
        store: Store,
        stewardship: StewardshipService,
        membership: MembershipService,
        host: Any,
    ) -> None:
        self.store = store
        self.stewardship = stewardship
        self.membership = membership
        self.host = host

    def _profiles(self) -> dict[str, dict[str, Any]]:
        profiles = self.host.list_profiles()
        return {
            str(p.get("slug") or p.get("id") or p.get("name")): dict(p)
            for p in profiles
            if p.get("slug") or p.get("id") or p.get("name")
        }

    def _items(self, project_id: str) -> list[dict[str, Any]]:
        items = self.host.list_work(project_id)
        if not isinstance(items, list):
            raise PreviewConflict("incomplete canonical work enumeration")
        return [dict(item) for item in items]

    def team(self, project_id: str) -> dict[str, Any]:
        profiles = self._profiles()
        items = self._items(project_id)
        members = []
        for member in self.membership.list_members(project_id):
            owned = [i for i in items if str(i.get("assignee") or "") == member.profile_slug]
            by_status: dict[str, int] = {}
            for item in owned:
                status = str(item.get("status") or "unknown")
                by_status[status] = by_status.get(status, 0) + 1
            profile = profiles.get(member.profile_slug)
            members.append({
                **member.__dict__,
                "hermes_available": bool(profile and profile.get("available", True)),
                "profile": profile,
                "workload": {"total": len(owned), "by_status": by_status},
            })
        return {
            "project_id": project_id,
            "membership_revision": self.membership.membership_revision(project_id),
            "members": members,
            "work_item_count": len(items),
            "complete": True,
        }

    def require_available_profile(self, slug: str) -> dict[str, Any]:
        profile = self._profiles().get(str(slug))
        if profile is None or not profile.get("available", True):
            raise ServiceError(f"Hermes profile '{slug}' is unavailable")
        return profile

    def add_member(self, project_id: str, slug: str, *, actor: str):
        self.require_available_profile(slug)
        return self.membership.add_member(project_id, slug, actor=actor)

    def transfer_lead(self, project_id: str, slug: str, *, actor: str):
        self.require_available_profile(slug)
        return self.membership.transfer_lead(project_id, slug, actor=actor)

    @staticmethod
    def _reason(item: dict[str, Any]) -> str | None:
        kind = str(item.get("kind") or item.get("task_kind") or "task").lower()
        status = str(item.get("status") or "")
        if kind == "epic":
            return "epic_assignment_unsupported"
        if status in {"claimed", "running"} or item.get("current_run_id"):
            return "claimed_or_running"
        if not TransferEligibility.is_eligible(status):
            return f"not_eligible:{status}"
        return None

    def preview(self, project_id: str, from_profile: str, to_profile: str) -> dict[str, Any]:
        if from_profile == to_profile:
            raise ServiceError("source and destination profiles must differ")
        self.require_available_profile(to_profile)
        members = {m.profile_slug: m for m in self.membership.list_members(project_id)}
        if from_profile not in members or to_profile not in members:
            raise ServiceError("transfer profiles must both be active project members")
        all_items = [i for i in self._items(project_id) if str(i.get("assignee") or "") == from_profile]
        eligible: list[dict[str, Any]] = []
        excluded: list[dict[str, Any]] = []
        for item in all_items:
            item.setdefault("kind", item.get("task_kind") or "task")
            item.setdefault("revision", 0)
            reason = self._reason(item)
            if reason is None:
                eligible.append(item)
            else:
                excluded.append({**item, "reason": reason})
        revision = self.membership.membership_revision(project_id)
        fingerprint = preview_fingerprint(
            project_id=project_id,
            from_profile=from_profile,
            to_profile=to_profile,
            membership_revision=revision,
            items=all_items,
        )
        return {
            "project_id": project_id,
            "from_profile": from_profile,
            "to_profile": to_profile,
            "membership_revision": revision,
            "complete": True,
            "enumerated_count": len(all_items),
            "eligible_items": eligible,
            "excluded_items": excluded,
            "fingerprint": fingerprint,
        }

    def _validated_selection(
        self, project_id: str, from_profile: str, to_profile: str,
        fingerprint: str, selected_ids: list[str] | None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        current = self.preview(project_id, from_profile, to_profile)
        if not fingerprint or current["fingerprint"] != fingerprint:
            raise PreviewConflict("stale transfer preview; refresh and confirm the exact scope")
        eligible = current["eligible_items"]
        if selected_ids is None:
            return current, eligible
        requested = list(dict.fromkeys(str(v) for v in selected_ids))
        by_id = {str(i["id"]): i for i in eligible}
        if not requested or any(item_id not in by_id for item_id in requested):
            raise PreviewConflict("selected work is not an exact eligible subset of the preview")
        return current, [by_id[item_id] for item_id in requested]

    def _execute(
        self, project_id: str, from_profile: str, to_profile: str, *,
        fingerprint: str, selected_ids: list[str] | None,
        idempotency_key: str, actor: str, departure: bool,
    ) -> dict[str, Any]:
        current, selected = self._validated_selection(
            project_id, from_profile, to_profile, fingerprint, selected_ids
        )
        if departure and selected_ids is not None:
            raise PreviewConflict("member departure requires all eligible assignments")
        if departure and current["excluded_items"]:
            raise PreviewConflict("member departure is blocked by excluded canonical work")
        op_id = "OP-" + uuid.uuid5(uuid.NAMESPACE_URL, f"{project_id}:{idempotency_key}").hex[:20]
        coordinator = _PendingDeparture(self.membership) if departure else None
        result = TransferSaga(self.store, self.host).execute(
            op_id=op_id,
            idempotency_key=idempotency_key,
            project_id=project_id,
            from_profile=from_profile,
            to_profile=to_profile,
            items=selected,
            membership=coordinator,
            defer_completion=departure,
            initiating_actor=actor,
        )
        if departure:
            self._audit_completed(op_id, actor)
            result = self._finish_departure_if_scope_unchanged(
                result, project_id=project_id, from_profile=from_profile,
                to_profile=to_profile,
                approved_ids={str(item["id"]) for item in selected},
            )
        else:
            self._audit_completed(op_id, actor)
        return {**result, "total_items": len(selected), "departure": departure}

    def execute_departure(self, project_id: str, from_profile: str, to_profile: str, **kwargs):
        return self._execute(project_id, from_profile, to_profile, departure=True, **kwargs)

    def execute_bulk(self, project_id: str, from_profile: str, to_profile: str, **kwargs):
        return self._execute(project_id, from_profile, to_profile, departure=False, **kwargs)

    def retry(self, op_id: str, *, actor: str) -> dict[str, Any]:
        journal = self.store._conn.execute(
            "SELECT project_id, payload_json FROM operation_journal WHERE op_id=?", (op_id,)
        ).fetchone()
        if journal is None:
            raise KeyError(op_id)
        payload = json.loads(journal["payload_json"])
        member = self.membership._row(journal["project_id"], payload["from"])
        coordinator = _PendingDeparture(self.membership) if member.state == "departure_pending" else None
        result = TransferSaga(self.store, self.host).retry(
            op_id, membership=coordinator,
            defer_completion=coordinator is not None,
        )
        if coordinator is not None:
            self._audit_completed(op_id, actor)
            approved_ids = {
                str(item.get("id")) for item in payload.get("fingerprint_items", [])
            }
            result = self._finish_departure_if_scope_unchanged(
                result, project_id=journal["project_id"],
                from_profile=payload["from"], to_profile=payload["to"],
                approved_ids=approved_ids,
            )
        else:
            self._audit_completed(op_id, actor)
        return result


    def _finish_departure_if_scope_unchanged(
        self, result: dict[str, Any], *, project_id: str,
        from_profile: str, to_profile: str, approved_ids: set[str],
    ) -> dict[str, Any]:
        items = self._items(project_id)
        by_id = {str(item["id"]): item for item in items}
        retained = sorted(
            str(item["id"])
            for item in items
            if str(item.get("assignee") or "") == from_profile
            and str(item["id"]) not in approved_ids
        )
        changed = sorted(
            item_id for item_id in approved_ids
            if item_id not in by_id
            or str(by_id[item_id].get("assignee") or "") != to_profile
        )
        if retained or changed:
            return {**result, "state": "running", "scope_changed": True,
                    "new_item_ids": retained, "changed_item_ids": changed}
        outcome_rows = self.store._conn.execute(
            "SELECT item_id, outcome FROM operation_items WHERE op_id=?",
            (result["op_id"],),
        ).fetchall()
        completed_ids = {
            str(row["item_id"])
            for row in outcome_rows
            if row["outcome"] == "completed"
        }
        journalled_ids = {str(row["item_id"]) for row in outcome_rows}
        effects_complete = (
            journalled_ids == approved_ids
            and completed_ids == approved_ids
        )
        if not effects_complete:
            return {
                **result,
                "state": "running",
                "scope_changed": False,
                "new_item_ids": [],
                "changed_item_ids": [],
                "outcome_incomplete": True,
                "missing_outcome_ids": sorted(approved_ids - completed_ids),
            }
        with self.store.tx() as cx:
            self.membership.set_state_in_tx(
                cx, project_id, from_profile, "departed"
            )
            cx.execute(
                "UPDATE operation_journal SET state='completed' WHERE op_id=?",
                (result["op_id"],),
            )
        return {**result, "state": "completed", "scope_changed": False,
                "new_item_ids": [], "changed_item_ids": [],
                "outcome_incomplete": False, "missing_outcome_ids": []}

    def operation(self, op_id: str) -> dict[str, Any]:
        journal = self.store._conn.execute(
            "SELECT * FROM operation_journal WHERE op_id=?", (op_id,)
        ).fetchone()
        if journal is None:
            raise KeyError(op_id)
        items = [dict(r) for r in self.store._conn.execute(
            "SELECT item_id, item_kind, revision, status, outcome, detail, updated_at FROM operation_items WHERE op_id=? ORDER BY item_id",
            (op_id,),
        ).fetchall()]
        payload = json.loads(journal["payload_json"])
        operation_actor = payload.get("initiating_actor")
        for item in items:
            audit = self.store._conn.execute(
                "SELECT actor, interface, action, subject, detail_json, ts FROM stewardship_audit_log "
                "WHERE action='workitem.reassigned' AND subject=? AND detail_json LIKE ? ORDER BY id DESC LIMIT 1",
                (item["item_id"], f'%\"operation\":\"{op_id}\"%'),
            ).fetchone()
            if audit is not None:
                audit_record = dict(audit)
                audit_record["detail"] = json.loads(audit_record.pop("detail_json"))
                item["audit"] = audit_record
                operation_actor = operation_actor or audit_record["actor"]
            else:
                item["audit"] = None
        return {
            "op_id": op_id,
            "state": journal["state"],
            "project_id": journal["project_id"],
            "actor": operation_actor,
            "operation_audit": {"operation": op_id, "actor": operation_actor},
            "items": items,
        }

    def _audit_completed(self, op_id: str, actor: str) -> None:
        for row in self.store._conn.execute(
            "SELECT item_id FROM operation_items WHERE op_id=? AND outcome='completed'", (op_id,)
        ).fetchall():
            marker = f'"operation":"{op_id}"'
            exists = self.store._conn.execute(
                "SELECT 1 FROM stewardship_audit_log WHERE action='workitem.reassigned' AND subject=? AND detail_json LIKE ?",
                (row["item_id"], f"%{marker}%"),
            ).fetchone()
            if exists is None:
                self.store.audit(actor=actor, interface="team_management", action="workitem.reassigned", subject=row["item_id"], detail={"operation": op_id})
