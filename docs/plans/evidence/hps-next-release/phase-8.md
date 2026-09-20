# Phase 8 evidence — candidate `hps/release-candidate-r3`

## Verdict
**PARTIAL — backend canvas persistence is exercised; 8A/8B acceptance is not complete.**

## Implemented and verified
- Existing Phase 8A canvas model persists project-scoped objects/connectors, revision metadata, optimistic stale-write refusal, and safe visual-reference deletion.
- Existing API and Dashboard proxy routes expose canvas read/write/delete.
- Added provider-neutral curation seam with explicit context fingerprint, provenance/provider metadata, approval-required proposals, and explicit `provider_failed` results.
- Added public API and proxy route: `POST /projects/{project_id}/canvas/curate`.

## Evidence
- `PYTHONPATH=src:/home/kensei/repos/hermes-agent-vanilla .venv/bin/pytest -q tests/test_phase8_canvas_model.py tests/test_phase8_curation.py` → **6 passed**, exit 0.
- `PYTHONPATH=src:/home/kensei/repos/hermes-agent-vanilla .venv/bin/python -m compileall -q src hermes_dockyard_plugin` → exit 0.

## Remaining gates (unchecked)
- 8A media/content capture journey, Desktop canvas controls, project switching, rendered browser journey, and disposable real-host readback are not yet proven.
- 8B assigned vanilla provider/model discovery, persistent clarify/grill ledger, synthesis drafts, trusted-human approval/promotion, and full provider/API/Desktop browser journey remain outstanding.
- No live provider turn, merge, publication, deployment, or activation was performed.
