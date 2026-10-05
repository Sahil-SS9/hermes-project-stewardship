// GENERATED-STRUCTURE: hand-edited Desktop module. C2-owned Kanban styles only.
// Appended where DOCKYARD_CSS is used (runtime/context.js). Do not grow
// dockyard-css.js: the board's own rules moved here (move, not copy).
// Colours come only from the shell's --dy-* tokens (dockyard-css.js), which
// carry both the light and the dark theme, so no theme branch is needed here.
// No fallback colours and no literals: a misspelt token must fail
// kanban-css.test.mjs, not quietly paint a light-theme colour into dark mode.
// Breakpoints use `@container dockyard`: the board sits inside the Desktop
// app's frame, so the window width is not the board width.
export const KANBAN_CSS = `
.dockyard-root .dockyard-board-wrap { display: grid; gap: 12px; min-width: 0; }

/* Views bar: All work, saved views, New view; Milestones and Manage views on the right. */
.dockyard-root .dy-kb-viewsbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dy-kb-viewtabs { display: flex; align-items: flex-end; gap: 2px; flex-wrap: wrap; min-width: 0; }
.dockyard-root .dy-kb-viewtab { display: inline-flex; align-items: center; gap: 6px; height: 38px; margin: 0 0 -1px; padding: 0 12px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dy-text-2); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.dockyard-root .dy-kb-viewtab:hover { color: var(--dy-text); }
.dockyard-root .dy-kb-viewtab[aria-pressed="true"] { border-bottom-color: var(--dy-action); color: var(--dy-text); }
.dockyard-root .dy-kb-viewtab:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: -3px; }
.dockyard-root .dy-kb-viewtab-name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-viewtab-new { color: var(--dy-accent-text); }
.dockyard-root .dy-kb-viewtab svg { width: 14px; height: 14px; }
.dockyard-root .dy-kb-views-right { display: flex; align-items: center; gap: 6px; padding-bottom: 6px; }
.dockyard-root .dy-kb-views-right .dy-kb-button { height: 32px; }
.dockyard-root .dy-kb-button[aria-pressed="true"] { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-dot { flex: none; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--dy-warning); }
.dockyard-root .dy-kb-controls { display: grid; gap: 8px; }
.dockyard-root .dy-kb-toolbar-gap { flex: 1 1 0; }
.dockyard-root .dy-kb-segmented { display: inline-flex; height: 38px; padding: 2px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface-subtle); }
.dockyard-root .dy-kb-segmented button { padding: 0 10px; border: 0; border-radius: 4px; background: transparent; color: var(--dy-text-2); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.dockyard-root .dy-kb-segmented button[aria-pressed="true"] { background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 1px 2px var(--dy-shadow); }
.dockyard-root .dy-kb-segmented button:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
/* Unsaved view changes: one slim strip under the filters. */
.dockyard-root .dy-kb-edited { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 10px; border: 1px solid var(--dy-warning); border-radius: 8px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; }
.dockyard-root .dy-kb-edited-text { flex: 1 1 auto; font-weight: 650; }
/* One quiet line: how to move a card. */
.dockyard-root .dy-kb-help { margin: 0; color: var(--dy-text-3); font-size: 12px; }

/* Filter row. Every control is the same box as on Roadmap: 38px tall, control border, 6px radius, 13px text. */
.dockyard-root .dy-kb-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dockyard-root .dy-kb-control { position: relative; display: flex; align-items: center; gap: 8px; height: 38px; margin: 0; padding: 0 12px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font-size: 13px; }
.dockyard-root .dy-kb-control svg { flex: none; width: 15px; height: 15px; color: var(--dy-text-3); pointer-events: none; }
.dockyard-root .dy-kb-control:has(:focus-visible) { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-kb-control select,
.dockyard-root .dy-kb-control input[type="search"] { min-width: 0; height: 100%; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--dy-text); font: inherit; font-size: 13px; }
.dockyard-root .dy-kb-control select { max-width: 150px; cursor: pointer; }
.dockyard-root .dy-kb-search { flex: 1 1 220px; min-width: 180px; cursor: text; }
.dockyard-root .dy-kb-search input[type="search"] { flex: 1 1 auto; }
.dockyard-root .dy-kb-search input::placeholder { color: var(--dy-text-3); opacity: 1; }
.dockyard-root .dy-kb-button { justify-content: center; font-weight: 650; cursor: pointer; }
.dockyard-root .dy-kb-button:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dy-kb-button:disabled { border-color: var(--dy-border); background: var(--dy-disabled-bg); color: var(--dy-disabled-text); cursor: not-allowed; }
.dockyard-root .dy-kb-button[aria-expanded="true"] { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-count { margin-left: auto; color: var(--dy-text-3); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dockyard-root .dy-kb-note { margin: 0; padding: 8px 12px; border: 1px solid var(--dy-warning); border-radius: 8px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; }
.dockyard-root .dy-kb-empty { margin: 0; padding: 22px 14px; border: 1px dashed var(--dy-border); border-radius: 10px; color: var(--dy-text-2); text-align: center; font-size: 13px; }

/* Board: one row. Only this area scrolls sideways; the page never does. */
.dockyard-root .dockyard-board { display: flex; align-items: stretch; gap: 12px; max-width: 100%; min-width: 0; overflow-x: auto; padding-bottom: 6px; }
.dockyard-root .dockyard-board:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dockyard-board-column { display: flex; flex-direction: column; flex: 1 0 210px; min-width: 210px; min-height: 200px; border: 1px solid var(--dy-border); border-radius: 13px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-board-column > header { display: flex; align-items: center; gap: 6px; padding: 10px 10px 8px 8px; }
.dockyard-root .dockyard-board-column h3 { flex: 1; min-width: 0; margin: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-board-column header span { color: var(--dy-text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
.dockyard-root .dockyard-board-cards { padding: 0 9px 10px; }
.dockyard-root .dockyard-board-column[data-drop-ready="true"] { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-collapse { flex: none; display: grid; place-items: center; width: 28px; height: 28px; margin: 0; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dy-text-2); cursor: pointer; }
.dockyard-root .dy-kb-collapse:hover { border-color: var(--dy-control-border); background: var(--dy-surface); color: var(--dy-text); }
.dockyard-root .dy-kb-collapse:focus-visible,
.dockyard-root .dy-kb-strip:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-kb-collapse svg { width: 15px; height: 15px; }
/* A collapsed column is a thin strip that still accepts a dropped card. */
.dockyard-root .dockyard-board-column[data-collapsed="true"] { flex: 0 0 48px; min-width: 48px; }
.dockyard-root .dy-kb-strip { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 12px; width: 100%; margin: 0; padding: 12px 0; border: 0; border-radius: 13px; background: transparent; color: var(--dy-text); font: inherit; cursor: pointer; }
.dockyard-root .dy-kb-strip:hover { background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-strip-count { color: var(--dy-text-3); font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums; }
.dockyard-root .dy-kb-strip-label { font-size: 13px; font-weight: 650; writing-mode: vertical-rl; white-space: nowrap; }

/* Card. Summary: type and ref, assignee, title, one row of signals. */
.dockyard-root .dockyard-work-card {
  container: dy-card / inline-size;
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 0;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface);
  color: var(--dy-text);
  text-align: left;
  font: inherit;
  transition: border-color .16s ease, box-shadow .16s ease;
}
.dockyard-root .dockyard-work-card[draggable="true"] { cursor: grab; }
.dockyard-root .dockyard-work-card:hover { border-color: var(--dy-accent-border); }
.dockyard-root .dockyard-work-card[data-open="true"] { border-color: var(--dy-accent-border); box-shadow: 0 4px 14px var(--dy-shadow); }
.dockyard-root .dockyard-work-card[data-type="epic"] { border-left: 3px solid var(--dy-accent-border); }
.dockyard-root .dy-kb-card-toggle { display: grid; gap: 6px; width: 100%; margin: 0; padding: 10px 12px; border: 0; border-radius: 10px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.dockyard-root .dy-kb-card-toggle:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: -1px; }
.dockyard-root .dy-kb-card-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dockyard-root .dy-kb-type { display: inline-flex; flex: none; align-items: center; gap: 4px; color: var(--dy-text-2); font-size: 11px; font-weight: 650; }
.dockyard-root .dy-kb-type svg { width: 13px; height: 13px; }
.dockyard-root .dy-kb-type[data-type="epic"] { color: var(--dy-accent-text); }
.dockyard-root .dy-kb-type[data-type="bug"] { color: var(--dy-danger); }
.dockyard-root .dy-kb-key { flex: 1 1 auto; min-width: 0; color: var(--dy-text-3); font: 650 11px ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-chevron { display: grid; flex: none; place-items: center; color: var(--dy-text-3); transition: transform .16s ease; }
.dockyard-root .dy-kb-chevron svg { width: 14px; height: 14px; }
.dockyard-root .dockyard-work-card[data-open="true"] .dy-kb-chevron { transform: rotate(180deg); }
.dockyard-root .dy-kb-title { display: -webkit-box; overflow: hidden; font-size: 13px; font-weight: 650; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dockyard-root .dy-kb-avatar { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--dy-accent-border); border-radius: 50%; background: var(--dy-accent-soft); color: var(--dy-accent-text); font-size: 9px; font-weight: 760; }
.dockyard-root .dy-kb-avatar.empty { border-style: dashed; border-color: var(--dy-control-border); background: transparent; }
.dockyard-root .dy-kb-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.dockyard-root .dy-kb-signal { display: inline-flex; align-items: center; gap: 4px; min-width: 0; color: var(--dy-text-2); font-size: 11px; font-weight: 650; }
.dockyard-root .dy-kb-signal svg { flex: none; width: 13px; height: 13px; }
.dockyard-root .dy-kb-signal > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-signal[data-signal="blocked_by"],
.dockyard-root .dy-kb-signal[data-signal="overdue"] { color: var(--dy-danger); }
.dockyard-root .dy-kb-planning { flex-basis: 100%; }
.dockyard-root .dy-kb-label { padding: 1px 7px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; font-weight: 650; }

/* Card, expanded: labelled sections, then the actions. */
.dockyard-root .dy-kb-card-body { display: grid; gap: 10px; padding: 2px 12px 12px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dy-kb-section { display: grid; gap: 4px; padding-top: 8px; }
.dockyard-root .dy-kb-section h5 { margin: 0; color: var(--dy-text-3); font-size: 10px; font-weight: 760; letter-spacing: .04em; text-transform: uppercase; }
.dockyard-root .dy-kb-links { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-kb-link { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "key status" "title title"; align-items: baseline; gap: 1px 8px; width: 100%; margin: 0; padding: 5px 6px; border: 0; border-radius: 6px; background: transparent; color: var(--dy-text); font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
.dockyard-root .dy-kb-link:hover { background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-link:focus-visible,
.dockyard-root .dy-kb-goto:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-kb-link .dy-kb-key { grid-area: key; }
.dockyard-root .dy-kb-link-title { grid-area: title; overflow-wrap: anywhere; }
.dockyard-root .dy-kb-link-status { grid-area: status; color: var(--dy-text-2); font-size: 11px; font-weight: 650; }
.dockyard-root .dy-kb-section[data-card-section="blocked_by"] .dy-kb-link:not([data-done="true"]) .dy-kb-link-status { color: var(--dy-danger); }
.dockyard-root .dy-kb-link[data-done="true"] .dy-kb-link-status { color: var(--dy-success); }
.dockyard-root .dy-kb-section dl { display: grid; gap: 3px; margin: 0; }
.dockyard-root .dy-kb-row { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px; font-size: 12px; }
.dockyard-root .dy-kb-row dt { color: var(--dy-text-3); }
.dockyard-root .dy-kb-row dd { margin: 0; overflow-wrap: anywhere; }
.dockyard-root .dy-kb-row[data-overdue="true"] dd { color: var(--dy-danger); font-weight: 650; }
.dockyard-root .dy-kb-goto { margin: 0; padding: 0; border: 0; background: transparent; color: var(--dy-accent-text); font: inherit; text-align: left; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.dockyard-root .dy-kb-goto[data-done="true"] { color: var(--dy-success); }
.dockyard-root .dy-kb-via { color: var(--dy-text-3); }
.dockyard-root .dy-kb-card-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding-top: 4px; }
.dockyard-root .dy-kb-card-actions select { flex: 1 1 120px; min-width: 0; height: 34px; padding: 0 6px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dy-kb-card-actions select:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-kb-card-actions .dockyard-button { flex: none; min-height: 34px; }
.dockyard-root .dy-kb-card-actions .dockyard-button svg { width: 14px; height: 14px; }
.dockyard-root .dy-kb-move-none { flex: 1 1 120px; margin: 0; color: var(--dy-text-2); font-size: 12px; }

/* Narrow cards: the type shows as its icon only, so the ref is never cut off. */
@container dy-card (max-width: 200px) {
  .dockyard-root .dy-kb-card-top .dy-kb-type > span { display: none; }
}

/* Drag: the columns a card can go to light up; the others fade. */
.dockyard-root .dockyard-board-column[data-drop-refused="true"] { opacity: .5; }

/* List tab: the shared table scrolls inside itself. */
.dockyard-root .dy-kb-list { max-width: 100%; overflow-x: auto; }
.dockyard-root .dy-kb-table { width: 100%; min-width: 960px; border-collapse: collapse; font-size: 12px; }
.dockyard-root .dy-kb-table th,
.dockyard-root .dy-kb-table td { padding: 8px 10px; border-bottom: 1px solid var(--dy-border); text-align: left; vertical-align: top; }
.dockyard-root .dy-kb-table thead th { color: var(--dy-text-3); font-size: 10px; font-weight: 760; }
.dockyard-root .dy-kb-table td:first-child { color: var(--dy-accent-text); font: 650 11px ui-monospace, monospace; white-space: nowrap; }
.dockyard-root .dy-kb-stage-row th { background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; font-weight: 760; }
.dockyard-root .dy-kb-cell-refs { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.dockyard-root .dy-kb-table select { height: 30px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }

/* Manage views: a side panel over the right of the board; the board stays usable. */
.dockyard-root .dy-kb-panel { position: fixed; z-index: 90; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 4px; width: min(380px, 100%); overflow-y: auto; padding: 0 0 16px; border-left: 1px solid var(--dy-border); background: var(--dy-surface); box-shadow: 0 0 32px var(--dy-shadow); }
.dockyard-root .dy-kb-panel > header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 14px 16px 10px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dy-kb-panel h2 { margin: 0; font-size: 15px; }
.dockyard-root .dy-kb-panel h2:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-kb-panel > .dy-kb-note { margin: 8px 16px 0; }
.dockyard-root .dy-kb-panel-section { display: grid; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dy-kb-panel-section h3 { margin: 0; font-size: 13px; }
.dockyard-root .dy-kb-panel-meta { margin: 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-kb-panel-problem { margin: 0; color: var(--dy-danger); font-size: 12px; font-weight: 650; }
.dockyard-root .dy-kb-panel-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.dockyard-root .dy-kb-field { display: grid; gap: 4px; font-size: 12px; font-weight: 650; }
.dockyard-root .dy-kb-field input,
.dockyard-root .dy-kb-rename input { height: 34px; padding: 0 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; }
.dockyard-root .dy-kb-choice { display: grid; gap: 2px; margin: 0; padding: 0; border: 0; }
.dockyard-root .dy-kb-choice legend { margin-bottom: 4px; padding: 0; color: var(--dy-text-3); font-size: 10px; font-weight: 760; letter-spacing: .04em; text-transform: uppercase; }
.dockyard-root .dy-kb-choice label { display: flex; align-items: center; gap: 8px; min-height: 30px; font-size: 13px; cursor: pointer; }
.dockyard-root .dy-kb-choice input { width: 15px; height: 15px; margin: 0; accent-color: var(--dy-action); }
.dockyard-root .dy-kb-view-rows { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-kb-view-row { display: grid; gap: 4px; padding: 8px 10px; border: 1px solid var(--dy-border); border-radius: 8px; }
.dockyard-root .dy-kb-view-row[data-current="true"] { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-kb-view-row-head { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; }
.dockyard-root .dy-kb-view-row-head strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-badge { flex: none; padding: 1px 7px; border: 1px solid var(--dy-border); border-radius: 10px; color: var(--dy-text-2); font-size: 10px; font-weight: 760; }
.dockyard-root .dy-kb-badge.current { border-color: var(--dy-action); color: var(--dy-accent-text); }
.dockyard-root .dy-kb-row-actions { display: flex; align-items: center; gap: 2px 4px; flex-wrap: wrap; }
.dockyard-root .dy-kb-icon-button { display: inline-flex; align-items: center; gap: 4px; height: 28px; margin: 0; padding: 0 6px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dy-text-2); font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }
.dockyard-root .dy-kb-icon-button:hover { border-color: var(--dy-control-border); background: var(--dy-surface); color: var(--dy-text); }
.dockyard-root .dy-kb-icon-button:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-kb-icon-button:disabled { color: var(--dy-disabled-text); cursor: not-allowed; }
.dockyard-root .dy-kb-icon-button svg { width: 13px; height: 13px; }
.dockyard-root .dy-kb-rename,
.dockyard-root .dy-kb-confirm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; }
.dockyard-root .dy-kb-rename input { flex: 1 1 140px; min-width: 0; }
.dockyard-root .dy-kb-filter-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--dy-text-2); font-size: 12px; }

/* Narrow containers: every control is at least 40px tall (44px on the toolbar and views bar). */
@container dockyard (max-width: 640px) {
  .dockyard-root .dy-kb-card-actions .dockyard-button,
  .dockyard-root .dy-kb-edited .dockyard-button,
  .dockyard-root .dy-kb-panel .dockyard-button,
  .dockyard-root .dy-kb-empty .dockyard-button,
  .dockyard-root .dy-kb-card-actions select,
  .dockyard-root .dy-kb-table select,
  .dockyard-root .dy-kb-field input,
  .dockyard-root .dy-kb-rename input,
  .dockyard-root .dy-kb-icon-button,
  .dockyard-root .dy-kb-choice label { min-height: 40px; height: 40px; }
  .dockyard-root .dy-kb-collapse { width: 40px; height: 40px; }
  .dockyard-root .dy-kb-viewtab,
  .dockyard-root .dy-kb-segmented,
  .dockyard-root .dy-kb-control,
  .dockyard-root .dy-kb-views-right .dy-kb-button { height: 44px; }
  .dockyard-root .dy-kb-segmented { padding: 1px; }
  .dockyard-root .dy-kb-toolbar-gap { display: none; }
  .dockyard-root .dy-kb-search { flex-basis: 100%; }
  .dockyard-root .dy-kb-count { margin-left: 0; }
  .dockyard-root .dockyard-board-column { flex-basis: 230px; min-width: 230px; }
  .dockyard-root .dockyard-board-column[data-collapsed="true"] { flex-basis: 48px; min-width: 48px; }
}
`
