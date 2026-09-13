#!/usr/bin/env bash
# Lane A — PM-0606 latest-host compatibility cell: EXACT isolated setup.
#
# Read-only-discovery result (2026-09-13, no checkout mutation):
#   upstream main  = a7254e2d4c170725a4136591e96efc5066251d2c (NousResearch/hermes-agent)
#   installer gate = hermes_cli/plugins_cmd.py:161  _SUPPORTED_MANIFEST_VERSION = 1
#   plugin mount   = hermes_cli/web_server.py:984   _mount_plugin_api_routes()
#   Both seams are UNCHANGED vs the pinned minimum 8c098e9e... — the shipped
#   v1-shape manifest and the plugin_api router contract remain the supported
#   interface. Refetch the two raw URLs below before running to re-confirm.
#
# This script runs the Phase 6 compatibility suite against a FRESH clone of
# upstream main in a disposable directory. It never touches:
#   - /home/kensei/repos/hermes-agent-vanilla (shared snapshot, read-only)
#   - any live installation, gateway or home
#
# Usage:  bash scripts/phase6/run-latest-host-cell.sh [UPSTREAM_SHA]
# Needs network for the clone (or point UPSTREAM_CLONE at an existing fresh
# clone). Runtime cost: one clone + pytest subset (~2 min).
set -euo pipefail

UPSTREAM_SHA="${1:-a7254e2d4c170725a4136591e96efc5066251d2c}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d /tmp/stewardship-latest-host-XXXXXX)"
LOG_DIR="${STEWARDSHIP_LOG_DIR:-/tmp/stewardship-lane-a-logs}"
mkdir -p "$LOG_DIR"

echo "=== PM-0606 latest-host cell ==="
echo "upstream sha : $UPSTREAM_SHA"
echo "disposable   : $WORK"
echo "lane worktree: $REPO_ROOT"

# 0. Re-confirm the two compatibility seams at the target SHA (read-only).
seam() {
  local name="$1" url="$2" expect="$3"
  local file="$WORK/$(basename "$url")"
  curl -fsSL "$url" -o "$file"
  if grep -q "$expect" "$file"; then
    echo "SEAM OK   $name: '$expect' present at $UPSTREAM_SHA"
  else
    echo "SEAM FAIL $name: '$expect' NOT found at $UPSTREAM_SHA — inspect before proceeding" >&2
    exit 2
  fi
}
seam Installer "https://raw.githubusercontent.com/NousResearch/hermes-agent/${UPSTREAM_SHA}/hermes_cli/plugins_cmd.py" "_SUPPORTED_MANIFEST_VERSION = 1"
seam Mount     "https://raw.githubusercontent.com/NousResearch/hermes-agent/${UPSTREAM_SHA}/hermes_cli/web_server.py"    "_mount_plugin_api_routes()"

# 1. Fresh upstream clone into the disposable dir (never the shared snapshot).
git clone --quiet --filter=blob:none https://github.com/NousResearch/hermes-agent.git "$WORK/hermes-agent"
git -C "$WORK/hermes-agent" checkout --quiet "$UPSTREAM_SHA"
ACTUAL="$(git -C "$WORK/hermes-agent" rev-parse HEAD)"
echo "cloned HEAD  : $ACTUAL"
[ "$ACTUAL" = "$UPSTREAM_SHA" ] || { echo "SHA mismatch" >&2; exit 2; }

# 2. Vanilla runtime needs pyyaml in the executing venv (host-side dependency;
#    the lane records this in the runbook). Use the lane venv as-is.
PY="$REPO_ROOT/.venv/bin/python"

# 3. Run the Phase 6 compatibility suite against the FRESH clone with
#    disposable homes. STEWARD_REQUIRE_NATIVE_HOST=1 turns the real-host
#    matrix test from skip into a hard requirement.
export STEWARD_REQUIRE_NATIVE_HOST=1
export PYTHONPATH="$WORK/hermes-agent"
export HERMES_KANBAN_HOME="$WORK/kanban-home"
export PYTHONDONTWRITEBYTECODE=1
cd "$REPO_ROOT"
set +e
.venv/bin/python -m pytest tests/test_phase6_compatibility.py -v -o addopts="" \
  --basetemp "$WORK/pytest" 2>&1 | tee "$LOG_DIR/pm0606-latest-host.log"
RC=${PIPESTATUS[0]}
set -e

echo "=== result: exit $RC (log: $LOG_DIR/pm0606-latest-host.log) ==="
# Cleanup is left to the operator: rm -rf "$WORK" (disposable /tmp).
exit "$RC"
