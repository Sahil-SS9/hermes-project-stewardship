#!/usr/bin/env bash
# Lane B Phase 7 — real installed-plugin video prerequisites (PM-0709).
# Videos are PENDING in this lane by design: no live homes, no installed
# Desktop mutation, no auto-publishing. This script refuses to run against
# Sahil's installed app and documents the exact later proof required.
set -uo pipefail
echo "PM-0709 GATE: PENDING — real installed-plugin videos not recorded in Lane B."
echo ""
echo "Why: this lane has no authority to touch the installed Desktop/plugin,"
echo "live HERMES_HOME, or live data. Mocks are not substitute videos."
echo ""
echo "Exact later proof required (post A+B integration, disposable install only):"
echo "  1. Disposable HERMES_HOME + disposable browser profile + unique ports."
echo "  2. Isolated test installation of the integrated candidate (never the"
echo "     user's installed Desktop/plugin); verify install path is disposable."
echo "  3. Record, with real plugin proxy -> backend -> SQLite readback:"
echo "       a. onboarding -> team change (add member + lead transfer)"
echo "       b. interrupted transfer recovery (kill mid-execute, retry to completed)"
echo "       c. project archive -> restore with canonical-untouched copy"
echo "  4. Store mp4/webm under docs/plans/evidence/ with commit SHA in filename."
echo "  5. Run under: flock -n /tmp/stewardship-heavy-gates.lock -c \"<record cmd>\""
echo ""
if [ "${1:-}" = "--record" ]; then
  echo "REFUSAL: --record requires explicit disposable-install proof (install path," >&2
  echo "HERMES_HOME, and Sahil's go-ahead). Nothing was recorded." >&2
  exit 3
fi
exit 0
