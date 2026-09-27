// SINGLE HOME for the workflow-canvas stylesheet and its palette.
//
// Why this is a module and not a section of src/style.css: the canvas markup is
// emitted by ./workflow-canvas.ts, and that canvas mounts on TWO surfaces — the
// Dashboard bundle (this directory) and the Desktop plugin (../../../desktop).
// The Desktop runtime loads plugin.js as plain ESM and may only import the SDK
// and siblings sitting beside it, so it cannot read a Dashboard stylesheet at
// runtime. Keeping the rules here makes this the one written source both
// surfaces are fed from: `npm run build` appends this text to dist/style.css
// (Dashboard) and writes desktop/workflow-canvas-css.js (the Desktop sibling).
// A test asserts the generated Desktop sibling is byte-identical, so the two
// published copies can never drift apart.
//
// Scope carrier: every rule is scoped to `.dy-wf-scope` and the canvas mount
// host carries that class itself (see mountWorkflowCanvas). The scope used to
// be `.dy-root` — an ancestor the Desktop surface never rendered, which left
// every `var(--dy-wf-*)` fill unresolvable and painted the whole canvas black.
export const WORKFLOW_CANVAS_CSS = `
/* ---- Workflow canvas: purpose + status token set -------------------------
   Two independent visual dimensions, deliberately kept on separate axes.
   PURPOSE (what a node is)  -> fill, silhouette, symbol, purpose text.
   STATUS  (where a node is) -> outline stroke, status chip, status word.
   Purpose hues are cyan/blue/violet/magenta (182/232/272/314 deg); status hues
   are green/amber/red/grey (128/42/3 deg), so no status colour can collide with
   a purpose colour, and purpose fills read as tinted rather than near-black.
   Measured (WCAG 2.1 relative luminance) on every purpose fill:
   status text >= 5.3:1, status stroke >= 3.7:1, purpose text >= 6.6:1, and
   every fill clears its canvas background by >= 1.63:1 so the tint is visible.
   Single home for the palette: the literals below. */
.dy-wf-scope {
  --dy-wf-purpose-task-fill: #482f5e;   --dy-wf-purpose-task-line: #a862e6;   --dy-wf-purpose-task-text: #ddc1f5;
  --dy-wf-purpose-gate-fill: #0f4345;   --dy-wf-purpose-gate-line: #18dfe6;   --dy-wf-purpose-gate-text: #a5f2f5;
  --dy-wf-purpose-branch-fill: #611f52; --dy-wf-purpose-branch-line: #e632bc; --dy-wf-purpose-branch-text: #f5afe4;
  --dy-wf-purpose-loop-fill: #33395e;   --dy-wf-purpose-loop-line: #6c7ce6;   --dy-wf-purpose-loop-text: #c6ccf5;
  --dy-wf-status-done: #4ade80;    --dy-wf-status-done-text: #5ee08a;
  --dy-wf-status-working: #e3b341; --dy-wf-status-working-text: #f0c04a;
  --dy-wf-status-blocked: #ff7b72; --dy-wf-status-blocked-text: #ff9d97;
  --dy-wf-status-pending: #8b99a8; --dy-wf-status-pending-text: #a9b6c6;
  --dy-edge-dep: #8fa3c8;                   --dy-edge-dep-active: #9cc4ff;
  /* The planning connector meanings (--dy-edge-plan-*) used to sit here as
     reserved tokens-only vocabulary. The planning canvas now DRAWS them, so each
     moved to the carrier that consumes it (.dy-pc-scope, planning section
     below) — declared once instead of twice. */
}
.dy-wf-scope .dy-wf-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
/* The mount root IS the canvas frame: sized, bordered, positioned.
   (.dy-wf-host was removed - no element ever carried it; styles move to .dy-wf) */
.dy-wf-scope .dy-wf,
.dy-wf-scope.dy-wf { position: relative; height: 72vh; border: 1px solid var(--dy-border, #2a2f3a); border-radius: 10px; overflow: hidden; background: var(--dy-bg-deep, #0f1218); }
.dy-wf-scope .dy-wf-wrap { position: relative; width: 100%; height: 100%; }
.dy-wf-scope .dy-wf-svg { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.dy-wf-scope .dy-wf-svg:active { cursor: grabbing; }
/* LOD tiers (archify): map < 75% / read / full > 140% */
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-sub,
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-timer,
.dy-wf-scope .dy-wf-svg[data-lod="map"] .dy-wf-assignee { opacity: 0; }
.dy-wf-scope .dy-wf-svg .dy-wf-sub, .dy-wf-scope .dy-wf-svg .dy-wf-timer,
.dy-wf-scope .dy-wf-svg .dy-wf-assignee { transition: opacity .3s; }
.dy-wf-scope .dy-wf-node { cursor: pointer; outline: none; }
/* Purpose silhouette: the shape is drawn inside the fixed node box, so ports,
   edge endpoints and the layout grid keep their geometry. Fill = PURPOSE. */
.dy-wf-scope .dy-wf-node .dy-wf-shape { stroke-width: 1.5; transition: stroke .5s, fill .3s, stroke-width .2s; }
.dy-wf-scope .dy-wf-node.task .dy-wf-shape { fill: var(--dy-wf-purpose-task-fill); stroke: var(--dy-wf-purpose-task-line); }
.dy-wf-scope .dy-wf-node.gate .dy-wf-shape { fill: var(--dy-wf-purpose-gate-fill); stroke: var(--dy-wf-purpose-gate-line); }
.dy-wf-scope .dy-wf-node.branch .dy-wf-shape { fill: var(--dy-wf-purpose-branch-fill); stroke: var(--dy-wf-purpose-branch-line); }
.dy-wf-scope .dy-wf-node.loop .dy-wf-shape { fill: var(--dy-wf-purpose-loop-fill); stroke: var(--dy-wf-purpose-loop-line); }

/* Purpose cues: symbol + purpose name in the purpose's own text colour. */
.dy-wf-scope .dy-wf-node .dy-wf-glyph { font: 13px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-node.task .dy-wf-glyph { fill: var(--dy-wf-purpose-task-text); }
.dy-wf-scope .dy-wf-node.gate .dy-wf-glyph { fill: var(--dy-wf-purpose-gate-text); }
.dy-wf-scope .dy-wf-node.branch .dy-wf-glyph { fill: var(--dy-wf-purpose-branch-text); }
.dy-wf-scope .dy-wf-node.loop .dy-wf-glyph { fill: var(--dy-wf-purpose-loop-text); }

/* Status cues: outline stroke + chip + status word. Status never re-colours
   the fill, so a status colour cannot collide with a purpose colour. */
.dy-wf-scope .dy-wf-node.done .dy-wf-shape { stroke: var(--dy-wf-status-done); }
.dy-wf-scope .dy-wf-node.working .dy-wf-shape { stroke: var(--dy-wf-status-working); animation: dyPulseNode 1.5s ease-in-out infinite; }
.dy-wf-scope .dy-wf-node.blocked .dy-wf-shape { stroke: var(--dy-wf-status-blocked); }
.dy-wf-scope .dy-wf-node.pending .dy-wf-shape { stroke: var(--dy-wf-status-pending); }
@keyframes dyPulseNode { 0%,100% { stroke-width: 1.5; } 50% { stroke-width: 2.6; } }
.dy-wf-scope .dy-wf-node .dy-wf-statuschip { stroke: none; }
.dy-wf-scope .dy-wf-node .dy-wf-statuschip.done { fill: color-mix(in srgb, var(--dy-wf-status-done) 20%, transparent); }
.dy-wf-scope .dy-wf-node .dy-wf-statuschip.working { fill: color-mix(in srgb, var(--dy-wf-status-working) 20%, transparent); }
.dy-wf-scope .dy-wf-node .dy-wf-statuschip.blocked { fill: color-mix(in srgb, var(--dy-wf-status-blocked) 22%, transparent); }
.dy-wf-scope .dy-wf-node .dy-wf-statuschip.pending { fill: color-mix(in srgb, var(--dy-wf-status-pending) 24%, transparent); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext { font: 600 10.5px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.done { fill: var(--dy-wf-status-done-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.working { fill: var(--dy-wf-status-working-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.blocked { fill: var(--dy-wf-status-blocked-text); }
.dy-wf-scope .dy-wf-node .dy-wf-statustext.pending { fill: var(--dy-wf-status-pending-text); }
.dy-wf-scope .dy-wf-node .dy-wf-port { fill: var(--dy-bg-deep, #0f1218); stroke: var(--dy-wf-purpose-task-line); stroke-width: 2; }
.dy-wf-scope .dy-wf-node.gate .dy-wf-port { stroke: var(--dy-wf-purpose-gate-line); }
.dy-wf-scope .dy-wf-node.branch .dy-wf-port { stroke: var(--dy-wf-purpose-branch-line); }
.dy-wf-scope .dy-wf-node.loop .dy-wf-port { stroke: var(--dy-wf-purpose-loop-line); }
.dy-wf-scope .dy-wf-node.dy-wf-connecting .dy-wf-port { fill: var(--dy-edge-dep-active); }
/* unmistakable selection: accent ring + tint (stronger than hover dash) */
.dy-wf-scope .dy-wf-node.dy-wf-selected .dy-wf-shape {
  stroke: #58a6ff; stroke-width: 3;
  filter: drop-shadow(0 0 6px rgba(88,166,255,.65));
}
@keyframes dySelPulse { 0%,100% { stroke-width: 3; } 50% { stroke-width: 3.8; } }
.dy-wf-scope .dy-wf-svg .dy-wf-node.dy-wf-selected .dy-wf-shape { animation: dySelPulse 1.6s ease-in-out infinite; }
.dy-wf-scope .dy-wf-label { fill: var(--dy-text, #e6edf3); font: 600 13px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-sub { fill: var(--dy-dim, #9aa7b8); font: 11px system-ui, sans-serif; pointer-events: none; }
.dy-wf-scope .dy-wf-node.task .dy-wf-sub { fill: var(--dy-wf-purpose-task-text); }
.dy-wf-scope .dy-wf-node.gate .dy-wf-sub { fill: var(--dy-wf-purpose-gate-text); }
.dy-wf-scope .dy-wf-node.branch .dy-wf-sub { fill: var(--dy-wf-purpose-branch-text); }
.dy-wf-scope .dy-wf-node.loop .dy-wf-sub { fill: var(--dy-wf-purpose-loop-text); }
.dy-wf-scope .dy-wf-timer { fill: var(--dy-wf-status-working-text); font: 11px ui-monospace, monospace; }
.dy-wf-scope .dy-wf-assignee { fill: var(--dy-dim, #9aa7b8); font: 10.5px ui-monospace, monospace; pointer-events: none; }
.dy-wf-scope .dy-wf-edge { stroke: var(--dy-edge-dep); stroke-width: 2; fill: none; transition: stroke .4s; }
.dy-wf-scope .dy-wf-edge.active { stroke: var(--dy-edge-dep-active); }
.dy-wf-scope .dy-wf-arrow { stroke: none; }
/* purpose legend (rendered from the same token tables the nodes use) */
.dy-wf-scope .dy-wf-index { position: absolute; right: 10px; top: 10px; pointer-events: none; }
.dy-wf-scope .dy-wf-index-bg { fill: rgba(15,18,24,.88); stroke: #2a2f3a; }
.dy-wf-scope .dy-wf-index-title { fill: #8b949e; font: 600 9.5px system-ui, sans-serif; letter-spacing: .8px; }
.dy-wf-scope .dy-wf-index-shape { stroke-width: 1.2; }
.dy-wf-scope .dy-wf-index-glyph { font: 11px system-ui, sans-serif; fill: var(--dy-text, #e6edf3); }
.dy-wf-scope .dy-wf-index-label { font: 11px system-ui, sans-serif; fill: var(--dy-dim, #9aa7b8); }
.dy-wf-scope .dy-wf-index-edge { stroke: var(--dy-edge-dep); stroke-width: 2; fill: none; }
.dy-wf-scope .dy-wf-index-edge-label { font: 10px system-ui, sans-serif; fill: var(--dy-dim, #9aa7b8); }
.dy-wf-scope .dy-wf-flowdot { fill: var(--dy-edge-dep-active); }
.dy-wf-scope .dy-wf-minimap { position: absolute; right: 10px; bottom: 10px; background: rgba(15,18,24,.88); border: 1px solid #2a2f3a; border-radius: 6px; }
/* live activity strip: top-left, collapsible (position deliberate, not carried over from demo) */
.dy-wf-scope .dy-wf-feed { position: absolute; top: 10px; left: 10px; width: 300px; background: rgba(15,18,24,.88); border: 1px solid #2a2f3a; border-radius: 6px; overflow: hidden; }
.dy-wf-scope .dy-wf-feed-head { display: block; width: 100%; text-align: left; background: transparent; border: none; border-radius: 0; padding: 5px 10px; font-size: 11.5px; color: #8b949e; cursor: pointer; letter-spacing: .3px; }
.dy-wf-scope .dy-wf-feed-body { max-height: 160px; overflow: hidden; padding: 0 10px 6px; }
.dy-wf-scope .dy-wf-feed-item { display: flex; gap: 6px; font-size: 11px; color: var(--dy-text, #e6edf3); padding: 2px 0; border-bottom: 1px dashed #23293a; transition: opacity 1.2s; }
.dy-wf-scope .dy-wf-feed-time { font: 10px ui-monospace, monospace; color: #59626f; flex: none; padding-top: 1px; }
.dy-wf-scope .dy-wf-mini-view { fill: none; stroke: #58a6ff; stroke-width: 2; }
.dy-wf-scope .dy-wf-passport { position: absolute; top: 10px; right: 10px; width: 280px; max-height: calc(100% - 20px); overflow-y: auto; background: #161b22; border: 1px solid #2a2f3a; border-radius: 8px; padding: 12px; color: var(--dy-text, #e6edf3); }
/* P8.2: zoom controls + keyboard focus ring + equivalent list view. */
.dy-wf-scope .dy-wf-zoombar { display: flex; gap: 6px; margin: 6px 0; }
.dy-wf-scope .dy-wf-zoombtn { background: #0d1117; color: var(--dy-text, #e6edf3); border: 1px solid #2a2f3a; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.dy-wf-scope .dy-wf-zoombtn:hover { border-color: #58a6ff; }
.dy-wf-scope .dy-wf-node:focus { outline: 2px solid #58a6ff; outline-offset: 2px; }
.dy-wf-scope .dy-wf-list { margin: 8px 0; }
.dy-wf-scope .dy-wf-list-head { background: none; border: none; color: var(--dy-text, #e6edf3); font-weight: 600; cursor: pointer; padding: 4px 0; font-size: 13px; }
.dy-wf-scope .dy-wf-list-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid #21262d; flex-wrap: wrap; }
.dy-wf-scope .dy-wf-list-row:last-child { border-bottom: none; }
.dy-wf-scope .dy-wf-list-title { min-width: 140px; color: var(--dy-text, #e6edf3); font-weight: 600; }
.dy-wf-scope .dy-wf-list-kind { font-size: 11px; text-transform: uppercase; color: #8b949e; border: 1px solid #2a3140; border-radius: 4px; padding: 1px 6px; }
/* The list is the canvas's equivalent view, so it carries the same purpose
   colours (purpose only — status stays the status column beside it). */
.dy-wf-scope .dy-wf-list-kind.task { color: var(--dy-wf-purpose-task-text); border-color: var(--dy-wf-purpose-task-line); }
.dy-wf-scope .dy-wf-list-kind.gate { color: var(--dy-wf-purpose-gate-text); border-color: var(--dy-wf-purpose-gate-line); }
.dy-wf-scope .dy-wf-list-kind.branch { color: var(--dy-wf-purpose-branch-text); border-color: var(--dy-wf-purpose-branch-line); }
.dy-wf-scope .dy-wf-list-kind.loop { color: var(--dy-wf-purpose-loop-text); border-color: var(--dy-wf-purpose-loop-line); }
.dy-wf-scope .dy-wf-list-deps { color: #8b949e; font-size: 12px; flex: 1; }
.dy-wf-scope .dy-wf-list-status { font-weight: 600; }
.dy-wf-scope .dy-wf-list-status.done { color: #3fb950; }
.dy-wf-scope .dy-wf-list-status.blocked { color: var(--dy-warn, #f0883e); }
.dy-wf-scope .dy-wf-list-status.working { color: #58a6ff; }
.dy-wf-scope .dy-wf-list-open { background: #0d1117; color: var(--dy-text, #e6edf3); border: 1px solid #2a2f3a; border-radius: 6px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
/* P8.3/P8.4: decision state + unsupported-control truth. */
.dy-wf-scope .dy-wf-decision-state { display: inline-block; margin: 6px 0; padding: 2px 8px; border-radius: 6px; border: 1px solid #2a3140; font-size: 12px; color: #e3b341; }
.dy-wf-scope .dy-wf-recovery { margin-top: 8px; }
.dy-wf-scope .dy-wf-unsupported { color: #8b949e; font-size: 12px; margin: 6px 0 0; }
.dy-wf-scope .dy-wf-passport h3 { margin: 0 0 4px; font-size: 14px; }
.dy-wf-scope .dy-wf-passport .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; border: 1px solid #8fa3b8; color: #c9d4de; }
.dy-wf-scope .dy-wf-passport .badge.done { border-color: #3fb950; color: #3fb950; }
.dy-wf-scope .dy-wf-passport .badge.working { border-color: #d29922; color: #d29922; }
.dy-wf-scope .dy-wf-passport .badge.blocked { border-color: #f85149; color: #f85149; }
.dy-wf-scope .dy-wf-passport h4 { margin: 10px 0 4px; font-size: 12px; color: #8b949e; text-transform: uppercase; letter-spacing: .4px; }
.dy-wf-scope .dy-wf-actions { display: flex; gap: 8px; margin-top: 10px; }
.dy-wf-scope .dy-wf-expand { margin-top: 10px; }
.dy-wf-scope .dy-wf-expand-head { width: 100%; text-align: left; background: #21262d; border: 1px solid #2a2f3a; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; color: var(--dy-text, #e6edf3); }
.dy-wf-scope .dy-wf-expand-body { padding: 8px 2px; }
.dy-wf-scope .dy-wf-empty { fill: #8b949e; font: 13px system-ui, sans-serif; }
/* Lane bands (v6 composition): the horizontal bands are part of the picture,
   so they are styled with the canvas's own tokens. The label is an axis label,
   never a control. The "exception" modifier marks the band carrying
   branches/loops or a blocked node - derived from the same inputs the node
   purposes use. (Backticks cannot appear inside this template literal.) */
.dy-wf-scope .dy-wf-lane { fill: rgba(148, 163, 184, .055); stroke: #23293a; stroke-width: 1; }
.dy-wf-scope .dy-wf-lane.exception { fill: rgba(255, 123, 114, .07); }
.dy-wf-scope .dy-wf-lane-label { fill: #8b949e; font: 600 7px system-ui, sans-serif; letter-spacing: .9px; text-transform: uppercase; pointer-events: none; }

/* Reduced motion: the canvas is decorative once animated; honour the platform
   setting for the canvas's own elements. (Lives here with the rest of the
   canvas styles — the canvas is the only thing these selectors touch.) */
@media (prefers-reduced-motion: reduce) {
  .dy-wf-scope .dy-wf-node.working .dy-wf-shape { animation: none; }
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
.dy-pc-scope {
  --dy-pc-kind-evidence: #1f7a55;   --dy-pc-kind-claim: #6b4bbd;
  --dy-pc-kind-question: #9a6206;   --dy-pc-kind-decision: #2f4bb5;
  --dy-pc-kind-plan_block: #1d6480; --dy-pc-kind-note: #5b6472;
  --dy-pc-kind-link: #0f6f7a;       --dy-pc-kind-media: #8a3a76;
  --dy-pc-edge-support: #1f7a55;
  --dy-pc-surface: rgba(255, 255, 255, .96);
  --dy-pc-grid: rgba(31, 42, 68, .10);
  --dy-pc-backdrop: rgba(15, 18, 23, .26);
  --dy-pc-danger-text: #a72a2a;
  /* Connector meanings (reserved vocabulary, now drawn here). */
  --dy-edge-plan-supports: #1f7a55;         --dy-edge-plan-supports-active: #17603f;
  --dy-edge-plan-contradicts: #b3352c;      --dy-edge-plan-contradicts-active: #8d2721;
  --dy-edge-plan-derived_from: #6b4bbd;     --dy-edge-plan-derived_from-active: #533a95;
  --dy-edge-plan-clarifies: #8a6206;        --dy-edge-plan-clarifies-active: #6d4d04;
  --dy-edge-plan-implements: #a4520b;       --dy-edge-plan-implements-active: #823f08;
  --dy-edge-plan-raises_question: #a8275f;  --dy-edge-plan-raises_question-active: #861e4b;
  --dy-edge-plan-depends_on: #4a5a7a;       --dy-edge-plan-depends_on-active: #3a4763;
}
.dockyard-root[data-theme="dark"] .dy-pc-scope {
  --dy-pc-kind-evidence: #57d39b;   --dy-pc-kind-claim: #b99cf5;
  --dy-pc-kind-question: #f0c04a;   --dy-pc-kind-decision: #9db3ff;
  --dy-pc-kind-plan_block: #79cbe0; --dy-pc-kind-note: #a9b6c6;
  --dy-pc-kind-link: #6fd8e0;       --dy-pc-kind-media: #e3a0d3;
  --dy-pc-surface: rgba(23, 27, 34, .96);
  --dy-pc-grid: rgba(182, 190, 202, .12);
  --dy-pc-backdrop: rgba(0, 0, 0, .42);
  --dy-pc-danger-text: #ff9d97;
  --dy-edge-plan-supports: #4fc08d;         --dy-edge-plan-supports-active: #79e0ab;
  --dy-edge-plan-contradicts: #ff8a80;      --dy-edge-plan-contradicts-active: #ffb3ab;
  --dy-edge-plan-derived_from: #c792ea;     --dy-edge-plan-derived_from-active: #e0bcf7;
  --dy-edge-plan-clarifies: #ffd479;        --dy-edge-plan-clarifies-active: #ffe3a3;
  --dy-edge-plan-implements: #ffb86c;       --dy-edge-plan-implements-active: #ffd0a0;
  --dy-edge-plan-raises_question: #ff6ea9;  --dy-edge-plan-raises_question-active: #ff9cc4;
  --dy-edge-plan-depends_on: #8fa3c8;       --dy-edge-plan-depends_on-active: #9cc4ff;
}
/* Frame: toolbar + stage + overlay slots. */
.dy-pc-scope .dy-pc { position: relative; display: flex; flex-direction: column; min-height: 0; margin-top: 14px; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); }
.dy-pc-scope .dy-pc-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-pc-scope .dy-pc-seg { display: flex; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 8px; }
.dy-pc-scope .dy-pc-seg button { padding: 6px 11px; border: 0; border-radius: 0; background: transparent; color: var(--dy-text-2); font-size: 11.5px; font-weight: 600; cursor: pointer; }
.dy-pc-scope .dy-pc-seg button.on { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dy-pc-scope .dy-pc-sep { width: 1px; height: 18px; margin: 0 4px; background: var(--dy-border); }
.dy-pc-scope .dy-pc-add { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 3px 8px; border: 1px dashed var(--dy-control-border); border-radius: 8px; }
.dy-pc-scope .dy-pc-add input { min-width: 190px; max-width: 320px; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-add select { padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-spacer { flex: 1 1 auto; }
/* Connector editor bar: the explicit fallback for a real meaning, beside the
   toolbar so it is reachable without a gesture. */
.dy-pc-scope .dy-pc-linkbar { display: flex; flex-wrap: wrap; align-items: end; gap: 9px; padding: 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dy-pc-scope .dy-pc-linkbar label { display: grid; gap: 5px; color: var(--dy-text-2); font-size: 10px; font-weight: 730; }
.dy-pc-scope .dy-pc-linkbar select { min-width: 150px; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dy-pc-scope .dy-pc-edge-label { fill: var(--dy-text-3); font: 600 9.5px system-ui, sans-serif; letter-spacing: .02em; pointer-events: none; }
.dy-pc-scope .dy-pc-readout { color: var(--dy-text-3); font-size: 11px; font-variant-numeric: tabular-nums; }
/* Stage + world. The world is the scrollable/zoomable plane objects live on. */
.dy-pc-scope .dy-pc-stage { position: relative; flex: 1 1 auto; min-height: 460px; height: 58vh; overflow: hidden; background-color: var(--dy-surface-subtle); background-image: linear-gradient(var(--dy-pc-grid) 1px, transparent 1px), linear-gradient(90deg, var(--dy-pc-grid) 1px, transparent 1px); background-size: 28px 28px; }
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
.dy-pc-scope .dy-pc-obj { position: absolute; z-index: 2; min-width: 180px; max-width: 260px; padding: 11px 13px; border: 1px solid var(--dy-border); border-left: 3px solid var(--dy-pc-kind-note); border-radius: 10px; background: var(--dy-pc-surface); box-shadow: var(--dy-shadow); color: var(--dy-text); text-align: left; cursor: grab; user-select: none; touch-action: none; overflow: hidden; }
/* B9: the stored rect drives the rendered box — the inline height style set by
   canvas.js is authoritative (attr() is not reliably parsed with units here),
   so connector anchors and de-overlap match what was persisted. */
.dy-pc-scope .dy-pc-obj .dy-pc-obj-kind-icon { position: absolute; top: 9px; right: 10px; color: var(--dy-text-3); display: inline-flex; pointer-events: none; }
.dy-pc-scope .dy-pc-obj .dy-pc-obj-kind-icon svg { width: 13px; height: 13px; }
.dy-pc-scope .dy-pc-obj.marquee-selected { box-shadow: 0 0 0 2px var(--dy-accent-soft), 0 0 0 1px var(--dy-accent-border), var(--dy-shadow); }
.dy-pc-scope .dy-pc-marquee { position: absolute; z-index: 5; border: 1px dashed var(--dy-accent-border); background: var(--dy-accent-soft); pointer-events: none; }
.dy-pc-scope .dy-pc-chat input[data-canvas-chat-input] { flex: 1 1 auto; min-width: 0; }
.dy-pc-scope .dy-pc-obj:active { cursor: grabbing; }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="evidence"] { border-left-color: var(--dy-pc-kind-evidence); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="claim"] { border-left-color: var(--dy-pc-kind-claim); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="question"] { border-left-color: var(--dy-pc-kind-question); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="decision"] { border-left-color: var(--dy-pc-kind-decision); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="plan_block"] { border-left-color: var(--dy-pc-kind-plan_block); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="note"] { border-left-color: var(--dy-pc-kind-note); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="link"] { border-left-color: var(--dy-pc-kind-link); }
.dy-pc-scope .dy-pc-obj[data-canvas-kind="media"] { border-left-color: var(--dy-pc-kind-media); }
.dy-pc-scope .dy-pc-obj:hover { border-top-color: var(--dy-accent-border); border-right-color: var(--dy-accent-border); border-bottom-color: var(--dy-accent-border); }
.dy-pc-scope .dy-pc-obj.selected { border-top-color: var(--dy-accent-border); border-right-color: var(--dy-accent-border); border-bottom-color: var(--dy-accent-border); box-shadow: 0 0 0 2px var(--dy-accent-soft), var(--dy-shadow); }
.dy-pc-scope .dy-pc-obj:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dy-pc-scope .dy-pc-obj small { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--dy-text-3); }
.dy-pc-scope .dy-pc-obj strong { display: block; margin-top: 5px; font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--dy-text); }
.dy-pc-scope .dy-pc-obj-meta { display: block; margin-top: 6px; color: var(--dy-text-3); font-size: 10px; }
.dy-pc-scope .dy-pc-empty { position: absolute; left: 18px; top: 16px; margin: 0; color: var(--dy-text-3); font-size: 12px; }
/* Frames are decorative group labels (v6's .pframe) — never controls. */
.dy-pc-scope .dy-pc-frame { position: absolute; z-index: 0; border: 1px dashed var(--dy-border); border-radius: 10px; background: var(--dy-accent-soft); padding: 12px 14px; color: var(--dy-text-3); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
/* Assistant (curation) panel: docked, collapsible, bottom-right. */
.dy-pc-scope .dy-pc-chat { position: absolute; right: 14px; bottom: 14px; z-index: 20; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-pc-surface); box-shadow: 0 14px 44px rgba(0, 0, 0, .28); }
.dy-pc-scope .dy-pc-chat.closed { width: 268px; }
.dy-pc-scope .dy-pc-chat.open { width: 360px; max-height: 460px; }
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
/* Proposals: scratch + suggested only. Nothing on this surface auto-applies. */
.dy-pc-scope .dy-pc-proposal { display: grid; gap: 6px; padding: 9px 10px; border: 1px dashed var(--dy-accent-border); border-radius: 9px; background: var(--dy-accent-soft); }
.dy-pc-scope .dy-pc-proposal strong { font-size: 12px; }
.dy-pc-scope .dy-pc-proposal small { color: var(--dy-text-2); font-size: 10.5px; }
.dy-pc-scope .dy-pc-proposal .dockyard-form-actions { margin: 0; }
.dy-pc-scope .dy-pc-proposal[data-pc-proposal-status="approved"] { border-style: solid; border-color: var(--dy-success); }
.dy-pc-scope .dy-pc-proposal[data-pc-proposal-status="rejected"] { border-style: solid; border-color: var(--dy-border); background: var(--dy-surface-subtle); }
/* Drawer: the selection editor (replaces a permanently-docked inspector). */
.dy-pc-scope .dy-pc-drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 30; display: flex; flex-direction: column; width: min(360px, 92vw); border-left: 1px solid var(--dy-border); background: var(--dy-surface); transform: translateX(100%); transition: transform .18s ease; }
.dy-pc-scope .dy-pc-drawer.open { transform: none; }
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
}
`
