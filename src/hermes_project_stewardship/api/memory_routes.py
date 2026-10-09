"""Project memory routes (checks round 1; Sahil 08/10 pick 1b = A).

Kept in their own module, like ``roadmap_routes.py``, so ``api/server.py`` only
carries one import and one call.

Authority: memory rules become instructions to the project's bots, so every write
needs the project-owner capability (``project_archive``, the same one goal and
milestone edits use) and a payload can never name its own actor (unknown fields are
refused). Reads need no capability. The list read also reports ``can_write`` so the
Desktop hides actions the server would refuse; every write is still checked.
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from ..persistence.memory_service import (
    CONTEXT_CAP,
    MemoryConflict,
    MemoryInvalid,
    MemoryNotFound,
    ProjectMemoryService,
)

WRITE_CAPABILITY = "project_archive"


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MemoryAddRequest(_Strict):
    kind: str
    text: str
    # Where the entry came from: "human", or "work:<task id>" when it starts from
    # finished work. Provenance only; the author is always the verified caller.
    source: str = "human"


class MemoryEditRequest(_Strict):
    kind: Optional[str] = None
    text: Optional[str] = None


def install(router: APIRouter, memory: ProjectMemoryService, *,
            authority: Callable[[str], str],
            finished_work: Callable[[str], List[Dict[str, Any]]],
            work_error: Callable[[Exception], Any]) -> None:
    """Register every project-memory route on ``router``."""

    def _run(call: Callable[[], Any]) -> Any:
        try:
            return call()
        except MemoryNotFound as exc:
            raise HTTPException(404, str(exc)) from None
        except MemoryInvalid as exc:
            raise HTTPException(422, str(exc)) from None
        except MemoryConflict as exc:
            raise HTTPException(409, str(exc)) from None

    def _can_write() -> bool:
        try:
            authority(WRITE_CAPABILITY)
        except HTTPException:
            return False
        return True

    @router.get("/projects/{project_id}/memory")
    def project_memory(project_id: str, include_archived: bool = False):
        entries = _run(lambda: memory.entries(project_id, include_archived=include_archived))
        return {"entries": entries, "context": memory.bot_context(project_id),
                "cap": CONTEXT_CAP, "can_write": _can_write()}

    @router.get("/projects/{project_id}/memory/suggestions")
    def memory_suggestions(project_id: str):
        _run(lambda: memory.entries(project_id))  # 404 before asking the board
        try:
            finished = finished_work(project_id)
        except Exception as exc:  # the board is unreachable: the same envelope as Work
            work_error(exc)
            raise
        return {"suggestions": _run(lambda: memory.suggestions(project_id, finished))}

    @router.get("/projects/{project_id}/memory/{entry_id}/history")
    def memory_history(project_id: str, entry_id: int):
        return {"history": _run(lambda: memory.history(project_id, entry_id))}

    @router.post("/projects/{project_id}/memory")
    def add_memory(project_id: str, body: MemoryAddRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: memory.add(project_id, kind=body.kind, text=body.text,
                                       source=body.source, actor=principal, interface="rpc"))

    @router.patch("/projects/{project_id}/memory/{entry_id}")
    def edit_memory(project_id: str, entry_id: int, body: MemoryEditRequest):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: memory.edit(project_id, entry_id, text=body.text, kind=body.kind,
                                        actor=principal, interface="rpc"))

    @router.post("/projects/{project_id}/memory/{entry_id}/archive")
    def archive_memory(project_id: str, entry_id: int):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: memory.archive(project_id, entry_id, actor=principal, interface="rpc"))

    @router.post("/projects/{project_id}/memory/{entry_id}/restore")
    def restore_memory(project_id: str, entry_id: int):
        principal = authority(WRITE_CAPABILITY)
        return _run(lambda: memory.restore(project_id, entry_id, actor=principal, interface="rpc"))
