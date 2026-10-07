export const WORKFLOW_CANVAS_CSS = `
/* ---- Workflow canvas: card + status token set ----------------------------
   Every node is the SAME glass card. Two things are communicated, on separate
   channels:
   PURPOSE (what a node is)  -> the purpose word on the card (no colour, no shape).
   STATUS  (where a node is) -> card border, soft glow, status dot, status word.
   The canvas area alone is dark (it is a lit stage); the plugin chrome around
   it keeps its normal theme. Contrast measured (WCAG 2.1) on the card fill:
   label >= 13:1, purpose word >= 7:1, every status word >= 7:1.
   Single home for the palette: the literals below. */
.dy-wf-scope {
  --dy-wf-canvas-bg: #070b14;      --dy-wf-canvas-glow: #10213d;  --dy-wf-canvas-grid: #1a2740;
  --dy-wf-card-fill: #101c30;      --dy-wf-card-line: #2c4466;
  --dy-wf-card-text: #eef4ff;      --dy-wf-card-dim: #9fb2cc;
  --dy-wf-glass: rgba(12, 20, 36, .72); --dy-wf-glass-line: rgba(140, 180, 255, .20);
  --dy-wf-accent: #6ab7ff;
  --dy-wf-status-done: #4ade80;    --dy-wf-status-done-text: #5ee08a;
  --dy-wf-status-working: #e3b341; --dy-wf-status-working-text: #f0c04a;
  --dy-wf-status-blocked: #ff7b72; --dy-wf-status-blocked-text: #ff9d97;
  --dy-wf-status-pending: #8b99a8; --dy-wf-status-pending-text: #b4c1d2;
  --dy-edge-dep: #5d7aa6;          --dy-edge-dep-active: #9cc4ff;
  /* The planning connector meanings (--dy-edge-plan-*) live on the carrier
     that consumes them (.dy-pc-scope, planning section below). */
}
.dy-wf-scope .dy-wf-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
/* The mount root IS the canvas frame: sized, bordered, positioned, and the
   only dark surface. A soft radial light plus a fine dot grid gives the stage
   depth without competing with the cards. */
.dy-wf-scope .dy-wf,
.dy-wf-scope.dy-wf {
  position: relative; height: 72vh; border: 1px solid var(--dy-wf-card-line); border-radius: 14px; overflow: hidden;
  background-color: var(--dy-wf-canvas-bg);
  background-image:
    radial-gradient(ellipse at 30% 20%, var(--dy-wf-canvas-glow) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 90%, rgba(80, 60, 160, .16) 0%, transparent 55%),
    radial-gradient(circle, var(--dy-wf-canvas-grid) 1px, transparent 1.2px);
  background-size: 100% 100%, 100% 100%, 22px 22px;
  color: var(--dy-wf-card-text);
}
.dy-wf-scope .dy-wf-wrap { position: relative; width: 100%; height: 100%; }
.dy-wf-scope .dy-wf-svg { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.dy-wf-scope .dy-wf-svg:active { cursor: grabbing; }
/* Smooth camera: button, fit and minimap moves ease; direct manipulation
   (pan drag, wheel) sets .dy-wf-panning so the world tracks the pointer. */
.dy-wf-scope .dy-wf-viewport { transition: transform .45s cubic-bezier(.22, .8, .24, 1); }
.dy-wf-scope.dy-wf-panning .dy-wf-viewport, .dy-wf-scope .dy-wf-panning .dy-wf-viewport { transition: none; }

/* Floating glass surfaces over the canvas: tools, activity, overview,
   playback, list, step details. One recipe for all of them. */
.dy-wf-scope .dy-wf-glass {
  background: var(--dy-wf-glass); border: 1px solid var(--dy-wf-glass-line); border-radius: 12px;
  -webkit-backdrop-filter: blur(14px) saturate(1.3); backdrop-filter: blur(14px) saturate(1.3);
  box-shadow: 0 12px 34px rgba(0, 0, 0, .38), inset 0 1px 0 rgba(255, 255, 255, .05);
  color: var(--dy-wf-card-text);
}

/* Playback (bottom centre). */
.dy-wf-scope .dy-wf-playback { position: absolute; left: 50%; bottom: 14px; z-index: 12; display: flex; align-items: center; gap: 8px; width: min(640px, calc(100% - 230px)); transform: translateX(-50%); padding: 8px 11px; }
.dy-wf-scope .dy-wf-playback-btn,
.dy-wf-scope .dy-wf-motion-btn,
.dy-wf-scope .dy-wf-zoombtn {
  flex: 0 0 auto; padding: 5px 10px; border: 1px solid var(--dy-wf-glass-line); border-radius: 8px;
  background: rgba(255, 255, 255, .04); color: var(--dy-wf-card-text); cursor: pointer; font-size: 12px;
  transition: background .18s, border-color .18s, transform .12s;
}
.dy-wf-scope .dy-wf-playback-btn { min-width: 70px; }
.dy-wf-scope .dy-wf-playback-btn:hover:not(:disabled),
.dy-wf-scope .dy-wf-motion-btn:hover,
.dy-wf-scope .dy-wf-zoombtn:hover { background: rgba(106, 183, 255, .14); border-color: var(--dy-wf-accent); }
.dy-wf-scope .dy-wf-playback-btn:active:not(:disabled),
.dy-wf-scope .dy-wf-zoombtn:active { transform: scale(.96); }
.dy-wf-scope .dy-wf-playback-btn:disabled { cursor: not-allowed; opacity: .45; }
.dy-wf-scope .dy-wf-playback-slider { flex: 1 1 auto; min-width: 80px; accent-color: var(--dy-wf-accent); }
.dy-wf-scope .dy-wf-playback-label { flex: 0 0 auto; min-width: 92px; color: var(--dy-wf-card-dim); font-size: 11px; text-align: right; }
.dy-wf-scope .dy-wf-motion-btn { font-size: 11px; }

/* Tool cluster (top right): camera + list toggle. */
.dy-wf-scope .dy-wf-zoombar { position: absolute; top: 12px; right: 12px; z-index: 11; display: flex; gap: 5px; padding: 6px; }
.dy-wf-scope .dy-wf-zoombar .dy-wf-list-head { font-weight: 600; }

/* Still mode (motion toggle) and playback cues. */
.dy-wf-scope.dy-wf-still .dy-wf-node .dy-wf-shape, .dy-wf-scope.dy-wf-still .dy-wf-statusdot { animation: none !important; }
.dy-wf-scope.dy-wf-still .dy-wf-flowdot { animation: none !important; opacity: 0; }
.dy-wf-scope.dy-wf-still .dy-wf-edge { stroke-dasharray: none; }
.dy-wf-scope .dy-wf-node.dy-wf-playback-active .dy-wf-shape { stroke: var(--dy-wf-accent); stroke-width: 2.4; filter: drop-shadow(0 0 12px var(--dy-wf-accent)); }
.dy-wf-scope .dy-wf-node[data-wf-playback-status="done"] .dy-wf-shape { stroke: var(--dy-wf-status-done); }

/* LOD tiers (archify): map < 75% / read / full > 140% */
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-sub,
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-timer,
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-assignee { opacity: 0; }
.dy-wf-scope .dy-wf-svg .dy-wf-sub, .dy-wf-scope .dy-wf-svg .dy-wf-timer,
.dy-wf-scope .dy-wf-svg .dy-wf-assignee { transition: opacity .3s; }

/* ---- The card (identical for every node) ------------------------------- */
.dy-wf-scope .dy-wf-node { cursor: pointer; outline: none; transition: opacity .25s ease, filter .25s ease; }
.dy-wf-scope .dy-wf-node:hover .dy-wf-shape { filter: brightness(1.18); }
.dy-wf-scope .dy-wf-node:focus-visible .dy-wf-shape { stroke: var(--dy-wf-accent); stroke-width: 2.4; }
.dy-wf-scope .dy-wf-node.dy-wf-route-dim { opacity: .2; filter: saturate(.2); }
.dy-wf-scope .dy-wf-node-history { display: grid; gap: 3px; margin: 10px 0 0; padding-left: 18px; color: var(--dy-wf-card-dim); font-size: 11px; }
.dy-wf-scope .dy-wf-node .dy-wf-shape {
  fill: var(--dy-wf-card-fill); stroke: var(--dy-wf-card-line); stroke-width: 1.4;
  transition: stroke .5s, stroke-width .2s, filter .3s;
}
.dy-wf-scope .dy-wf-card-sheen { fill: url(#dyWfCardSheen); pointer-events: none; }
/* Status: border + glow + dot + word. The card fill never changes. */
.dy-wf-scope .dy-wf-node.done .dy-wf-shape    { stroke: var(--dy-wf-status-done);    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--dy-wf-status-done) 40%, transparent)); }
.dy-wf-scope .dy-wf-node.working .dy-wf-shape { stroke: var(--dy-wf-status-working); animation: dyWfBreath 2.2s ease-in-out infinite; }
.dy-wf-scope .dy-wf-node.blocked .dy-wf-shape { stroke: var(--dy-wf-status-blocked); filter: drop-shadow(0 0 7px color-mix(in srgb, var(--dy-wf-status-blocked) 45%, transparent)); }
.dy-wf-scope .dy-wf-node.pending .dy-wf-shape { stroke: var(--dy-wf-status-pending); stroke-dasharray: 5 4; }
.dy-wf-scope .dy-wf-node.awaiting .dy-wf-shape { stroke: var(--dy-wf-status-working); stroke-dasharray: 5 4; animation: dyWfAwait 2.6s ease-in-out infinite; }
@keyframes dyWfBreath {
  0%, 100% { stroke-width: 1.5; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--dy-wf-status-working) 35%, transparent)); }
  50% { stroke-width: 2.4; filter: drop-shadow(0 0 14px color-mix(in srgb, var(--dy-wf-status-working) 70%, transparent)); }
}
@keyframes dyWfAwait { 0%, 100% { stroke-opacity: .55; } 50% { stroke-opacity: 1; } }
.dy-wf-scope .dy-wf-statusdot { stroke: none; }
.dy-wf-scope .dy-wf-statusdot.done { fill: var(--dy-wf-status-done); }
.dy-wf-scope .dy-wf-statusdot.working { fill: var(--dy-wf-status-working); animation: dyWfDot 1.4s ease-in-out infinite; }
.dy-wf-scope .dy-wf-statusdot.blocked { fill: var(--dy-wf-status-blocked); }
.dy-wf-scope .dy-wf-statusdot.pending { fill: var(--dy-wf-status-pending); }
@keyframes dyWfDot { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.dy-wf-scope .dy-wf-node .dy-wf-statustext { font: 600 10.5px system-ui, sans-serif; letter-spacing: .3px; pointer-events: none; }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.done { fill: var(--dy-wf-status-done-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.working { fill: var(--dy-wf-status-working-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.blocked { fill: var(--dy-wf-status-blocked-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.pending { fill: var(--dy-wf-status-pending-text); }
.dy-wf-scope .dy-wf-node .dy-wf-port { fill: var(--dy-wf-canvas-bg); stroke: var(--dy-wf-accent); stroke-width: 2; transition: r .15s, fill .15s; }
.dy-wf-scope .dy-wf-node .dy-wf-port-hit { fill: transparent; stroke: none; cursor: crosshair; }
.dy-wf-scope .dy-wf-node[data-wf-editable="false"] .dy-wf-port-hit { cursor: pointer; }
.dy-wf-scope .dy-wf-node:hover .dy-wf-port { fill: var(--dy-wf-accent); }
.dy-wf-scope .dy-wf-node.dy-wf-connecting .dy-wf-port { fill: var(--dy-edge-dep-active); }
/* Unmistakable selection: accent ring + glow. */
.dy-wf-scope .dy-wf-node.dy-wf-selected .dy-wf-shape {
  stroke: var(--dy-wf-accent); stroke-width: 2.6; stroke-dasharray: none;
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--dy-wf-accent) 75%, transparent));
}
@keyframes dySelPulse { 0%,100% { stroke-width: 2.6; } 50% { stroke-width: 3.4; } }
.dy-wf-scope .dy-wf-svg .dy-wf-node.dy-wf-selected .dy-wf-shape { animation: dySelPulse 1.8s ease-in-out infinite; }
.dy-wf-scope .dy-wf-label { fill: var(--dy-wf-card-text); font: 600 13px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-sub { fill: var(--dy-wf-card-dim); font: 500 10.5px system-ui, sans-serif; letter-spacing: .5px; text-transform: uppercase; pointer-events: none; }
.dy-wf-scope .dy-wf-timer { fill: var(--dy-wf-status-working-text); font: 10.5px ui-monospace, monospace; }
.dy-wf-scope .dy-wf-assignee { fill: var(--dy-wf-card-dim); font: 10.5px ui-monospace, monospace; pointer-events: none; }

/* ---- Connectors ---------------------------------------------------------- */
.dy-wf-scope .dy-wf-edge { stroke: var(--dy-edge-dep); stroke-width: 1.8; fill: none; stroke-linecap: round; transition: stroke .4s, stroke-width .3s; }
.dy-wf-scope .dy-wf-edge.active { stroke: var(--dy-edge-dep-active); stroke-width: 2.2; stroke-dasharray: 7 7; animation: dyWfFlow 1.1s linear infinite; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--dy-edge-dep-active) 60%, transparent)); }
@keyframes dyWfFlow { to { stroke-dashoffset: -14; } }
.dy-wf-scope .dy-wf-edge.dy-wf-route-edge { stroke: var(--dy-wf-accent); stroke-width: 2.6; filter: drop-shadow(0 0 6px var(--dy-wf-accent)); }
.dy-wf-scope .dy-wf-arrow { stroke: none; }
.dy-wf-scope .dy-wf-flowdot { fill: var(--dy-edge-dep-active); filter: drop-shadow(0 0 4px var(--dy-edge-dep-active)); }

/* ---- Overview, activity, list, details ----------------------------------- */
.dy-wf-scope .dy-wf-minimap { position: absolute; right: 12px; bottom: 14px; z-index: 11; }
.dy-wf-scope .dy-wf-mini-view { fill: rgba(106, 183, 255, .08); stroke: var(--dy-wf-accent); stroke-width: 2; }
/* Live activity strip: top left, collapsible. */
.dy-wf-scope .dy-wf-feed { position: absolute; top: 12px; left: 12px; z-index: 11; width: 290px; overflow: hidden; }
.dy-wf-scope .dy-wf-feed-head { display: block; width: 100%; text-align: left; background: transparent; border: none; border-radius: 0; padding: 7px 12px; font-size: 11.5px; color: var(--dy-wf-card-dim); cursor: pointer; letter-spacing: .3px; }
.dy-wf-scope .dy-wf-feed-body { max-height: 150px; overflow: hidden; padding: 0 12px 8px; }
.dy-wf-scope .dy-wf-feed-item { display: flex; gap: 6px; font-size: 11px; color: var(--dy-wf-card-text); padding: 3px 0; border-bottom: 1px dashed rgba(140, 180, 255, .12); transition: opacity 1.2s; animation: dyWfFeedIn .45s ease-out; }
@keyframes dyWfFeedIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.dy-wf-scope .dy-wf-feed-time { font: 10px ui-monospace, monospace; color: #7086a6; flex: none; padding-top: 1px; }
/* List view: floating glass panel opened from the tool cluster. */
.dy-wf-scope .dy-wf-list { position: absolute; top: 60px; right: 12px; z-index: 13; width: min(460px, calc(100% - 24px)); max-height: calc(100% - 140px); overflow-y: auto; padding: 6px 14px; }
.dy-wf-scope .dy-wf-list[hidden] { display: none; }
.dy-wf-scope .dy-wf-list-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid rgba(140, 180, 255, .12); flex-wrap: wrap; }
.dy-wf-scope .dy-wf-list-row:last-child { border-bottom: none; }
.dy-wf-scope .dy-wf-list-title { min-width: 140px; color: var(--dy-wf-card-text); font-weight: 600; }
.dy-wf-scope .dy-wf-list-kind { font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; color: var(--dy-wf-card-dim); border: 1px solid var(--dy-wf-glass-line); border-radius: 5px; padding: 1px 6px; }
.dy-wf-scope .dy-wf-list-deps { color: var(--dy-wf-card-dim); font-size: 12px; flex: 1; }
.dy-wf-scope .dy-wf-list-status { font-weight: 600; color: var(--dy-wf-status-pending-text); }
.dy-wf-scope .dy-wf-list-status.done { color: var(--dy-wf-status-done-text); }
.dy-wf-scope .dy-wf-list-status.blocked { color: var(--dy-wf-status-blocked-text); }
.dy-wf-scope .dy-wf-list-status.working { color: var(--dy-wf-status-working-text); }
.dy-wf-scope .dy-wf-list-open { background: rgba(255, 255, 255, .04); color: var(--dy-wf-card-text); border: 1px solid var(--dy-wf-glass-line); border-radius: 7px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
/* Step details: floating glass panel, opens only on selection. One reading
   order: header (kind, status, title) -> facts -> history -> actions -> edit.
   Every colour comes from the canvas tokens so nothing inherits the plugin's
   light-theme text or white form controls. */
.dy-wf-scope .dy-wf-passport { position: absolute; top: 62px; right: 12px; z-index: 14; width: 320px; max-height: calc(100% - 140px); overflow-y: auto; padding: 0; color: var(--dy-wf-card-text); font: 13px/1.45 system-ui, sans-serif; animation: dyWfPanelIn .28s cubic-bezier(.22, .8, .24, 1); scrollbar-width: thin; scrollbar-color: rgba(140, 180, 255, .25) transparent; }
.dy-wf-scope .dy-wf-passport:empty { display: none; }
@keyframes dyWfPanelIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
.dy-wf-scope .dy-wf-passport > * { margin-left: 16px; margin-right: 16px; }
.dy-wf-scope .dy-wf-pp-head { position: sticky; top: 0; z-index: 1; margin: 0 0 4px; padding: 14px 48px 12px 16px; border-bottom: 1px solid var(--dy-wf-glass-line); background: rgba(12, 20, 36, .92); backdrop-filter: blur(10px); }
.dy-wf-scope .dy-wf-pp-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dy-wf-scope .dy-wf-passport-close { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border: 1px solid var(--dy-wf-glass-line); border-radius: 8px; background: rgba(255, 255, 255, .04); color: var(--dy-wf-card-dim); cursor: pointer; font-size: 16px; line-height: 1; }
.dy-wf-scope .dy-wf-passport-close:hover { color: var(--dy-wf-card-text); border-color: var(--dy-wf-accent); }
.dy-wf-scope .dy-wf-passport-kind { margin: 0; font-size: 10.5px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--dy-wf-card-dim); }
.dy-wf-scope .dy-wf-passport h3 { margin: 0; font-size: 16px; font-weight: 650; line-height: 1.3; color: var(--dy-wf-card-text); overflow-wrap: anywhere; }
.dy-wf-scope .dy-wf-passport .badge { display: inline-flex; align-items: center; gap: 5px; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: capitalize; border: 1px solid var(--dy-wf-status-pending); color: var(--dy-wf-status-pending-text); background: rgba(139, 153, 168, .10); }
.dy-wf-scope .dy-wf-passport .badge.done { border-color: var(--dy-wf-status-done); color: var(--dy-wf-status-done-text); background: rgba(74, 222, 128, .10); }
.dy-wf-scope .dy-wf-passport .badge.working { border-color: var(--dy-wf-status-working); color: var(--dy-wf-status-working-text); background: rgba(227, 179, 65, .10); }
.dy-wf-scope .dy-wf-passport .badge.blocked { border-color: var(--dy-wf-status-blocked); color: var(--dy-wf-status-blocked-text); background: rgba(255, 123, 114, .10); }
.dy-wf-scope .dy-wf-pp-facts { display: grid; gap: 0; margin-top: 8px; margin-bottom: 0; }
.dy-wf-scope .dy-wf-pp-fact { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(140, 180, 255, .08); }
.dy-wf-scope .dy-wf-pp-fact:last-child { border-bottom: 0; }
.dy-wf-scope .dy-wf-pp-fact dt { margin: 0; color: var(--dy-wf-card-dim); font-size: 11.5px; }
.dy-wf-scope .dy-wf-pp-fact dd { margin: 0; color: var(--dy-wf-card-text); font-size: 12.5px; overflow-wrap: anywhere; }
.dy-wf-scope .dy-wf-passport h4 { margin-top: 16px; margin-bottom: 6px; font-size: 10.5px; font-weight: 600; color: var(--dy-wf-card-dim); text-transform: uppercase; letter-spacing: .7px; }
.dy-wf-scope .dy-wf-passport .dy-wf-node-history { margin-top: 0; padding-left: 34px; color: var(--dy-wf-card-text); font-size: 12px; }
.dy-wf-scope .dy-wf-pp-note { margin-top: 12px; margin-bottom: 0; color: var(--dy-wf-card-dim); font-size: 12px; line-height: 1.5; }
.dy-wf-scope .dy-wf-passport button:not(.dy-wf-passport-close) { min-height: 32px; background: rgba(255, 255, 255, .05); color: var(--dy-wf-card-text); border: 1px solid var(--dy-wf-glass-line); border-radius: 8px; padding: 5px 12px; font: 600 12.5px system-ui, sans-serif; cursor: pointer; }
.dy-wf-scope .dy-wf-passport button:not(.dy-wf-passport-close):hover:not(:disabled) { border-color: var(--dy-wf-accent); }
.dy-wf-scope .dy-wf-passport button.primary { background: var(--dy-wf-accent); border-color: var(--dy-wf-accent); color: #04101f; }
.dy-wf-scope .dy-wf-passport button.primary:hover:not(:disabled) { filter: brightness(1.08); }
.dy-wf-scope .dy-wf-passport button:disabled { opacity: .6; cursor: default; }
.dy-wf-scope .dy-wf-decision-state { display: inline-block; margin-top: 14px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--dy-wf-status-working); background: rgba(227, 179, 65, .10); font-size: 12px; font-weight: 600; color: var(--dy-wf-status-working-text); }
.dy-wf-scope .dy-wf-recovery { margin-top: 14px; }
.dy-wf-scope .dy-wf-actions { display: flex; gap: 8px; margin-top: 10px; }
.dy-wf-scope .dy-wf-actions button { flex: 1; }
.dy-wf-scope .dy-wf-expand { margin-top: 14px; }
.dy-wf-scope .dy-wf-passport .dy-wf-expand-head { width: 100%; text-align: left; }
.dy-wf-scope .dy-wf-expand-body { padding: 8px 2px; color: var(--dy-wf-card-text); }
.dy-wf-scope .dy-wf-expand-body .dy-dim { color: var(--dy-wf-card-dim); }
.dy-wf-scope .dy-wf-edit { display: grid; gap: 10px; margin-top: 16px; margin-bottom: 16px; padding-top: 4px; border-top: 1px solid var(--dy-wf-glass-line); }
.dy-wf-scope .dy-wf-edit h4 { margin-bottom: 0; }
.dy-wf-scope .dy-wf-field { display: grid; gap: 4px; }
.dy-wf-scope .dy-wf-field > span { color: var(--dy-wf-card-dim); font-size: 11.5px; }
.dy-wf-scope .dy-wf-field input { width: 100%; box-sizing: border-box; min-height: 34px; padding: 6px 10px; border: 1px solid var(--dy-wf-glass-line); border-radius: 8px; background: rgba(4, 10, 22, .65); color: var(--dy-wf-card-text); font: 13px system-ui, sans-serif; outline: none; }
.dy-wf-scope .dy-wf-field input::placeholder { color: rgba(159, 178, 204, .55); }
.dy-wf-scope .dy-wf-field input:focus { border-color: var(--dy-wf-accent); box-shadow: 0 0 0 3px rgba(106, 183, 255, .18); }
.dy-wf-scope .dy-wf-edit > button { justify-self: start; }
/* Panel buttons are styled here, not by the host: the Desktop screen has no
   .dy-btn rules, so Save rendered as a bare browser button there. */
.dy-wf-scope .dy-wf-edit-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.dy-wf-scope .dy-wf-edit button { min-height: 32px; padding: 6px 12px; border: 1px solid var(--dy-wf-glass-line); border-radius: 8px; background: rgba(4, 10, 22, .65); color: var(--dy-wf-card-text); font: 600 12.5px system-ui, sans-serif; cursor: pointer; }
.dy-wf-scope .dy-wf-edit button.primary { border-color: var(--dy-wf-accent); background: rgba(106, 183, 255, .18); }
.dy-wf-scope .dy-wf-edit button.danger { border-color: rgba(255, 120, 112, .55); color: #ff9d97; }
.dy-wf-scope .dy-wf-edit button:disabled { opacity: .55; cursor: default; }
.dy-wf-scope .dy-wf-edit button:focus-visible { outline: 2px solid var(--dy-wf-accent); outline-offset: 2px; }
/* Delete asks first; a refused or failed save says why (findings 3 and 10). */
.dy-wf-scope .dy-wf-delete-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px; border: 1px solid rgba(255, 120, 112, .45); border-radius: 8px; }
.dy-wf-scope .dy-wf-delete-confirm p { flex: 1 0 100%; margin: 0; color: var(--dy-wf-card-text); font-size: 12.5px; line-height: 1.45; }
.dy-wf-scope .dy-wf-pp-error { margin: 0; color: #ff9d97; font-size: 12.5px; line-height: 1.45; }
.dy-wf-scope .dy-wf-delete-confirm[hidden], .dy-wf-scope .dy-wf-pp-error[hidden] { display: none; }
/* Steps open on double-click: the note shown on hover, and the words a
   screen reader hears. A double-click must not select the label text. */
.dy-wf-scope .dy-wf-svg { -webkit-user-select: none; user-select: none; }
.dy-wf-scope .dy-wf-open-hint { position: absolute; z-index: 16; pointer-events: none; padding: 4px 9px; border: 1px solid var(--dy-wf-glass-line); border-radius: 6px; background: #0b1220; color: #f4f7fb; font: 600 12px/1.35 system-ui, sans-serif; white-space: nowrap; transform: translate(-50%, calc(-100% - 6px)); box-shadow: 0 4px 14px rgba(0, 0, 0, .35); }
.dy-wf-scope .dy-wf-open-hint.below { transform: translate(-50%, 6px); }
.dy-wf-scope .dy-wf-open-hint[hidden] { display: none; }
.dy-wf-scope .dy-wf-sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.dy-wf-scope .dy-wf-passport > :last-child { margin-bottom: 16px; }
.dy-wf-scope .dy-wf-empty { fill: var(--dy-wf-card-dim); font: 13px system-ui, sans-serif; }
/* Lane bands (v6 composition): axis labels, never controls. The "exception"
   band carries branches/loops or a blocked node. (No backticks in here.) */
.dy-wf-scope .dy-wf-lane { fill: rgba(140, 170, 220, .035); stroke: rgba(140, 180, 255, .09); stroke-width: 1; }
.dy-wf-scope .dy-wf-lane.exception { fill: rgba(255, 123, 114, .05); }
.dy-wf-scope .dy-wf-lane-label { fill: #6f86a8; font: 600 7px system-ui, sans-serif; letter-spacing: .9px; text-transform: uppercase; pointer-events: none; }
/* Workflows design round (07/10/2026): plain-words card notes and the frame
   drawn around steps that repeat. Only drawn when a design hook asks. */
.dy-wf-scope .dy-wf-svg .dy-wf-node .dy-wf-sub[data-wf-card-note] { fill: #b9d3ff; text-transform: none; letter-spacing: 0; font-size: 11px; }
.dy-wf-scope .dy-wf-frame-box { fill: rgba(106, 183, 255, .06); stroke: #6ab7ff; stroke-width: 1.4; stroke-dasharray: 6 4; pointer-events: none; }
.dy-wf-scope .dy-wf-frame-tab { cursor: pointer; }
.dy-wf-scope .dy-wf-frame-tab:focus { outline: none; }
.dy-wf-scope .dy-wf-frame-tabbg { fill: #12305a; stroke: #6ab7ff; stroke-width: 1; }
.dy-wf-scope .dy-wf-frame-tab:hover .dy-wf-frame-tabbg { fill: #1b4580; }
.dy-wf-scope .dy-wf-frame-tab:focus-visible .dy-wf-frame-tabbg { stroke: #ffffff; stroke-width: 2.5; }
.dy-wf-scope .dy-wf-frame-label { fill: #e6f1ff; font: 600 11px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-frame-sub { fill: #9fc6ff; font: 500 10.5px system-ui, sans-serif; pointer-events: none; }

/* Phone width: stacked layout; floating surfaces reflow so none overlaps
   another and none is cut off. */
@media (max-width: 640px) {
  .dy-wf-scope .dy-wf-feed { width: auto; right: 12px; top: 58px; }
  .dy-wf-scope .dy-wf-feed-body { max-height: 90px; }
  .dy-wf-scope .dy-wf-zoombar { left: 12px; right: 12px; justify-content: space-between; flex-wrap: wrap; }
  .dy-wf-scope .dy-wf-minimap { display: none; }
  .dy-wf-scope .dy-wf-playback { bottom: 8px; width: calc(100% - 18px); }
  .dy-wf-scope .dy-wf-playback-label { min-width: 64px; font-size: 10px; }
  .dy-wf-scope .dy-wf-motion-btn { padding-inline: 6px; }
  .dy-wf-scope .dy-wf-wrap .dy-wf-passport,
  .dy-wf-scope .dy-wf-wrap .dy-wf-list { left: 8px; right: 8px; top: auto; bottom: 8px; max-height: 62%; width: auto; z-index: 16; }
  .dy-wf-scope .dy-wf-pp-fact { grid-template-columns: 96px minmax(0, 1fr); }
}

/* Reduced motion: honour the platform setting for every canvas animation. */
@media (prefers-reduced-motion: reduce) {
  .dy-wf-scope .dy-wf-node .dy-wf-shape, .dy-wf-scope .dy-wf-statusdot,
  .dy-wf-scope .dy-wf-edge.active, .dy-wf-scope .dy-wf-feed-item,
  .dy-wf-scope .dy-wf-passport { animation: none !important; }
  .dy-wf-scope .dy-wf-viewport { transition: none; }
  .dy-wf-scope .dy-wf-svg .dy-wf-sub, .dy-wf-scope .dy-wf-svg .dy-wf-timer { transition: none; }
}

/* ==== Planning canvas (v6 composition) ==================================
   The spatial planning surface: a toolbar over a pannable/zoomed world, one
   absolutely-positioned card per persisted canvas object, SVG connectors drawn
   through their live rects, a curation assistant panel and a selection drawer.

   Same single-home discipline as the workflow canvas above: the rules live in
   this module and nowhere else, and they are scoped to a carrier class the
   planning panel root sets itself (.dy-pc-scope). Scoping to an ancestor the
   Desktop surface never renders is exactly what painted the workflow canvas
   black, so this surface names its own carrier for the same reason.

   Object kinds are the REAL persisted vocabulary (canvas_service.OBJECT_KINDS:
   evidence, claim, question, decision, plan_block, note, link, media) and the
   connector meanings are the REAL persisted set (CONNECTOR_MEANINGS). Nothing
   here invents a kind or a meaning; these selectors exist so a real kind is
   recognisable at a glance, exactly as v6 asked for its five cards.

   Palette home: the literals below, light values on the carrier and the dark
   overrides under the theme attribute the Desktop host actually flips
   (.dockyard-root[data-theme="dark"]). The reserved --dy-edge-plan-* means now
   live here (they were declared tokens-only for this surface). */
.dy-pc-scope,
.dy-pc-scope .dy-pc[data-canvas-theme="light"] {
  --dy-pc-kind-evidence: #1f7a55;   --dy-pc-kind-claim: #6b4bbd;
  --dy-pc-kind-question: #9a6206;   --dy-pc-kind-decision: #2f4bb5;
  --dy-pc-kind-plan_block: #1d6480; --dy-pc-kind-note: #5b6472;
  --dy-pc-kind-risk: #a8321f; --dy-pc-kind-assumption: #6b5a12;
  --dy-pc-kind-link: #0f6f7a;       --dy-pc-kind-media: #8a3a76;
  --dy-pc-edge-support: #1f7a55;
  --dy-pc-surface: rgba(255, 255, 255, .96);
  --dy-pc-grid: rgba(31, 42, 68, .10);
  --dy-pc-backdrop: rgba(15, 18, 23, .26);
  --dy-pc-danger-text: #a72a2a;
  /* D20: every kind is a full sticker. Light canvas = pastel paper with dark
     ink; all fills keep ink and ink-2 at WCAG AA (>= 4.5:1), asserted in
     dashboard/tests/canvas-sticker-contrast.test.mjs. */
  --dy-pc-ink: #15171c;               --dy-pc-ink-2: #3a4250;
  --dy-pc-fill-evidence: #d9f4dd;     --dy-pc-fill-claim: #e7defc;
  --dy-pc-fill-question: #ffe2c4;     --dy-pc-fill-decision: #dde3ff;
  --dy-pc-fill-plan_block: #d2efec;   --dy-pc-fill-note: #fff1a6;
  --dy-pc-fill-risk: #fde0da; --dy-pc-fill-assumption: #f3ecc8;
  --dy-pc-fill-link: #d3ebfb;         --dy-pc-fill-media: #fbdcec;
  --dy-pc-sticker-yellow: #fff1a6;    --dy-pc-sticker-green: #d3f4dc;
  --dy-pc-sticker-blue: #d3e6fd;      --dy-pc-sticker-pink: #fcd9e7;
  --dy-pc-sticker-purple: #e7defc;    --dy-pc-sticker-orange: #ffdfc0;
  --dy-pc-sticker-coral: #ffc4bd;     --dy-pc-sticker-teal: #bfeee6;
  --dy-pc-sticker-lime: #e3f7b8;      --dy-pc-sticker-clay: #e6d2bf;
  --dy-pc-sticker-slate: #e2e6eb;     --dy-pc-sticker-indigo: #c9cffa;
  --dy-pc-card-edge: rgba(21, 23, 28, .14);
  /* D18: the canvas frame. */
  --dy-pc-frame: #3654c7;             --dy-pc-frame-halo: rgba(54, 84, 199, .16);
  --dy-pc-glow: rgba(54, 84, 199, .10);
  --dy-pc-stage-bg: #f4f6fa;
  /* Connector meanings (reserved vocabulary, now drawn here). */
  --dy-edge-plan-supports: #1f7a55;         --dy-edge-plan-supports-active: #17603f;
  --dy-edge-plan-contradicts: #b3352c;      --dy-edge-plan-contradicts-active: #8d2721;
  --dy-edge-plan-derived_from: #6b4bbd;     --dy-edge-plan-derived_from-active: #533a95;
  --dy-edge-plan-clarifies: #8a6206;        --dy-edge-plan-clarifies-active: #6d4d04;
  --dy-edge-plan-implements: #a4520b;       --dy-edge-plan-implements-active: #823f08;
  --dy-edge-plan-raises_question: #a8275f;  --dy-edge-plan-raises_question-active: #861e4b;
  --dy-edge-plan-depends_on: #4a5a7a;       --dy-edge-plan-depends_on-active: #3a4763;
}
.dockyard-root[data-theme="dark"] .dy-pc-scope,
.dy-pc-scope .dy-pc[data-canvas-theme="dark"] {
  --dy-pc-kind-evidence: #57d39b;   --dy-pc-kind-claim: #b99cf5;
  --dy-pc-kind-question: #f0c04a;   --dy-pc-kind-decision: #9db3ff;
  --dy-pc-kind-plan_block: #79cbe0; --dy-pc-kind-note: #a9b6c6;
  --dy-pc-kind-risk: #ff9b87; --dy-pc-kind-assumption: #e0cf7a;
  --dy-pc-kind-link: #6fd8e0;       --dy-pc-kind-media: #e3a0d3;
  --dy-pc-surface: rgba(23, 27, 34, .96);
  --dy-pc-grid: rgba(182, 190, 202, .12);
  --dy-pc-backdrop: rgba(0, 0, 0, .42);
  --dy-pc-danger-text: #ff9d97;
  /* Dark canvas = deep glowing stickers with light ink (AA both inks). */
  --dy-pc-ink: #f3f5f7;               --dy-pc-ink-2: #c9d1dc;
  --dy-pc-fill-evidence: #173d2a;     --dy-pc-fill-claim: #2e2552;
  --dy-pc-fill-question: #4a2d12;     --dy-pc-fill-decision: #1f2b5c;
  --dy-pc-fill-plan_block: #123d40;   --dy-pc-fill-note: #463c0e;
  --dy-pc-fill-risk: #4a1c15; --dy-pc-fill-assumption: #3a3310;
  --dy-pc-fill-link: #123a52;         --dy-pc-fill-media: #4a1d3c;
  --dy-pc-sticker-yellow: #463c0e;    --dy-pc-sticker-green: #173d2a;
  --dy-pc-sticker-blue: #16345a;      --dy-pc-sticker-pink: #4d1c33;
  --dy-pc-sticker-purple: #2e2552;    --dy-pc-sticker-orange: #4a2d12;
  --dy-pc-sticker-coral: #5a1a17;     --dy-pc-sticker-teal: #0c3f3b;
  --dy-pc-sticker-lime: #2f3d0a;      --dy-pc-sticker-clay: #3a2e27;
  --dy-pc-sticker-slate: #2b3139;     --dy-pc-sticker-indigo: #22286e;
  --dy-pc-card-edge: rgba(243, 245, 247, .16);
  --dy-pc-frame: #7c8cff;             --dy-pc-frame-halo: rgba(124, 140, 255, .32);
  --dy-pc-glow: rgba(124, 140, 255, .26);
  --dy-pc-stage-bg: #0d1018;
  --dy-edge-plan-supports: #4fc08d;         --dy-edge-plan-supports-active: #79e0ab;
  --dy-edge-plan-contradicts: #ff8a80;      --dy-edge-plan-contradicts-active: #ffb3ab;
  --dy-edge-plan-derived_from: #c792ea;     --dy-edge-plan-derived_from-active: #e0bcf7;
  --dy-edge-plan-clarifies: #ffd479;        --dy-edge-plan-clarifies-active: #ffe3a3;
  --dy-edge-plan-implements: #ffb86c;       --dy-edge-plan-implements-active: #ffd0a0;
  --dy-edge-plan-raises_question: #ff6ea9;  --dy-edge-plan-raises_question-active: #ff9cc4;
  --dy-edge-plan-depends_on: #8fa3c8;       --dy-edge-plan-depends_on-active: #9cc4ff;
}
/* D19: the canvas light/dark toggle. Only the canvas area (.dy-pc) re-declares
   the plugin tokens its own controls read, so the board bar and the rest of
   the plugin keep the host theme. Values mirror desktop/src/styles/tokens.js. */
.dy-pc-scope .dy-pc[data-canvas-theme="light"] {
  --dy-surface: #ffffff; --dy-surface-subtle: #f0f2f5; --dy-text: #15171c;
  --dy-text-2: #515968; --dy-text-3: #626c7b; --dy-border: #d7dce4;
  --dy-control-border: #87909d; --dy-accent-text: #293f9e; --dy-accent-soft: #eef1ff;
  --dy-accent-border: #b8c4f0; --dy-shadow: 0 10px 28px rgba(31, 42, 68, 0.08);
  --dy-success: #136c4a; --dy-warning: #805200; --dy-danger-bg: #ffeded; --dy-focus: #3654c7;
  --dy-pc-surface: rgba(255, 255, 255, .96); --dy-pc-grid: rgba(31, 42, 68, .10);
  color: #15171c; color-scheme: light;
}
.dy-pc-scope .dy-pc[data-canvas-theme="dark"] {
  --dy-surface: #171b22; --dy-surface-subtle: #1d222b; --dy-text: #f3f5f7;
  --dy-text-2: #b6beca; --dy-text-3: #949eac; --dy-border: #2e3541;
  --dy-control-border: #5f6977; --dy-accent-text: #c2cbff; --dy-accent-soft: #232c4f;
  --dy-accent-border: #46558f; --dy-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  --dy-success: #72cda2; --dy-warning: #f0bd64; --dy-danger-bg: #40201f; --dy-focus: #8fa2ff;
  --dy-pc-surface: rgba(23, 27, 34, .96); --dy-pc-grid: rgba(124, 140, 255, .10);
  color: #f3f5f7; color-scheme: dark;
}
/* Board switcher: compact on desktop and allowed to collapse on narrow screens. */
.dy-pc-scope .dy-pc-board-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dy-pc-scope .dy-pc-board-bar > .dockyard-button { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; padding: 5px; }
.dy-pc-scope .dy-pc-board-title { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; min-width: 0; flex: 1 1 auto; }
.dy-pc-scope .dy-pc-board-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11px; font-weight: 650; }
.dy-pc-scope .dy-pc-board-moves { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dy-pc-scope .dy-pc-board-moves-label { color: var(--dy-text-3); font-size: 11px; }
.dy-pc-scope .dy-pc-board-panel { display: grid; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-pc-scope .dy-pc-board-open { margin-left: auto; padding: 1px 8px; border-radius: 999px; background: var(--dy-accent-text); color: var(--dy-surface); font-size: 10px; font-weight: 750; letter-spacing: .03em; }
.dy-pc-scope .dy-pc-board-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dy-text); font-size: 13px; }
.dy-pc-scope .dy-pc-board-count { color: var(--dy-text-3); font-size: 11px; }
.dy-pc-scope .dy-pc-theme-toggle { display: flex; gap: 2px; border: 1px solid var(--dy-border); border-radius: 8px; padding: 2px; }
.dy-pc-scope .dy-pc-theme-toggle .dockyard-button { min-width: 29px; padding: 5px; }
.dy-pc-scope .dy-pc-board-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.dy-pc-scope .dy-pc-board-row { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 8px 9px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); text-align: left; cursor: pointer; }
.dy-pc-scope .dy-pc-board-row:hover { border-color: var(--dy-accent-border); }
/* The open board is unmistakable: accent fill, 2px accent edge and an "Open" tag. */
.dy-pc-scope .dy-pc-board-row.active { border-color: var(--dy-accent-text); background: var(--dy-accent-soft); box-shadow: inset 3px 0 0 var(--dy-accent-text); cursor: default; }
.dy-pc-scope .dy-pc-board-row.active strong { color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-board-row:disabled { cursor: wait; opacity: .65; }
.dy-pc-scope .dy-pc-board-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 99px; background: var(--dy-success); }
.dy-pc-scope .dy-pc-board-dot[data-status="submitted"] { background: var(--dy-warning); }
.dy-pc-scope .dy-pc-board-dot[data-status="completed"], .dy-pc-scope .dy-pc-board-dot[data-status="archived"] { background: var(--dy-text-3); }
.dy-pc-scope .dy-pc-board-row-copy { display: grid; min-width: 0; gap: 2px; }
.dy-pc-scope .dy-pc-board-row-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; }
.dy-pc-scope .dy-pc-board-row-copy small { color: var(--dy-text-3); font-size: 10px; }
.dy-pc-scope .dy-pc-board-warning { margin-left: auto; color: var(--dy-warning); font-weight: 800; }
.dy-pc-scope .dy-pc-board-item { display: flex; align-items: stretch; gap: 4px; min-width: 0; }
.dy-pc-scope .dy-pc-board-item .dy-pc-board-row { flex: 1 1 auto; }
.dy-pc-scope .dy-pc-board-item .dockyard-button { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; padding: 5px; }
.dy-pc-scope .dy-pc-board-item .dockyard-button svg, .dy-pc-scope .dy-pc-board-bar .dockyard-button svg { width: 14px; height: 14px; }
.dy-pc-scope .dy-pc-board-form { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dy-pc-scope .dy-pc-board-form .dockyard-button { display: inline-flex; align-items: center; gap: 5px; }
.dy-pc-scope .dy-pc-board-form .dockyard-button svg { width: 13px; height: 13px; }
.dy-pc-scope .dy-pc-board-form input { flex: 1 1 180px; min-width: 0; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-board-status { display: inline-flex; align-items: center; gap: 6px; }
.dy-pc-scope .dy-pc-board-status select { padding: 5px 8px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 11.5px; }
.dy-pc-scope .dy-pc-board-archived { grid-column: 1 / -1; color: var(--dy-text-3); font-size: 11px; }

.dy-pc-scope .dy-pc { position: relative; display: flex; flex-direction: column; min-height: 0; margin-top: 14px; overflow: hidden; border: 2px solid var(--dy-pc-frame); border-radius: 14px; background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 0 0 4px var(--dy-pc-frame-halo), 0 18px 48px var(--dy-pc-glow); }
.dy-pc-scope .dy-pc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-pc-scope .dy-pc-seg { display: flex; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 8px; }
.dy-pc-scope .dy-pc-seg button { padding: 6px 11px; border: 0; border-radius: 0; background: transparent; color: var(--dy-text-2); font-size: 11.5px; font-weight: 600; cursor: pointer; }
.dy-pc-scope .dy-pc-seg button.on { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-sep { width: 1px; height: 18px; margin: 0 4px; background: var(--dy-border); }
.dy-pc-scope .dy-pc-add { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 3px 8px; border: 1px dashed var(--dy-control-border); border-radius: 8px; }
.dy-pc-scope .dy-pc-add input { min-width: 190px; max-width: 320px; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-add select { padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-spacer { flex: 1 1 auto; }
/* D17: grouped toolbar (Edit / Add / View / AI / Save) of icon buttons. Each
   group carries a small caption; each button a tooltip (name + one line). */
/* Stage 3 ribbon (owner 30/09): one title strip spans the whole toolbar with
   the group names; each group's tools sit directly beneath its name, groups
   split by thin dividers, Save pinned right. Groups grow to fill their row,
   so the strip stays continuous when groups wrap onto a second row. */
.dy-pc-scope .dy-pc-toolbar.dy-pc-ribbon { gap: 0; padding: 0; align-items: stretch; }
.dy-pc-scope .dy-pc-group { display: flex; flex: 1 0 auto; flex-direction: column; min-width: 0; border-left: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-ribbon > .dy-pc-group:first-child { border-left: 0; }
.dy-pc-scope .dy-pc-group-label { display: block; height: 22px; padding: 0 10px; border-bottom: 1px solid var(--dy-border); background: var(--dy-pc-ribbon-band); color: var(--dy-text-2); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; line-height: 22px; text-align: center; text-transform: uppercase; white-space: nowrap; }
.dy-pc-scope .dy-pc-group-tools { display: flex; flex: 1 1 auto; align-items: center; justify-content: center; gap: 3px; padding: 6px 8px; }
.dy-pc-scope .dy-pc-ribbon-fill { flex: 1 1 0; min-width: 0; background: linear-gradient(var(--dy-pc-ribbon-band) 0 22px, var(--dy-border) 22px 23px, transparent 23px); }
/* Declared on .dy-pc, where the canvas theme tokens live, so a dark board in
   a light app gets a dark band (Quan Stage 3 review, H1). */
.dy-pc-scope .dy-pc { --dy-pc-ribbon-band: color-mix(in srgb, var(--dy-surface-subtle) 55%, var(--dy-border)); }
.dy-pc-scope .dy-pc-tool { position: relative; display: inline-flex; }
.dy-pc-scope .dy-pc-tool .dockyard-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 30px; min-height: 30px; padding: 5px 7px; }
.dy-pc-scope .dy-pc-tool .dockyard-button svg { width: 15px; height: 15px; flex: 0 0 auto; }
.dy-pc-scope .dy-pc-tip { position: absolute; top: calc(100% + 7px); left: 50%; z-index: 60; display: grid; gap: 2px; width: max-content; max-width: 220px; padding: 7px 9px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); box-shadow: var(--dy-shadow); color: var(--dy-text); font-size: 11px; line-height: 1.35; text-align: left; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-2px); transition: opacity .12s ease, transform .12s ease; }
.dy-pc-scope .dy-pc-tip strong { font-size: 11.5px; font-weight: 650; }
.dy-pc-scope .dy-pc-tip span { color: var(--dy-text-2); }
.dy-pc-scope .dy-pc-tool:hover .dy-pc-tip, .dy-pc-scope .dy-pc-tool:focus-within .dy-pc-tip { opacity: 1; transform: translateX(-50%) translateY(0); }
/* Tips at the frame edges anchor to that edge so the frame does not cut
   them off (Quan Stage 3 review, M1/L3). */
.dy-pc-scope .dy-pc-group[data-pc-group="save"] .dy-pc-tip, .dy-pc-scope .dy-pc-group[data-pc-group="save"] .dy-pc-tool:is(:hover, :focus-within) .dy-pc-tip { left: auto; right: 0; transform: none; }
.dy-pc-scope .dy-pc-group[data-pc-group="edit"] .dy-pc-tip, .dy-pc-scope .dy-pc-group[data-pc-group="edit"] .dy-pc-tool:is(:hover, :focus-within) .dy-pc-tip { left: 0; transform: none; }
/* The add menu opens leftwards from its button above phone width (M2). */
.dy-pc-scope .dy-pc-addmenu { position: absolute; top: calc(100% + 6px); left: auto; right: 0; z-index: 55; display: grid; gap: 2px; min-width: 190px; padding: 5px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); box-shadow: var(--dy-shadow); }
.dy-pc-scope .dy-pc-addmenu[hidden] { display: none; }
.dy-pc-scope .dy-pc-addmenu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--dy-text); font-size: 12px; text-align: left; cursor: pointer; }
.dy-pc-scope .dy-pc-addmenu button:hover, .dy-pc-scope .dy-pc-addmenu button:focus-visible { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-addmenu button svg { width: 14px; height: 14px; }
.dy-pc-scope .dy-pc-addmenu .swatch { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--dy-pc-card-edge); }
/* Connector editor bar: the explicit fallback for a real meaning, beside the
   toolbar so it is reachable without a gesture. */
.dy-pc-scope .dy-pc-linkbar { display: flex; flex-wrap: wrap; align-items: end; gap: 9px; padding: 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dy-pc-scope .dy-pc-linkbar label { display: grid; gap: 5px; color: var(--dy-text-2); font-size: 10px; font-weight: 730; }
.dy-pc-scope .dy-pc-linkbar select { min-width: 150px; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-edge-label { fill: var(--dy-text-3); font: 600 9.5px system-ui, sans-serif; letter-spacing: .02em; pointer-events: none; }
.dy-pc-scope .dy-pc-readout { color: var(--dy-text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
/* Stage + world. The world is the scrollable/zoomable plane objects live on. */
.dy-pc-scope .dy-pc-stage { position: relative; flex: 1 1 auto; min-height: 460px; height: 58vh; overflow: hidden; background-color: var(--dy-pc-stage-bg); background-image: radial-gradient(ellipse at 50% 0%, var(--dy-pc-glow), transparent 62%), linear-gradient(var(--dy-pc-grid) 1px, transparent 1px), linear-gradient(90deg, var(--dy-pc-grid) 1px, transparent 1px); background-size: 100% 100%, 28px 28px, 28px 28px; }
.dy-pc-scope .dy-pc-stage { cursor: grab; overscroll-behavior: contain; touch-action: none; }
.dy-pc-scope .dy-pc-stage[data-pc-panning="true"] { cursor: grabbing; }
.dy-pc-scope .dy-pc-stage[data-pc-panning="true"] .dy-pc-world { user-select: none; }
.dy-pc-scope .dy-pc-stage[data-pc-mode="connect"] { cursor: crosshair; }
.dy-pc-scope .dy-pc-world { position: absolute; left: 0; top: 0; width: 2000px; height: 1400px; transform-origin: 0 0; }
.dy-pc-scope .dy-pc-svg { position: absolute; left: 0; top: 0; width: 2000px; height: 1400px; overflow: visible; pointer-events: none; z-index: 1; }
.dy-pc-scope .dy-pc-svg line { stroke: var(--dy-edge-plan-depends_on); stroke-width: 2; opacity: .9; }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="supports"] { stroke: var(--dy-edge-plan-supports); }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="contradicts"] { stroke: var(--dy-edge-plan-contradicts); }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="derived_from"] { stroke: var(--dy-edge-plan-derived_from); }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="clarifies"] { stroke: var(--dy-edge-plan-clarifies); }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="implements"] { stroke: var(--dy-edge-plan-implements); }
.dy-pc-scope .dy-pc-svg line[data-canvas-meaning="raises_question"] { stroke: var(--dy-edge-plan-raises_question); }
.dy-pc-scope .dy-pc-svg line[data-pc-pending="true"] { stroke-dasharray: 6 5; opacity: .75; }
.dy-pc-scope .dy-pc-svg line.dy-pc-leader { stroke: var(--dy-text-3); stroke-width: 1; stroke-dasharray: 3 3; opacity: .55; }
.dy-pc-scope .dy-pc-svg .dy-pc-edge-chip { fill: var(--dy-pc-surface); stroke: var(--dy-border); stroke-width: 1; opacity: .96; }
.dy-pc-scope .dy-pc-svg .dy-pc-arrowhead { fill: var(--dy-text-3); }
.dy-pc-scope .dy-pc-svg circle { fill: var(--dy-surface); }
/* Objects: one real kind each, kind carried by an edge stripe (v6's cue). */
/* The inline width/height set from the stored rect are authoritative (no
   min/max clamp), so connector anchors always sit on the drawn card edge. */
.dy-pc-scope .dy-pc-obj { position: absolute; z-index: 2; padding: 11px 13px; border: 1px solid var(--dy-pc-card-edge); border-left: 4px solid var(--dy-pc-kind-note); border-radius: 10px; background: var(--dy-pc-fill-note); box-shadow: var(--dy-shadow); color: var(--dy-pc-ink); text-align: left; cursor: grab; user-select: none; touch-action: none; overflow: hidden; }
/* B9: the stored rect drives the rendered box — the inline height style set by
   canvas.js is authoritative (attr() is not reliably parsed with units here),
   so connector anchors and de-overlap match what was persisted. */
.dy-pc-scope .dy-pc-obj .dy-pc-obj-kind-icon { position: absolute; top: 9px; right: 10px; color: var(--dy-pc-ink-2); display: inline-flex; pointer-events: none; }
.dy-pc-scope .dy-pc-obj .dy-pc-obj-kind-icon svg { width: 13px; height: 13px; }
.dy-pc-scope .dy-pc-obj.marquee-selected { box-shadow: 0 0 0 2px var(--dy-accent-soft), 0 0 0 1px var(--dy-accent-border), var(--dy-shadow); }
.dy-pc-scope .dy-pc-marquee { position: absolute; z-index: 5; border: 1px dashed var(--dy-accent-border); background: var(--dy-accent-soft); pointer-events: none; }
.dy-pc-scope .dy-pc-chat input[data-canvas-chat-input] { flex: 1 1 auto; min-width: 0; }
.dy-pc-scope .dy-pc-obj:active { cursor: grabbing; }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="evidence"] { border-left-color: var(--dy-pc-kind-evidence); background: var(--dy-pc-fill-evidence); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="claim"] { border-left-color: var(--dy-pc-kind-claim); background: var(--dy-pc-fill-claim); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="question"] { border-left-color: var(--dy-pc-kind-question); background: var(--dy-pc-fill-question); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="decision"] { border-left-color: var(--dy-pc-kind-decision); background: var(--dy-pc-fill-decision); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="plan_block"] { border-left-color: var(--dy-pc-kind-plan_block); background: var(--dy-pc-fill-plan_block); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="note"] { border-left-color: var(--dy-pc-kind-note); background: var(--dy-pc-fill-note); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="link"] { border-left-color: var(--dy-pc-kind-link); background: var(--dy-pc-fill-link); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="media"] { border-left-color: var(--dy-pc-kind-media); background: var(--dy-pc-fill-media); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="yellow"] { background: var(--dy-pc-sticker-yellow); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="green"] { background: var(--dy-pc-sticker-green); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="blue"] { background: var(--dy-pc-sticker-blue); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="pink"] { background: var(--dy-pc-sticker-pink); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="purple"] { background: var(--dy-pc-sticker-purple); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="orange"] { background: var(--dy-pc-sticker-orange); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="coral"] { background: var(--dy-pc-sticker-coral); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="teal"] { background: var(--dy-pc-sticker-teal); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="lime"] { background: var(--dy-pc-sticker-lime); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="clay"] { background: var(--dy-pc-sticker-clay); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="slate"] { background: var(--dy-pc-sticker-slate); }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="indigo"] { background: var(--dy-pc-sticker-indigo); }
/* Colour picker: one dot per choice, ringed when picked. */
.dy-pc-scope .dy-pc-colours-field { display: grid; gap: 6px; }
.dy-pc-scope .dy-pc-colours { display: flex; flex-wrap: wrap; gap: 6px; }
.dy-pc-scope .dy-pc-colour { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 2px solid transparent; border-radius: 50%; background: transparent; cursor: pointer; }
.dy-pc-scope .dy-pc-colour:hover:not(:disabled) { border-color: var(--dy-control-border); }
.dy-pc-scope .dy-pc-colour[aria-pressed="true"] { border-color: var(--dy-focus); }
.dy-pc-scope .dy-pc-colour:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dy-pc-scope .dy-pc-colour:disabled { cursor: not-allowed; opacity: .6; }
.dy-pc-scope .dy-pc-colour-dot { width: 20px; height: 20px; border: 1px solid var(--dy-control-border); border-radius: 50%; }
.dy-pc-scope .dy-pc-colour-dot.default { background-image: linear-gradient(135deg, transparent 45%, var(--dy-control-border) 45% 55%, transparent 55%) !important; }
/* Full screen (owner 01/10): the frame takes the window; the stage grows. */
.dy-pc-scope .dy-pc.dy-pc-full { position: fixed; inset: 8px; z-index: 900; margin: 0; }
.dy-pc-scope .dy-pc.dy-pc-full .dy-pc-stage { flex: 1 1 auto; height: auto; min-height: 0; }
.dy-pc-scope[data-canvas-fullscreen-active="true"] > :not(.dy-pc) { visibility: hidden; }
/* Connect mode: stickers are click targets, the board does not drag. */
.dy-pc-scope .dy-pc-stage[data-pc-mode="connect"] .dy-pc-obj { cursor: pointer; }
.dy-pc-scope .dy-pc-svg line[data-canvas-connect-preview] { stroke: var(--dy-focus); stroke-width: 2; }
.dy-pc-scope .dy-pc-obj:hover { box-shadow: 0 0 0 1px var(--dy-accent-border), var(--dy-shadow); }
.dy-pc-scope .dy-pc-obj.selected { box-shadow: 0 0 0 2px var(--dy-focus), 0 0 18px var(--dy-pc-glow), var(--dy-shadow); }
.dy-pc-scope .dy-pc-obj:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dy-pc-scope .dy-pc-obj small { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--dy-pc-ink-2); }
.dy-pc-scope .dy-pc-obj strong { display: block; margin-top: 5px; font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--dy-pc-ink); }
.dy-pc-scope .dy-pc-obj-sub { display: block; margin-top: 4px; color: var(--dy-pc-ink-2); font-size: 10.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dy-pc-scope .dy-pc-obj-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px; color: var(--dy-pc-ink-2); font-size: 11px; line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }
.dy-pc-scope .dy-pc-obj-thumb { display: block; margin-top: 6px; height: 110px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,.08); }
.dy-pc-scope .dy-pc-obj-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.dy-pc-scope .dy-pc-img-note { display: grid; place-items: center; height: 100%; min-height: 40px; color: var(--dy-pc-ink-2); font-size: 11px; }
.dy-pc-scope .dy-pc-drawer-b textarea { width: 100%; min-width: 0; resize: vertical; padding: 9px 10px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12.5px; line-height: 1.45; }
.dy-pc-scope .dy-pc-fieldset { display: grid; gap: 6px; margin: 0; padding: 10px; border: 1px solid var(--dy-border); border-radius: 8px; min-width: 0; }
.dy-pc-scope .dy-pc-fieldset legend, .dy-pc-scope .dy-pc-field-label { padding: 0 4px; color: var(--dy-text-2); font-size: 10px; font-weight: 730; }
.dy-pc-scope .dy-pc-row { display: flex; gap: 6px; align-items: center; min-width: 0; }
.dy-pc-scope .dy-pc-row input:not([type="checkbox"]) { flex: 1 1 0; min-width: 0; padding: 7px 8px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-drawer-b .dy-pc-row input[type="checkbox"] { flex: 0 0 auto; width: 16px; height: 16px; margin: 0 2px; padding: 0; }
.dy-pc-scope .dy-pc-row input[aria-invalid="true"] { border-color: var(--dy-danger, #c0392b); }
.dy-pc-scope .dy-pc-open { display: inline-flex; color: var(--dy-accent, inherit); }
.dy-pc-scope .dy-pc-open svg { width: 14px; height: 14px; }
.dy-pc-scope .dy-pc-drawer-thumb { display: block; max-height: 220px; border-radius: 8px; overflow: hidden; }
.dy-pc-scope .dy-pc-drawer-thumb img { display: block; width: 100%; max-height: 220px; object-fit: contain; background: rgba(0,0,0,.06); }
.dy-pc-scope .dy-pc-upload { cursor: pointer; }
.dy-pc-scope .dy-pc-upload input[type="file"] { font-size: 11.5px; }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="risk"] { border-left-color: var(--dy-pc-kind-risk); background: var(--dy-pc-fill-risk); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="assumption"] { border-left-color: var(--dy-pc-kind-assumption); background: var(--dy-pc-fill-assumption); }
.dy-pc-scope .dy-rt { display: grid; gap: 6px; min-width: 0; }
.dy-pc-scope .dy-rt-bar { display: grid; gap: 4px; padding: 5px; border: 1px solid var(--dy-border); border-bottom: 0; border-radius: 8px 8px 0 0; background: var(--dy-surface-2, var(--dy-surface)); }
.dy-pc-scope .dy-rt-row { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; min-width: 0; }
.dy-pc-scope .dy-rt-row-sel { flex-wrap: nowrap; gap: 4px; }
.dy-pc-scope .dy-rt-row-sel .dy-rt-select { flex: 1 1 0; min-width: 120px; }
/* Owner 01/10: room for the text - no fixed height, so letters are never clipped. */
.dy-pc-scope .dy-rt-select { box-sizing: border-box; height: auto; min-height: 34px; min-width: 120px; line-height: 1.4; padding: 6px 28px 6px 9px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 11.5px; }
.dy-pc-scope .dy-rt-btn { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--dy-text); cursor: pointer; }
.dy-pc-scope .dy-rt-btn:hover:not(:disabled) { background: var(--dy-hover, rgba(127,127,127,.14)); }
.dy-pc-scope .dy-rt-btn.on { border-color: var(--dy-accent, #5b8def); background: color-mix(in srgb, var(--dy-accent, #5b8def) 18%, transparent); }
.dy-pc-scope .dy-rt-btn:focus-visible, .dy-pc-scope .dy-rt-select:focus-visible { outline: 2px solid var(--dy-accent, #5b8def); outline-offset: 1px; }
.dy-pc-scope .dy-rt-btn svg { width: 15px; height: 15px; }
.dy-pc-scope .dy-rt-face { font-size: 13px; line-height: 1; }
.dy-pc-scope .dy-rt-face-bold { font-weight: 800; }
.dy-pc-scope .dy-rt-face-italic { font-style: italic; font-family: Georgia, serif; }
.dy-pc-scope .dy-rt-face-underline { text-decoration: underline; }
.dy-pc-scope .dy-rt-face-strike { text-decoration: line-through; }
.dy-pc-scope .dy-rt-sep { width: 1px; height: 18px; margin: 0 3px; background: var(--dy-border); }
.dy-pc-scope .dy-rt-host .dy-rt-body { min-height: 110px; max-height: 320px; overflow: auto; padding: 9px 11px; border: 1px solid var(--dy-control-border); border-radius: 0 0 8px 8px; background: var(--dy-surface); color: var(--dy-text); font-size: 12.5px; line-height: 1.5; outline: none; overflow-wrap: anywhere; }
.dy-pc-scope .dy-rt-host.readonly .dy-rt-body { border-radius: 8px; }
.dy-pc-scope .dy-rt-body:empty::before { content: ''; }
.dy-pc-scope .dy-rt-host .dy-rt-body:focus { border-color: var(--dy-accent, #5b8def); }
.dy-pc-scope .dy-rt-body p { margin: 0 0 4px; }
.dy-pc-scope .dy-rt-body > :first-child { margin-top: 0; }
.dy-pc-scope .dy-rt-body > :last-child { margin-bottom: 0; }
.dy-pc-scope .dy-rt-body h1 { margin: 4px 0 6px; font-size: 19px; line-height: 1.25; }
.dy-pc-scope .dy-rt-body h2 { margin: 4px 0 6px; font-size: 16px; line-height: 1.3; }
.dy-pc-scope .dy-rt-body h3 { margin: 4px 0 6px; font-size: 14px; line-height: 1.3; }
.dy-pc-scope .dy-rt-body ul, .dy-pc-scope .dy-rt-body ol { margin: 0 0 6px; padding-left: 22px; }
.dy-pc-scope .dy-rt-body ul { list-style: disc; }
.dy-pc-scope .dy-rt-body ol { list-style: decimal; }
.dy-pc-scope .dy-rt-body li p { margin: 0; }
.dy-pc-scope .dy-rt-problem { margin: 0; padding: 6px 9px; border-radius: 6px; background: var(--dy-danger-bg); color: var(--dy-pc-danger-text); font-size: 12px; }
.dy-pc-scope .dy-rt-btn:disabled { opacity: .45; cursor: not-allowed; }
.dy-pc-scope .dy-rt-small { font-size: .82em; }
.dy-pc-scope .dy-rt-large { font-size: 1.3em; }
.dy-pc-scope .dy-rt-huge { font-size: 1.7em; line-height: 1.2; }
.dy-pc-scope .dy-pc-obj-meta { display: block; margin-top: 6px; color: var(--dy-pc-ink-2); font-size: 10px; }
.dy-pc-scope .dy-pc-empty { position: absolute; left: 18px; top: 16px; margin: 0; color: var(--dy-text-3); font-size: 12px; }
/* Frames are decorative group labels (v6's .pframe) — never controls. */
.dy-pc-scope .dy-pc-frame { position: absolute; z-index: 0; border: 1px dashed var(--dy-border); border-radius: 10px; background: var(--dy-accent-soft); padding: 12px 14px; color: var(--dy-text-3); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
/* Assistant (curation) panel: docked, collapsible, bottom-right. */
.dy-pc-scope .dy-pc-chat { position: absolute; right: 14px; bottom: 14px; z-index: 35; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-pc-surface); box-shadow: 0 14px 44px rgba(0, 0, 0, .28); }
.dy-pc-scope .dy-pc-chat.closed { width: 268px; }
.dy-pc-scope .dy-pc-chat.open { width: 360px; max-height: min(460px, calc(100% - 28px)); }
.dy-pc-scope .dy-pc-chat.pill { width: auto; max-width: calc(100% - 28px); border-radius: 999px; }
.dy-pc-scope .dy-pc-chat.pill .dy-pc-chat-b, .dy-pc-scope .dy-pc-chat.pill .dy-pc-chat-f, .dy-pc-scope .dy-pc-chat.pill .dy-pc-chat-model { display: none; }
.dy-pc-scope .dy-pc-chat.dragging { transition: none; box-shadow: 0 22px 60px rgba(0, 0, 0, .36); }
.dy-pc-scope .dy-pc-chat.behind-drawer { display: none; }
.dy-pc-scope .dy-pc-chat-bar { display: flex; align-items: center; gap: 2px; padding-right: 6px; }
.dy-pc-scope .dy-pc-chat-bar .dockyard-button { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; min-height: 26px; padding: 4px; }
.dy-pc-scope .dy-pc-chat-bar .dockyard-button svg { width: 13px; height: 13px; }
.dy-pc-scope .dy-pc-chat-grip { display: inline-flex; align-items: center; padding: 0 2px 0 9px; color: var(--dy-text-3); cursor: grab; touch-action: none; }
.dy-pc-scope .dy-pc-chat-grip svg { width: 14px; height: 14px; }
.dy-pc-scope .dy-pc-chat-model { display: flex; align-items: center; gap: 6px; padding: 6px 13px; border-bottom: 1px solid var(--dy-border); color: var(--dy-text-2); font-size: 10.5px; }
.dy-pc-scope .dy-pc-chat-model select { flex: 1 1 auto; min-width: 0; padding: 4px 6px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 11px; }
/* Closed = header bar only; the body, composer and model picker return on open. */
.dy-pc-scope .dy-pc-chat.closed .dy-pc-chat-model, .dy-pc-scope .dy-pc-chat.closed .dy-pc-chat-b, .dy-pc-scope .dy-pc-chat.closed .dy-pc-chat-f { display: none; }
.dy-pc-scope .dy-pc-overlay { position: absolute; inset: 0; z-index: 40; display: grid; place-items: center; padding: 18px; background: var(--dy-pc-backdrop); }
.dy-pc-scope .dy-pc-overlay-card { display: flex; flex-direction: column; width: min(820px, 100%); max-height: 100%; min-height: 0; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); box-shadow: 0 24px 70px rgba(0, 0, 0, .38); color: var(--dy-text); }
.dy-pc-scope .dy-pc-overlay-card.chat { width: min(900px, 100%); height: 100%; }
.dy-pc-scope .dy-pc-overlay-h { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-overlay-h strong { flex: 1 1 auto; font-size: 14px; }
/* Icons in the overlay are always icon-sized: an unsized svg fills its box. */
.dy-pc-scope .dy-pc-overlay svg { width: 16px; height: 16px; flex: 0 0 auto; }
.dy-pc-scope .dy-pc-overlay-av { display: grid; place-items: center; flex: 0 0 auto; width: 30px; height: 30px; border-radius: 8px; background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-overlay-av.warn { background: var(--dy-surface-subtle); color: var(--dy-warning); }
.dy-pc-scope .dy-pc-overlay-title { display: grid; flex: 1 1 auto; min-width: 0; gap: 1px; }
.dy-pc-scope .dy-pc-overlay-title span { overflow: hidden; color: var(--dy-text-3); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.dy-pc-scope .dy-pc-overlay-h .dockyard-button { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; padding: 5px; }
.dy-pc-scope .dy-pc-overlay-model { border-bottom: 1px solid var(--dy-border); padding: 8px 16px; }
.dy-pc-scope .dy-pc-overlay-b { display: grid; flex: 1 1 auto; min-height: 0; gap: 12px; align-content: start; overflow: auto; padding: 16px 20px; font-size: 13.5px; }
/* Large view = the same conversation at reading size. */
.dy-pc-scope .dy-pc-overlay-card.chat .dy-pc-msg { max-width: 78%; padding: 11px 14px; font-size: 14px; line-height: 1.6; }
.dy-pc-scope .dy-pc-overlay-card.chat .dy-pc-proposal { padding: 12px 14px; }
.dy-pc-scope .dy-pc-overlay-card.chat .dy-pc-proposal strong { font-size: 13.5px; }
.dy-pc-scope .dy-pc-overlay-card.chat .dy-pc-proposal small { font-size: 12px; }
.dy-pc-scope .dy-pc-overlay-composer { display: grid; gap: 8px; }
.dy-pc-scope .dy-pc-overlay-composer textarea { width: 100%; min-height: 72px; padding: 10px 12px; border: 1px solid var(--dy-control-border); border-radius: 9px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; box-sizing: border-box; }
.dy-pc-scope .dy-pc-overlay-actions { display: flex; justify-content: flex-end; gap: 7px; }
.dy-pc-scope .dy-pc-overlay-actions .dockyard-button, .dy-pc-scope .dy-pc-overlay-f .dockyard-button { display: inline-flex; align-items: center; gap: 5px; }
.dy-pc-scope .dy-pc-overlay-f .dockyard-button svg { width: 13px; height: 13px; }
/* Unsaved-changes prompt: small, centred, above everything on the canvas. */
.dy-pc-scope .dy-pc-leave { z-index: 60; }
.dy-pc-scope .dy-pc-leave-card { width: min(440px, 100%); height: auto; }
.dy-pc-scope .dy-pc-leave-body { margin: 0; padding: 14px 16px 4px; color: var(--dy-text); font-size: 13px; line-height: 1.5; }
.dy-pc-scope .dy-pc-overlay-b ol { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.dy-pc-scope .dy-pc-overlay-b li { display: flex; align-items: center; gap: 7px; }
.dy-pc-scope .dy-pc-overlay-b li > span { flex: 0 0 22px; color: var(--dy-text-3); font-variant-numeric: tabular-nums; text-align: right; }
.dy-pc-scope .dy-pc-overlay-b li input { flex: 1 1 auto; min-width: 0; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12.5px; }
.dy-pc-scope .dy-pc-overlay-b li .dockyard-button { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; padding: 5px; }
.dy-pc-scope .dy-pc-overlay-b li .dockyard-button svg { width: 13px; height: 13px; }
.dy-pc-scope .dy-pc-overlay-f { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; padding: 11px 16px; border-top: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-chat-h { display: flex; align-items: center; gap: 9px; width: 100%; padding: 10px 13px; border: 0; background: transparent; color: var(--dy-text); text-align: left; cursor: pointer; }
.dy-pc-scope .dy-pc-chat.open .dy-pc-chat-h { border-bottom: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-chat-h .av { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; background: var(--dy-accent-soft); color: var(--dy-accent-text); font-size: 10px; font-weight: 700; }
.dy-pc-scope .dy-pc-chat-h strong { font-size: 12px; font-weight: 600; }
.dy-pc-scope .dy-pc-chat-h .sub { display: block; color: var(--dy-text-3); font-size: 10.5px; }
.dy-pc-scope .dy-pc-chat-h .tog { margin-left: auto; color: var(--dy-text-3); font-size: 11px; }
.dy-pc-scope .dy-pc-chat-b { flex: 1 1 auto; display: grid; gap: 8px; align-content: start; overflow: auto; padding: 11px 13px; }
.dy-pc-scope .dy-pc-msg { max-width: 92%; padding: 8px 11px; border-radius: 9px; font-size: 11.5px; line-height: 1.45; }
.dy-pc-scope .dy-pc-msg.bot { justify-self: start; border: 1px solid var(--dy-border); border-bottom-left-radius: 3px; background: var(--dy-surface-subtle); color: var(--dy-text); }
.dy-pc-scope .dy-pc-msg.me { justify-self: end; border-bottom-right-radius: 3px; background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-chat-f { display: flex; flex-wrap: wrap; gap: 6px; padding: 9px; border-top: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-chat-f textarea { flex: 1 1 100%; min-height: 54px; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; resize: vertical; }
.dy-pc-scope .dy-pc-chat-f .dockyard-button { flex: 0 0 auto; }
.dy-pc-scope .dy-pc-chat-f input { padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-chat-f .dy-pc-readout { flex: 1 1 100%; }
/* Proposals: scratch + suggested only. Nothing on this surface auto-applies. */
.dy-pc-scope .dy-pc-proposal { display: grid; gap: 6px; padding: 9px 10px; border: 1px dashed var(--dy-accent-border); border-radius: 9px; background: var(--dy-accent-soft); }
.dy-pc-scope .dy-pc-proposal strong { font-size: 12px; }
.dy-pc-scope .dy-pc-proposal small { color: var(--dy-text-2); font-size: 10.5px; }
.dy-pc-scope .dy-pc-proposal .dockyard-form-actions { margin: 0; }
.dy-pc-scope .dy-pc-proposal[data-pc-proposal-status="approved"] { border-style: solid; border-color: var(--dy-success); }
.dy-pc-scope .dy-pc-proposal[data-pc-proposal-status="rejected"] { border-style: solid; border-color: var(--dy-border); background: var(--dy-surface-subtle); }
/* Drawer: the selection editor (replaces a permanently-docked inspector). */
.dy-pc-scope .dy-pc-drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 30; display: flex; flex-direction: column; width: min(420px, 100%); max-width: 100%; box-sizing: border-box; border-left: 1px solid var(--dy-border); background: var(--dy-surface); transform: translateX(100%); transition: transform .18s ease; }
/* Closed = off-canvas AND inert: it must not catch clicks meant for cards at
   the stage edge, nor let Tab reach its hidden fields. visibility waits for
   the slide-out to finish. */
.dy-pc-scope .dy-pc-drawer:not(.open) { visibility: hidden; pointer-events: none; transition: transform .18s ease, visibility 0s linear .18s; }
.dy-pc-scope .dy-pc-drawer.open { transform: none; visibility: visible; }
.dy-pc-scope .dy-pc-drawer-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--dy-border); }
.dy-pc-scope .dy-pc-drawer-h strong { font-size: 13px; font-weight: 600; }
.dy-pc-scope .dy-pc-drawer-b { flex: 1 1 auto; display: grid; gap: 11px; align-content: start; overflow: auto; padding: 14px; }
.dy-pc-scope .dy-pc-drawer-b label { display: grid; gap: 6px; color: var(--dy-text-2); font-size: 10px; font-weight: 730; }
.dy-pc-scope .dy-pc-drawer-b input, .dy-pc-scope .dy-pc-drawer-b select { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12.5px; }
.dy-pc-scope .dy-pc-drawer-meta { margin: 0; color: var(--dy-text-3); font-size: 11px; }
.dy-pc-scope .dy-pc-backdrop { position: absolute; inset: 0; z-index: 25; background: var(--dy-pc-backdrop); opacity: 0; pointer-events: none; transition: opacity .18s ease; }
.dy-pc-scope .dy-pc-backdrop.open { opacity: 1; pointer-events: auto; }
.dy-pc-scope .dy-pc-notice { margin: 0; padding: 8px 12px; border-top: 1px solid var(--dy-border); background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 12px; }
.dy-pc-scope .dy-pc-notice[data-pc-tone="danger"] { background: var(--dy-danger-bg); color: var(--dy-pc-danger-text); }
@media (max-width: 1100px) {
  .dy-pc-scope .dy-pc-chat.open { width: 320px; }
}
/* Narrow screens: the add row wraps and the draft input may shrink, so the
   Add object button stays on screen (was clipped at 390px). */
@media (max-width: 640px) {
  .dy-pc-scope .dy-pc-add { flex-wrap: wrap; flex: 1 1 100%; }
  .dy-pc-scope .dy-pc-add input { min-width: 0; flex: 1 1 140px; }
  /* Phone: groups wrap onto rows, each keeps its name strip on top; tools
     wrap and get 40px touch targets. */
  .dy-pc-scope .dy-pc-group { flex: 1 1 auto; border-bottom: 1px solid var(--dy-border); }
  .dy-pc-scope .dy-pc-group[data-pc-group="add"] { flex-basis: 100%; border-left: 0; }
  .dy-pc-scope .dy-pc-group-tools { flex-wrap: wrap; justify-content: flex-start; }
  .dy-pc-scope .dy-pc-tool .dockyard-button { min-width: 40px; min-height: 40px; }
  .dy-pc-scope .dy-pc-add select, .dy-pc-scope .dy-pc-add input { min-height: 40px; }
  /* The draft box takes its own full row so the hint text is not cut off. */
  .dy-pc-scope .dy-pc-add input { flex: 1 1 100%; order: -1; }
  .dy-pc-scope .dy-pc-group-label { text-align: left; }
  .dy-pc-scope .dy-pc-ribbon-fill { display: none; }
  .dy-pc-scope .dy-pc-tip { display: none; }
  .dy-pc-scope .dy-pc-addmenu { left: 0; right: auto; }
  .dy-pc-scope .dy-pc-chat.open { left: 8px; right: 8px; width: auto; }
  .dy-pc-scope .dy-pc-chat.closed { right: 8px; width: min(268px, calc(100% - 16px)); }
  .dy-pc-scope .dy-pc-board-bar { flex-wrap: wrap; }
  .dy-pc-scope .dy-pc-board-list { grid-template-columns: 1fr; }
  .dy-pc-scope .dy-pc-board-moves { flex: 1 1 100%; }
  .dy-pc-scope .dy-pc-overlay { padding: 8px; }
  .dy-pc-scope .dy-pc-overlay-card.chat .dy-pc-msg { max-width: 92%; }
  .dy-pc-scope .dy-pc-linkbar select { min-width: 0; width: 100%; }
  .dy-pc-scope .dy-pc-linkbar label { flex: 1 1 100%; }
  /* Phone full screen (Quan F1): the tool rows would leave the board ~190px.
     The frame scrolls instead and the stage keeps most of the window. */
  .dy-pc-scope .dy-pc.dy-pc-full { overflow-y: auto; }
  .dy-pc-scope .dy-pc.dy-pc-full .dy-pc-stage { flex: 0 0 auto; height: calc(100vh - 96px); min-height: 360px; }
  .dy-pc-scope .dy-rt-btn { width: 44px; height: 44px; }
  .dy-pc-scope .dy-rt-select { min-height: 44px; }
}
`
export default WORKFLOW_CANVAS_CSS
