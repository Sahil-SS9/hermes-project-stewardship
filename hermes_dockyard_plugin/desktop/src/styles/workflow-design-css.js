// GENERATED-STRUCTURE: hand-edited Desktop module. Workflows design round
// (07/10/2026) styles, review only: every rule is scoped to the design
// classes (.dy-wfd-*, .dy-wfx-*), so today's screen is untouched. Appended
// where DOCKYARD_CSS is used (runtime/context.js).
export const WORKFLOW_DESIGN_CSS = `
.dockyard-root .dy-wfd-preview-tag { display: inline-flex; align-items: center; margin-left: 6px; padding: 0 6px; border: 1px solid var(--dy-warning); border-radius: 999px; background: var(--dy-warning-bg); color: var(--dy-warning); font-size: 10px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; line-height: 16px; vertical-align: middle; white-space: nowrap; }
.dockyard-root .dy-wfd-error { margin: 4px 0 0; color: var(--dy-danger); font-size: 12px; font-weight: 600; }
.dockyard-root .dy-wfd-on .dy-wfd-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0 0 10px; }
.dockyard-root .dy-wfd-on .dy-wfd-head h2 { margin: 0; font-size: 18px; }
.dockyard-root .dy-wfd-on .dy-wfd-grow { flex: 1 1 auto; }
.dockyard-root .dy-wfd-on .dockyard-wf3 { margin-top: 0; }
.dockyard-root .dy-wfd-on .dockyard-wf3-toolbar { gap: 4px; row-gap: 6px; padding: 8px 10px; }
.dockyard-root .dy-wfd-on .dockyard-wf3-toolbar .dockyard-wf3-sep { margin: 0 2px; }
.dockyard-root .dy-wfd-on .dockyard-wf3-toolbar .dockyard-button.small { padding-inline: 9px; }
/* Card notes carry meaning (repeats, sign-off, only if), so they stay when
   the canvas is zoomed out, where the canvas hides the card's second line. */
.dockyard-root .dy-wfd-on .dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-sub[data-wf-card-note] { opacity: 1; }
.dockyard-root .dy-wfd-chip { display: inline-flex; align-items: center; min-height: 26px; padding: 0 10px; border: 1px solid var(--dy-border); border-radius: 999px; color: var(--dy-text-2); font-size: 12px; white-space: nowrap; }
.dockyard-root .dy-wfd-draft-name { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-draft-name input { width: 170px; min-height: 30px; padding: 4px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); }
.dockyard-root .dy-wfd-draft-name input[aria-invalid="true"] { border-color: var(--dy-danger); }
.dockyard-root .dy-wfd-draft-label { font-size: 12px; font-weight: 600; color: var(--dy-warning); }
.dockyard-root .dy-wfd-canvas-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; align-items: start; }
.dockyard-root .dy-wfd-canvas-row.with-ai { grid-template-columns: minmax(0, 1fr) 320px; }
.dockyard-root .dy-wfd-canvas-wrap { position: relative; min-width: 0; }
/* With the AI builder open the canvas narrows (~700px at 1440 wide), where the
   playback bar runs into the minimap; the minimap gives way. */
.dockyard-root .dy-wfd-canvas-row.with-ai .dy-wf-scope .dy-wf-minimap { display: none; }
.dockyard-root .dy-wfd-on .dockyard-wf3-stage .dockyard-workflow-graph .dy-wf, .dockyard-root .dy-wfd-on .dy-wfd-canvas-wrap > .dy-wf { border-radius: 10px; }
.dockyard-root .dy-wfd-on .dy-wf-scope .dy-wf-passport { max-height: calc(100% - 74px); }
.dockyard-root .dy-wfd-draft-banner { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 15; max-width: calc(100% - 300px); margin: 0; padding: 5px 12px; border: 1px solid var(--dy-warning); border-radius: 999px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; text-align: center; }
/* The start card over an empty, unsaved canvas (option B). */
.dockyard-root .dy-wfd-start { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 16; width: min(560px, calc(100% - 32px)); max-height: calc(100% - 32px); overflow-y: auto; box-sizing: border-box; padding: 18px; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 18px 50px rgba(0, 0, 0, .35); }
.dockyard-root .dy-wfd-start.hint { width: min(360px, calc(100% - 32px)); font-size: 13px; text-align: center; }
.dockyard-root .dy-wfd-start h3 { margin: 0 0 12px; font-size: 16px; }
.dockyard-root .dy-wfd-start-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
/* The four ways in (dialog and start card). */
.dockyard-root .dy-wfd-ways { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dockyard-root .dy-wfd-ways button { display: grid; gap: 4px; padding: 12px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); color: var(--dy-text); text-align: left; cursor: pointer; font: inherit; }
.dockyard-root .dy-wfd-ways button:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dy-wfd-ways button:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-wfd-ways strong { font-size: 14px; }
.dockyard-root .dy-wfd-ways span { color: var(--dy-text-2); font-size: 12px; line-height: 1.4; }
.dockyard-root .dy-wfd-way-body { display: grid; gap: 10px; }
.dockyard-root .dy-wfd-field { display: grid; gap: 4px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-field input, .dockyard-root .dy-wfd-field textarea, .dockyard-root .dy-wfd-fieldset input:not([type="radio"]):not([type="checkbox"]), .dockyard-root .dy-wfd-fieldset select, .dockyard-root .dy-wfd-repeat input, .dockyard-root .dy-wfd-repeat select, .dockyard-root .dy-wfd-ai-compose textarea { box-sizing: border-box; width: 100%; min-height: 34px; padding: 6px 9px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; }
.dockyard-root .dy-wfd-field [aria-invalid="true"], .dockyard-root .dy-wfd-repeat [aria-invalid="true"], .dockyard-root .dy-wfd-ai-compose [aria-invalid="true"] { border-color: var(--dy-danger); }
.dockyard-root .dy-wfd-row { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.dockyard-root .dy-wfd-row > label { display: grid; gap: 4px; flex: 1 1 150px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-file { display: grid; gap: 4px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-templates { display: grid; gap: 8px; max-height: 260px; overflow-y: auto; }
.dockyard-root .dy-wfd-templates button { display: grid; gap: 3px; padding: 10px 12px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); text-align: left; cursor: pointer; font: inherit; }
.dockyard-root .dy-wfd-templates button.active { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-wfd-template-head { display: flex; justify-content: space-between; gap: 8px; }
.dockyard-root .dy-wfd-template-head small, .dockyard-root .dy-wfd-template-line { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-wfd-import-ok { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); font-size: 13px; }
.dockyard-root .dy-wfd-import-ok p, .dockyard-root .dy-wfd-ai-plan p { margin: 0; }
.dockyard-root .dy-wfd-steps { display: grid; gap: 4px; margin: 0; padding-left: 20px; font-size: 13px; }
.dockyard-root .dy-wfd-steps li { line-height: 1.45; }
.dockyard-root .dy-wfd-step-note { margin-left: 6px; padding: 0 6px; border-radius: 999px; background: var(--dy-neutral-bg); color: var(--dy-text-2); font-size: 11px; white-space: nowrap; }
.dockyard-root .dy-wfd-ai-note { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-wfd-ai-note .dy-wfd-preview-tag { margin-left: 0; }
.dockyard-root .dy-wfd-ai-plan { display: grid; gap: 6px; }
.dockyard-root .dy-wfd-ai-plan h4 { margin: 6px 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-ai-explain { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.45; }
.dockyard-root .dy-wfd-question { display: grid; gap: 6px; font-size: 13px; }
.dockyard-root .dy-wfd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dockyard-root .dy-wfd-chips button { min-height: 28px; padding: 3px 10px; border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; cursor: pointer; }
.dockyard-root .dy-wfd-chips button[aria-pressed="true"] { border-color: var(--dy-action); background: var(--dy-action); color: var(--dy-on-action); }
.dockyard-root .dy-wfd-modal { width: min(640px, 100%); }
.dockyard-root .dy-wfd-modal .dockyard-modal-head { margin-bottom: 12px; }
.dockyard-root .dy-wfd-modal .dockyard-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.dockyard-root .dy-wfd-fieldset { display: grid; gap: 8px; margin: 0 0 12px; padding: 12px; border: 1px solid var(--dy-border); border-radius: 8px; }
.dockyard-root .dy-wfd-fieldset legend { padding: 0 4px; font-size: 13px; font-weight: 650; }
.dockyard-root .dy-wfd-radio { display: flex; align-items: center; gap: 8px; font-size: 13px; }
/* The AI builder beside the canvas (option B). */
.dockyard-root .dy-wfd-ai { display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; min-width: 0; max-height: var(--dy-wfd-canvas-h, 70vh); padding: 12px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); }
.dockyard-root .dy-wfd-ai-head { display: flex; align-items: center; justify-content: space-between; }
.dockyard-root .dy-wfd-ai-thread { display: grid; gap: 10px; flex: 1 1 auto; min-height: 120px; overflow-y: auto; align-content: start; }
.dockyard-root .dy-wfd-ai-user { justify-self: end; max-width: 85%; margin: 0; padding: 7px 10px; border-radius: 10px 10px 2px 10px; background: var(--dy-action); color: var(--dy-on-action); font-size: 13px; }
.dockyard-root .dy-wfd-ai-reply { display: grid; gap: 6px; padding: 9px 10px; border: 1px solid var(--dy-border); border-radius: 10px 10px 10px 2px; background: var(--dy-surface-subtle); font-size: 13px; }
.dockyard-root .dy-wfd-ai-reply.undone { opacity: .6; }
.dockyard-root .dy-wfd-ai-reply p { margin: 0; }
.dockyard-root .dy-wfd-ai-reply details { font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-ai-compose { display: flex; gap: 6px; align-items: flex-end; }
.dockyard-root .dy-wfd-ai-compose textarea { resize: vertical; }
/* The repeat settings popover (frames). */
.dockyard-root .dy-wfd-repeat { position: fixed; z-index: 110; display: grid; gap: 8px; box-sizing: border-box; padding: 14px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 18px 44px rgba(0, 0, 0, .3); font-size: 13px; }
.dockyard-root .dy-wfd-repeat h3 { margin: 0; font-size: 14px; }
.dockyard-root .dy-wfd-repeat label { display: grid; gap: 4px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-repeat p { margin: 0; }
.dockyard-root .dy-wfd-repeat-actions { display: flex; gap: 6px; flex-wrap: wrap; }
/* The design review bar: fixed, so it does not change any measurement. */
.dockyard-root .dy-wfd-review { position: fixed; left: 12px; bottom: 12px; z-index: 80; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; max-width: calc(100vw - 24px); box-sizing: border-box; padding: 7px 10px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 10px 30px rgba(0, 0, 0, .25); font-size: 12px; }
.dockyard-root .dy-wfd-review-group { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.dockyard-root .dy-wfd-review-label { color: var(--dy-text-2); margin-right: 2px; }
.dockyard-root .dy-wfd-review button { min-height: 26px; padding: 2px 9px; border: 1px solid var(--dy-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; cursor: pointer; }
.dockyard-root .dy-wfd-review button[aria-pressed="true"] { border-color: var(--dy-action); background: var(--dy-action); color: var(--dy-on-action); }
.dockyard-root .dy-wfd-review-key { color: var(--dy-text-2); }
.dockyard-root .dy-wfd-review-key .dy-wfd-preview-tag { margin-left: 0; }
/* The step panel's plain-words sections, inside the dark canvas panel. */
.dy-wf-scope .dy-wfx { display: grid; gap: 10px; }
.dy-wf-scope .dy-wfx-section { display: grid; gap: 6px; padding-top: 8px; border-top: 1px solid var(--dy-wf-glass-line); }
.dy-wf-scope .dy-wfx-section h5 { display: flex; align-items: center; margin: 0; color: var(--dy-wf-card-text); font-size: 12px; font-weight: 650; }
.dy-wf-scope .dy-wfx-help { margin: 0; color: var(--dy-wf-card-dim); font-size: 11.5px; line-height: 1.45; }
.dy-wf-scope .dy-wfx-select, .dy-wf-scope .dy-wfx-textarea, .dy-wf-scope .dy-wfx-input { box-sizing: border-box; width: 100%; min-height: 32px; padding: 5px 9px; border: 1px solid var(--dy-wf-glass-line); border-radius: 8px; background: rgba(4, 10, 22, .65); color: var(--dy-wf-card-text); font: inherit; font-size: 12.5px; }
.dy-wf-scope .dy-wfx-textarea { resize: vertical; line-height: 1.4; }
.dy-wf-scope .dy-wfx-select:focus, .dy-wf-scope .dy-wfx-textarea:focus, .dy-wf-scope .dy-wfx-input:focus { outline: none; border-color: var(--dy-wf-accent); box-shadow: 0 0 0 3px rgba(106, 183, 255, .18); }
.dy-wf-scope .dy-wfx-input[aria-invalid="true"] { border-color: var(--dy-wf-status-blocked); }
.dy-wf-scope .dy-wfx-check { display: flex; align-items: flex-start; gap: 8px; color: var(--dy-wf-card-text); font-size: 12.5px; }
.dy-wf-scope .dy-wfx-check input { margin-top: 2px; accent-color: var(--dy-wf-accent); }
.dy-wf-scope .dy-wfx-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dy-wf-scope .dy-wfx-error { margin: 0; color: var(--dy-wf-status-blocked-text); font-size: 12px; font-weight: 600; }
.dy-wf-scope .dy-wfd-preview-tag { display: inline-flex; margin-left: 6px; padding: 0 6px; border: 1px solid rgba(240, 192, 74, .7); border-radius: 999px; background: rgba(227, 179, 65, .14); color: #f0c04a; font-size: 9.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; line-height: 15px; }
/* The page colours every <p> in a card or dialog as secondary text
   (.dockyard-feature-card p, .dockyard-modal p), which turned errors grey, the
   AI's message bubble grey on blue, and the step panel's help text dark on
   the dark panel. These keep their own colour and spacing. */
.dockyard-root .dy-wfd-on p.dy-wfd-error { margin: 4px 0 0; color: var(--dy-danger); font-size: 12px; }
.dockyard-root .dy-wfd-on p.dy-wfd-ai-user { margin: 0; color: var(--dy-on-action); }
.dockyard-root .dy-wfd-on .dy-wfd-ai-reply p, .dockyard-root .dy-wfd-on .dy-wfd-import-ok p, .dockyard-root .dy-wfd-on .dy-wfd-repeat p { margin: 0; color: var(--dy-text); }
.dockyard-root .dy-wfd-on p.dy-wfd-ai-note { margin: 0; }
.dockyard-root .dy-wfd-on p.dy-wfd-draft-banner { margin: 0; color: var(--dy-text); font-size: 12px; }
.dockyard-root .dy-wfd-on .dy-wf-scope p.dy-wfx-help { margin: 0; color: var(--dy-wf-card-dim); font-size: 11.5px; }
.dockyard-root .dy-wfd-on .dy-wf-scope p.dy-wfx-error { margin: 0; color: var(--dy-wf-status-blocked-text); font-size: 12px; }
@media (max-width: 1100px) {
  .dockyard-root .dy-wfd-canvas-row.with-ai { grid-template-columns: minmax(0, 1fr) 280px; }
}
@media (max-width: 760px) {
  .dockyard-root .dy-wfd-canvas-row.with-ai { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-wfd-ways { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-wfd-draft-banner { max-width: calc(100% - 24px); }
}
@media (max-width: 640px) {
  /* Phones: the library becomes one scrolling row, so the canvas comes up. */
  .dockyard-root .dy-wfd-on .dockyard-wf3-lib-list { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
  .dockyard-root .dy-wfd-on .dockyard-wf3-lib-list button { flex: 0 0 auto; }
  .dockyard-root .dy-wfd-review { left: 6px; right: 6px; bottom: 6px; gap: 6px; }
}
`
