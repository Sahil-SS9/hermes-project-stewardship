#!/usr/bin/env bash
# Lane B Phase 7 reusable runner — light gates only (no heavy suite).
# Heavy suites / browser matrices must run under the shared flock:
#   flock -n /tmp/stewardship-heavy-gates.lock -c "scripts/phase7/run-phase7.sh --heavy"
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
PY="$PWD/.venv/bin/python"
if [ ! -x "$PY" ]; then echo "FATAL: missing .venv; run: uv sync --locked --extra dev --extra plugin" >&2; exit 1; fi
"$PY" -c 'from pathlib import Path; import hermes_project_stewardship as p; print("candidate import:", p.__file__); assert Path(p.__file__).resolve().is_relative_to(Path.cwd() / "src")' || exit 1
EVIDENCE="${STEWARD_CI_EVIDENCE:-${TMPDIR:-/tmp}}/lane-b-phase7-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EVIDENCE"
export HERMES_HOME="$EVIDENCE/hermes-home" HERMES_KANBAN_HOME="$EVIDENCE/hermes-home" PYTHONDONTWRITEBYTECODE=1
unset STEWARD_DB_PATH DOCKYARD_PLUGIN_DB STEWARD_RPC_TOKEN DOCKYARD_PLUGIN_URL DOCKYARD_ACTOR_ID
echo "evidence: $EVIDENCE"
"$PY" -m pytest tests/test_phase7_proxy_journeys.py tests/test_phase7_departure_recovery.py tests/test_phase7_isolation_retention.py tests/test_phase7_visual_matrix.py tests/test_phase7_accessibility.py -p no:cacheprovider --basetemp "$EVIDENCE/pytest" -v 2>&1 | tee "$EVIDENCE/lane-b-phase7-pytest.log"
PYCODE=${PIPESTATUS[0]}
echo "--- node phase7 harnesses ---" | tee -a "$EVIDENCE/lane-b-phase7-pytest.log"
DOCKYARD_CAPTURE_SCREENSHOTS=0 node --test hermes_dockyard_plugin/desktop/phase7-visual.test.mjs hermes_dockyard_plugin/desktop/phase7-a11y.test.mjs 2>&1 | tee -a "$EVIDENCE/lane-b-phase7-node.log"
NODECODE=${PIPESTATUS[0]}
echo "evidence dir: $EVIDENCE (py=$PYCODE node=$NODECODE)"
exit $((PYCODE || NODECODE))
