"""Message template pack: platform-neutral cards for every notification.

One shape, many platforms: each template returns a `MessageCard` with title,
body lines, severity colour, and optional actions (approve/reject buttons).
Adapters translate to Discord embeds, Buzz markdown, or plain text — the
CONTENT is decided here, never in the adapter.

Design rules (WS16 U3/U5):
- stable identifiers always present (project_id / initiative ref / snapshot);
- severity → colour mapping is colourblind-safe and consistent everywhere;
- no raw stack traces or internal jargon reaches users;
- every card states the ONE action needed from the reader (or 'no action').
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Colourblind-safe semantic palette (also used by desktop + CLI).
SEVERITY_COLOURS = {
    "info": 0x5E8BAD,      # calm blue
    "low": 0x7BA05B,       # sage green
    "medium": 0xD9A441,    # amber
    "high": 0xD97B29,      # orange
    "critical": 0xC0392B,  # red
}

STATE_EMOJI = {
    "healthy": "\u2705",
    "watch": "\U0001F7E1",
    "degraded": "\U0001F7E0",
    "critical": "\U0001F534",
    "unknown": "\u26AA",
}


@dataclass
class MessageAction:
    label: str          # e.g. "Approve"
    style: str = "primary"  # primary | secondary | danger
    action_id: str = ""     # e.g. "approve:INIT-X-0001" (adapter maps to button id)


@dataclass
class MessageCard:
    kind: str
    title: str
    lines: List[str] = field(default_factory=list)
    severity: str = "info"
    project_id: Optional[str] = None
    subject_ref: Optional[str] = None
    actions: List[MessageAction] = field(default_factory=list)
    footer: str = "Hermes Project Stewardship"

    @property
    def colour(self) -> int:
        return SEVERITY_COLOURS.get(self.severity, SEVERITY_COLOURS["info"])

    def plain_text(self) -> str:
        """Fallback rendering for text-only platforms/tests."""
        head = f"{STATE_EMOJI.get(self.severity, '')} {self.title}".strip()
        body = "\n".join(f"- {line}" for line in self.lines)
        return f"{head}\n{body}\n({self.footer})"


def status_card(project_id: str, health: Dict[str, Any], settings: Dict[str, Any]) -> MessageCard:
    state = (health or {}).get("status", "never-verified")
    sev = {"healthy": "low", "watch": "medium", "degraded": "high",
           "critical": "critical", "unknown": "high"}.get(state, "info")
    score = (health or {}).get("score")
    lines = [
        f"Health: **{state}**" + (f" (score {score})" if score is not None else ""),
        f"Phase: {settings['phase']} · Autonomy L{settings['autonomy_level']}",
        f"Lead: {settings['owner']['lead_profile'] or '(unset)'}",
    ]
    return MessageCard(
        kind="status", title=f"{project_id} status",
        lines=lines, severity=sev, project_id=project_id,
    )


def approval_card(project_id: str, initiative: Dict[str, Any]) -> MessageCard:
    risk_emoji = {"low": "\U0001F7E2", "medium": "\U0001F7E1",
                  "high": "\U0001F9E1", "critical": "\U0001F534"}.get(
                      initiative.get("risk"), "\u26AA")
    return MessageCard(
        kind="approval_required",
        title=f"Approval needed — {initiative['ref']}",
        lines=[
            f"**{initiative['title']}**",
            f"Why: {initiative['rationale'][:300]}",
            f"Risk: {risk_emoji} {initiative['risk']} · Expected: "
            f"{initiative.get('expected_outcome') or '(not stated)'}",
            "Reply `/project approve %s` or use the buttons." % initiative["ref"],
        ],
        severity="high",
        project_id=project_id,
        subject_ref=initiative["ref"],
        actions=[
            MessageAction("Approve", "primary", f"approve:{initiative['ref']}"),
            MessageAction("Reject", "danger", f"reject:{initiative['ref']}"),
        ],
    )


def health_alert_card(project_id: str, notification: Dict[str, Any]) -> MessageCard:
    sev = notification.get("severity", "medium")
    return MessageCard(
        kind="alert",
        title=notification.get("title", "Health alert"),
        lines=[notification.get("body") or "", "",
               f"Acknowledge with `/project ack {notification['id']}`"],
        severity=sev,
        project_id=project_id,
        subject_ref=str(notification.get("id")),
    )


def cycle_summary_card(project_id: str, result: Dict[str, Any]) -> MessageCard:
    h = result.get("health", {})
    inis = result.get("initiatives", [])
    created = [i for i in inis if not i.get("refused")]
    refused = [i for i in inis if i.get("refused")]
    lines = [f"Cycle {result.get('cycle_id', '?')} complete.",
             f"Health: **{h.get('state')}** (score {h.get('score')})"]
    if created:
        lines.append("Proposed: " + ", ".join(i["ref"] for i in created))
    elif refused:
        lines.append("Proposals deduped/capped — no new work.")
    else:
        lines.append("No action required.")
    blocked = result.get("mutation_blocked_reason")
    if blocked:
        lines.append(f"Mutations blocked: {blocked}")
    return MessageCard(
        kind="cycle_summary", title=f"{project_id} cycle summary",
        lines=lines,
        severity="info" if h.get("state") == "healthy" else "medium",
        project_id=project_id,
    )


def render_discord_embed(card: MessageCard) -> Dict[str, Any]:
    """Translate a card into a Discord embed dict (adapter posts it)."""
    fields = [{"name": "Detail", "value": "\n".join(card.lines)[:1024] or "—"}]
    embed: Dict[str, Any] = {
        "title": card.title[:256],
        "color": card.colour,
        "fields": fields,
        "footer": {"text": card.footer},
    }
    if card.subject_ref:
        embed["description"] = f"ref: `{card.subject_ref}`"
    return embed


def render_discord_components(card: MessageCard) -> List[Dict[str, Any]]:
    """Button rows for card actions (Discord components v2 shape)."""
    if not card.actions:
        return []
    row = [{
        "type": 2,  # BUTTON
        "style": {"primary": 1, "secondary": 2, "danger": 4}.get(a.style, 2),
        "label": a.label,
        "custom_id": a.action_id,
    } for a in card.actions]
    return [{"type": 1, "components": row}]
