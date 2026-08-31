# Central feature toggles — design (DY-FT-01)

## Goal

A single config space where users enable/disable parts of Dockyard/Project
Stewardship (Dashboard tabs, workflow canvas, milestones, notifications,
initiatives) without breaking anything or losing data. Disabling hides the
surface and fails closed its API paths; re-enabling restores everything intact.

## Safety rules (non-negotiable)

1. **Disable = hide, never delete.** No row removal, no schema change, no
   data migration on toggle. All data stays in SQLite untouched.
2. **Re-enable always restores.** Toggles are a boolean flip on stored JSON;
   the surface reappears with its data exactly as it was.
3. **Fail closed at the API.** When a feature is disabled, mutating its
   endpoints returns `409 feature_disabled`; read endpoints return the same
   shape with empty payloads (the UI is hidden anyway; other clients get an
   honest answer, not a hang).
4. **Core is non-toggleable.** Project enable/settings/audit/export stay
   always on — they are the mechanism that makes toggles safe.
5. **Every change is audited** (`feature.disabled` / `feature.enabled`) with
   actor attribution.
6. **Unknown feature names are rejected** (typo can never silently do
   nothing) and reserved names cannot be toggled off.

## Storage

Per project, inside the existing `project_stewardship.notification_policy_json`
→ no. Use the dedicated existing policy merge surface: a new
`features` policy bucket stored in `verification_policy_json`? No — both are
wrong homes. Cleaner: add one nullable column `features_json TEXT` to
`project_stewardship` (migration 17) so toggles live next to `enabled` and are
read in one row fetch (no extra query per request). Absent column JSON = all
features on (back-compat default).

Schema:

```json
{
  "workflow_canvas": true,
  "milestones": true,
  "initiatives": true,
  "inbox": true,
  "notifications": true,
  "saved_views": true
}
```

Togglable set (v1): `workflow_canvas`, `milestones`, `initiatives`,
`inbox`, `notifications`, `saved_views`. Core (never togglable): projects,
settings, audit, health, work-items (base), events.

## Surfaces

- **API:** `GET /projects/{id}/settings` already returns settings; extend
  `_row_settings` with `"features": {...}` (defaults filled). Add
  `PATCH /projects/{id}/features` body `{features: {name: bool}, actor,
  interface}` — strict validation, audit both transitions.
- **Enforcement:** one helper `svc.features(project_id)` returning resolved
  dict + a guard `require_feature(project_id, name)` raising
  `ServiceError("feature '<name>' is disabled")` → mapped to 409 by the
  existing error envelope. Guard placed on: workflow runs/node endpoints,
  milestone create/attach/update, initiative endpoints, inbox, notifications,
  saved view mutations. Read endpoints that feed hidden UI also guarded (423
  semantics via 409 envelope — one code, easy for clients).
- **Dashboard:** on app init, fetch settings once; hidden features drop their
  tab from the nav and skip their render; a disabled-feature direct link shows
  a neutral "This feature is turned off for this project" card. A small
  "Features" section in the Work-tab settings area (or dashboard) lists each
  toggle with enable/disable buttons; core features are shown but locked with
  an explanatory tooltip.
- **CLI:** `stewardctl project features <project>` (list) and
  `stewardctl project features --enable NAME --disable NAME` (apply). Lower
  priority than API/UI; can land in the same slice.

## Not in scope (explicit)

- Global (cross-project) toggles — later; per-project first (smaller blast
  radius, matches per-project enable/disable pattern that already exists).
- Data purge on disable — permanently rejected by rule 1.
- Toggling the stewardship core or autonomy gates.

## Test plan

- Toggle off → endpoint 409, data row still present, dashboard hides tab,
  re-enable → endpoint 200 and same data returned (row comparison before/after).
- Toggle unknown name → 422. Toggle core name → 409 with clear message.
- Audit trail records both transitions with actor.
- Fresh DB without `features` column JSON → all defaults on (back-compat).