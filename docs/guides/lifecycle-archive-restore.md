# Lifecycle, archive/restore and managed-content removal

> **Status:** explanatory guide prepared for Phase 8 (PM-0806), read from the
> frozen integration commit `b462249ac37447bb32c3426d3f2c6d93bb17ee66`.
> It describes behaviour implemented in Phases 0–5 of the authoritative plan.
> Phase 6/7 work is not included; anything not built at that commit is marked
> *pending*.

## 1. Project lifecycle

`domain/constants.py::ProjectPhase` and `ProjectLifecycle` define exactly one
transition matrix. Any transition not listed is refused.

| From | Allowed to |
|---|---|
| `active` | `paused`, `frozen`, `disabled`, `archived` |
| `paused` | `active`, `disabled`, `archived` |
| `frozen` | `active`, `disabled`, `archived` |
| `disabled` | `active` (re-enable) |
| `archived` | `active` (restore) |

Side effects: `paused_at` is stamped on pause/freeze and cleared on resume;
`updated_at` always changes. `freeze` refuses everything until an explicit
resume; `pause` refuses gateway/cron/webhook cycles while manual cycles remain
allowed (`docs/architecture.md` §Fail-closed rules).

Surface entry points: `/stewardship/v1/projects/{id}/{pause,resume,freeze,
disable,re-enable,archive,restore}` (`api/server.py`), and
`stewardctl project {pause,resume,freeze,disable}`.

## 2. Membership and leadership

- States: `active`, `departure_pending`, `departed`, and `unavailable` as a
  **display** status for a profile that vanished (`MembershipState`).
- Exactly one `active` lead is enforced in the database, with the lead's
  active state and role mutually guarded (a lead cannot be moved to
  `departure_pending`, `unavailable` or `departed` while no replacement active
  lead exists — `persistence/membership.py::set_state_in_tx`).
- Work transfer eligibility (`TransferEligibility`): eligible statuses are
  `backlog`, `triage`, `todo`, `ready`, `blocked`, `review`. `claimed`,
  `running`, `done`, `archived` and `scheduled` are non-transferable, and
  `epic` is never assignable (grouping record). The Phase 0 decision kept
  claimed/running work non-transferable because no safe handoff contract was
  proven.
- Transfer contract: durable, idempotent, resumable saga
  (`persistence/transfer.py`). Per item it journals intent → conditional host
  write (`assign_task_if_unchanged`, which re-verifies assignee, status,
  claim-lock absence and revision atomically) → canonical readback → outcome.
  A replay with the same idempotency key returns the recorded outcome without
  touching the host. A lost host response is recognised as completed through
  readback, never silently skipped. Membership remains `departure_pending`
  until every eligible outcome is proven by readback. Consequence previews
  carry a deterministic fingerprint (`preview_fingerprint`) and a stale
  fingerprint is rejected rather than executed.
- Operation states (`OperationState`): `pending`, `running`, `completed`,
  `failed`, `compensated`. Progress, partial failure and retry are surfaced;
  false success is not permitted.

## 3. Archive and restore

Archive/restore exists for every management entity that this release exposes.
Restore is the inverse of archive; archive never deletes.

| Entity | Archive | Restore | Notes |
|---|---|---|---|
| Project | `POST /projects/{id}/archive` | `POST /projects/{id}/restore` | Lifecycle side effects apply. Canonical project, board, tasks and repository are untouched — Stewardship governs its own metadata only. |
| Mission | `POST /projects/{id}/mission/archive` | — (restore is re-setting a mission) | `archived_missions` lists history; missions are single-instance metadata. |
| Goal | `POST /projects/{id}/goals/{goal_id}/archive` | `.../restore` | Create/edit/reorder plus nullable objective linking (PM-0501). |
| Objective | `POST /projects/{id}/objectives/{objective_id}/archive` | — (archived objectives are listed with `include_archived`) | Removal is archive in this release (PM-0504). |
| Milestone | `POST /projects/{id}/milestones/{name}/archive` | `.../restore` | Removal is archive; milestone/work attribution is preserved. |
| Workflow definition | `POST /projects/{id}/workflows/{name}/archive` | `.../restore` | Versions are explicit; runs are journaled. Saved Views stay visibly separate from executable workflow definitions (PM-0506). |
| Managed content | `POST /projects/{id}/content/{content_id}/archive` | `.../restore` | Archive is metadata-only; the file remains in the managed root. |

## 4. Managed-content removal — exact semantics and limits

Removal is the one irreversible Stewardship file operation. It is implemented in
`persistence/service.py::remove_project_content` and is deliberately narrow.

Preconditions, in order:

1. Stewardship knows the project and the content record.
2. **Dependency check**: any dependent item (task, milestone, objective,
   workflow, view) blocks removal with the offending references listed.
3. **Path safety**: `stored_path` must be a relative, contained path under the
   managed content root, with no symlinked component, resolving inside the root
   and pointing at a regular file (`_managed_content_candidate`).
4. **Identity + integrity**: stored `dev`/`ino` must equal the on-disk inode,
   `size_bytes` must match, and the SHA-256 of the opened file must match the
   recorded digest (`_verify_managed_content_identity`,
   `_verify_open_content_file`). Any mismatch refuses removal.
5. **Quarantine**: the file is renamed inside the same directory to
   `.<content_id>.removing`, the rename is verified against the open descriptor,
   and the record moves to `removal_state='quarantined'`.
6. **Erase step**: the quarantined file is re-verified, opened `O_RDWR`
   (no-follow), truncated with `ftruncate(fd, 0)`, `fsync`-ed, and the
   zero-size result is confirmed. Only then does the record move to
   `removal_state='file_removed'` with `removed_at`/`removed_by` and a single
   audit row `project.content_file_removed`.

Guarantees and honest limits:

- **This is not secure physical erasure.** The inode is truncated to zero bytes
  and a zero-byte marker file remains under the `.removing` name. No unlink
  happens, and no guarantee is made about stale blocks, filesystem journals,
  snapshots, prior backups or copies elsewhere. Do not describe removal as
  "secure deletion" in any surface or release note.
- **Idempotent replay**: a repeat call on a `file_removed` record returns its
  metadata without touching the filesystem.
- **Retry-safe failure classes**: a filesystem failure during quarantine leaves
  `removal_state='pending'`; a failure after quarantine leaves
  `'quarantined'`. Both are retried by calling removal again, and the refusal
  text says so.
- **Consecutive-interruption recovery**: if the file is already absent while the
  record is `pending`/`quarantined`, recovery is only permitted through the
  quarantine marker. When the marker is the same inode and is zero bytes and
  the record is `quarantined`, the operation completes the database transition
  without touching the file. If the marker is missing, removal is **refused**
  rather than assumed.
- **Replacement-file safety**: because every step is bound to the opened
  descriptor's inode, size and digest, a different file placed at the same path
  is never the file that gets truncated. If quarantine identity is violated and
  the original path is empty, the implementation attempts to restore the
  quarantined name before refusing.
- **Irreversibility boundary**: restoring a database backup does **not** bring
  back removed bytes. Recovery of removed content requires a pre-removal backup
  of the managed content root — see `docs/guides/migration-backup-recovery.md`.

## 5. Explicitly deferred or never in this release

Not hidden follow-ups, and not blockers (plan §1.3 and §4):

- permanent project metadata purge;
- permanent milestone deletion and permanent workflow-definition deletion;
- workflow cloning and rich graphical workflow authoring;
- repository or arbitrary filesystem deletion;
- permanent objective removal beyond archive;
- full Cartesian visual testing of every state/theme/width combination.

`disable` is also deliberately non-destructive: it hides and denies access and
never deletes records, and re-enabling restores exactly the prior state.

## 6. Claims this guide does not make

- No claim of cross-database atomicity for membership or transfer operations.
- No claim that archived canonical Hermes work is preserved by Stewardship —
  canonical project, board, tasks and repository are untouched by Stewardship
  archive operations, and Stewardship does not own them.
- No claim that the removal path has been exercised against a real installed
  Desktop or a production database. Phase 7 regression matrices and the real
  installed-plugin proofs (PM-0703/PM-0709) are still outstanding.
