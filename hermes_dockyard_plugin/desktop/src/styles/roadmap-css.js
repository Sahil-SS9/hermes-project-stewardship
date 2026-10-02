// GENERATED-STRUCTURE: hand-edited Desktop module. R2-owned Roadmap styles only.
// Appended where DOCKYARD_CSS is used (runtime/context.js). Do not grow
// dockyard-css.js — shared-file rule (one contiguous block per owner).
// Palette maps the roadmap-v4 study onto the existing --dy-* tokens; light and
// dark both resolve through the tokens, so no theme branch is needed here.
export const ROADMAP_CSS = `
.dy-rm-page { display: grid; gap: 14px; }
.dy-rm-toolbar { display: flex; align-items: end; gap: 10px; flex-wrap: wrap; }
.dy-rm-toolbar label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--dy-text-secondary, #515968); }
.dy-rm-toolbar input[type="search"] { min-width: 220px; padding: 7px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #fff); color: inherit; }
.dy-rm-attention { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #fff); color: var(--dy-text-secondary, #515968); font-size: 11px; }
.dy-rm-attention input { accent-color: var(--dy-accent, #3654c7); }
.dy-rm-tree { border: 1px solid var(--dy-border, #87909d); border-radius: 8px; background: var(--dy-surface, #fff); overflow: hidden; }
.dy-rm-tree-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border, #87909d); background: var(--dy-surface-2, #f0f2f5); font-size: 12px; }
.dy-rm-tree-head span { color: var(--dy-text-tertiary, #697382); font-size: 10px; }
.dy-rm-row { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 6px 11px; border-bottom: 1px solid var(--dy-border, #87909d); background: transparent; border-left: 0; border-right: 0; border-top: 0; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.dy-rm-row:last-child { border-bottom: 0; }
.dy-rm-row:hover { background: var(--dy-accent-soft, #eef1ff); }
.dy-rm-row[data-selected="true"] { background: var(--dy-accent-soft, #eef1ff); box-shadow: inset 3px 0 0 var(--dy-accent, #3654c7); }
.dy-rm-row.depth-1 { padding-left: 34px; }
.dy-rm-row.depth-2 { padding-left: 57px; }
.dy-rm-row.depth-3 { padding-left: 80px; }
.dy-rm-disclosure { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; border: 1px solid var(--dy-border, #87909d); border-radius: 4px; background: var(--dy-surface, #fff); color: var(--dy-text-secondary, #515968); padding: 0; font-size: 12px; line-height: 1; }
.dy-rm-disclosure.blank { visibility: hidden; }
.dy-rm-icon { flex: 0 0 22px; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--dy-border, #87909d); border-radius: 5px; background: var(--dy-surface, #fff); color: var(--dy-text-secondary, #515968); font-size: 9px; font-weight: 800; }
.dy-rm-icon.project { border-radius: 50%; border-color: var(--dy-accent, #3654c7); background: var(--dy-accent, #3654c7); color: #fff; }
.dy-rm-icon.initiative { border-radius: 50%; }
.dy-rm-icon.work { border-style: dashed; }
.dy-rm-copy { min-width: 0; flex: 1; }
.dy-rm-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dy-rm-copy small { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dy-text-secondary, #515968); font-size: 10px; }
.dy-rm-chips { display: flex; align-items: center; gap: 4px; flex: none; flex-wrap: wrap; justify-content: flex-end; }
.dy-rm-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--dy-border, #87909d); border-radius: 999px; padding: 2px 7px; font-size: 10px; font-weight: 700; color: var(--dy-text-secondary, #515968); background: var(--dy-surface-2, #f0f2f5); white-space: nowrap; }
.dy-rm-chip.blocked { color: var(--dy-danger, #a72a2a); border-color: var(--dy-danger, #a72a2a); }
.dy-rm-chip.attention { color: var(--dy-warning, #805200); background: var(--dy-warning-soft, #fff3d4); border-color: var(--dy-warning, #805200); }
.dy-rm-chip.passed { color: var(--dy-success, #136c4a); border-color: var(--dy-success, #136c4a); }
.dy-rm-chip.failed { color: var(--dy-danger, #a72a2a); border-color: var(--dy-danger, #a72a2a); }
.dy-rm-chip.overdue { color: var(--dy-danger, #a72a2a); background: var(--dy-danger-soft, #ffeded); border-color: var(--dy-danger, #a72a2a); }
.dy-rm-blank { padding: 26px 15px; color: var(--dy-text-secondary, #515968); text-align: center; font-size: 12px; }
/* Drawer */
.dy-rm-shell { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
.dy-rm-shell.full { grid-template-columns: minmax(0, 1fr); }
.dy-rm-drawer { border: 1px solid var(--dy-border, #87909d); border-radius: 8px; background: var(--dy-surface, #fff); overflow: hidden; }
.dy-rm-drawer-head { padding: 12px; border-bottom: 1px solid var(--dy-border, #87909d); background: var(--dy-surface-2, #f0f2f5); }
.dy-rm-drawer-head h3 { margin: 4px 0 0; font-size: 14px; }
.dy-rm-drawer-head p { margin: 3px 0 0; color: var(--dy-text-secondary, #515968); font-size: 10px; }
.dy-rm-drawer-body { padding: 12px; display: grid; gap: 10px; }
.dy-rm-drawer-body > p { margin: 0; color: var(--dy-text-secondary, #515968); font-size: 11px; }
.dy-rm-facts { margin: 0; padding: 0; list-style: none; }
.dy-rm-facts li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid var(--dy-border, #87909d); font-size: 11px; }
.dy-rm-facts li span:first-child { color: var(--dy-text-secondary, #515968); }
.dy-rm-facts li span:last-child { font-weight: 700; text-align: right; overflow-wrap: anywhere; }
.dy-rm-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
/* Link picker dialog */
.dy-rm-modal-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 16px; background: rgba(10, 15, 25, .38); }
.dy-rm-modal { width: min(460px, 100%); max-height: min(560px, 90vh); overflow: auto; border: 1px solid var(--dy-border, #87909d); border-radius: 8px; background: var(--dy-surface, #fff); box-shadow: 0 18px 50px rgba(0, 0, 0, .26); }
.dy-rm-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px; border-bottom: 1px solid var(--dy-border, #87909d); }
.dy-rm-modal-head h3 { margin: 3px 0 0; font-size: 15px; }
.dy-rm-modal-head p { margin: 2px 0 0; color: var(--dy-text-secondary, #515968); font-size: 11px; }
.dy-rm-modal-body { padding: 12px 14px; display: grid; gap: 10px; }
.dy-rm-modal-body label { display: grid; gap: 4px; font-size: 11px; color: var(--dy-text-secondary, #515968); }
.dy-rm-modal-body select { min-height: 34px; padding: 6px 8px; border: 1px solid var(--dy-border, #87909d); border-radius: 5px; background: var(--dy-surface, #fff); color: inherit; }
.dy-rm-modal-error { margin: 0; color: var(--dy-danger, #a72a2a); font-size: 11px; min-height: 14px; }
.dy-rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 14px 14px; }
/* Milestone items (loaded on open) */
.dy-rm-items { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 5px; }
.dy-rm-items li { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border: 1px solid var(--dy-border, #87909d); border-radius: 5px; font-size: 11px; }
.dy-rm-items li strong { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.dy-rm-items li small { color: var(--dy-text-secondary, #515968); }
@media (max-width: 800px) {
  .dy-rm-shell { grid-template-columns: minmax(0, 1fr); }
  .dy-rm-drawer { position: static; }
  .dy-rm-row.depth-1 { padding-left: 27px; }
  .dy-rm-row.depth-2 { padding-left: 43px; }
  .dy-rm-row.depth-3 { padding-left: 59px; }
  .dy-rm-chips { display: none; }
}
@media (max-width: 520px) {
  .dy-rm-toolbar { display: grid; grid-template-columns: 1fr 1fr; align-items: center; }
  .dy-rm-toolbar label:has(input[type="search"]) { grid-column: 1 / -1; }
  /* Tighten the phone toolbar: checkbox aligns with the picker row, Reset
     keeps a modest width, dropdown can still name long projects. */
  .dy-rm-toolbar .dy-rm-attention { align-items: center; }
  .dy-rm-toolbar > label:nth-of-type(3) { grid-column: 1 / 2; }
  .dy-rm-toolbar > button:last-child { width: auto; justify-self: start; padding-left: 12px; padding-right: 12px; }
  .dy-rm-toolbar input[type="search"] { min-width: 0; width: 100%; }
}
`
