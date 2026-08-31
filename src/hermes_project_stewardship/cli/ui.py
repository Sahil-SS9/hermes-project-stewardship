"""CLI/TUI presentation layer: design tokens, tables, pickers.

Design rules (WS16 U1/U4/U5):
- scan-in-3-seconds: state first, numbers second, detail on request;
- one consistent semantic palette across CLI/Desktop/Discord;
- NO_COLOR / non-TTY ⇒ plain output (accessibility + scripting);
- errors are actionable: what happened, what to do next, exact command;
- interactive picker degrades to numbered list when no TTY.
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional, Sequence

__version__ = "0.3.0"

# --------------------------------------------------------------------- #
# Tokens                                                                #
# --------------------------------------------------------------------- #

STATE_GLYPH = {
    "healthy": "\u2705",     # ✅
    "watch": "\U0001F7E1",   # 🟡
    "degraded": "\U0001F7E0",  # 🟠
    "critical": "\U0001F534",  # 🔴
    "unknown": "\u26aa",     # ⚪
    "never-verified": "\u26aa",
}

RISK_GLYPH = {"low": "green", "medium": "yellow", "high": "orange",
              "critical": "red"}

_ANSI = {
    "reset": "\033[0m", "bold": "\033[1m", "dim": "\033[2m",
    "green": "\033[32m", "yellow": "\033[33m", "orange": "\033[38;5;208m",
    "red": "\033[31m", "blue": "\033[34m", "grey": "\033[90m",
}


def _colour_enabled() -> bool:
    return sys.stdout.isatty() and not os.environ.get("NO_COLOR")


def paint(text: str, colour: str) -> str:
    if not _colour_enabled() or colour not in _ANSI:
        return text
    return f"{_ANSI[colour]}{text}{_ANSI['reset']}"


def state_glyph(state: str) -> str:
    return STATE_GLYPH.get(state, "\u26aa")


# --------------------------------------------------------------------- #
# Tables                                                               #
# --------------------------------------------------------------------- #

def render_table(headers: Sequence[str], rows: Sequence[Sequence[str]]) -> str:
    """Aligned fixed-width table; truncates long cells gracefully."""
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = min(max(widths[i], len(str(cell))), 60)
    def fmt(row: Sequence[str]) -> str:
        return "  ".join(str(c)[:60].ljust(widths[i]) for i, c in enumerate(row))
    out = [paint(fmt(headers), "bold")]
    out.append(paint("-" * sum(widths + [2] * (len(widths) - 1)), "grey"))
    for row in rows:
        out.append(fmt(row))
    return "\n".join(out)


def health_line(project_id: str, health: Optional[Dict[str, Any]],
                settings: Dict[str, Any]) -> str:
    state = (health or {}).get("status") or "never-verified"
    score = (health or {}).get("score")
    bits = [
        f"{state_glyph(state)} {paint(project_id, 'bold')}",
        f"{state}" + (f" (score {score})" if score is not None else ""),
        f"phase={settings['phase']}",
        f"autonomy L{settings['autonomy_level']}",
    ]
    lead = settings["owner"]["lead_profile"]
    if lead:
        bits.append(f"lead={lead}")
    return "  ·  ".join(bits)


def initiative_rows(inis: List[Dict[str, Any]]) -> List[List[str]]:
    rows = []
    for i in inis:
        risk_colour = RISK_GLYPH.get(i["risk"], "grey")
        rows.append([
            i["ref"],
            paint(i["risk"].ljust(8), risk_colour),
            i["status"],
            i["title"][:52],
        ])
    return rows


INITIATIVE_HEADERS = ("REF", "RISK", "STATUS", "TITLE")


# --------------------------------------------------------------------- #
# Actionable errors                                                    #
# --------------------------------------------------------------------- #

HINTS = {
    "not enabled": "Enable it first: stewardctl project enable <project> --mission '...'",
    "disabled": "Re-enable it: stewardctl project enable <project>",
    "paused": "Resume with: stewardctl project resume <project>",
    "frozen": "Frozen projects need an explicit resume: stewardctl project resume <project>",
    "budget": "Daily cycle budget hit — wait for the window or raise max_cycles_per_day.",
    "mutex": "Another cycle is running. Check stewardctl audit --limit 5.",
    "duplicate trigger": "This webhook/cron delivery was already processed (idempotency).",
    "suppressed": "This proposal was rejected recently and is suppressed. Use a new dedupe_key or wait out the window.",
    "cap": "Resolve open initiatives first: stewardctl initiative list <project>",
    "duplicate of open": "An initiative with this key is already open: stewardctl initiative list <project>",
}


def friendly_error(message: str) -> str:
    low = message.lower()
    hint = next((h for k, h in HINTS.items() if k in low), None)
    out = paint("error: ", "red") + message
    if hint:
        out += "\n" + paint("hint: ", "blue") + hint
    return out


# --------------------------------------------------------------------- #
# Interactive picker (arrow keys; falls back to numbered list)          #
# --------------------------------------------------------------------- #

def pick_initiative(options: List[Dict[str, Any]], prompt: str) -> Optional[str]:
    """Arrow-key picker over pending initiatives; returns chosen ref.

    Non-TTY (pipes, CI): prints a numbered list and returns None — caller
    should tell the user to pass the ref explicitly.
    """
    if not options:
        print("Nothing pending approval.")
        return None
    refs = [o["ref"] for o in options]
    if not sys.stdin.isatty():
        print(prompt)
        for n, o in enumerate(options, 1):
            print(f"  {n}. {o['ref']}  {o['title']}")
        print("(non-interactive session — pass the ref explicitly)")
        return None

    try:
        import termios
        import tty
    except ImportError:  # pragma: no cover (windows)
        for n, o in enumerate(options, 1):
            print(f"  {n}. {o['ref']}  {o['title']}")
        return None

    idx = 0

    def _draw(first: bool = False) -> None:
        if not first:
            sys.stdout.write("\x1b[%dA\r\x1b[K" % (len(options) + 1))
        print(paint(prompt, "bold"))
        for n, o in enumerate(options):
            marker = paint("❯ ", "orange") if n == idx else "  "
            line = f"{marker}{o['ref']}  {o['title'][:48]} [{o['risk']}]"
            if n == idx:
                line = paint(line, "bold")
            print("\x1b[K" + line)

    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        _draw(True)
        while True:
            ch = sys.stdin.read(1)
            if ch == "\x1b":
                seq = sys.stdin.read(2)
                if seq == "[A":
                    idx = (idx - 1) % len(options)
                elif seq == "[B":
                    idx = (idx + 1) % len(options)
                _draw()
            elif ch in ("\r", "\n"):
                return refs[idx]
            elif ch in ("\x03", "q"):  # ctrl-c / q
                return None
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
