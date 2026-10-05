// GENERATED-STRUCTURE: hand-edited Desktop module. R2-owned Roadmap styles only.
// Appended where DOCKYARD_CSS is used (runtime/context.js). Do not grow
// dockyard-css.js — shared-file rule (one contiguous block per owner).
// Colours come only from the shell's --dy-* tokens (dockyard-css.js), which
// carry both the light and the dark theme, so no theme branch is needed here.
// No fallback colours: a misspelt token must fail roadmap-screen.test.mjs, not
// quietly paint a light-theme colour into the dark theme.
export const ROADMAP_CSS = `
.dy-rm-page { display: grid; gap: 14px; }
/* Filter toolbar (signed v4 order: project, search, attention, Reset). Every
   control is the same box: 38px tall, control border, 6px radius, 13px text. */
.dy-rm-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dy-rm-toolbar .dy-rm-control { position: relative; display: flex; align-items: center; gap: 8px; height: 38px; margin: 0; padding: 0 12px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 13px; line-height: 1; white-space: nowrap; }
.dy-rm-toolbar .dy-rm-control svg { flex: none; width: 15px; height: 15px; color: var(--dy-text-3); pointer-events: none; }
.dy-rm-toolbar .dy-rm-control:has(:focus-visible) { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dy-rm-toolbar .dy-rm-control select,
.dy-rm-toolbar .dy-rm-control input[type="search"] { min-width: 0; height: 100%; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--dy-text); font: inherit; }
.dy-rm-toolbar .dy-rm-scope { flex: none; padding-right: 0; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope-label { font-size: 12px; font-weight: 650; }
.dy-rm-toolbar .dy-rm-scope select { appearance: none; -webkit-appearance: none; width: 168px; padding-right: 34px; font-weight: 600; text-overflow: ellipsis; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope svg { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); }
.dy-rm-toolbar .dy-rm-search { flex: 1 1 260px; min-width: 200px; cursor: text; }
.dy-rm-toolbar .dy-rm-search input[type="search"] { flex: 1 1 auto; }
.dy-rm-toolbar .dy-rm-search input::placeholder { color: var(--dy-text-3); opacity: 1; }
.dy-rm-toolbar .dy-rm-attention { font-weight: 600; cursor: pointer; }
.dy-rm-toolbar .dy-rm-attention input { flex: none; width: 15px; height: 15px; margin: 0; outline: none; accent-color: var(--dy-action); cursor: pointer; }
.dy-rm-toolbar .dy-rm-reset { justify-content: center; font-weight: 650; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope:hover,
.dy-rm-toolbar .dy-rm-attention:hover,
.dy-rm-toolbar .dy-rm-reset:hover { background: var(--dy-surface-subtle); }
.dy-rm-toolbar .dy-rm-attention:has(input:checked) { border-color: var(--dy-warning); background: var(--dy-warning-bg); color: var(--dy-text); }
.dy-rm-tree { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); overflow: hidden; }
.dy-rm-tree-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); font-size: 12px; }
.dy-rm-tree-head span { color: var(--dy-text-3); font-size: 10px; }
.dy-rm-row { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 6px 11px; border-bottom: 1px solid var(--dy-border); background: transparent; border-left: 0; border-right: 0; border-top: 0; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.dy-rm-row:last-child { border-bottom: 0; }
.dy-rm-row:hover { background: var(--dy-accent-soft); }
.dy-rm-row[data-selected="true"] { background: var(--dy-accent-soft); box-shadow: inset 3px 0 0 var(--dy-action); }
.dy-rm-row.depth-1 { padding-left: 34px; }
.dy-rm-row.depth-2 { padding-left: 57px; }
.dy-rm-row.depth-3 { padding-left: 80px; }
.dy-rm-disclosure { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; border: 1px solid var(--dy-border); border-radius: 4px; background: var(--dy-surface); color: var(--dy-text-2); padding: 0; font-size: 12px; line-height: 1; }
.dy-rm-disclosure.blank { visibility: hidden; }
.dy-rm-icon { flex: 0 0 22px; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--dy-border); border-radius: 5px; background: var(--dy-surface); color: var(--dy-text-2); font-size: 9px; font-weight: 800; }
.dy-rm-icon.project { border-radius: 50%; border-color: var(--dy-action); background: var(--dy-action); color: var(--dy-on-action); }
.dy-rm-icon.initiative { border-radius: 50%; }
.dy-rm-icon.work { border-style: dashed; }
.dy-rm-copy { min-width: 0; flex: 1; }
.dy-rm-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dy-rm-copy small { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dy-text-2); font-size: 10px; }
.dy-rm-chips { display: flex; align-items: center; gap: 4px; flex: none; flex-wrap: wrap; justify-content: flex-end; }
.dy-rm-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--dy-border); border-radius: 999px; padding: 2px 7px; font-size: 10px; font-weight: 700; color: var(--dy-text-2); background: var(--dy-surface-subtle); white-space: nowrap; }
.dy-rm-chip.blocked { color: var(--dy-danger); border-color: var(--dy-danger); }
.dy-rm-chip.attention { color: var(--dy-warning); background: var(--dy-warning-bg); border-color: var(--dy-warning); }
.dy-rm-chip.passed { color: var(--dy-success); border-color: var(--dy-success); }
.dy-rm-chip.failed { color: var(--dy-danger); border-color: var(--dy-danger); }
.dy-rm-chip.overdue { color: var(--dy-danger); background: var(--dy-danger-bg); border-color: var(--dy-danger); }
.dy-rm-row-actions { display: flex; align-items: center; gap: 4px; flex: none; }
.dy-rm-row:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: -2px; }
.dy-rm-copied { display: block; margin-top: 2px; color: var(--dy-text-2); font-size: 10px; font-weight: 400; }
.dy-rm-confirm { margin: 0; font-size: 12px; }
.dy-rm-confirm + .dy-rm-confirm { color: var(--dy-text-2); font-size: 11px; }
.dy-rm-blank { padding: 26px 15px; color: var(--dy-text-2); text-align: center; font-size: 12px; }
/* Drawer */
.dy-rm-shell { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
.dy-rm-shell.full { grid-template-columns: minmax(0, 1fr); }
.dy-rm-drawer { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); overflow: hidden; }
.dy-rm-drawer-head { padding: 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-rm-drawer-head h3 { margin: 4px 0 0; font-size: 14px; }
.dy-rm-drawer-head p { margin: 3px 0 0; color: var(--dy-text-2); font-size: 10px; }
.dy-rm-drawer-body { padding: 12px; display: grid; gap: 10px; }
.dy-rm-drawer-body > p { margin: 0; color: var(--dy-text-2); font-size: 11px; }
.dy-rm-facts { margin: 0; padding: 0; list-style: none; }
.dy-rm-facts li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid var(--dy-border); font-size: 11px; }
.dy-rm-facts li span:first-child { color: var(--dy-text-2); }
.dy-rm-facts li span:last-child { font-weight: 700; text-align: right; overflow-wrap: anywhere; }
.dy-rm-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
/* Link picker dialog */
.dy-rm-modal-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 16px; background: rgba(10, 15, 25, .38); }
.dy-rm-modal { width: min(460px, 100%); max-height: min(560px, 90vh); overflow: auto; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); box-shadow: 0 18px 50px rgba(0, 0, 0, .26); }
.dy-rm-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px; border-bottom: 1px solid var(--dy-border); }
.dy-rm-modal-head h3 { margin: 3px 0 0; font-size: 15px; }
.dy-rm-modal-head p { margin: 2px 0 0; color: var(--dy-text-2); font-size: 11px; }
.dy-rm-modal-body { padding: 12px 14px; display: grid; gap: 10px; }
.dy-rm-modal-body label { display: grid; gap: 4px; font-size: 11px; color: var(--dy-text-2); }
.dy-rm-modal-body select { min-height: 34px; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 5px; background: var(--dy-surface); color: inherit; }
.dy-rm-modal-error { margin: 0; color: var(--dy-danger); font-size: 11px; min-height: 14px; }
.dy-rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 14px 14px; }
/* Milestone items (loaded on open) */
.dy-rm-items { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 5px; }
.dy-rm-items li { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border: 1px solid var(--dy-border); border-radius: 5px; font-size: 11px; }
.dy-rm-items li strong { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.dy-rm-items li small { color: var(--dy-text-2); }
@media (max-width: 800px) {
  .dy-rm-shell { grid-template-columns: minmax(0, 1fr); }
  .dy-rm-drawer { position: static; }
  .dy-rm-row.depth-1 { padding-left: 27px; }
  .dy-rm-row.depth-2 { padding-left: 43px; }
  .dy-rm-row.depth-3 { padding-left: 59px; }
  .dy-rm-chips { display: none; }
  /* Two rows on the same edges: project + search, then attention + Reset
     (Reset in the last column, so it ends under the search box). */
  .dy-rm-toolbar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; }
  .dy-rm-toolbar .dy-rm-search { grid-column: 2 / -1; min-width: 0; }
  .dy-rm-toolbar .dy-rm-reset { grid-column: -2; }
}
@media (max-width: 520px) {
  /* Phone: project and search full width, then attention beside Reset.
     Reset keeps a real touch width so the last row is not lopsided. */
  .dy-rm-toolbar { grid-template-columns: minmax(0, 1fr) auto; }
  .dy-rm-toolbar .dy-rm-scope,
  .dy-rm-toolbar .dy-rm-search { grid-column: 1 / -1; }
  .dy-rm-toolbar .dy-rm-scope select { flex: 1 1 auto; width: auto; }
  .dy-rm-toolbar .dy-rm-reset { min-width: 96px; }
}
`
