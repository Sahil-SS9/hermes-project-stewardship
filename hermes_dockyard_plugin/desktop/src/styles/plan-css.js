// GENERATED-STRUCTURE: hand-edited Desktop module. Vision screen styles only
// (design round f, 05/10). Appended where DOCKYARD_CSS is used
// (runtime/context.js), same rule as the Roadmap, Settings and Kanban blocks.
// Colours come only from the shell's --dy-* tokens, which every theme sets,
// so no theme branch is needed here and no fallback colour can leak through.
export const PLAN_CSS = `
.dy-plan { display: grid; gap: 12px; min-width: 0; }
.dy-plan-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 10px; }
.dy-plan-head h2 { margin: 0; font-size: 20px; }
.dy-plan-head .dockyard-meta { margin: 2px 0 0; }
.dy-plan-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dy-plan-search { min-width: 180px; padding: 6px 10px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; }
.dy-plan-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dy-text-2); }
.dy-plan-note { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 12px; }
.dy-plan-tag { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: var(--dy-neutral-bg); color: var(--dy-neutral); }
.dy-plan-tag.warning { background: var(--dy-warning-bg); color: var(--dy-warning); }
.dy-plan-tag.danger { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dy-plan-tag.success { background: var(--dy-success-bg); color: var(--dy-success); }
.dy-plan-tag.info { background: var(--dy-info-bg); color: var(--dy-info); }

/* Mission */
.dy-plan-mission { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 10px 12px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); }
.dy-plan-mission-label { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--dy-text-3); }
.dy-plan-mission > p { flex: 1 1 280px; margin: 0; font-size: 14px; color: var(--dy-text); }
.dy-plan-mission > p.empty { color: var(--dy-text-3); font-style: italic; }
.dy-plan-mission-edit { flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 6px; align-items: flex-start; }
.dy-plan-mission-edit textarea { flex: 1 1 320px; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; }
.dy-plan-mission-history { flex: 1 1 100%; margin: 0; padding: 0 0 0 18px; display: grid; gap: 4px; font-size: 12px; color: var(--dy-text-2); }
.dy-plan-mission-history li { display: flex; justify-content: space-between; gap: 8px; }

/* Layout shell: content + an on-demand drawer */
.dy-plan-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
.dy-plan.with-drawer .dy-plan-main { grid-template-columns: minmax(0, 1fr) minmax(300px, 380px); }

/* Sections and rows */
.dy-plan-outline { display: grid; gap: 12px; min-width: 0; }
.dy-plan-section { border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); padding: 10px; min-width: 0; }
.dy-plan-section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dy-plan-section-head h3 { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 14px; }
.dy-plan-section-head > :last-child { margin-left: auto; }
.dy-plan-section-note { font-size: 11px; color: var(--dy-text-3); }
.dy-plan-count { min-width: 20px; padding: 0 6px; border-radius: 999px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; text-align: center; }
.dy-plan-empty { margin: 4px 0; font-size: 12px; color: var(--dy-text-3); }
.dy-plan-rows { display: grid; gap: 2px; }
.dy-plan-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 8px; border: 1px solid transparent; }
.dy-plan-row:hover { background: var(--dy-surface-subtle); }
.dy-plan-row.selected { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dy-plan-row.archived .dy-plan-row-text strong { color: var(--dy-text-3); text-decoration: line-through; }
/* Finished or closed initiatives keep their name readable: no strike-through. */
.dy-plan-row.closed .dy-plan-row-text strong { color: var(--dy-text-2); }
.dy-plan-row-open { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 4px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.dy-plan-row-text { display: grid; min-width: 0; }
.dy-plan-row-text strong { font-size: 13px; font-weight: 650; overflow-wrap: anywhere; }
.dy-plan-row-text small { font-size: 11px; color: var(--dy-text-2); }
.dy-plan-glyph { display: inline-grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: 6px; font-size: 11px; font-weight: 800; background: var(--dy-surface-subtle); color: var(--dy-text-2); border: 1px solid var(--dy-border); }
.dy-plan-glyph.initiative { background: var(--dy-info-bg); color: var(--dy-info); }
.dy-plan-glyph.milestone { background: var(--dy-warning-bg); color: var(--dy-warning); }
.dy-plan-glyph.objective { background: var(--dy-success-bg); color: var(--dy-success); }
.dy-plan-glyph.goal { background: var(--dy-accent-soft); color: var(--dy-accent-text); }

/* Menus */
.dy-plan-menu { position: relative; display: inline-flex; }
.dy-plan-menu-trigger { min-width: 30px; padding: 4px 8px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; cursor: pointer; }
.dy-plan-menu-trigger.primary { background: var(--dy-action); border-color: var(--dy-action); color: var(--dy-on-action); font-weight: 700; padding: 6px 12px; }
.dy-plan-menu-trigger:focus-visible, .dy-plan-row-open:focus-visible, .dy-plan-link-open:focus-visible, .dy-plan-unlink:focus-visible, .dy-plan-drawer-close:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dy-plan-menu-list { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; display: grid; min-width: 210px; padding: 4px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-strong); box-shadow: var(--dy-shadow); }
.dy-plan-menu-list button { padding: 7px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--dy-text); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
.dy-plan-menu-list button:hover, .dy-plan-menu-list button:focus-visible { background: var(--dy-surface-subtle); outline: none; }
.dy-plan-menu-list button.danger { color: var(--dy-danger); }
.dy-plan-menu-list button[disabled] { color: var(--dy-disabled-text); cursor: default; }

/* Drawer */
.dy-plan-drawer { position: sticky; top: 12px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; max-height: calc(100vh - 140px); border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); overflow: hidden; }
.dy-plan-drawer-head { position: relative; padding: 12px 40px 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-plan-drawer-head p { display: inline-flex; align-items: center; gap: 6px; margin: 0; }
.dy-plan-drawer-head h3 { margin: 6px 0; font-size: 16px; overflow-wrap: anywhere; }
.dy-plan-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.dy-plan-drawer-close { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font-size: 16px; cursor: pointer; }
.dy-plan-drawer-body { display: grid; gap: 12px; align-content: start; padding: 12px; overflow-y: auto; }
.dy-plan-drawer-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; padding: 10px 12px; border-top: 1px solid var(--dy-border); }
.dy-plan-drawer-section header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.dy-plan-drawer-section h4 { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--dy-text-3); }
.dy-plan-facts { display: grid; gap: 6px; margin: 0; }
.dy-plan-facts div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px; font-size: 13px; }
.dy-plan-facts dt { color: var(--dy-text-2); }
.dy-plan-facts dd { margin: 0; overflow-wrap: anywhere; }
.dy-plan-links { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
.dy-plan-links li.empty { font-size: 12px; color: var(--dy-text-3); padding: 4px 0; }
.dy-plan-link-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; }
.dy-plan-link-open { display: grid; min-width: 0; padding: 5px 4px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.dy-plan-link-open:hover { background: var(--dy-surface-subtle); }
.dy-plan-link-open.static { cursor: default; }
.dy-plan-link-open strong { font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.dy-plan-link-open small { font-size: 11px; color: var(--dy-text-2); }
.dy-plan-unlink { width: 26px; height: 26px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dy-text-2); font-size: 15px; cursor: pointer; }
.dy-plan-unlink:hover { border-color: var(--dy-control-border); color: var(--dy-danger); }
.dy-plan-buckets { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 6px; }
.dy-plan-buckets span { display: grid; padding: 6px; border-radius: 8px; background: var(--dy-surface-subtle); font-size: 11px; color: var(--dy-text-2); }
.dy-plan-buckets strong { font-size: 16px; color: var(--dy-text); }
.dy-plan-buckets span.blocked { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dy-plan-loop { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; counter-reset: loop; }
.dy-plan-loop li { position: relative; display: grid; padding: 4px 0 4px 26px; font-size: 12px; color: var(--dy-text-3); counter-increment: loop; }
.dy-plan-loop li::before { content: counter(loop); position: absolute; left: 0; top: 4px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 800; border: 1px solid var(--dy-border); background: var(--dy-surface); }
.dy-plan-loop li.done { color: var(--dy-text-2); }
.dy-plan-loop li.done::before { content: '✓'; background: var(--dy-success-bg); color: var(--dy-success); border-color: transparent; }
.dy-plan-loop li.current { color: var(--dy-text); }
.dy-plan-loop li.current::before { background: var(--dy-action); color: var(--dy-on-action); border-color: transparent; }
/* Withdrawn or rejected: it stopped here, so the stage is marked, not current. */
.dy-plan-loop li.stopped { color: var(--dy-text); }
.dy-plan-loop li.stopped::before { content: '×'; background: var(--dy-neutral-bg); color: var(--dy-neutral); border-color: transparent; }
.dy-plan-loop li small { color: var(--dy-text-2); }
.dy-plan-feedback { margin: 0 0 8px; padding: 8px 10px; border-left: 3px solid var(--dy-warning); background: var(--dy-warning-bg); color: var(--dy-text); font-size: 13px; }
/* An objective's evidence history and human assessment form: a shared
   component (work-item/detail.js) that never had styles of its own, so its
   controls fell back to the browser's defaults. Dressed here like the drawer. */
.dy-plan-drawer [data-objective-evidence] { padding: 8px 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 12px; }
.dy-plan-drawer [data-objective-evidence] > summary { cursor: pointer; color: var(--dy-text); font-weight: 700; }
.dy-plan-drawer [data-objective-evidence] p { margin: 6px 0 0; overflow-wrap: anywhere; }
.dy-plan-drawer [data-objective-evidence] ul { display: grid; gap: 2px; margin: 6px 0 0; padding-left: 18px; overflow-wrap: anywhere; }
.dy-plan-drawer [data-objective-evidence] form { display: grid; gap: 8px; margin-top: 10px; }
.dy-plan-drawer [data-objective-evidence] label { display: grid; gap: 4px; color: var(--dy-text); font-weight: 700; }
.dy-plan-drawer [data-objective-evidence] :is(input, select) { min-width: 0; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-weight: 400; font-size: 13px; }
.dy-plan-drawer [data-objective-evidence] button { justify-self: start; padding: 6px 12px; border: 1px solid var(--dy-action); border-radius: 8px; background: var(--dy-action); color: var(--dy-on-action); font: inherit; font-weight: 700; cursor: pointer; }
.dy-plan-drawer [data-objective-evidence] button:disabled { border-color: var(--dy-control-border); background: var(--dy-surface); color: var(--dy-disabled-text); cursor: default; }
.dy-plan-drawer [data-objective-evidence] :is(input, select, button):focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dy-plan-risks { margin: 4px 0; padding-left: 18px; font-size: 12px; color: var(--dy-danger); }
.dy-plan-inline { display: flex; gap: 6px; margin-top: 6px; }
.dy-plan-inline select { flex: 1; min-width: 0; padding: 5px 8px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }

/* Dialogs */
.dy-plan-dialog { width: min(520px, calc(100vw - 32px)); }
.dy-plan-dialog.wide { width: min(860px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow-y: auto; }
.dy-plan-dialog-head h2 { margin: 2px 0 10px; font-size: 18px; }
.dy-plan-form { display: grid; gap: 10px; }
.dy-plan-field { display: grid; gap: 4px; }
.dy-plan-field > span { font-size: 12px; font-weight: 700; color: var(--dy-text); }
.dy-plan-field input, .dy-plan-field textarea, .dy-plan-field select { padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; }
.dy-plan-field.invalid input, .dy-plan-field.invalid textarea { border-color: var(--dy-danger); }
.dy-plan-required { font-style: normal; font-weight: 500; font-size: 11px; color: var(--dy-text-3); }
.dy-plan-field-error { color: var(--dy-danger); font-size: 12px; }
.dy-plan-field-hint { color: var(--dy-text-3); font-size: 11px; }
.dy-plan-checklist { display: grid; gap: 6px; margin: 0; padding: 8px 10px; border: 1px solid var(--dy-border); border-radius: 8px; }
.dy-plan-checklist legend { padding: 0 4px; font-size: 12px; font-weight: 700; }
.dy-plan-check.taken { color: var(--dy-text-3); }
.dy-plan-check small { color: var(--dy-text-3); }
.dy-plan-consequences { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 13px; color: var(--dy-text); }
.dy-plan-row-status { min-width: 0; }
.dy-plan-row-status .dockyard-status-tag { white-space: normal; max-width: 100%; }
.dy-plan-sheet-backdrop { display: none; }

@media (max-width: 1100px) {
  .dy-plan.with-drawer .dy-plan-main { grid-template-columns: minmax(0, 1fr); }
  .dy-plan-drawer { position: fixed; top: auto; right: 0; bottom: 0; left: 0; z-index: 35; max-height: 72vh; border-radius: 14px 14px 0 0; box-shadow: var(--dy-shadow); }
  /* Same scrim as .dockyard-modal-layer. */
  .dy-plan-sheet-backdrop { display: block; position: fixed; inset: 0; z-index: 34; background: rgba(12, 17, 28, .48); backdrop-filter: blur(3px); }
}
@media (max-width: 760px) {
  .dy-plan-row { grid-template-columns: minmax(0, 1fr) auto; }
  .dy-plan-row .dy-plan-row-status { grid-column: 1; grid-row: 2; padding-left: 34px; }
  .dy-plan-search { min-width: 0; flex: 1 1 140px; }
}
`
