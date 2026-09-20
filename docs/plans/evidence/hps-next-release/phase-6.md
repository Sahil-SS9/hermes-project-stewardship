# HPS next release — Phase 6 evidence

Candidate: `/home/kensei/worktrees/stewardship-release-candidate-r3`
Status: **PASSED** — backend hierarchy/import, shared-validator UI wiring AND the rendered import journey verified with fresh evidence.

## Delivered

- Added the `feature` work-item type and enforced Epic → Feature → Task containment in the domain model and fresh persistence schema.
- Parent references are project-scoped and validated before persistence; invalid type relationships and cross-project parent attempts are refused.
- Shared CSV validator (`preview_csv_import` → `import_csv`): required columns, supported types, title length, duplicate `row_key`s, parent references, hierarchy cycles, size bounds, and parent-first deterministic ordering are validated before write.
- Apply is retry-safe at the validation seam: invalid files write zero rows, valid files materialise parent-first and return row-key to canonical-ref mappings.
- Desktop import wizard now wired to the shared validator (this session):
  - Preview step calls `POST /projects/{id}/backlog/import` with `apply: false`
    and renders server-side row errors; the UI no longer maintains a second
    validation vocabulary.
  - JSON paste is normalised to the shared CSV schema before validation.
  - Commit sends one `apply: true` request; the file is validated and
    materialised parent-first server-side; failures keep the preview visible
    for retry (P6.9).
  - "Download CSV template" fetches the backend template and falls back to
    the identical columns offline — template and validator cannot drift (P6.10).
- Plugin proxy routes added: `POST /projects/{id}/backlog/import`,
  `GET /projects/{id}/backlog/import-template` (`dashboard/plugin_api.py`).

## Rendered import journey (P6.7–P6.10 closure) — this session

```
STEWARD_DESKTOP_URL=http://127.0.0.1:19500/desktop \
  node --test hermes_dockyard_plugin/desktop/phase6-import-journey.test.mjs
→ 1 passed
```

The journey, through the REAL rendered plugin and its own fetch proxy:

1. Invalid CSV (unknown type + dangling parent) → server-side preview flags
   `unsupported work type`; the commit label excludes skipped rows; the
   canonical work list is unchanged (zero rows written on preview).
2. Back → fix rows (canonical header, `parent_key` link) → commit →
   "Imported 2 items" → canonical tree readback shows both items with
   `task.parent_ref == epic.ref` (the store the Backlog tree renders).
3. Legacy friendly header (`type,title,assignee,due,parent`) is translated to
   the shared validator vocabulary in the UI with per-file unique `row_key`s
   (durable idempotency keys) — one validation contract, no drift.
4. Canonical bridge fixed: `import_csv` now materialises through
   `CanonicalWorkService.create_item` when attached, so imported hierarchy
   lands on the Kanban-backed work list with parent links and per-row
   idempotency keys (`persistence/dockyard_service.py`). Rehearsed with the
   migration lanes.

## Verification (fresh, this session)

```
env -u HERMES_DELEGATED_CHILD_CONTEXT -u HERMES_AGENT_DELEGATED_CHILD_CONTEXT \
  PYTHONPATH=src:/home/kensei/repos/hermes-agent-vanilla \
  .venv/bin/pytest -p no:warnings --tb=short
→ 892 passed, 2 skipped
```

- `tests/test_phase6_hierarchy_bulk_import.py` + `tests/test_phase6_compatibility.py`
  + migration rehearsal lanes (`test_migration_proof.py`,
  `test_migrate_legacy_cli.py`): **21 passed** after the canonical bridge change.
- `node --check hermes_dockyard_plugin/desktop/plugin.js`: passed.
- `backlog-slice.test.mjs` (asserts the shared-validator import seam),
  `phase6-focus.test.mjs`, `phase6-import-journey.test.mjs`: passed.
- Full Desktop browser suite: **26 passed, 0 failed**.

## Gate decision

**PASSED.** Backend hierarchy/import/validation, template consistency, the
shared-validator UI wiring, the canonical bridge into the Backlog tree, and
the rendered journey (preview → zero-write → fix → commit → tree readback)
are green with the exact commands above. Nothing deployed; no live data
touched.