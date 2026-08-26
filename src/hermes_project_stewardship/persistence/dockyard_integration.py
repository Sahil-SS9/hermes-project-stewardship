"""G3 P2/P3: Dockyard ⇄ engine integration service.

Zero-CLI orchestration seam (PRD Gate G3): a dockyard work-item or
approved initiative flows proposal → approval → Kanban execution →
measured outcome entirely through this layer. Composes the stewardship
trust engine (verify/approve/measure) and KanbanBridge (execution)
without duplicating state (TE-01).
"""
from __future__ import annotations
import json

from typing import Any, Dict, Optional

from ..kanban.bridge import KanbanBridge
from ..dockyard import Actor, WorkItemStatus
from .dockyard_service import DockyardService
from .canonical_work_service import CanonicalWorkService
from .service import ServiceError, StewardshipService
from .store import iso


class IntegrationError(Exception):
    pass


class DockyardIntegration:
    """One object wiring dy + engine svc + bridge on the same Store."""

    def __init__(self, dy: DockyardService, svc: StewardshipService,
                 bridge: KanbanBridge,
                 canonical_work: CanonicalWorkService | None = None) -> None:
        self.dy = dy
        self.svc = svc
        self.bridge = bridge
        self.canonical_work = canonical_work

    # ------------------------------------------------------------------ #
    # Proposal → board (zero CLI)                                        #
    # ------------------------------------------------------------------ #

    def propose(self, project_id: str, *, title: str, rationale: str,
                actor: Actor, expected_outcome: str = "",
                risk: str = "low",
                validation_contract: Optional[Dict[str, Any]] = None,
                promote: bool = True) -> Dict[str, Any]:
        """Create an initiative via the trust engine, then mirror it onto
        the dockyard board as a first-class WorkItem."""
        try:
            ini = self.svc.propose_initiative(
                project_id, title=title, rationale=rationale,
                expected_outcome=expected_outcome, risk=risk,
                validation_contract=validation_contract)
        except ServiceError as e:
            raise IntegrationError(str(e)) from e

        result: Dict[str, Any] = {"initiative_ref": ini["ref"],
                                  "status": ini["status"]}
        if ini.get("requires_approval", True):
            result["awaiting_approval"] = True
            return result  # human gate — nothing further runs

        result.update(self._after_approval(ini, actor, promote))
        return result

    def approve(self, ref: str, *, actor: Actor) -> Dict[str, Any]:
        """Human approval, then promotion + execution start."""
        ini = self.svc.initiative_by_ref(ref)
        if ini["status"] == "pending_approval":
            try:
                ini = self.svc.approve_initiative(
                    ref,
                    actor=actor.id,
                    interface=f"dockyard:{actor.kind.value}",
                )
            except ServiceError as e:
                raise IntegrationError(str(e)) from e
        elif ini["status"] not in {"approved", "executing", "completed", "regressed"}:
            raise IntegrationError(
                f"initiative {ref} cannot be approved from {ini['status']}"
            )
        if ini["status"] in {"executing", "completed", "regressed"}:
            return self._existing_execution(ini)
        out = {"initiative_ref": ref, "status": ini["status"]}
        out.update(self._after_approval(ini, actor, promote=True))
        return out

    def _after_approval(self, ini: Dict[str, Any], actor: Actor,
                        promote: bool) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        if promote and self.canonical_work is None:
            item = self.dy.promote_initiative(ini, actor=actor)
            out["work_item"] = item.ref
        bound = self.bridge.bind(ini["ref"], start_execution=True)
        if self.canonical_work is not None:
            for item_id in bound.get("card_ids") or []:
                self.canonical_work.metadata.bind_work(
                    ini["project_id"],
                    "task",
                    item_id,
                    initiative_ref=ini["ref"],
                    actor=actor,
                )
            out["work_item_refs"] = list(bound.get("card_ids") or [])
        out["board_slug"] = bound.get("board_slug")
        out["cards"] = len(bound.get("card_ids") or [])
        out["status"] = self.svc.initiative_by_ref(
            ini["ref"])["status"]
        return out

    def _existing_execution(self, ini: Dict[str, Any]) -> Dict[str, Any]:
        items = []
        if self.canonical_work is not None:
            items = [
                item["ref"]
                for item in self.canonical_work.list(ini["project_id"])
                if item.get("initiative_ref") == ini["ref"]
            ]
        return {
            "initiative_ref": ini["ref"],
            "status": ini["status"],
            "board_slug": ini.get("board_slug"),
            "work_item_refs": items,
        }

    # ------------------------------------------------------------------ #
    # Measured outcome loop-back (P3)                                    #
    # ------------------------------------------------------------------ #

    def complete_from_board(self, ref: str, *, outcome: Dict[str, Any],
                            regressed: bool = False,
                            actor: Optional[Actor] = None) -> Dict[str, Any]:
        """Finish execution, sync canonical work and schedule observation."""
        ini = self.svc.initiative_by_ref(ref)
        if ini["status"] not in {"completed", "regressed"}:
            self.bridge.complete_from_board(
                ref,
                outcome=outcome,
                regressed=regressed,
            )
            ini = self.svc.initiative_by_ref(ref)

        final_status = (WorkItemStatus.DONE if not regressed
                        else WorkItemStatus.BLOCKED)
        from ..dockyard import ActorKind as _AK
        effective_actor = actor or Actor(
            id="platform",
            display_name="platform",
            kind=_AK.BOT,
        )

        if self.canonical_work is not None:
            bound = [
                item
                for item in self.canonical_work.list(ini["project_id"])
                if item.get("initiative_ref") == ref
            ]
            for item in bound:
                if item["status"] != final_status.value:
                    self.canonical_work.transition(
                        ini["project_id"],
                        item["ref"],
                        final_status,
                        actor=effective_actor,
                    )
            primary_ref = bound[0]["ref"] if bound else ref
            observation = self._schedule_observation(ini, outcome, regressed)
            self.dy.a2a_send(
                "result",
                from_actor="platform",
                to_group=self._default_group(ini["project_id"]),
                payload={
                    "item_ref": primary_ref,
                    "outcome": "regressed" if regressed else "completed",
                },
                item_ref=primary_ref,
            )
            return {
                "initiative": ref,
                "engine_status": ini["status"],
                "work_item_refs": [item["ref"] for item in bound],
                "work_item_status": final_status.value,
                "observation_status": observation["status"],
                "observation_trigger": observation["trigger_key"],
            }

        promoted = self.dy.find_promoted(ini["project_id"], ref)
        if promoted is None:
            promoted = self.dy.promote_initiative(ini, actor=effective_actor)
        if promoted.id is None:
            raise IntegrationError("promoted twin not persisted")
        self.dy.dy.update_status(ini["project_id"], promoted.id, final_status)
        self.dy.a2a_send(
            "result",
            from_actor="platform",
            to_group=self._default_group(ini["project_id"]),
            payload={
                "item_ref": promoted.ref,
                "outcome": "regressed" if regressed else "completed",
            },
            item_ref=promoted.ref,
        )
        return {
            "initiative": ref,
            "engine_status": ini["status"],
            "work_item": promoted.ref,
            "work_item_status": final_status.value,
        }

    def _schedule_observation(
        self,
        initiative: Dict[str, Any],
        outcome: Dict[str, Any],
        regressed: bool,
    ) -> Dict[str, Any]:
        trigger_key = f"dockyard-observation:{initiative['ref']}"
        now = iso(self.svc.store._clock())
        with self.svc.store.tx() as cx:
            cx.execute(
                """
                INSERT INTO dockyard_observation_triggers(
                    initiative_ref,project_id,trigger_key,status,outcome_json,
                    regressed,cycle_id,created_at,updated_at)
                VALUES(?,?,?,?,?,?,NULL,?,?)
                ON CONFLICT(initiative_ref) DO UPDATE SET
                    outcome_json=excluded.outcome_json,
                    regressed=excluded.regressed,
                    updated_at=excluded.updated_at
                """,
                (
                    initiative["ref"],
                    initiative["project_id"],
                    trigger_key,
                    "pending",
                    json.dumps(outcome, sort_keys=True),
                    1 if regressed else 0,
                    now,
                    now,
                ),
            )
        return self.observation(initiative["ref"])

    def observation(self, ref: str) -> Dict[str, Any]:
        row = self.svc.store._conn.execute(
            "SELECT * FROM dockyard_observation_triggers WHERE initiative_ref=?",
            (ref,),
        ).fetchone()
        if row is None:
            raise IntegrationError("observation trigger was not found")
        return {**dict(row), "outcome": json.loads(row["outcome_json"])}

    def observations(self, project_id: str) -> list[Dict[str, Any]]:
        rows = self.svc.store._conn.execute(
            "SELECT * FROM dockyard_observation_triggers WHERE project_id=? "
            "ORDER BY created_at,initiative_ref",
            (project_id,),
        ).fetchall()
        return [
            {**dict(row), "outcome": json.loads(row["outcome_json"])}
            for row in rows
        ]

    def run_observation(self, ref: str, engine: Any) -> Dict[str, Any]:
        current = self.observation(ref)
        if current["status"] == "completed":
            return current
        if current["status"] == "running":
            raise IntegrationError("observation trigger is already running")
        if current["status"] == "failed":
            raise IntegrationError("observation trigger failed and requires an explicit retry")

        now = iso(self.svc.store._clock())
        with self.svc.store.tx() as cx:
            changed = cx.execute(
                "UPDATE dockyard_observation_triggers SET status='running',updated_at=? "
                "WHERE initiative_ref=? AND status='pending'",
                (now, ref),
            ).rowcount
        if changed != 1:
            raise IntegrationError("observation trigger state changed concurrently")

        try:
            result = engine.run_cycle(
                current["project_id"],
                trigger_type="internal",
                trigger_ref=ref,
                idempotency_key=current["trigger_key"],
            )
        except Exception:
            with self.svc.store.tx() as cx:
                cx.execute(
                    "UPDATE dockyard_observation_triggers "
                    "SET status='failed',updated_at=? WHERE initiative_ref=?",
                    (iso(self.svc.store._clock()), ref),
                )
            raise

        with self.svc.store.tx() as cx:
            cx.execute(
                "UPDATE dockyard_observation_triggers "
                "SET status='completed',cycle_id=?,updated_at=? "
                "WHERE initiative_ref=? AND status='running'",
                (result["cycle_id"], iso(self.svc.store._clock()), ref),
            )
        return self.observation(ref)

    def _default_group(self, project_id: str) -> str:
        groups = self.dy.groups_list()
        if groups:
            return sorted(g.name for g in groups)[0]
        g = self.dy.group_create(f"{project_id}-ops")
        return g.name
