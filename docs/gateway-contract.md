# Gateway command contract

Platform-neutral contract for Discord/Buzz/any adapter. The adapter owns
platform auth + presentation; permission binding and business rules live here.

## Request/response

```python
from hermes_project_stewardship.gateway import CommandRequest, GatewayCommandHandler

handler = GatewayCommandHandler(service, cycle_engine=engine)
resp = handler.handle(CommandRequest(
    platform="discord",
    sender_id="123456789012345678",
    command="approve",
    project_id="walkie-talkie",
    args={"initiative_ref": "INIT-WALKIE-0003"},
))
resp.ok, resp.text, resp.already_done
```

## Commands

| Command | Permission | Effect |
|---|---|---|
| `status` / `health` | any sender (read) | latest health + phase |
| `initiatives` | any sender (read) | list w/ pending flagged |
| `approve` | `can_approve` grant | approve initiative; idempotent |
| `reject` | `can_approve` grant | reject + suppression window |
| `run` | `can_trigger` grant | full cycle (subject to mutex/budget/pause) |

## Grant management

```
svc.set_gateway_permission("proj", platform="discord", sender_id="123...",
                           can_approve=True, can_trigger=False)
```

Grants are per project — a Discord admin for one project has nothing on
another. Unknown senders get read-only.

## Idempotency

Duplicate approve/reject of an already-decided initiative returns
`already_done=True` with current state instead of erroring, so platform
redelivery is harmless. Duplicate cycle triggers need an idempotency key;
without one each call is a distinct manual trigger (subject to budget).

## Notification mapping (adapter responsibility)

Health snapshots carry a `notify` flag computed with hysteresis. Adapters
should message ONLY when `notify=true`, and include the stable identifiers:
project_id, snapshot_id, initiative refs.
