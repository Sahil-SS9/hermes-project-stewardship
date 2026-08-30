#!/usr/bin/env bash
# scripts/local-ci.sh — local CI mirror for Project Stewardship ("Dockyard").
#
# Why this exists: GitHub Actions is rate-limited for this account; the repo's
# gate sequence cannot run there for now. This script mirrors the ci.yml gate
# sequence exactly so CI evidence stays truthful while Actions is unavailable.
# The NOTE block in .github/workflows/ci.yml points here as the authoritative
# evidence source. Gate values match ci.yml; change both together or neither.
#
# Usage:
#   scripts/local-ci.sh                 # all Python gates
#   scripts/local-ci.sh --with-node     # + dashboard/desktop JS gates
#   scripts/local-ci.sh --json          # machine-readable summary at the end
#   scripts/local-ci.sh --quick         # skip byte-compile (slow on big trees)
#
# Exit code 0 only when every selected gate passes.
set -uo pipefail

GREEN='\033[32m'; RED='\033[31m'; DIM='\033[2m'; NC='\033[0m'
FAILURES=0
WITH_NODE=0; JSON_OUT=0; QUICK=0
declare -a RESULTS

pass() { RESULTS+=("PASS|$1|$2"); echo -e "${GREEN}PASS${NC}  $1 ${DIM}($2)${NC}"; }
fail() { FAILURES=$((FAILURES+1)); RESULTS+=("FAIL|$1|$2"); echo -e "${RED}FAIL${NC}  $1 $2"; }

for arg in "$@"; do
  case "$arg" in
    --with-node) WITH_NODE=1 ;;
    --json) JSON_OUT=1 ;;
    --quick) QUICK=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.." || exit 1

# --- Python interpreter: repo .venv first, then committed-evidence venv.
PY=""
for c in "./.venv/bin/python" "/tmp/dy-ci-venv/bin/python"; do
  if [ -x "$c" ]; then PY="$c"; break; fi
done
if [ -z "$PY" ]; then
  echo "FATAL: no usable python venv. Create one:" >&2
  echo "  uv venv .venv && VIRTUAL_ENV=.venv uv pip install -e \".[dev,desktop-panel]\" pytest-cov" >&2
  exit 1
fi
echo "python: $PY ($($PY --version 2>&1))"

run_gate() { # name target command...
  local name="$1" target="$2"; shift 2
  local log; log=$(mktemp /tmp/dy-localci-XXXXXX.log)
  if "$@" >"$log" 2>&1; then
    local detail; detail=$(grep -E "passed|failed|error" "$log" | tail -1 | cut -c1-60)
    [ -z "$detail" ] && detail="ok"
    pass "$name" "$detail"
    rm -f "$log"
  else
    local detail; detail=$(tail -3 "$log" | tr '\n' ' ' | cut -c1-160)
    fail "$name" "$detail"
    echo "  full log: $log"
  fi
}

# --- Gate 1: install check (mirrors CI Install step; -e . plus test deps).
if ! "$PY" -c "import hermes_project_stewardship, httpx2, pytest" >/dev/null 2>&1; then
  echo "FATAL: env incomplete (need httpx2). Sync with:" >&2
  echo "  VIRTUAL_ENV=<venv> uv pip install -e \".[dev,desktop-panel]\" pytest-cov" >&2
  exit 1
fi
pass "install-extras" "imports ok"

# --- Gate 2: full suite with coverage gate (mirror of ci.yml webui gate).
COV_FAIL_UNDER=87
run_gate "suite+coverage" "fail-under=$COV_FAIL_UNDER" \
  "$PY" -m pytest --cov=hermes_project_stewardship --cov-report=term \
  --cov-report=json:/tmp/dy-coverage.json --cov-fail-under=$COV_FAIL_UNDER

# --- Gate 3: byte-compile (mirrors ci.yml compileall step).
if [ "$QUICK" -eq 0 ]; then
  run_gate "byte-compile" "src+tests" \
    "$PY" -m compileall -q src tests
fi

# --- Gate 4: api-extra import (mirrors ci.yml api-extra job).
run_gate "api-extra-import" "rpc-ok" \
  "$PY" -c "from hermes_project_stewardship.api.server import app; print('rpc-ok')"

# --- Optional JS gates: dashboard + desktop harnesses.
if [ "$WITH_NODE" -eq 1 ]; then
  if command -v npm >/dev/null 2>&1; then
    # pushd/popd (not subshells) so RESULTS propagate to the JSON summary.
    pushd hermes_dockyard_plugin/dashboard >/dev/null
    run_gate "dashboard-tests" "node --test" npm test
    popd >/dev/null
    pushd hermes_dockyard_plugin/desktop >/dev/null
    run_gate "desktop-harness" "node --test" \
        node --experimental-vm-modules --test repro-live.test.mjs
    popd >/dev/null
  else
    fail "node-gates" "npm not found; skipping requested JS gates"
  fi
fi

# --- Summary.
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
if [ "$JSON_OUT" -eq 1 ]; then
  echo "---"
  printf '{\n  "tool": "local-ci",\n  "generated_at": "%s",\n  "python": "%s",\n  "gates": [\n' "$TIMESTAMP" "$PY"
  first=1
  for r in "${RESULTS[@]}"; do
    IFS='|' read -r status name detail <<<"$r"
    [ $first -eq 0 ] && printf ',\n'
    printf '    {"gate": "%s", "status": "%s", "detail": "%s"}' "$name" "$status" "${detail//\"/\\\"}"
    first=0
  done
  printf '\n  ],\n  "failures": %d\n}\n' "$FAILURES"
fi

echo "---"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}ALL GATES PASS${NC} ($TIMESTAMP)"
  exit 0
else
  echo -e "${RED}FAILED GATES: $FAILURES${NC} ($TIMESTAMP)"
  exit 1
fi