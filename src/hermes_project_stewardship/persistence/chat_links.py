"""One-time links that tell a new Desktop chat which project it is about.

Checks round 1 (Sahil 08/10, pick 1a = A). Project Stewardship's Chat button opens a fresh Desktop
chat with one of the project's bots. A plugin cannot learn that chat's id: Desktop saves
a chat on its first message, and ``host.newChat`` returns nothing. So the button first
records a link here (bot, project, ten minutes). The bot-side hook (``bot_context.py``)
lets the first message of a new Desktop chat with that bot claim the oldest open link,
once; from then on that chat gets the project's memory.

Limit, stated plainly: if a second new Desktop chat with the same bot sends its first
message first, that chat takes the link. The memory it gets names the project, so it
shows.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any, Dict

from .membership import MembershipService
from .service import ServiceError
from .store import Store, iso

LINK_MINUTES = 10


class ChatLinkNotFound(ServiceError):
    """No such project (HTTP 404)."""


class ChatLinkInvalid(ServiceError):
    """The bot is not on the project's team (HTTP 422)."""


class ChatLinkService:
    def __init__(self, store: Store, membership: MembershipService, *, clock=None) -> None:
        # The team comes from the app's own membership service (one instance,
        # notification wiring owned by the host), never a second service here.
        self.store = store
        self.membership = membership
        self._clock = clock or store._clock

    def open(self, project_id: str, *, profile: str, actor: str, interface: str) -> Dict[str, Any]:
        """Record a link for ``profile``'s next new Desktop chat; valid for ten minutes."""
        known = self.store._conn.execute(
            "SELECT 1 FROM project_stewardship WHERE project_id=?", (project_id,)
        ).fetchone()
        if known is None:
            raise ChatLinkNotFound(f"no such project '{project_id}'")
        slug = str(profile or "").strip()
        team = {member.profile_slug for member in self.membership.list_members(project_id)}
        if slug not in team:
            raise ChatLinkInvalid(f"'{slug}' is not on the team of project '{project_id}'")
        now = self._clock()
        expires = iso(now + timedelta(minutes=LINK_MINUTES))
        with self.store.tx() as cx:
            link_id = cx.execute(
                "INSERT INTO project_chat_links(project_id, profile, created_by, created_at, expires_at)"
                " VALUES(?,?,?,?,?)",
                (project_id, slug, actor, iso(now), expires),
            ).lastrowid
            cx.execute(
                "INSERT INTO stewardship_audit_log(ts, actor, interface, action, subject, detail_json)"
                " VALUES(?,?,?,?,?,?)",
                (iso(now), actor, interface, "project.chat.opened", project_id,
                 self.store._j({"link_id": link_id, "profile": slug})),
            )
        return {"id": int(link_id), "project_id": project_id, "profile": slug, "expires_at": expires}
