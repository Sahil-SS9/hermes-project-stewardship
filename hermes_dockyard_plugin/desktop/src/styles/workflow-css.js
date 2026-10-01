// GENERATED-STRUCTURE: hand-edited Desktop module. W-owned workflow styles only.
// Appended where DOCKYARD_CSS is used (runtime/context.js). Do not grow
// dockyard-css.js — handoff rule (§2 shared-file table).
export const WORKFLOW_LIBRARY_CSS = `
.dockyard-wf-entry { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
.dockyard-wf-entry > span { color: var(--dy-text-secondary, #515968); font-size: 12px; }
.dockyard-wf-library-toolbar { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; flex-wrap: wrap; }
.dockyard-wf-library-scope { display: flex; gap: 6px; }
.dockyard-wf-library-toolbar input { flex: 1 1 220px; min-width: 180px; padding: 7px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #ffffff); color: inherit; }
.dockyard-wf-library-create { display: flex; align-items: flex-end; gap: 12px; margin: 0 0 16px; padding: 12px; border: 1px solid var(--dy-border, #87909d); border-radius: 8px; flex-wrap: wrap; }
.dockyard-wf-library-create label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.dockyard-wf-library-create input { padding: 7px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #ffffff); color: inherit; min-width: 200px; }
.dockyard-wf-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.dockyard-wf-library-grid article header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dockyard-wf-library-grid article h3 { margin: 0; font-size: 15px; }
.dockyard-wf-library-grid article .dockyard-meta { margin: 6px 0 0; font-size: 12px; }
.dockyard-wf-library-grid article .dockyard-form-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.dockyard-wf-enablement { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--dy-border, #87909d); }
.dockyard-wf-enablement .dockyard-wf-enablement-label { flex: 1 1 140px; min-width: 0; overflow-wrap: anywhere; }
.dockyard-wf-enablement .dockyard-switch { position: relative; display: inline-flex; width: 40px; height: 22px; flex: none; }
.dockyard-wf-enablement .dockyard-switch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dockyard-wf-enablement .dockyard-switch .dockyard-switch-track { position: absolute; inset: 0; border-radius: 11px; background: var(--dy-border, #87909d); transition: background 120ms ease; pointer-events: none; }
.dockyard-wf-enablement .dockyard-switch .dockyard-switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 9px; background: #ffffff; transition: transform 120ms ease; pointer-events: none; }
.dockyard-wf-enablement .dockyard-switch input:checked ~ .dockyard-switch-track { background: var(--dy-accent, #3654c7); }
.dockyard-wf-enablement .dockyard-switch input:checked ~ .dockyard-switch-thumb { transform: translateX(18px); }
.dockyard-wf-enablement .dockyard-switch input:focus-visible ~ .dockyard-switch-track { outline: 2px solid var(--dy-focus, #3654c7); outline-offset: 2px; }
`