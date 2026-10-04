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

/* Sub-tabs: Board, List, Milestones. */
.dockyard-root .dy-kb-subtabs { display: flex; gap: 4px; margin: 0; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dy-kb-subtab { height: 38px; margin: 0 0 -1px; padding: 0 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--dy-text-2); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.dockyard-root .dy-kb-subtab:hover { color: var(--dy-text); }
.dockyard-root .dy-kb-subtab[aria-pressed="true"] { border-bottom-color: var(--dy-action); color: var(--dy-text); }
.dockyard-root .dy-kb-subtab:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: -3px; }

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
.dockyard-root .dy-kb-tags { position: relative; }
.dockyard-root .dy-kb-tags-panel { position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; display: grid; gap: 2px; min-width: 190px; padding: 6px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); box-shadow: 0 8px 24px var(--dy-shadow); }
.dockyard-root .dy-kb-tags-panel label { display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 8px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.dockyard-root .dy-kb-tags-panel label:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dy-kb-tags-panel input { width: 15px; height: 15px; margin: 0; accent-color: var(--dy-action); }
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

/* Card. */
.dockyard-root .dockyard-work-card {
  display: block;
  width: 100%;
  margin-bottom: 9px;
  padding: 10px 12px 12px;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface);
  color: var(--dy-text);
  text-align: left;
  font: inherit;
  transition: border-color .16s ease, background .16s ease;
}
.dockyard-root .dockyard-work-card[draggable="true"] { cursor: grab; }
.dockyard-root .dockyard-work-card:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-work-card h4 { display: -webkit-box; margin: 8px 0 8px; overflow: hidden; font-size: 13px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dockyard-root .dockyard-work-type { color: var(--dy-accent-text); font-size: 9px; font-weight: 780; text-transform: uppercase; }
.dockyard-root .dy-kb-actions { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; }
.dockyard-root .dy-kb-actions .dockyard-button { flex: none; min-height: 34px; }
.dockyard-root .dy-kb-actions select { flex: 1 1 auto; min-width: 0; height: 34px; padding: 0 6px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dy-kb-actions select:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-kb-keyrow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dockyard-root .dy-kb-key { color: var(--dy-accent-text); font: 650 11px ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-who { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dy-kb-who span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-kb-avatar { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--dy-accent-border); border-radius: 50%; background: var(--dy-accent-soft); color: var(--dy-accent-text); font-size: 9px; font-weight: 760; }
.dockyard-root .dy-kb-avatar.empty { border-style: dashed; border-color: var(--dy-control-border); background: transparent; }

/* Chips. */
.dockyard-root .dy-kb-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 8px 0 0; }
/* The text wraps (two lines at most) so a chip never hides the id and name it exists to show. */
.dockyard-root .dy-kb-chip { display: inline-flex; align-items: flex-start; gap: 4px; box-sizing: border-box; max-width: 100%; min-height: 24px; margin: 0; padding: 3px 9px; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font: inherit; font-size: 11px; font-weight: 650; line-height: 1.35; text-align: left; }
.dockyard-root .dy-kb-chip > span { display: -webkit-box; min-width: 0; overflow: hidden; overflow-wrap: anywhere; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.dockyard-root button.dy-kb-chip { cursor: pointer; }
.dockyard-root button.dy-kb-chip:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root button.dy-kb-chip:focus-visible { outline: 3px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-kb-chip[data-kind="blocked_by"] { border-color: var(--dy-warning); background: var(--dy-warning-bg); color: var(--dy-warning); }
.dockyard-root .dy-kb-chip[data-kind="blocks"] { border-color: var(--dy-info); background: var(--dy-info-bg); color: var(--dy-info); }
.dockyard-root .dy-kb-chip[data-kind="initiative"] { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .dy-kb-chip[data-kind="milestone"] { border-color: var(--dy-neutral); background: var(--dy-neutral-bg); color: var(--dy-neutral); }
.dockyard-root .dy-kb-chip[data-kind="objective"] { border-color: var(--dy-success); background: var(--dy-success-bg); color: var(--dy-success); }
.dockyard-root .dy-kb-chip[data-done="true"] { border-color: var(--dy-success); background: var(--dy-success-bg); color: var(--dy-success); }
.dockyard-root .dy-kb-chip[data-overdue="true"] { border-color: var(--dy-danger); background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .dy-kb-more { cursor: pointer; font-weight: 760; }

/* List tab: the shared table scrolls inside itself. */
.dockyard-root .dy-kb-list { max-width: 100%; overflow-x: auto; }
.dockyard-root .dy-kb-table { width: 100%; min-width: 960px; border-collapse: collapse; font-size: 12px; }
.dockyard-root .dy-kb-table th,
.dockyard-root .dy-kb-table td { padding: 8px 10px; border-bottom: 1px solid var(--dy-border); text-align: left; vertical-align: top; }
.dockyard-root .dy-kb-table thead th { color: var(--dy-text-3); font-size: 10px; font-weight: 760; }
.dockyard-root .dy-kb-table td:first-child { color: var(--dy-accent-text); font: 650 11px ui-monospace, monospace; white-space: nowrap; }
.dockyard-root .dy-kb-stage-row th { background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; font-weight: 760; }
.dockyard-root .dy-kb-cell-chips { display: flex; flex-wrap: wrap; gap: 4px; }

/* Narrow containers: bigger touch targets in the card's action row. */
@container dockyard (max-width: 640px) {
  .dockyard-root .dy-kb-actions .dockyard-button,
  .dockyard-root .dy-kb-actions select { min-height: 40px; height: 40px; }
  .dockyard-root .dy-kb-collapse { width: 40px; height: 40px; }
  .dockyard-root .dy-kb-subtab { height: 44px; }
  .dockyard-root .dy-kb-control { height: 44px; }
  .dockyard-root .dy-kb-search { flex-basis: 100%; }
  .dockyard-root .dy-kb-count { margin-left: 0; }
  .dockyard-root .dockyard-board-column { flex-basis: 230px; min-width: 230px; }
  .dockyard-root .dockyard-board-column[data-collapsed="true"] { flex-basis: 48px; min-width: 48px; }
}
`
