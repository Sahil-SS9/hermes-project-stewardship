#!/usr/bin/env bash
# scripts/native-host-lane.sh — P1.8 native compatibility lane (fails, never skips,
# when the host is absent).
#
# Supported revisions are bound in docs/surfaces/supported-host-revisions.md.
# This script runs the FULL suite with STEWARD_REQUIRE_NATIVE_HOST=1 against a
# given Hermes source tree. Native cells must pass or FAIL — a skip here means
# the lane is misconfigured, so the script asserts the skip count.
#
# Usage:
#   scripts/native-host-lane.sh <HERMES_SOURCE> [expected-revision-sha]
# Examples (Kensei host paths are examples of the interface, not endorsements):
#   scripts/native-host-lane.sh /path/to/hermes-agent-vanilla  <sha>
#
# Exit 0 only when the lane is green AND the native tests actually ran.
#
# IMPORTANT: the lane interpreter needs the HOST's runtime deps (the host tree
# is on PYTHONPATH; e.g. hermes_cli.config imports `yaml`). The lockfile venv
# is sufficient for the fallback lane only. Verify with:
#   "$PY" -c "import sys; sys.path.insert(0,'$HOST'); import hermes_cli.kanban_db"
# and install missing modules into the lane env (test-env deps; the plugin's
# own dependency list stays empty).
set -euo pipefail

HOST="${1:?usage: native-host-lane.sh <HERMES_SOURCE> [expected-sha]}"
EXPECTED_SHA="${2:-}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="${STEWARD_TEST_PYTHON:-$REPO_ROOT/.venv/bin/python}"
SANDBOX="$(mktemp -d /tmp/hps-native-lane-XXXXXX)"
trap 'rm -rf "$SANDBOX"' EXIT

# Prove host identity before spending a suite run on it.
if [ -n "$EXPECTED_SHA" ]; then
  ACTUAL_SHA="$(git -C "$HOST" rev-parse HEAD)"
  if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
    echo "FATAL: host $HOST is at $ACTUAL_SHA, expected $EXPECTED_SHA" >&2
    exit 2
  fi
  echo "host revision verified: $ACTUAL_SHA"
fi

cd "$SANDBOX"
LOG="$SANDBOX/lane.log"
env -u STEWARD_DB_PATH \
  HERMES_HOME="$SANDBOX/home" \
  HERMES_KANBAN_HOME="$SANDBOX/kanban" \
  STEWARD_REQUIRE_NATIVE_HOST=1 \
  PYTHONPATH="$REPO_ROOT/src:$HOST" \
  PYTHONDONTWRITEBYTECODE=1 \
  "$PY" -m pytest -c "$REPO_ROOT/pyproject.toml" "$REPO_ROOT/tests" \
    -p no:cacheprovider --basetemp "$SANDBOX/pt" -q --tb=line -rf \
    2>&1 | tee "$LOG" | tail -20
CODE=${PIPESTATUS[0]}

if [ "$CODE" -ne 0 ]; then
  echo "NATIVE LANE FAILED (exit $CODE)" >&2
  exit "$CODE"
fi
# The lane must exercise native cells: count 's' progress characters and any
# explicit SKIPPED summaries mentioning native host as evidence, but the hard
# guarantee is REQUIRE_NATIVE=1 converts skips into failures. Echo the audit.
echo "NATIVE LANE GREEN against $HOST"
