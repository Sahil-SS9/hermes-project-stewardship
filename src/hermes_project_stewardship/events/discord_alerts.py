"""Discord alerts: the one message a no-AI cron job posts (checks round 1; Sahil 08/10 pick 2 = A).

``stewardctl --db <db> notifications discord-due --mark`` prints this message, or nothing.
A Hermes cron job with ``no_agent`` and ``deliver=discord:<channel id>`` posts the output
as-is through the Discord bot that already runs, and posts nothing for empty output
(``cron/scheduler.py``). No gateway change, no new bot, no token here.

Which alerts: ``NotificationEngine.discord_due`` (the pop-up rules on each project's
Discord channel). The message is built so nothing in an alert can misbehave in Discord:
``@`` gets a zero-width space after it, so ``@everyone``, ``@here`` and ``<@id>`` cannot
ping; Markdown characters are escaped, so a title cannot restyle or hide the message;
and it stays under Discord's 2,000-character limit, saying how many were left out.
Each alert is marked sent when printed (``--mark``): if the Discord post itself fails,
that alert is not retried in Discord; it is still in Dockyard's inbox.
"""
from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List

MESSAGE_CAP = 1900  # Discord allows 2,000 characters; keep a margin
TITLE_CAP = 200
_MARKDOWN = re.compile(r"([\\*_~`|])")  # each line starts "- **", so ">" cannot quote


def _safe(text: Any, cap: int) -> str:
    clean = " ".join(str(text or "").split())
    if len(clean) > cap:
        clean = clean[: cap - 3].rstrip() + "..."
    clean = _MARKDOWN.sub(r"\\\1", clean)
    return clean.replace("@", "@\u200b")


def discord_message(rows: Iterable[Dict[str, Any]]) -> str:
    """One message for the due alerts, oldest first; ``""`` when nothing is due."""
    alerts: List[Dict[str, Any]] = list(rows)
    if not alerts:
        return ""
    count = len(alerts)
    header = f"**Dockyard**: {count} new {'alert' if count == 1 else 'alerts'}"
    reserve = len("\n...and 999 more in Dockyard.")
    lines = [header]
    used = len(header)
    shown = 0
    for alert in alerts:
        line = (f"\n- **{_safe(alert.get('severity'), 12).upper()}** "
                f"{_safe(alert.get('project_id'), 64)}: {_safe(alert.get('title'), TITLE_CAP)}")
        if used + len(line) + reserve > MESSAGE_CAP:
            break
        lines.append(line)
        used += len(line)
        shown += 1
    if shown < count:
        lines.append(f"\n...and {count - shown} more in Dockyard.")
    return "".join(lines)


def run(engine: Any, *, mark: bool) -> str:
    """The due message; with ``mark`` every alert in it (shown or counted) is marked sent."""
    due = engine.discord_due()
    text = discord_message(due)
    if mark and due:
        engine.mark_discord_sent([row["id"] for row in due])
    return text
