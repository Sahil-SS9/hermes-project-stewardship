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
.dockyard-root .dy-wfd-draft-label { font-size: 12px; font-weight: 600; color: var(--dy-warning); }
.dockyard-root .dy-wfd-canvas-wrap { position: relative; min-width: 0; }
.dockyard-root .dy-wfd-on .dockyard-wf3-stage .dockyard-workflow-graph .dy-wf, .dockyard-root .dy-wfd-on .dy-wfd-canvas-wrap > .dy-wf { border-radius: 10px; }
.dockyard-root .dy-wfd-on .dy-wf-scope .dy-wf-passport { max-height: calc(100% - 74px); }
.dockyard-root .dy-wfd-draft-banner { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 15; max-width: calc(100% - 300px); margin: 0; padding: 5px 12px; border: 1px solid var(--dy-warning); border-radius: 999px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; text-align: center; }
/* The four ways in (the New workflow dialog). */
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
/* Use a template: the built-in groups, then the saved ones; a filter; the
   picked one's steps, sources and the two questions (who works, who checks). */
.dockyard-root .dy-wfd-tpl { display: grid; gap: 8px; }
.dockyard-root .dy-wfd-tpl-tabs { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid var(--dy-border); scrollbar-width: none; }
.dockyard-root .dy-wfd-tpl-tab { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; margin-bottom: -1px; padding: 7px 10px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--dy-text-2); font: inherit; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer; }
.dockyard-root .dy-wfd-tpl-tab:hover { color: var(--dy-text); }
.dockyard-root .dy-wfd-tpl-tab.active { border-bottom-color: var(--dy-action); color: var(--dy-text); }
.dockyard-root .dy-wfd-tpl-tab:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: -2px; border-radius: 6px 6px 0 0; }
.dockyard-root .dy-wfd-tpl-count { min-width: 18px; padding: 0 5px; border-radius: 999px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; line-height: 18px; text-align: center; }
.dockyard-root .dy-wfd-tpl-tab.active .dy-wfd-tpl-count { background: var(--dy-accent-soft); color: var(--dy-text); }
/* The panel keeps one height on every tab, so the dialog does not jump. It takes the room the dialog has
   left (the dialog is at most 100vh - 40px, about 390px of it around the panel), up to 440px: enough for
   the largest built-in tab (7 templates) with no scrolling. A small window scrolls the panel, not the dialog. */
.dockyard-root .dy-wfd-tpl-panel { display: grid; align-content: start; height: clamp(200px, calc(100vh - 430px), 440px); overflow-y: auto; padding: 2px 4px 2px 0; }
.dockyard-root .dy-wfd-tpl-list { display: grid; gap: 6px; }
.dockyard-root .dy-wfd-scopes button:disabled { border-style: dashed; background: var(--dy-surface); cursor: not-allowed; }
.dockyard-root .dy-wfd-scopes button:disabled:hover { border-color: var(--dy-border); }
.dockyard-root .dy-wfd-ways .dy-wfd-scope-name { margin-left: 8px; padding: 1px 8px; border-radius: 999px; background: var(--dy-accent-soft); color: var(--dy-text); font-size: 12px; font-weight: 600; }
.dockyard-root .dy-wfd-scope-line { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding: 6px 6px 6px 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); font-size: 12px; }
.dockyard-root .dy-wfd-scope-line > span { color: var(--dy-text-2); }
.dockyard-root .dy-wfd-scope-line > strong { flex: 1; min-width: 0; color: var(--dy-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-feature-card.dy-wf-just-made { border-color: var(--dy-action); box-shadow: 0 0 0 1px var(--dy-action); }
.dockyard-root .dy-wfd-tpl-item { display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); text-align: left; cursor: pointer; font: inherit; }
.dockyard-root .dy-wfd-tpl-item:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dy-wfd-tpl-item:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-wfd-tpl-item.active { border-color: var(--dy-action); background: var(--dy-accent-soft); }
.dockyard-root .dy-wfd-tpl-item strong { font-size: 13px; }
.dockyard-root .dy-wfd-template-head { display: flex; justify-content: space-between; gap: 8px; }
.dockyard-root .dy-wfd-template-head small, .dockyard-root .dy-wfd-tpl-summary { color: var(--dy-text-2); font-size: 12px; line-height: 1.4; }
.dockyard-root .dy-wfd-tpl-detail { display: grid; gap: 8px; padding: 10px 12px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); font-size: 13px; }
.dockyard-root .dy-wfd-tpl-detail-head { display: grid; gap: 2px; }
.dockyard-root .dy-wfd-tpl-detail-head span, .dockyard-root .dy-wfd-based-on { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-wfd-tpl-detail .dy-wfd-row > label select { box-sizing: border-box; width: 100%; min-height: 34px; padding: 6px 9px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13px; }
.dockyard-root .dy-wfd-warning { padding: 6px 10px; border: 1px solid var(--dy-warning); border-radius: 8px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; }
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
/* A long New workflow dialog scrolls inside; its buttons stay in view. */
.dockyard-root .dy-wfd-new .dockyard-modal-actions { position: sticky; bottom: -22px; z-index: 2; margin: 14px -22px -22px; padding: 12px 22px 22px; border-top: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dy-wfd-fieldset { display: grid; gap: 8px; margin: 0 0 12px; padding: 12px; border: 1px solid var(--dy-border); border-radius: 8px; }
.dockyard-root .dy-wfd-fieldset legend { padding: 0 4px; font-size: 13px; font-weight: 650; }
.dockyard-root .dy-wfd-radio { display: flex; align-items: center; gap: 8px; font-size: 13px; }
/* The AI chat (Sahil's pick, 07/10/2026): a sidebar at the window's right
   edge, outside the canvas. Unpinned it floats over the page; pinned, the
   page narrows to make room (the class on the plugin's root), so it covers
   nothing. Below dialogs (100), above the page. */
.dockyard-root .dy-wfd-ai { position: fixed; top: 0; right: 0; bottom: 0; z-index: 95; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; width: min(360px, 100vw); padding: 14px; border-left: 1px solid var(--dy-border); background: var(--dy-surface); color: var(--dy-text); box-shadow: -16px 0 40px rgba(0, 0, 0, .22); }
.dockyard-root .dy-wfd-ai[data-pinned="true"] { box-shadow: none; }
.dockyard-root.dy-wfd-ai-docked { box-sizing: border-box; padding-right: 360px; }
.dockyard-root .dy-wfd-ai-head { display: flex; align-items: flex-start; gap: 6px; }
.dockyard-root .dy-wfd-ai-head > div { flex: 1 1 auto; min-width: 0; }
.dockyard-root .dy-wfd-ai-head h2 { margin: 0; font-size: 16px; }
.dockyard-root .dy-wfd-ai-thread { display: grid; gap: 10px; flex: 1 1 auto; min-height: 120px; overflow-y: auto; align-content: start; }
.dockyard-root .dy-wfd-ai-user { justify-self: end; max-width: 85%; margin: 0; padding: 7px 10px; border-radius: 10px 10px 2px 10px; background: var(--dy-action); color: var(--dy-on-action); font-size: 13px; }
.dockyard-root .dy-wfd-ai-reply { display: grid; gap: 6px; padding: 9px 10px; border: 1px solid var(--dy-border); border-radius: 10px 10px 10px 2px; background: var(--dy-surface-subtle); font-size: 13px; }
.dockyard-root .dy-wfd-ai-reply.undone { opacity: .6; }
.dockyard-root .dy-wfd-ai-reply p { margin: 0; }
.dockyard-root .dy-wfd-ai-reply details { font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-ai-compose { display: flex; gap: 6px; align-items: flex-end; }
.dockyard-root .dy-wfd-ai-compose textarea { flex: 1 1 auto; min-width: 0; resize: vertical; }
.dockyard-root .dy-wfd-ai-unsaved { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 10px; border: 1px solid var(--dy-warning); border-radius: 8px; background: var(--dy-warning-bg); color: var(--dy-text); font-size: 12px; }
.dockyard-root .dy-wfd-ai-unsaved > span { flex: 1 1 auto; font-weight: 600; }
/* A suggestion in the AI chat (Sahil, 07/10/2026: suggest, then Apply). The
   live one has the action colour down its edge; the rest are quiet. */
.dockyard-root .dy-wfd-ai-suggestion { display: grid; gap: 6px; padding: 8px 10px; border: 1px solid var(--dy-accent-border); border-left: 3px solid var(--dy-action); border-radius: 8px; background: var(--dy-surface); }
.dockyard-root .dy-wfd-ai-suggestion h4 { margin: 0; color: var(--dy-text-2); font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; }
.dockyard-root .dy-wfd-ai-changes { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.45; }
.dockyard-root .dy-wfd-ai-suggestion details { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-wfd-ai-suggestion-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.dockyard-root .dy-wfd-ai-suggestion:not(.is-pending) { border-color: var(--dy-border); border-left-color: var(--dy-border); }
.dockyard-root .dy-wfd-ai-suggestion.is-applied { border-left-color: var(--dy-action); }
.dockyard-root .dy-wfd-ai-suggestion.is-replaced .dy-wfd-ai-changes, .dockyard-root .dy-wfd-ai-suggestion.is-stale .dy-wfd-ai-changes { color: var(--dy-text-2); }
/* The repeat settings popover (frames). */
.dockyard-root .dy-wfd-repeat { position: fixed; z-index: 110; display: grid; gap: 8px; box-sizing: border-box; padding: 14px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 18px 44px rgba(0, 0, 0, .3); font-size: 13px; }
.dockyard-root .dy-wfd-repeat h3 { margin: 0; font-size: 14px; }
.dockyard-root .dy-wfd-repeat label { display: grid; gap: 4px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dy-wfd-repeat p { margin: 0; }
.dockyard-root .dy-wfd-repeat-actions { display: flex; gap: 6px; flex-wrap: wrap; }
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
   (.dockyard-feature-card p, .dockyard-modal p), which turned errors grey and
   the AI's message bubble grey on blue. These keep their own colour and
   spacing. (The canvas is left out of the page rule itself.) */
.dockyard-root .dy-wfd-on p.dy-wfd-error { margin: 4px 0 0; color: var(--dy-danger); font-size: 12px; }
.dockyard-root .dy-wfd-on p.dy-wfd-ai-user { margin: 0; color: var(--dy-on-action); }
.dockyard-root .dy-wfd-on .dy-wfd-ai-reply p, .dockyard-root .dy-wfd-on .dy-wfd-import-ok p, .dockyard-root .dy-wfd-on .dy-wfd-repeat p { margin: 0; color: var(--dy-text); }
.dockyard-root .dy-wfd-on p.dy-wfd-ai-note { margin: 0; }
.dockyard-root .dy-wfd-on p.dy-wfd-ai-sub { margin: 2px 0 0; color: var(--dy-text-2); font-size: 12px; overflow-wrap: anywhere; }
.dockyard-root .dy-wfd-on p.dy-wfd-draft-banner { margin: 0; color: var(--dy-text); font-size: 12px; }
@media (max-width: 900px) {
  .dockyard-root.dy-wfd-ai-docked { padding-right: 0; }
}
@media (max-width: 760px) {
  .dockyard-root .dy-wfd-ways { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-wfd-draft-banner { max-width: calc(100% - 24px); }
}
@media (max-width: 640px) {
  /* Phones: the library becomes one scrolling row, so the canvas comes up. */
  .dockyard-root .dy-wfd-on .dockyard-wf3-lib-list { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
  .dockyard-root .dy-wfd-on .dockyard-wf3-lib-list button { flex: 0 0 auto; }
}
`
