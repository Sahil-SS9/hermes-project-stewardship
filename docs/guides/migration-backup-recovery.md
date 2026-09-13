# Migration, backup and recovery prerequisites

> **Status:** explanatory guide prepared for Phase 8 (PM-0806) plus the backup
> and rollback prerequisites the deployment decision checklist consumes. Read
> from the frozen integration commit
> `b462249ac37447bb32c3426d3f2c6d93bb17ee66`. No backup, restore, migration or
> deployment was executed while producing it.

## 1. Three different things, never interchangeable

| Mechanism | What it protects | What it cannot do |
|---|---|---|
| **Database rollback** (select the preserved previous database + previous code, or the isolated-runner rollback) | The Stewardship SQLite database and its schema/rows | Cannot undo a truncated managed file, and cannot be done by downgrading a schema in place |
| **File truncation** (`remove_project_content`) | — | **Irreversible.** Truncating the verified inode to zero bytes is not recoverable from a database backup; only a backup of the filesystem content can restore it, and only if taken before removal |
| **Backup restoration** (`stewardctl export` → `stewardctl restore`) | A consistent, versioned copy of the Stewardship **database only** | Cannot restore the managed content directory, and cannot restore canonical Hermes Projects/Kanban/Profiles state |

Any release note, runbook or checklist that collapses these three into
"rollback" is wrong and must be corrected.

## 2. Database export and restore (existing, verified in source)

```bash
stewardctl --db /abs/path/stewardship.db export --output /abs/new-archive-dir
stewardctl restore --archive /abs/archive-dir --target /abs/new-restored.db
```

`persistence/backup.py`:

- Export uses SQLite's online backup API into a temporary directory, runs
  `PRAGMA integrity_check`, records `manifest_version`, `created_at`,
  `schema_version`, database byte size and SHA-256, then moves the directory
  into place atomically. The database file is mode 0600 and the archive
  directory 0700.
- The export refuses an existing destination path, a non-directory parent and a
  symlinked parent.
- Restore refuses: a symlinked/non-directory archive, a missing or symlinked
  manifest, a non-`1` manifest version, absolute or `..` database paths, any
  symlink along the archive path, a checksum mismatch, a byte-size mismatch, a
  pre-existing target, a non-directory target parent, and a database whose
  integrity or `schema_version` does not match the manifest.

Honest limits to state alongside it:

- **The archive covers the database only.** Managed project content lives at
  `<database parent>/project-content` and is *not* included. A restored database
  can therefore reference content files that do not exist in the restored
  environment. Any cutover that uses export/restore must back up the managed
  content directory separately, or explicitly accept that managed content is
  left behind. Do not present `stewardctl export` as a full-system backup.
- Export/restore does not touch canonical Hermes Projects, Kanban, Profiles or
  repository state. Those have their own owners and their own backups.
- Copying a live `.db` file without its WAL sidecars is not a valid backup
  (`docs/RUNTIME-STATE.md` says the same, in the context of legacy-database
  triage).

## 3. Schema migration

- Migrations are forward-only, numbered, and applied on open
  (`persistence/migrations.py`). A newer-than-supported schema fails closed
  rather than being used.
- There is no in-place production downgrade. Rollback means pairing the
  preserved previous database with the previous code
  (`docs/RUNTIME-STATE.md` §Existing installations).
- Pre-upgrade snapshot is mandatory before any upgrade that changes schema; the
  snapshot must be verified (manifest integrity plus a restore into a separate
  temporary path) before cutover.
- Migration proof obligations already met in earlier phases (recorded in
  `docs/plans/evidence/project-management-phase*.md`, historical, not a fresh
  gate): existing mission/owner/member/objective/milestone/workflow/evidence/
  audit state survives migration, and interrupted migration recovers. Re-prove
  them against the exact candidate at Phase 7/8; do not cite the earlier packet
  as the current gate.

## 4. Legacy-work migration (`dockyard-migrate-legacy`)

- `dry-run` is non-mutating and reports what would be migrated.
- `apply` requires **marker-owned** roots: the source directory must contain
  `.dockyard-isolated-migration-source` and the target home
  `.dockyard-isolated-migration-target`, each containing the literal
  `dockyard-isolated-v1`. Symlinked or missing roots are refused.
- `apply` copies the whole target home to a snapshot path that must not already
  exist; on any failure the mutated target is renamed aside to
  `<snapshot>-failed` and the snapshot is copied back. That is the automatic
  restore.
- `rollback()` requires a verified snapshot directory, renames the current
  target to `<snapshot>-applied` (preserved, not deleted) and copies the
  snapshot back.
- Consequence to state plainly: this runner is designed for **isolated
  fixture/isolated-home** migrations. Nothing in this lane's reading shows it
  is authorised for a live production home, and the handoff for this work
  forbids touching live homes at all.

## 5. Runtime recovery paths (in-release)

| Situation | Path |
|---|---|
| Legacy database ambiguity at startup | Resolver refuses to adopt silently; operator triages and selects with `STEWARD_DB_PATH` (`docs/RUNTIME-STATE.md`) |
| Partial/blocked work transfer | `GET /operations/{op_id}` for journalled progress, `POST /operations/{op_id}/retry` to resume; membership remains `departure_pending` until readback proves outcomes |
| Native observation vs canonical drift | `POST /projects/{id}/reconcile` and the `/project-reconcile` slash route (`ReconcileService`, gated by the `reconciliation` feature flag) |
| Removal interruption | Re-run removal: `pending` and `quarantined` states are retry-safe; a missing quarantine marker is refused, not guessed |
| Feature disabled by mistake | Re-enable restores exactly; disable hides and denies but never deletes records |

## 6. Prerequisites to check before any cutover (evidence required, not assumed)

1. Candidate SHA and branch stated and bound to every log (Phase 4 of the
   returned packet).
2. A verified database export of the **current** production Stewardship
   database, plus a separate filesystem backup of the managed content root.
3. Written rollback plan naming which database + which code revision are
   restored together, and confirmation that no in-place downgrade is attempted.
4. Explicit statement of what rollback cannot recover: managed content removed
   after the backup, and anything in canonical Hermes stores.
5. Confirmation that the user's installed Desktop/plugin is not modified by the
   upgrade rehearsal, and that the rehearsal uses disposable homes and
   databases.
6. Soak/pilot evidence collected separately; merge approval does not authorise
   installation, activation or deployment (plan §1.1 and §5).

## 7. Declarations flagged as lacking proof (see lane report §5)

- "Managed-content removal is permanent" is true; "removal is secure erasure" is
  **not** claimed anywhere in source and must not be written into release notes.
- No document in the repository currently states a supported
  minimum/latest vanilla Hermes revision for the compatibility promise; the
  claim is bounded to host contract v2 (`docs/api.md`). Treat any stronger
  compatibility claim as unproven until Phase 6 supplies it.
- The export archive has never been presented as including managed content; if a
  release note implies otherwise, that is a defect to fix.
