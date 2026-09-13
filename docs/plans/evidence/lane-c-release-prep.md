# Lane C — Documentation and Phase 8 reconciliation preparation (return packet)

**Lane status: COMPLETE FOR REVIEW.** No self-approval of the release. Lane C
finishing does **not** mean Phase 8 passes.

- Repository: `https://github.com/Sahil-SS9/hermes-project-stewardship.git`
- Worktree: `/home/kensei/worktrees/stewardship-lane-c-release-prep`
- Branch: `work/stewardship-lane-c-release-prep`
- Base (frozen): `b462249ac37447bb32c3426d3f2c6d93bb17ee66` (verified as ancestor; HEAD == base)
- Commits: **none** — all changes left uncommitted for review
- Environment: no venv was created in the worktree; no dependency, lockfile or
  package metadata was touched.

---

## 1. What this lane did, in plain English

Lane C owns documentation, not product code. It did three things:

1. **Established the real branch topology from fresh remote evidence** instead of
   trusting the plan's assumption. Result: `main` is an ancestor of the parent
   WIP branch, and the parent WIP branch is an ancestor of the integration
   branch. Nothing has diverged, so the "parent may have moved ahead" risk in
   plan §1.1 is not currently live.
2. **Wrote the canonical documentation set** the Phase 8 gate asks for: one
   ownership model, lifecycle/archive/restore semantics, the recovery and
   backup/rollback prerequisites, and the surface-support matrix — all read from
   the frozen commit, with Phase 6 behaviour clearly marked as not built.
3. **Prepared the Phase 8 paperwork** (reconciliation plan, post-integration
   test checklist, independent review packet template, deployment decision
   checklist) without executing any of it.

No merge, rebase, cherry-pick, push, PR, installation, activation, backup,
restore, browser install or live mutation took place.

## 2. Behaviour/changes mapped to PM IDs

| PM ID | Item | Lane C status |
|---|---|---|
| PM-0801 | Freeze/record current parent WIP SHA and actual PR merge base | **Prepared** — timestamped observation with full SHAs and merge bases in `docs/release/0.3.0-phase8-reconciliation-plan.md` §1 (must be re-fetched before integration) |
| PM-0803 | Parent baseline suite + full candidate suite after reconciliation | **Planned, not run** — exact commands in `docs/release/0.3.0-post-integration-test-checklist.md` §1–2 |
| PM-0804 | Attribute every changed result against the final merge base, retain `59cd75…` as historical evidence | **Planned** — per-range commit/path inventories and the overlap table are the attribution baseline (reconciliation plan §1) |
| PM-0806 | Reconcile README, PRD/roadmap, migration, recovery, lifecycle and surface-support documentation to one canonical ownership model | **Partially prepared** — see §3 file inventory. README, the three new guides and `docs/api.md` are updated/added. PRD v0.3 already carries the Phase 0 canonical-ownership correction (§3.4) and was **not** edited; `docs/architecture.md` and `roadmap.md` were **not** edited (findings in §5) |
| PM-0802 | Merge verified parent into child at a named sync point | **Not performed** (currently a no-op; becomes real only if the parent advances) |
| PM-0805 | Independent code/architecture/data-integrity/security/UX review at the exact candidate SHA | **Not performed** — packet template supplied |
| PM-0807 | Open child → WIP PR only after all gates pass | **Not performed** |
| PM-0808 | Sahil's explicit merge approval; installation/activation/deployment stay unapproved | **Not performed** |
| PM-0601…PM-0607 | Phase 6 surface/security/compatibility hardening | **Not claimed.** Documented as pending Lane A; see the surface matrix in `docs/guides/canonical-ownership-and-surfaces.md` §5 |
| PM-0701…PM-0710 | Phase 7 regression, accessibility and visual proof | **Not claimed.** Checklist supplied for rerun against the merged candidate |

## 3. Changed-file inventory and fingerprint

Modified (tracked) — 2:

- `README.md` — accurate phase status; one-way ownership statement; truthful
  surface table (Desktop complete, Dashboard subset, CLI limits, gateway verb
  limits, model tools, no TUI); export-archive limitation; new documentation
  index.
- `docs/api.md` — route-group table extended with the lifecycle, membership,
  transfers/operations, goals/planning, managed-content, mission and
  health/events groups that Phases 1–5 added, each with its authority; explicit
  "summary, not the contract" note pointing at `/openapi.json`.

Added (untracked) — 7:

- `docs/guides/canonical-ownership-and-surfaces.md`
- `docs/guides/lifecycle-archive-restore.md`
- `docs/guides/migration-backup-recovery.md`
- `docs/release/0.3.0-phase8-reconciliation-plan.md`
- `docs/release/0.3.0-post-integration-test-checklist.md`
- `docs/release/0.3.0-phase8-independent-review-packet.md`
- `docs/release/0.3.0-deployment-decision-checklist.md`
- plus this report, `docs/plans/evidence/lane-c-release-prep.md`

No production source, test, package metadata, lockfile, shared plan/checklist or
Lane A/B evidence file was modified. `git status` in the worktree shows exactly
`M README.md`, `M docs/api.md`, and the five new untracked paths above.

### Fingerprint (9 deliverable files, excluding this report)

```
3f0ab113c9b26b0ea2b432d641d00eae73f5770c2daa6974de14e715f1043891  README.md
6b6c521e31576f444cf03361bcf97d3fd790a0c9008b96db1610ed9bdcb008c6  docs/api.md
6162dd78e26569f360ec9edc7758b2c8cba3a8ab1be49ee89d6816019e0a287c  docs/guides/canonical-ownership-and-surfaces.md
40cbb8e4e6af001bde9a8ebf38c6e77ebe6f7c4ba205ab6c8a0cac4d9c57c052  docs/guides/lifecycle-archive-restore.md
98a989c94099932a91a699414a1c1a657b3850fb9ce4db3593f3a8af1e3c4a6b  docs/guides/migration-backup-recovery.md
fe3c3b421b0ab09965d6cf2fa10646e13fec263e99f7f13d1b1556a1c8c3a914  docs/release/0.3.0-deployment-decision-checklist.md
136faa4a77a8acb1a483ee23a3b64daaf038f0813a4c3de3753e87ba847e7e2b  docs/release/0.3.0-phase8-independent-review-packet.md
64d3e4d255426d2206449a12e67e478a95b426b6e7b83d9a557e4c0d6a7c36e4  docs/release/0.3.0-phase8-reconciliation-plan.md
c225576c5cb1364b262ab9924cbd7617e099187060c9c0bd12a1e2e3ebebc685  docs/release/0.3.0-post-integration-test-checklist.md

COMBINED FINGERPRINT (sha256 over the sorted "path sha256" manifest):
4506d15a9d713f468748530944944d1404e678097afd47f78e9aeadbe2058404
```

Reproduce:

```bash
cd /home/kensei/worktrees/stewardship-lane-c-release-prep
for f in README.md docs/api.md docs/guides/*.md docs/release/0.3.0-*.md; do
  printf '%s  %s\n' "$(sha256sum "$f" | cut -d' ' -f1)" "$f"
done | sort -k2
```

To extend the fingerprint to include this report, add
`docs/plans/evidence/lane-c-release-prep.md` to the same loop and recompute.

## 4. Exact checks run, results, failures and outstanding gates

All checks were read-only. Node/browser suites, full test suites, backups and
restores were deliberately **not** run (out of Lane C authority).

| Check | Command | Result |
|---|---|---|
| Repo identity | `git rev-parse --show-toplevel`, `git config --get remote.origin.url` | `/home/kensei/repos/hermes-project-stewardship`, expected remote — PASS |
| Starting commit | `git rev-parse HEAD` | `b462249…` == declared frozen commit — PASS |
| Integration checkout state | `git status --porcelain --branch` | clean on `feat/project-management-stewardship` — PASS |
| Worktree list / collisions | `git worktree list --porcelain`, `ls /home/kensei/worktrees` | lane path and branch did not exist; no reset/delete/reuse — PASS |
| Lane base | `git merge-base --is-ancestor b462249 HEAD` | YES — PASS |
| Fresh remote refs | `git ls-remote --heads --tags origin` | main/parent/child/tag SHAs recorded (reconciliation plan §1) — PASS |
| Topology | mirror clone + `git merge-base`, `git rev-list --left-right --count` | `main` ancestor of parent; parent ancestor of child; 0 behind everywhere — PASS |
| Route discovery | grep of `api/server.py` route decorators and path literals | route inventory used for `docs/api.md` — PASS (read-only) |
| CLI discovery | grep of `cli/app.py` subparsers | confirms no member/transfer/archive commands at this base — PASS |
| Managed-content removal semantics | read `service.py` lines 1648–2050 (identity, quarantine, `ftruncate`, audit) | documented; zero-byte marker semantics confirmed — PASS (read-only) |
| Export/restore contract | read `persistence/backup.py` | documented; archive is database-only — PASS (read-only) |
| Link integrity | script over the 8 touched/added docs | 29 relative links, 0 broken — PASS |
| README version coherence | string check (`0.3.0` still present, required by `tests/test_release_metadata.py`) | PASS (static) |
| Focused pytest `tests/test_release_metadata.py` on my worktree | `PYTHONPATH=<wt>/src HERMES_HOME=/tmp/lane-c/home HERMES_KANBAN_HOME=/tmp/lane-c/home PYTHONDONTWRITEBYTECODE=1 COVERAGE_FILE=/tmp/lane-c/.coverage /home/kensei/repos/hermes-project-stewardship/.venv/bin/python -m pytest tests/test_release_metadata.py -p no:cacheprovider -o addopts='' --basetemp=/tmp/lane-c/pytest` | **PASS after explicit Sahil approval — 3 passed, 0 failed, 0 skipped, exit 0, 0.60s.** Python 3.13.14, pytest 9.1.1, rootdir = the lane worktree. Raw log: `/tmp/lane-c/logs/test_release_metadata.log`. Provenance printed before the run: `hermes_project_stewardship.__file__` = `<lane worktree>/src/hermes_project_stewardship/__init__.py`, `inside lane worktree: True` (interpreter borrowed read-only from the integration checkout's venv; that venv was not modified). First attempt was refused by the execution guard; the unmodified command was run once after approval, and no other gate was broadened |

Outstanding gates this lane did not attempt and that must not be assumed:
Phase 6 implementation/proof (Lane A), Phase 7 regression/visual/a11y and
installed-Desktop proof (Lane B + coordinator), the blocked focused pytest,
post-integration full suites, independent review, and every Phase 8 merge/
install/activate/deploy decision.

## 5. Cross-lane findings (locations, reproduction, expected vs actual, minimal fix)

**F1 — Phase-label collision between the parent programme and the plan.**
Parent-range commits are titled "complete phase 6 fleet overview…", "phase 7 —
host-driven onboarding…", "phase 8 — accessible, reliable workflow operation",
"phase 9 — practical milestone and capacity planning". Those are
trustworthy-daily-stewardship phases, not PM-06xx/07xx/08xx.
Reproduce: `git log --oneline main..feat/trustworthy-daily-stewardship-20260908`.
Expected: release evidence, PR text and checklists refer to PM IDs unambiguously.
Risk: attributing "Phase 6 complete" to PM-0601…0607 — which are **not** done.
Minimal fix: keep the caution now written in
`docs/release/0.3.0-phase8-reconciliation-plan.md` §1 and never label the
release by bare phase numbers.

**F2 — No declared minimum/latest vanilla Hermes revision (touches PM-0606).**
Reproduce: `grep -rn "minimum\|min_version\|supported version" src/hermes_project_stewardship`
→ only a SQLite-version comment in `persistence/migrations.py`; the bounded
statement in the repo is `docs/api.md` §Canonical-host contract ("requires
Project/Kanban host contract v2"). Expected: a declared supported revision
range for the compatibility promise. Actual: absent at the frozen base.
Minimal fix: Lane A declares the range in code (a constant validated at adapter
composition, `kanban/host_adapter.py`) and in `docs/api.md`; Lane C documents it
once it exists rather than inventing it. **Owner: Lane A.**

**F3 — Export archive excludes managed content while rows embed file identity.**
`persistence/backup.py::export_store` writes only `dockyard.sqlite3` +
`manifest.json`; `persistence/service.py::_content_root` keeps managed files at
`<database parent>/project-content`; `_verify_managed_content_identity` then
requires matching `dev`/`ino`/size/sha256.
Reproduce: read those three functions; a restore into a clean directory yields
`project_content` rows whose files are absent, and any preview/removal on them
fails closed with "project content file is unavailable"/"identity is
unavailable". Expected: a cutover runbook that backs up the content root
separately. Actual: previously undocumented. Minimal fix: documentation done
(README + `docs/guides/migration-backup-recovery.md` §2); optional follow-up for
Lane A — an export-time warning or a content-root backup helper. **Lane C
documented; code decision belongs to Lane A/Sahil.**

**F4 — README previously overstated surface support.**
Before this lane, the README surface table implied a flat four-surface product
and did not say Desktop is the complete surface or that CLI recovery commands
are missing. Actual: `cli/app.py` has no member/transfer/archive commands;
there is no TUI surface; gateway mutations are limited to approve/reject/run.
Minimal fix: applied in `README.md` (surface table) and
`docs/guides/canonical-ownership-and-surfaces.md`. Note for Lane A: its handoff
forbids editing the README, so any further README change it needs must come back
as a proposed patch rather than an edit.

**F5 — No browser/CSRF test corpus for the "browser origin/CSRF assumptions"
part of PM-0604.** Reproduce: `grep -rlE "origin|csrf" tests` returns only
unrelated matches in fixtures. Expected: at least one negative-path test that a
cross-origin/untrusted browser request cannot perform a privileged mutation.
Actual: capability enforcement is tested
(`tests/test_membership_authority_api.py`), origin/CSRF is not. Minimal fix:
Lane A adds the negative-path test with the capability gate. **Owner: Lane A.**

**F6 — Committed dashboard build outputs are a reconciliation hazard.**
`hermes_dockyard_plugin/dashboard/dist/{index.js,style.css}` are tracked and
asserted to exist by `tests/test_release_metadata.py`. They appear in the
parent-only path set, so any future parent dashboard change plus a child rebuild
will conflict textually in generated files. Minimal fix: at the sync point,
resolve generated files by rebuilding (`npm run build`) and record the rebuild
in the evidence rather than hand-merging. **Owner: coordinator, at the sync
point.**

**F7 — `docs/architecture.md` and `roadmap.md` were left unedited on purpose.**
`docs/architecture.md` predates Phases 1–5: its layer table and "Hermes
integration contracts" section do not mention memberships, transfers, operation
journals or managed content. It does not contradict the canonical ownership
model, so this lane did not rewrite it. `roadmap.md` (503 lines) was not
reviewed line-by-line for the same reason. Minimal fix: a later documentation
pass reconciles both against `docs/guides/canonical-ownership-and-surfaces.md`.
Recorded rather than silently skipped, per the handoff's documentation rule.

## 6. Integration notes (what the coordinator must do on the combined candidate)

1. **Re-fetch topology first.** The SHAs in the reconciliation plan are a
   2026-09-13T21:21Z observation. If the parent moved, recompute merge bases and
   re-examine the 13 overlapping paths (highest friction: `api/server.py`,
   `desktop/plugin.js`, `desktop/repro-live.test.mjs`,
   `dashboard/plugin_api.py`, `persistence/service.py`,
   `persistence/migrations.py`).
2. **Expected overlaps with Lane A.** Lane A owns all Phase 6 production files
   (`src/`, `hermes_dockyard_plugin/` production files, essential CLI, adapters,
   `test_phase6_*.py`, `phase6-*.test.mjs`). If its work changes routes, CLI
   commands, the Dashboard subset or compatibility declarations, then
   `docs/api.md` and `docs/guides/canonical-ownership-and-surfaces.md` in this
   lane become stale and must be re-checked at integration. Lane A must not edit
   the README; it returns proposed text instead.
3. **Expected overlaps with Lane B.** Lane B owns `tests/test_phase7_*.py`,
   `phase7-*.test.mjs`, `scripts/phase7/` and `lane-b-*` reports — no path
   overlap with this lane. Its results are base-relative; the post-integration
   checklist §3 reruns them on the merged candidate.
4. **Documentation gate before approval (PM-0806).** Confirm: README status
   honest; surface matrix matches what Lane A actually shipped; F2 (revision
   range) either resolved or explicitly recorded as an accepted gap; F7
   (architecture/roadmap) either reconciled or explicitly deferred; PRD v0.3
   §3.4 still consistent.
5. **Tests to rerun on the combined candidate:** everything in
   `docs/release/0.3.0-post-integration-test-checklist.md` — the Python gate
   sequence (`scripts/local-ci.sh --with-node`, lock-protected), the parent
   baseline comparison, all Phase 7 gates, Phase 6 gate verification, and the
   five interface checks (export/restore, removal rehearsal, lifecycle matrix,
   authority fail-closed, route parity). Nothing in this lane substitutes for
   those.
6. **Do not treat these documents as approval.** They are preparation records.
   PM-0802, PM-0805, PM-0807 and PM-0808 remain unperformed.

## 7. Confirmation

- **No commit.** HEAD in the lane worktree is still
  `b462249ac37447bb32c3426d3f2c6d93bb17ee66`; all lane changes are uncommitted.
- **No push, merge, rebase, cherry-pick or PR**, in this worktree, the
  integration checkout or the mirror clone (the mirror clone was created only to
  read remote refs).
- **No deployment, installation, activation, service restart, backup or
  restore.** No live home, database, managed file, gateway or service was
  touched; no browser was installed and no app was started.
- **No live mutation.** The protected integration checkout is clean at
  `b462249…` and was verified again after the lane's work.
- The only test-harness side effects were disposable directories under
  `/tmp/lane-c/` (probe script and logs) and the lane-owned mirror clone at
  `/home/kensei/worktrees/stewardship-lane-c-remote-cache`; delete the clone if
  the coordinator does not want it retained.
- Stopping here and reporting to Sahil. Not waiting for other lanes and not
  consuming their branches.
