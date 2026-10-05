// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { LIGHT_TOKENS } from '../styles/tokens.js'
import { DARK_TOKENS } from '../styles/tokens.js'
export const DOCKYARD_CSS = `
.dockyard-root {
  color-scheme: light;
  --dy-bg: ${LIGHT_TOKENS.bg};
  --dy-surface: ${LIGHT_TOKENS.surface};
  --dy-surface-subtle: ${LIGHT_TOKENS.surfaceSubtle};
  --dy-surface-strong: ${LIGHT_TOKENS.surfaceStrong};
  --dy-text: ${LIGHT_TOKENS.text};
  --dy-text-2: ${LIGHT_TOKENS.textSecondary};
  --dy-text-3: ${LIGHT_TOKENS.textTertiary};
  --dy-border: ${LIGHT_TOKENS.border};
  --dy-control-border: ${LIGHT_TOKENS.controlBorder};
  --dy-action: ${LIGHT_TOKENS.action};
  --dy-action-hover: ${LIGHT_TOKENS.actionHover};
  --dy-accent-text: ${LIGHT_TOKENS.accentText};
  --dy-accent-soft: ${LIGHT_TOKENS.accentSoft};
  --dy-accent-border: ${LIGHT_TOKENS.accentBorder};
  --dy-shadow: ${LIGHT_TOKENS.shadow};
  --dy-success: ${LIGHT_TOKENS.success};
  --dy-success-bg: ${LIGHT_TOKENS.successBg};
  --dy-warning: ${LIGHT_TOKENS.warning};
  --dy-warning-bg: ${LIGHT_TOKENS.warningBg};
  --dy-danger: ${LIGHT_TOKENS.danger};
  --dy-danger-bg: ${LIGHT_TOKENS.dangerBg};
  --dy-info: ${LIGHT_TOKENS.info};
  --dy-info-bg: ${LIGHT_TOKENS.infoBg};
  --dy-neutral: ${LIGHT_TOKENS.neutral};
  --dy-neutral-bg: ${LIGHT_TOKENS.neutralBg};
  --dy-focus: ${LIGHT_TOKENS.focus};
  --dy-disabled-text: ${LIGHT_TOKENS.disabledText};
  --dy-disabled-bg: ${LIGHT_TOKENS.disabledBg};
  container-name: dockyard;
  container-type: inline-size;
  overflow-x: clip;
  min-height: 100vh;
  background: ${LIGHT_TOKENS.bg};
  color: ${LIGHT_TOKENS.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  isolation: isolate;
}
.dockyard-root[data-theme="dark"] {
    color-scheme: dark;
    --dy-bg: ${DARK_TOKENS.bg};
    --dy-surface: ${DARK_TOKENS.surface};
    --dy-surface-subtle: ${DARK_TOKENS.surfaceSubtle};
    --dy-surface-strong: ${DARK_TOKENS.surfaceStrong};
    --dy-text: ${DARK_TOKENS.text};
    --dy-text-2: ${DARK_TOKENS.textSecondary};
    --dy-text-3: ${DARK_TOKENS.textTertiary};
    --dy-border: ${DARK_TOKENS.border};
    --dy-control-border: ${DARK_TOKENS.controlBorder};
    --dy-action: ${DARK_TOKENS.action};
    --dy-action-hover: ${DARK_TOKENS.actionHover};
    --dy-accent-text: ${DARK_TOKENS.accentText};
    --dy-accent-soft: ${DARK_TOKENS.accentSoft};
    --dy-accent-border: ${DARK_TOKENS.accentBorder};
    --dy-shadow: ${DARK_TOKENS.shadow};
    --dy-success: ${DARK_TOKENS.success};
    --dy-success-bg: ${DARK_TOKENS.successBg};
    --dy-warning: ${DARK_TOKENS.warning};
    --dy-warning-bg: ${DARK_TOKENS.warningBg};
    --dy-danger: ${DARK_TOKENS.danger};
    --dy-danger-bg: ${DARK_TOKENS.dangerBg};
    --dy-info: ${DARK_TOKENS.info};
    --dy-info-bg: ${DARK_TOKENS.infoBg};
    --dy-neutral: ${DARK_TOKENS.neutral};
    --dy-neutral-bg: ${DARK_TOKENS.neutralBg};
    --dy-focus: ${DARK_TOKENS.focus};
    --dy-disabled-text: ${DARK_TOKENS.disabledText};
    --dy-disabled-bg: ${DARK_TOKENS.disabledBg};
    background: ${DARK_TOKENS.bg};
    color: ${DARK_TOKENS.text};
}
.dockyard-root,
.dockyard-root *,
.dockyard-root *::before,
.dockyard-root *::after { box-sizing: border-box; }
.dockyard-root button { font: inherit; color: inherit; }
.dockyard-root button,
.dockyard-root [role="button"] { -webkit-tap-highlight-color: transparent; }
.dockyard-root button:focus-visible,
.dockyard-root [tabindex]:focus-visible {
  outline: 3px solid var(--dy-focus);
  outline-offset: 2px;
}
.dockyard-root svg { display: block; }
.dockyard-root .dockyard-shell {
  width: 100%;
  max-width: 1360px;
  min-height: 100%;
  margin: 0 auto;
  padding: 18px 20px 40px;
}
.dockyard-root .dockyard-consolebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 60px;
  margin-bottom: 30px;
  padding: 9px 10px 9px 12px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: max-content;
}
.dockyard-root .dockyard-brand-mark {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--dy-action);
  color: #ffffff;
}
.dockyard-root .dockyard-brand-mark svg { width: 18px; height: 18px; }
.dockyard-root .dockyard-brand-copy { display: grid; gap: 1px; }
.dockyard-root .dockyard-brand-copy strong {
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.dockyard-root .dockyard-brand-copy span { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-tabs {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
  padding: 3px;
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  scrollbar-width: none;
}
.dockyard-root .dockyard-tabs::-webkit-scrollbar { display: none; }
.dockyard-root .dockyard-tab {
  position: relative;
  min-width: max-content;
  min-height: 38px;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dy-text-2);
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
  transition: color 140ms ease, background 140ms ease, transform 140ms ease;
}
.dockyard-root .dockyard-tab:hover { color: var(--dy-text); background: var(--dy-surface); }
.dockyard-root .dockyard-tab:active { transform: translateY(1px); }
.dockyard-root .dockyard-tab[aria-selected="true"] {
  color: var(--dy-text);
  background: var(--dy-surface);
  box-shadow: inset 0 0 0 1px var(--dy-border);
}
.dockyard-root .dockyard-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  right: 10px;
  bottom: 2px;
  left: 10px;
  height: 2px;
  border-radius: 2px;
  background: var(--dy-action);
}
.dockyard-root .dockyard-tab-count {
  min-width: 19px;
  height: 19px;
  margin-left: 6px;
  padding: 0 5px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--dy-neutral-bg);
  color: var(--dy-neutral);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.dockyard-root .dockyard-tab[aria-selected="true"] .dockyard-tab-count {
  background: var(--dy-accent-soft);
  color: var(--dy-accent-text);
}
.dockyard-root .dockyard-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}
.dockyard-root .dockyard-page-head h1 {
  margin: 0;
  color: var(--dy-text);
  font-size: clamp(26px, 2.4vw, 32px);
  font-weight: 720;
  line-height: 1.12;
  letter-spacing: -0.035em;
}
.dockyard-root .dockyard-page-head p {
  max-width: 720px;
  margin: 7px 0 0;
  color: var(--dy-text-2);
  font-size: 14px;
}
.dockyard-root .dockyard-page-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.dockyard-root .dockyard-button {
  min-height: 40px;
  padding: 8px 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--dy-control-border);
  border-radius: 6px;
  background: var(--dy-surface);
  color: var(--dy-text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 680;
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}
.dockyard-root .dockyard-button:hover { background: var(--dy-surface-subtle); border-color: var(--dy-control-border); }
.dockyard-root .dockyard-button:active { transform: translateY(1px); }
.dockyard-root .dockyard-button svg { width: 15px; height: 15px; }
.dockyard-root .dockyard-button.primary { color: #ffffff; background: var(--dy-action); border-color: var(--dy-action); }
.dockyard-root .dockyard-button.primary:hover { color: #ffffff; background: var(--dy-action-hover); border-color: var(--dy-action-hover); }
.dockyard-root .dockyard-button.small { min-height: 34px; padding: 6px 10px; font-size: 12px; }
.dockyard-root .dockyard-console-action { flex: 0 0 auto; white-space: nowrap; }
.dockyard-root .dockyard-button:disabled {
  color: var(--dy-disabled-text);
  background: var(--dy-disabled-bg);
  border-color: var(--dy-control-border);
  cursor: not-allowed;
  transform: none;
}
.dockyard-root .dockyard-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(340px, .88fr);
  gap: 18px;
}
.dockyard-root .dockyard-section {
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-attention-icon,
.dockyard-root .dockyard-empty-icon,
.dockyard-root .dockyard-error-icon {
  width: 38px;
  height: 38px;
  margin-bottom: 17px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--dy-accent-soft);
  color: var(--dy-accent-text);
}
.dockyard-root .dockyard-attention-icon svg,
.dockyard-root .dockyard-empty-icon svg,
.dockyard-root .dockyard-error-icon svg { width: 19px; height: 19px; }
.dockyard-root .dockyard-section-head h2,
.dockyard-root .dockyard-feed-head h2 {
  margin: 0;
  color: var(--dy-text);
  font-size: 17px;
  line-height: 1.3;
  letter-spacing: -0.015em;
}
.dockyard-root .dockyard-section-head p,
.dockyard-root .dockyard-feed-head p {
  margin: 5px 0 0;
  color: var(--dy-text-2);
  font-size: 13px;
}
.dockyard-root .dockyard-decision-count {
  display: block;
  margin: 13px 0 5px;
  color: var(--dy-accent-text);
  font-size: 44px;
  font-weight: 760;
  line-height: .95;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}

.dockyard-root .dockyard-section { margin-top: 18px; overflow: hidden; }
.dockyard-root .dockyard-section-head,
.dockyard-root .dockyard-feed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 19px;
}
.dockyard-root .dockyard-section-count {
  color: var(--dy-text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dockyard-root .dockyard-section-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dockyard-root .dockyard-objective-evaluate {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.dockyard-root .dockyard-project-head,
.dockyard-root .dockyard-project-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) 140px minmax(280px, 1fr) 110px;
  gap: 18px;
  align-items: center;
}
.dockyard-root .dockyard-project-head {
  padding: 9px 19px;
  border-top: 1px solid var(--dy-border);
  background: var(--dy-surface-subtle);
  color: var(--dy-text-3);
  font-size: 11px;
  font-weight: 680;
}
.dockyard-root .dockyard-project-row {
  min-height: 76px;
  padding: 14px 19px;
  border-top: 1px solid var(--dy-border);
}
.dockyard-root .dockyard-project-row:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-project-cell { min-width: 0; }
.dockyard-root .dockyard-project-cell.project {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}
.dockyard-root .dockyard-project-name {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.dockyard-root .dockyard-project-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  margin: 0;
}
.dockyard-root .dockyard-project-icon {
  width: 34px;
  height: 34px;
  margin: 0;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  align-self: center;
  border-radius: 9px;
  background: var(--dy-accent-soft);
  color: var(--dy-accent-text);
}
.dockyard-root .dockyard-project-icon svg { width: 17px; height: 17px; }
.dockyard-root .dockyard-project-name strong {
  display: block;
  min-width: 0;
  margin: 0;
  color: var(--dy-text);
  font-size: 14px;
  font-weight: 690;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
.dockyard-root .dockyard-approval-main h2,
.dockyard-root .dockyard-notification-main h3 {
  display: block;
  margin: 0;
  overflow: hidden;
  color: var(--dy-text);
  font-size: 14px;
  font-weight: 690;
  line-height: 1.35;
  text-overflow: ellipsis;
}
.dockyard-root .dockyard-project-mission,
.dockyard-root .dockyard-meta {
  display: block;
  margin-top: 3px;
  color: var(--dy-text-3);
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.dockyard-root .dockyard-project-mission { margin-top: 0; text-wrap: pretty; }
.dockyard-root .dockyard-status-tag {
  min-height: 25px;
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: max-content;
  max-width: 100%;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.dockyard-root .dockyard-status-mark { width: 7px; height: 7px; flex: 0 0 auto; border: 1.5px solid currentColor; border-radius: 50%; }
.dockyard-root .dockyard-status-tag.success { color: var(--dy-success); background: var(--dy-success-bg); }
.dockyard-root .dockyard-status-tag.success .dockyard-status-mark { background: currentColor; }
.dockyard-root .dockyard-status-tag.warning { color: var(--dy-warning); background: var(--dy-warning-bg); }
.dockyard-root .dockyard-status-tag.warning .dockyard-status-mark { border-radius: 1px; transform: rotate(45deg); }
.dockyard-root .dockyard-status-tag.danger { color: var(--dy-danger); background: var(--dy-danger-bg); }
.dockyard-root .dockyard-status-tag.danger .dockyard-status-mark { border-radius: 1px; background: currentColor; }
.dockyard-root .dockyard-status-tag.info { color: var(--dy-info); background: var(--dy-info-bg); }
.dockyard-root .dockyard-status-tag.neutral { color: var(--dy-neutral); background: var(--dy-neutral-bg); }
.dockyard-root .dockyard-status-tag.neutral .dockyard-status-mark { border-style: dashed; }
.dockyard-root .dockyard-work-stats { display: flex; align-items: baseline; gap: 13px; flex-wrap: wrap; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-work-stats strong { color: var(--dy-text); font-size: 13px; font-weight: 720; font-variant-numeric: tabular-nums; }
.dockyard-root .dockyard-alert-count { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-alert-count.has-alert { color: var(--dy-warning); font-weight: 680; }
.dockyard-root .dockyard-feed-group { overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); }
.dockyard-root .dockyard-approval-main { min-width: 0; }
.dockyard-root .dockyard-inline-error { margin: 10px 0 0; color: var(--dy-danger); font-size: 12px; }
.dockyard-root .dockyard-feed-group { margin-top: 14px; }
.dockyard-root .dockyard-feed-head { padding: 14px 17px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-feed-head h2 { font-size: 14px; }
.dockyard-root .dockyard-notification-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  grid-template-areas: "marker main action" "marker error action";
  gap: 5px 13px;
  align-items: center;
  min-height: 84px;
  padding: 15px 17px;
  border-top: 1px solid var(--dy-border);
}
.dockyard-root .dockyard-feed-head + .dockyard-notification-row { border-top: 0; }
.dockyard-root .dockyard-notification-row[data-notification-state="cleared"] { background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-notification-marker {
  grid-area: marker;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--dy-info);
  background: var(--dy-info-bg);
}
.dockyard-root .dockyard-notification-marker.warning { color: var(--dy-warning); background: var(--dy-warning-bg); }
.dockyard-root .dockyard-notification-marker.danger { color: var(--dy-danger); background: var(--dy-danger-bg); }
.dockyard-root .dockyard-notification-marker svg { width: 16px; height: 16px; }
.dockyard-root .dockyard-notification-main { grid-area: main; min-width: 0; }
.dockyard-root .dockyard-notification-main h3 { font-size: 14px; }
.dockyard-root .dockyard-notification-main p { margin: 4px 0 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-notification-row[data-notification-state="cleared"] .dockyard-notification-main h3 { color: var(--dy-text-2); }
.dockyard-root .dockyard-notification-action { grid-area: action; display: flex; align-items: center; justify-content: flex-end; }
.dockyard-root .dockyard-skeleton-page { display: grid; gap: 18px; }
.dockyard-root .dockyard-skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 7px;
  background: var(--dy-surface-strong);
}
.dockyard-root .dockyard-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--dy-surface), transparent);
  transform: translateX(-100%);
  animation: dockyard-skeleton-shimmer 1.4s ease-in-out infinite;
}
.dockyard-root .dockyard-skeleton.title { width: min(340px, 68%); height: 31px; }
.dockyard-root .dockyard-skeleton.copy { width: min(570px, 86%); height: 14px; }
.dockyard-root .dockyard-skeleton.summary { height: 200px; border-radius: 14px; }
.dockyard-root .dockyard-skeleton.row { height: 72px; border-radius: 0; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-state-panel {
  min-height: 320px;
  padding: 62px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-state-panel h2 { margin: 0; color: var(--dy-text); font-size: 19px; letter-spacing: -0.02em; }
.dockyard-root .dockyard-state-panel p { max-width: 480px; margin: 8px 0 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-state-panel .dockyard-button { margin-top: 18px; }
.dockyard-root .dockyard-error-icon { color: var(--dy-danger); background: var(--dy-danger-bg); }
@keyframes dockyard-skeleton-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
@container dockyard (max-width: 980px) {
  .dockyard-root .dockyard-overview-grid { grid-template-columns: 1fr; }
}
@container dockyard (max-width: 820px) {
  .dockyard-root .dockyard-shell { padding: 14px 16px 34px; }
  .dockyard-root .dockyard-consolebar { align-items: flex-start; margin-bottom: 24px; }
  .dockyard-root .dockyard-brand-copy span { display: none; }
  .dockyard-root .dockyard-page-head { align-items: stretch; }
  .dockyard-root .dockyard-project-head { display: none; }
  /* Narrow screens: the priority reason is secondary audit metadata — it
     stays in the row tooltip, the details drawer and the rank dialog, so
     the inline cell collapses instead of clipping. */
  .dockyard-root .cell-reason { display: none; }
  .dockyard-root .dockyard-project-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "project health" "work alerts";
    gap: 12px 16px;
    min-height: 104px;
  }
  .dockyard-root .dockyard-project-cell.project { grid-area: project; }
  .dockyard-root .dockyard-project-cell.health { grid-area: health; justify-self: end; }
  .dockyard-root .dockyard-project-cell.work { grid-area: work; }
  .dockyard-root .dockyard-project-cell.alerts { grid-area: alerts; justify-self: end; }
  .dockyard-root .dockyard-notification-row {
    grid-template-columns: 36px minmax(0, 1fr);
    grid-template-areas: "marker main" ". action" ". error";
    align-items: start;
  }
  .dockyard-root .dockyard-notification-action { justify-content: flex-start; }
}
@container dockyard (max-width: 640px) {
  .dockyard-root .dockyard-consolebar { flex-direction: column; }
  .dockyard-root .dockyard-tabs { flex-wrap: wrap; width: 100%; }
  .dockyard-root .dockyard-page-head { flex-direction: column; }
}
/* Reference-benchmark composition: action card, metric strip, split content and evidence cards. */
.dockyard-root .dockyard-consolebar {
  min-height: 72px;
  margin: -18px -20px 32px;
  padding: 12px 20px;
  border: 0;
  border-bottom: 1px solid var(--dy-border);
  border-radius: 0;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-page-head { margin-bottom: 26px; }
.dockyard-root .dockyard-page-actions { align-items: center; justify-content: flex-end; }
.dockyard-root .dockyard-owed-pill {
  min-height: 34px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  color: var(--dy-warning);
  background: var(--dy-warning-bg);
  font-size: 12px;
  font-weight: 720;
  white-space: nowrap;
}
.dockyard-root .dockyard-owed-pill .dockyard-status-mark { background: currentColor; }
.dockyard-root .dockyard-button.danger {
  color: var(--dy-danger);
  border-color: var(--dy-danger);
  background: var(--dy-surface);
}
.dockyard-root .dockyard-button.danger:hover { background: var(--dy-danger-bg); }
.dockyard-root .dockyard-button.quiet { color: var(--dy-text-2); border-color: transparent; background: transparent; }
.dockyard-root .dockyard-button.quiet:hover { color: var(--dy-text); background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-attention-card {
  display: grid;
  grid-template-columns: minmax(210px, .7fr) minmax(0, 1.3fr);
  gap: 26px;
  margin-bottom: 18px;
  padding: 24px;
  border: 1px solid var(--dy-accent-border);
  border-radius: 16px;
  background: linear-gradient(145deg, var(--dy-accent-soft), var(--dy-surface));
  box-shadow: var(--dy-shadow);
}
.dockyard-root .dockyard-attention-card.is-clear { grid-template-columns: 1fr; }
.dockyard-root .dockyard-attention-summary { align-self: center; }
.dockyard-root .dockyard-attention-summary h2,
.dockyard-root .dockyard-attention-copy h2 { margin: 0; color: var(--dy-text); font-size: 20px; letter-spacing: -0.02em; }
.dockyard-root .dockyard-attention-summary p { margin: 9px 0 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-attention-summary .dockyard-button { margin-top: 16px; }
.dockyard-root .dockyard-attention-list { display: grid; gap: 8px; margin-top: 12px; }
.dockyard-root .dockyard-attention-decision {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 13px 14px;
  border: 1px solid var(--dy-border);
  border-radius: 11px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-attention-decision strong { display: block; color: var(--dy-text); font-size: 14px; }
.dockyard-root .dockyard-attention-decision span.dockyard-meta { margin-top: 3px; }
.dockyard-root .dockyard-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-bottom: 18px;
  overflow: hidden;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-border);
}
.dockyard-root .dockyard-metric {
  min-height: 112px;
  padding: 18px 20px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-metric span { display: block; color: var(--dy-text-3); font-size: 11px; font-weight: 700; }
.dockyard-root .dockyard-metric strong { display: block; margin-top: 8px; color: var(--dy-text); font-size: 25px; line-height: 1.05; letter-spacing: -0.03em; }
.dockyard-root .dockyard-metric strong.success { color: var(--dy-success); }
.dockyard-root .dockyard-metric strong.warning { color: var(--dy-warning); }
.dockyard-root .dockyard-metric small { display: block; margin-top: 10px; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-portfolio-visual {
  display: grid;
  grid-template-columns: minmax(220px, .65fr) minmax(0, 1.35fr);
  gap: 24px;
  align-items: center;
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-portfolio-copy h2 { margin: 0; color: var(--dy-text); font-size: 17px; }
.dockyard-root .dockyard-portfolio-copy p { margin: 5px 0 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-portfolio-chart { min-width: 0; }
.dockyard-root .dockyard-work-visual {
  width: 100%;
  height: 11px;
  display: flex;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dy-surface-strong);
}
.dockyard-root .dockyard-work-visual.compact { max-width: 230px; height: 5px; margin-top: 8px; }
.dockyard-root .dockyard-work-visual > span { display: block; height: 100%; }
.dockyard-root .dockyard-work-visual > .backlog { background: var(--dy-neutral); }
.dockyard-root .dockyard-work-visual > .active { background: var(--dy-action); }
.dockyard-root .dockyard-work-visual > .done { background: var(--dy-success); }
.dockyard-root .dockyard-work-visual > .danger { background: var(--dy-danger); }
.dockyard-root .dockyard-work-legend { display: flex; align-items: center; gap: 16px; margin-top: 10px; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-work-legend span { display: inline-flex; align-items: center; gap: 6px; }
.dockyard-root .dockyard-work-legend i { width: 8px; height: 8px; border-radius: 2px; background: var(--dy-neutral); }
.dockyard-root .dockyard-work-legend .active i { background: var(--dy-action); }
.dockyard-root .dockyard-work-legend .done i { background: var(--dy-success); }
.dockyard-root .dockyard-project-toolbar {
  display: flex; flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 4px;
  overflow-x: auto;
  border: 1px solid var(--dy-border);
  border-radius: 11px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-project-toolbar > label { padding-left: 8px; color: var(--dy-text-3); font-size: 11px; font-weight: 700; }
.dockyard-root .dockyard-project-toolbar select {
  min-height: 36px;
  padding: 6px 9px;
  border: 1px solid var(--dy-control-border);
  border-radius: 7px;
  background: var(--dy-surface);
  color: var(--dy-text);
  font: inherit;
}
.dockyard-root .dockyard-project-tabs { display: flex; gap: 2px; margin-left: auto; }
.dockyard-root .dockyard-project-tabs button {
  min-height: 36px;
  padding: 7px 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dy-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 680;
}
.dockyard-root .dockyard-project-tabs button.active { color: var(--dy-accent-text); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-project-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr); gap: 18px; }
.dockyard-root .dockyard-feature-card {
  padding: 20px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-feature-card h2 { margin: 9px 0 0; color: var(--dy-text); font-size: 20px; letter-spacing: -0.02em; }
.dockyard-root .dockyard-feature-card p { margin: 8px 0 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-project-hero { background: linear-gradient(145deg, var(--dy-accent-soft), var(--dy-surface)); border-color: var(--dy-accent-border); }
.dockyard-root .dockyard-project-hero .dockyard-work-visual { margin-top: 20px; }
.dockyard-root .dockyard-project-overview-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(260px, .8fr); gap: 14px; margin-top: 14px; }
.dockyard-root .dockyard-overview-card { min-width: 0; padding: 17px; }
.dockyard-root .dockyard-overview-card > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dockyard-root .dockyard-overview-card > header h2 { margin: 0; font-size: 16px; }
.dockyard-root .dockyard-overview-card > header > span { min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; background: var(--dy-neutral-bg); color: var(--dy-neutral); font-size: 10px; font-weight: 760; }
.dockyard-root .dockyard-overview-card > p { margin-top: 4px; font-size: 11px; }
.dockyard-root .dockyard-overview-list { display: grid; gap: 0; margin-top: 13px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-overview-list article { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; min-width: 0; padding: 10px 0; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dockyard-overview-list article:last-child { border-bottom: 0; padding-bottom: 0; }
.dockyard-root .dockyard-overview-list article > span:first-child { min-width: 0; }
.dockyard-root .dockyard-overview-list strong,
.dockyard-root .dockyard-overview-list small { display: block; min-width: 0; }
.dockyard-root .dockyard-overview-list strong { overflow: hidden; color: var(--dy-text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-overview-list small { margin-top: 3px; overflow: hidden; color: var(--dy-text-3); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-overview-list .dockyard-status-tag { max-width: 118px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-overview-list.activity article { grid-template-columns: 1fr; }
.dockyard-root .dockyard-card-label { color: var(--dy-text-3); font-size: 10px; font-weight: 760; }
.dockyard-root .dockyard-policy-summary { margin: 15px 0 0; padding: 13px; overflow: auto; border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font: 11px/1.5 ui-monospace, monospace; }
.dockyard-root .dockyard-section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dockyard-root .dockyard-section-head h2,
.dockyard-root .dockyard-section-head p { margin: 0; }
.dockyard-root .dockyard-section-head p { margin-top: 5px; }
.dockyard-root .dockyard-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 20px; }
.dockyard-root .dockyard-field { display: grid; align-content: start; gap: 6px; min-width: 0; color: var(--dy-text-2); font-size: 11px; font-weight: 700; }
.dockyard-root .dockyard-field-wide { grid-column: 1 / -1; }
.dockyard-root .dockyard-field input,
.dockyard-root .dockyard-field textarea,
.dockyard-root .dockyard-field select {
  width: 100%;
  min-width: 0;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--dy-control-border);
  border-radius: 8px;
  background: var(--dy-surface);
  color: var(--dy-text);
  font: 500 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.dockyard-root .dockyard-field textarea { resize: vertical; }
.dockyard-root .dockyard-check-field {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 58px;
  padding: 10px 11px;
  border: 1px solid var(--dy-border);
  border-radius: 9px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text);
}
.dockyard-root .dockyard-check-field input { width: 17px; height: 17px; margin: 1px 0 0; accent-color: var(--dy-action); }
.dockyard-root .dockyard-check-field span,
.dockyard-root .dockyard-check-field strong,
.dockyard-root .dockyard-check-field small { display: block; min-width: 0; }
.dockyard-root .dockyard-check-field strong { font-size: 11px; }
.dockyard-root .dockyard-check-field small { margin-top: 3px; color: var(--dy-text-3); font-size: 10px; font-weight: 500; line-height: 1.35; }
.dockyard-root .dockyard-settings-card > .dockyard-button { margin-top: 16px; }
.dockyard-root .dockyard-inline-success { margin: 14px 0 0; color: var(--dy-success); font-size: 12px; font-weight: 650; }
.dockyard-root .dockyard-reports-layout { display: grid; grid-template-columns: minmax(300px, .7fr) minmax(0, 1.3fr); gap: 18px; align-items: start; }
.dockyard-root .dockyard-report-builder > .dockyard-field,
.dockyard-root .dockyard-report-builder > .dockyard-check-field,
.dockyard-root .dockyard-report-builder > .dockyard-button { margin-top: 14px; }
.dockyard-root .dockyard-report-history-list { display: grid; gap: 7px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-report-history-list h3 { margin: 0 0 3px; font-size: 13px; }
.dockyard-root .dockyard-report-history-list button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--dy-border);
  border-radius: 8px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text);
  text-align: left;
  cursor: pointer;
}
.dockyard-root .dockyard-report-history-list button:hover,
.dockyard-root .dockyard-report-history-list button.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-report-history-list strong,
.dockyard-root .dockyard-report-history-list small { display: block; min-width: 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-report-history-list strong { font-size: 11px; }
.dockyard-root .dockyard-report-history-list small { margin-top: 3px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-report-history-list svg { width: 14px; height: 14px; }
.dockyard-root .dockyard-report-preview-card > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.dockyard-root .dockyard-report-preview-card h2 { margin: 4px 0 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-report-preview {
  max-height: 620px;
  margin: 18px 0 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 11px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
}
.dockyard-root .dockyard-report-placeholder { display: grid; place-items: center; min-height: 280px; margin-top: 18px; border: 1px dashed var(--dy-control-border); border-radius: 10px; color: var(--dy-text-3); text-align: center; }
.dockyard-root .dockyard-report-placeholder svg { width: 28px; height: 28px; }
.dockyard-root .dockyard-backlog-list { display: block; overflow: visible; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface); }
.dockyard-root .dockyard-cmdbar { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--dy-border); flex-wrap: wrap; }
.dockyard-root .cm-search { display: inline-flex; align-items: center; gap: 7px; min-width: 230px; flex: 1; max-width: 380px; padding: 6px 10px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text-3); }
.dockyard-root .cm-search:focus-within { border-color: var(--dy-accent-border); }
.dockyard-root .cm-search svg { width: 14px; height: 14px; flex: none; }
.dockyard-root .cm-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--dy-text); font: inherit; font-size: 12.5px; }
.dockyard-root .cm-search input::placeholder { color: var(--dy-text-3); }
.dockyard-root .cm-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border: 1px solid var(--dy-border); border-radius: 9px; background: transparent; color: var(--dy-text-2); font: 620 11.5px/1.2 inherit; cursor: pointer; white-space: nowrap; }
.dockyard-root .cm-chip:hover { border-color: var(--dy-control-border); color: var(--dy-text); }
.dockyard-root .cm-chip svg { width: 11px; height: 11px; }
.dockyard-root .cm-spacer { flex: 1; }
.dockyard-root .cm-count { font-size: 11px; color: var(--dy-text-3); white-space: nowrap; }
.dockyard-root .cm-anchor { position: relative; display: inline-flex; }
.dockyard-root .cm-anchor .cm-menu { top: calc(100% + 6px); left: 0; }
.dockyard-root .dockyard-filterbar { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; padding: 8px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .filterbar-title { color: var(--dy-text-3); font-size: 10px; font-weight: 760; letter-spacing: .06em; text-transform: uppercase; margin-right: 2px; }
.dockyard-root .cm-filter { display: inline-flex; align-items: center; gap: 6px; margin: 0; color: var(--dy-text-2); font-size: 10px; font-weight: 650; }
.dockyard-root .cm-filter select { max-width: 180px; min-width: 110px; height: 29px; padding: 4px 22px 4px 8px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface-subtle); color: var(--dy-text); font: 550 11px/1.2 inherit; }
.dockyard-root .cm-reset-filters { border: 0; border-radius: 6px; background: transparent; color: var(--dy-accent-text); font: 650 10px/1.2 inherit; padding: 6px 7px; cursor: pointer; }
.dockyard-root .cm-reset-filters:hover { background: var(--dy-accent-soft); }
.dockyard-root .backlog-create-toolbar { align-items: center; gap: 10px; }
.dockyard-root .backlog-create-toolbar .dockyard-meta { margin-right: auto; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root button.th-sort { border: 0; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; display: inline-flex; gap: 3px; align-items: center; padding: 0; }
.dockyard-root .th-cell { flex: none; }
.dockyard-root .th-type, .dockyard-root .tree-type-cell { width: 82px; flex: none; }
.dockyard-root .th-title { flex: 1; min-width: 200px; }
.dockyard-root .th-initiative, .dockyard-root .tree-initiative { width: 140px; flex: none; }
.dockyard-root .th-estimate { width: 70px; text-align: right; justify-content: flex-end; }
.dockyard-root .tree-estimate { width: 70px; flex: none; text-align: right; color: var(--dy-text-2); font-size: 11px; font-variant-numeric: tabular-nums; }
.dockyard-root .tree-estimate.is-empty { color: var(--dy-text-3); }
.dockyard-root .tree-type-cell { display: inline-flex; align-items: center; gap: 6px; min-width: 0; color: var(--dy-text-2); font-size: 10.5px; white-space: nowrap; }
.dockyard-root .tree-type-cell > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.dockyard-root .tree-type-cell .tree-type { width: 14px; }
.dockyard-root .tree-title { flex: 1; min-width: 200px; }
.dockyard-root .tree-initiative { min-width: 0; overflow: hidden; }
.dockyard-root .initiative-cell-value { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.dockyard-root .initiative-cell-value strong { overflow: hidden; color: var(--dy-text-2); font-size: 10.5px; font-weight: 640; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .initiative-cell-value small { overflow: hidden; color: var(--dy-text-3); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .initiative-cell-empty { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .tree-menu-field { display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; gap: 8px; margin: 2px 0; padding: 5px 8px; color: var(--dy-text-2); font-size: 11px; font-weight: 620; }
.dockyard-root .tree-menu-field select { width: 100%; min-width: 0; margin: 0; }
.dockyard-root .tree-menu-static { display: flex; justify-content: space-between; padding: 7px 9px; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .tree-menu-static strong { color: var(--dy-text-2); font-weight: 650; }
.dockyard-root .tree-menu-rank-actions, .dockyard-root .tree-menu-status-actions { margin-top: 4px; padding-top: 3px; border-top: 1px solid var(--dy-border); }
@media (max-width: 760px) {
  .dockyard-root .th-who, .dockyard-root .tree-who { display: none !important; }
  .dockyard-root .th-title, .dockyard-root .tree-title { min-width: 220px; }
}
@media (max-width: 1180px) {
  .dockyard-root .th-rank, .dockyard-root .tree-rank,
  .dockyard-root .th-estimate, .dockyard-root .tree-estimate,
  .dockyard-root .th-due, .dockyard-root .tree-due { display: none !important; }
  .dockyard-root .th-gutter, .dockyard-root .tree-gutter { width: 52px; }
  .dockyard-root .th-type, .dockyard-root .tree-type-cell { width: 76px; }
  .dockyard-root .th-status, .dockyard-root .tree-status { width: 88px; }
  .dockyard-root .th-initiative, .dockyard-root .tree-initiative { width: 120px; }
  .dockyard-root .th-who, .dockyard-root .tree-who { width: 104px; }
  .dockyard-root .th-title, .dockyard-root .tree-title { min-width: 150px; }
}

.dockyard-root .cm-menu { position: absolute; top: 44px; z-index: 40; min-width: 200px; max-height: 62vh; overflow: auto; padding: 5px; display: grid; gap: 1px; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface-strong); box-shadow: var(--dy-shadow); }
.dockyard-root .cm-menu button { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--dy-text); font: 560 12px/1.2 inherit; cursor: pointer; text-align: left; }
.dockyard-root .cm-menu button:hover { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .cm-menu .menu-label { font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--dy-text-3); padding: 7px 9px 3px; font-weight: 760; }
.dockyard-root .tree-head { display: flex; align-items: center; gap: 8px; padding: 0 12px 0 10px; min-height: 26px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); color: var(--dy-text-3); font-size: 9.5px; font-weight: 760; letter-spacing: .07em; text-transform: uppercase; user-select: none; }
.dockyard-root button.th-sort { border: 0; background: transparent; color: inherit; font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer; display: inline-flex; gap: 3px; align-items: center; padding: 0; }
.dockyard-root button.th-sort:hover { color: var(--dy-text-2); }
.dockyard-root button.th-sort.active { color: var(--dy-accent-text); }
.dockyard-root button.th-sort svg { width: 9px; height: 9px; opacity: 0; }
.dockyard-root button.th-sort.active svg { opacity: .8; transform: none; }
.dockyard-root button.th-sort.active[data-dir="desc"] svg { transform: rotate(180deg); }
.dockyard-root .th-gutter { width: 60px; flex: none; }
.dockyard-root .th-cell { flex: none; }
.dockyard-root .th-rank { width: 54px; text-align: right; justify-content: flex-end; }
.dockyard-root .th-status { width: 100px; }
.dockyard-root .th-who { width: 118px; }
.dockyard-root .th-due { width: 86px; text-align: right; justify-content: flex-end; }
.dockyard-root .th-act { width: 26px; }
.dockyard-root .tree-group-head { display: flex; align-items: center; gap: 7px; padding: 5px 12px; background: var(--dy-surface-subtle); border-bottom: 1px solid var(--dy-border); font-size: 11px; font-weight: 720; color: var(--dy-text-2); }
.dockyard-root .tree-group-head .grp-count { font-weight: 500; color: var(--dy-text-3); }
.dockyard-root .dockyard-tree-row { position: relative; display: flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 12px 0 10px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dockyard-tree-row:last-child { border-bottom: 0; }
.dockyard-root .dockyard-tree-row:hover { background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-tree-row { cursor: pointer; }
.dockyard-root .dockyard-tree-row:hover .cell-title { color: var(--dy-accent-text); }
.dockyard-root .import-drop { border: 1.5px dashed var(--dy-control-border); border-radius: 10px; padding: 16px 12px; text-align: center; color: var(--dy-text-3); font-size: 12px; margin: 8px 0; }
.dockyard-root .import-drop.dragover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .import-drop strong { color: var(--dy-text-2); }
.dockyard-root .tree-gutter { flex: none; width: 60px; display: inline-flex; align-items: center; }
.dockyard-root .tree-guide { position: relative; flex: none; width: 17px; height: 34px; }
.dockyard-root .tree-guide.line::before, .dockyard-root .tree-guide.tee::before { content: ''; position: absolute; left: 8px; top: 0; bottom: 0; width: 1.5px; background: color-mix(in srgb, var(--dy-control-border) 45%, transparent); }
.dockyard-root .tree-guide.elbow::before { content: ''; position: absolute; left: 8px; top: 0; height: 17px; width: 1.5px; background: color-mix(in srgb, var(--dy-control-border) 45%, transparent); }
.dockyard-root .tree-guide.elbow::after, .dockyard-root .tree-guide.tee::after { content: ''; position: absolute; left: 8px; top: 16px; width: 9px; height: 1.5px; background: color-mix(in srgb, var(--dy-control-border) 45%, transparent); }
.dockyard-root .tree-twisty { flex: none; width: 17px; height: 17px; display: inline-grid; place-items: center; border: 0; border-radius: 5px; background: transparent; color: var(--dy-text-2); cursor: pointer; padding: 0; }
.dockyard-root .tree-twisty:hover { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .tree-twisty svg { width: 11px; height: 11px; transition: transform .15s ease; }
.dockyard-root .tree-twisty[aria-expanded="false"] svg { transform: rotate(-90deg); }
.dockyard-root .tree-type { flex: none; width: 16px; height: 16px; display: inline-grid; place-items: center; color: var(--dy-text-2); }
.dockyard-root .tree-type svg { width: 13px; height: 13px; }
.dockyard-root .tree-type.epic { color: var(--dy-info); }
.dockyard-root .tree-type.feature { color: var(--dy-accent-text); }
.dockyard-root .tree-type.initiative { color: var(--dy-info); }
.dockyard-root .tree-type.bug { color: var(--dy-danger); }
.dockyard-root .tree-type.spike { color: var(--dy-warning); }
.dockyard-root .tree-check { flex: none; width: 13px; height: 13px; accent-color: var(--dy-action); opacity: 0; margin: 0 4px 0 0; }
.dockyard-root .dockyard-tree-row:hover .tree-check, .dockyard-root .tree-check:checked { opacity: 1; }
.dockyard-root .tree-title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.dockyard-root .tree-title-stack { display: flex; flex-direction: column; align-items: flex-start; min-width: 0; flex: 1; gap: 1px; }
.dockyard-root .tree-title-line { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; max-width: 100%; }
.dockyard-root .tree-title .tree-desc { align-self: flex-start; padding-left: 2px; }
.dockyard-root .cell-edit { border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 3px 5px; font: inherit; color: var(--dy-text); min-width: 0; cursor: text; text-align: left; }
.dockyard-root .cell-edit:hover { border-color: var(--dy-control-border); background: var(--dy-surface); }
.dockyard-root .cell-edit:focus-within, .dockyard-root .cell-edit.is-input { border-color: var(--dy-accent-border); background: var(--dy-surface); outline: none; }
.dockyard-root .cell-edit:disabled { cursor: not-allowed; opacity: .6; }
.dockyard-root .cell-title { display: block; font-size: 12.5px; font-weight: 560; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.dockyard-root .tree-ref-chip { flex: none; padding: 1px 6px; border: 1px solid var(--dy-border); border-radius: 5px; background: var(--dy-surface-subtle); color: var(--dy-text-3); font-size: 9.5px; font-weight: 700; letter-spacing: .03em; }
.dockyard-root .tree-desc { color: var(--dy-text-3); font-size: 11px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.dockyard-root .cell-title-input { border: 0; outline: 0; background: transparent; font: inherit; font-weight: 600; color: var(--dy-text); width: 100%; min-width: 0; }
.dockyard-root .cell-reason { font-size: 10.5px; color: var(--dy-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: none; max-width: 30%; }
.dockyard-root .cell-reason:hover { color: var(--dy-text-2); }
.dockyard-root .tree-rank { flex: none; width: 54px; text-align: right; display: inline-flex; justify-content: flex-end; }
.dockyard-root .tree-rank .cell-rank { font: 620 11px/1 ui-monospace, SFMono-Regular, monospace; color: var(--dy-text-3); text-align: right; }
.dockyard-root .tree-rank input { width: 46px; text-align: right; font: 620 11px/1 ui-monospace, SFMono-Regular, monospace; border: 1px solid var(--dy-accent-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); outline: none; padding: 3px 4px; }
.dockyard-root .tree-status { flex: none; width: 100px; }
.dockyard-root .cell-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dy-text-2); width: 100%; }
.dockyard-root .cell-status:hover { color: var(--dy-text); }
.dockyard-root .tree-status-icon { flex: none; width: 11px; height: 11px; border-radius: 50%; border: 1.6px solid currentColor; box-sizing: border-box; position: relative; }
.dockyard-root .tree-status.neutral .tree-status-icon { color: var(--dy-text-3); }
.dockyard-root .tree-status.info .tree-status-icon { color: var(--dy-info); }
.dockyard-root .tree-status.warning .tree-status-icon { color: var(--dy-warning); }
.dockyard-root .tree-status.danger .tree-status-icon { color: var(--dy-danger); }
.dockyard-root .tree-status.success .tree-status-icon { color: var(--dy-success); }
.dockyard-root .tree-status.info .tree-status-icon::before { content: ''; position: absolute; inset: -1.6px; border-radius: 50%; background: conic-gradient(currentColor 0 270deg, transparent 270deg); }
.dockyard-root .tree-status.warning .tree-status-icon::before { content: ''; position: absolute; inset: -1.6px; border-radius: 50%; background: conic-gradient(currentColor 0 180deg, transparent 180deg); }
.dockyard-root .tree-status.danger .tree-status-icon::before { content: ''; position: absolute; left: 1.5px; right: 1.5px; top: 50%; height: 1.6px; margin-top: -.8px; background: currentColor; }
.dockyard-root .tree-status.success .tree-status-icon { background: currentColor; }
.dockyard-root .tree-status.success .tree-status-icon::before { content: ''; position: absolute; left: 2px; top: 0; width: 3.5px; height: 6px; border: solid var(--dy-surface); border-width: 0 1.6px 1.6px 0; transform: rotate(45deg); }
.dockyard-root .tree-who { flex: none; width: 118px; }
.dockyard-root .cell-who { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dy-text-2); width: 100%; min-width: 0; }
.dockyard-root .cell-who:hover { color: var(--dy-text); }
.dockyard-root .tree-avatar { flex: none; width: 19px; height: 19px; display: inline-grid; place-items: center; border-radius: 6px; color: #fff; background: var(--dy-info); font-size: 8px; font-weight: 800; }
.dockyard-root .tree-avatar.none { background: var(--dy-neutral-bg); color: var(--dy-text-3); border: 1px dashed var(--dy-control-border); }
.dockyard-root .who-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .tree-due { flex: none; width: 86px; display: inline-flex; justify-content: flex-end; position: relative; }
.dockyard-root .cell-due { font-size: 11px; color: var(--dy-text-3); font-variant-numeric: tabular-nums; text-align: right; width: 100%; }
.dockyard-root .cell-due.empty { opacity: 0; }
.dockyard-root .dockyard-tree-row:hover .cell-due.empty { opacity: .7; }
.dockyard-root .cell-due.overdue { color: var(--dy-danger); font-weight: 700; opacity: 1; }
.dockyard-root .cell-due-input { border: 1px solid var(--dy-accent-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 11px; outline: none; padding: 3px 4px; color-scheme: light dark; width: 118px; position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 30; box-shadow: var(--dy-shadow); }
.dockyard-root .tree-actions { flex: none; width: 26px; display: flex; justify-content: flex-end; }
.dockyard-root .tree-menu-btn { width: 24px; height: 24px; border: 0; border-radius: 6px; background: transparent; color: var(--dy-text-2); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 0 4px; opacity: 0; }
.dockyard-root .dockyard-tree-row:hover .tree-menu-btn, .dockyard-root .tree-menu-btn[aria-expanded="true"] { opacity: .9; }
.dockyard-root .tree-menu-btn:hover { background: var(--dy-surface-strong); color: var(--dy-text); }
.dockyard-root .tree-menu { position: absolute; right: 10px; top: 32px; z-index: 50; min-width: 218px; max-height: 62vh; overflow: auto; padding: 5px; display: grid; gap: 1px; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface-strong); box-shadow: var(--dy-shadow); }
.dockyard-root .tree-menu .menu-label { font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--dy-text-3); padding: 7px 9px 3px; font-weight: 760; }
.dockyard-root .tree-menu button { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 0; border-radius: 7px; background: transparent; color: var(--dy-text); font: 560 12px/1.2 inherit; cursor: pointer; text-align: left; width: 100%; }
.dockyard-root .tree-menu button svg, .dockyard-root .cm-menu button svg { width: 13px; height: 13px; flex: none; }
.dockyard-root .tree-menu button:hover:not(:disabled) { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .tree-menu button:disabled { opacity: .45; cursor: not-allowed; }
.dockyard-root .tree-menu button.danger:hover:not(:disabled) { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .tree-menu select { margin: 0 9px 2px; padding: 4px 6px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: 560 11.5px/1.3 inherit; outline: none; }
.dockyard-root .sel-pop { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 90; display: flex; align-items: center; gap: 3px; padding: 7px 9px; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface-strong); box-shadow: var(--dy-shadow); }
.dockyard-root .sel-pop .sel-count { font-size: 12px; font-weight: 760; color: var(--dy-accent-text); padding: 0 8px 0 3px; white-space: nowrap; }
.dockyard-root .sel-pop .sel-sep { width: 1px; align-self: stretch; background: var(--dy-border); margin: 2px 5px; }
.dockyard-root .sel-pop button { border: 0; background: transparent; color: var(--dy-text-2); font: 590 11.5px/1.2 inherit; padding: 6px 9px; border-radius: 8px; cursor: pointer; white-space: nowrap; }
.dockyard-root .sel-pop button:hover:not(:disabled) { background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .sel-pop button:disabled { opacity: .5; cursor: not-allowed; }
.dockyard-root .sel-pop select { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: 590 11.5px/1.2 inherit; padding: 5px 7px; outline: none; }
.dockyard-root .tree-parent { font-size: 10.5px; color: var(--dy-text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: none; max-width: 180px; }
.dockyard-root .field-required { color: var(--dy-text); }
.dockyard-root .field-required::after { content: ' *'; color: var(--dy-danger); font-weight: 760; }
.dockyard-root .field-optional-hint { color: var(--dy-text-3); font-weight: 500; }
.dockyard-root .field-optional-hint::after { content: ' (optional)'; color: var(--dy-text-3); font-weight: 500; }
.dockyard-root .create-help { margin: -2px 0 0; font-size: 10.5px; color: var(--dy-text-3); }
.dockyard-root .create-help.bad { color: var(--dy-danger); }
.dockyard-root .drag-grip { flex: none; width: 12px; color: var(--dy-text-3); opacity: 0; cursor: grab; font-size: 11px; letter-spacing: -2px; user-select: none; }
.dockyard-root .dockyard-tree-row:hover .drag-grip { opacity: .6; }
.dockyard-root .tree-dragging { opacity: .5; }
.dockyard-root .tree-drop { box-shadow: inset 0 2px 0 var(--dy-info); }
.dockyard-root .dockyard-backlog-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid var(--dy-border);
  border-radius: 12px;
  background: var(--dy-surface);
  cursor: grab;
}
.dockyard-root .dockyard-backlog-item:active { cursor: grabbing; }
.dockyard-root .dockyard-rank { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; color: var(--dy-accent-text); background: var(--dy-accent-soft); font-weight: 760; }
.dockyard-root .dockyard-backlog-copy { min-width: 0; }
.dockyard-root .dockyard-backlog-copy strong { display: block; color: var(--dy-text); font-size: 14px; }
.dockyard-root .dockyard-backlog-copy span { display: block; margin-top: 3px; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-rank-actions { display: flex; gap: 6px; }
.dockyard-root .dockyard-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(12, 17, 28, .48);
  backdrop-filter: blur(3px);
}
.dockyard-root .dockyard-modal-layer[hidden] { display: none; }
.dockyard-root .dockyard-modal { width: min(540px, 100%); max-height: calc(100vh - 40px); padding: 22px; overflow-y: auto; border: 1px solid var(--dy-border); border-radius: 16px; background: var(--dy-surface); box-shadow: var(--dy-shadow); }
.dockyard-root .dockyard-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dockyard-root .dockyard-modal-head > div { min-width: 0; }
.dockyard-root .dockyard-detail-modal { width: min(920px, 100%); }
.dockyard-root .dockyard-detail-columns { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 18px; align-items: start; margin-top: 14px; }
.dockyard-root .dockyard-detail-side { display: grid; gap: 2px; align-content: start; padding: 14px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-side h3 { margin: 6px 0 2px; font-size: 12px; }
.dockyard-root .dockyard-field-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.dockyard-root .dockyard-field-pair label { min-width: 0; }
.dockyard-root .dockyard-field-pair input, .dockyard-root .dockyard-field-pair select { width: 100%; min-width: 0; }
.dockyard-root .dockyard-dirty-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; padding: 8px 12px; border: 1px solid var(--dy-warning); border-radius: 9px; background: var(--dy-warning-bg); color: var(--dy-warning); font-size: 12px; font-weight: 700; }
.dockyard-root .dockyard-dirty-actions { display: flex; gap: 8px; }
.dockyard-root .dockyard-dirty-note { color: var(--dy-warning); font-size: 12px; font-weight: 700; }
.dockyard-root .dockyard-dirty-confirm { margin-top: 12px; padding: 14px; border: 1px solid var(--dy-warning); border-radius: 10px; background: var(--dy-warning-bg); }
.dockyard-root .dockyard-dirty-confirm p { margin: 6px 0 10px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root .dockyard-dirty-confirm .dockyard-modal-actions { margin: 0; }
.dockyard-root .dockyard-detail-footer { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 18px 0 0; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-border); }
.dockyard-root .dockyard-detail-grid > div { min-width: 0; padding: 12px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-grid dt { color: var(--dy-text-3); font-size: 9px; font-weight: 760; letter-spacing: .05em; text-transform: uppercase; }
.dockyard-root .dockyard-detail-grid dd { margin: 4px 0 0; overflow-wrap: anywhere; color: var(--dy-text); font-size: 12px; font-weight: 650; }
.dockyard-root .dockyard-modal h2 { margin: 0; font-size: 20px; }
.dockyard-root .dockyard-modal p { margin: 7px 0 16px; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-modal label { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 700; }
.dockyard-root .dockyard-work-editor { display: grid; gap: 2px; }
.dockyard-root .dockyard-work-editor input,
.dockyard-root .dockyard-work-editor select { width: 100%; min-width: 0; min-height: 34px; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface-subtle); color: var(--dy-text); font: inherit; box-sizing: border-box; }
.dockyard-root .dockyard-modal textarea { width: 100%; min-height: 110px; padding: 10px 11px; border: 1px solid var(--dy-control-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text); font: inherit; resize: vertical; }
.dockyard-root .dockyard-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.dockyard-root .dockyard-toast-region {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 140;
  width: min(390px, calc(100vw - 32px));
  display: grid;
  gap: 9px;
  pointer-events: none;
}
.dockyard-root .dockyard-toast {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 28px;
  gap: 10px;
  align-items: center;
  min-height: 52px;
  padding: 10px 11px;
  border: 1px solid var(--dy-border);
  border-left: 4px solid var(--dy-success);
  border-radius: 10px;
  background: var(--dy-surface);
  color: var(--dy-text);
  box-shadow: var(--dy-shadow);
  pointer-events: auto;
  font-size: 12px;
  font-weight: 650;
}
.dockyard-root .dockyard-toast.danger { border-left-color: var(--dy-danger); }
.dockyard-root .dockyard-toast-icon { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: var(--dy-success-bg); color: var(--dy-success); }
.dockyard-root .dockyard-toast.danger .dockyard-toast-icon { background: var(--dy-danger-bg); color: var(--dy-danger); }
.dockyard-root .dockyard-toast-icon svg { width: 16px; height: 16px; }
.dockyard-root .dockyard-toast button,
.dockyard-root .dockyard-modal-close { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: var(--dy-text-2); cursor: pointer; font-size: 20px; line-height: 1; }
.dockyard-root .dockyard-toast button:hover,
.dockyard-root .dockyard-modal-close:hover { background: var(--dy-surface-strong); color: var(--dy-text); }
.dockyard-root .dockyard-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(12, 17, 28, .58);
  backdrop-filter: blur(4px);
}
.dockyard-root .dockyard-onboarding {
  width: min(860px, 100%);
  max-height: min(820px, calc(100vh - 40px));
  overflow-y: auto;
  border: 1px solid var(--dy-border);
  border-radius: 18px;
  background: var(--dy-surface);
  color: var(--dy-text);
  box-shadow: 0 24px 80px rgba(5, 9, 18, .34);
}
.dockyard-root .dockyard-onboarding-head { display: flex; justify-content: space-between; gap: 20px; padding: 23px 24px 18px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dockyard-onboarding-head h2 { margin: 5px 0 0; font-size: 23px; letter-spacing: -.025em; }
.dockyard-root .dockyard-onboarding-head p { margin: 5px 0 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-wizard-progress { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; padding: 14px 24px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-wizard-progress > div { display: grid; grid-template-columns: 27px minmax(0, 1fr); gap: 8px; align-items: center; min-width: 0; color: var(--dy-text-3); }
.dockyard-root .dockyard-wizard-progress > div > span:first-child { width: 25px; height: 25px; display: grid; place-items: center; border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface); font-size: 10px; font-weight: 750; }
.dockyard-root .dockyard-wizard-progress > div.complete { color: var(--dy-accent-text); }
.dockyard-root .dockyard-wizard-progress > div.complete > span:first-child { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-wizard-progress strong,
.dockyard-root .dockyard-wizard-progress small { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-wizard-progress strong { font-size: 10px; }
.dockyard-root .dockyard-wizard-progress small { margin-top: 1px; font-size: 8px; }
.dockyard-root .dockyard-wizard-body { min-height: 330px; padding: 24px; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-body textarea { width: 100%; min-height: 220px; padding: 12px 14px; border: 1px solid var(--dy-control-border); border-radius: 10px; background: var(--dy-surface-subtle); color: var(--dy-text); font: 11.5px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace; box-sizing: border-box; resize: vertical; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-step h3 { margin-bottom: 4px; }
.dockyard-root [data-bulk-import-layer] .dockyard-import-actions-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.dockyard-root [data-bulk-import-layer] .import-drop { flex: 1 1 260px; margin: 0; padding: 13px 12px; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] { max-height: 300px; margin: 12px 0 0; padding: 0; overflow-y: auto; display: grid; gap: 6px; list-style: none; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li { padding: 8px 11px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); font-size: 12px; }
.dockyard-root .dockyard-wizard-step[hidden] { display: none; }
.dockyard-root .dockyard-wizard-step h3 { margin: 0; font-size: 18px; }
.dockyard-root .dockyard-wizard-step > p { max-width: 620px; margin: 6px 0 20px; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-wizard-step label { display: block; margin: 15px 0 6px; font-size: 11px; font-weight: 720; }
.dockyard-root .dockyard-wizard-step input,
.dockyard-root .dockyard-wizard-step textarea { width: 100%; padding: 10px 11px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface-subtle); color: var(--dy-text); font: inherit; }
.dockyard-root .dockyard-wizard-step textarea { resize: vertical; }
.dockyard-root .dockyard-wizard-step > small { display: block; margin-top: 5px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-onboarding-review { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 0; margin: 20px 0 0; border: 1px solid var(--dy-border); border-radius: 11px; overflow: hidden; }
.dockyard-root .dockyard-onboarding-review dt,
.dockyard-root .dockyard-onboarding-review dd { margin: 0; padding: 11px 12px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-onboarding-review dt:nth-of-type(1),
.dockyard-root .dockyard-onboarding-review dd:nth-of-type(1) { border-top: 0; }
.dockyard-root .dockyard-onboarding-review dt { background: var(--dy-surface-subtle); color: var(--dy-text-3); font-size: 10px; font-weight: 750; }
.dockyard-root .dockyard-onboarding-review dd { min-width: 0; overflow-wrap: anywhere; color: var(--dy-text); font-size: 12px; }
.dockyard-root .dockyard-review-note { padding: 11px 12px; border-radius: 9px; background: var(--dy-info-bg); color: var(--dy-info) !important; }
.dockyard-root .dockyard-wizard-actions { display: flex; justify-content: space-between; gap: 10px; padding: 16px 24px 20px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-onboarding > .dockyard-inline-error { margin: 0 24px 12px; }
.dockyard-root .dockyard-workload-card {
  display: grid;
  grid-template-columns: minmax(220px, .6fr) minmax(0, 1.4fr);
  gap: 22px;
  align-items: center;
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-workload-card h2 { margin: 0; font-size: 17px; }
.dockyard-root .dockyard-workload-card p { margin: 5px 0 0; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-teams-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .8fr); gap: 18px; }
.dockyard-root .dockyard-bot-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.dockyard-root .dockyard-bot-card { padding: 14px; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-bot-card header { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.dockyard-root .dockyard-bot-card .dockyard-avatar { margin: 0; }
.dockyard-root .dockyard-bot-card strong { display: block; font-size: 13px; }
.dockyard-root .dockyard-bot-card small { display: block; margin-top: 2px; color: var(--dy-text-3); font-size: 10px; }
.dockyard-root .dockyard-capabilities { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 11px; }
.dockyard-root .dockyard-capabilities span { padding: 3px 6px; border-radius: 6px; background: var(--dy-neutral-bg); color: var(--dy-neutral); font-size: 9px; }
.dockyard-root .dockyard-bot-session-button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  width: 100%;
  min-height: 34px;
  margin-top: 12px;
  padding: 7px 9px;
  border: 1px solid var(--dy-border);
  border-radius: 8px;
  background: var(--dy-surface);
  color: var(--dy-text-2);
  font: 650 10px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
}
.dockyard-root .dockyard-bot-session-button:hover,
.dockyard-root .dockyard-bot-session-button[aria-expanded="true"] { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .dockyard-bot-session-button svg { width: 14px; height: 14px; }
.dockyard-root .dockyard-bot-session-panel { margin-top: 18px; }
.dockyard-root .dockyard-session-layout { display: grid; grid-template-columns: minmax(240px, .65fr) minmax(0, 1.35fr); gap: 14px; margin-top: 17px; }
.dockyard-root .dockyard-session-list { display: grid; align-content: start; gap: 7px; min-width: 0; }
.dockyard-root .dockyard-session-list h3 { margin: 0 0 4px; font-size: 13px; }
.dockyard-root .dockyard-session-list > button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--dy-border);
  border-radius: 9px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text);
  text-align: left;
  cursor: pointer;
}
.dockyard-root .dockyard-session-list > button:hover,
.dockyard-root .dockyard-session-list > button.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-session-list strong,
.dockyard-root .dockyard-session-list small { display: block; min-width: 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-session-list strong { font-size: 11px; }
.dockyard-root .dockyard-session-list small { margin-top: 3px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-transcript { min-width: 0; padding: 13px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-transcript > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dockyard-root .dockyard-transcript h3 { margin: 0; font-size: 14px; }
.dockyard-root .dockyard-transcript header span:not(.dockyard-status-tag):not(.dockyard-status-mark) { display: block; margin-top: 3px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-transcript-messages { display: grid; gap: 9px; max-height: 520px; margin-top: 14px; overflow-y: auto; }
.dockyard-root .dockyard-transcript-message { min-width: 0; padding: 10px 11px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface); }
.dockyard-root .dockyard-transcript-message.user { border-left: 3px solid var(--dy-accent-border); }
.dockyard-root .dockyard-transcript-message.assistant { border-left: 3px solid var(--dy-success); }
.dockyard-root .dockyard-transcript-message.tool { border-left: 3px solid var(--dy-info); background: var(--dy-info-bg); }
.dockyard-root .dockyard-transcript-message > div { display: flex; justify-content: space-between; gap: 10px; color: var(--dy-text-3); font-size: 9px; text-transform: capitalize; }
.dockyard-root .dockyard-transcript-message pre { margin: 8px 0 0; overflow: visible; color: var(--dy-text); white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.dockyard-root .dockyard-transcript-message small { display: block; margin-top: 6px; color: var(--dy-warning); font-size: 9px; }
.dockyard-root .dockyard-transcript-scope { margin: 12px 0 0; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-transcript-placeholder { display: grid; place-items: center; min-height: 260px; padding: 20px; border: 1px dashed var(--dy-control-border); border-radius: 10px; color: var(--dy-text-3); font-size: 11px; text-align: center; }
.dockyard-root .dockyard-group-list { display: grid; gap: 10px; margin-top: 16px; }
.dockyard-root .dockyard-group-card { padding: 13px; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-group-card > header { display: flex; justify-content: space-between; gap: 10px; }
.dockyard-root .dockyard-group-card header span { color: var(--dy-text-3); font-size: 10px; }
.dockyard-root .dockyard-group-card p { font-size: 11px; }
.dockyard-root .dockyard-group-members { display: flex; margin-top: 10px; }
.dockyard-root .dockyard-group-members .dockyard-avatar { margin-left: -5px; }
.dockyard-root .dockyard-group-members .dockyard-avatar:first-child { margin-left: 0; }
.dockyard-root .dockyard-handoff-list { display: grid; gap: 7px; margin-top: 12px; }
.dockyard-root .dockyard-handoff-list > div { padding: 9px 10px; border-radius: 8px; background: var(--dy-surface); }
.dockyard-root .dockyard-handoff-list strong { display: block; font-size: 11px; }
.dockyard-root .dockyard-handoff-list span { display: block; margin-top: 2px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-loop-layout { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, .7fr); gap: 18px; }
.dockyard-root .dockyard-loop-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.dockyard-root .dockyard-loop-head h2 { margin-top: 0; }
.dockyard-root .dockyard-loop-visual-wrap { margin-top: 16px; overflow-x: auto; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-loop-visual-wrap svg { width: 100%; min-width: 760px; height: auto; }
.dockyard-root .dockyard-loop-node { fill: var(--dy-neutral-bg); stroke: var(--dy-neutral); stroke-width: 1.5; }
.dockyard-root .dockyard-loop-node.done { fill: var(--dy-success-bg); stroke: var(--dy-success); }
.dockyard-root .dockyard-loop-node.current { fill: var(--dy-warning-bg); stroke: var(--dy-warning); stroke-dasharray: 5 3; }
.dockyard-root .dockyard-loop-edge { fill: none; stroke: var(--dy-border-strong, var(--dy-border)); stroke-width: 2; }
.dockyard-root .dockyard-loop-edge.done { stroke: var(--dy-success); }
.dockyard-root .dockyard-loop-edge.current { stroke: var(--dy-warning); stroke-dasharray: 5 4; }
.dockyard-root .dockyard-loop-visual-wrap text { fill: var(--dy-text); font: 600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.dockyard-root .dockyard-stage-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 14px; }
.dockyard-root .dockyard-stage-list button { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 9px; align-items: center; padding: 9px 10px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface); color: var(--dy-text); text-align: left; cursor: pointer; }
.dockyard-root .dockyard-stage-list button.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-stage-list button > span:first-child { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 7px; background: var(--dy-neutral-bg); color: var(--dy-neutral); font-size: 10px; }
.dockyard-root .dockyard-stage-list strong,
.dockyard-root .dockyard-stage-list small { display: block; }
.dockyard-root .dockyard-stage-list strong { font-size: 11px; }
.dockyard-root .dockyard-stage-list small { margin-top: 2px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-stage-detail { align-self: start; }
.dockyard-root .dockyard-stage-detail .dockyard-evidence-details { margin-top: 17px; }
.dockyard-root .dockyard-saved-views-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(330px, .85fr); gap: 18px; margin-top: 18px; }
.dockyard-root .dockyard-saved-views-layout > .dockyard-feature-card { align-self: start; }
.dockyard-root .dockyard-saved-views-notice,
.dockyard-root .dockyard-lifecycle-panel,
.dockyard-root .dockyard-creator-summary {
  margin-top: 16px;
  padding: 13px 14px;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text-2);
  font-size: 11px;
  line-height: 1.5;
}
.dockyard-root .dockyard-saved-views-notice strong,
.dockyard-root .dockyard-creator-summary strong { display: block; margin-bottom: 3px; color: var(--dy-text); font-size: 12px; }
.dockyard-root .dockyard-saved-views { display: grid; gap: 7px; margin-top: 14px; }
.dockyard-root .dockyard-saved-views button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--dy-border);
  border-radius: 9px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text);
  text-align: left;
  cursor: pointer;
}
.dockyard-root .dockyard-saved-views button:hover,
.dockyard-root .dockyard-saved-views button.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-saved-views strong,
.dockyard-root .dockyard-saved-views small { display: block; min-width: 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-saved-views strong { font-size: 11px; }
.dockyard-root .dockyard-saved-views small { margin-top: 3px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-saved-views svg { width: 14px; height: 14px; }
.dockyard-root .dockyard-saved-view-editor { display: grid; gap: 7px; }
.dockyard-root .dockyard-saved-view-editor label { margin-top: 5px; font-size: 10px; font-weight: 700; }
.dockyard-root .dockyard-saved-view-editor input,
.dockyard-root .dockyard-saved-view-editor select { min-height: 36px; padding: 7px 9px; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; }
.dockyard-root .dockyard-project-state-summary,
.dockyard-root .dockyard-lifecycle-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.dockyard-root .dockyard-lifecycle-panel { display: grid; gap: 10px; }
.dockyard-root .dockyard-lifecycle-panel header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.dockyard-root .dockyard-lifecycle-panel h3,
.dockyard-root .dockyard-lifecycle-panel p { margin: 0; }
.dockyard-root .dockyard-lifecycle-panel h3 { color: var(--dy-text); font-size: 13px; }
.dockyard-root .dockyard-lifecycle-panel p { margin-top: 3px; }
.dockyard-root .dockyard-settings-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.dockyard-root .dockyard-form-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 7px; }
.dockyard-root .dockyard-view-only-note {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: 1px solid var(--dy-info);
  border-radius: 9px;
  background: var(--dy-info-bg);
  color: var(--dy-info);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
}
.dockyard-root .dockyard-view-only-note svg { width: 17px; height: 17px; flex: 0 0 auto; }
.dockyard-root .dockyard-objectives-layout { display: grid; gap: 16px; }
.dockyard-root .dockyard-inline-editor { display: grid; gap: 9px; margin-top: 16px; padding: 14px; border: 1px solid var(--dy-accent-border); border-radius: 10px; background: var(--dy-accent-soft); }
.dockyard-root .dockyard-inline-editor > label { display: grid; gap: 6px; color: var(--dy-text-2); font-size: 10px; font-weight: 730; }
.dockyard-root .dockyard-inline-editor input,
.dockyard-root .dockyard-inline-editor textarea,
.dockyard-root .dockyard-inline-editor select { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--dy-control-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font: inherit; }
.dockyard-root .dockyard-inline-editor textarea { resize: vertical; }
.dockyard-root .dockyard-mission-history { display: grid; gap: 7px; margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-mission-history h3 { margin: 0 0 2px; color: var(--dy-text); font-size: 12px; }
.dockyard-root .dockyard-mission-history article { display: grid; gap: 3px; padding: 10px 11px; border-radius: 8px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-mission-history strong { color: var(--dy-text); font-size: 11px; }
.dockyard-root .dockyard-mission-history span { color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-objective-list { display: grid; gap: 9px; margin-top: 16px; }
.dockyard-root .dockyard-objective-list > article { padding: 13px 14px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-objective-list > article.archived { border-style: dashed; }
.dockyard-root .dockyard-objective-copy { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dockyard-root .dockyard-objective-copy > span:first-child { min-width: 0; }
.dockyard-root .dockyard-objective-copy strong,
.dockyard-root .dockyard-objective-copy small { display: block; overflow-wrap: anywhere; }
.dockyard-root .dockyard-objective-copy strong { color: var(--dy-text); font-size: 13px; }
.dockyard-root .dockyard-objective-copy small { margin-top: 4px; color: var(--dy-text-2); font-size: 10px; line-height: 1.4; }
.dockyard-root .dockyard-objective-list > article > p { margin: 9px 0 0; color: var(--dy-text-3); font-size: 10px; }
.dockyard-root .dockyard-content-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: 16px; align-items: start; }
.dockyard-root .dockyard-content-list { display: grid; gap: 7px; margin-top: 16px; }
.dockyard-root .dockyard-content-list button { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; width: 100%; padding: 11px 12px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text); text-align: left; cursor: pointer; }
.dockyard-root .dockyard-content-list button:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-content-list strong,
.dockyard-root .dockyard-content-list small { display: block; min-width: 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-content-list strong { font-size: 12px; }
.dockyard-root .dockyard-content-list small { margin-top: 4px; color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-content-list svg { width: 15px; height: 15px; }
.dockyard-root .dockyard-upload-panel { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-upload-dropzone { position: relative; display: grid; gap: 3px; min-width: 0; padding: 12px; overflow: hidden; border: 1px dashed var(--dy-control-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text); cursor: pointer; }
.dockyard-root .dockyard-upload-dropzone:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .dockyard-upload-dropzone span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 720; }
.dockyard-root .dockyard-upload-dropzone small { color: var(--dy-text-3); font-size: 9px; }
.dockyard-root .dockyard-upload-dropzone input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.dockyard-root .dockyard-content-preview-card { min-height: 360px; }
.dockyard-root .dockyard-content-preview { max-height: 580px; margin: 17px 0 0; padding: 15px; overflow: auto; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text-2); white-space: pre-wrap; overflow-wrap: anywhere; font: 11px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace; }
.dockyard-root .dockyard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, .8fr);
  gap: 18px;
  align-items: start;
}
.dockyard-root .dockyard-main-grid .dockyard-section { margin-top: 0; }
.dockyard-root .dockyard-project-mission { max-width: 430px; }
.dockyard-root .dockyard-avatar-stack { display: flex; align-items: center; margin: 7px 0 0 45px; }
.dockyard-root .dockyard-avatar {
  width: 27px;
  height: 27px;
  margin-left: -6px;
  display: inline-grid;
  place-items: center;
  border: 2px solid var(--dy-surface);
  border-radius: 8px;
  color: #ffffff;
  background: var(--dy-info);
  font-size: 9px;
  font-weight: 800;
}
.dockyard-root .dockyard-avatar:first-child { margin-left: 0; }
.dockyard-root .dockyard-activity-card {
  overflow: hidden;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-activity-list { padding: 5px 20px 14px; }
.dockyard-root .dockyard-activity-item {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
}
.dockyard-root .dockyard-activity-item:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 16px;
  top: 48px;
  bottom: -5px;
  width: 1px;
  background: var(--dy-border);
}
.dockyard-root .dockyard-activity-item p { margin: 0; color: var(--dy-text); font-size: 13px; }
.dockyard-root .dockyard-activity-item time { display: block; margin-top: 4px; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-activity-item .dockyard-notification-marker { grid-area: auto; }
.dockyard-root .dockyard-evidence-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 17px 0;
  padding: 16px;
  border: 1px solid var(--dy-border);
  border-radius: 12px;
  background: var(--dy-surface-subtle);
}
.dockyard-root .dockyard-evidence-cell { min-width: 0; padding: 0 13px; border-left: 1px solid var(--dy-border); }
.dockyard-root .dockyard-evidence-cell:first-child { padding-left: 0; border-left: 0; }
.dockyard-root .dockyard-evidence-cell:last-child { padding-right: 0; }
.dockyard-root .dockyard-evidence-cell span { display: block; color: var(--dy-text-3); font-size: 10px; font-weight: 750; }
.dockyard-root .dockyard-evidence-cell strong { display: block; margin-top: 7px; color: var(--dy-text); font-size: 13px; line-height: 1.4; }
.dockyard-root .dockyard-comment-thread { display: grid; gap: 5px; }
.dockyard-root .dockyard-comment-thread p { margin: 0; color: var(--dy-text-2); font-size: 11px; line-height: 1.5; }
.dockyard-root .dockyard-comment-thread strong { color: var(--dy-text); }
.dockyard-root .dockyard-comment-form { display: flex; gap: 8px; }
.dockyard-root .dockyard-comment-form input { flex: 1 1 auto; min-width: 0; min-height: 34px; padding: 6px 10px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dockyard-comment-form input:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dockyard-initiative-revision { display: grid; gap: 9px; padding: 11px; border: 1px solid var(--dy-accent-border); border-radius: 9px; background: var(--dy-accent-soft); }
.dockyard-root .dockyard-initiative-revision input { min-height: 34px; padding: 6px 10px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dockyard-evidence-details {
  margin-top: 14px;
  padding: 14px 15px;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text-2);
  font-size: 12px;
}
.dockyard-root .dockyard-evidence-details[hidden] { display: none; }
.dockyard-root .dockyard-feed-group { box-shadow: 0 4px 18px rgba(31, 42, 68, 0.04); }
@container dockyard (min-width: 821px) and (max-width: 1350px) {
  .dockyard-root .dockyard-main-grid .dockyard-project-head,
  .dockyard-root .dockyard-main-grid .dockyard-project-row {
    grid-template-columns: minmax(180px, 1.35fr) 100px minmax(160px, 1fr) 80px;
    gap: 12px;
  }
}
@container dockyard (max-width: 1200px) {
  .dockyard-root .dockyard-loop-layout { grid-template-columns: 1fr; }
}
@container dockyard (max-width: 980px) {
  .dockyard-root .dockyard-main-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-attention-card { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-project-overview-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-content-layout { grid-template-columns: 1fr; }
}
@container dockyard (max-width: 820px) {
  .dockyard-root .dockyard-shell {
    margin-left: 0;
    margin-right: 0;
  }
  .dockyard-root .dockyard-consolebar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: -14px -16px 26px;
    padding: 10px 16px;
  }
  .dockyard-root .dockyard-brand { grid-column: 1; grid-row: 1; }
  .dockyard-root .dockyard-tabs { flex-wrap: wrap; grid-column: 1 / -1; grid-row: 2; width: 100%; }
  .dockyard-root .dockyard-tab { padding-right: 8px; padding-left: 8px; }
  .dockyard-root .dockyard-console-action { grid-column: 3; grid-row: 1; width: 38px; padding: 6px; justify-content: center; }
  .dockyard-root .dockyard-brand-copy { display: none; }
  .dockyard-root .dockyard-console-action-label { display: none; }
  .dockyard-root .dockyard-console-action svg { flex: 0 0 auto; margin: 0; }
  .dockyard-root .dockyard-project-toolbar { flex-wrap: wrap; overflow-x: visible; }
  .dockyard-root .dockyard-project-tabs { display: flex; flex: 1 1 100%; width: 100%; margin-left: 0; gap: 4px; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; padding-bottom: 3px; }
  .dockyard-root .dockyard-project-tabs button { flex: 0 0 auto; min-width: max-content; min-height: 40px; padding: 8px 12px; font-size: 12px; white-space: nowrap; }
  .dockyard-root .dockyard-wizard-progress { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 4px; }
  .dockyard-root .dockyard-metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dockyard-root .dockyard-portfolio-visual { grid-template-columns: 1fr; gap: 14px; }
  .dockyard-root .dockyard-project-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-reports-layout,
  .dockyard-root .dockyard-session-layout { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-workload-card,
  .dockyard-root .dockyard-teams-layout,
  .dockyard-root .dockyard-loop-layout,
  .dockyard-root .dockyard-saved-views-layout { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-backlog-item { grid-template-columns: 42px minmax(0, 1fr); }
  .dockyard-root .dockyard-backlog-item > .dockyard-status-tag,
  .dockyard-root .dockyard-rank-actions { grid-column: 2; justify-self: start; }
  .dockyard-root .dockyard-evidence-grid { grid-template-columns: 1fr; gap: 13px; }
  .dockyard-root .dockyard-evidence-cell { padding: 13px 0 0; border-top: 1px solid var(--dy-border); border-left: 0; }
  .dockyard-root .dockyard-evidence-cell:first-child { padding-top: 0; border-top: 0; }
}
@container dockyard (max-width: 640px) {
  .dockyard-root .dockyard-metric-strip,
  .dockyard-root .dockyard-settings-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-field-wide { grid-column: auto; }
  .dockyard-root .dockyard-bot-grid,
  .dockyard-root .dockyard-stage-list { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-upload-panel,
  .dockyard-root .dockyard-detail-grid { grid-template-columns: 1fr; }
}
@container dockyard (max-width: 520px) {
  .dockyard-root .dockyard-modal-backdrop { padding: 8px; }
  .dockyard-root .dockyard-onboarding { max-height: calc(100vh - 16px); border-radius: 13px; }
  .dockyard-root .dockyard-onboarding-head,
  .dockyard-root .dockyard-wizard-body { padding: 18px; }
  .dockyard-root .dockyard-wizard-progress { padding: 12px 18px; }
  .dockyard-root .dockyard-wizard-actions { padding: 14px 18px 17px; }
  .dockyard-root .dockyard-onboarding-review { grid-template-columns: 84px minmax(0, 1fr); }
  .dockyard-root .dockyard-toast-region { right: 16px; bottom: 16px; }
  .dockyard-root .dockyard-attention-decision { grid-template-columns: auto minmax(0, 1fr); }
  .dockyard-root .dockyard-attention-decision .dockyard-button { grid-column: 2; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) {
  .dockyard-root *,
  .dockyard-root *::before,
  .dockyard-root *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
/* ==== Workflows: v6 composition (canvas-first, three zones) ====
   Left = workflow library + the create/define editor; centre = toolbar above
   the production canvas; right = run inspector (canonical runs + stored
   versions + lifecycle). The canvas draws its own styling; these rules only
   place it and the zones around it. Tokens: the shared dockyard palette. */
.dockyard-root .dockyard-workflows-v6 { display: grid; gap: 0; }
.dockyard-root .dockyard-wf3 { display: grid; grid-template-columns: 250px minmax(0, 1fr); transition: grid-template-columns .22s ease; gap: 0; margin-top: 16px; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); }
.dockyard-root .dockyard-wf3-lib { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--dy-border); background: var(--dy-surface-subtle); overflow: hidden; }
/* Collapsible library: the column folds to zero so the canvas takes the width. */
.dockyard-root .dockyard-wf3.lib-collapsed { grid-template-columns: 0 minmax(0, 1fr); }
.dockyard-root .dockyard-wf3.lib-collapsed .dockyard-wf3-lib { visibility: hidden; border-right: 0; pointer-events: none; }
.dockyard-root .dockyard-wf3-libtoggle { width: 30px; height: 30px; padding: 0; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text-2); font-size: 15px; line-height: 1; cursor: pointer; }
.dockyard-root .dockyard-wf3-libtoggle:hover { border-color: var(--dy-accent-border); color: var(--dy-accent-text); }
@media (prefers-reduced-motion: reduce) { .dockyard-root .dockyard-wf3 { transition: none; } }
.dockyard-root .dockyard-wf3-lib-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dockyard-wf3-lib-head strong { font-size: 12.5px; }
.dockyard-root .dockyard-wf3-lib-head span { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-wf3-lib-list { display: grid; gap: 4px; align-content: start; padding: 8px; }
.dockyard-root .dockyard-wf3-lib-list button { display: block; width: 100%; min-width: 0; padding: 9px 11px; text-align: left; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dy-text); font: inherit; cursor: pointer; }
.dockyard-root .dockyard-wf3-lib-list button:hover { border-color: var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dockyard-wf3-lib-list button.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .dockyard-wf3-lib-list strong { display: block; overflow: hidden; font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-wf3-lib-list small { display: block; margin-top: 2px; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-wf3-lib .dockyard-inline-editor { margin: 8px; }
.dockyard-root .dockyard-wf3-stage { display: flex; flex-direction: column; min-width: 0; }
.dockyard-root .dockyard-wf3-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-wf3-sep { width: 1px; height: 18px; background: var(--dy-border); margin: 0 4px; }
.dockyard-root .dockyard-wf3-validation { margin: 0; padding: 8px 14px; border-bottom: 1px solid var(--dy-border); background: var(--dy-warning-bg); color: var(--dy-warning); font-size: 12px; }
.dockyard-root .dockyard-wf3-stage .dockyard-workflow-graph { min-width: 0; }
.dockyard-root .dockyard-wf3-stage .dockyard-workflow-graph .dy-wf { height: 62vh; border: 0; border-radius: 0; }
/* Toolbar lifecycle controls + versions menu (the inspector column is gone). */
.dockyard-root .dockyard-wf3-toolbar { position: relative; }
.dockyard-root .dockyard-wf3-versions { position: relative; }
.dockyard-root .dockyard-wf3-versions > summary { list-style: none; cursor: pointer; padding: 5px 10px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); font-size: 12px; font-weight: 600; }
.dockyard-root .dockyard-wf3-versions > summary::-webkit-details-marker { display: none; }
.dockyard-root .dockyard-wf3-versions[open] > summary { border-color: var(--dy-accent-border); color: var(--dy-accent-text); }
.dockyard-root .dockyard-wf3-versions-menu { position: absolute; top: calc(100% + 6px); left: 0; z-index: 30; width: min(420px, 80vw); max-height: 360px; overflow: auto; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface); box-shadow: 0 16px 40px rgba(0,0,0,.28); }
.dockyard-root .dockyard-wf3-version-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dockyard-root .dockyard-wf3-versions-menu pre { margin: 6px 0 0; max-height: 140px; overflow: auto; font-size: 11px; }
/* Run readout: one line above the canvas. */
.dockyard-root .dockyard-wf3-run { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 0; padding: 8px 14px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); font-size: 12px; }
.dockyard-root .dockyard-wf3-runkey { color: var(--dy-text); font-weight: 600; }
.dockyard-root .dockyard-wf3-counts { color: var(--dy-text-3); }
.dockyard-root .dockyard-wf3-steps { margin-left: auto; position: relative; }
.dockyard-root .dockyard-wf3-steps > summary { cursor: pointer; color: var(--dy-text-2); }
.dockyard-root .dockyard-wf3-steps ul { position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; min-width: 260px; margin: 0; padding: 10px 12px 10px 28px; display: grid; gap: 4px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); box-shadow: 0 16px 40px rgba(0,0,0,.28); }
.dockyard-root .dockyard-wf3-steps li { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-wf3-steps li[data-wf-needs-attention="true"] { color: var(--dy-warning); }
@media (max-width: 1250px) {
  .dockyard-root .dockyard-wf3 { grid-template-columns: 220px minmax(0, 1fr); }
  .dockyard-root .dockyard-wf3.lib-collapsed { grid-template-columns: 0 minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .dockyard-root .dockyard-wf3 { display: block; }
  .dockyard-root .dockyard-wf3-lib { display: none; }
  .dockyard-root .dockyard-wf3-libtoggle, .dockyard-root .dockyard-wf3-libtoggle + .dockyard-wf3-sep { display: none; }
  .dockyard-root .dockyard-wf3-stage { min-width: 0; }
  .dockyard-root .dockyard-wf3-stage .dockyard-wf3-toolbar { overflow: visible; flex-wrap: wrap; justify-content: flex-start; gap: 4px; }
  .dockyard-root .dockyard-wf3-stage .dockyard-wf3-toolbar .dockyard-button { flex: 0 0 auto; min-height: 38px; padding-inline: 8px; white-space: nowrap; }
  .dockyard-root .dockyard-wf3-stage .dockyard-workflow-graph .dy-wf { height: 70vh; min-height: 520px; }
  .dockyard-root .dockyard-wf3-steps { margin-left: 0; }
  .dockyard-root .dockyard-wf3-steps ul { left: 0; right: auto; }
}

/* Command Center: screenshot-led wide scan tables with a contextual inspector. */
.dockyard-root .dockyard-command { display: grid; gap: 20px; }
.dockyard-root .dockyard-command-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding: 10px 2px 0; }
.dockyard-root .dockyard-command-eyebrow { color: var(--dy-accent-text); font-size: 10px; font-weight: 800; letter-spacing: .09em; }
.dockyard-root .dockyard-command-head h1 { margin: 5px 0; color: var(--dy-text); font-size: clamp(25px, 2.5vw, 34px); letter-spacing: -.035em; }
.dockyard-root .dockyard-command-head p { margin: 0; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-command-head-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: end; }
.dockyard-root .dockyard-command-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.dockyard-root .dockyard-command-metric { display: grid; align-content: start; gap: 8px; min-width: 0; padding: 17px; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface); }
.dockyard-root .dockyard-command-metric > span { color: var(--dy-text-3); font-size: 10px; font-weight: 800; letter-spacing: .065em; }
.dockyard-root .dockyard-command-metric strong { color: var(--dy-text); font-size: 25px; line-height: 1.1; }
.dockyard-root .dockyard-command-metric small { color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-command-layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(260px, 1fr); align-items: start; gap: 16px; }
.dockyard-root .dockyard-command-main { display: grid; gap: 16px; min-width: 0; }
.dockyard-root .dockyard-command-section, .dockyard-root .dockyard-command-detail { min-width: 0; border: 1px solid var(--dy-border); border-radius: 11px; background: var(--dy-surface); }
.dockyard-root .dockyard-command-section .dockyard-section-head { padding: 15px 17px; }
.dockyard-root .dockyard-command-section h2 { margin: 0; color: var(--dy-text); font-size: 15px; }
.dockyard-root .dockyard-command-section .dockyard-section-head p { margin: 3px 0 0; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-command-table-wrap { overflow-x: auto; }
.dockyard-root .dockyard-command-row { display: grid; align-items: center; gap: 10px; width: 100%; min-width: 760px; padding: 11px 17px; border: 0; border-top: 1px solid var(--dy-border); text-align: left; background: transparent; color: var(--dy-text); }
.dockyard-root .dockyard-command-attention-head, .dockyard-root .dockyard-command-attention-row { grid-template-columns: 82px minmax(160px, 2fr) minmax(90px, 1fr) minmax(95px, 1fr) 68px; }
.dockyard-root .dockyard-command-project-head, .dockyard-root .dockyard-command-project-row { grid-template-columns: minmax(110px, 1.3fr) minmax(75px, .7fr) 95px minmax(125px, 1fr) minmax(120px, 1.2fr) minmax(110px, 1fr); }
.dockyard-root .dockyard-command-attention-head, .dockyard-root .dockyard-command-project-head { background: var(--dy-surface-subtle); color: var(--dy-text-3); font-size: 10px; font-weight: 750; }
.dockyard-root button.dockyard-command-row { cursor: pointer; font-size: 11px; }
.dockyard-root button.dockyard-command-row:hover, .dockyard-root button.dockyard-command-row.is-selected { background: var(--dy-accent-soft); }
.dockyard-root .dockyard-command-row strong { display: block; overflow-wrap: anywhere; font-size: 11px; }
.dockyard-root .dockyard-command-row small { display: block; margin-top: 3px; color: var(--dy-text-3); font-size: 10px; }
.dockyard-root .dockyard-command-type { display: inline-block; width: fit-content; padding: 3px 6px; border-radius: 5px; background: var(--dy-surface-subtle); color: var(--dy-text-2); font-size: 10px; font-weight: 700; }
.dockyard-root .dockyard-command-type.approval { background: var(--dy-warning-bg); color: var(--dy-warning); }
.dockyard-root .dockyard-command-health { font-weight: 700; }
.dockyard-root .dockyard-command-health.at_risk, .dockyard-root .dockyard-command-health.stalled { color: var(--dy-warning); }
.dockyard-root .dockyard-command-progress { display: grid; gap: 5px; }
.dockyard-root .dockyard-command-progress-track { display: block; height: 5px; border-radius: 5px; background: var(--dy-border); }
.dockyard-root .dockyard-command-progress-track > span { display: block; height: 100%; border-radius: 5px; background: var(--dy-action); }
.dockyard-root .dockyard-command-empty { padding: 12px 17px; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-command-detail { position: sticky; top: 18px; display: grid; align-content: start; gap: 12px; padding: 16px; }
.dockyard-root .dockyard-command-detail-head { display: flex; align-items: center; justify-content: space-between; }
.dockyard-root .dockyard-command-detail h2, .dockyard-root .dockyard-command-detail h3, .dockyard-root .dockyard-command-detail h4, .dockyard-root .dockyard-command-detail p { margin: 0; }
.dockyard-root .dockyard-command-detail h2 { font-size: 14px; }
.dockyard-root .dockyard-command-detail h3 { font-size: 17px; line-height: 1.35; }
.dockyard-root .dockyard-command-detail h4 { padding-top: 10px; border-top: 1px solid var(--dy-border); font-size: 11px; }
.dockyard-root .dockyard-command-detail p, .dockyard-root .dockyard-command-detail dd { color: var(--dy-text-2); font-size: 11px; line-height: 1.5; }
.dockyard-root .dockyard-command-detail dl { display: grid; grid-template-columns: 100px 1fr; gap: 8px; margin: 0; font-size: 11px; }
.dockyard-root .dockyard-command-detail dt { color: var(--dy-text-3); }
.dockyard-root .dockyard-command-detail dd { margin: 0; overflow-wrap: anywhere; }
.dockyard-root .dockyard-command-detail-activity { display: grid; gap: 8px; }
/* Deliberate colour hierarchy: numeric state is coloured, supporting copy stays neutral. */
.dockyard-root .dockyard-command-metric { --dy-metric: var(--dy-accent-text); --dy-metric-bg: var(--dy-accent-soft); border-top: 3px solid var(--dy-metric); padding-top: 14px; text-align: left; font: inherit; }
.dockyard-root .dockyard-command-metric-info { --dy-metric: var(--dy-info); --dy-metric-bg: var(--dy-info-bg); }
.dockyard-root .dockyard-command-metric-warning { --dy-metric: var(--dy-warning); --dy-metric-bg: var(--dy-warning-bg); }
.dockyard-root .dockyard-command-metric-success { --dy-metric: var(--dy-success); --dy-metric-bg: var(--dy-success-bg); }
.dockyard-root .dockyard-command-metric-accent { --dy-metric: var(--dy-accent-text); --dy-metric-bg: var(--dy-accent-soft); }
.dockyard-root .dockyard-command-metric-neutral { --dy-metric: var(--dy-neutral); --dy-metric-bg: var(--dy-neutral-bg); }
.dockyard-root .dockyard-command-metric .dockyard-command-metric-label { display: flex; gap: 8px; align-items: center; min-height: 25px; color: var(--dy-text-2); }
.dockyard-root .dockyard-command-metric-label svg { width: 24px; height: 24px; flex: 0 0 auto; padding: 4px; border-radius: 6px; color: var(--dy-metric); background: var(--dy-metric-bg); }
.dockyard-root .dockyard-command-metric strong { color: var(--dy-metric); font-size: 27px; letter-spacing: -.025em; }
.dockyard-root .dockyard-command-metric.is-actionable { cursor: pointer; }
.dockyard-root .dockyard-command-metric.is-actionable:hover { box-shadow: var(--dy-shadow); transform: translateY(-1px); }
.dockyard-root .dockyard-command-section-actions { display: flex; gap: 7px; flex-wrap: wrap; justify-content: end; }
.dockyard-root .dockyard-command-section h2 { display: flex; align-items: center; gap: 8px; font-size: 16px; }
.dockyard-root .dockyard-command-section h2 svg { width: 17px; height: 17px; flex: 0 0 auto; color: var(--dy-accent-text); }
.dockyard-root .dockyard-command-section:first-child h2 svg { color: var(--dy-warning); }
.dockyard-root button.dockyard-command-row { font-size: 12px; }
.dockyard-root .dockyard-command-row strong { font-size: 12px; }
.dockyard-root .dockyard-command-health-summary { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-top: -7px; padding: 11px 16px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface); }
.dockyard-root .dockyard-command-health-summary > span:first-child { color: var(--dy-text-2); font-size: 10px; font-weight: 800; letter-spacing: .06em; white-space: nowrap; }
.dockyard-root .dockyard-command-health-track { display: flex; overflow: hidden; flex: 1 1 150px; height: 9px; min-width: 100px; border-radius: 7px; background: var(--dy-surface-strong); }
.dockyard-root .dockyard-health-segment { display: block; height: 100%; }
.dockyard-root .dockyard-health-segment.on_track, .dockyard-root .dockyard-health-dot.on_track { background: var(--dy-success); }
.dockyard-root .dockyard-health-segment.at_risk, .dockyard-root .dockyard-health-dot.at_risk { background: var(--dy-warning); }
.dockyard-root .dockyard-health-segment.stalled, .dockyard-root .dockyard-health-dot.stalled { background: var(--dy-danger); }
.dockyard-root .dockyard-health-segment.idle, .dockyard-root .dockyard-health-dot.idle { background: var(--dy-info); }
.dockyard-root .dockyard-health-segment.unknown, .dockyard-root .dockyard-health-dot.unknown { background: var(--dy-neutral); }
.dockyard-root .dockyard-command-health-legend { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dockyard-root .dockyard-command-health-legend span { display: inline-flex; align-items: center; gap: 4px; color: var(--dy-text-2); font-size: 10px; white-space: nowrap; }
.dockyard-root .dockyard-health-dot { width: 7px; height: 7px; border-radius: 50%; }
.dockyard-root .dockyard-command-directory { align-content: start; }
.dockyard-root .dockyard-command-directory > button:first-child { width: fit-content; }
.dockyard-root .dockyard-command-directory-search { width: min(330px, 100%); min-height: 37px; padding: 8px 12px; border: 1px solid var(--dy-control-border); border-radius: 7px; color: var(--dy-text); background: var(--dy-surface); font: inherit; font-size: 12px; }
.dockyard-root .dockyard-command-directory-list { overflow-x: auto; }
.dockyard-root .dockyard-command-directory-list .dockyard-command-row { min-width: 930px; }
.dockyard-root .dockyard-command-issue-filters { display: flex; gap: 7px; flex-wrap: wrap; }
.dockyard-root .dockyard-command-issue-filters button { padding: 7px 11px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 11px; cursor: pointer; }
.dockyard-root .dockyard-command-issue-filters button.is-active { color: var(--dy-accent-text); border-color: var(--dy-accent-border); background: var(--dy-accent-soft); font-weight: 700; }
@container dockyard (max-width: 1080px) {
  .dockyard-root .dockyard-command-layout { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-command-detail { position: static; }
}
@container dockyard (max-width: 760px) {
  .dockyard-root .dockyard-command-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dockyard-root .dockyard-command-head { align-items: start; flex-direction: column; }
}

/* Dashboard shell: v6 top tabs; search and project context above them. */
.dockyard-root .dockyard-consolebar {
  display: grid;
  grid-template-columns: auto minmax(210px, 1fr) auto auto;
  grid-template-areas: 'brand search project action' 'tabs tabs tabs tabs';
  gap: 12px 16px;
  padding: 14px 18px 8px;
}
.dockyard-root .dockyard-brand { grid-area: brand; }
.dockyard-root .dockyard-fleet-search { grid-area: search; position: relative; min-width: 0; max-width: 440px; justify-self: center; width: 100%; }
.dockyard-root .dockyard-project-switcher { grid-area: project; }
.dockyard-root .dockyard-console-action { grid-area: action; }
.dockyard-root .dockyard-tabs { flex-wrap: wrap; grid-area: tabs; overflow-x: auto; width: 100%; background: transparent; border-top: 1px solid var(--dy-border); border-radius: 0; padding: 7px 0 0; }
.dockyard-root .dockyard-tab[aria-selected='true'] { background: transparent; box-shadow: none; color: var(--dy-accent-text); }
.dockyard-root .dockyard-fleet-search input { width: 100%; min-height: 38px; padding: 7px 48px 7px 13px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-subtle); color: var(--dy-text); font: inherit; font-size: 12px; }
.dockyard-root .dockyard-fleet-search input:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 1px; }
.dockyard-root .dockyard-search-shortcut { position: absolute; right: 10px; top: 10px; pointer-events: none; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-search-results { position: absolute; top: calc(100% + 5px); left: 0; right: 0; z-index: 40; max-height: 280px; overflow-y: auto; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface); box-shadow: 0 12px 24px rgba(0, 0, 0, .16); }
.dockyard-root .dockyard-search-results p { margin: 0; padding: 12px; color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dockyard-search-results button { display: block; width: 100%; padding: 9px 12px; border: 0; border-bottom: 1px solid var(--dy-border); background: transparent; text-align: left; cursor: pointer; }
.dockyard-root .dockyard-search-results button:hover,
.dockyard-root .dockyard-search-results button:focus-visible { background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-search-results strong,
.dockyard-root .dockyard-search-results small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dockyard-search-results strong { font-size: 12px; }
.dockyard-root .dockyard-search-results small { color: var(--dy-text-3); font-size: 10px; }
@container dockyard (max-width: 820px) {
  .dockyard-root .dockyard-consolebar { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'brand action' 'search project' 'tabs tabs'; margin: -14px -16px 26px; }
  .dockyard-root .dockyard-fleet-search { justify-self: stretch; }
}
@container dockyard (max-width: 560px) {
  .dockyard-root .dockyard-consolebar { grid-template-areas: 'brand action' 'search search' 'project project' 'tabs tabs'; }
}
/* Backlog queue: one aligned, legible two-line row at working density. */
.dockyard-root [data-backlog-board] .backlog-create-toolbar { margin: 0 0 12px; padding: 0; background: transparent; border: 0; }
.dockyard-root [data-backlog-board] .backlog-create-toolbar .dockyard-meta { color: var(--dy-text-2); font-size: 12px; font-weight: 650; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar { padding: 11px 14px 5px; border: 0; }
.dockyard-root [data-backlog-board] .dockyard-filterbar { padding: 6px 14px 12px; gap: 10px; }
/* Approved design: single-line toolbar — search and every control on one
   row; the filter row folds into the same line at desktop width. */
.dockyard-root [data-backlog-board] .cm-search { max-width: 440px; background: var(--dy-surface); }
/* LANE-TOOLBAR: backlog toolbar — one line at desktop width, wraps (never
   scrolls) when narrow; icon Sort/Group buttons with floating popovers. */
.dockyard-root [data-backlog-board] .dockyard-cmdbar { flex-wrap: wrap; overflow: visible; row-gap: 8px; gap: 8px; z-index: 30; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-search { flex: 1 1 180px; min-width: 160px; max-width: 360px; height: 29px; padding: 0 9px; border-color: var(--dy-control-border); border-radius: 7px; box-sizing: border-box; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-search input { font-size: 12px; }
.dockyard-root .cm-icon-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 29px; height: 29px; padding: 0; box-sizing: border-box; border: 1px solid var(--dy-control-border); border-radius: 7px; background: var(--dy-surface-subtle); color: var(--dy-text-2); cursor: pointer; }
.dockyard-root .cm-icon-btn svg { width: 14px; height: 14px; }
.dockyard-root .cm-icon-btn:hover { color: var(--dy-text); border-color: var(--dy-accent-border); }
.dockyard-root .cm-icon-btn:focus-visible { outline: 2px solid var(--dy-accent-border); outline-offset: 1px; }
.dockyard-root .cm-icon-btn[aria-expanded="true"] { color: var(--dy-accent-text); border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dockyard-root .cm-icon-btn.is-modified { color: var(--dy-accent-text); }
.dockyard-root .cm-icon-dot { position: absolute; top: 4px; right: 4px; width: 5px; height: 5px; border-radius: 50%; background: var(--dy-accent-text); }
.dockyard-root .cm-anchor { position: relative; display: inline-flex; flex: none; }
.dockyard-root .cm-anchor .cm-menu.cm-popover { position: absolute; top: calc(100% + 6px); left: 0; z-index: 60; min-width: 190px; max-height: 62vh; overflow: auto; padding: 5px; border: 1px solid var(--dy-border); border-radius: 9px; background: var(--dy-surface-strong); box-shadow: var(--dy-shadow); }
.dockyard-root .cm-popover button { width: 100%; font-size: 12px; padding: 6px 8px; }
.dockyard-root .cm-popover button:focus-visible { outline: 0; background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .cm-popover button.is-active { font-weight: 680; }
.dockyard-root .cm-popover .cm-check { display: inline-flex; width: 13px; flex: none; color: var(--dy-accent-text); }
.dockyard-root .cm-popover .cm-option-label { flex: 1; }
.dockyard-root .cm-popover .cm-dir { display: inline-flex; color: var(--dy-text-3); }
.dockyard-root [data-backlog-board] .cm-divider { width: 1px; height: 18px; background: var(--dy-border); flex: none; margin: 0 2px; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-filter { flex: none; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-filter > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-filter select { min-width: 0; width: auto; max-width: 150px; }
.dockyard-root [data-backlog-board] .dockyard-cmdbar .cm-count { margin-left: auto; font-size: 11px; color: var(--dy-text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
/* /LANE-TOOLBAR */
.dockyard-root [data-backlog-board] .tree-head { min-height: 37px; }
.dockyard-root [data-backlog-board] .dockyard-tree-row { min-height: 55px; }
.dockyard-root [data-backlog-board] .th-gutter, .dockyard-root [data-backlog-board] .tree-gutter { width: 34px; }
.dockyard-root [data-backlog-board] .tree-check { opacity: .55; }
.dockyard-root [data-backlog-board] .th-rank, .dockyard-root [data-backlog-board] .tree-rank { width: 48px; text-align: left; justify-content: flex-start; }
.dockyard-root [data-backlog-board] .tree-rank .cell-rank { color: var(--dy-text); font-weight: 750; font-variant-numeric: tabular-nums; }
.dockyard-root [data-backlog-board] .th-type, .dockyard-root [data-backlog-board] .tree-type-cell { width: 84px; }
.dockyard-root [data-backlog-board] .th-title, .dockyard-root [data-backlog-board] .tree-title { min-width: 210px; flex: 2.6; }
.dockyard-root [data-backlog-board] .th-status, .dockyard-root [data-backlog-board] .tree-status { width: 95px; }
.dockyard-root [data-backlog-board] .th-initiative, .dockyard-root [data-backlog-board] .tree-initiative { width: 125px; }
.dockyard-root [data-backlog-board] .th-who, .dockyard-root [data-backlog-board] .tree-who { width: 110px; }
.dockyard-root [data-backlog-board] .th-age, .dockyard-root [data-backlog-board] .tree-age { width: 42px; flex: none; font-size: 11px; color: var(--dy-text-2); font-variant-numeric: tabular-nums; }
.dockyard-root [data-backlog-board] .th-reason, .dockyard-root [data-backlog-board] .tree-priority-reason { min-width: 110px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--dy-text-2); }
.dockyard-root [data-backlog-board] .tree-title-stack { gap: 3px; }
.dockyard-root [data-backlog-board] .cell-title { font-size: 12.5px; font-weight: 650; }
.dockyard-root [data-backlog-board] .tree-desc { font-size: 10.5px; }
.dockyard-root [data-backlog-board] .tree-ref-chip { background: transparent; border: 0; padding: 0; font-size: 10.5px; color: var(--dy-accent-text); }
.dockyard-root [data-backlog-board] .initiative-cell-value small { display: none; }
.dockyard-root [data-backlog-board] .tree-menu-btn { opacity: .75; }
@media (max-width: 1190px) {
  .dockyard-root [data-backlog-board] .th-rank, .dockyard-root [data-backlog-board] .tree-rank { display: inline-flex !important; }
  .dockyard-root [data-backlog-board] .th-reason, .dockyard-root [data-backlog-board] .tree-priority-reason { display: none; }
  .dockyard-root [data-backlog-board] .th-title, .dockyard-root [data-backlog-board] .tree-title { min-width: 160px; }
}
@media (max-width: 850px) {
  .dockyard-root [data-backlog-board] .th-age, .dockyard-root [data-backlog-board] .tree-age,
  .dockyard-root [data-backlog-board] .th-initiative, .dockyard-root [data-backlog-board] .tree-initiative { display: none; }
}
/* Import: explicit source, validation and result stages. */
.dockyard-root [data-bulk-import-layer] .dockyard-onboarding { width: min(780px, 100%); padding: 0; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-progress { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-progress strong { font-size: 12px; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-progress small { font-size: 10.5px; color: var(--dy-text-2); }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-body { min-height: 300px; padding: 20px 24px; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-body textarea { min-height: 125px; max-height: 210px; background: var(--dy-surface); }
.dockyard-root [data-bulk-import-layer] .import-drop { text-align: left; padding: 12px 14px; }
.dockyard-root [data-bulk-import-layer] .import-drop strong { display: block; font-size: 12px; }
.dockyard-root [data-bulk-import-layer] .import-drop small { color: var(--dy-text-2); font-size: 11px; }
.dockyard-root [data-bulk-import-layer] .import-drop input { max-width: 100%; margin-top: 8px; }
.dockyard-root [data-bulk-import-layer] .dockyard-import-actions-row { align-items: stretch; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] { max-height: 360px; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li { display: grid; grid-template-columns: 72px minmax(0,1fr) 98px; align-items: start; gap: 10px; background: var(--dy-surface); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-footer { margin: 0; padding: 13px 24px 18px; justify-content: space-between; }
.dockyard-root .dockyard-detail-footer-right { display: inline-flex; align-items: center; gap: 10px; }
.dockyard-root .dockyard-detail-breadcrumb { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-breadcrumb svg { width: 12px; height: 12px; opacity: 0.7; }
.dockyard-root .dockyard-detail-breadcrumb span:last-child { color: var(--dy-text); font-weight: 600; }
.dockyard-root .dockyard-field-iconed { display: grid; gap: 4px; min-width: 0; }
.dockyard-root .dockyard-field-shell { display: inline-flex; align-items: center; gap: 7px; padding: 0 9px; border: 1px solid var(--dy-control-border); border-radius: 9px; background: var(--dy-surface-subtle); min-width: 0; }
.dockyard-root .dockyard-field-shell svg { width: 13px; height: 13px; flex: none; color: var(--dy-text-2); }
.dockyard-root .dockyard-field-shell input, .dockyard-root .dockyard-field-shell select { flex: 1 1 auto; min-width: 0; border: 0; background: transparent; padding: 8px 0; color: var(--dy-text); font: inherit; }
.dockyard-root .dockyard-field-shell input:focus-visible, .dockyard-root .dockyard-field-shell select:focus-visible { outline: none; }
.dockyard-root .dockyard-field-shell:focus-within { outline: 2px solid var(--dy-accent-text); outline-offset: 1px; }
.dockyard-root .dockyard-status-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--dy-text-2); }
.dockyard-root .dockyard-status-dot.status-backlog { background: var(--dy-neutral); }
.dockyard-root .dockyard-status-dot.status-in_progress { background: var(--dy-info); }
.dockyard-root .dockyard-status-dot.status-in_review { background: var(--dy-warning); }
.dockyard-root .dockyard-status-dot.status-blocked { background: var(--dy-danger); }
.dockyard-root .dockyard-status-dot.status-done { background: var(--dy-success); }
.dockyard-root .dockyard-field-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dy-text-2); cursor: pointer; flex: none; }
.dockyard-root .dockyard-field-clear svg { width: 12px; height: 12px; }
.dockyard-root .dockyard-field-clear:hover:not(:disabled) { color: var(--dy-text); background: var(--dy-surface); }
.dockyard-root .dockyard-field-clear:disabled { opacity: 0.35; cursor: default; }
.dockyard-root .dockyard-assignee-field { display: flex; align-items: end; gap: 6px; }
.dockyard-root .dockyard-assignee-field .dockyard-picker, .dockyard-root .dockyard-assignee-field > :first-child { flex: 1 1 auto; min-width: 0; }
.dockyard-root .dockyard-detail-activity { margin: 0; padding: 4px 24px 10px; }
.dockyard-root .dockyard-detail-activity-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dockyard-root .dockyard-detail-activity-head h3 { margin: 6px 0 2px; font-size: 12px; }
.dockyard-root .dockyard-activity-scope { display: inline-flex; align-items: center; gap: 8px; }
.dockyard-root .dockyard-activity-scope-shell { padding: 0 8px; }
.dockyard-root .dockyard-activity-scope-shell select { padding: 6px 0; font-size: 11.5px; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list { margin: 7px 0 0; padding: 0 0 0 2px; list-style: none; max-height: 180px; overflow-y: auto; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list li { padding: 9px 0; border-top: 1px solid var(--dy-border); font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list strong { display: block; color: var(--dy-text); font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list span { display: block; margin-top: 2px; color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-modal .dockyard-history-changes { display: grid; gap: 4px; margin: 6px 0 0; padding: 0; list-style: none; }
.dockyard-root .dockyard-detail-modal .dockyard-history-change { display: grid; grid-template-columns: minmax(78px, 118px) minmax(0, 1fr) 18px minmax(0, 1fr); align-items: start; gap: 6px; padding: 4px 7px; border: 1px solid var(--dy-border); border-radius: 5px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-modal .dockyard-history-change > strong { color: var(--dy-text-2); font-size: 10px; font-weight: 600; }
.dockyard-root .dockyard-detail-modal .dockyard-history-change > span { min-width: 0; max-height: 3.6em; margin: 0; overflow: auto; overflow-wrap: anywhere; color: var(--dy-text); font-size: 10px; line-height: 1.35; }
.dockyard-root .dockyard-detail-modal .dockyard-history-change > .dockyard-history-from { color: var(--dy-text); text-decoration: line-through; text-decoration-color: var(--dy-danger); }
.dockyard-root .dockyard-detail-modal .dockyard-history-change > .dockyard-history-arrow { color: var(--dy-accent-text); text-align: center; font-weight: 700; text-decoration: none; }
.dockyard-root .dockyard-detail-modal .dockyard-history-change > .dockyard-history-to { color: var(--dy-success, var(--dy-accent-text)); font-weight: 600; }
@media (max-width: 520px) { .dockyard-root .dockyard-detail-modal .dockyard-history-change { grid-template-columns: 78px minmax(0, 1fr) 16px minmax(0, 1fr); gap: 4px; padding-inline: 4px; } }
.dockyard-root [data-bulk-import-layer] .import-row-error { color: var(--dy-danger); grid-column: 2 / -1; font-size: 11px; }
.dockyard-root [data-bulk-import-layer] .import-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) auto; gap: 10px; align-items: center; margin: 10px 0 6px; }
.dockyard-root [data-bulk-import-layer] .import-stat { display: inline-flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); font-size: 12px; }
.dockyard-root [data-bulk-import-layer] .import-stat strong { font-size: 14px; }
.dockyard-root [data-bulk-import-layer] .import-stat svg { width: 14px; height: 14px; flex: none; }
.dockyard-root [data-bulk-import-layer] .import-stat.valid svg { color: var(--dy-success); }
.dockyard-root [data-bulk-import-layer] .import-stat.warn svg { color: var(--dy-warning); }
.dockyard-root [data-bulk-import-layer] .import-stat.errored svg { color: var(--dy-danger); }
.dockyard-root [data-bulk-import-layer] .import-warnings-toggle { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--dy-text-2); white-space: nowrap; cursor: pointer; }
.dockyard-root [data-bulk-import-layer] .import-split { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(240px, 1fr); gap: 14px; align-items: start; }
.dockyard-root [data-bulk-import-layer] .import-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
.dockyard-root [data-bulk-import-layer] .import-badge.ok { color: var(--dy-success); background: var(--dy-success-bg); }
.dockyard-root [data-bulk-import-layer] .import-badge.warning { color: var(--dy-warning); background: var(--dy-warning-bg); }
.dockyard-root [data-bulk-import-layer] .import-badge.error { color: var(--dy-danger); background: var(--dy-danger-bg); }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li { cursor: pointer; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li.selected { border-color: var(--dy-accent-border); outline: 1px solid var(--dy-accent-border); }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li.has-warning { border-left: 3px solid var(--dy-warning); }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li.has-error { border-left: 3px solid var(--dy-danger); }
.dockyard-root [data-bulk-import-layer] .import-row-detail { display: grid; gap: 10px; padding: 13px; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); font-size: 12px; }
.dockyard-root [data-bulk-import-layer] .import-row-detail h4 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; }
.dockyard-root [data-bulk-import-layer] .import-warning-text { margin: 0; color: var(--dy-warning); font-size: 11.5px; }
.dockyard-root [data-bulk-import-layer] .import-parsed { display: grid; gap: 6px; }
.dockyard-root [data-bulk-import-layer] .import-parsed strong { font-size: 11px; color: var(--dy-text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.dockyard-root [data-bulk-import-layer] .import-parsed dl { margin: 0; display: grid; gap: 3px; font-size: 11.5px; }
.dockyard-root [data-bulk-import-layer] .import-parsed dl > div { display: grid; grid-template-columns: 78px minmax(0, 1fr); gap: 8px; }
.dockyard-root [data-bulk-import-layer] .import-parsed dt { color: var(--dy-text-2); }
.dockyard-root [data-bulk-import-layer] .import-parsed dd { margin: 0; overflow-wrap: anywhere; }
.dockyard-root [data-bulk-import-layer] .import-as { display: grid; gap: 4px; padding-top: 9px; border-top: 1px solid var(--dy-border); }
.dockyard-root [data-bulk-import-layer] .import-as strong { font-size: 11px; color: var(--dy-text-2); text-transform: uppercase; letter-spacing: 0.04em; }
.dockyard-root [data-bulk-import-layer] .import-as p { margin: 0; font-weight: 700; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-actions-left, .dockyard-root [data-bulk-import-layer] .dockyard-wizard-actions-right { display: inline-flex; gap: 9px; }
@media (max-width: 760px) { .dockyard-root [data-bulk-import-layer] .import-split { grid-template-columns: 1fr; } .dockyard-root [data-bulk-import-layer] .import-summary { grid-template-columns: 1fr 1fr; } }
/* LANE-IMPORT */
.dockyard-root [data-bulk-import-layer] .import-drop svg { width: 28px; height: 28px; }
.dockyard-root [data-bulk-import-layer] .import-drop { min-height: 72px; display: grid; grid-template-columns: 32px 1fr; gap: 4px 10px; align-items: center; }
.dockyard-root [data-bulk-import-layer] .import-drop small, .dockyard-root [data-bulk-import-layer] .import-drop input { grid-column: 2; }
.dockyard-root [data-bulk-import-layer] .import-column-reference { margin: 12px 0; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-surface-subtle); }
.dockyard-root [data-bulk-import-layer] .import-column-reference summary { cursor: pointer; padding: 10px 12px; font-weight: 700; }
.dockyard-root [data-bulk-import-layer] .import-column-reference table { width: 100%; border-collapse: collapse; font-size: 11px; }
.dockyard-root [data-bulk-import-layer] .import-column-reference th, .dockyard-root [data-bulk-import-layer] .import-column-reference td { padding: 7px 9px; text-align: left; border-top: 1px solid var(--dy-border); vertical-align: top; }
.dockyard-root [data-bulk-import-layer] .import-required, .dockyard-root [data-bulk-import-layer] .import-optional { display: inline-block; padding: 2px 6px; border-radius: 999px; font-weight: 700; white-space: nowrap; }
.dockyard-root [data-bulk-import-layer] .import-required { color: var(--dy-accent); background: var(--dy-accent-bg); }
.dockyard-root [data-bulk-import-layer] .import-optional { color: var(--dy-text-2); background: var(--dy-surface); }

.dockyard-root [data-backlog-board] :is(button,input,select):focus-visible { outline: 2px solid var(--dy-accent-text); outline-offset: 2px; }
.dockyard-root .dockyard-detail-modal { width: min(870px, 100%); padding: 0; }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head { padding: 20px 24px 15px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-columns { grid-template-columns: minmax(0, 1.7fr) minmax(260px, 1fr); gap: 18px; padding: 18px 24px 12px; margin: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-side { padding: 12px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-footer { margin: 0; padding: 13px 24px 18px; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor { gap: 5px; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor textarea { min-height: 80px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-grid { margin-top: 8px; }
.dockyard-root .dockyard-history-list { margin: 7px 0 0; padding: 0; list-style: none; }
.dockyard-root .dockyard-history-list li { padding: 9px 0; border-top: 1px solid var(--dy-border); font-size: 11px; }
.dockyard-root .dockyard-history-list strong { display: block; color: var(--dy-text); font-size: 11px; }
.dockyard-root .dockyard-history-list span { display: block; margin-top: 2px; color: var(--dy-text-2); }
@media (max-width: 720px) { .dockyard-root .dockyard-detail-modal .dockyard-detail-columns { grid-template-columns: 1fr; } }

/* LANE-DETAIL */
.dockyard-root .dockyard-detail-modal { position: relative;
  width: min(960px, calc(100vw - 32px)); max-height: min(900px, calc(100vh - 32px));
  display: flex; flex-direction: column; padding: 0; overflow: hidden;
  border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); box-shadow: 0 24px 80px rgb(0 0 0 / .22);
}
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head { padding: 20px 28px 18px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head h2 { margin: 7px 0 8px; font-size: 22px; line-height: 1.18; letter-spacing: -.02em; font-weight: 700; }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head > button { width: 34px; height: 34px; padding: 0; font-size: 0; border-radius: 8px; }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head > button::after { content: '×'; font-size: 24px; font-weight: 400; line-height: 1; }
.dockyard-root .dockyard-detail-status-pill { display: inline-flex; align-items: center; gap: 7px; width: max-content; padding: 4px 9px; border: 1px solid var(--dy-border); border-radius: 999px; color: var(--dy-text-2); font-size: 11px; font-weight: 650; }
.dockyard-root .dockyard-detail-status-pill.status-done { color: var(--dy-success); }
.dockyard-root .dockyard-detail-status-pill.status-blocked { color: var(--dy-danger); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-columns { flex: 0 1 auto; min-height: 0; overflow-y: auto; grid-template-columns: minmax(0, 1.6fr) minmax(270px, 1fr); gap: 24px; padding: 24px 28px 18px; margin: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor { gap: 14px; align-content: start; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor > label, .dockyard-root .dockyard-detail-modal .dockyard-field-iconed, .dockyard-root .dockyard-detail-modal .dockyard-profile-picker { gap: 6px; color: var(--dy-text-2); font-size: 11px; font-weight: 700; letter-spacing: .02em; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor > label > input, .dockyard-root .dockyard-detail-modal .dockyard-work-editor > textarea { margin-top: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-field-pair { gap: 12px; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor input, .dockyard-root .dockyard-detail-modal .dockyard-work-editor select, .dockyard-root .dockyard-detail-modal .dockyard-work-editor textarea, .dockyard-root .dockyard-detail-modal .dockyard-profile-picker input, .dockyard-root .dockyard-detail-modal .dockyard-profile-picker select { min-height: 36px; border-radius: 7px; border-color: var(--dy-control-border); background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor textarea { min-height: 104px; resize: vertical; line-height: 1.45; }
.dockyard-root .dockyard-detail-modal .dockyard-field-shell { min-height: 36px; border-radius: 7px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-side { gap: 10px; padding: 12px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-side h3 { margin: 0 0 2px; color: var(--dy-text); font-size: 13px; font-weight: 700; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-grid { margin: 0; gap: 1px; border-radius: 8px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-grid > div { padding: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor { padding-top: 2px; }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-activity { padding: 12px 28px 18px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-activity-head h3 { margin: 0; color: var(--dy-text); font-size: 13px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-activity-head h3::before { content: '◷'; margin-right: 7px; color: var(--dy-accent-text); }
.dockyard-root .dockyard-detail-modal .dockyard-history-list { max-height: 190px; margin-top: 9px; padding-left: 17px; border-left: 1px solid var(--dy-accent-border); }
.dockyard-root .dockyard-detail-modal .dockyard-history-list li { position: relative; padding: 8px 8px 8px 12px; border-top: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list li::before { content: ''; position: absolute; left: -22px; top: 13px; width: 7px; height: 7px; border: 2px solid var(--dy-surface); border-radius: 50%; background: var(--dy-accent-text); box-shadow: 0 0 0 1px var(--dy-accent-border); }
.dockyard-root .dockyard-detail-modal .dockyard-dirty-confirm { position: absolute; z-index: 5; top: 50%; left: 50%; right: auto; width: min(440px, calc(100% - 48px)); transform: translate(-50%, -50%); margin: 0; box-shadow: var(--dy-shadow); pointer-events: none; }
.dockyard-root .dockyard-detail-modal .dockyard-dirty-confirm button { pointer-events: auto; }
.dockyard-root .dockyard-detail-modal .dockyard-dirty-banner { position: relative; z-index: 2; margin: 0; border-radius: 0; border-width: 0 0 1px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-footer-right { margin-left: auto; }
@media (max-width: 720px) { .dockyard-root .dockyard-detail-modal { width: calc(100vw - 20px); max-height: calc(100vh - 20px); } .dockyard-root .dockyard-detail-modal .dockyard-detail-columns { grid-template-columns: 1fr; padding: 18px; } .dockyard-root .dockyard-detail-modal .dockyard-detail-activity, .dockyard-root .dockyard-detail-modal .dockyard-detail-footer, .dockyard-root .dockyard-detail-modal > .dockyard-modal-head { padding-left: 18px; padding-right: 18px; } }
/* Direct visual reconciliation: compact source, structured review and aligned detail. */
.dockyard-root [data-bulk-import-layer] .dockyard-onboarding { width: min(920px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; overflow: hidden; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-body { min-height: 0; overflow-y: auto; padding: 18px 24px; }
.dockyard-root [data-bulk-import-layer] .dockyard-wizard-body textarea { min-height: 92px; height: 100px; max-height: 180px; }
.dockyard-root [data-bulk-import-layer] .import-source-hint { margin: 4px 0 12px; font-size: 12px; color: var(--dy-text-2); }
.dockyard-root [data-bulk-import-layer] .import-source-divider { display: flex; align-items: center; gap: 12px; margin: 12px 0; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root [data-bulk-import-layer] .import-source-divider::before, .dockyard-root [data-bulk-import-layer] .import-source-divider::after { content: ''; height: 1px; flex: 1; background: var(--dy-border); }
.dockyard-root [data-bulk-import-layer] .import-drop { min-height: 0; padding: 10px 12px; grid-template-columns: 24px minmax(0, 1fr); gap: 2px 10px; }
.dockyard-root [data-bulk-import-layer] .import-drop svg { width: 20px !important; height: 20px !important; }
.dockyard-root [data-bulk-import-layer] .import-drop input { margin-top: 4px; font-size: 11px; }
.dockyard-root [data-bulk-import-layer] .dockyard-import-actions-row { margin-top: 0; }
.dockyard-root [data-bulk-import-layer] .import-column-reference { margin: 12px 0 2px; }
.dockyard-root [data-bulk-import-layer] .import-column-reference summary { font-size: 12px; color: var(--dy-text); }
.dockyard-root [data-bulk-import-layer] .import-column-scroll { max-height: 255px; overflow: auto; }
.dockyard-root [data-bulk-import-layer] .import-column-reference code { font-size: 11px; color: var(--dy-text); }
.dockyard-root [data-bulk-import-layer] .import-summary { grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 14px 0 10px; }
.dockyard-root [data-bulk-import-layer] .import-stat { min-height: 42px; justify-content: center; border-radius: 8px; }
.dockyard-root [data-bulk-import-layer] .import-review-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 12px; }
.dockyard-root [data-bulk-import-layer] .import-review-toolbar p { margin: 0; }
.dockyard-root [data-bulk-import-layer] .import-split { grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr); gap: 12px; align-items: stretch; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] { margin: 0; max-height: 390px; align-content: start; }
.dockyard-root [data-bulk-import-layer] [data-import-preview] li { grid-template-columns: 60px minmax(0,1fr) 72px; gap: 8px; align-items: center; min-height: 42px; border-radius: 7px; }
.dockyard-root [data-bulk-import-layer] .import-row-detail { align-content: start; min-width: 0; border-radius: 8px; }
.dockyard-root [data-bulk-import-layer] .import-parsed dl > div { grid-template-columns: 90px minmax(0,1fr); padding: 2px 0; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-columns { gap: 20px; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor > .dockyard-field-pair:last-child { grid-template-columns: 1fr; gap: 14px; }
.dockyard-root .dockyard-detail-modal .dockyard-assignee-field { display: flex; align-items: end; }
.dockyard-root .dockyard-detail-modal .dockyard-assignee-field .dockyard-field-clear { margin-bottom: 7px; }
.dockyard-root .dockyard-detail-modal .dockyard-side-planning { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-width: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-side-planning > label { min-width: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-grid > div:last-child { grid-column: 1 / -1; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-grid > div:last-child dd { margin-top: 4px; }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor .dockyard-form-actions { display: flex; align-items: center; gap: 8px; }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor .dockyard-form-actions input { min-width: 0; height: 36px; flex: 1; }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor .dockyard-form-actions button { min-height: 36px; white-space: nowrap; }
.dockyard-root [data-bulk-import-layer] .import-result-refs { margin-top: 16px; padding: 14px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); }
.dockyard-root [data-bulk-import-layer] .import-result-refs ul { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; font: 12px/1.4 ui-monospace, monospace; }
.dockyard-root [data-bulk-import-layer] .import-result-refs li { overflow-wrap: anywhere; }
@media (max-width: 760px) { .dockyard-root [data-bulk-import-layer] .import-split { grid-template-columns: 1fr; } .dockyard-root [data-bulk-import-layer] .import-review-toolbar { flex-wrap: wrap; } }
/* Shared work-item editor: one reading surface, compact identity and status, one scroll region. */
.dockyard-root .dockyard-detail-modal, .dockyard-root .dockyard-create-modal { width: min(960px, calc(100vw - 36px)); max-height: min(760px, calc(100dvh - 32px)); padding: 0; display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head, .dockyard-root .dockyard-create-modal > .dockyard-modal-head { flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 22px 14px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head h2, .dockyard-root .dockyard-create-modal > .dockyard-modal-head h2 { margin: 7px 0 0; font-size: 19px; line-height: 1.25; letter-spacing: -.025em; font-weight: 700; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-breadcrumb, .dockyard-root .dockyard-create-eyebrow { display: flex; align-items: center; gap: 7px; font-size: 11px; line-height: 1.3; color: var(--dy-text-2); font-weight: 600; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-breadcrumb svg { width: 13px; height: 13px; color: var(--dy-accent-text); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-project { padding-left: 9px; margin-left: 3px; border-left: 1px solid var(--dy-border); color: var(--dy-text-3); font-weight: 400; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-heading { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-heading h2 { min-width: 0; max-width: 100%; overflow-wrap: anywhere; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-status-control { display: inline-flex; align-items: center; gap: 7px; flex: none; min-height: 29px; margin-top: 7px; padding: 0 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-status-control select { min-width: 88px; padding: 3px 0; border: 0; background: transparent; color: var(--dy-text); font-size: 11px; font-weight: 650; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-status-control:focus-within { outline: 2px solid var(--dy-accent-text); outline-offset: 1px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-columns { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 26px; flex: 1 1 auto; min-height: 0; margin: 0; padding: 18px 22px; overflow-y: auto; align-items: start; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor { gap: 10px; align-content: start; }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor > label, .dockyard-root .dockyard-detail-modal .dockyard-field-iconed { gap: 5px; font-size: 11px; font-weight: 650; color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-modal .dockyard-work-editor textarea { min-height: 75px; max-height: 175px; }
.dockyard-root .dockyard-detail-modal .dockyard-field-pair, .dockyard-root .dockyard-detail-modal .dockyard-work-editor > .dockyard-field-pair:last-child { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-side { display: grid; gap: 10px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; align-content: start; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-side h3 { margin: 0 0 1px; font-size: 12px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-identity { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 12px; padding: 9px 11px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-identity > span { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-identity small { color: var(--dy-text-2); font-size: 10px; line-height: 1.3; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-identity strong { color: var(--dy-text); font-size: 12px; overflow-wrap: anywhere; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-evidence { display: grid; gap: 6px; padding-top: 9px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-section-heading span { color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-modal .dockyard-dependency-editor { padding-top: 9px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-modal .dockyard-detail-activity { flex: none; padding: 9px 22px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dockyard-detail-modal .dockyard-history-list { max-height: 100px; overflow-y: auto; margin: 5px 0 0; padding-left: 16px; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list li { padding: 4px 8px; }
.dockyard-root .dockyard-detail-modal .dockyard-history-list li strong { font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-activity-actions { display: inline-flex; align-items: center; gap: 10px; }
.dockyard-root .dockyard-detail-modal .dockyard-activity-expand { border: 0; padding: 4px; background: none; color: var(--dy-accent-text); cursor: pointer; font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-footer, .dockyard-root .dockyard-create-modal > .dockyard-modal-actions { flex: none; padding: 11px 22px; border-top: 1px solid var(--dy-border); background: var(--dy-surface); }
.dockyard-root .dockyard-create-modal .dockyard-create-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 22px; }
.dockyard-root .dockyard-create-modal .dockyard-create-context { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 12px; color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-create-modal .dockyard-create-fields { gap: 10px 14px; }
.dockyard-root .dockyard-create-modal .dockyard-create-fields .dockyard-field { min-width: 0; }
.dockyard-root .dockyard-create-modal .dockyard-create-fields .field-required::after { content: none; }
.dockyard-root .dockyard-create-modal .dockyard-create-fields .field-required > span:first-child::after { content: ' *'; color: var(--dy-danger); }
.dockyard-root .dockyard-create-modal .dockyard-create-fields textarea { min-height: 67px; resize: vertical; }
.dockyard-root .dockyard-create-modal .dockyard-create-fields input, .dockyard-root .dockyard-create-modal .dockyard-create-fields select, .dockyard-root .dockyard-create-modal .dockyard-create-fields textarea { background: var(--dy-surface-subtle); border: 1px solid var(--dy-control-border); border-radius: 7px; color: var(--dy-text); }
@media (max-width: 690px) { .dockyard-root .dockyard-detail-modal, .dockyard-root .dockyard-create-modal { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); } .dockyard-root .dockyard-detail-modal .dockyard-detail-columns { grid-template-columns: 1fr; gap: 16px; padding: 14px; } .dockyard-root .dockyard-detail-modal > .dockyard-modal-head, .dockyard-root .dockyard-detail-modal .dockyard-detail-activity, .dockyard-root .dockyard-detail-modal .dockyard-detail-footer, .dockyard-root .dockyard-create-modal > .dockyard-modal-head, .dockyard-root .dockyard-create-modal .dockyard-create-body, .dockyard-root .dockyard-create-modal > .dockyard-modal-actions { padding-left: 14px; padding-right: 14px; } }
/* Edit mirrors Create's field grid; Activity stays outside the scrolling fields. */
.dockyard-root .dockyard-detail-modal .dockyard-edit-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 14px 22px; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-context { gap: 8px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-task-id { display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border: 1px solid var(--dy-border); border-radius: 5px; background: var(--dy-surface-subtle); color: var(--dy-text-2); white-space: nowrap; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-task-id > span { font-size: 10px; }
.dockyard-root .dockyard-detail-modal .dockyard-detail-task-id code { color: var(--dy-text); font: 600 10px/1.3 ui-monospace, SFMono-Regular, monospace; user-select: all; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-context select { min-height: 28px; padding: 3px 7px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface-subtle); color: var(--dy-text); font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-fields { gap: 10px 14px; margin-top: 0; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-backlog-fields { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 18px; padding: 9px 11px; border: 1px solid var(--dy-border); border-radius: 7px; background: var(--dy-surface-subtle); font-size: 11px; color: var(--dy-text-2); }
.dockyard-root .dockyard-detail-modal .dockyard-edit-backlog-fields strong { color: var(--dy-text); font-weight: 650; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-backlog-fields small { flex-basis: 100%; color: var(--dy-text-3); }
.dockyard-root .dockyard-detail-modal .dockyard-edit-dependencies { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--dy-border); color: var(--dy-text-2); font-size: 11px; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-dependencies strong { color: var(--dy-text); }
.dockyard-root .dockyard-detail-modal .dockyard-edit-dependencies ul { width: 100%; margin: 0; padding-left: 18px; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-dependencies input { min-width: 130px; width: min(230px, 100%); min-height: 34px; margin-left: auto; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dockyard-detail-modal .dockyard-edit-dependencies button { min-height: 34px; }
.dockyard-root .dockyard-detail-modal .dockyard-edit-unsaved { display: inline-flex; align-items: center; gap: 9px; font-size: 11px; color: var(--dy-warning); }
.dockyard-root .dockyard-detail-modal .dockyard-edit-unsaved button { min-height: 30px; }
@media (max-width: 690px) { .dockyard-root .dockyard-detail-modal .dockyard-edit-body { padding: 14px; } }
`
