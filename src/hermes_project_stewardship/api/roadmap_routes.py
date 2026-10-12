"""Roadmap routes (Batch R2 read model; Batch L delivery ladder).

Kept in their own module so ``api/server.py`` only carries one import and one
call: the shared file stays easy to merge.

Authority: every ladder write uses the SAME capability as the goal edit routes
(``project_archive``). Goal edits and milestone archive/restore both use it
today, so a placement edit is the same class of structural change. Reads need
no capability, like every other GET. The outline read also reports ``can_write``
so the Desktop hides an action the server would refuse; it is a display hint
only, and every write is still checked on its own.

The 0.4.0 link endpoints (initiative<->milestone, objective<->initiative) answer
**410 Gone** and name the replacement endpoint, because the model they served
(one relationship between two objects) no longer exists: v42 is a strict
one-parent ladder, so a placement is a PUT of a single parent on the child.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict

from ..persistence.ladder_service import LadderService
from ..persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapInvalid,
    RoadmapNotFound,
    RoadmapService,
)

WRITE_CAPABILITY = "project_archive"

# Where each retired 0.4.0 endpoint now lives (410 bodies name these).
_REPLACEMENTS = {
    "link_milestone": "PUT /projects/{project_id}/milestones/{milestone_id}/initiative",
    "unlink_milestone": "PUT /projects/{project_id}/milestones/{milestone_id}/initiative",
    "link_objective": "PUT /projects/{project_id}/objectives/{objective_id}/milestone",
    "unlink_objective": "PUT /projects/{project_id}/objectives/{objective_id}/milestone",
}


class _Strict(BaseModel):
    # A payload can never name its own actor: unknown fields are refused (422).
    model_config = ConfigDict(extra="forbid")


class ParentRequest(_Strict):
    """The new parent, or null to unplace the item ("Not placed yet")."""

    parent_id: Optional[Any] = None


class WaiverRequest(_Strict):
    """Why the item is no longer required (required; shown to people)."""

    reason: str


class GoalCheckRequest(_Strict):
    # A person clearing the check sends {"clear": true}; otherwise the check
    # fields are required to set one.
    clear: Optional[bool] = None
    evaluator_type: Optional[str] = None
    target: Optional[str] = None
    command: Optional[Any] = None
    integration: Optional[str] = None
    window: Optional[str] = None


class GoalAssessmentRequest(_Strict):
    passed: bool
    evidence: list[str]
    detail: str = ""
    expires_at: Optional[str] = None


class _Any(BaseModel):
    """A retired endpoint's body: accepted and ignored, then answered 410.

    Validation must not reject the caller first, or a 0.4.0 client gets a
    confusing 422 instead of the "this endpoint is gone" answer it needs.
    """

    model_config = ConfigDict(extra="allow")


class _Empty(_Strict):
    """A confirmation/dismissal carries no payload; only the path names the item."""


class GoalContractRequest(_Strict):
    outcome: Optional[str] = None
    verification: Optional[str] = None
    constraints: Optional[str] = None
    boundaries: Optional[str] = None
    stop_when: Optional[str] = None
    status: Optional[str] = None
    max_turns: Optional[Any] = None
    paused_reason: Optional[str] = None


def _refuse(exc: Exception) -> HTTPException:
    if isinstance(exc, RoadmapNotFound):
        return HTTPException(404, str(exc))
    return HTTPException(409, str(exc))


def install(router: APIRouter, roadmap: RoadmapService, ladder: LadderService, *,
            authority: Callable[[str], str],
            on_confirmed: Optional[Callable[[str], None]] = None) -> None:
    """Register every Roadmap and ladder route on ``router``.

    ``on_confirmed`` runs after an initiative is confirmed as delivered, so the
    caller can sync canonical work and schedule the post-delivery observation.
    It defaults to a no-op (the ladder itself stays free of host wiring).
    """
    _schedule_post_confirm = on_confirmed or (lambda ref: None)

    def _run(call: Callable[[], Dict[str, Any]]) -> Dict[str, Any]:
        # FeatureDisabledError is deliberately NOT caught: the app-level handler
        # turns it into the existing "feature_disabled" envelope.
        try:
            return call()
        except (RoadmapNotFound, RoadmapConflict, RoadmapInvalid) as exc:
            raise _refuse(exc) from None

    def _gone(which: str) -> HTTPException:
        # The app-level handler rewrites the body into the shared
        # {error:{code,message}} envelope, so the replacement must travel in the
        # message itself: a 0.4.0 client has to be told where the endpoint went.
        return HTTPException(
            status.HTTP_410_GONE,
            "the 0.4.0 objective/milestone link endpoints were removed in 0.5.0; "
            f"the ladder places one parent on the child: use {_REPLACEMENTS[which]}",
        )

    @router.get("/roadmap")
    def roadmap_outline(project_id: Optional[str] = None):
        outline = _run(lambda: roadmap.roadmap(project_id))
        try:
            authority(WRITE_CAPABILITY)
            can_write = True
        except HTTPException:
            can_write = False
        return {**outline, "can_write": can_write}

    @router.get("/roadmap/projects/{project_id}/milestones/{milestone_id}/items")
    def roadmap_milestone_items(project_id: str, milestone_id: int):
        return _run(lambda: roadmap.milestone_items(project_id, milestone_id))

    # ---- retired 0.4.0 link endpoints: 410 Gone, naming the replacement ---- //

    @router.post("/projects/{project_id}/initiatives/{ref}/milestones")
    def link_milestone(project_id: str, ref: str, body: _Any):
        raise _gone("link_milestone")

    @router.delete("/projects/{project_id}/initiatives/{ref}/milestones/{milestone_id}")
    def unlink_milestone(project_id: str, ref: str, milestone_id: int):
        raise _gone("unlink_milestone")

    @router.post("/projects/{project_id}/objectives/{objective_id}/initiatives")
    def link_objective(project_id: str, objective_id: int, body: _Any):
        raise _gone("link_objective")

    @router.delete("/projects/{project_id}/objectives/{objective_id}/initiatives/{ref}")
    def unlink_objective(project_id: str, objective_id: int, ref: str):
        raise _gone("unlink_objective")

    # ---- v42 ladder: one parent per level ---------------------------------- //

    @router.put("/projects/{project_id}/tasks/{item_ref}/goal")
    def place_task(project_id: str, item_ref: str, body: ParentRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.set_task_goal(
            project_id, item_ref, body.parent_id, actor=principal, interface="rpc"))

    @router.put("/projects/{project_id}/goals/{goal_id}/objective")
    def place_goal(project_id: str, goal_id: str, body: ParentRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.set_goal_objective(
            project_id, goal_id, body.parent_id, actor=principal, interface="rpc"))

    @router.put("/projects/{project_id}/objectives/{objective_id}/milestone")
    def place_objective(project_id: str, objective_id: int, body: ParentRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.set_objective_milestone(
            project_id, objective_id, body.parent_id, actor=principal,
            interface="rpc"))

    @router.put("/projects/{project_id}/milestones/{milestone_id}/initiative")
    def place_milestone(project_id: str, milestone_id: int, body: ParentRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.set_milestone_initiative(
            project_id, milestone_id, body.parent_id, actor=principal,
            interface="rpc"))

    @router.post("/projects/{project_id}/initiatives/{ref}/confirm-delivered")
    def confirm_delivered(project_id: str, ref: str, body: _Empty):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.confirm_delivered(
            project_id, ref, actor=principal, interface="rpc",
            after_confirm=lambda r: _schedule_post_confirm(r)))

    @router.put("/projects/{project_id}/waivers/{kind}/{item_id}")
    def waive_item(project_id: str, kind: str, item_id: str, body: WaiverRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.waive(
            project_id, kind, item_id, body.reason, actor=principal, interface="rpc"))

    @router.delete("/projects/{project_id}/waivers/{kind}/{item_id}")
    def clear_waiver(project_id: str, kind: str, item_id: str):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.clear_waiver(
            project_id, kind, item_id, actor=principal, interface="rpc"))

    @router.get("/projects/{project_id}/roadmap/unplaced")
    def list_unplaced(project_id: str):
        return _run(lambda: {"unplaced": ladder.list_unplaced(project_id)})

    @router.post("/projects/{project_id}/roadmap/unplaced/{row_id}/dismiss")
    def dismiss_unplaced(project_id: str, row_id: int, body: _Empty):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.dismiss_unplaced(
            project_id, row_id, actor=principal, interface="rpc"))

    @router.get("/projects/{project_id}/goals/{goal_id}/check")
    def goal_check(project_id: str, goal_id: str):
        return _run(lambda: ladder.goal_check(project_id, goal_id))

    @router.put("/projects/{project_id}/goals/{goal_id}/check")
    def set_goal_check(project_id: str, goal_id: str, body: GoalCheckRequest):
        principal = authority(WRITE_CAPABILITY)
        if body.clear:
            # A person clearing the check: remove it entirely (goal then has no
            # check, and its state is derived from tasks alone).
            return _run(lambda: ladder.set_goal_check(
                project_id, goal_id, None, actor=principal, interface="rpc"))
        fields = body.model_dump(exclude_unset=True, exclude={"clear"})
        if not fields.get("evaluator_type") or not fields.get("target"):
            raise HTTPException(
                422, "evaluator_type and target are required to set a check;"
                     " send {\"clear\": true} to remove it")
        return _run(lambda: ladder.set_goal_check(
            project_id, goal_id, fields,
            actor=principal, interface="rpc"))

    @router.post("/projects/{project_id}/goals/{goal_id}/assessment")
    def record_assessment(project_id: str, goal_id: str, body: GoalAssessmentRequest):
        # The body cannot name its own actor: the server binds the verified
        # principal, exactly like the objective assessment routes.
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: ladder.record_goal_assessment(
            project_id, goal_id, passed=body.passed, evidence=body.evidence,
            detail=body.detail, expires_at=body.expires_at,
            trusted_principal=principal, interface="rpc"))

    @router.get("/projects/{project_id}/goals/{goal_id}/contract")
    def goal_contract(project_id: str, goal_id: str):
        return _run(lambda: roadmap.goal_contract(project_id, goal_id))

    @router.put("/projects/{project_id}/goals/{goal_id}/contract")
    def update_goal_contract(project_id: str, goal_id: str, body: GoalContractRequest):
        principal = authority(WRITE_CAPABILITY)
        # exclude_unset: only the fields the caller sent are changed. An explicit
        # null for paused_reason is a real instruction (clear it) and survives.
        fields = body.model_dump(exclude_unset=True)
        return _run(lambda: roadmap.update_goal_contract(
            project_id, goal_id, fields, actor=principal, interface="rpc"))
