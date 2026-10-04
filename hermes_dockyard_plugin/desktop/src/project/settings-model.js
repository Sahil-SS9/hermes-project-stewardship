// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Owner decision 03/10/2026 (Q3): Settings shows the open-initiative limit the
// backend enforces (persistence/service.py, propose_initiative): the
// verification policy's number, else the legacy notification key, else 5.
// A saved number is always kept; nothing is migrated.
export const DEFAULT_MAX_OPEN_INITIATIVES = 5

export function effectiveMaxOpenInitiatives(policies) {
  return policies?.verification?.max_open_initiatives
    ?? policies?.notification?.max_open_initiatives
    ?? DEFAULT_MAX_OPEN_INITIATIVES
}
