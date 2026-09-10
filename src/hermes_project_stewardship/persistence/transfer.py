"""PM-0108/0109/0110: work-transfer contracts — preview fingerprints,
eligibility filtering and the durable idempotent transfer saga.

Never claims cross-database atomicity: intent and per-item outcomes are
journalled in Stewardship before any host write; membership stays
`departure_pending` until canonical readback proves every eligible outcome.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional

from ..domain.constants import OperationState, TransferEligibility
from .store import Store, iso


def preview_fingerprint(
    *,
    project_id: str,
    from_profile: str,
    to_profile: str,
    membership_revision: int,
    items: List[Dict[str, Any]],
) -> str:
    """PM-0109: deterministic fingerprint over board state, membership
    revision, the exact task set and their revisions."""

    normalised = sorted(
        (str(i.get("id")), int(i.get("revision") or 0), str(i.get("status") or ""))
        for i in items
    )
    payload = json.dumps(
        {
            "project": project_id,
            "from": from_profile,
            "to": to_profile,
            "membership_revision": int(membership_revision),
            "items": normalised,
        },
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class TaskStateConflict(RuntimeError):
    """Fix 3: canonical state no longer matches the transfer preconditions."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class TransferSaga:
    """Durable, idempotent, resumable reassignment saga.

    Per item: journal intent -> CONDITIONAL host assign -> canonical
    readback -> outcome. Claimed/running items remain pending (never
    transferred until a later retry). A replay with the same idempotency key returns the
    recorded outcome without touching the host again.

    Fix 3: the host contract is `assign_task_if_unchanged(task_id,
    from_profile, to_profile, guard)` — the host re-verifies assignee,
    status eligibility and claim-lock absence atomically at write time.
    Fix 4: a host that already applied the assignment (lost response) is
    recognised as completed via the canonical readback, never skipped.
    """

    def __init__(self, store: Store, host: Any, *, clock=None) -> None:
        self.store = store
        self.host = host
        self._clock = clock or store._clock
        # Fix 3: the conditional operation is required; unrestricted
        # assign_task is never used by the saga.
        if not hasattr(self.host, "assign_task_if_unchanged"):
            raise TypeError(
                "transfer host must implement assign_task_if_unchanged("
                "task_id, from_profile, to_profile, guard)"
            )

    def _conditional_guard(self, item_id: str, *, from_profile: str, to_profile: str, expected_revision: int) -> Dict[str, Any]:
        """Snapshot the preconditions the host must re-verify atomically."""
        return {
            "expect_assignee": from_profile,
            "allow_unassigned": False,   # fix 3: unassigned work is not captured
            "eligible_statuses": sorted(TransferEligibility.ELIGIBLE_STATUSES),
            "claim_lock_absent": True,
            "expected_revision": expected_revision,
        }

    # ------------------------------------------------------------------ #
    # Execution                                                          #
    # ------------------------------------------------------------------ #

    def execute(
        self,
        *,
        op_id: str,
        idempotency_key: str,
        project_id: str,
        from_profile: str,
        to_profile: str,
        items: List[Dict[str, Any]],
        membership: Any = None,
    ) -> Dict[str, Any]:
        # Fix 6: conflicting reuse of op_id or idempotency key is rejected
        # BEFORE any replay lookup.
        self._reject_conflicting_reuse(op_id, idempotency_key, project_id, from_profile, to_profile, items)
        replayed = self._replay(idempotency_key, op_id=op_id)
        if replayed is not None:
            return replayed

        eligible: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []
        for item in items:
            # Metadata preserved here so blocked/skipped rows retain full context.
            meta = {
                "id": str(item.get("id")),
                "revision": int(item.get("revision") or 0),
                "status": str(item.get("status") or ""),
                "kind": str(item.get("kind") or "task"),
            }
            if not TransferEligibilityFilter.is_eligible(item):
                meta["reason"] = (
                    "claimed_or_running"
                    if str(item.get("status")) in {"claimed", "running"}
                    else "not_eligible"
                )
                skipped.append(meta)
                continue
            # Fix 6: pre-assign canonical verification — the task must still
            # belong to from_profile (or nobody) and remain eligible.
            try:
                current = self._readback(str(item["id"]))
            except Exception as error:  # noqa: BLE001 - unreadable remains retryable
                meta["reason"] = f"unreadable:{str(error)[:120]}"
                skipped.append(meta)
                continue
            assignee = str(current.get("assignee") or "")
            status = str(current.get("status") or "")
            if not assignee:
                meta["reason"] = "unassigned_work_not_captured"
                skipped.append(meta)
                continue
            if assignee and assignee != from_profile:
                meta["reason"] = f"assignee_changed:{assignee}"
                skipped.append(meta)
                continue
            if not TransferEligibility.is_eligible(status):
                meta["reason"] = (
                    "claimed_or_running"
                    if status in {"claimed", "running"}
                    else f"not_eligible:{status}"
                )
                skipped.append(meta)
                continue
            eligible.append(item)

        # Membership and journal are committed together below.

        now = iso(self._clock())
        with self.store.tx() as cx:
            cx.execute(
                "INSERT INTO operation_journal(op_id, idempotency_key, kind, state,"
                " project_id, payload_hash, payload_json, created_at, updated_at)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (
                    op_id,
                    idempotency_key,
                    "work_transfer",
                    OperationState.RUNNING.value,
                    project_id,
                    _payload_hash(project_id, from_profile, to_profile, items),
                    self.store._j({
                        "from": from_profile,
                        "to": to_profile,
                        "fingerprint_items": [
                            {"id": str(i.get("id")), "revision": int(i.get("revision") or 0)}
                            for i in items
                        ],
                    }),
                    now,
                    now,
                ),
            )
            if membership is not None:
                membership.set_state_in_tx(cx, project_id, from_profile, "departure_pending")
            for item in eligible:
                cx.execute(
                    "INSERT INTO operation_items(op_id, item_id, item_kind, revision,"
                    " status, outcome, updated_at) VALUES(?,?,?,?,?,?,?)",
                    (
                        op_id,
                        str(item["id"]),
                        str(item.get("kind") or "task"),
                        int(item.get("revision") or 0),
                        str(item.get("status") or ""),
                        "pending",
                        now,
                    ),
                )
            for item in skipped:
                cx.execute(
                    "INSERT INTO operation_items(op_id, item_id, item_kind, revision,"
                    " status, outcome, detail, updated_at) VALUES(?,?,?,?,?,?,?,?)",
                    (
                        op_id,
                        str(item["id"]),
                        str(item.get("kind") or "task"),
                        int(item.get("revision") or 0),
                        str(item.get("status") or ""),
                        "pending" if _retryable_blocker(item["reason"]) else "skipped",
                        item["reason"],
                        now,
                    ),
                )

        completed = 0
        failures: List[Dict[str, Any]] = []
        for item in eligible:
            item_id = str(item["id"])
            try:
                # Fix 3: the conditional host operation is the ONLY path —
                # no unrestricted assign_task after a separate pre-check.
                guard = self._conditional_guard(
                    item_id, from_profile=from_profile, to_profile=to_profile,
                    expected_revision=int(item.get("revision") or 0),
                )
                self.host.assign_task_if_unchanged(item_id, from_profile, to_profile, guard)
                record = self._readback(item_id)
                assignee = str(record.get("assignee") or "")
                if assignee != to_profile:
                    raise RuntimeError(f"canonical readback shows assignee '{assignee or None}'")
                outcome, detail = "completed", ""
                completed += 1
            except TaskStateConflict as conflict:
                # Canonical precondition conflicts are retryable; unassigned
                # work is the deliberate terminal exception.
                detail = getattr(conflict, "reason", "precondition_violated")
                outcome = "skipped" if detail == "unassigned_work_not_captured" else "pending"
                self._record_outcome(op_id, item_id, outcome, detail)
                if outcome == "skipped":
                    skipped.append(_item_metadata(item, reason=detail))
                continue
            except Exception as error:  # noqa: BLE001 - saga records every failure
                outcome, detail = "failed", str(error)[:500]
                failures.append({"id": item_id, "detail": detail})
            self._record_outcome(op_id, item_id, outcome, detail)

        # Fix 5: unresolved blockers (claimed/running etc.) keep the
        # operation visibly pending — never completed.
        unresolved_blockers = [
            sk for sk in skipped if _retryable_blocker(sk["reason"])
        ]
        totals_after = self._totals(op_id)
        if failures:
            final_state = (
                OperationState.FAILED if completed == 0 else OperationState.RUNNING
            )
        elif unresolved_blockers or totals_after["pending"]:
            final_state = OperationState.RUNNING
        else:
            final_state = OperationState.COMPLETED
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE operation_journal SET state=?, updated_at=? WHERE op_id=?",
                (final_state.value, iso(self._clock()), op_id),
            )

        # Fix 6: membership resolves to departed only when the transfer is
        # complete with zero blockers; claimed/running (or any failure)
        # keeps the member at departure_pending.
        if membership is not None and final_state == OperationState.COMPLETED:
            membership.set_state(project_id, from_profile, "departed")

        return {
            "op_id": op_id,
            "state": final_state.value,
            "completed_items": completed,
            "skipped_items": skipped,
            "failed_items": failures,
        }

    def _reject_conflicting_reuse(
        self, op_id: str, idempotency_key: str, project_id: str,
        from_profile: str, to_profile: str, items: List[Dict[str, Any]],
    ) -> None:
        """Reject reuse of op_id or idempotency_key with a different payload."""
        fingerprint = _payload_hash(project_id, from_profile, to_profile, items)
        for column, value in (("op_id", op_id), ("idempotency_key", idempotency_key)):
            row = self.store._conn.execute(
                f"SELECT payload_hash FROM operation_journal WHERE {column}=?",
                (value,),
            ).fetchone()
            if row is not None and row["payload_hash"] != fingerprint:
                raise ValueError(
                    f"{column} '{value}' was already used for a different operation payload"
                )

    def retry(self, op_id: str, *, membership: Any = None) -> Dict[str, Any]:
        """Resumable retry: only pending/failed items are re-attempted.

        Fix 4: a task whose canonical assignee is ALREADY to_profile is
        recognised as completed (lost host response), never skipped.
        Fix 5: membership resolves to departed only when every journalled
        item is completed; claimed/running blockers or failures keep the
        operation and membership visibly pending.
        """
        journal = self._journal(op_id)
        if journal is None:
            raise KeyError(op_id)
        payload = self.store._uj(journal["payload_json"], {})
        item_rows = self.store._conn.execute(
            "SELECT * FROM operation_items WHERE op_id=? AND outcome IN ('pending','failed')",
            (op_id,),
        ).fetchall()
        to_profile = str(payload.get("to") or "")
        from_profile = str(payload.get("from") or "")
        completed = 0
        failures: List[Dict[str, Any]] = []
        for row in item_rows:
            item_id = row["item_id"]
            # Fix 4: lost-response recognition BEFORE any write — an
            # already-transferred task is completed, not re-attempted.
            try:
                current = self._readback(item_id)
            except Exception as error:  # noqa: BLE001
                detail = f"unreadable:{str(error)[:500]}"
                failures.append({"id": item_id, "detail": detail})
                self._record_outcome(op_id, item_id, "pending", detail)
                continue
            assignee = str(current.get("assignee") or "")
            status = str(current.get("status") or "")
            if assignee == to_profile:
                # Fix 4: the host already committed this assignment.
                self._record_outcome(op_id, item_id, "completed", "")
                completed += 1
                continue
            if assignee and assignee != from_profile:
                self._record_outcome(op_id, item_id, "skipped", f"assignee_changed:{assignee}")
                continue
            if not TransferEligibility.is_eligible(status):
                if _retryable_status(status, assignee=assignee, from_profile=from_profile):
                    self._record_outcome(op_id, item_id, "pending", _status_reason(status))
                else:
                    self._record_outcome(
                        op_id, item_id, "skipped",
                        f"not_eligible:{status}",
                    )
                continue
            try:
                guard = self._conditional_guard(
                    item_id, from_profile=from_profile, to_profile=to_profile,
                    expected_revision=int(row["revision"] or 0),
                )
                self.host.assign_task_if_unchanged(item_id, from_profile, to_profile, guard)
                record = self._readback(item_id)
                if str(record.get("assignee") or "") != to_profile:
                    raise RuntimeError("canonical readback mismatch after retry")
                self._record_outcome(op_id, item_id, "completed", "")
                completed += 1
            except TaskStateConflict as conflict:
                self._record_outcome(op_id, item_id, "pending", getattr(conflict, "reason", "precondition_violated"))
            except Exception as error:  # noqa: BLE001
                failures.append({"id": item_id, "detail": str(error)[:500]})
                self._record_outcome(op_id, item_id, "failed", str(error)[:500])

        totals = self._totals(op_id)
        # Pending items are blockers if their reason is retryable.
        blockers = self._pending_blockers(op_id)
        if totals["failed"] == 0 and totals["pending"] == 0 and not blockers:
            final = OperationState.COMPLETED
        elif completed == 0 and totals["failed"] > 0:
            final = OperationState.FAILED
        else:
            final = OperationState.RUNNING
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE operation_journal SET state=?, updated_at=? WHERE op_id=?",
                (final.value, iso(self._clock()), op_id),
            )
        if membership is not None and final == OperationState.COMPLETED:
            membership.set_state(journal["project_id"], from_profile, "departed")
        return {
            "op_id": op_id,
            "state": final.value,
            "completed_items": totals["completed"],
            "failed_items": failures,
            "skipped_items": self._skipped(op_id),
        }

    # ------------------------------------------------------------------ #
    # Journalling                                                        #
    # ------------------------------------------------------------------ #

    def _replay(self, idempotency_key: str, *, op_id: str = "") -> Optional[Dict[str, Any]]:
        row = None
        if op_id:
            row = self.store._conn.execute(
                "SELECT * FROM operation_journal WHERE op_id=?", (op_id,)
            ).fetchone()
        if row is None:
            row = self.store._conn.execute(
                "SELECT * FROM operation_journal WHERE idempotency_key=?",
                (idempotency_key,),
            ).fetchone()
        if row is None:
            return None
        return {
            "op_id": row["op_id"],
            "state": row["state"],
            "completed_items": self._totals(row["op_id"])["completed"],
            "skipped_items": self._skipped(row["op_id"]),
            "failed_items": [
                {"id": r["item_id"], "detail": r["detail"]}
                for r in self.store._conn.execute(
                    "SELECT item_id, detail FROM operation_items"
                    " WHERE op_id=? AND outcome='failed'",
                    (row["op_id"],),
                ).fetchall()
            ],
        }

    def _journal(self, op_id: str):
        return self.store._conn.execute(
            "SELECT * FROM operation_journal WHERE op_id=?", (op_id,)
        ).fetchone()

    def _totals(self, op_id: str) -> Dict[str, int]:
        rows = self.store._conn.execute(
            "SELECT outcome, COUNT(*) AS n FROM operation_items WHERE op_id=? GROUP BY outcome",
            (op_id,),
        ).fetchall()
        totals = {r["outcome"]: r["n"] for r in rows}
        return {
            "completed": totals.get("completed", 0),
            "failed": totals.get("failed", 0),
            "pending": totals.get("pending", 0),
            "skipped": totals.get("skipped", 0),
        }

    def _skipped(self, op_id: str) -> List[Dict[str, Any]]:
        return [
            _item_metadata(
                r,
                reason=r["detail"] or "not_eligible",
                persisted=True,
            )
            for r in self.store._conn.execute(
                "SELECT item_id, item_kind, revision, status, detail "
                "FROM operation_items WHERE op_id=? AND outcome='skipped'",
                (op_id,),
            ).fetchall()
        ]

    def _pending_blockers(self, op_id: str) -> List[Dict[str, Any]]:
        """Pending items that are retryable blockers by reason."""
        return [
            {"id": r["item_id"], "reason": r["detail"] or "unknown"}
            for r in self.store._conn.execute(
                "SELECT item_id, detail FROM operation_items WHERE op_id=? AND outcome='pending'",
                (op_id,),
            ).fetchall()
            if _retryable_blocker(r["detail"])
        ]

    def _record_outcome(self, op_id: str, item_id: str, outcome: str, detail: str) -> None:
        with self.store.tx() as cx:
            cx.execute(
                "UPDATE operation_items SET outcome=?, detail=?, updated_at=?"
                " WHERE op_id=? AND item_id=?",
                (outcome, detail, iso(self._clock()), op_id, item_id),
            )

    def _readback(self, item_id: str) -> Dict[str, Any]:
        envelope = self.host.get_task(item_id)
        record = envelope.get("task", envelope) if isinstance(envelope, dict) else {}
        return record or {}


# Import at module bottom to avoid a forward reference in annotations.


class TransferEligibilityFilter:
    """Adapter so saga items (dicts) use the domain eligibility rules."""

    @staticmethod
    def is_eligible(item: Dict[str, Any]) -> bool:
        if str(item.get("kind") or "task").lower() == "epic":
            return False
        return TransferEligibility.is_eligible(str(item.get("status") or ""))

def _item_metadata(item: Dict[str, Any], *, reason: str, persisted: bool = False) -> Dict[str, Any]:
    """Return the complete original metadata for an item outcome."""
    if persisted:
        return {
            "id": str(item["item_id"]),
            "revision": int(item["revision"]),
            "status": str(item["status"] or ""),
            "kind": str(item["item_kind"] or "task"),
            "reason": reason,
        }
    return {
        "id": str(item.get("id")),
        "revision": int(item.get("revision") or 0),
        "status": str(item.get("status") or ""),
        "kind": str(item.get("kind") or "task"),
        "reason": reason,
    }


def _retryable_status(status: str, *, assignee: str, from_profile: str) -> bool:
    return status in {"claimed", "running"} or (status == "scheduled" and assignee == from_profile)


def _status_reason(status: str) -> str:
    return "claimed_or_running" if status in {"claimed", "running"} else f"retryable:{status}"


def _retryable_blocker(reason: str) -> bool:
    text = str(reason or "")
    return (
        text == "claimed_or_running"
        or text.startswith("retryable:")
        or text.startswith("unreadable:")
        or text.startswith("assignee_changed:")
        or text.startswith("precondition")
    )


def _payload_hash(
    project_id: str, from_profile: str, to_profile: str, items: List[Dict[str, Any]]
) -> str:
    normalised = sorted(
        (str(i.get("id")), int(i.get("revision") or 0), str(i.get("status") or ""))
        for i in items
    )
    payload = json.dumps(
        {"project": project_id, "from": from_profile, "to": to_profile, "items": normalised},
        sort_keys=True, separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
