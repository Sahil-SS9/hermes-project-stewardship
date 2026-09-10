# Vanilla-host capability spike (PM-0011/0013/0014/0015)

Date: 2026-09-10. Vanilla checkout: `/home/kensei/repos/hermes-agent-vanilla`; revision `8c098e9e819169879a7b2f74990e83b5d39696c8`. The checkout was read-only. Runtime probes used fresh `/tmp/pm0-vanilla-home-*` homes and did not touch `~/.hermes`.

## Executive verdicts

| Item | Verdict |
|---|---|
| PM-0011(a) enumeration | **PROVEN:** native `list_tasks()` has no default limit; an explicit limit is honoured. A 137-task probe returned 137, and `limit=100` returned 100. The Dockyard adapter adds its own page cap/default (not vanilla). |
| PM-0011(b) batch assignment | **PROVEN-ABSENT:** no canonical batch/bulk assignment/reassignment operation was found in the vanilla Kanban DB/CLI surface at this revision. Assignment is one task per call. |
| PM-0011(c) concurrency | **PROVEN:** assignment has a running/claim guard and write transaction, but no task revision/version or optimistic-CAS precondition. Claiming does use `claim_lock` CAS. |
| PM-0011(d) claimed handoff | **PROVEN:** ordinary assignment/reassignment of claimed running work is refused; explicit `reassign_task(..., reclaim_first=True)` performs reclaim then assignment. There is no implicit safe handoff. |
| PM-0013 imports | **PROVEN:** the plugin's Hermes imports are listed below. `hermes_constants`, `hermes_cli.kanban_db`, `hermes_cli.projects_db`, and `hermes_cli.kanban_db_connect` are internal/private source modules, not a documented public plugin host API. The remaining `hermes_project_stewardship.*` imports are this project's own private package, not Hermes imports. |
| PM-0014 lifecycle | **PROVEN:** vanilla has supported profile creation (`hermes profile create`, `profiles.py:13-19,1126`). **PROVEN:** disabling is config-only and plugin data is rooted at `<home>/plugin-data/<namespace>` (`plugins.py:1394`, disable path `plugins_cmd.py:1258-1298`). **PROVEN (follow-up runtime probe, see PM-0014 section):** `plugin-data/<namespace>` survives disable, enable and two uninstall/reinstall cycles; uninstall deletes only the install dir + metadata. **PROVEN by source:** a process resolves one active Hermes home; switching `HERMES_HOME` requires a new process/import boundary for a reliable process-level contract. Caveat: retention probe used a synthetic v1 manifest because this vanilla revision rejects the dockyard v2 manifest (compatibility finding). |
| PM-0015 ownership | **PROVEN correction:** legacy PRD language describing a native Stewardship `WorkItem` as the universal execution model is incompatible with the vanilla Kanban ownership observed here. Hermes owns task/epic rows, status, claims, and assignments; Stewardship owns membership, project metadata, objectives/evidence, and orchestration metadata. |

## PM-0011 — host capabilities

### (a) Pagination / enumeration

Vanilla source: `hermes_cli/kanban_db.py:3661-3710`.

* `list_tasks(..., limit: Optional[int] = None)` defaults to `None` (`3661-3673`).
* SQL is `SELECT * FROM tasks WHERE 1=1` (`3674`) and only appends `LIMIT` when `if limit:` is true (`3707-3709`). Therefore there is no hidden 100-row native default.
* CLI exposes `hermes kanban list` (`hermes_cli/kanban.py:425-457`), while its adapter is separate: `src/hermes_project_stewardship/kanban/vanilla_host.py:327-337` loads all native tasks, then slices with `_page`; adapter default is 100 and maximum is 500 (`vanilla_host.py:12,37-42,333-337`).

Runtime transcript (fresh home `/tmp/pm0-vanilla-home-iLqs`, direct vanilla Python import):

```text
HOME /tmp/pm0-vanilla-home-iLqs
all 137 limit100 100
```

Conclusion: vanilla API returns all by default; explicit limits page/slice. The apparent 100 limit belongs to the stewardship compatibility adapter, not vanilla Hermes. Epic enumeration is not a distinct native table/API: epics are task rows distinguished by tenant/task-kind in the adapter (`vanilla_host.py:320-337`).

### (b) Batch assignment

`assign_task(conn, task_id, profile)` is singular (`kanban_db.py:3713-3746`), and `reassign_task(conn, task_id, profile, reclaim_first=False, reason=None)` is also singular (`5196-5225`). Repository-wide vanilla search found no Kanban `assign_many`, bulk assignment, batch reassignment, or equivalent transaction API; `hermes_cli/kanban.py:476-480` defines a single `assign <task_id> <profile>` command. **PROVEN-ABSENT:** no canonical batch assignment at revision `8c098e9e819169879a7b2f74990e83b5d39696c8`.

### (c) Assignment preconditions/versioning

Assignment opens `write_txn` (`3719-3721`), reads `status`, `claim_lock`, and `assignee` (`3721-3723`), refuses a running claimed task (`3726-3730`), then updates by `id` alone (`3735-3741`). There is no `revision`, `version`, `updated_at` compare-and-swap, or caller-supplied precondition in this mutation path. **PROVEN:** transaction/serialization guard and running-claim guard. **PROVEN-ABSENT:** optimistic-concurrency revision check for assignment/update.

The separate claim path does have a lock CAS: `claim_task` updates only `WHERE id = ? AND status = 'ready' AND claim_lock IS NULL` (`kanban_db.py:4689-4702`). This is claim ownership protection, not a general task revision.

### (d) Claimed/running handoff

Source states the policy directly: `assign_task` “Refuses to reassign a task that's currently running (claim_lock set)” (`kanban_db.py:3713-3718`) and raises `RuntimeError` (`3726-3730`). `reassign_task` documents refusal unless `reclaim_first=True` (`5196-5210`), calls `reclaim_task` first when requested (`5215-5218`), then assigns (`5219-5225`).

Runtime transcript (fresh `/tmp/pm0-vanilla-home-*`, claimed with `claimer='worker-a'`):

```text
claimed running True
assign_error RuntimeError cannot reassign t_be826078: currently running (claimed). Wait for completion or reclaim the stale lock first.
reassign_false False
reassign_true True
final ready worker-b
```

The safe operator flow is therefore explicit reclaim/reassign, not silent transfer. `reclaim_first=True` leaves the task `ready` for the new assignee.

## PM-0013 — import classification

Search scope: `src/` and `hermes_dockyard_plugin/`, matching `from hermes` / `import hermes` and the project package imports that appear alongside them.

| Symbol | Importing file | Classification | Evidence |
|---|---|---|---|
| `hermes_constants` | `src/hermes_project_stewardship/kanban/vanilla_host.py:53,88` | **Private/internal** | Imported as a top-level implementation module; no public host/plugin API export identified. Used with `set_hermes_home_override` (`vanilla_host.py:61-66`). |
| `hermes_cli.kanban_db` | `vanilla_host.py:54,294` | **Private/internal** | Direct import of `hermes_cli/kanban_db.py`; native Kanban implementation, not a stable plugin contract. |
| `hermes_cli.projects_db` | `vanilla_host.py:54,90` | **Private/internal** | Direct import of `hermes_cli/projects_db.py`; no public export identified. |
| `hermes_cli.kanban_db_connect.connect_closing` | `vanilla_host.py:294-296` | **Private/internal** | Direct import of `hermes_cli/kanban_db_connect.py`; internal connection helper. |
| `hermes_project_stewardship.*` | `src/.../api/server.py:1434`; `hermes_dockyard_plugin/dashboard/plugin_api.py:24-25,56`; dashboard tests `15-18` | **Project-private, not Hermes API** | These are imports from the stewardship package itself (`src/hermes_project_stewardship/...`), not the vanilla Hermes surface. |

There were no `from hermes...` or `import hermes...` references in the listed dashboard plugin source beyond the host adapter's four private vanilla imports. Official Kanban documentation is linked by vanilla CLI help at `hermes_cli/kanban.py:225-229`: `https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban`.

## PM-0014 — isolated-home lifecycle

### Profile creation and navigation

**PROVEN:** vanilla documents and implements `hermes profile create <name>` and variants (`hermes_cli/profiles.py:11-19`); implementation entry is `create_profile` at line 1126. Profile helpers anchor named profiles below the default root (`profiles.py:271-293`).

**UNPROVEN/ABSENT:** no official Desktop plugin deep-link/navigation contract for profile creation was found in the vanilla source/docs search. Do not invent a `hermes://` route for this feature; use the supported CLI/API or establish a separately documented Desktop contract.

### Plugin data retention

**PROVEN by vanilla source:** plugin data is namespaced under `get_hermes_home() / "plugin-data" / self._data_namespace` (`hermes_cli/plugins.py:1394`). Disabling is a config disabled-list operation (`hermes_cli/plugins_cmd.py:1258-1298`), and discovery skips disabled plugins (`hermes_cli/plugins.py:4351-4404`). Those paths do not delete the namespace.

**UNPROVEN runtime:** the requested install dockyard plugin → write `plugin-data/hermes-dockyard/dockyard.db` → disable → re-enable → simulated uninstall/reinstall test was not completed because this clean vanilla runtime could not load optional plugin dependencies (`httpx` was absent; probe emitted `Failed to load plugin ... No module named 'httpx'`). Thus retention across actual uninstall/reinstall remains unproven. Source evidence supports disable/re-enable persistence; it does not prove behavior of an external plugin installer's uninstall policy.

**RESOLVED by follow-up runtime probe (same day, Kensei verification pass).** Method: temp git repo `/tmp/pm0-synth-plugin` containing a synthetic `manifest_version: 1` plugin named `hermes-project-stewardship` (the real repo manifest is v2 and this vanilla revision's installer rejects v2 — noted as a separate compatibility finding below); disposable runtime via `PYTHONPATH=/home/kensei/repos/hermes-agent-vanilla` on `/tmp/pm0-vanilla-venv`; `HERMES_HOME=/tmp/pm0-vanilla-home-retention`; a `plugin-data/hermes-project-stewardship/dockyard.db` created with a marker row before any lifecycle command. Transcript:

```text
1 INSTALL file:// --no-enable          rc=0  "Plugin installed but not enabled"
2 wrote probe db + marker row          True
3 DISABLE (dir name)                   rc=0  "⊘ ... disabled. Takes effect on next session."   db survives: True
4 ENABLE                               writes plugins.enabled entry, then interactive allow_tool_override prompt (non-interactive run hangs — must pass allow_tool_override or a TTY)
5 REMOVE (uninstall #1)                rc=0  "✗ Plugin pm0-synth-plugin removed from <home>/plugins"   db survives: True
6 REINSTALL                            rc=0
7 REMOVE (uninstall #2)                rc=0  db survives: True; marker row intact: ('pre-uninstall',)
```

**PROVEN (runtime, this revision):** uninstall removes only the plugin install dir + install metadata (`_remove_plugin_core`, `hermes_cli/plugins_cmd.py:1207-1232` — `shutil.rmtree(target)` and metadata dict update; no plugin-data path); disable/enable are config-only (`plugins_cmd.py:1258-1298`, `cmd_enable` at `1405`); `plugin-data/<namespace>` survives disable, enable, and TWO uninstall/reinstall cycles with data intact. Note for Phase 3: `plugins enable` on a non-bundled plugin blocks on an interactive `allow_tool_override` capability prompt — any automated activation flow must handle it explicitly. Caveat: probe used a synthetic v1 manifest (identical plugin name/namespace) because the dockyard manifest is v2; retention is host-side policy keyed on the plugin namespace, and the v2 rejection is itself evidence the real plugin needs a newer host than this vanilla revision.

### One home per process

**PROVEN:** the host adapter stores a home at construction (`vanilla_host.py:47-50`) and scopes calls by temporarily setting the Hermes-home override (`vanilla_host.py:57-66`). Vanilla profile paths are resolved from process environment/active profile helpers (`profiles.py:271-298`). A running process does not provide a supported live home-switch contract; switching `HERMES_HOME` is a process-launch concern. **Recommendation:** treat `HERMES_HOME` as immutable at process startup and launch a new plugin/backend process when changing homes; do not claim hot switching.

## PM-0015 — PRD correction / canonical ownership

**STATUS: APPLIED to `docs/dockyard-prd-v0.3.md` (Phase 0, 2026-09-10).** D1
annotated with the correction, WorkItem/Epic reclassified as legacy/compatibility
read-model vocabulary, §3.4 canonical-ownership block added, PM-01/PM-02/PM-07,
UX-04 and G1 rewritten to Hermes-Kanban-canonical phrasing. Repo-wide sweep
confirmed no remaining current-document ownership contradictions (README and
release notes already state Hermes Kanban canonical ownership; remaining
"work item" phrasing elsewhere is generic and ownership-neutral).

The following legacy statements in `docs/dockyard-prd-v0.3.md` needed correction (all now applied):

* §decision table row D1 (`line 14`) says “native work-item model, plus Hermes Kanban as an execution backend.” Replace with: **Hermes Kanban is the canonical work/execution model; Stewardship integrates with it and adds project-governance metadata.**
* `WorkItem` and `Epic` definitions (`lines 80-81`) must not describe Stewardship-owned universal task/epic rows. They are compatibility/read-model vocabulary only, mapped to Hermes task rows; epic identity is represented through the Kanban task/tenant convention used by the adapter (`vanilla_host.py:300-337`).
* Initiative promotion language (`line 94`) and PM-01/PM-02/PM-07 (`lines 119-125`) should describe creating/updating/linking canonical Hermes tasks and recording Stewardship metadata/evidence, not creating a second native WorkItem store.
* UX-04 (`line 154`) should say board/table views operate on Hermes Kanban tasks, not “native work-items.”
* G1 (`line 195`) should call the WorkItem model a migration/compatibility layer or projection, not PM core ownership.

### Exact split

* **Hermes Kanban owns:** task/epic records, hierarchy/links, task status transitions, claims/running locks, assignments/reassignments, task comments/events, and execution lifecycle.
* **Stewardship owns:** project membership and lead metadata, project/initiative metadata, objectives, evidence/observations, governance decisions, feature enablement, and plugin-owned provisioning/reconciliation journals.
* **Shared boundary:** Stewardship stores canonical Hermes IDs/references and metadata; it must not duplicate canonical task status, claims, or assignee fields as authoritative state.

## Consistency-model implication

**Recommendation: durable saga, not a canonical batch-assignment transaction.** Vanilla provides no batch reassignment transaction (`PM-0011(b)`), and single-task assignment has no general revision precondition (`PM-0011(c)`). Stewardship must therefore model multi-task reassignment/provisioning as an idempotent durable saga: record intent and per-task outcomes, retry safely, reconcile by rereading Hermes Kanban, and surface partial failure. A future Hermes batch API could justify a canonical transaction later, but it does not exist at revision `8c098e9e819169879a7b2f74990e83b5d39696c8`.

## Evidence limitations

* The native >100 enumeration and claimed-task handoff were executed against disposable homes and direct vanilla Python imports.
* Plugin lifecycle retention WAS completed by the follow-up probe above (synthetic v1 manifest, identical namespace) — disable/enable are config-only and `plugin-data/<namespace>` survives two uninstall/reinstall cycles at this revision.
* **Compatibility finding (PM-0014) — RESOLVED with the shipped v1 manifest (final probes, same day):** the plugin ships `plugin.yaml` with the v1 manifest shape (`manifest_version`/`api_version` keys removed; the v2-only fields are gone). The REAL plugin was installed from a local Git URL (repository clone) into a temporary vanilla Hermes home at checked-out `8c098e9e`:

  - `hermes plugins install file:///… --enable` → **Installed + enabled** (exit 0) with install scanning disabled (`plugins.scan_on_install: false` in the temp home's `config.yaml` because the scan flags the repo's own docs/demo/test fixtures, not plugin code).
  - Discovery, load and health: plugin present at `<HERMES_HOME>/plugins/hermes-project-stewardship`, loaded by the host, health endpoint responds.
  - Disable/re-enable and uninstall/reinstall retention were already proven in the lifecycle probe above (identical namespace; `plugin-data/<namespace>` survives both cycles).
  - Earlier v2-manifest probes (kept for the record): the real v2 manifest parsed, passed `plugins doctor` with zero warnings, and the directory-scan gate yielded `load` at upstream/main `866332bf`; URL-based install of a v2 manifest is refused at all probed revisions (installer gate `_SUPPORTED_MANIFEST_VERSION = 1`). These are historical probes — the shipped manifest is v1.

  **Install-path statement (authoritative):**
  - **Supported:** `hermes plugins install Sahil-SS9/hermes-project-stewardship --enable` (repository/Git URL; verified with the real v1 plugin from a local Git URL).
  - **Explicitly unsupported:** local `.` installation — `hermes plugins install . --enable` is not a supported Hermes command (`.` resolves through the community index and fails with "Plugin '.' was not found in the community index"). This is not a project blocker; it is not part of the deployment path.

  **Historical v2 compatibility probes (not the shipped manifest):**

  | Vanilla revision | Loader v2 support | Installer v2 support | Result |
  |---|---|---|---|
  | `bd6dcd4bd5` (2026-08-12) | yes | no | v2 loader introduced; installer still rejected v2 |
  | `8c098e9e819169879a7b2f74990e83b5d39696c8` (2026-08-28) | yes | no | v2 parsed/doctor passed; URL install rejected v2 |
  | `866332bfb52c46e543143b2620a9aeee8bce9c77` (2026-09-08) | yes | no | directory scan loaded v2; URL install rejected v2 |

  These rows explain why the project changed to a v1 manifest. They do not constrain installation of the shipped v1 plugin. The shipped v1 plugin installs from a repository/Git URL; local `.` remains unsupported. Phase 6 should test the supported host matrix and target upstream/main `866332bf` or newer where practical.
* No live home or live database was touched.
