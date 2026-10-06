// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C5 Activity (06/10): the Activity tab's event list (a dated timeline,
// Sahil's pick 06/10), its filter chips and search, and the Overview "Recent
// activity" card's words. Scoped to .dockyard-root and built only from the
// shell's colour tokens, so light, dark and auto all work
// (activity-css.test.mjs checks every token used is defined in both themes).
export const ACTIVITY_CSS = `
.dockyard-root .dy-act { min-width: 0; padding: 17px; }
.dockyard-root .dy-act-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.dockyard-root .dy-act-head h2 { margin: 0; font-size: 16px; }
.dockyard-root .dy-act-count { color: var(--dy-text-3); font-size: 12px; white-space: nowrap; }
.dockyard-root .dy-act-tools { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; margin: 12px 0 10px; }
.dockyard-root .dy-act-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dockyard-root .dy-act-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid var(--dy-control-border); border-radius: 999px; background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 12px; cursor: pointer; }
.dockyard-root .dy-act-chip span { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dy-act-chip[aria-pressed="true"] { border-color: var(--dy-action); background: var(--dy-accent-soft); color: var(--dy-text); font-weight: 700; }
.dockyard-root .dy-act-search { width: 240px; max-width: 100%; padding: 6px 10px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dy-act-chip:focus-visible, .dockyard-root .dy-act-search:focus-visible,
.dockyard-root .dy-act-open:focus-visible, .dockyard-root .dy-act-viewall:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-act-open { padding: 3px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; }
.dockyard-root .dy-act-open:hover { border-color: var(--dy-action); color: var(--dy-text); }
.dockyard-root .dy-act-open:disabled { cursor: progress; opacity: 0.7; }
.dockyard-root .dy-act-none { color: var(--dy-text-3); }
.dockyard-root .dy-act-empty { padding: 14px 0 4px; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dy-act-empty p { margin: 0 0 6px; }
.dockyard-root .dy-act-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 12px; color: var(--dy-text-3); font-size: 12px; }
.dockyard-root .dy-act-error { color: var(--dy-danger); font-weight: 700; }

/* The timeline: a dated feed with an icon rail. */
.dockyard-root .dy-act-timeline, .dockyard-root .dy-act-timeline ol { margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-act-tday h3 { margin: 14px 0 6px; color: var(--dy-text); font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.dockyard-root .dy-act-entry { position: relative; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 8px 0 8px 2px; }
.dockyard-root .dy-act-entry::before { content: ""; position: absolute; top: 34px; bottom: -8px; left: 15px; border-left: 1px solid var(--dy-border); }
.dockyard-root .dy-act-entry:last-child::before { display: none; }
.dockyard-root .dy-act-dot { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--dy-border); border-radius: 50%; background: var(--dy-surface); color: var(--dy-text-3); }
.dockyard-root .dy-act-dot svg { width: 14px; height: 14px; }
.dockyard-root .dy-act-dot[data-tone="success"] { background: var(--dy-success-bg); color: var(--dy-success); }
.dockyard-root .dy-act-dot[data-tone="warning"] { background: var(--dy-warning-bg); color: var(--dy-warning); }
.dockyard-root .dy-act-dot[data-tone="danger"] { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .dy-act-dot[data-tone="info"] { background: var(--dy-info-bg); color: var(--dy-info); }
.dockyard-root .dy-act-body { min-width: 0; }
.dockyard-root .dy-act-body p { margin: 0; }
.dockyard-root .dy-act-line1 { display: flex; flex-wrap: wrap; gap: 4px 8px; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dy-act-line1 strong { color: var(--dy-text); }
.dockyard-root .dy-act-line1 span { overflow-wrap: anywhere; }
.dockyard-root .dy-act-note { margin-top: 2px; color: var(--dy-text-2); font-size: 12px; overflow-wrap: anywhere; }
.dockyard-root .dy-act-line2 { margin-top: 2px; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dy-act-side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

/* The Overview "Recent activity" card with the tab's words. */
.dockyard-root .dockyard-overview-card[data-overview-activity="words"] .dockyard-overview-list.activity article { grid-template-columns: minmax(0, 1fr) auto; }
.dockyard-root .dockyard-overview-card[data-overview-activity="words"] .dockyard-status-tag { max-width: 190px; }
.dockyard-root .dockyard-overview-card[data-overview-activity="words"] .dockyard-overview-list strong { display: -webkit-box; overflow: hidden; white-space: normal; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dockyard-root .dy-act-viewall { padding: 2px 4px; border: 0; background: none; color: var(--dy-action); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.dockyard-root .dy-act-viewall:hover { text-decoration: underline; }

/* Narrow: the search fills the row; the impact and Open move under the text. */
@container dockyard (max-width: 640px) {
  .dockyard-root .dy-act-search { width: 100%; }
  .dockyard-root .dy-act-entry { grid-template-columns: 28px minmax(0, 1fr); }
  .dockyard-root .dy-act-side { grid-column: 2; flex-direction: row; align-items: center; }
}
`
