// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// A Hermes profile without the plugin's backend (Sahil's wesker profile,
// 10/10/2026). The Desktop half is the same for every profile, so the sidebar
// still offers Project Stewardship; every call to the backend then fails with
// the host's "404: Plugin not found". That is a setting to change, not a
// broken page: say so and how, instead of the error card (owner decision
// 11/10/2026).
export const PLUGIN_OFF_TITLE = 'Project Stewardship is not switched on for this profile'
export const PLUGIN_OFF_DETAIL = 'It runs per Hermes profile and this profile does not have it, so there is nothing to show here. Nothing is lost: your projects stay with the profiles that use it.'
export const PLUGIN_OFF_COMMAND = 'hermes -p <profile> plugins enable hermes-project-stewardship'
export const PLUGIN_OFF_NEXT_STEP = 'Switch it on for this profile on the Plugins page, or run the command below, then press Try again.'

// The host's own words when the plugin's backend is not enabled for the
// profile. The status may come with or without the colon.
const PLUGIN_OFF = /^404:?\s*Plugin not found\b/i

export function isPluginOffError(error) {
  return error?.pluginOff === true || PLUGIN_OFF.test(String(error?.message ?? error ?? ''))
}
