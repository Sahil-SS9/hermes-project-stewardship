"""Discord adapter: thin discord.py wrapper over the gateway contract.

The adapter owns ONLY platform concerns:
- receiving interactions/messages and mapping them to CommandRequest;
- posting MessageCards as embeds + component rows;
- routing button presses back through permission-checked handlers.

discord.py is an OPTIONAL import — everything testable is testable without
it (the core logic lives in handler.py + templates.py). This module exists
so a live bot is ~40 lines, not a second implementation.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from .handler import CommandRequest, GatewayCommandHandler
from .templates import (
    MessageCard,
    approval_card,
    render_discord_components,
    render_discord_embed,
)


class DiscordAdapter:
    def __init__(self, handler: GatewayCommandHandler) -> None:
        self.handler = handler

    # ------------------------------------------------------------------ #
    # Inbound: Discord event → CommandRequest → response text            #
    # ------------------------------------------------------------------ #

    def on_command(self, *, sender_id: str, command: str,
                   project_id: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        req = CommandRequest(
            platform="discord", sender_id=sender_id, command=command,
            project_id=project_id, args=args or {},
        )
        resp = self.handler.handle(req)
        return {
            "ok": resp.ok,
            "text": resp.text,
            "already_done": resp.already_done,
            "data": resp.data,
        }

    def on_button(self, *, sender_id: str, custom_id: str,
                  project_id: str) -> Dict[str, Any]:
        """Button press: 'approve:INIT-X-0001' / 'reject:...'."""
        if ":" not in custom_id:
            return {"ok": False, "text": "unknown action"}
        verb, ref = custom_id.split(":", 1)
        if verb not in ("approve", "reject"):
            return {"ok": False, "text": f"unsupported action '{verb}'"}
        return self.on_command(sender_id=sender_id, command=verb,
                               project_id=project_id, args={"initiative_ref": ref})

    # ------------------------------------------------------------------ #
    # Outbound: cards → Discord payload shapes                           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def build_message(card: MessageCard) -> Dict[str, Any]:
        return {
            "embeds": [render_discord_embed(card)],
            "components": render_discord_components(card),
        }

    def pending_approval_messages(self, project_id: str) -> list:
        inis = self.handler.svc.initiatives(project_id, status="pending_approval")
        return [self.build_message(approval_card(project_id, i)) for i in inis]


def install(bot, handler: GatewayCommandHandler) -> DiscordAdapter:
    """Wire slash commands + buttons onto a discord.py Bot.

    Usage in the host process:

        adapter = install(bot, GatewayCommandHandler(svc, cycle_engine=engine))
    """
    adapter = DiscordAdapter(handler)

    @bot.command(name="project")  # placeholder; real wiring uses app_commands
    async def _project(ctx, subcommand: str = "status", arg: str = ""):
        out = adapter.on_command(
            sender_id=str(ctx.author.id), command=subcommand,
            project_id=arg or ctx.channel.name, args={},
        )
        await ctx.send(out["text"])

    return adapter
