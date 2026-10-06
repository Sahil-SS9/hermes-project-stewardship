// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C7 Reports (06/10): the Reports tab: the Generate controls, the list of
// past reports, and the open report beside it as a formatted page (Sahil's
// pick: side by side). Scoped to .dockyard-root and built only
// from the shell's colour tokens, so light, dark and auto all work
// (reports-css.test.mjs checks every token used is defined in both themes).
export const REPORTS_CSS = `
.dockyard-root .dy-rep { display: grid; gap: 14px; min-width: 0; }

/* Generate: type, recent activity, the button, and what the report will hold. */
.dockyard-root .dy-rep-controls { display: grid; gap: 8px; padding: 12px 14px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); }
.dockyard-root .dy-rep-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.dockyard-root .dy-rep-field { display: inline-flex; align-items: center; gap: 8px; color: var(--dy-text-2); font-size: 12px; font-weight: 700; }
.dockyard-root .dy-rep-field select { height: 40px; min-width: 210px; padding: 0 10px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; font-weight: 600; }
.dockyard-root .dy-rep-check { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; color: var(--dy-text); font-size: 13px; cursor: pointer; }
.dockyard-root .dy-rep-check input { width: 16px; height: 16px; margin: 0; accent-color: var(--dy-action); }
.dockyard-root .dy-rep-check:has(input:disabled) { color: var(--dy-text-3); cursor: not-allowed; }
.dockyard-root .dy-rep-row .dockyard-button { margin-left: auto; }
.dockyard-root .dy-rep-field select:focus-visible, .dockyard-root .dy-rep-check input:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-rep-hint { margin: 0; color: var(--dy-text-3); font-size: 12px; }
.dockyard-root .dy-rep-controls .dockyard-inline-error { margin: 0; }

/* Side by side: the list of past reports, and the open report beside it. */
.dockyard-root .dy-rep-side { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 14px; align-items: start; }
.dockyard-root .dy-rep-list { display: grid; gap: 8px; min-width: 0; padding: 12px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); }
.dockyard-root .dy-rep-list h3 { display: flex; align-items: center; justify-content: space-between; margin: 0 2px; color: var(--dy-text-2); font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
.dockyard-root .dy-rep-list h3 span { color: var(--dy-text-3); }
.dockyard-root .dy-rep-list ul { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-rep-list button { display: grid; gap: 2px; width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dy-text); font: inherit; text-align: left; cursor: pointer; }
.dockyard-root .dy-rep-list button:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dy-rep-list button[aria-current="true"] { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dy-rep-list button:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-rep-list strong { font-size: 13px; }
.dockyard-root .dy-rep-list button span { color: var(--dy-text-3); font-size: 12px; }
.dockyard-root .dy-rep-none { margin: 0; padding: 8px 2px; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dy-rep-pane { min-width: 0; padding: 20px 24px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); color: var(--dy-text); }

/* The open report as a page. */
.dockyard-root .dy-rep-doc { max-width: 860px; min-width: 0; margin: 0 auto; }
.dockyard-root .dy-rep-doc-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px 16px; padding-bottom: 14px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dy-rep-doc-head > div:first-child { min-width: 0; }
.dockyard-root .dy-rep-doc-head h2 { margin: 0; color: var(--dy-text); font-size: 20px; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.dockyard-root .dy-rep-meta { margin: 4px 0 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dy-rep-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.dockyard-root .dy-rep-body h3 { margin: 22px 0 8px; color: var(--dy-text); font-size: 14px; }
.dockyard-root .dy-rep-body p { margin: 8px 0; color: var(--dy-text-2); font-size: 13px; line-height: 1.5; }
.dockyard-root .dy-rep-facts { display: grid; grid-template-columns: minmax(150px, max-content) minmax(0, 1fr); margin: 8px 0; border: 1px solid var(--dy-border); border-radius: 8px; overflow: hidden; }
.dockyard-root .dy-rep-facts > div { display: contents; }
.dockyard-root .dy-rep-facts dt, .dockyard-root .dy-rep-facts dd { margin: 0; padding: 7px 12px; border-top: 1px solid var(--dy-border); font-size: 13px; }
.dockyard-root .dy-rep-facts > div:first-child dt, .dockyard-root .dy-rep-facts > div:first-child dd { border-top: 0; }
.dockyard-root .dy-rep-facts dt { background: var(--dy-surface-subtle); color: var(--dy-text-2); font-weight: 650; }
.dockyard-root .dy-rep-facts dd { color: var(--dy-text); overflow-wrap: anywhere; }
.dockyard-root .dy-rep-items { display: grid; gap: 6px; margin: 8px 0; padding-left: 20px; color: var(--dy-text); font-size: 13px; line-height: 1.45; }
.dockyard-root .dy-rep-table-wrap { overflow-x: auto; margin: 8px 0; border: 1px solid var(--dy-border); border-radius: 8px; }
.dockyard-root .dy-rep-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dockyard-root .dy-rep-table th { padding: 7px 12px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; font-weight: 800; letter-spacing: .05em; text-align: left; text-transform: uppercase; white-space: nowrap; }
.dockyard-root .dy-rep-table td { padding: 7px 12px; border-top: 1px solid var(--dy-border); color: var(--dy-text); vertical-align: top; }
.dockyard-root .dy-rep-table td:first-child { color: var(--dy-text-2); white-space: nowrap; }
.dockyard-root .dy-rep-state { display: grid; justify-items: center; gap: 10px; min-height: 220px; align-content: center; padding: 20px; color: var(--dy-text-2); font-size: 13px; text-align: center; }
.dockyard-root .dy-rep-state p { max-width: 46ch; margin: 0; }
.dockyard-root .dy-rep-state svg { width: 26px; height: 26px; color: var(--dy-text-3); }
.dockyard-root .dy-rep-state[role="alert"] p { color: var(--dy-danger); font-weight: 650; }

@container dockyard (max-width: 640px) {
  .dockyard-root .dy-rep-side { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-rep-pane { order: -1; }
  .dockyard-root .dy-rep-pane { padding: 16px; }
  .dockyard-root .dy-rep-field { flex: 1 1 100%; }
  .dockyard-root .dy-rep-field select { flex: 1 1 auto; width: auto; min-width: 0; }
  .dockyard-root .dy-rep-actions .dockyard-button { min-height: 40px; }
  .dockyard-root .dy-rep-facts { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-rep-facts dd { border-top: 0; }
}
`
