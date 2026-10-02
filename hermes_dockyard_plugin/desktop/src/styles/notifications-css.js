// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Batch E5: notifications screen styles (filters, day groups, detail and
// settings panels). Kept in their own module per the plan.
export const NOTIFICATIONS_CSS = `
.dockyard-root .dy-notif-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0 4px; }
.dockyard-root .dy-notif-toolbar .dy-notif-spacer { flex: 1; }
.dockyard-root .dy-notif-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 14px; }
.dockyard-root .dy-notif-filter { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface); padding: 3px 10px; font-size: 12px; }
.dockyard-root .dy-notif-filter select { background: transparent; color: inherit; border: 0; font: inherit; }
.dockyard-root .dy-notif-chip { border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface); color: var(--dy-muted); padding: 3px 10px; font-size: 12px; cursor: pointer; }
.dockyard-root .dy-notif-chip[aria-pressed="true"] { background: var(--dy-accent-bg, var(--dy-surface-strong, #eef)); color: var(--dy-text); border-color: var(--dy-accent, var(--dy-border)); }
.dockyard-root .dy-notif-day { margin: 16px 0 6px; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--dy-muted); }
.dockyard-root .dy-notif-more { display: block; margin: 10px auto; }
.dockyard-root .dy-notif-layout { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, 1fr); gap: 14px; align-items: start; }
.dockyard-root .dy-notif-layout[data-panel="none"] { grid-template-columns: 1fr; }
@media (max-width: 900px) { .dockyard-root .dy-notif-layout { grid-template-columns: 1fr; } }
.dockyard-root .dy-notif-detail { border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); padding: 14px; position: sticky; top: 12px; }
.dockyard-root .dy-notif-detail h3 { margin: 0 0 6px; }
.dockyard-root .dy-notif-detail .dockyard-meta { display: block; margin: 2px 0; }
.dockyard-root .dy-notif-detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.dockyard-root .dy-notif-resolve-note { width: 100%; min-height: 64px; margin-top: 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); color: inherit; padding: 8px; font: inherit; }
.dockyard-root .dy-notif-settings { border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); padding: 14px; margin-top: 14px; }
.dockyard-root .dy-notif-settings h3 { margin: 0 0 8px; }
.dockyard-root .dy-notif-settings .dy-notif-setting { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
.dockyard-root .dy-notif-settings label { font-size: 12px; color: var(--dy-muted); }
.dockyard-root .dy-notif-settings select, .dockyard-root .dy-notif-settings input[type="time"] { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); color: inherit; padding: 4px 8px; font: inherit; }
.dockyard-root .dy-notif-settings .dy-notif-override-link { font-size: 12px; }
.dockyard-root .dy-notif-row-btn { display: block; width: 100%; box-sizing: border-box; cursor: pointer; text-align: left; background: transparent; border: 0; color: inherit; font: inherit; padding: 0; margin: 0; }
.dockyard-root .dy-notif-row-btn:focus-visible { outline: 2px solid var(--dy-accent, #6ea8fe); outline-offset: 2px; }
.dockyard-root .dy-notif-row-inner { display: flex; gap: 10px; align-items: baseline; }
.dockyard-root .dy-notif-row-titleline { display: flex; gap: 8px; align-items: center; }
.dockyard-root .dy-notif-popups { position: fixed; right: 16px; bottom: 16px; display: grid; gap: 8px; z-index: 60; max-width: 360px; }
.dockyard-root .dy-notif-popup { border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface-strong, var(--dy-surface)); box-shadow: 0 8px 24px rgba(0,0,0,.25); padding: 10px 12px; }
.dockyard-root .dy-notif-popup strong { display: block; }
.dockyard-root .dy-notif-popup span { color: var(--dy-muted); font-size: 12px; }
`
