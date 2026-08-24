/**
 * Hermes Dockyard desktop runtime plugin.
 * Dependency-free React surface for fleet status, approvals and notifications.
 */
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import { useEffect, useState } from 'react'
import { host } from '@hermes/plugin-sdk'

const LIGHT_TOKENS = Object.freeze({
  bg: '#f6f7f9',
  surface: '#ffffff',
  surfaceSubtle: '#f0f2f5',
  surfaceStrong: '#e8ebf0',
  text: '#15171c',
  textSecondary: '#515968',
  textTertiary: '#626c7b',
  border: '#d7dce4',
  controlBorder: '#87909d',
  action: '#3654c7',
  actionHover: '#2945b4',
  accentText: '#293f9e',
  accentSoft: '#eef1ff',
  success: '#136c4a',
  successBg: '#e7f6ef',
  warning: '#805200',
  warningBg: '#fff3d4',
  danger: '#a72a2a',
  dangerBg: '#ffeded',
  info: '#315ca8',
  infoBg: '#eaf2ff',
  neutral: '#596273',
  neutralBg: '#edf0f4',
  focus: '#3654c7',
  disabledText: '#515968',
  disabledBg: '#e8ebf0',
})

const DARK_TOKENS = Object.freeze({
  bg: '#0f1217',
  surface: '#171b22',
  surfaceSubtle: '#1d222b',
  surfaceStrong: '#252b36',
  text: '#f3f5f7',
  textSecondary: '#b6beca',
  textTertiary: '#949eac',
  border: '#2e3541',
  controlBorder: '#5f6977',
  action: '#3654c7',
  actionHover: '#4662d4',
  accentText: '#c2cbff',
  accentSoft: '#232c4f',
  success: '#72cda2',
  successBg: '#16372a',
  warning: '#f0bd64',
  warningBg: '#3a2c14',
  danger: '#ff9188',
  dangerBg: '#40201f',
  info: '#9ab9ff',
  infoBg: '#1c2d4a',
  neutral: '#bac2ce',
  neutralBg: '#2a303a',
  focus: '#8fa2ff',
  disabledText: '#b6beca',
  disabledBg: '#252b36',
})

const CONTRAST_PAIRS = Object.freeze([
  { theme: 'light', label: 'primary text on page', foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: 'light', label: 'primary text on surface', foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'primary text on subtle surface', foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'light', label: 'secondary text on page', foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: 'light', label: 'secondary text', foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'secondary text on subtle surface', foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'light', label: 'tertiary metadata on page', foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: 'light', label: 'tertiary metadata', foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'tertiary metadata on subtle surface', foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'light', label: 'primary action', foreground: '#ffffff', background: LIGHT_TOKENS.action, minimum: 4.5 },
  { theme: 'light', label: 'primary action hover', foreground: '#ffffff', background: LIGHT_TOKENS.actionHover, minimum: 4.5 },
  { theme: 'light', label: 'accent tag', foreground: LIGHT_TOKENS.accentText, background: LIGHT_TOKENS.accentSoft, minimum: 4.5 },
  { theme: 'light', label: 'accent text on surface', foreground: LIGHT_TOKENS.accentText, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'success', foreground: LIGHT_TOKENS.success, background: LIGHT_TOKENS.successBg, minimum: 4.5 },
  { theme: 'light', label: 'success on surface', foreground: LIGHT_TOKENS.success, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'warning', foreground: LIGHT_TOKENS.warning, background: LIGHT_TOKENS.warningBg, minimum: 4.5 },
  { theme: 'light', label: 'warning on surface', foreground: LIGHT_TOKENS.warning, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'danger', foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.dangerBg, minimum: 4.5 },
  { theme: 'light', label: 'danger on surface', foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: 'light', label: 'danger on subtle surface', foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'light', label: 'information', foreground: LIGHT_TOKENS.info, background: LIGHT_TOKENS.infoBg, minimum: 4.5 },
  { theme: 'light', label: 'information on subtle surface', foreground: LIGHT_TOKENS.info, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'light', label: 'neutral', foreground: LIGHT_TOKENS.neutral, background: LIGHT_TOKENS.neutralBg, minimum: 4.5 },
  { theme: 'light', label: 'disabled control', foreground: LIGHT_TOKENS.disabledText, background: LIGHT_TOKENS.disabledBg, minimum: 4.5 },
  { theme: 'light', label: 'control boundary on page', foreground: LIGHT_TOKENS.controlBorder, background: LIGHT_TOKENS.bg, minimum: 3 },
  { theme: 'light', label: 'control boundary on surface', foreground: LIGHT_TOKENS.controlBorder, background: LIGHT_TOKENS.surface, minimum: 3 },
  { theme: 'light', label: 'focus indicator', foreground: LIGHT_TOKENS.focus, background: LIGHT_TOKENS.bg, minimum: 3 },
  { theme: 'dark', label: 'primary text on page', foreground: DARK_TOKENS.text, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: 'dark', label: 'primary text on surface', foreground: DARK_TOKENS.text, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'primary text on subtle surface', foreground: DARK_TOKENS.text, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'dark', label: 'secondary text on page', foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: 'dark', label: 'secondary text', foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'secondary text on subtle surface', foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'dark', label: 'tertiary metadata on page', foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: 'dark', label: 'tertiary metadata', foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'tertiary metadata on subtle surface', foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'dark', label: 'primary action', foreground: '#ffffff', background: DARK_TOKENS.action, minimum: 4.5 },
  { theme: 'dark', label: 'primary action hover', foreground: '#ffffff', background: DARK_TOKENS.actionHover, minimum: 4.5 },
  { theme: 'dark', label: 'accent tag', foreground: DARK_TOKENS.accentText, background: DARK_TOKENS.accentSoft, minimum: 4.5 },
  { theme: 'dark', label: 'accent text on surface', foreground: DARK_TOKENS.accentText, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'success', foreground: DARK_TOKENS.success, background: DARK_TOKENS.successBg, minimum: 4.5 },
  { theme: 'dark', label: 'success on surface', foreground: DARK_TOKENS.success, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'warning', foreground: DARK_TOKENS.warning, background: DARK_TOKENS.warningBg, minimum: 4.5 },
  { theme: 'dark', label: 'warning on surface', foreground: DARK_TOKENS.warning, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'danger', foreground: DARK_TOKENS.danger, background: DARK_TOKENS.dangerBg, minimum: 4.5 },
  { theme: 'dark', label: 'danger on surface', foreground: DARK_TOKENS.danger, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: 'dark', label: 'danger on subtle surface', foreground: DARK_TOKENS.danger, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'dark', label: 'information', foreground: DARK_TOKENS.info, background: DARK_TOKENS.infoBg, minimum: 4.5 },
  { theme: 'dark', label: 'information on subtle surface', foreground: DARK_TOKENS.info, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: 'dark', label: 'neutral', foreground: DARK_TOKENS.neutral, background: DARK_TOKENS.neutralBg, minimum: 4.5 },
  { theme: 'dark', label: 'disabled control', foreground: DARK_TOKENS.disabledText, background: DARK_TOKENS.disabledBg, minimum: 4.5 },
  { theme: 'dark', label: 'control boundary on page', foreground: DARK_TOKENS.controlBorder, background: DARK_TOKENS.bg, minimum: 3 },
  { theme: 'dark', label: 'control boundary on surface', foreground: DARK_TOKENS.controlBorder, background: DARK_TOKENS.surface, minimum: 3 },
  { theme: 'dark', label: 'focus indicator', foreground: DARK_TOKENS.focus, background: DARK_TOKENS.bg, minimum: 3 },
])

const DOCKYARD_TEST = Object.freeze({
  palettes: { light: LIGHT_TOKENS, dark: DARK_TOKENS },
  contrastPairs: CONTRAST_PAIRS,
})

const DOCKYARD_CSS = `
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
  min-height: 100%;
  background: ${LIGHT_TOKENS.bg};
  color: ${LIGHT_TOKENS.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  isolation: isolate;
}
@media (prefers-color-scheme: dark) {
  .dockyard-root {
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
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 3px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  scrollbar-width: none;
}
.dockyard-root .dockyard-tabs::-webkit-scrollbar { display: none; }
.dockyard-root .dockyard-tab {
  position: relative;
  min-width: max-content;
  min-height: 38px;
  padding: 8px 11px;
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
.dockyard-root .dockyard-panel,
.dockyard-root .dockyard-section {
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-panel { padding: 22px; }
.dockyard-root .dockyard-attention {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 24px;
  min-height: 210px;
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
.dockyard-root .dockyard-attention h2,
.dockyard-root .dockyard-status-panel h2,
.dockyard-root .dockyard-section-head h2,
.dockyard-root .dockyard-feed-head h2 {
  margin: 0;
  color: var(--dy-text);
  font-size: 17px;
  line-height: 1.3;
  letter-spacing: -0.015em;
}
.dockyard-root .dockyard-attention p,
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
.dockyard-root .dockyard-attention.is-clear .dockyard-attention-icon { color: var(--dy-success); background: var(--dy-success-bg); }
.dockyard-root .dockyard-attention.is-clear .dockyard-decision-count { color: var(--dy-success); font-size: 30px; }
.dockyard-root .dockyard-status-panel { min-height: 210px; }
.dockyard-root .dockyard-status-panel h2 { margin-bottom: 15px; }
.dockyard-root .dockyard-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-border);
}
.dockyard-root .dockyard-status-cell {
  min-height: 68px;
  padding: 12px 13px;
  background: var(--dy-surface-subtle);
}
.dockyard-root .dockyard-status-cell span { display: block; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-status-cell strong {
  display: block;
  margin-top: 5px;
  color: var(--dy-text);
  font-size: 19px;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
}
.dockyard-root .dockyard-status-cell strong.is-danger { color: var(--dy-danger); }
.dockyard-root .dockyard-status-cell strong.is-info { color: var(--dy-info); }
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
.dockyard-root .dockyard-project-name { display: flex; align-items: center; gap: 11px; min-width: 0; }
.dockyard-root .dockyard-project-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  background: var(--dy-accent-soft);
  color: var(--dy-accent-text);
}
.dockyard-root .dockyard-project-icon svg { width: 17px; height: 17px; }
.dockyard-root .dockyard-project-name strong,
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
.dockyard-root .dockyard-project-name span,
.dockyard-root .dockyard-meta {
  display: block;
  margin-top: 3px;
  color: var(--dy-text-3);
  font-size: 11px;
}
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
.dockyard-root .dockyard-queue-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  padding: 13px 15px;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface-subtle);
  color: var(--dy-text-2);
  font-size: 13px;
}
.dockyard-root .dockyard-queue-intro strong { color: var(--dy-text); font-variant-numeric: tabular-nums; }
.dockyard-root .dockyard-approval-list,
.dockyard-root .dockyard-feed-group { overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); }
.dockyard-root .dockyard-approval-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) auto;
  grid-template-areas: "risk main actions" "risk error actions";
  gap: 6px 18px;
  align-items: center;
  min-height: 92px;
  padding: 17px 19px;
  border-top: 1px solid var(--dy-border);
}
.dockyard-root .dockyard-approval-row:first-child { border-top: 0; }
.dockyard-root .dockyard-approval-row[data-state="approved"] { background: var(--dy-success-bg); }
.dockyard-root .dockyard-approval-risk { grid-area: risk; }
.dockyard-root .dockyard-approval-main { grid-area: main; min-width: 0; }
.dockyard-root .dockyard-approval-main h2 { font-size: 15px; }
.dockyard-root .dockyard-approval-actions { grid-area: actions; display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.dockyard-root .dockyard-inline-error { grid-area: error; margin: 0; color: var(--dy-danger); font-size: 12px; }
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
@media (max-width: 980px) {
  .dockyard-root .dockyard-overview-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-attention,
  .dockyard-root .dockyard-status-panel { min-height: 0; }
}
@media (max-width: 820px) {
  .dockyard-root .dockyard-shell { padding: 14px 16px 34px; }
  .dockyard-root .dockyard-consolebar { align-items: flex-start; margin-bottom: 24px; }
  .dockyard-root .dockyard-brand-copy span { display: none; }
  .dockyard-root .dockyard-page-head { align-items: stretch; }
  .dockyard-root .dockyard-project-head { display: none; }
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
  .dockyard-root .dockyard-approval-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: "main risk" "actions actions" "error error";
    align-items: start;
  }
  .dockyard-root .dockyard-approval-risk { justify-self: end; }
  .dockyard-root .dockyard-approval-actions { justify-content: flex-start; }
  .dockyard-root .dockyard-notification-row {
    grid-template-columns: 36px minmax(0, 1fr);
    grid-template-areas: "marker main" ". action" ". error";
    align-items: start;
  }
  .dockyard-root .dockyard-notification-action { justify-content: flex-start; }
}
@media (max-width: 640px) {
  .dockyard-root .dockyard-consolebar { flex-direction: column; }
  .dockyard-root .dockyard-tabs { width: 100%; }
  .dockyard-root .dockyard-page-head { flex-direction: column; }
  .dockyard-root .dockyard-attention { grid-template-columns: 1fr; align-items: start; }
  .dockyard-root .dockyard-status-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-queue-intro { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .dockyard-root *,
  .dockyard-root *::before,
  .dockyard-root *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`

let _rest = null
function bindRest(ctx) { _rest = ctx.rest }

async function api(path, init) {
  try {
    return await _rest(path, { method: init?.method ?? 'GET', body: init?.body })
  } catch (error) {
    throw new Error(String(error?.message ?? error).slice(0, 140))
  }
}

function useDockyardStyles() {
  useEffect(() => {
    const existing = document.querySelector('style[data-dockyard-style="true"]')
    if (existing) return undefined
    const style = document.createElement('style')
    style.dataset.dockyardStyle = 'true'
    style.textContent = DOCKYARD_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
}

function Icon({ name }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'dock') {
    return jsxs('svg', { ...common, children: [
      jsx('path', { d: 'M4 18h16' }),
      jsx('path', { d: 'm6 18 2-9h8l2 9' }),
      jsx('path', { d: 'M9 9V6h6v3' }),
    ]})
  }
  if (name === 'project') {
    return jsxs('svg', { ...common, children: [
      jsx('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
      jsx('path', { d: 'M3 9h18M8 4v5' }),
    ]})
  }
  if (name === 'check') {
    return jsxs('svg', { ...common, children: [
      jsx('circle', { cx: 12, cy: 12, r: 9 }),
      jsx('path', { d: 'm8 12 2.6 2.6L16.5 9' }),
    ]})
  }
  if (name === 'alert') {
    return jsxs('svg', { ...common, children: [
      jsx('path', { d: 'M12 3 2.8 20h18.4L12 3Z' }),
      jsx('path', { d: 'M12 9v4M12 17h.01' }),
    ]})
  }
  if (name === 'refresh') {
    return jsxs('svg', { ...common, children: [
      jsx('path', { d: 'M20 7v5h-5' }),
      jsx('path', { d: 'M4 17v-5h5' }),
      jsx('path', { d: 'M6.1 8a7 7 0 0 1 11.8-1L20 12M4 12l2.1 5a7 7 0 0 0 11.8-1' }),
    ]})
  }
  return jsxs('svg', { ...common, children: [
    jsx('path', { d: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7' }),
    jsx('path', { d: 'M10 20h4' }),
  ]})
}

function number(value) {
  return new Intl.NumberFormat('en-GB').format(Number(value ?? 0))
}

function plural(value, singular, multiple = `${singular}s`) {
  return Number(value) === 1 ? singular : multiple
}

function healthDetails(value) {
  const map = {
    healthy: ['success', 'Healthy'],
    watch: ['warning', 'Watch'],
    frozen: ['danger', 'Frozen'],
    attention: ['danger', 'Needs attention'],
    degraded: ['warning', 'Degraded'],
    critical: ['danger', 'Critical'],
    unknown: ['neutral', 'Not verified'],
  }
  return map[value] ?? ['neutral', 'Not verified']
}

function riskDetails(value) {
  const risk = String(value || 'medium').toLowerCase()
  if (risk === 'low') return ['success', 'Low risk']
  if (risk === 'high' || risk === 'critical') return ['danger', `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk`]
  return ['warning', 'Medium risk']
}

function severityTone(value) {
  const severity = String(value || 'info').toLowerCase()
  if (severity === 'high' || severity === 'critical' || severity === 'error') return 'danger'
  if (severity === 'medium' || severity === 'warning') return 'warning'
  return 'info'
}

function formatWhen(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

function StatusTag({ tone = 'neutral', label }) {
  return jsxs('span', { className: `dockyard-status-tag ${tone}`, children: [
    jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
    label,
  ]})
}

function Button({ children, onClick, variant = '', small = false, disabled = false, action }) {
  return jsx('button', {
    type: 'button',
    className: `dockyard-button${variant ? ` ${variant}` : ''}${small ? ' small' : ''}`,
    disabled,
    onClick,
    'data-action': action,
    children,
  })
}

function ConsoleBar({ tab, counts, onTab }) {
  const tabs = [
    ['dashboard', 'Fleet', null],
    ['inbox', 'Approvals', counts.approvals],
    ['notifications', 'Notifications', counts.notifications],
  ]
  const moveTab = (event, index) => {
    let next = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    const nextKey = tabs[next][0]
    onTab(nextKey)
    document.getElementById(`dockyard-tab-${nextKey}`)?.focus()
  }
  return jsxs('header', { className: 'dockyard-consolebar', children: [
    jsxs('div', { className: 'dockyard-brand', children: [
      jsx('span', { className: 'dockyard-brand-mark', children: jsx(Icon, { name: 'dock' }) }),
      jsxs('span', { className: 'dockyard-brand-copy', children: [
        jsx('strong', { children: 'Dockyard' }),
        jsx('span', { children: 'Fleet oversight' }),
      ]}),
    ]}),
    jsx('nav', { className: 'dockyard-tabs', role: 'tablist', 'aria-label': 'Dockyard sections', children:
      tabs.map(([key, label, count], index) => jsxs('button', {
        id: `dockyard-tab-${key}`,
        type: 'button',
        role: 'tab',
        className: 'dockyard-tab',
        'data-tab': key,
        'aria-selected': tab === key,
        'aria-controls': 'dockyard-panel',
        tabIndex: tab === key ? 0 : -1,
        onClick: () => onTab(key),
        onKeyDown: (event) => moveTab(event, index),
        children: [
          label,
          Number(count) > 0 ? jsx('span', { className: 'dockyard-tab-count', children: number(count) }) : null,
        ],
      }, key)),
    }),
  ]})
}

function PageHead({ title, description, onRefresh }) {
  return jsxs('div', { className: 'dockyard-page-head', children: [
    jsxs('div', { children: [
      jsx('h1', { children: title }),
      jsx('p', { children: description }),
    ]}),
    onRefresh ? jsx('div', { className: 'dockyard-page-actions', children:
      jsx(Button, {
        action: 'refresh',
        onClick: onRefresh,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'refresh' }), 'Refresh'] }),
      }),
    }) : null,
  ]})
}

function EmptyState({ title, description, icon = 'project' }) {
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'empty', children: [
    jsx('span', { className: 'dockyard-empty-icon', children: jsx(Icon, { name: icon }) }),
    jsx('h2', { children: title }),
    jsx('p', { children: description }),
  ]})
}

function ErrorState({ error, onRetry }) {
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'error', children: [
    jsx('span', { className: 'dockyard-error-icon', children: jsx(Icon, { name: 'alert' }) }),
    jsx('h2', { children: 'Dockyard could not load this view' }),
    jsx('p', { children: String(error) }),
    jsx(Button, { action: 'retry', variant: 'primary', onClick: onRetry, children: 'Try again' }),
  ]})
}

function LoadingState() {
  return jsxs('div', { className: 'dockyard-skeleton-page', 'data-state': 'loading', 'aria-label': 'Loading Dockyard data', children: [
    jsx('div', { className: 'dockyard-skeleton title' }),
    jsx('div', { className: 'dockyard-skeleton copy' }),
    jsxs('div', { className: 'dockyard-overview-grid', children: [
      jsx('div', { className: 'dockyard-skeleton summary' }),
      jsx('div', { className: 'dockyard-skeleton summary' }),
    ]}),
    jsx('div', { className: 'dockyard-section', children:
      [0, 1, 2].map((index) => jsx('div', { className: 'dockyard-skeleton row' }, index)),
    }),
  ]})
}

function AttentionPanel({ owed, onReview }) {
  if (owed === 0) {
    return jsxs('section', { className: 'dockyard-panel dockyard-attention is-clear', children: [
      jsxs('div', { children: [
        jsx('span', { className: 'dockyard-attention-icon', children: jsx(Icon, { name: 'check' }) }),
        jsx('h2', { children: 'No decisions waiting' }),
        jsx('strong', { className: 'dockyard-decision-count', children: 'All clear' }),
        jsx('p', { children: 'The fleet can keep moving without owner input.' }),
      ]}),
    ]})
  }
  return jsxs('section', { className: 'dockyard-panel dockyard-attention', children: [
    jsxs('div', { children: [
      jsx('span', { className: 'dockyard-attention-icon', children: jsx(Icon, { name: 'alert' }) }),
      jsx('h2', { children: 'Needs your decision' }),
      jsx('strong', { className: 'dockyard-decision-count', children: number(owed) }),
      jsx('p', { children: `${number(owed)} ${plural(owed, 'approval')} waiting across the fleet.` }),
    ]}),
    jsx(Button, { variant: 'primary', onClick: onReview, children: 'Review approvals' }),
  ]})
}

function FleetStatus({ projects, totals }) {
  const blocked = Number(totals.blocked ?? 0)
  const unread = Number(totals.unacked_notifications ?? projects.reduce((sum, project) => sum + Number(project.unacked_notifications ?? 0), 0))
  return jsxs('section', { className: 'dockyard-panel dockyard-status-panel', children: [
    jsx('h2', { children: 'Fleet status' }),
    jsxs('div', { className: 'dockyard-status-grid', children: [
      jsxs('div', { className: 'dockyard-status-cell', children: [jsx('span', { children: 'Projects' }), jsx('strong', { children: number(projects.length) })] }),
      jsxs('div', { className: 'dockyard-status-cell', children: [jsx('span', { children: 'Active work' }), jsx('strong', { children: number(totals.active_work ?? 0) })] }),
      jsxs('div', { className: 'dockyard-status-cell', children: [jsx('span', { children: 'Blocked work' }), jsx('strong', { className: blocked > 0 ? 'is-danger' : '', children: number(blocked) })] }),
      jsxs('div', { className: 'dockyard-status-cell', children: [jsx('span', { children: 'Unread alerts' }), jsx('strong', { className: unread > 0 ? 'is-info' : '', children: number(unread) })] }),
    ]}),
  ]})
}

function ProjectRow({ project }) {
  const [tone, label] = healthDetails(project.health)
  const work = project.work ?? {}
  const alerts = Number(project.unacked_notifications ?? 0)
  return jsxs('div', { className: 'dockyard-project-row', role: 'row', 'data-project-row': project.id, children: [
    jsx('div', { className: 'dockyard-project-cell project', role: 'cell', children:
      jsxs('div', { className: 'dockyard-project-name', children: [
        jsx('span', { className: 'dockyard-project-icon', children: jsx(Icon, { name: 'project' }) }),
        jsxs('span', { children: [
          jsx('strong', { children: project.id }),
          jsx('span', { children: project.phase ? `Phase: ${project.phase}` : 'No phase set' }),
        ]}),
      ]}),
    }),
    jsx('div', { className: 'dockyard-project-cell health', role: 'cell', children: jsx(StatusTag, { tone, label }) }),
    jsx('div', { className: 'dockyard-project-cell work', role: 'cell', children:
      jsxs('div', { className: 'dockyard-work-stats', 'aria-label': `Work: ${work.active ?? 0} active, ${work.backlog ?? 0} backlog, ${work.done ?? 0} done`, children: [
        jsxs('span', { children: [jsx('strong', { children: number(work.active) }), ' active'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.backlog) }), ' backlog'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.done) }), ' done'] }),
      ]}),
    }),
    jsx('div', { className: 'dockyard-project-cell alerts', role: 'cell', children:
      jsx('span', { className: `dockyard-alert-count${alerts > 0 ? ' has-alert' : ''}`, children: alerts > 0 ? `${number(alerts)} unread` : 'None unread' }),
    }),
  ]})
}

function DashboardView({ view, onInbox, onRefresh }) {
  const projects = view.projects ?? []
  const totals = view.totals ?? {}
  if (projects.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Fleet overview', description: 'Project health, work and owner decisions in one view.', onRefresh }),
      jsx(EmptyState, { title: 'No projects under watch', description: 'Projects will appear here after they are connected to Dockyard.', icon: 'project' }),
    ]})
  }
  const owed = Number(view.owed_decisions ?? 0)
  const unread = Number(totals.unacked_notifications ?? 0)
  const attention = []
  if (owed > 0) attention.push(`${number(owed)} ${plural(owed, 'approval')}`)
  if (unread > 0) attention.push(`${number(unread)} unread ${plural(unread, 'alert')}`)
  const attentionCount = owed + unread
  const summary = attention.length > 0
    ? `${attention.join(' and ')} ${attentionCount === 1 ? 'needs' : 'need'} review.`
    : 'No owner action is waiting.'
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Fleet overview',
      description: `${number(projects.length)} ${plural(projects.length, 'project')} under watch. ${summary}`,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-overview-grid', children: [
      jsx(AttentionPanel, { owed: Number(view.owed_decisions ?? 0), onReview: onInbox }),
      jsx(FleetStatus, { projects, totals }),
    ]}),
    jsxs('section', { className: 'dockyard-section', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('h2', { children: 'Projects' }), jsx('p', { children: 'Current phase, health signal and work distribution.' })] }),
        jsx('span', { className: 'dockyard-section-count', children: `${number(projects.length)} total` }),
      ]}),
      jsxs('div', { role: 'table', 'aria-label': 'Project fleet', children: [
        jsxs('div', { className: 'dockyard-project-head', role: 'row', children: [
          jsx('span', { role: 'columnheader', children: 'Project' }),
          jsx('span', { role: 'columnheader', children: 'Health' }),
          jsx('span', { role: 'columnheader', children: 'Work' }),
          jsx('span', { role: 'columnheader', children: 'Alerts' }),
        ]}),
        projects.map((project) => jsx(ProjectRow, { project }, project.id)),
      ]}),
    ]}),
  ]})
}

function ApprovalRow({ item, onResolved }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [tone, label] = riskDetails(item.risk)
  const approve = async () => {
    setState('approving')
    setError(null)
    try {
      await api(`/initiatives/${encodeURIComponent(item.ref)}/approve`, { method: 'POST', body: {} })
      setState('approved')
      setTimeout(onResolved, 850)
    } catch (failure) {
      setState('failed')
      setError(String(failure?.message ?? failure))
    }
  }
  return jsxs('article', { className: 'dockyard-approval-row', 'data-approval-ref': item.ref, 'data-state': state, children: [
    jsx('div', { className: 'dockyard-approval-risk', children: jsx(StatusTag, { tone: state === 'approved' ? 'success' : tone, label: state === 'approved' ? 'Approved' : label }) }),
    jsxs('div', { className: 'dockyard-approval-main', children: [
      jsx('h2', { children: item.title }),
      jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}` }),
    ]}),
    jsx('div', { className: 'dockyard-approval-actions', children:
      state === 'approved'
        ? jsx(StatusTag, { tone: 'success', label: 'Approved' })
        : jsx(Button, {
            action: 'approve',
            variant: 'primary',
            disabled: state === 'approving',
            onClick: approve,
            children: state === 'approving' ? 'Approving...' : state === 'failed' ? 'Try again' : 'Approve',
          }),
    }),
    error ? jsx('p', { className: 'dockyard-inline-error', children: `Approval failed: ${error}` }) : null,
  ]})
}

function InboxView({ view, onRefresh }) {
  const items = view.items ?? []
  if (items.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Approval queue', description: 'Owner-only decisions from every project.', onRefresh }),
      jsx(EmptyState, { title: 'No approvals waiting', description: 'New owner decisions will appear here with their project, reference and risk.', icon: 'check' }),
    ]})
  }
  return jsxs(Fragment, { children: [
    jsx(PageHead, { title: 'Approval queue', description: 'Owner-only decisions from every project.', onRefresh }),
    jsxs('div', { className: 'dockyard-queue-intro', children: [
      jsxs('span', { children: [jsx('strong', { children: number(items.length) }), ` ${plural(items.length, 'decision')} waiting`] }),
      jsx('span', { children: 'Approve only after the project and risk match your intent.' }),
    ]}),
    jsx('section', { className: 'dockyard-approval-list', 'aria-label': 'Pending approvals', children:
      items.map((item) => jsx(ApprovalRow, { item, onResolved: onRefresh }, item.ref)),
    }),
  ]})
}

function NotificationRow({ note, onAcknowledged }) {
  const [state, setState] = useState(note.acked ? 'cleared' : 'unread')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const tone = severityTone(note.severity)
  const acknowledge = async () => {
    setBusy(true)
    setError(null)
    try {
      await api(`/notifications/${note.id}/ack`, { method: 'POST', body: {} })
      setState('cleared')
      onAcknowledged(note.id)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const when = formatWhen(note.created_at)
  return jsxs('article', { className: 'dockyard-notification-row', 'data-notification-id': String(note.id), 'data-notification-state': state, children: [
    jsx('span', { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === 'danger' || tone === 'warning' ? 'alert' : 'bell' }) }),
    jsxs('div', { className: 'dockyard-notification-main', children: [
      jsx('h3', { children: note.title ?? 'Fleet notification' }),
      jsx('p', { children: note.body ?? '' }),
      jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'}${when ? ` / ${when}` : ''}` }),
    ]}),
    jsx('div', { className: 'dockyard-notification-action', children:
      state === 'cleared'
        ? jsx(StatusTag, { tone: 'neutral', label: 'Cleared' })
        : jsx(Button, { action: 'acknowledge', small: true, disabled: busy, onClick: acknowledge, children: busy ? 'Clearing...' : 'Acknowledge' }),
    }),
    error ? jsx('p', { className: 'dockyard-inline-error', children: `Could not clear: ${error}` }) : null,
  ]})
}

function NotificationGroup({ title, description, items, onAcknowledged }) {
  return jsxs('section', { className: 'dockyard-feed-group', children: [
    jsxs('div', { className: 'dockyard-feed-head', children: [
      jsxs('div', { children: [jsx('h2', { children: title }), jsx('p', { children: description })] }),
      jsx('span', { className: 'dockyard-section-count', children: number(items.length) }),
    ]}),
    items.map((note) => jsx(NotificationRow, { note, onAcknowledged }, String(note.id))),
  ]})
}

function NotificationsView({ view, onRefresh, onAcknowledged }) {
  const notes = view.notifications ?? []
  if (notes.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Notifications', description: 'Attributed fleet events and their cleared history.', onRefresh }),
      jsx(EmptyState, { title: 'No notifications yet', description: 'Fleet events will appear here when work changes state or needs attention.', icon: 'bell' }),
    ]})
  }
  const unread = notes.filter((note) => !note.acked)
  const cleared = notes.filter((note) => note.acked)
  return jsxs(Fragment, { children: [
    jsx(PageHead, { title: 'Notifications', description: 'Attributed fleet events and their cleared history.', onRefresh }),
    unread.length > 0 ? jsx(NotificationGroup, { title: 'Needs attention', description: 'Unread fleet events.', items: unread, onAcknowledged }) : null,
    cleared.length > 0 ? jsx(NotificationGroup, { title: 'Cleared', description: 'Acknowledged events remain available for context.', items: cleared, onAcknowledged }) : null,
  ]})
}

function DashboardPage() {
  useDockyardStyles()
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [counts, setCounts] = useState({ approvals: null, notifications: null })

  useEffect(() => {
    let current = true
    setData(null)
    setError(null)
    const path = tab === 'dashboard' ? '/dashboard' : tab === 'inbox' ? '/inbox' : '/notifications'
    api(path).then(
      (result) => {
        if (!current) return
        setData(result)
        if (tab === 'dashboard') {
          setCounts({
            approvals: Number(result.owed_decisions ?? 0),
            notifications: Number(result.totals?.unacked_notifications ?? 0),
          })
        } else if (tab === 'inbox') {
          setCounts((previous) => ({ ...previous, approvals: Number(result.count ?? result.items?.length ?? 0) }))
        } else {
          setCounts((previous) => ({ ...previous, notifications: Number((result.notifications ?? []).filter((note) => !note.acked).length) }))
        }
      },
      (failure) => { if (current) setError(failure) },
    )
    return () => { current = false }
  }, [tab, requestVersion])

  const refresh = () => setRequestVersion((version) => version + 1)
  const acknowledge = (id) => {
    setData((previous) => {
      if (!previous?.notifications) return previous
      return { ...previous, notifications: previous.notifications.map((note) => note.id === id ? { ...note, acked: true } : note) }
    })
    setCounts((previous) => ({ ...previous, notifications: Math.max(0, Number(previous.notifications ?? 1) - 1) }))
  }

  let content
  if (error) {
    content = jsx(ErrorState, { error, onRetry: refresh })
  } else if (!data) {
    content = jsx(LoadingState, {})
  } else if (tab === 'dashboard') {
    content = jsx(DashboardView, { view: data, onInbox: () => setTab('inbox'), onRefresh: refresh })
  } else if (tab === 'inbox') {
    content = jsx(InboxView, { view: data, onRefresh: refresh })
  } else {
    content = jsx(NotificationsView, { view: data, onRefresh: refresh, onAcknowledged: acknowledge })
  }

  return jsx('div', { className: 'dockyard-root', children:
    jsxs('div', { className: 'dockyard-shell', children: [
      jsx(ConsoleBar, { tab, counts, onTab: setTab }),
      jsx('main', {
        id: 'dockyard-panel',
        role: 'tabpanel',
        'aria-labelledby': `dockyard-tab-${tab}`,
        children: content,
      }),
    ]}),
  })
}

const __plugin = {
  id: 'hermes-dockyard',
  name: 'Hermes Dockyard',
  register(ctx) {
    bindRest(ctx)
    ctx.registerMany([
      {
        id: 'page',
        area: 'routes',
        data: { path: '/dockyard' },
        render: () => jsx(DashboardPage, {}),
      },
      {
        id: 'nav',
        area: 'sidebar.nav',
        order: 55,
        data: { codicon: 'project', label: 'Dockyard', path: '/dockyard' },
      },
      {
        id: 'open',
        area: 'palette',
        data: {
          id: 'hermes-dockyard.open',
          label: 'Dockyard: Open fleet overview',
          keywords: ['dockyard', 'fleet', 'projects', 'approvals', 'notifications'],
          run: () => host.navigate('/dockyard'),
        },
      },
    ])
  },
}

export default __plugin
