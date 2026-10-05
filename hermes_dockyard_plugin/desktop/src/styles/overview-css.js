// GENERATED-STRUCTURE: hand-edited Desktop module. C1 Overview styles only:
// the project header strip (signed 16/09) and its "Needs attention" drawer.
// Appended where DOCKYARD_CSS is used (runtime/context.js), same rule as the
// Kanban, Roadmap, Settings and Vision blocks. Colours come only from the
// shell's --dy-* tokens, which every theme sets, so no theme branch is needed
// and no fallback colour can leak through. Every rule is scoped to
// .dockyard-root; narrow layouts use the app frame's container query.
export const OVERVIEW_CSS = `
.dockyard-root .dy-ov-strip { display: grid; gap: 8px; min-width: 0; margin: 0 0 12px; }

/* 1. Status banner: background, text and border keyed to the state. */
.dockyard-root .dy-ov-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; padding: 6px 12px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-neutral-bg); color: var(--dy-neutral); font-size: 13px; line-height: 1.35; cursor: pointer; }
.dockyard-root .dy-ov-banner:hover { filter: brightness(.98); }
.dockyard-root .dy-ov-banner:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dy-ov-banner[data-tone="danger"] { background: var(--dy-danger-bg); color: var(--dy-danger); border-color: color-mix(in srgb, var(--dy-danger) 45%, transparent); }
.dockyard-root .dy-ov-banner[data-tone="warning"] { background: var(--dy-warning-bg); color: var(--dy-warning); border-color: color-mix(in srgb, var(--dy-warning) 45%, transparent); }
.dockyard-root .dy-ov-banner[data-tone="info"] { background: var(--dy-info-bg); color: var(--dy-info); border-color: color-mix(in srgb, var(--dy-info) 45%, transparent); }
.dockyard-root .dy-ov-banner[data-tone="success"] { background: var(--dy-success-bg); color: var(--dy-success); border-color: color-mix(in srgb, var(--dy-success) 45%, transparent); }
.dockyard-root .dy-ov-banner[data-tone="neutral"] { background: var(--dy-neutral-bg); color: var(--dy-neutral); border-color: var(--dy-border); }
.dockyard-root .dy-ov-banner-left { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.dockyard-root .dy-ov-banner-left strong { flex: none; font-weight: 750; }
.dockyard-root .dy-ov-mark { flex: none; align-self: center; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.dockyard-root .dy-ov-banner-summary { min-width: 0; color: var(--dy-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-ov-banner-view { flex: none; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }

/* 2. Eyebrow row: project, lead, evidence; recency and actions on the right. */
.dockyard-root .dy-ov-eyebrow-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 14px; min-width: 0; }
.dockyard-root .dy-ov-eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; margin: 0; color: var(--dy-text-3); font-size: 12px; }
.dockyard-root .dy-ov-proj { color: var(--dy-text-2); font-weight: 750; letter-spacing: .02em; }
.dockyard-root .dy-ov-sep { color: var(--dy-text-3); }
.dockyard-root .dy-ov-evidence { display: inline-flex; align-items: center; gap: 5px; }
.dockyard-root .dy-ov-evidence i { width: 7px; height: 7px; border-radius: 50%; background: var(--dy-neutral); }
.dockyard-root .dy-ov-evidence[data-tone="danger"] i { background: var(--dy-danger); }
.dockyard-root .dy-ov-evidence[data-tone="warning"] i { background: var(--dy-warning); }
.dockyard-root .dy-ov-evidence[data-tone="success"] i { background: var(--dy-success); }
.dockyard-root .dy-ov-meta { display: flex; align-items: center; gap: 12px; color: var(--dy-text-3); font-size: 12px; }
.dockyard-root .dy-ov-meta a { color: var(--dy-accent-text); font-weight: 650; text-decoration: none; }
.dockyard-root .dy-ov-meta a:hover { text-decoration: underline; }
.dockyard-root .dy-ov-refresh { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text-2); cursor: pointer; }
.dockyard-root .dy-ov-refresh:hover { background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dy-ov-refresh:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-ov-refresh svg { width: 14px; height: 14px; }

/* 3. The mission as the one headline. */
.dockyard-root .dy-ov-headline { margin: 0; color: var(--dy-text); font-size: 22px; font-weight: 750; line-height: 1.25; overflow-wrap: anywhere; }
.dockyard-root .dy-ov-headline[data-strip-headline="missing"] { color: var(--dy-text-2); }

/* 4. Delivery as a thin strip: %, bar, legend on one line where it fits. */
.dockyard-root .dy-ov-progress { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; min-width: 0; }
.dockyard-root .dy-ov-pct { display: inline-flex; align-items: baseline; gap: 6px; color: var(--dy-text); font-size: 13px; font-weight: 750; white-space: nowrap; }
.dockyard-root .dy-ov-pct small { color: var(--dy-text-3); font-size: 12px; font-weight: 500; }
.dockyard-root .dy-ov-track { flex: 1 1 220px; display: flex; height: 6px; min-width: 120px; overflow: hidden; border-radius: 999px; background: var(--dy-surface-strong); }
.dockyard-root .dy-ov-track > span { display: block; height: 100%; }
.dockyard-root .dy-ov-track > .done, .dockyard-root .dy-ov-legend .done i { background: var(--dy-success); }
.dockyard-root .dy-ov-track > .active, .dockyard-root .dy-ov-legend .active i { background: var(--dy-action); }
.dockyard-root .dy-ov-track > .blocked, .dockyard-root .dy-ov-legend .blocked i { background: var(--dy-danger); }
.dockyard-root .dy-ov-track > .backlog, .dockyard-root .dy-ov-legend .backlog i { background: var(--dy-neutral); }
.dockyard-root .dy-ov-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dy-ov-legend span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.dockyard-root .dy-ov-legend i { width: 8px; height: 8px; border-radius: 2px; }

/* The "Needs attention" drawer: a right-hand panel over the page. */
.dockyard-root .dy-ov-attn-layer { place-items: stretch end; padding: 0; }
.dockyard-root .dy-ov-attn-panel { display: grid; align-content: start; gap: 12px; width: min(420px, 100%); height: 100%; overflow-y: auto; padding: 18px; border-left: 1px solid var(--dy-border); background: var(--dy-surface); color: var(--dy-text); box-shadow: var(--dy-shadow); }
.dockyard-root .dy-ov-attn-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dockyard-root .dy-ov-attn-panel h2 { margin: 0; font-size: 17px; }
.dockyard-root .dy-ov-attn-close { display: inline-grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text-2); cursor: pointer; }
.dockyard-root .dy-ov-attn-close:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dy-ov-attn-close svg { width: 15px; height: 15px; }
.dockyard-root .dy-ov-attn-sub { margin: 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dy-ov-attn-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-ov-attn-item { overflow: hidden; border: 1px solid var(--dy-border); border-left: 4px solid var(--dy-neutral); border-radius: 8px; background: var(--dy-surface); }
.dockyard-root .dy-ov-attn-item[data-tone="danger"] { border-left-color: var(--dy-danger); }
.dockyard-root .dy-ov-attn-item[data-tone="warning"] { border-left-color: var(--dy-warning); }
.dockyard-root .dy-ov-attn-item[data-tone="info"] { border-left-color: var(--dy-info); }
.dockyard-root .dy-ov-attn-row { display: grid; gap: 2px; width: 100%; padding: 10px 12px; border: 0; background: transparent; color: var(--dy-text); font: inherit; text-align: left; cursor: pointer; }
.dockyard-root .dy-ov-attn-row:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dy-ov-attn-row:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: -2px; }
.dockyard-root .dy-ov-attn-row strong { font-size: 13px; overflow-wrap: anywhere; }
.dockyard-root .dy-ov-attn-sev { color: var(--dy-neutral); font-size: 11px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
.dockyard-root .dy-ov-attn-item[data-tone="danger"] .dy-ov-attn-sev { color: var(--dy-danger); }
.dockyard-root .dy-ov-attn-item[data-tone="warning"] .dy-ov-attn-sev { color: var(--dy-warning); }
.dockyard-root .dy-ov-attn-item[data-tone="info"] .dy-ov-attn-sev { color: var(--dy-info); }
.dockyard-root .dy-ov-attn-note { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-ov-attn-detail { display: grid; gap: 10px; padding: 2px 12px 12px; }
.dockyard-root .dy-ov-attn-detail dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 0; font-size: 12px; }
.dockyard-root .dy-ov-attn-detail dt { color: var(--dy-text-3); }
.dockyard-root .dy-ov-attn-detail dd { margin: 0; color: var(--dy-text); }
.dockyard-root .dy-ov-attn-detail .dockyard-button { justify-self: start; }
.dockyard-root .dy-ov-attn-empty { margin: 0; padding: 12px; border: 1px dashed var(--dy-border); border-radius: 8px; color: var(--dy-text-2); font-size: 13px; }

@container dockyard (max-width: 640px) {
  .dockyard-root .dy-ov-banner { align-items: flex-start; }
  .dockyard-root .dy-ov-banner-left { flex-wrap: wrap; }
  .dockyard-root .dy-ov-banner-summary { white-space: normal; }
  .dockyard-root .dy-ov-headline { font-size: 19px; }
  .dockyard-root .dy-ov-meta { width: 100%; justify-content: space-between; }
  .dockyard-root .dy-ov-attn-layer { place-items: end stretch; }
  .dockyard-root .dy-ov-attn-panel { width: 100%; height: auto; max-height: 85%; border-left: 0; border-top: 1px solid var(--dy-border); border-radius: 14px 14px 0 0; }
}
`
