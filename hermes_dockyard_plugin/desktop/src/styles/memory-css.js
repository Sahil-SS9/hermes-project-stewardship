// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Project memory (checks round 1, 08/10): the Memory tab's entry rows, its
// counters, history list and "From finished work" list. The layout, cards,
// editor and preview reuse the Content tab's classes. Scoped to .dockyard-root
// and built only from the shell's colour tokens, so light, dark and auto all
// work (memory-css.test.mjs checks every token used is defined in both themes).
export const MEMORY_CSS = `
.dockyard-root .dy-mem-group { display: grid; gap: 8px; margin-top: 18px; }
.dockyard-root .dy-mem-group h3,
.dockyard-root .dy-mem-suggestions h3 { margin: 0; color: var(--dy-text-2); font-size: 10px; font-weight: 760; letter-spacing: .06em; text-transform: uppercase; }
.dockyard-root .dy-mem-entry { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; padding: 11px 12px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dy-mem-entry[data-archived="true"] { border-style: dashed; color: var(--dy-text-2); }
.dockyard-root .dy-mem-entry .dockyard-inline-editor { grid-column: 1 / -1; margin-top: 0; }
.dockyard-root .dy-mem-body { display: grid; gap: 4px; min-width: 0; }
.dockyard-root .dy-mem-text { margin: 0; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.dockyard-root .dy-mem-meta { color: var(--dy-text-3); font-size: 9px; overflow-wrap: anywhere; }
.dockyard-root .dy-mem-count { display: block; margin-top: 6px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dy-mem-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: flex-end; }
.dockyard-root .dy-mem-history { grid-column: 1 / -1; display: grid; gap: 6px; margin: 0; padding: 10px 12px 0 22px; border-top: 1px solid var(--dy-border); color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dy-mem-history small { display: block; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dy-mem-suggestions { display: grid; gap: 8px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--dy-border); }
@container dockyard (max-width: 640px) {
  .dockyard-root .dy-mem-entry { grid-template-columns: minmax(0, 1fr); }
  .dockyard-root .dy-mem-actions { justify-content: flex-start; }
}
`
