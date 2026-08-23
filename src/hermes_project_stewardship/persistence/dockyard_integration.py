"""G3 P2/P3: Dockyard ⇄ engine integration service.

Zero-CLI orchestration seam (PRD Gate G3): a dockyard work-item or
approved initiative flows proposal → approval → Kanban execution →
measured outcome entirely through this layer. Composes the stewardship
trust engine (verify/approve/measure) and KanbanBridge (execution)
without duplicating state (TE-01).
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from ..kanban.bridge import KanbanBridge
from ..dockyard import Actor, WorkItemStatus
from .dockyard_service import DockyardService
from .service import ServiceError, StewardshipService


class IntegrationError(Exception):
    pass


class DockyardIntegration:
    """One object wiring dy + engine svc + bridge on the same Store."""

    def __init__(self, dy: DockyardService, svc: StewardshipService,
                 bridge: KanbanBridge) -> None:
        self.dy = dy
        self.svc = svc
        self.bridge = bridge

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
        try:
            ini = self.svc.approve_initiative(ref, actor=actor.id,
                                              interface=f"dockyard:"
                                                        f"{actor.kind.value}")
        except ServiceError as e:
            raise IntegrationError(str(e)) from e
        out = {"initiative_ref": ref, "status": ini["status"]}
        out.update(self._after_approval(ini, actor, promote=True))
        return out

    def _after_approval(self, ini: Dict[str, Any], actor: Actor,
                        promote: bool) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        if promote:
            item = self.dy.promote_initiative(ini, actor=actor)
            out["work_item"] = item.ref
        bound = self.bridge.bind(ini["ref"], start_execution=True)
        out["board_slug"] = bound.get("board_slug")
        out["cards"] = len(bound.get("card_ids") or [])
        out["status"] = self.svc.initiative_by_ref(
            ini["ref"])["status"]
        return out

    # ------------------------------------------------------------------ #
    # Measured outcome loop-back (P3)                                    #
    # ------------------------------------------------------------------ #

    def complete_from_board(self, ref: str, *, outcome: Dict[str, Any],
                            regressed: bool = False,
                            actor: Optional[Actor] = None) -> Dict[str, Any]:
        """Finish via Kanban completion; sync twin WorkItem + reputation."""
        res = self.bridge.complete_from_board(ref, outcome=outcome,
                                              regressed=regressed)
        ini = self.svc.initiative_by_ref(ref)

        final_status = (WorkItemStatus.DONE if not regressed
                        else WorkItemStatus.BLOCKED)
        from ..dockyard import ActorKind as _AK

        promoted = self.dy.find_promoted(ini["project_id"], ref)
        if promoted is None:
            promoted = self.dy.promote_initiative(
                ini, actor=actor or Actor(id="platform",
                                          display_name="platform",
                                          kind=_AK.BOT))
        if promoted.id is None:
            raise IntegrationError("promoted twin not persisted")
        self.dy.dy.update_status(ini["project_id"], promoted.id, final_status)

        # reputation event so BM-06 reflects measured reality
        self.dy.a2a_send("result", from_actor="platform",
                         to_group=self._default_group(ini["project_id"]),
                         payload={"item_ref": promoted.ref,
                                  "outcome": ("regressed" if regressed
                                              else "completed")},
                         item_ref=promoted.ref)
        return {"initiative": ref,
                "engine_status": ini["status"],
                "work_item": promoted.ref,
                "work_item_status": final_status.value}

    def _default_group(self, project_id: str) -> str:
        groups = self.dy.groups_list()
        if groups:
            return sorted(g.name for g in groups)[0]
        g = self.dy.group_create(f"{project_id}-ops")
        return g.name
