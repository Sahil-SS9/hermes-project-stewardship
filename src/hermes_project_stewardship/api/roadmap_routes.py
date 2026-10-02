"""Roadmap routes (Batch R2), installed onto the stewardship router.

Kept in their own module so ``api/server.py`` only carries one import and one
call: the shared file stays easy to merge.

Authority: link and contract writes use the SAME capability as the goal edit
routes (``project_archive``). Goal edits and milestone archive/restore both use
it today, so a link edit is the same class of structural change. Reads need no
capability, like every other GET. The outline read also reports ``can_write``
(would a write by this caller pass that check?) so the Desktop hides Link…
instead of offering an action the server will refuse. It is a display hint
only: every write is still checked on its own.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from ..persistence.roadmap_service import (
    RoadmapConflict,
    RoadmapInvalid,
    RoadmapNotFound,
    RoadmapService,
)

WRITE_CAPABILITY = "project_archive"


class _Strict(BaseModel):
    # A payload can never name its own actor: unknown fields are refused (422).
    model_config = ConfigDict(extra="forbid")


class MilestoneLinkRequest(_Strict):
    milestone_id: int
    relationship: str = "delivers"


class ObjectiveLinkRequest(_Strict):
    initiative_ref: str
    relationship: str = "supports"


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


def install(router: APIRouter, roadmap: RoadmapService, *,
            authority: Callable[[str], str]) -> None:
    """Register every Roadmap route on ``router``."""

    def _run(call: Callable[[], Dict[str, Any]]) -> Dict[str, Any]:
        # FeatureDisabledError is deliberately NOT caught: the app-level handler
        # turns it into the existing "feature_disabled" envelope.
        try:
            return call()
        except (RoadmapNotFound, RoadmapConflict, RoadmapInvalid) as exc:
            raise _refuse(exc) from None

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

    @router.post("/projects/{project_id}/initiatives/{ref}/milestones")
    def link_milestone(project_id: str, ref: str, body: MilestoneLinkRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: roadmap.link_initiative_milestone(
            project_id, ref, body.milestone_id, body.relationship,
            actor=principal, interface="rpc"))

    @router.delete("/projects/{project_id}/initiatives/{ref}/milestones/{milestone_id}")
    def unlink_milestone(project_id: str, ref: str, milestone_id: int):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: roadmap.unlink_initiative_milestone(
            project_id, ref, milestone_id, actor=principal, interface="rpc"))

    @router.post("/projects/{project_id}/objectives/{objective_id}/initiatives")
    def link_objective(project_id: str, objective_id: int, body: ObjectiveLinkRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: roadmap.link_objective_initiative(
            project_id, objective_id, body.initiative_ref, body.relationship,
            actor=principal, interface="rpc"))

    @router.delete("/projects/{project_id}/objectives/{objective_id}/initiatives/{ref}")
    def unlink_objective(project_id: str, objective_id: int, ref: str):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: roadmap.unlink_objective_initiative(
            project_id, objective_id, ref, actor=principal, interface="rpc"))

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
