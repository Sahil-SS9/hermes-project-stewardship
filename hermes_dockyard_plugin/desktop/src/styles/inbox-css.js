// Approval Inbox stylesheet (Batch D).
//
// Owns ONLY the inbox screen: the list-left / detail-right layout, rows,
// filter tabs, attention rows and the detail panel's pinned action bar.
// The .dockyard-*evidence-details / .dockyard-comment-thread classes stay in
// dockyard-css.js — initiative.js and dashboard.js share them.
// Rules: every colour is a var(--dy-*) token already present in BOTH themes;
// no fallback colours (a token miss must fail the colour tests, not paint the
// light palette into dark mode); every rule is scoped to .dockyard-root.
export const INBOX_CSS = `
/* ==== Approval Inbox (Batch D): list left, detail right ==== */
.dockyard-root .dockyard-inbox { display: grid; gap: 14px; min-width: 0; }
.dockyard-root .dockyard-inbox-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dockyard-root .dockyard-inbox-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 13px;
  border: 1px solid var(--dy-border);
  border-radius: 999px;
  background: var(--dy-surface);
  color: var(--dy-text-2);
  font: inherit; font-size: 12px; font-weight: 600;
  cursor: pointer;
}
.dockyard-root .dockyard-inbox-tab:hover { border-color: var(--dy-accent-border); color: var(--dy-accent-text); }
.dockyard-root .dockyard-inbox-tab[aria-selected="true"] {
  border-color: var(--dy-accent-border);
  background: var(--dy-accent-soft);
  color: var(--dy-accent-text);
}
.dockyard-root .dockyard-inbox-tab small { color: var(--dy-text-3); font-weight: 600; }
.dockyard-root .dockyard-inbox-tab[aria-selected="true"] small { color: var(--dy-accent-text); }
.dockyard-root .dockyard-inbox-layout {
  display: grid;
  grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 0;
}
.dockyard-root .dockyard-inbox-list { display: grid; gap: 9px; min-width: 0; }
.dockyard-root .dockyard-inbox-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--dy-border);
  border-radius: 12px;
  background: var(--dy-surface);
  color: var(--dy-text);
  font: inherit; text-align: left;
  cursor: pointer;
  min-width: 0;
}
.dockyard-root .dockyard-inbox-row:hover { border-color: var(--dy-accent-border); }
.dockyard-root .dockyard-inbox-row[aria-selected="true"] {
  border-color: var(--dy-accent-border);
  background: var(--dy-accent-soft);
}
.dockyard-root .dockyard-inbox-row:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dockyard-root .dockyard-inbox-row-title { overflow: hidden; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-inbox-row-meta { grid-column: 1; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-inbox-row-badge { grid-row: 1 / span 2; grid-column: 2; align-self: center; padding: 3px 8px; border-radius: 999px; background: var(--dy-warning-bg); color: var(--dy-warning); font-size: 10px; font-weight: 700; }
.dockyard-root .dockyard-inbox-row-badge.danger { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .dockyard-inbox-row-badge.urgent { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .dockyard-inbox-empty { padding: 18px 14px; border: 1px dashed var(--dy-border); border-radius: 12px; color: var(--dy-text-3); font-size: 12.5px; }
/* Attention rows: honest, listed, never decidable here. */
.dockyard-root .dockyard-attention-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  width: 100%;
  padding: 12px 13px;
  border: 1px solid var(--dy-warning);
  border-radius: 12px;
  background: var(--dy-warning-bg);
  color: var(--dy-text);
  font: inherit; text-align: left;
  cursor: pointer;
  min-width: 0;
}
.dockyard-root .dockyard-attention-row-title { font-size: 13px; font-weight: 650; }
.dockyard-root .dockyard-attention-row small { grid-column: 1; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-attention-row a, .dockyard-root .dockyard-attention-row button { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-size: 11px; }
.dockyard-root .dockyard-attention-panel {
  display: grid;
  gap: 9px;
  padding: 15px;
  border: 1px solid var(--dy-warning);
  border-radius: 12px;
  background: var(--dy-warning-bg);
}
.dockyard-root .dockyard-attention-panel h2 { margin: 0; font-size: 14.5px; }
.dockyard-root .dockyard-attention-panel p { margin: 0; color: var(--dy-text-2); font-size: 12.5px; line-height: 1.5; }
/* Detail panel: the decision context, ordered; actions pinned at the bottom. */
.dockyard-root .dockyard-inbox-panel {
  display: flex;
  flex-direction: column;
  gap: 13px;
  min-width: 0;
  padding: 17px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
  max-height: calc(100vh - 150px);
  overflow: auto;
}
.dockyard-root .dockyard-inbox-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dockyard-root .dockyard-inbox-panel-head h2 { margin: 0; font-size: 17px; line-height: 1.3; }
.dockyard-root .dockyard-inbox-panel-head small { display: block; margin-top: 3px; color: var(--dy-text-3); font-size: 11.5px; }
.dockyard-root .dockyard-inbox-section { display: grid; gap: 6px; }
.dockyard-root .dockyard-inbox-section > h3 { margin: 0; color: var(--dy-text-3); font-size: 10.5px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; }
.dockyard-root .dockyard-inbox-section > p { margin: 0; color: var(--dy-text); font-size: 13px; line-height: 1.55; }
.dockyard-root .dockyard-inbox-section > p.dim { color: var(--dy-text-2); }
.dockyard-root .dockyard-inbox-section code { padding: 1px 6px; border-radius: 6px; background: var(--dy-surface-subtle); color: var(--dy-text); font-size: 11.5px; }
.dockyard-root .dockyard-inbox-status { display: inline-flex; align-items: center; gap: 7px; width: fit-content; padding: 5px 10px; border-radius: 999px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 11.5px; font-weight: 600; }
.dockyard-root .dockyard-inbox-status.pass { background: var(--dy-success-bg); color: var(--dy-success); }
.dockyard-root .dockyard-inbox-status.block { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .dockyard-inbox-evidence-list { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dockyard-inbox-evidence-list li { display: flex; gap: 8px; align-items: baseline; color: var(--dy-text-2); font-size: 12.5px; }
.dockyard-root .dockyard-inbox-workitems { display: grid; gap: 5px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dockyard-inbox-workitems li { color: var(--dy-text-2); font-size: 12.5px; }
/* Pinned action bar: the three outcomes, always the last thing on screen. */
.dockyard-root .dockyard-inbox-actions {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding: 12px 0 2px;
  border-top: 1px solid var(--dy-border);
  background: var(--dy-surface);
}
.dockyard-root .dockyard-inbox-actions .spacer { flex: 1 1 auto; }
/* Request-changes feedback form (R2): one required field, then submit. */
.dockyard-root .dockyard-request-changes { display: grid; gap: 9px; padding: 13px; border: 1px solid var(--dy-accent-border); border-radius: 12px; background: var(--dy-accent-soft); }
.dockyard-root .dockyard-request-changes label { color: var(--dy-text); font-size: 12px; font-weight: 650; }
.dockyard-root .dockyard-request-changes input { min-height: 34px; padding: 6px 10px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12.5px; }
.dockyard-root .dockyard-request-changes input:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dockyard-request-changes-actions { display: flex; gap: 8px; }
/* Narrow container: the list is alone; the detail opens full width. */
@container dockyard (max-width: 820px) {
  .dockyard-root .dockyard-inbox-layout { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-inbox-panel { max-height: none; }
}
`;