# Canonical ownership and surface support

> **Status of this document:** explanatory guide prepared for Phase 8 (PM-0806).
> Every statement below was read from the frozen integration commit
> `b462249ac37447bb32c3426d3f2c6d93bb17ee66` and cites its source file.
> Items belonging to Phase 6/7 that are **not built at that commit** are marked
> *pending Lane A confirmation* and must not be read as shipped behaviour.

This document exists so that README, PRD, guides and release records state one
ownership model. Where another document disagrees, this guide plus the
authoritative plan (`docs/plans/2026-09-10-project-management-stewardship.md`)
win, and the disagreement is a documentation defect to fix.

## 1. Who owns what

| Record / capability | Canonical owner | Stewardship's relationship |
|---|---|---|
| Project identity, repository path, board binding | Hermes Projects | Reads and references; never a second project registry |
| Tasks, epics, status, claims, assignments, dependencies, hierarchy | Hermes Kanban | Reads and writes only through the versioned host contract; no second work store |
| Profile existence and profile creation | Hermes Profiles | Discovers profiles; a bot row or member row never creates authority to claim a profile exists |
| Project membership, project roles, exactly-one-lead | Stewardship | Authoritative |
| Mission, goals, objectives, milestones, workflow definitions/versions/runs, supporting (managed) content, audit history | Stewardship | Authoritative |
| Autonomy policy, approval state, evidence, rankings, saved views | Stewardship | Authoritative |
| Bot registry, groups, workload/A2A display metadata | Stewardship | Display/coordination metadata; **enriches** display only |

Sources: plan §1.2; `docs/dockyard-prd-v0.3.md` §D1 and §3.4 (Phase 0 PM-0015
correction); README §Architecture.

Two invariants follow, and both are release-blocking if broken (plan §2):

1. Stewardship must never treat its bot registry or member table as the source
   of Hermes profile existence.
2. Stewardship must never claim cross-database atomicity. Stewardship and
   canonical Hermes Kanban do not share a transaction; membership stays
   `departure_pending` until canonical readback proves every eligible assignment
   outcome (`src/hermes_project_stewardship/persistence/transfer.py`, module
   docstring).

## 2. Storage, process and profile scope

- Stewardship keeps its own SQLite (WAL) database. It does not extend or edit
  core `projects.db`.
- Database selection precedence is documented in `docs/RUNTIME-STATE.md`:
  explicit `db_path`/`--db`, then `STEWARD_DB_PATH`, then legacy
  `DOCKYARD_PLUGIN_DB`, then `$HERMES_HOME/plugin-data/hermes-dockyard/dockyard.db`
  (falling back to `~/.hermes` when `HERMES_HOME` is unset).
- Managed project content lives beside the database at
  `<database parent>/project-content`, created mode 0700
  (`persistence/service.py::_content_root`). It is **not** inside the export
  archive — see `docs/guides/migration-backup-recovery.md`.
- One plugin process binds to one active `HERMES_HOME`. Switching homes needs a
  new process or a supported host restart (plan §1.2).
- Hermes profile identity in this release is the exact profile slug within one
  `HERMES_HOME`.

## 3. Authority model

Actor attribution is not authorisation (plan §1.5).

- Privileged operations require a **verified principal** supplied by the API
  middleware, not a request field
  (`api/server.py::_membership_authority`, comments at lines ~530–563).
- Capabilities are composed server-side and are never granted by payload:
  a verified human principal receives the capability set; a shared/agent
  principal carries default denial. Missing principal ⇒ fail closed with an
  explicit error, not a permissive default.
- Capabilities (`domain/constants.py::Capability`): `membership_admin`,
  `lead_transfer`, `bulk_reassignment`, `project_archive`,
  `managed_file_removal`.
- Request-supplied actor strings and `DOCKYARD_ACTOR_ID` are recorded as
  attribution only. They are not authority.
- Approval/rejection of initiatives is deliberately not exposed as a model
  tool (`plugin.py` comment: approval stays on authenticated RPC/dashboard and
  permission-bound gateway adapters).

## 4. Surface support at the frozen commit

Evidence labels used below: **[source]** = read from the frozen commit;
**[pending A]** = required by Phase 6 (PM-0601…PM-0607) but not present at this
commit, so it is unverified until Lane A returns it.

| Surface | What it actually is | Support at this commit |
|---|---|---|
| Desktop plugin | `hermes_dockyard_plugin/desktop/plugin.js`, id `hermes-dockyard`, route `/dockyard`, sidebar nav, command-palette entry, tabs for fleet, teams, initiative, views/workflows, inbox, notifications, plus the onboarding wizard | Intended as the **complete** management surface. Desktop-side journey proof against the installed app is a Phase 7 item (PM-0709) and is not claimed here. |
| Dashboard (Hermes dashboard plugin) | `hermes_dockyard_plugin/dashboard/manifest.json` (name `hermes-dockyard`, `api: plugin_api.py`, `entry: dist/index.js`) | A documented **subset** of the same backend contracts. The exact subset statement PM-0601 requires is **[pending A]**. |
| RPC API | FastAPI app, prefix `/stewardship/v1` (`api/server.py`); bearer token when `STEWARD_RPC_TOKEN` is set; `/healthz` open; mutating routes rate-limited | Supported; standalone mode fails closed without a token (`docs/api.md`). |
| CLI (`stewardctl`) | `cli/app.py`: `project enable/disable/pause/resume/freeze/status`, `objective add/list`, `health`, `initiative list/approve/reject/pick`, `run`, `audit`, `export`, `restore` | Supported for these commands only. Member/pending-transfer/project-archive CLI is required by PM-0602 and is **[pending A]** — do not advertise it. |
| Hermes CLI namespace | `plugin.py::register` → `register_cli_command(name="stewardship")` | Registration only; it delegates to `stewardctl`. |
| Model tools | toolset `project-stewardship`: `steward_status`, `steward_run_cycle`, `steward_propose_initiative` | Supported. No approval tool by design. |
| Slash commands | `project-status`, `project-initiatives`, `project-pause`, `project-reconcile` (`plugin.py::_slash_routes`) | Supported. Only the reads and the reconciliation path; no destructive mutations. |
| Skill | `skill/project-stewardship/SKILL.md` (behaviour layer, owns no state) | Supported. |
| Gateway / messaging | `gateway/` handler with per-sender permission binding; commands `status`, `health`, `initiatives` (read), `approve`, `reject` (`can_approve`), `run` (`can_trigger`) | Supported set is the above four verbs. Membership, archive and managed-content mutations are **not** gateway operations. Deep-link/navigation support in messaging is **[pending A]** (PM-0603). |
| TUI | — | **No stewardship TUI surface exists at this commit.** Which TUI entry points upstream supports is part of PM-0603 **[pending A]**. Any claim of TUI management controls would be false. |

### Evidence labelling rule (carry into every later gate)

Keep these four classes separate in evidence and never let one stand in for
another, per the shared handoff rules:

1. mocked/fixture UI evidence;
2. real Python proxy/API evidence;
3. real vanilla-host integration evidence (isolated `HERMES_HOME`);
4. installed-Desktop evidence in the user's actual app.

A fixture-only result cannot satisfy a real-proxy, real-host or
installed-Desktop item (plan §5).

## 5. What Phase 6 must still prove (not built at the frozen commit)

The authoritative plan leaves PM-0601…PM-0607 unchecked at `b462249`. Treat the
following as open, and re-read Lane A's lane report before publishing any of it:

- the exact Dashboard subset statement (PM-0601);
- essential CLI list/recovery for members, pending transfers and project
  archive, plus explicit confirmation for managed-file removal (PM-0602);
- TUI/messaging discovery, approval and deep-link limits (PM-0603);
- verified-principal enforcement on every advertised surface, including
  browser origin/CSRF assumptions where applicable (PM-0604) — a
  browser-CSRF test corpus is not present in this lane's reading of the base;
- route-parity contract run in every UI vertical slice, failing on missing
  method/path/schema or false-empty substitutions (PM-0605);
- minimum/latest supported vanilla Hermes, profile combinations, stale profile,
  clean install, upgrade, disable, uninstall/reinstall and separate-process home
  isolation (PM-0606). This lane found **no declared minimum/latest vanilla
  revision** in the repository at the frozen commit; the bounded statement that
  exists is `docs/api.md` §Canonical-host contract ("requires Project/Kanban
  host contract v2", controlled unavailable adapter when absent). Naming the
  supported revision range is an open Phase 6 gap, not something to invent;
- every Hermes import present on supported vanilla revisions or isolated
  behind a tested compatibility adapter (PM-0607).
