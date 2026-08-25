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
  accentBorder: '#b8c4f0',
  shadow: '0 10px 28px rgba(31, 42, 68, 0.08)',
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
  accentBorder: '#46558f',
  shadow: '0 12px 30px rgba(0, 0, 0, 0.24)',
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
  align-items: center;
  gap: 2px;
  min-width: 0;
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
@media (max-width: 980px) {
  .dockyard-root .dockyard-overview-grid { grid-template-columns: 1fr; }
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
  display: flex;
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
.dockyard-root .dockyard-board-wrap { overflow-x: auto; padding-bottom: 6px; }
.dockyard-root .dockyard-board { display: grid; grid-template-columns: repeat(4, minmax(240px, 1fr)); gap: 12px; min-width: 1040px; }
.dockyard-root .dockyard-board-column { min-height: 360px; border: 1px solid var(--dy-border); border-radius: 13px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-board-column > header { display: flex; align-items: center; justify-content: space-between; padding: 14px 14px 11px; }
.dockyard-root .dockyard-board-column h3 { margin: 0; font-size: 13px; }
.dockyard-root .dockyard-board-column header span { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-board-cards { padding: 0 9px 10px; }
.dockyard-root .dockyard-work-card {
  display: block;
  width: 100%;
  margin-bottom: 9px;
  padding: 12px;
  border: 1px solid var(--dy-border);
  border-radius: 10px;
  background: var(--dy-surface);
  color: var(--dy-text);
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: border-color .16s ease, background .16s ease, transform .16s ease;
}
.dockyard-root .dockyard-work-card:hover { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); transform: translateY(-1px); }
.dockyard-root .dockyard-work-card h4 { margin: 8px 0 12px; font-size: 13px; line-height: 1.35; }
.dockyard-root .dockyard-work-card footer { display: flex; justify-content: space-between; gap: 8px; color: var(--dy-text-3); font-size: 10px; }
.dockyard-root .dockyard-work-type { color: var(--dy-accent-text); font-size: 9px; font-weight: 780; text-transform: uppercase; }
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
.dockyard-root .dockyard-backlog-list { display: grid; gap: 10px; }
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
.dockyard-root .dockyard-detail-modal { width: min(680px, 100%); }
.dockyard-root .dockyard-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 18px 0 0; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 10px; background: var(--dy-border); }
.dockyard-root .dockyard-detail-grid > div { min-width: 0; padding: 12px; background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-detail-grid dt { color: var(--dy-text-3); font-size: 9px; font-weight: 760; letter-spacing: .05em; text-transform: uppercase; }
.dockyard-root .dockyard-detail-grid dd { margin: 4px 0 0; overflow-wrap: anywhere; color: var(--dy-text); font-size: 12px; font-weight: 650; }
.dockyard-root .dockyard-modal h2 { margin: 0; font-size: 20px; }
.dockyard-root .dockyard-modal p { margin: 7px 0 16px; color: var(--dy-text-2); font-size: 13px; }
.dockyard-root .dockyard-modal label { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 700; }
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
  width: min(780px, 100%);
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
.dockyard-root .dockyard-approval-list {
  display: grid;
  gap: 14px;
  overflow: visible;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.dockyard-root .dockyard-approval-row {
  display: block;
  min-height: 0;
  padding: 22px;
  border: 1px solid var(--dy-border);
  border-radius: 14px;
  background: var(--dy-surface);
}
.dockyard-root .dockyard-approval-row[data-state="approved"] { background: var(--dy-success-bg); }
.dockyard-root .dockyard-approval-row[data-state="rejected"] { background: var(--dy-danger-bg); }
.dockyard-root .dockyard-approval-top {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}
.dockyard-root .dockyard-approval-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--dy-warning);
  background: var(--dy-warning-bg);
}
.dockyard-root .dockyard-approval-icon.danger { color: var(--dy-danger); background: var(--dy-danger-bg); }
.dockyard-root .dockyard-approval-icon.success { color: var(--dy-success); background: var(--dy-success-bg); }
.dockyard-root .dockyard-approval-icon svg { width: 17px; height: 17px; }
.dockyard-root .dockyard-approval-top .dockyard-approval-main { grid-area: auto; }
.dockyard-root .dockyard-approval-main h2 { font-size: 17px; }
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
.dockyard-root .dockyard-approval-actions { display: flex; align-items: center; justify-content: flex-start; gap: 9px; flex-wrap: wrap; }
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
@media (min-width: 821px) and (max-width: 1350px) {
  .dockyard-root .dockyard-main-grid .dockyard-project-head,
  .dockyard-root .dockyard-main-grid .dockyard-project-row {
    grid-template-columns: minmax(180px, 1.35fr) 100px minmax(160px, 1fr) 80px;
    gap: 12px;
  }
}
@media (max-width: 1200px) {
  .dockyard-root .dockyard-loop-layout { grid-template-columns: 1fr; }
}
@media (max-width: 980px) {
  .dockyard-root .dockyard-main-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-attention-card { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-project-overview-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-content-layout { grid-template-columns: 1fr; }
}
@media (max-width: 820px) {
  .dockyard-root .dockyard-consolebar {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    margin: -14px -16px 26px;
    padding: 10px 16px;
  }
  .dockyard-root .dockyard-brand { grid-column: 1; grid-row: 1; }
  .dockyard-root .dockyard-tabs { grid-column: 1 / -1; grid-row: 2; width: 100%; }
  .dockyard-root .dockyard-tab { padding-right: 8px; padding-left: 8px; }
  .dockyard-root .dockyard-console-action { grid-column: 3; grid-row: 1; width: 38px; padding: 6px; justify-content: center; }
  .dockyard-root .dockyard-brand-copy { display: none; }
  .dockyard-root .dockyard-console-action-label { display: none; }
  .dockyard-root .dockyard-console-action svg { flex: 0 0 auto; margin: 0; }
  .dockyard-root .dockyard-project-toolbar { flex-wrap: wrap; overflow-x: visible; }
  .dockyard-root .dockyard-project-tabs { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); flex: 1 1 100%; width: 100%; margin-left: 0; }
  .dockyard-root .dockyard-project-tabs button { min-width: 0; padding-right: 5px; padding-left: 5px; font-size: 11px; }
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
  .dockyard-root .dockyard-approval-top { grid-template-columns: 38px minmax(0, 1fr); }
  .dockyard-root .dockyard-approval-top > .dockyard-status-tag { grid-column: 2; }
}
@media (max-width: 640px) {
  .dockyard-root .dockyard-metric-strip,
  .dockyard-root .dockyard-settings-grid { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-field-wide { grid-column: auto; }
  .dockyard-root .dockyard-bot-grid,
  .dockyard-root .dockyard-stage-list { grid-template-columns: 1fr; }
  .dockyard-root .dockyard-upload-panel,
  .dockyard-root .dockyard-detail-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
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
`

let _rest = null
let _os = null
let _toastId = 0
const TOAST_EVENT = 'dockyard:toast'

function bindContext(ctx) {
  _rest = ctx.rest
  _os = ctx.os
}

function mutationMessage(path, result) {
  if (path === '/onboard') return `Project ${result?.project_id || 'created'} onboarded`
  if (path.endsWith('/approve')) return 'Initiative approved'
  if (path.endsWith('/reject')) return 'Initiative rejected'
  if (path.endsWith('/ack')) return 'Notification cleared'
  if (path.endsWith('/rerank')) return 'Backlog priority updated'
  if (path.endsWith('/views')) return 'Workflow view saved'
  if (path.endsWith('/reports')) return 'Report generated'
  if (path.endsWith('/settings')) return 'Project configuration saved'
  if (path.endsWith('/freeze')) return 'Project frozen'
  if (path.endsWith('/resume')) return 'Project resumed'
  if (path.endsWith('/transition')) return 'Work item updated'
  return 'Change saved'
}

function emitToast(tone, message) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new window.CustomEvent(TOAST_EVENT, {
    detail: { id: ++_toastId, tone, message },
  }))
}

async function api(path, init) {
  const method = init?.method ?? 'GET'
  try {
    const result = await _rest(path, { method, body: init?.body })
    if (method !== 'GET') emitToast('success', mutationMessage(path, result))
    return result
  } catch (error) {
    const raw = String(error?.message ?? error).slice(0, 240)
    const message = /(?:error\s*)?500|internal service error/i.test(raw)
      ? 'Dockyard could not confirm the request.'
      : raw
    if (method !== 'GET' && !init?.suppressErrorToast) emitToast('danger', message)
    const failure = new Error(message)
    failure.cause = error
    throw failure
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
  if (name === 'activity') {
    return jsx('svg', { ...common, children: jsx('path', { d: 'M3 12h4l2.2-5 4.1 10 2.1-5H21' }) })
  }
  if (name === 'eye') {
    return jsxs('svg', { ...common, children: [
      jsx('path', { d: 'M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z' }),
      jsx('circle', { cx: 12, cy: 12, r: 2.5 }),
    ]})
  }
  if (name === 'chevron') {
    return jsx('svg', { ...common, children: jsx('path', { d: 'm9 6 6 6-6 6' }) })
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

function formatBytes(value) {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size'
  if (bytes < 1024) return `${number(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mediaTypeLabel(value) {
  return {
    'text/plain': 'Text',
    'text/markdown': 'Markdown',
    'application/pdf': 'PDF',
    'image/png': 'PNG image',
    'image/jpeg': 'JPEG image',
    'image/webp': 'WebP image',
  }[value] || readableLabel(value, 'File')
}

function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      if (comma < 0) {
        reject(new Error('The selected file could not be encoded.'))
        return
      }
      resolve(result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

function StatusTag({ tone = 'neutral', label }) {
  return jsxs('span', { className: `dockyard-status-tag ${tone}`, children: [
    jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
    label,
  ]})
}

function Button({ children, onClick, variant = '', small = false, disabled = false, action, ariaLabel }) {
  return jsx('button', {
    type: 'button',
    className: `dockyard-button${variant ? ` ${variant}` : ''}${small ? ' small' : ''}`,
    disabled,
    onClick,
    'data-action': action,
    'aria-label': ariaLabel,
    children,
  })
}

function ConfirmDialog({ confirmKey, title, description, confirmLabel, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-destructive-confirm': confirmKey,
    onClick: (event) => { if (event.target === event.currentTarget && !busy) onCancel() },
    children: jsxs('div', {
      className: 'dockyard-modal',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': `dockyard-confirm-${confirmKey}`,
      children: [
        jsx('h2', { id: `dockyard-confirm-${confirmKey}`, children: title }),
        jsx('p', { children: description }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'cancel-destructive-action', disabled: busy, onClick: onCancel, children: 'Cancel' }),
          jsx(Button, { action: 'confirm-destructive-action', variant: 'danger', disabled: busy, onClick: onConfirm, children: busy ? 'Applying...' : confirmLabel }),
        ]}),
      ],
    }),
  })
}

function ToastRegion({ toasts, onDismiss }) {
  return jsx('div', {
    className: 'dockyard-toast-region',
    'data-toast-region': true,
    'aria-label': 'Status messages',
    children: toasts.map((toast) => jsxs('div', {
      className: `dockyard-toast ${toast.tone}`,
      role: toast.tone === 'danger' ? 'alert' : 'status',
      children: [
        jsx('span', { className: 'dockyard-toast-icon', 'aria-hidden': true, children: jsx(Icon, { name: toast.tone === 'danger' ? 'alert' : 'check' }) }),
        jsx('span', { children: toast.message }),
        jsx('button', { type: 'button', 'aria-label': 'Dismiss message', onClick: () => onDismiss(toast.id), children: '×' }),
      ],
    }, toast.id)),
  })
}

function OnboardingWizard({ onClose, onComplete }) {
  const [step, setStep] = useState(1)
  const [projectId, setProjectId] = useState('')
  const [repoPath, setRepoPath] = useState('')
  const [mission, setMission] = useState('')
  const [leadProfile, setLeadProfile] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const valid = step === 1
    ? /^[a-z0-9][a-z0-9-]*$/.test(projectId.trim()) && repoPath.trim().startsWith('/')
    : step === 2
      ? mission.trim().length >= 12
      : step === 3
        ? leadProfile.trim().length > 0
        : true
  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api('/onboard', {
        method: 'POST',
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
        },
      })
      onComplete(result)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setSubmitting(false)
    }
  }
  const steps = [
    ['Project', 'Name and repository'],
    ['Mission', 'Define the outcome'],
    ['Lead', 'Assign ownership'],
    ['Review', 'Confirm the contract'],
  ]
  return jsx('div', { className: 'dockyard-modal-backdrop', children:
    jsxs('section', {
      className: 'dockyard-onboarding',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'dockyard-onboarding-title',
      'data-onboarding-wizard': true,
      children: [
        jsxs('header', { className: 'dockyard-onboarding-head', children: [
          jsxs('div', { children: [
            jsx('span', { className: 'dockyard-card-label', children: 'NEW PROJECT' }),
            jsx('h2', { id: 'dockyard-onboarding-title', children: 'Bring a project into Dockyard' }),
            jsx('p', { children: 'Four bounded steps. Nothing runs until the final review.' }),
          ]}),
          jsx('button', { type: 'button', className: 'dockyard-modal-close', 'aria-label': 'Close onboarding', disabled: submitting, onClick: onClose, children: '×' }),
        ]}),
        jsx('div', { className: 'dockyard-wizard-progress', role: 'progressbar', 'aria-label': 'Onboarding progress', 'aria-valuemin': 1, 'aria-valuemax': 4, 'aria-valuenow': step, children:
          steps.map(([label, detail], index) => jsxs('div', { className: index + 1 <= step ? 'complete' : '', children: [
            jsx('span', { children: number(index + 1) }),
            jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: detail })] }),
          ]}, label)),
        }),
        jsxs('div', { className: 'dockyard-wizard-body', children: [
          jsxs('div', { className: step === 1 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 1, 'data-wizard-step': '1', children: [
            jsx('h3', { children: 'Project identity' }),
            jsx('p', { children: 'Use the stable project identifier and its absolute repository path.' }),
            jsx('label', { htmlFor: 'dockyard-project-id', children: 'Project ID' }),
            jsx('input', { id: 'dockyard-project-id', 'data-field': 'project-id', value: projectId, placeholder: 'payments-relaunch', autoComplete: 'off', onInput: (event) => setProjectId(event.target.value) }),
            jsx('small', { children: 'Lowercase letters, numbers and hyphens.' }),
            jsx('label', { htmlFor: 'dockyard-repo-path', children: 'Repository path' }),
            jsx('input', { id: 'dockyard-repo-path', 'data-field': 'repo-path', value: repoPath, placeholder: '/home/sahil/repos/project', autoComplete: 'off', onInput: (event) => setRepoPath(event.target.value) }),
          ]}),
          jsxs('div', { className: step === 2 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 2, 'data-wizard-step': '2', children: [
            jsx('h3', { children: 'Mission and outcome' }),
            jsx('p', { children: 'State what the project must improve. This anchors later initiative decisions.' }),
            jsx('label', { htmlFor: 'dockyard-mission', children: 'Mission' }),
            jsx('textarea', { id: 'dockyard-mission', 'data-field': 'mission', value: mission, rows: 5, placeholder: 'Reduce payment failures without weakening release gates.', onInput: (event) => setMission(event.target.value) }),
            jsx('small', { children: `${number(mission.trim().length)} characters / minimum 12` }),
          ]}),
          jsxs('div', { className: step === 3 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 3, 'data-wizard-step': '3', children: [
            jsx('h3', { children: 'Lead ownership' }),
            jsx('p', { children: 'Assign the specialist profile accountable for the project.' }),
            jsx('label', { htmlFor: 'dockyard-lead-profile', children: 'Lead profile' }),
            jsx('input', { id: 'dockyard-lead-profile', 'data-field': 'lead-profile', value: leadProfile, list: 'dockyard-lead-options', placeholder: 'octacon', autoComplete: 'off', onInput: (event) => setLeadProfile(event.target.value) }),
            jsxs('datalist', { id: 'dockyard-lead-options', children: [
              jsx('option', { value: 'octacon' }, 'octacon'),
              jsx('option', { value: 'remii' }, 'remii'),
              jsx('option', { value: 'wesker' }, 'wesker'),
              jsx('option', { value: 'gojo' }, 'gojo'),
              jsx('option', { value: 'ceecee' }, 'ceecee'),
            ]}),
            jsx('small', { children: 'This records ownership; it does not expand permissions.' }),
          ]}),
          jsxs('div', { className: step === 4 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 4, 'data-wizard-step': '4', children: [
            jsx('h3', { children: 'Review onboarding contract' }),
            jsxs('dl', { className: 'dockyard-onboarding-review', children: [
              jsx('dt', { children: 'Project' }), jsx('dd', { children: projectId }),
              jsx('dt', { children: 'Repository' }), jsx('dd', { children: repoPath }),
              jsx('dt', { children: 'Mission' }), jsx('dd', { children: mission }),
              jsx('dt', { children: 'Lead' }), jsx('dd', { children: leadProfile }),
            ]}),
            jsx('p', { className: 'dockyard-review-note', children: 'Onboarding creates the project record and its initial oversight surfaces. It does not approve future initiatives.' }),
          ]}),
        ]}),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('footer', { className: 'dockyard-wizard-actions', children: [
          jsx(Button, { action: step === 1 ? 'cancel-onboarding' : 'wizard-back', disabled: submitting, onClick: step === 1 ? onClose : () => setStep((value) => value - 1), children: step === 1 ? 'Cancel' : 'Back' }),
          step < 4
            ? jsx(Button, { action: 'wizard-next', variant: 'primary', disabled: !valid, onClick: () => setStep((value) => value + 1), children: 'Continue' })
            : jsx(Button, { action: 'submit-onboarding', variant: 'primary', disabled: submitting, onClick: submit, children: submitting ? 'Onboarding…' : 'Onboard project' }),
        ]}),
      ],
    }),
  })
}

function ConsoleBar({ tab, counts, onTab, onNewProject }) {
  const tabs = [
    ['dashboard', 'Fleet', null],
    ['project', 'Project', null],
    ['backlog', 'Backlog', null],
    ['teams', 'Bot teams', null],
    ['initiative', 'Initiative', null],
    ['workflows', 'Saved views', null],
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
    jsx(Button, {
      action: 'open-onboarding',
      variant: 'primary dockyard-console-action',
      small: true,
      ariaLabel: 'New project',
      onClick: onNewProject,
      children: jsxs(Fragment, { children: [jsx(Icon, { name: 'project' }), jsx('span', { className: 'dockyard-console-action-label', children: 'New project' })] }),
    }),
  ]})
}

function PageHead({ title, description, onRefresh, status }) {
  return jsxs('div', { className: 'dockyard-page-head', children: [
    jsxs('div', { children: [
      jsx('h1', { children: title }),
      jsx('p', { children: description }),
    ]}),
    status || onRefresh ? jsxs('div', { className: 'dockyard-page-actions', children: [
      status ? jsxs('span', { className: 'dockyard-owed-pill', children: [
        jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
        status,
      ]}) : null,
      onRefresh ? jsx(Button, {
        action: 'refresh',
        onClick: onRefresh,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'refresh' }), 'Refresh'] }),
      }) : null,
    ]}) : null,
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

const HEALTH_PRIORITY = Object.freeze({ critical: 0, frozen: 0, attention: 0, degraded: 1, watch: 1, unknown: 2, healthy: 3 })
const RISK_PRIORITY = Object.freeze({ critical: 0, high: 0, medium: 1, low: 2 })
const SEVERITY_PRIORITY = Object.freeze({ critical: 0, high: 0, error: 0, medium: 1, warning: 1, low: 2, info: 3 })

function sortProjects(projects) {
  return [...projects].sort((left, right) => {
    const health = (HEALTH_PRIORITY[left.health] ?? 2) - (HEALTH_PRIORITY[right.health] ?? 2)
    if (health !== 0) return health
    const blocked = Number(right.work?.blocked ?? 0) - Number(left.work?.blocked ?? 0)
    if (blocked !== 0) return blocked
    const alerts = Number(right.unacked_notifications ?? 0) - Number(left.unacked_notifications ?? 0)
    if (alerts !== 0) return alerts
    return String(left.id).localeCompare(String(right.id))
  })
}

function sortApprovals(items) {
  return [...items].sort((left, right) => {
    const risk = (RISK_PRIORITY[String(left.risk || 'medium').toLowerCase()] ?? 1)
      - (RISK_PRIORITY[String(right.risk || 'medium').toLowerCase()] ?? 1)
    if (risk !== 0) return risk
    return Number(right.detail?.priority ?? 0) - Number(left.detail?.priority ?? 0)
  })
}

function initials(value) {
  const words = String(value || '?').replace(/-bot$/i, '').split(/[-_\s]+/).filter(Boolean)
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('') || '?'
}

function readableLabel(value, fallback = 'All') {
  const text = String(value || fallback).replace(/[_-]+/g, ' ').trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : fallback
}

function validationSummary(contract) {
  if (!contract || typeof contract !== 'object') return 'No validation contract supplied'
  const steps = Array.isArray(contract.steps) ? contract.steps.filter(Boolean) : []
  const tests = typeof contract.tests === 'string' ? contract.tests.trim() : ''
  if (steps.length > 0 && tests) return `${steps.length} checks plus ${tests}`
  if (steps.length > 0) return steps.join('; ')
  if (tests) return tests
  return 'No validation contract supplied'
}

async function loadDashboardData() {
  const [dashboard, inbox, notifications, bots, workload] = await Promise.all([
    api('/dashboard'), api('/inbox'), api('/notifications'), api('/bots'), api('/workload'),
  ])
  const entries = await Promise.all((dashboard.projects ?? []).map(async (project) => {
    const projectId = encodeURIComponent(project.id)
    const [settings, workItems] = await Promise.all([
      api(`/projects/${projectId}/settings`),
      api(`/projects/${projectId}/work-items`),
    ])
    return [project.id, { settings, workItems: workItems.work_items ?? [] }]
  }))
  return {
    ...dashboard,
    inbox,
    notifications,
    bots,
    workload,
    projectContext: Object.fromEntries(entries),
  }
}

async function loadProjectData(projectId) {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  const project = projects.find((item) => item.id === projectId) ?? projects[0]
  if (!project) return { ...dashboard, project: null, projects }
  const encoded = encodeURIComponent(project.id)
  const [settings, workItems, initiatives, objectives, missionArchive, content, events, reports] = await Promise.all([
    api(`/projects/${encoded}/settings`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api(`/projects/${encoded}/objectives`),
    api(`/projects/${encoded}/missions/archive`),
    api(`/projects/${encoded}/content`),
    api(`/projects/${encoded}/events`),
    api(`/projects/${encoded}/reports`),
  ])
  return {
    ...dashboard,
    projects,
    project,
    settings,
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    objectives: objectives.objectives ?? [],
    missionArchive: missionArchive.missions ?? [],
    content: content.content ?? [],
    events: events.events ?? [],
    reports: reports.reports ?? [],
  }
}

async function loadBacklogData(projectId) {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  const project = projects.find((item) => item.id === projectId) ?? projects[0]
  if (!project) return { project: null, projects, backlog: [], workItems: [], initiatives: [], bots: [] }
  const encoded = encodeURIComponent(project.id)
  const [backlog, workItems, initiatives, bots] = await Promise.all([
    api(`/projects/${encoded}/backlog`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api('/bots'),
  ])
  return {
    project,
    projects,
    backlog: backlog.backlog ?? [],
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    bots: bots.bots ?? [],
  }
}

async function loadSavedViewsData(projectId) {
  const dashboard = await api('/dashboard')
  const projects = sortProjects(dashboard.projects ?? [])
  const project = projects.find((item) => item.id === projectId) ?? projects[0]
  if (!project) return { project: null, projects, views: [] }
  const views = await api(`/projects/${encodeURIComponent(project.id)}/views`)
  return { project, projects, views: views.views ?? [] }
}

async function loadTeamsData() {
  const [bots, workload, groups] = await Promise.all([
    api('/bots'), api('/workload'), api('/bot-groups'),
  ])
  const messages = {}
  await Promise.all((groups.groups ?? []).map(async (group) => {
    const result = await api(`/bot-groups/${encodeURIComponent(group.name)}/messages`)
    messages[group.name] = result.messages ?? []
  }))
  return { bots: bots.bots ?? [], workload, groups: groups.groups ?? [], messages }
}

async function loadInboxData() {
  const inbox = await api('/inbox')
  const projectIds = [...new Set((inbox.items ?? []).map((item) => item.project).filter(Boolean))]
  const projectInitiatives = await Promise.all(projectIds.map(async (projectId) => {
    const result = await api(`/projects/${encodeURIComponent(projectId)}/initiatives`)
    return result.initiatives ?? []
  }))
  const detailByRef = {}
  projectInitiatives.flat().forEach((initiative) => { detailByRef[initiative.ref] = initiative })
  return {
    ...inbox,
    items: (inbox.items ?? []).map((item) => ({ ...item, detail: detailByRef[item.ref] ?? null })),
  }
}

function AttentionPanel({ items, onReview }) {
  const decisions = sortApprovals(items ?? [])
  const owed = decisions.length
  if (owed === 0) {
    return jsxs('section', { className: 'dockyard-attention-card is-clear', 'data-dashboard-card': 'attention', children: [
      jsxs('div', { className: 'dockyard-attention-summary', children: [
        jsx('span', { className: 'dockyard-attention-icon', children: jsx(Icon, { name: 'check' }) }),
        jsx('h2', { children: 'No decisions waiting' }),
        jsx('strong', { className: 'dockyard-decision-count', children: 'All clear' }),
        jsx('p', { children: 'The fleet can keep moving without owner input.' }),
      ]}),
    ]})
  }
  return jsxs('section', { className: 'dockyard-attention-card', 'data-dashboard-card': 'attention', children: [
    jsxs('div', { className: 'dockyard-attention-summary', children: [
      jsx('h2', { children: 'Needs your decision' }),
      jsx('strong', { className: 'dockyard-decision-count', children: number(owed) }),
      jsx('p', { children: `${number(owed)} ${plural(owed, 'decision')} carry project context and a declared risk.` }),
      jsx(Button, { variant: 'primary', onClick: onReview, children: 'Review decisions' }),
    ]}),
    jsxs('div', { className: 'dockyard-attention-copy', children: [
      jsx('h2', { children: 'Everything else can keep moving' }),
      jsx('div', { className: 'dockyard-attention-list', children:
        decisions.map((item) => {
          const [tone, label] = riskDetails(item.risk)
          return jsxs('div', { className: 'dockyard-attention-decision', 'data-attention-decision': item.ref, children: [
            jsx(StatusTag, { tone, label }),
            jsxs('span', { children: [
              jsx('strong', { children: item.title }),
              jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}` }),
            ]}),
            jsx(Button, { small: true, onClick: onReview, children: 'Open' }),
          ]}, item.ref)
        }),
      }),
    ]}),
  ]})
}

function FleetMetrics({ view }) {
  const projects = view.projects ?? []
  const totals = view.totals ?? {}
  const workload = view.workload ?? { busy: [], idle: [], stuck: [] }
  const healthy = projects.filter((project) => project.health === 'healthy').length
  const watch = projects.filter((project) => ['watch', 'degraded', 'attention', 'critical', 'frozen'].includes(project.health)).length
  const unknown = projects.filter((project) => !project.health || project.health === 'unknown').length
  const blocked = Number(totals.blocked ?? 0)
  const owed = Number(view.inbox?.count ?? view.owed_decisions ?? 0)
  const unread = Number((view.notifications?.notifications ?? []).filter((note) => !note.acked).length)
  const ownerAttention = owed + unread
  const healthValue = healthy > 0 ? `${number(healthy)} healthy` : `${number(unknown)} unverified`
  const healthDelta = [watch > 0 ? `${number(watch)} need review` : null, unknown > 0 ? `${number(unknown)} unverified` : null].filter(Boolean).join(', ') || 'No health warnings'
  const botDelta = `${number(workload.idle?.length ?? 0)} idle, ${number(workload.stuck?.length ?? 0)} stuck`
  return jsxs('section', { className: 'dockyard-metric-strip', 'aria-label': 'Fleet summary', children: [
    jsxs('div', { className: 'dockyard-metric', 'data-metric': 'health', children: [
      jsx('span', { children: 'PROJECT HEALTH' }),
      jsx('strong', { children: healthValue }),
      jsx('small', { children: healthDelta }),
    ]}),
    jsxs('div', { className: 'dockyard-metric', 'data-metric': 'work', children: [
      jsx('span', { children: 'ACTIVE WORK' }),
      jsx('strong', { children: `${number(totals.active_work ?? 0)} items` }),
      jsx('small', { children: `${number(blocked)} blocked` }),
    ]}),
    jsxs('div', { className: 'dockyard-metric', 'data-metric': 'bots', children: [
      jsx('span', { children: 'BOT WORKLOAD' }),
      jsx('strong', { children: `${number(workload.busy?.length ?? 0)} busy` }),
      jsx('small', { children: botDelta }),
    ]}),
    jsxs('div', { className: 'dockyard-metric', 'data-metric': 'attention', children: [
      jsx('span', { children: 'OWNER ATTENTION' }),
      jsx('strong', { className: ownerAttention === 0 ? 'success' : 'warning', children: ownerAttention === 0 ? 'No action needed' : `${number(ownerAttention)} open` }),
      jsx('small', { children: ownerAttention === 0 ? 'Fleet can keep moving' : `${number(owed)} decisions, ${number(unread)} alerts` }),
    ]}),
  ]})
}

function WorkBar({ work, project = false, label = 'Work distribution' }) {
  const backlog = Number(work?.backlog ?? 0)
  const active = Number(work?.active ?? 0)
  const done = Number(work?.done ?? 0)
  const total = Math.max(1, backlog + active + done)
  return jsxs('div', {
    className: `dockyard-work-visual${project ? ' compact' : ''}`,
    role: 'img',
    'aria-label': `${label}: ${backlog} backlog, ${active} active, ${done} done`,
    'data-work-visual': project ? true : undefined,
    children: [
      backlog > 0 ? jsx('span', { className: 'backlog', style: { width: `${(backlog / total) * 100}%` } }) : null,
      active > 0 ? jsx('span', { className: 'active', style: { width: `${(active / total) * 100}%` } }) : null,
      done > 0 ? jsx('span', { className: 'done', style: { width: `${(done / total) * 100}%` } }) : null,
    ],
  })
}

function PortfolioVisual({ projects }) {
  const totals = projects.reduce((acc, project) => ({
    backlog: acc.backlog + Number(project.work?.backlog ?? 0),
    active: acc.active + Number(project.work?.active ?? 0),
    done: acc.done + Number(project.work?.done ?? 0),
  }), { backlog: 0, active: 0, done: 0 })
  return jsxs('section', { className: 'dockyard-portfolio-visual', 'data-portfolio-visual': true, children: [
    jsxs('div', { className: 'dockyard-portfolio-copy', children: [
      jsx('h2', { children: 'Delivery mix' }),
      jsx('p', { children: 'Current work distribution across the watched projects.' }),
    ]}),
    jsxs('div', { className: 'dockyard-portfolio-chart', children: [
      jsx(WorkBar, { work: totals, label: 'Portfolio work distribution' }),
      jsxs('div', { className: 'dockyard-work-legend', children: [
        jsxs('span', { className: 'backlog', children: [jsx('i', {}), `${number(totals.backlog)} backlog`] }),
        jsxs('span', { className: 'active', children: [jsx('i', {}), `${number(totals.active)} active`] }),
        jsxs('span', { className: 'done', children: [jsx('i', {}), `${number(totals.done)} done`] }),
      ]}),
    ]}),
  ]})
}

function ProjectRow({ project, context, botNames }) {
  const [tone, label] = healthDetails(project.health)
  const work = project.work ?? {}
  const alerts = Number(project.unacked_notifications ?? 0)
  const mission = context?.settings?.mission || (project.phase ? `Phase: ${project.phase}` : 'No mission supplied')
  const activeAssignees = [...new Set((context?.workItems ?? [])
    .filter((item) => !['done', 'backlog', 'cancelled'].includes(item.status))
    .map((item) => item.assignee)
    .filter(Boolean))].slice(0, 3)
  return jsxs('div', { className: 'dockyard-project-row', role: 'row', 'data-project-row': project.id, children: [
    jsxs('div', { className: 'dockyard-project-cell project', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-project-name', children: [
        jsx('span', { className: 'dockyard-project-icon', children: jsx(Icon, { name: 'project' }) }),
        jsxs('span', { className: 'dockyard-project-copy', children: [
          jsx('strong', { children: project.id }),
          jsx('span', { className: 'dockyard-project-mission', children: mission }),
        ]}),
      ]}),
      activeAssignees.length > 0 ? jsx('div', { className: 'dockyard-avatar-stack', 'aria-label': 'Active owners', children:
        activeAssignees.map((assignee) => {
          const label = botNames?.[assignee] || assignee
          return jsx('span', { className: 'dockyard-avatar', title: label, children: initials(label) }, assignee)
        }),
      }) : null,
    ]}),
    jsx('div', { className: 'dockyard-project-cell health', role: 'cell', children: jsx(StatusTag, { tone, label }) }),
    jsxs('div', { className: 'dockyard-project-cell work', role: 'cell', children: [
      jsxs('div', { className: 'dockyard-work-stats', 'aria-label': `Work: ${work.active ?? 0} active, ${work.backlog ?? 0} backlog, ${work.done ?? 0} done`, children: [
        jsxs('span', { children: [jsx('strong', { children: number(work.active) }), ' active'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.backlog) }), ' backlog'] }),
        jsxs('span', { children: [jsx('strong', { children: number(work.done) }), ' done'] }),
      ]}),
      jsx(WorkBar, { work, project: true, label: `${project.id} work distribution` }),
    ]}),
    jsx('div', { className: 'dockyard-project-cell alerts', role: 'cell', children:
      jsx('span', { className: `dockyard-alert-count${alerts > 0 ? ' has-alert' : ''}`, children: alerts > 0 ? `${number(alerts)} unread` : 'None unread' }),
    }),
  ]})
}

function FleetActivity({ notifications }) {
  const items = [...(notifications ?? [])].sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || ''))).slice(0, 4)
  return jsxs('aside', { className: 'dockyard-activity-card', 'data-dashboard-card': 'activity', 'data-fleet-activity': true, children: [
    jsxs('div', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [
        jsx('h2', { children: 'Fleet activity' }),
        jsx('p', { children: 'Recent attributed project signals.' }),
      ]}),
      jsx('span', { className: 'dockyard-section-count', children: `${number(items.length)} recent` }),
    ]}),
    items.length > 0 ? jsx('div', { className: 'dockyard-activity-list', children:
      items.map((note) => {
        const tone = severityTone(note.severity)
        return jsxs('div', { className: 'dockyard-activity-item', children: [
          jsx('span', { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === 'warning' || tone === 'danger' ? 'alert' : 'bell' }) }),
          jsxs('span', { children: [
            jsx('p', { children: note.title || 'Fleet event' }),
            jsx('span', { className: 'dockyard-meta', children: `${note.project || 'Fleet'}${note.body ? ` / ${note.body}` : ''}` }),
            jsx('time', { children: formatWhen(note.created_at) }),
          ]}),
        ]}, String(note.id))
      }),
    }) : jsx('div', { className: 'dockyard-activity-list', children: jsx('p', { className: 'dockyard-meta', children: 'No recent fleet signals.' }) }),
  ]})
}

function DashboardView({ view, onInbox, onRefresh }) {
  const projects = sortProjects(view.projects ?? [])
  if (projects.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Fleet overview', description: 'Project health, work and owner decisions in one view.', onRefresh }),
      jsx(EmptyState, { title: 'No projects under watch', description: 'Projects will appear here after they are connected to Dockyard.', icon: 'project' }),
    ]})
  }
  const owed = Number(view.inbox?.count ?? view.owed_decisions ?? 0)
  const unread = Number((view.notifications?.notifications ?? []).filter((note) => !note.acked).length)
  const attention = []
  if (owed > 0) attention.push(`${number(owed)} ${plural(owed, 'approval')}`)
  if (unread > 0) attention.push(`${number(unread)} unread ${plural(unread, 'alert')}`)
  const attentionCount = owed + unread
  const summary = attention.length > 0
    ? `${attention.join(' and ')} ${attentionCount === 1 ? 'needs' : 'need'} review.`
    : 'No owner action is waiting.'
  const botNames = Object.fromEntries((view.bots?.bots ?? []).map((bot) => [bot.id, bot.name || bot.id]))
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Your fleet, without the noise',
      description: `${number(projects.length)} ${plural(projects.length, 'project')} under watch. ${summary}`,
      status: owed > 0 ? `${number(owed)} ${plural(owed, 'decision')} owed` : null,
      onRefresh,
    }),
    jsx(AttentionPanel, { items: view.inbox?.items ?? [], onReview: onInbox }),
    jsx(FleetMetrics, { view }),
    jsx(PortfolioVisual, { projects }),
    jsxs('div', { className: 'dockyard-main-grid', children: [
      jsxs('section', { className: 'dockyard-section', 'data-dashboard-card': 'projects', children: [
        jsxs('div', { className: 'dockyard-section-head', children: [
          jsxs('div', { children: [jsx('h2', { children: 'Projects' }), jsx('p', { children: 'Health, active work and the owners carrying it.' })] }),
          jsx('span', { className: 'dockyard-section-count', children: `${number(projects.length)} total` }),
        ]}),
        jsxs('div', { role: 'table', 'aria-label': 'Project fleet', children: [
          jsxs('div', { className: 'dockyard-project-head', role: 'row', children: [
            jsx('span', { role: 'columnheader', children: 'Project' }),
            jsx('span', { role: 'columnheader', children: 'Health' }),
            jsx('span', { role: 'columnheader', children: 'Work' }),
            jsx('span', { role: 'columnheader', children: 'Alerts' }),
          ]}),
          projects.map((project) => jsx(ProjectRow, {
            project,
            context: view.projectContext?.[project.id],
            botNames,
          }, project.id)),
        ]}),
      ]}),
      jsx(FleetActivity, { notifications: view.notifications?.notifications ?? [] }),
    ]}),
  ]})
}

function ProjectSettingsPanel({ project, settings, onRefresh }) {
  const buildForm = () => ({
    mission: settings?.mission ?? '',
    leadProfile: settings?.owner?.lead_profile ?? '',
    members: (settings?.owner?.member_profiles ?? []).join(', '),
    autonomyLevel: String(settings?.autonomy_level ?? 0),
    humanGateRisk: settings?.policies?.autonomy?.human_gate_risk ?? 'medium',
    autoStartLowRisk: Boolean(settings?.policies?.autonomy?.auto_start_low_risk),
    requireTests: settings?.policies?.verification?.require_tests !== false,
    maxOpenInitiatives: String(settings?.policies?.verification?.max_open_initiatives ?? 3),
    requireRollback: settings?.policies?.release?.require_rollback !== false,
    soakHours: String(settings?.policies?.release?.soak_hours ?? 24),
    severityThreshold: settings?.policies?.notification?.severity_threshold ?? 'medium',
    digest: settings?.policies?.notification?.digest ?? 'daily',
  })
  const [form, setForm] = useState(buildForm)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [pendingLifecycle, setPendingLifecycle] = useState(null)
  const [lifecycleBusy, setLifecycleBusy] = useState(false)
  const [lifecycleState, setLifecycleState] = useState(settings)
  useEffect(() => {
    if (!pendingLifecycle) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !lifecycleBusy) setPendingLifecycle(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [pendingLifecycle, lifecycleBusy])
  const enabled = lifecycleState?.enabled !== false
  const phase = lifecycleState?.phase || project.phase || 'unknown'
  const lifecycleCopy = {
    enable: { endpoint: 're-enable', label: 'Enable', past: 'enabled' },
    disable: { endpoint: 'disable', label: 'Disable', past: 'disabled' },
    pause: { endpoint: 'pause', label: 'Pause', past: 'paused' },
    resume: { endpoint: 'resume', label: 'Resume', past: 'resumed' },
    freeze: { endpoint: 'freeze', label: 'Freeze', past: 'frozen' },
  }
  const lifecycleActions = !enabled
    ? ['enable']
    : phase === 'active'
      ? ['pause', 'freeze', 'disable']
      : phase === 'paused'
        ? ['resume', 'freeze', 'disable']
        : phase === 'frozen'
          ? ['resume', 'disable']
          : ['disable']
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = async () => {
    if (!enabled || !editing) return
    setSaving(true)
    setMessage(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/settings`, {
        method: 'PATCH',
        body: {
          mission: form.mission.trim(),
          lead_profile: form.leadProfile.trim(),
          member_profiles: form.members.split(',').map((value) => value.trim()).filter(Boolean),
          autonomy_level: Number(form.autonomyLevel),
          autonomy_policy: {
            human_gate_risk: form.humanGateRisk,
            auto_start_low_risk: form.autoStartLowRisk,
          },
          verification_policy: {
            require_tests: form.requireTests,
            max_open_initiatives: Number(form.maxOpenInitiatives),
          },
          release_policy: {
            require_rollback: form.requireRollback,
            soak_hours: Number(form.soakHours),
          },
          notification_policy: {
            severity_threshold: form.severityThreshold,
            digest: form.digest,
          },
        },
      })
      setMessage({ tone: 'success', text: 'Project configuration saved.' })
      setEditing(false)
      onRefresh?.()
    } catch (failure) {
      setMessage({ tone: 'danger', text: String(failure?.message ?? failure) })
    }
    setSaving(false)
  }
  const confirmLifecycle = async () => {
    const config = lifecycleCopy[pendingLifecycle]
    if (!config) return
    setLifecycleBusy(true)
    setMessage(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/${config.endpoint}`, { method: 'POST', body: {} })
      const readback = await api(`/projects/${encodeURIComponent(project.id)}/settings`)
      setLifecycleState(readback)
      if (readback.enabled === false) setEditing(false)
      setPendingLifecycle(null)
      emitToast('success', `Project ${config.past}.`)
      onRefresh?.()
    } catch (failure) {
      setMessage({ tone: 'danger', text: String(failure?.message ?? failure) })
    }
    setLifecycleBusy(false)
  }
  return jsxs('section', { className: 'dockyard-feature-card dockyard-settings-card', 'data-project-settings-form': true, children: [
    jsxs('header', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [jsx('h2', { children: 'Project configuration' }), jsx('p', { children: 'Ownership, autonomy, verification, release and notification boundaries.' })] }),
      jsxs('div', { className: 'dockyard-project-state-summary', children: [
        jsx('span', { 'data-project-enabled-state': true, children: jsx(StatusTag, { tone: enabled ? 'success' : 'neutral', label: enabled ? 'Enabled' : 'Disabled' }) }),
        jsx('span', { 'data-project-phase-state': true, children: jsx(StatusTag, { tone: phase === 'active' ? 'success' : 'warning', label: phase.charAt(0).toUpperCase() + phase.slice(1) }) }),
      ]}),
    ]}),
    jsxs('section', { className: 'dockyard-lifecycle-panel', 'data-project-lifecycle': true, children: [
      jsxs('header', { children: [
        jsxs('div', { children: [jsx('h3', { children: 'Project lifecycle' }), jsx('p', { children: enabled ? 'Only actions valid for the current phase are available.' : 'Configuration remains readable while the project is disabled.' })] }),
        jsx('div', { className: 'dockyard-lifecycle-actions', children: lifecycleActions.map((action) => jsx('button', {
          type: 'button',
          className: `dockyard-button small${['disable', 'freeze'].includes(action) ? ' danger' : action === 'enable' ? ' primary' : ''}`,
          'data-lifecycle-action': action,
          disabled: lifecycleBusy,
          onClick: () => setPendingLifecycle(action),
          children: lifecycleCopy[action].label,
        }, action)) }),
      ]}),
    ]}),
    jsxs('fieldset', { className: 'dockyard-settings-grid dockyard-settings-fieldset', disabled: !enabled || !editing, children: [
      jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [
        jsx('span', { children: 'Mission' }),
        jsx('textarea', { 'data-setting-field': 'mission', rows: 3, value: form.mission, onInput: (event) => update('mission', event.target.value), onChange: (event) => update('mission', event.target.value) }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Lead profile' }),
        jsx('input', { 'data-setting-field': 'lead-profile', value: form.leadProfile, onChange: (event) => update('leadProfile', event.target.value) }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Member profiles' }),
        jsx('input', { 'data-setting-field': 'members', value: form.members, placeholder: 'quan, wesker', onChange: (event) => update('members', event.target.value) }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Autonomy level' }),
        jsx('select', { 'data-setting-field': 'autonomy', value: form.autonomyLevel, onChange: (event) => update('autonomyLevel', event.target.value), children:
          [0, 1, 2, 3, 4, 5].map((level) => jsx('option', { value: String(level), children: `${level} / ${level === 0 ? 'manual' : level === 5 ? 'bounded maximum' : 'bounded'}` }, String(level))),
        }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Human gate from risk' }),
        jsx('select', { value: form.humanGateRisk, onChange: (event) => update('humanGateRisk', event.target.value), children:
          ['low', 'medium', 'high', 'critical'].map((risk) => jsx('option', { value: risk, children: risk }, risk)),
        }),
      ]}),
      jsxs('label', { className: 'dockyard-check-field', children: [
        jsx('input', { type: 'checkbox', checked: form.autoStartLowRisk, onChange: (event) => update('autoStartLowRisk', event.target.checked) }),
        jsxs('span', { children: [jsx('strong', { children: 'Auto-start low-risk work' }), jsx('small', { children: 'Only inside the declared autonomy boundary.' })] }),
      ]}),
      jsxs('label', { className: 'dockyard-check-field', children: [
        jsx('input', { type: 'checkbox', 'data-setting-field': 'require-tests', checked: form.requireTests, onChange: (event) => update('requireTests', event.target.checked) }),
        jsxs('span', { children: [jsx('strong', { children: 'Require test evidence' }), jsx('small', { children: 'Block verification without a test result.' })] }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Maximum open initiatives' }),
        jsx('input', { type: 'number', min: 1, max: 25, value: form.maxOpenInitiatives, onChange: (event) => update('maxOpenInitiatives', event.target.value) }),
      ]}),
      jsxs('label', { className: 'dockyard-check-field', children: [
        jsx('input', { type: 'checkbox', checked: form.requireRollback, onChange: (event) => update('requireRollback', event.target.checked) }),
        jsxs('span', { children: [jsx('strong', { children: 'Require rollback plan' }), jsx('small', { children: 'Every release must declare its recovery path.' })] }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Soak period in hours' }),
        jsx('input', { type: 'number', min: 0, max: 720, 'data-setting-field': 'soak-hours', value: form.soakHours, onChange: (event) => update('soakHours', event.target.value) }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Alert threshold' }),
        jsx('select', { value: form.severityThreshold, onChange: (event) => update('severityThreshold', event.target.value), children:
          ['info', 'low', 'medium', 'high', 'critical'].map((severity) => jsx('option', { value: severity, children: severity }, severity)),
        }),
      ]}),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Notification cadence' }),
        jsx('select', { 'data-setting-field': 'digest', value: form.digest, onChange: (event) => update('digest', event.target.value), children:
          ['immediate', 'daily', 'weekly', 'off'].map((cadence) => jsx('option', { value: cadence, children: cadence }, cadence)),
        }),
      ]}),
    ]}),
    message ? jsx('p', { className: message.tone === 'danger' ? 'dockyard-inline-error' : 'dockyard-inline-success', role: 'status', children: message.text }) : null,
    enabled ? jsx('div', { className: 'dockyard-form-actions', children: editing
      ? jsxs(Fragment, { children: [
          jsx(Button, { action: 'cancel-project-settings', disabled: saving, onClick: () => { setForm(buildForm()); setEditing(false); setMessage(null) }, children: 'Cancel' }),
          jsx(Button, { action: 'save-project-settings', variant: 'primary', disabled: saving || !form.mission.trim(), onClick: save, children: saving ? 'Saving...' : 'Save configuration' }),
        ]})
      : jsx(Button, { action: 'edit-project-settings', variant: 'primary', onClick: () => { setForm(buildForm()); setEditing(true); setMessage(null) }, children: 'Edit configuration' }),
    }) : jsx('p', { className: 'dockyard-meta', children: 'Enable this project before editing its configuration.' }),
    jsxs('section', { className: 'dockyard-modal-layer', 'data-lifecycle-confirm': true, hidden: !pendingLifecycle, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-lifecycle-title', children: [
        jsx('h2', { id: 'dockyard-lifecycle-title', children: `${lifecycleCopy[pendingLifecycle]?.label || 'Change'} project?` }),
        jsx('p', { children: `This changes ${project.id} from its current ${enabled ? 'enabled' : 'disabled'} and ${phase} state.` }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { disabled: lifecycleBusy, onClick: () => setPendingLifecycle(null), children: 'Cancel' }),
          jsx(Button, { action: 'confirm-lifecycle-action', variant: ['disable', 'freeze'].includes(pendingLifecycle) ? 'danger' : 'primary', disabled: lifecycleBusy, onClick: confirmLifecycle, children: lifecycleBusy ? 'Applying...' : `Confirm ${lifecycleCopy[pendingLifecycle]?.label || 'change'}` }),
        ]}),
      ]}),
    ]}),
  ]})
}

function ProjectReportsPanel({ project, reports, onRefresh }) {
  const [reportType, setReportType] = useState('executive')
  const [includeActivity, setIncludeActivity] = useState(true)
  const [history, setHistory] = useState(reports)
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const loadReport = async (reportId) => {
    setError(null)
    try {
      setSelected(await api(`/projects/${encodeURIComponent(project.id)}/reports/${encodeURIComponent(reportId)}`))
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
  }
  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const report = await api(`/projects/${encodeURIComponent(project.id)}/reports`, {
        method: 'POST', body: { report_type: reportType, include_activity: includeActivity },
      })
      setSelected(report)
      setHistory((current) => [report, ...current.filter((item) => item.report_id !== report.report_id)])
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setGenerating(false)
  }
  const copy = async () => {
    const copied = selected?.content && _os?.writeClipboard
      ? await _os.writeClipboard(selected.content)
      : false
    emitToast(copied ? 'success' : 'danger', copied ? 'Report copied to clipboard' : 'Clipboard is unavailable')
  }
  return jsxs('section', { className: 'dockyard-reports-layout', 'data-project-reports': true, children: [
    jsxs('div', { className: 'dockyard-feature-card dockyard-report-builder', children: [
      jsx('h2', { children: 'Generate report' }),
      jsx('p', { children: 'Create a durable Markdown snapshot from canonical project data.' }),
      jsxs('label', { className: 'dockyard-field', children: [
        jsx('span', { children: 'Report type' }),
        jsx('select', { 'data-report-type': true, value: reportType, onChange: (event) => setReportType(event.target.value), children: [
          jsx('option', { value: 'executive', children: 'Executive summary' }, 'executive'),
          jsx('option', { value: 'delivery', children: 'Delivery report' }, 'delivery'),
          jsx('option', { value: 'risk', children: 'Risk and decisions' }, 'risk'),
          jsx('option', { value: 'full', children: 'Full project report' }, 'full'),
        ]}),
      ]}),
      jsxs('label', { className: 'dockyard-check-field', children: [
        jsx('input', { type: 'checkbox', checked: includeActivity, onChange: (event) => setIncludeActivity(event.target.checked) }),
        jsxs('span', { children: [jsx('strong', { children: 'Include recent activity' }), jsx('small', { children: 'Includes attributed project events only.' })] }),
      ]}),
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
      jsx(Button, { action: 'generate-report', variant: 'primary', disabled: generating, onClick: generate, children: generating ? 'Generating...' : 'Generate report' }),
      jsxs('div', { className: 'dockyard-report-history-list', children: [
        jsx('h3', { children: 'Report history' }),
        history.length > 0
          ? history.map((report) => jsxs('button', { type: 'button', 'data-report-history': report.report_id, className: selected?.report_id === report.report_id ? 'active' : '', onClick: () => loadReport(report.report_id), children: [
              jsxs('span', { children: [jsx('strong', { children: report.title }), jsx('small', { children: `${report.report_type} / ${formatWhen(report.generated_at)}` })] }),
              jsx(Icon, { name: 'chevron' }),
            ]}, report.report_id))
          : jsx('p', { className: 'dockyard-meta', children: 'No generated reports yet.' }),
      ]}),
    ]}),
    jsxs('article', { className: 'dockyard-feature-card dockyard-report-preview-card', children: [
      jsxs('header', { children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'REPORT PREVIEW' }), jsx('h2', { children: selected?.title || 'Generate or open a report' })] }),
        selected?.content ? jsx(Button, { action: 'copy-report', small: true, onClick: copy, children: 'Copy Markdown' }) : null,
      ]}),
      selected?.content
        ? jsx('pre', { className: 'dockyard-report-preview', 'data-report-preview': true, children: selected.content })
        : jsxs('div', { className: 'dockyard-report-placeholder', children: [jsx(Icon, { name: 'project' }), jsx('p', { children: 'The report preview will appear here.' })] }),
    ]}),
  ]})
}

function WorkItemDetail({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [item, onClose])
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-work-item-detail-layer': true,
    hidden: !item,
    onClick: (event) => { if (event.target === event.currentTarget) onClose() },
    children: item ? jsxs('div', {
      className: 'dockyard-modal dockyard-detail-modal',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'dockyard-work-item-title',
      'data-work-item-detail': item.ref,
      children: [
        jsxs('header', { className: 'dockyard-modal-head', children: [
          jsxs('div', { children: [
            jsx('span', { className: 'dockyard-card-label', children: 'VIEW ONLY' }),
            jsx('h2', { id: 'dockyard-work-item-title', children: item.title || item.ref }),
          ]}),
          jsx(Button, { action: 'close-work-item-detail', ariaLabel: 'Close work item details', onClick: onClose, children: 'Close' }),
        ]}),
        jsx('p', { children: 'This board is a read-only view of canonical project work.' }),
        jsxs('dl', { className: 'dockyard-detail-grid', children: [
          jsxs('div', { children: [jsx('dt', { children: 'Reference' }), jsx('dd', { children: item.ref })] }),
          jsxs('div', { children: [jsx('dt', { children: 'Status' }), jsx('dd', { children: readableLabel(item.status) })] }),
          jsxs('div', { children: [jsx('dt', { children: 'Type' }), jsx('dd', { children: readableLabel(item.type, 'Task') })] }),
          jsxs('div', { children: [jsx('dt', { children: 'Assignee' }), jsx('dd', { children: item.assignee || 'Unassigned' })] }),
          jsxs('div', { children: [jsx('dt', { children: 'Initiative' }), jsx('dd', { children: item.initiative_ref || 'Not linked' })] }),
          jsxs('div', { children: [jsx('dt', { children: 'Evidence' }), jsx('dd', { children: `${number(item.evidence_refs?.length ?? 0)} attached` })] }),
        ]}),
      ],
    }) : null,
  })
}

function ObjectivesPanel({ project, settings, objectives, missionArchive, onRefresh }) {
  const [mission, setMission] = useState(settings?.mission ?? '')
  const [missionDraft, setMissionDraft] = useState(settings?.mission ?? '')
  const [missionEditing, setMissionEditing] = useState(false)
  const [history, setHistory] = useState(missionArchive ?? [])
  const [items, setItems] = useState(objectives ?? [])
  const [objectiveEditor, setObjectiveEditor] = useState(null)
  const [objectiveForm, setObjectiveForm] = useState({ name: '', description: '', target: '>=1', severity: 'medium' })
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const encoded = encodeURIComponent(project.id)
  const startObjective = (objective = null) => {
    setObjectiveEditor(objective?.id ?? 'new')
    setObjectiveForm({
      name: objective?.name ?? '',
      description: objective?.description ?? '',
      target: objective?.target ?? '>=1',
      severity: objective?.severity ?? 'medium',
    })
    setError(null)
  }
  const saveMission = async () => {
    const clean = missionDraft.trim()
    if (!clean) return
    setBusy(true)
    setError(null)
    try {
      const result = await api(`/projects/${encoded}/settings`, { method: 'PATCH', body: { mission: clean } })
      setMission(result?.mission ?? clean)
      setMissionDraft(result?.mission ?? clean)
      setMissionEditing(false)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const saveObjective = async () => {
    if (!objectiveForm.name.trim() || !objectiveForm.target.trim()) return
    setBusy(true)
    setError(null)
    try {
      const body = {
        name: objectiveForm.name.trim(),
        description: objectiveForm.description.trim(),
        target: objectiveForm.target.trim(),
        severity: objectiveForm.severity,
      }
      if (objectiveEditor === 'new') {
        const created = await api(`/projects/${encoded}/objectives`, { method: 'POST', body: { ...body, evaluator_type: 'manual', window: '30d' } })
        setItems((current) => [...current, created])
      } else {
        const updated = await api(`/projects/${encoded}/objectives/${objectiveEditor}`, { method: 'PATCH', body })
        setItems((current) => current.map((item) => Number(item.id) === Number(objectiveEditor) ? updated : item))
      }
      setObjectiveEditor(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const applyDestructive = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      if (pending.type === 'archive-mission') {
        const archived = await api(`/projects/${encoded}/mission/archive`, { method: 'POST', body: {} })
        setHistory((current) => [archived, ...current])
        setMission('')
        setMissionDraft('')
        setMissionEditing(false)
      } else if (pending.type === 'remove-mission') {
        await api(`/projects/${encoded}/mission`, { method: 'DELETE', body: {} })
        setMission('')
        setMissionDraft('')
        setMissionEditing(false)
      } else if (pending.type === 'archive-objective') {
        const archived = await api(`/projects/${encoded}/objectives/${pending.id}/archive`, { method: 'POST', body: {} })
        setItems((current) => current.map((item) => Number(item.id) === Number(pending.id) ? archived : item))
      } else if (pending.type === 'remove-objective') {
        await api(`/projects/${encoded}/objectives/${pending.id}`, { method: 'DELETE', body: {} })
        setItems((current) => current.filter((item) => Number(item.id) !== Number(pending.id)))
      }
      setPending(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setBusy(false)
  }
  const confirmation = pending ? {
    'archive-mission': {
      key: 'archive-mission',
      title: 'Archive this mission?',
      description: 'The mission moves to history and is removed from the active project.',
      label: 'Archive mission',
    },
    'remove-mission': {
      key: 'remove-mission',
      title: 'Remove this mission?',
      description: 'The active mission is cleared without adding it to mission history.',
      label: 'Remove mission',
    },
    'archive-objective': {
      key: `archive-objective-${pending.id}`,
      title: 'Archive this objective?',
      description: 'The objective remains visible in history but stops participating in active evaluation.',
      label: 'Archive objective',
    },
    'remove-objective': {
      key: `remove-objective-${pending.id}`,
      title: 'Remove this objective?',
      description: 'This permanently removes the objective from the project.',
      label: 'Remove objective',
    },
  }[pending.type] : null
  return jsxs('div', { className: 'dockyard-objectives-layout', children: [
    jsxs('section', { className: 'dockyard-feature-card', 'data-mission-manager': true, children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'MISSION' }), jsx('h2', { children: mission || 'No active mission' })] }),
        mission ? jsx(StatusTag, { tone: 'success', label: 'Active' }) : jsx(StatusTag, { tone: 'neutral', label: 'Not set' }),
      ]}),
      missionEditing ? jsxs('div', { className: 'dockyard-inline-editor', children: [
        jsx('label', { htmlFor: 'dockyard-mission-editor', children: 'Mission statement' }),
        jsx('textarea', { id: 'dockyard-mission-editor', 'data-mission-field': true, rows: 4, value: missionDraft, onInput: (event) => setMissionDraft(event.target.value), onChange: (event) => setMissionDraft(event.target.value) }),
        jsxs('div', { className: 'dockyard-form-actions', children: [
          jsx(Button, { disabled: busy, onClick: () => { setMissionDraft(mission); setMissionEditing(false) }, children: 'Cancel' }),
          jsx(Button, { action: 'save-mission', variant: 'primary', disabled: busy || !missionDraft.trim(), onClick: saveMission, children: busy ? 'Saving...' : 'Save mission' }),
        ]}),
      ]}) : jsxs('div', { className: 'dockyard-form-actions', children: [
        jsx(Button, { action: 'edit-mission', onClick: () => { setMissionDraft(mission); setMissionEditing(true) }, children: mission ? 'Edit mission' : 'Set mission' }),
        mission ? jsx(Button, { action: 'archive-mission', variant: 'danger', onClick: () => setPending({ type: 'archive-mission' }), children: 'Archive' }) : null,
        mission ? jsx(Button, { action: 'remove-mission', variant: 'danger', onClick: () => setPending({ type: 'remove-mission' }), children: 'Remove' }) : null,
      ]}),
      history.length > 0 ? jsxs('div', { className: 'dockyard-mission-history', children: [
        jsx('h3', { children: 'Mission history' }),
        history.map((entry) => jsxs('article', { children: [
          jsx('strong', { children: entry.mission }),
          jsx('span', { children: `Archived ${formatWhen(entry.archived_at) || 'previously'} by ${entry.archived_by || 'unknown'}` }),
        ]}, entry.archive_id)),
      ]}) : null,
    ]}),
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('span', { className: 'dockyard-card-label', children: 'OBJECTIVES' }), jsx('h2', { children: `${number(items.filter((item) => item.enabled !== false).length)} active` })] }),
        jsx(Button, { action: 'add-objective', variant: 'primary', small: true, onClick: () => startObjective(), children: 'Add objective' }),
      ]}),
      objectiveEditor !== null ? jsxs('div', { className: 'dockyard-inline-editor', 'data-objective-editor': String(objectiveEditor), children: [
        jsxs('label', { children: [jsx('span', { children: 'Name' }), jsx('input', { 'data-objective-field': 'name', value: objectiveForm.name, onChange: (event) => setObjectiveForm((current) => ({ ...current, name: event.target.value })) })] }),
        jsxs('label', { children: [jsx('span', { children: 'Description' }), jsx('textarea', { 'data-objective-field': 'description', rows: 3, value: objectiveForm.description, onInput: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })), onChange: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })) })] }),
        jsxs('div', { className: 'dockyard-settings-grid', children: [
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Target' }), jsx('input', { 'data-objective-field': 'target', value: objectiveForm.target, onChange: (event) => setObjectiveForm((current) => ({ ...current, target: event.target.value })) })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Severity' }), jsx('select', { 'data-objective-field': 'severity', value: objectiveForm.severity, onChange: (event) => setObjectiveForm((current) => ({ ...current, severity: event.target.value })), children: ['info', 'low', 'medium', 'high'].map((value) => jsx('option', { value, children: readableLabel(value) }, value)) })] }),
        ]}),
        jsxs('div', { className: 'dockyard-form-actions', children: [
          jsx(Button, { disabled: busy, onClick: () => setObjectiveEditor(null), children: 'Cancel' }),
          jsx(Button, { action: 'save-objective', variant: 'primary', disabled: busy || !objectiveForm.name.trim() || !objectiveForm.target.trim(), onClick: saveObjective, children: busy ? 'Saving...' : objectiveEditor === 'new' ? 'Create objective' : 'Save objective' }),
        ]}),
      ]}) : null,
      items.length > 0 ? jsx('div', { className: 'dockyard-objective-list', children: items.map((objective) => jsxs('article', { 'data-objective-row': objective.id, className: objective.enabled === false ? 'archived' : '', children: [
        jsxs('div', { className: 'dockyard-objective-copy', children: [
          jsxs('span', { children: [jsx('strong', { children: objective.name }), jsx('small', { children: objective.description || 'No description supplied.' })] }),
          jsx(StatusTag, { tone: objective.enabled === false ? 'neutral' : severityTone(objective.severity), label: objective.enabled === false ? 'Archived' : readableLabel(objective.severity) }),
        ]}),
        jsx('p', { children: `Target ${objective.target} / ${readableLabel(objective.evaluator_type, 'Manual')} / ${objective.window || '30d'}` }),
        jsxs('div', { className: 'dockyard-form-actions', children: [
          objective.enabled !== false ? jsx('button', { type: 'button', className: 'dockyard-button small', 'data-action': 'edit-objective', 'data-objective-id': objective.id, onClick: () => startObjective(objective), children: 'Edit' }) : null,
          objective.enabled !== false ? jsx('button', { type: 'button', className: 'dockyard-button danger small', 'data-action': 'archive-objective', 'data-objective-id': objective.id, onClick: () => setPending({ type: 'archive-objective', id: objective.id }), children: 'Archive' }) : null,
          jsx('button', { type: 'button', className: 'dockyard-button danger small', 'data-action': 'remove-objective', 'data-objective-id': objective.id, onClick: () => setPending({ type: 'remove-objective', id: objective.id }), children: 'Remove' }),
        ]}),
      ]}, String(objective.id))) }) : jsx('p', { className: 'dockyard-meta', children: 'No objectives are configured.' }),
    ]}),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    confirmation ? jsx(ConfirmDialog, { confirmKey: confirmation.key, title: confirmation.title, description: confirmation.description, confirmLabel: confirmation.label, busy, onConfirm: applyDestructive, onCancel: () => setPending(null) }) : null,
  ]})
}

function ProjectContentPanel({ project, content, onRefresh }) {
  const [items, setItems] = useState(content ?? [])
  const [selected, setSelected] = useState(null)
  const [previewState, setPreviewState] = useState('idle')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const encoded = encodeURIComponent(project.id)
  const openPreview = async (item) => {
    setSelected(item)
    setPreviewState('loading')
    setError(null)
    try {
      const result = await api(`/projects/${encoded}/content/${encodeURIComponent(item.content_id)}/preview`)
      setSelected(result)
      setPreviewState('ready')
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
  }
  const upload = async () => {
    if (!file || file.size <= 0 || file.size > 5 * 1024 * 1024) return
    setUploading(true)
    setError(null)
    try {
      const extension = file.name.toLowerCase().split('.').pop()
      const mediaType = file.type || ({ txt: 'text/plain', md: 'text/markdown', pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }[extension])
      if (!mediaType) throw new Error('Choose a text, Markdown, PDF, PNG, JPEG or WebP file.')
      const contentBase64 = await fileAsBase64(file)
      const created = await api(`/projects/${encoded}/content`, {
        method: 'POST',
        body: { filename: file.name, media_type: mediaType, content_base64: contentBase64 },
      })
      setItems((current) => [created, ...current.filter((item) => item.content_id !== created.content_id)])
      setFile(null)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setUploading(false)
  }
  return jsxs('div', { className: 'dockyard-content-layout', 'data-project-content': project.id, children: [
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('h2', { children: 'Project documentation' }), jsx('p', { children: 'Supporting files linked to this project.' })] }),
        jsx(StatusTag, { tone: 'neutral', label: `${number(items.length)} ${plural(items.length, 'file')}` }),
      ]}),
      items.length > 0 ? jsx('div', { className: 'dockyard-content-list', children: items.map((item) => jsxs('button', { type: 'button', 'data-project-content-item': item.content_id, onClick: () => openPreview(item), children: [
        jsxs('span', { children: [jsx('strong', { children: item.filename }), jsx('small', { children: `${mediaTypeLabel(item.media_type)} / ${formatBytes(item.size_bytes)} / ${formatWhen(item.uploaded_at) || 'Uploaded'}` })] }),
        jsx(Icon, { name: 'chevron' }),
      ]}, item.content_id)) }) : jsx('p', { className: 'dockyard-meta', children: 'No supporting content uploaded yet.' }),
      jsxs('div', { className: 'dockyard-upload-panel', children: [
        jsxs('label', { className: 'dockyard-upload-dropzone', children: [
          jsx('span', { children: file ? file.name : 'Choose supporting content' }),
          jsx('small', { children: file ? `${formatBytes(file.size)} selected` : 'Text, Markdown, PDF or image. Maximum 5 MB.' }),
          jsx('input', { type: 'file', 'data-content-file': true, accept: '.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp', onChange: (event) => { setFile(event.target.files?.[0] ?? null); setError(null) } }),
        ]}),
        jsx(Button, { action: 'upload-project-content', variant: 'primary', disabled: uploading || !file || file.size <= 0 || file.size > 5 * 1024 * 1024, onClick: upload, children: uploading ? 'Uploading...' : 'Upload content' }),
      ]}),
      file && file.size > 5 * 1024 * 1024 ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: 'This file exceeds the 5 MB limit.' }) : null,
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
    ]}),
    jsxs('aside', { className: 'dockyard-feature-card dockyard-content-preview-card', children: [
      jsx('span', { className: 'dockyard-card-label', children: 'PREVIEW' }),
      selected ? jsx('h2', { children: selected.filename }) : jsx('h2', { children: 'Select a document' }),
      previewState === 'loading' ? jsx('p', { children: 'Loading preview...' }) : null,
      previewState === 'ready' && selected?.preview_kind === 'text'
        ? jsx('pre', { 'data-content-preview': true, className: 'dockyard-content-preview', children: selected.text || 'This text file is empty.' })
        : previewState === 'ready'
          ? jsx('div', { 'data-content-preview': true, className: 'dockyard-report-placeholder', children: `Preview is not available for ${mediaTypeLabel(selected?.media_type)}. File metadata remains visible.` })
          : previewState === 'idle'
            ? jsx('p', { className: 'dockyard-meta', children: 'Text and Markdown files can be read here. Other formats show verified metadata.' })
            : null,
    ]}),
  ]})
}

function ProjectDashboard({ view, onSelectProject, onRefresh }) {
  const [projectView, setProjectView] = useState('overview')
  const [selectedWorkItem, setSelectedWorkItem] = useState(null)
  const project = view.project
  if (!project) return jsx(EmptyState, { title: 'No project selected', description: 'Connect a project before opening the project dashboard.', icon: 'project' })
  const [healthTone, healthLabel] = healthDetails(project.health)
  const views = [
    ['overview', 'Overview'], ['board', 'Board'], ['objectives', 'Objectives'], ['content', 'Content'], ['activity', 'Activity'], ['settings', 'Settings'], ['reports', 'Reports'],
  ]
  const columns = [
    ['backlog', 'Backlog', ['backlog']],
    ['active', 'In progress', ['in_progress', 'executing', 'active']],
    ['review', 'Review', ['in_review', 'review']],
    ['done', 'Done', ['done', 'complete', 'completed']],
  ]
  const projectOptions = view.projects ?? []
  let panel
  if (projectView === 'board') {
    panel = jsxs('div', { className: 'dockyard-board-wrap', children: [
      jsxs('div', { className: 'dockyard-view-only-note', 'data-view-only': 'board', children: [
        jsx(Icon, { name: 'eye' }),
        jsx('span', { children: 'View only. Open an item to inspect its details; changes are made in the canonical work system.' }),
      ]}),
      jsx('div', { className: 'dockyard-board', children:
        columns.map(([key, label, statuses]) => {
          const items = (view.workItems ?? []).filter((item) => statuses.includes(item.status))
          return jsxs('section', { className: 'dockyard-board-column', 'data-board-column': key, children: [
            jsxs('header', { children: [jsx('h3', { children: label }), jsx('span', { children: number(items.length) })] }),
            jsx('div', { className: 'dockyard-board-cards', children:
              items.length > 0
                ? items.map((item) => jsxs('button', { type: 'button', className: 'dockyard-work-card', 'data-work-card': item.ref, onClick: () => setSelectedWorkItem(item), children: [
                    jsx('span', { className: 'dockyard-work-type', children: item.type || 'task' }),
                    jsx('h4', { children: item.title }),
                    jsxs('footer', { children: [jsx('span', { children: item.ref }), jsx('span', { children: item.assignee || 'Unassigned' })] }),
                  ]}, item.ref))
                : jsx('p', { className: 'dockyard-meta', children: 'No work in this stage.' }),
            }),
          ]}, key)
        }),
      }),
    ]})
  } else if (projectView === 'objectives') {
    panel = jsx(ObjectivesPanel, { project, settings: view.settings ?? {}, objectives: view.objectives ?? [], missionArchive: view.missionArchive ?? [], onRefresh }, project.id)
  } else if (projectView === 'content') {
    panel = jsx(ProjectContentPanel, { project, content: view.content ?? [], onRefresh }, project.id)
  } else if (projectView === 'activity') {
    panel = jsxs('section', { className: 'dockyard-feature-card', children: [
      jsx('h2', { children: 'Project activity' }),
      (view.events ?? []).length > 0
        ? jsx('div', { className: 'dockyard-activity-list', children: view.events.map((event, index) => jsx('p', { children: JSON.stringify(event) }, String(event.id ?? index))) })
        : jsx('p', { className: 'dockyard-meta', children: 'No attributed project events have been recorded yet.' }),
    ]})
  } else if (projectView === 'settings') {
    panel = jsx(ProjectSettingsPanel, { project, settings: view.settings ?? {}, onRefresh }, `${project.id}:${view.settings?.updated_at || 'initial'}`)
  } else if (projectView === 'reports') {
    panel = jsx(ProjectReportsPanel, { project, reports: view.reports ?? [], onRefresh })
  } else {
    const visibleWork = [...(view.workItems ?? [])]
      .sort((left, right) => String(left.status || '').localeCompare(String(right.status || '')))
      .slice(0, 5)
    const visibleInitiatives = [...(view.initiatives ?? [])]
      .sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0))
      .slice(0, 3)
    const visibleEvents = [...(view.events ?? [])]
      .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
      .slice(0, 4)
    panel = jsxs(Fragment, { children: [
      jsxs('div', { className: 'dockyard-project-grid', 'data-project-visual': true, children: [
        jsxs('section', { className: 'dockyard-feature-card dockyard-project-hero', children: [
          jsx(StatusTag, { tone: healthTone, label: healthLabel }),
          jsx('h2', { children: view.settings?.mission || project.id }),
          jsx('p', { children: 'Work distribution and current delivery state from the canonical Dockyard backend.' }),
          jsx(WorkBar, { work: project.work ?? {}, label: `${project.id} delivery state` }),
          jsxs('div', { className: 'dockyard-work-legend', children: [
            jsxs('span', { className: 'backlog', children: [jsx('i', {}), `${number(project.work?.backlog ?? 0)} backlog`] }),
            jsxs('span', { className: 'active', children: [jsx('i', {}), `${number(project.work?.active ?? 0)} active`] }),
            jsxs('span', { className: 'done', children: [jsx('i', {}), `${number(project.work?.done ?? 0)} done`] }),
          ]}),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card', children: [
          jsx('span', { className: 'dockyard-card-label', children: 'CURRENT SIGNALS' }),
          jsx('h2', { children: `${number(project.work?.blocked ?? 0)} blocked` }),
          jsx('p', { children: `${number(view.workItems?.length ?? 0)} work items and ${number(view.initiatives?.length ?? 0)} initiatives are attached to this project.` }),
        ]}),
      ]}),
      jsxs('div', { className: 'dockyard-project-overview-grid', children: [
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-work': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Current work' }), jsx('span', { children: number(view.workItems?.length ?? 0) })] }),
          jsx('p', { children: 'Live work, ownership and stage.' }),
          visibleWork.length > 0 ? jsx('div', { className: 'dockyard-overview-list', children:
            visibleWork.map((item) => jsxs('article', { children: [
              jsxs('span', { children: [jsx('strong', { children: item.title || item.ref }), jsx('small', { children: `${item.ref} / ${item.assignee || 'Unassigned'}` })] }),
              jsx(StatusTag, { tone: ['done', 'completed'].includes(item.status) ? 'success' : item.status === 'in_progress' ? 'info' : 'neutral', label: String(item.status || 'unknown').replaceAll('_', ' ') }),
            ]}, item.ref)),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No work items are attached.' }),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-initiatives': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Initiatives' }), jsx('span', { children: number(view.initiatives?.length ?? 0) })] }),
          jsx('p', { children: 'Current improvement bets and their decision state.' }),
          visibleInitiatives.length > 0 ? jsx('div', { className: 'dockyard-overview-list', children:
            visibleInitiatives.map((initiative) => jsxs('article', { children: [
              jsxs('span', { children: [jsx('strong', { children: initiative.title }), jsx('small', { children: initiative.expected_outcome || initiative.rationale || initiative.ref })] }),
              jsx(StatusTag, { tone: initiative.status === 'pending_approval' ? 'warning' : 'info', label: String(initiative.status || 'unknown').replaceAll('_', ' ') }),
            ]}, initiative.ref)),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No initiatives are attached.' }),
        ]}),
        jsxs('section', { className: 'dockyard-feature-card dockyard-overview-card', 'data-overview-activity': true, children: [
          jsxs('header', { children: [jsx('h2', { children: 'Recent activity' }), jsx('span', { children: number(view.events?.length ?? 0) })] }),
          jsx('p', { children: 'Attributed events from this project.' }),
          visibleEvents.length > 0 ? jsx('div', { className: 'dockyard-overview-list activity', children:
            visibleEvents.map((event, index) => jsxs('article', { children: [
              jsxs('span', { children: [jsx('strong', { children: event.title || event.event_type || event.type || 'Project event' }), jsx('small', { children: event.actor_id || event.actor || formatWhen(event.created_at) || 'Attributed event' })] }),
            ]}, String(event.id ?? index))),
          })
            : jsx('p', { className: 'dockyard-meta', children: 'No attributed project events recorded yet.' }),
        ]}),
      ]}),
    ]})
  }
  return jsxs('div', { 'data-project-dashboard': project.id, children: [
    jsx(PageHead, {
      title: view.settings?.mission || project.id,
      description: `Project dashboard / ${project.id}`,
      status: project.health && project.health !== 'healthy' ? healthLabel : null,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-project-toolbar', children: [
      jsx('label', { children: 'Project' }),
      jsx('select', { value: project.id, onChange: (event) => onSelectProject(event.target.value), children:
        projectOptions.map((option) => jsx('option', { value: option.id, children: option.id }, option.id)),
      }),
      jsx('nav', { className: 'dockyard-project-tabs', 'aria-label': 'Project views', children:
        views.map(([key, label]) => jsx('button', {
          type: 'button',
          className: projectView === key ? 'active' : '',
          'data-project-view': key,
          'aria-pressed': projectView === key,
          onClick: () => setProjectView(key),
          children: label,
        }, key)),
      }),
    ]}),
    panel,
    jsx(WorkItemDetail, { item: selectedWorkItem, onClose: () => setSelectedWorkItem(null) }),
  ]})
}

function BacklogView({ view, onSelectProject, onRefresh }) {
  const [draggedRef, setDraggedRef] = useState(null)
  const [pendingMove, setPendingMove] = useState(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [createForm, setCreateForm] = useState({
    type: 'task', title: '', assignee: '', initiative: '', rank: '1', reason: '',
  })
  useEffect(() => {
    if (!createOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !createSaving) setCreateOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [createOpen, createSaving])
  const project = view.project
  if (!project) return jsx(EmptyState, { title: 'No project selected', description: 'Select a project before prioritising its backlog.', icon: 'project' })
  const canCreate = project.enabled !== false && project.phase === 'active'
  const workByRef = Object.fromEntries((view.workItems ?? []).map((item) => [item.ref, item]))
  const entries = [...(view.backlog ?? [])].sort((left, right) => Number(left.rank) - Number(right.rank))
  const requestMove = (entry, newRank) => {
    if (!entry || newRank < 1 || newRank > entries.length || newRank === Number(entry.rank)) return
    setPendingMove({ ref: entry.item_ref, newRank, title: workByRef[entry.item_ref]?.title || entry.item_ref })
    setReason('')
    setError(null)
  }
  const saveMove = async () => {
    if (!pendingMove || !reason.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/backlog/${encodeURIComponent(pendingMove.ref)}/rerank`, {
        method: 'POST', body: { new_rank: pendingMove.newRank, reason: reason.trim() },
      })
      setPendingMove(null)
      setReason('')
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setSaving(false)
  }
  const updateCreate = (key, value) => setCreateForm((current) => ({ ...current, [key]: value }))
  const maxInitialRank = entries.length + 1
  const initialRank = Number(createForm.rank)
  const createValid = createForm.title.trim().length >= 3
    && Boolean(createForm.assignee)
    && Number.isInteger(initialRank)
    && initialRank >= 1
    && initialRank <= maxInitialRank
    && createForm.reason.trim().length >= 4
  const openCreate = () => {
    if (!canCreate) return
    setCreateForm({ type: 'task', title: '', assignee: '', initiative: '', rank: String(maxInitialRank), reason: '' })
    setCreateError(null)
    setCreateOpen(true)
  }
  const saveCreate = async () => {
    if (!createValid) return
    setCreateSaving(true)
    setCreateError(null)
    try {
      const body = {
        type: createForm.type,
        title: createForm.title.trim(),
        assignee_id: createForm.assignee,
        assignee_kind: 'bot',
        ...(createForm.initiative ? { initiative_ref: createForm.initiative } : {}),
        rank: initialRank,
        reason: createForm.reason.trim(),
      }
      const created = await api(`/projects/${encodeURIComponent(project.id)}/backlog/items`, { method: 'POST', body })
      setCreateOpen(false)
      emitToast('success', `${created.ref || 'Work item'} created and added to the backlog.`)
      onRefresh()
    } catch (failure) {
      setCreateError(String(failure?.message ?? failure))
    }
    setCreateSaving(false)
  }
  return jsxs('div', { 'data-backlog-board': project.id, children: [
    jsx(PageHead, {
      title: 'Prioritised backlog',
      description: 'Ranked work with a mandatory reason for every change.',
      status: `${number(entries.length)} ranked`,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-project-toolbar', children: [
      jsx('label', { children: 'Project' }),
      jsx('select', { value: project.id, onChange: (event) => onSelectProject(event.target.value), children:
        (view.projects ?? []).map((option) => jsx('option', { value: option.id, children: option.id }, option.id)),
      }),
      jsx('span', { className: 'dockyard-meta', children: 'Drag a row or use the move controls. Saving always requires a reason.' }),
      jsx(Button, { action: 'open-create-backlog-item', variant: 'primary', small: true, disabled: !canCreate, onClick: openCreate, children: 'Create item' }),
    ]}),
    entries.length > 0 ? jsx('section', { className: 'dockyard-backlog-list', children:
      entries.map((entry) => {
        const item = workByRef[entry.item_ref] ?? { ref: entry.item_ref, title: entry.item_ref, status: 'backlog', type: 'item' }
        return jsxs('article', {
          className: 'dockyard-backlog-item',
          draggable: true,
          'data-backlog-item': entry.item_ref,
          onDragStart: () => setDraggedRef(entry.item_ref),
          onDragOver: (event) => event.preventDefault(),
          onDrop: (event) => {
            event.preventDefault()
            const source = entries.find((candidate) => candidate.item_ref === draggedRef)
            requestMove(source, Number(entry.rank))
            setDraggedRef(null)
          },
          children: [
            jsx('span', { className: 'dockyard-rank', children: number(entry.rank) }),
            jsxs('span', { className: 'dockyard-backlog-copy', children: [
              jsx('strong', { children: item.title }),
              jsx('span', { children: entry.priority_reason || 'No ranking reason supplied' }),
              jsx('span', { children: `${item.assignee || 'Unassigned'}${item.initiative_ref ? ` / ${item.initiative_ref}` : ''}` }),
            ]}),
            jsx(StatusTag, { tone: item.status === 'in_progress' ? 'info' : 'neutral', label: item.type || 'Item' }),
            jsxs('span', { className: 'dockyard-rank-actions', children: [
              jsx('button', {
                type: 'button', className: 'dockyard-button small',
                'data-rerank-ref': entry.item_ref, 'data-direction': 'up',
                disabled: Number(entry.rank) <= 1,
                onClick: () => requestMove(entry, Number(entry.rank) - 1),
                children: 'Move up',
              }),
              jsx('button', {
                type: 'button', className: 'dockyard-button small',
                'data-rerank-ref': entry.item_ref, 'data-direction': 'down',
                disabled: Number(entry.rank) >= entries.length,
                onClick: () => requestMove(entry, Number(entry.rank) + 1),
                children: 'Move down',
              }),
            ]}),
          ],
        }, entry.item_ref)
      }),
    }) : jsx(EmptyState, { title: 'No ranked backlog items', description: 'Work items appear here after they are added to the project backlog.', icon: 'project' }),
    jsxs('section', { className: 'dockyard-modal-layer', 'data-reason-modal': true, hidden: !pendingMove, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-reason-title', children: [
        jsx('h2', { id: 'dockyard-reason-title', children: 'Record the reason' }),
        jsx('p', { children: pendingMove ? `Move ${pendingMove.title} to rank ${pendingMove.newRank}.` : '' }),
        jsx('label', { htmlFor: 'dockyard-rank-reason', children: 'Reason for this priority change' }),
        jsx('textarea', { id: 'dockyard-rank-reason', value: reason, onChange: (event) => setReason(event.target.value), placeholder: 'Explain why this position is better for the project.' }),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { onClick: () => setPendingMove(null), children: 'Cancel' }),
          jsx(Button, { variant: 'primary', disabled: saving || !reason.trim(), onClick: saveMove, children: saving ? 'Saving...' : 'Save reason and move' }),
        ]}),
      ]}),
    ]}),
    jsxs('section', {
      className: 'dockyard-modal-layer',
      'data-create-backlog-layer': true,
      hidden: !createOpen,
      onClick: (event) => { if (event.target === event.currentTarget && !createSaving) setCreateOpen(false) },
      children: [
      jsxs('form', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-create-title', 'data-create-backlog-item': true, onSubmit: (event) => { event.preventDefault(); saveCreate() }, children: [
        jsxs('header', { className: 'dockyard-modal-head', children: [
          jsx('h2', { id: 'dockyard-create-title', children: 'Create backlog item' }),
          jsx(Button, { action: 'close-create-backlog-item', ariaLabel: 'Close create item dialog', disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Close' }),
        ]}),
        jsx('p', { children: `Create and rank one item in ${project.id}. Nothing is saved until submission succeeds.` }),
        jsxs('div', { className: 'dockyard-creator-summary', children: [jsx('strong', { children: 'Sahil is recorded as creator' }), jsx('span', { children: 'Choose a separate bot assignee for delivery ownership.' })] }),
        jsxs('div', { className: 'dockyard-settings-grid', children: [
          jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Title' }), jsx('input', { 'data-create-field': 'title', value: createForm.title, onInput: (event) => updateCreate('title', event.target.value), onChange: (event) => updateCreate('title', event.target.value), placeholder: 'Describe the delivery outcome' })] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Type' }), jsx('select', { 'data-create-field': 'type', value: createForm.type, onChange: (event) => updateCreate('type', event.target.value), children: [
            jsx('option', { value: 'task', children: 'Task' }, 'task'),
            jsx('option', { value: 'bug', children: 'Bug' }, 'bug'),
            jsx('option', { value: 'spike', children: 'Spike' }, 'spike'),
            jsx('option', { value: 'epic', children: 'Epic' }, 'epic'),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Assignee' }), jsx('select', { 'data-create-field': 'assignee', value: createForm.assignee, onChange: (event) => updateCreate('assignee', event.target.value), children: [
            jsx('option', { value: '', children: 'Select a bot' }, 'none'),
            ...(view.bots ?? []).map((bot) => jsx('option', { value: bot.id, children: bot.name || bot.id }, bot.id)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Initiative (optional)' }), jsx('select', { 'data-create-field': 'initiative', value: createForm.initiative, onChange: (event) => updateCreate('initiative', event.target.value), children: [
            jsx('option', { value: '', children: 'No initiative' }, 'none'),
            ...(view.initiatives ?? []).map((initiative) => jsx('option', { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref)),
          ]})] }),
          jsxs('label', { className: 'dockyard-field', children: [jsx('span', { children: 'Initial rank' }), jsx('input', { type: 'number', min: 1, max: maxInitialRank, 'data-create-field': 'rank', value: createForm.rank, onInput: (event) => updateCreate('rank', event.target.value), onChange: (event) => updateCreate('rank', event.target.value) })] }),
          jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [jsx('span', { children: 'Priority reason' }), jsx('textarea', { rows: 3, 'data-create-field': 'reason', value: createForm.reason, onInput: (event) => updateCreate('reason', event.target.value), onChange: (event) => updateCreate('reason', event.target.value), placeholder: 'Why should this item hold this rank?' })] }),
        ]}),
        createError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: createError }) : null,
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { disabled: createSaving, onClick: () => setCreateOpen(false), children: 'Cancel' }),
          jsx(Button, { action: 'submit-create-backlog-item', variant: 'primary', disabled: createSaving || !createValid, onClick: saveCreate, children: createSaving ? 'Creating...' : 'Create and add' }),
        ]}),
      ]}),
    ]}),
  ]})
}

function TeamsView({ view, onRefresh }) {
  const bots = view.bots ?? []
  const workload = view.workload ?? { busy: [], idle: [], stuck: [], offline: [] }
  const total = Math.max(1, bots.length)
  const [selectedBot, setSelectedBot] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [transcript, setTranscript] = useState(null)
  const [sessionState, setSessionState] = useState('idle')
  const [sessionError, setSessionError] = useState(null)
  const openSessions = async (botId) => {
    setSelectedBot(botId)
    setTranscript(null)
    setSessionData(null)
    setSessionState('loading')
    setSessionError(null)
    try {
      setSessionData(await api(`/bots/${encodeURIComponent(botId)}/sessions`))
      setSessionState('ready')
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure))
      setSessionState('error')
    }
  }
  const openTranscript = async (sessionId) => {
    if (!selectedBot) return
    setSessionState('loading-transcript')
    setSessionError(null)
    try {
      setTranscript(await api(`/bots/${encodeURIComponent(selectedBot)}/sessions/${encodeURIComponent(sessionId)}`))
      setSessionState('ready')
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure))
      setSessionState('error')
    }
  }
  return jsxs('div', { 'data-bot-teams': true, children: [
    jsx(PageHead, {
      title: 'Bot teams',
      description: 'Capabilities, availability, group ownership and structured handoffs.',
      status: workload.stuck?.length > 0 ? `${number(workload.stuck.length)} stuck` : null,
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-view-only-note', 'data-view-only': 'bot-team', children: [
      jsx(Icon, { name: 'eye' }),
      jsx('span', { children: 'View only. Project membership, task assignment and reassignment are managed in the canonical work system.' }),
    ]}),
    jsxs('section', { className: 'dockyard-workload-card', 'data-workload-visual': true, children: [
      jsxs('div', { children: [jsx('h2', { children: 'Workload heat' }), jsx('p', { children: 'Current fleet availability from owned work.' })] }),
      jsxs('div', { className: 'dockyard-workload-chart', children: [
        jsxs('div', { className: 'dockyard-work-visual', role: 'img', 'aria-label': `${workload.busy?.length ?? 0} busy, ${workload.idle?.length ?? 0} idle, ${workload.stuck?.length ?? 0} stuck, ${workload.offline?.length ?? 0} offline`, children: [
          workload.busy?.length > 0 ? jsx('span', { className: 'active', style: { width: `${(workload.busy.length / total) * 100}%` } }) : null,
          workload.idle?.length > 0 ? jsx('span', { className: 'done', style: { width: `${(workload.idle.length / total) * 100}%` } }) : null,
          workload.stuck?.length > 0 ? jsx('span', { className: 'danger', style: { width: `${(workload.stuck.length / total) * 100}%` } }) : null,
        ]}),
        jsx('p', { children: `${number(workload.busy?.length ?? 0)} busy / ${number(workload.idle?.length ?? 0)} idle / ${number(workload.stuck?.length ?? 0)} stuck / ${number(workload.offline?.length ?? 0)} offline` }),
      ]}),
    ]}),
    jsxs('div', { className: 'dockyard-teams-layout', children: [
      jsxs('section', { className: 'dockyard-feature-card', children: [
        jsx('h2', { children: 'Registry' }),
        jsx('p', { children: 'Declared capabilities and current state. Capability never expands permission.' }),
        jsx('div', { className: 'dockyard-bot-grid', children:
          bots.map((bot) => jsxs('article', { className: 'dockyard-bot-card', 'data-bot-card': bot.id, children: [
            jsxs('header', { children: [
              jsx('span', { className: 'dockyard-avatar', children: initials(bot.name || bot.id) }),
              jsxs('span', { children: [jsx('strong', { children: bot.name || bot.id }), jsx('small', { children: bot.current_item || 'No active item' })] }),
              jsx(StatusTag, { tone: bot.status === 'busy' ? 'warning' : bot.status === 'idle' ? 'success' : 'neutral', label: bot.status || 'unknown' }),
            ]}),
            jsx('div', { className: 'dockyard-capabilities', children:
              (bot.capabilities ?? []).length > 0
                ? bot.capabilities.map((capability) => jsx('span', { children: capability }, capability))
                : jsx('span', { children: 'No capabilities declared' }),
            }),
            jsxs('button', {
              type: 'button',
              className: 'dockyard-bot-session-button',
              'data-action': 'open-bot-sessions',
              'data-bot-id': bot.id,
              'aria-expanded': selectedBot === bot.id,
              onClick: () => openSessions(bot.id),
              children: [jsx(Icon, { name: 'activity' }), jsx('span', { children: 'Session logs' }), jsx(Icon, { name: 'chevron' })],
            }),
          ]}, bot.id)),
        }),
      ]}),
      jsxs('section', { className: 'dockyard-feature-card', children: [
        jsx('h2', { children: 'Groups and handoffs' }),
        jsx('p', { children: 'Group membership and audited A2A messages from the canonical feed.' }),
        jsx('div', { className: 'dockyard-group-list', children:
          (view.groups ?? []).length > 0
            ? view.groups.map((group) => jsxs('article', { className: 'dockyard-group-card', 'data-bot-group': group.name, children: [
                jsxs('header', { children: [jsx('strong', { children: group.name }), jsx('span', { children: `${number(group.members?.length ?? 0)} members` })] }),
                jsx('p', { children: group.purpose || 'No purpose supplied' }),
                jsx('div', { className: 'dockyard-group-members', children: (group.members ?? []).map((member) => jsx('span', { className: 'dockyard-avatar', title: member, children: initials(member) }, member)) }),
                jsx('div', { className: 'dockyard-handoff-list', children:
                  (view.messages?.[group.name] ?? []).length > 0
                    ? view.messages[group.name].map((message, index) => jsxs('div', { children: [
                        jsx('strong', { children: message.payload?.summary || message.msg_type || 'A2A event' }),
                        jsx('span', { children: `${message.from_actor || 'Unknown actor'} / ${formatWhen(message.created_at)}` }),
                      ]}, String(message.id ?? index)))
                    : jsx('span', { className: 'dockyard-meta', children: 'No handoff messages recorded.' }),
                }),
              ]}, group.name))
            : jsx('p', { className: 'dockyard-meta', children: 'No bot groups configured.' }),
        }),
      ]}),
    ]}),
    selectedBot ? jsxs('section', { className: 'dockyard-feature-card dockyard-bot-session-panel', 'data-bot-session-panel': selectedBot, children: [
      jsxs('header', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [
          jsx('span', { className: 'dockyard-card-label', children: 'SESSION EVIDENCE' }),
          jsx('h2', { children: `${bots.find((bot) => bot.id === selectedBot)?.name || selectedBot} activity` }),
          jsx('p', { children: sessionData?.scope_note || 'System prompts and private reasoning are excluded.' }),
        ]}),
        jsx(Button, { small: true, onClick: () => { setSelectedBot(null); setSessionData(null); setTranscript(null) }, children: 'Close' }),
      ]}),
      sessionError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: sessionError }) : null,
      sessionState === 'loading'
        ? jsx('p', { className: 'dockyard-meta', children: 'Loading sessions...' })
        : jsxs('div', { className: 'dockyard-session-layout', children: [
            jsxs('aside', { className: 'dockyard-session-list', children: [
              jsx('h3', { children: 'Recent sessions' }),
              sessionData?.available === false
                ? jsx('p', { className: 'dockyard-meta', children: 'No Hermes session store is available for this bot profile.' })
                : (sessionData?.sessions ?? []).length > 0
                  ? sessionData.sessions.map((session) => jsxs('button', {
                      type: 'button',
                      'data-bot-session': session.session_id,
                      className: transcript?.session?.session_id === session.session_id ? 'active' : '',
                      onClick: () => openTranscript(session.session_id),
                      children: [
                        jsxs('span', { children: [jsx('strong', { children: session.title }), jsx('small', { children: `${session.source} / ${formatWhen(session.last_activity_at)}` })] }),
                        jsx(StatusTag, { tone: session.status === 'active' ? 'success' : 'neutral', label: session.status }),
                      ],
                    }, session.session_id))
                  : jsx('p', { className: 'dockyard-meta', children: 'No sessions were recorded for this bot.' }),
            ]}),
            transcript
              ? jsxs('article', { className: 'dockyard-transcript', 'data-session-transcript': transcript.session?.session_id, children: [
                  jsxs('header', { children: [
                    jsxs('div', { children: [jsx('h3', { children: transcript.session?.title || 'Session transcript' }), jsx('span', { children: `${transcript.session?.source || 'unknown'} / ${transcript.session?.model || 'model not recorded'}` })] }),
                    jsx(StatusTag, { tone: 'info', label: `${number(transcript.messages?.length ?? 0)} messages` }),
                  ]}),
                  jsx('div', { className: 'dockyard-transcript-messages', children:
                    (transcript.messages ?? []).map((message, index) => jsxs('div', { className: `dockyard-transcript-message ${message.role}`, 'data-transcript-message': message.role, children: [
                      jsxs('div', { children: [jsx('strong', { children: message.tool_name || message.role }), jsx('span', { children: formatWhen(message.timestamp) })] }),
                      jsx('pre', { children: message.content || '(empty message)' }),
                      message.truncated ? jsx('small', { children: 'Message truncated at the safe display limit.' }) : null,
                    ]}, String(message.message_id ?? index))),
                  }),
                  jsx('p', { className: 'dockyard-transcript-scope', children: transcript.scope_note }),
                ]})
              : jsx('div', { className: 'dockyard-transcript-placeholder', children: sessionState === 'loading-transcript' ? 'Loading transcript...' : 'Select a session to inspect its transcript.' }),
          ]}),
    ]}) : null,
  ]})
}

function InitiativeView({ view, onRefresh }) {
  const initiative = [...(view.initiatives ?? [])].sort((left, right) => (RISK_PRIORITY[left.risk] ?? 1) - (RISK_PRIORITY[right.risk] ?? 1))[0]
  const project = view.project
  const stages = [
    ['verify', 'Verify state', 'Confirm the project state and evidence source.'],
    ['detect', 'Detect gap', initiative?.rationale || 'Research the highest-value project gap.'],
    ['propose', 'Create initiative', initiative?.expected_outcome || 'Declare the expected outcome.'],
    ['prioritise', 'Prioritise', `Priority ${number(initiative?.priority ?? 0)} with a recorded rationale.`],
    ['approval', 'Human approval', 'Owner reviews the risk, evidence and validation contract.'],
    ['execute', 'Build and verify', validationSummary(initiative?.validation_contract)],
    ['release', 'Release', 'Release remains bounded by project policy.'],
    ['observe', 'Observe outcome', 'Measure whether the project improved.'],
  ]
  const currentIndex = initiative?.status === 'pending_approval' ? 4
    : ['approved', 'executing'].includes(initiative?.status) ? 5
      : ['completed', 'measured'].includes(initiative?.status) ? 7 : 2
  const [selectedStage, setSelectedStage] = useState(currentIndex)
  const [freezeState, setFreezeState] = useState(null)
  const [freezeConfirm, setFreezeConfirm] = useState(false)
  const freeze = async () => {
    if (!project) return
    setFreezeState('freezing')
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/freeze`, { method: 'POST', body: {} })
      setFreezeState('frozen')
      onRefresh()
    } catch (failure) {
      setFreezeState(String(failure?.message ?? failure))
    }
  }
  if (!project || !initiative) return jsx(EmptyState, { title: 'No initiative available', description: 'A project initiative will appear here after it is proposed.', icon: 'project' })
  return jsxs('div', { 'data-initiative-loop': initiative.ref, children: [
    jsx(PageHead, {
      title: initiative.title,
      description: `${project.id} / ${initiative.ref} / one canonical improvement loop`,
      status: initiative.status || 'unknown',
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-loop-layout', children: [
      jsxs('section', { className: 'dockyard-feature-card dockyard-loop-card', children: [
        jsxs('div', { className: 'dockyard-loop-head', children: [
          jsxs('div', { children: [jsx('h2', { children: 'Initiative loop' }), jsx('p', { children: 'Select a stage to inspect its current evidence and state.' })] }),
          jsx(Button, { action: 'freeze-project', variant: 'danger', disabled: freezeState === 'freezing' || freezeState === 'frozen', onClick: () => setFreezeConfirm(true), children: freezeState === 'freezing' ? 'Freezing...' : freezeState === 'frozen' ? 'Project frozen' : 'Freeze project' }),
        ]}),
        jsx('div', { className: 'dockyard-loop-visual-wrap', children:
          jsx('svg', { viewBox: '0 0 1010 140', role: 'img', 'aria-label': 'Initiative stages from verification to observed outcome', 'data-loop-visual': true, children:
            stages.map(([key, label], index) => {
              const x = 20 + index * 123
              const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'queued'
              return jsxs(Fragment, { children: [
                index < stages.length - 1 ? jsx('path', { className: `dockyard-loop-edge ${state}`, d: `M${x + 105} 55H${x + 123}` }) : null,
                jsx('rect', { className: `dockyard-loop-node ${state}`, x, y: 30, width: 105, height: 52, rx: 10 }),
                jsx('text', { x: x + 52.5, y: 60, textAnchor: 'middle', children: label }),
              ]}, key)
            }),
          }),
        }),
        jsx('div', { className: 'dockyard-stage-list', children:
          stages.map(([key, label], index) => jsx('button', {
            type: 'button',
            className: selectedStage === index ? 'active' : '',
            'data-initiative-stage': key,
            onClick: () => setSelectedStage(index),
            children: jsxs(Fragment, { children: [
              jsx('span', { children: number(index + 1) }),
              jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: index < currentIndex ? 'Done' : index === currentIndex ? 'Current gate' : 'Queued' })] }),
            ]}),
          }, key)),
        }),
      ]}),
      jsxs('aside', { className: 'dockyard-feature-card dockyard-stage-detail', children: [
        jsx('span', { className: 'dockyard-card-label', children: 'SELECTED STAGE' }),
        jsx('h2', { children: stages[selectedStage][1] }),
        jsx('p', { children: stages[selectedStage][2] }),
        jsxs('div', { className: 'dockyard-evidence-details', children: [
          jsx('strong', { children: 'Initiative evidence' }),
          jsx('p', { children: initiative.rationale || 'No rationale supplied.' }),
          jsx('p', { children: `Validation: ${validationSummary(initiative.validation_contract)}` }),
        ]}),
        freezeState && !['freezing', 'frozen'].includes(freezeState) ? jsx('p', { className: 'dockyard-inline-error', children: freezeState }) : null,
      ]}),
    ]}),
    freezeConfirm ? jsx(ConfirmDialog, {
      confirmKey: 'freeze-project',
      title: 'Freeze this project?',
      description: 'Freezing stops new execution until the project is explicitly resumed.',
      confirmLabel: 'Freeze project',
      busy: freezeState === 'freezing',
      onCancel: () => setFreezeConfirm(false),
      onConfirm: async () => { setFreezeConfirm(false); await freeze() },
    }) : null,
  ]})
}

function SavedViewsView({ view, onSelectProject, onRefresh }) {
  const [name, setName] = useState('Owner focus')
  const [layout, setLayout] = useState('board')
  const [statusFilter, setStatusFilter] = useState('in_progress')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [selectedView, setSelectedView] = useState(null)
  const project = view.project
  const applySavedView = (saved) => {
    setSelectedView(saved.name)
    setName(saved.name ?? '')
    setLayout(saved.layout ?? 'board')
    setStatusFilter(saved.filters?.status ?? 'in_progress')
  }
  const save = async () => {
    if (!project || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/views`, {
        method: 'PUT',
        body: { name: name.trim(), layout, filters: { status: statusFilter }, shared: false },
      })
      setSelectedView(name.trim())
      emitToast('success', `Saved view ${name.trim()}.`)
      onRefresh()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setSaving(false)
  }
  if (!project) return jsx(EmptyState, { title: 'No project selected', description: 'Select a project before saving a display layout.', icon: 'project' })
  return jsxs('div', { 'data-saved-views-screen': project.id, children: [
    jsx(PageHead, { title: 'Saved views', description: 'Reusable display layouts and filters over canonical project work.', status: `${number(view.views?.length ?? 0)} saved`, onRefresh }),
    jsxs('div', { className: 'dockyard-project-toolbar', children: [
      jsx('label', { children: 'Project' }),
      jsx('select', { value: project.id, onChange: (event) => onSelectProject(event.target.value), children:
        (view.projects ?? []).map((option) => jsx('option', { value: option.id, children: option.id }, option.id)),
      }),
      jsx('span', { className: 'dockyard-meta', children: 'Saved definitions affect presentation only. They never expand project permissions.' }),
    ]}),
    jsxs('section', { className: 'dockyard-saved-views-notice', children: [
      jsx('strong', { children: 'Renamed from Workflows' }),
      jsx('span', { children: 'These are display preferences, not executable workflows. Saved views change how canonical work is displayed; they do not run automations, assign work or expand permissions.' }),
    ]}),
    jsxs('div', { className: 'dockyard-saved-views-layout', children: [
      jsxs('section', { className: 'dockyard-feature-card', children: [
        jsxs('div', { className: 'dockyard-section-head', children: [jsxs('div', { children: [jsx('h2', { children: 'Saved views' }), jsx('p', { children: 'Select a saved view to load it into the editor.' })] }), jsx(StatusTag, { tone: 'neutral', label: `${number(view.views?.length ?? 0)} total` })] }),
        jsx('div', { className: 'dockyard-saved-views', children:
          (view.views ?? []).length > 0
            ? view.views.map((saved) => jsxs('button', { type: 'button', className: selectedView === saved.name ? 'active' : '', 'data-saved-view': saved.name, onClick: () => applySavedView(saved), children: [
                jsxs('span', { children: [jsx('strong', { children: saved.name }), jsx('small', { children: `${readableLabel(saved.layout, 'Board')} / ${readableLabel(saved.filters?.status)}` })] }),
                jsx(Icon, { name: 'chevron' }),
              ]}, saved.name))
            : jsx('p', { className: 'dockyard-meta', children: 'No saved views yet.' }),
        }),
      ]}),
      jsxs('aside', { className: 'dockyard-feature-card', children: [
        jsxs('div', { className: 'dockyard-saved-view-editor', 'data-saved-view-editor': true, children: [
          jsxs('div', { className: 'dockyard-section-head', children: [jsxs('div', { children: [jsx('h2', { children: selectedView ? 'Edit saved view' : 'Create saved view' }), jsx('p', { children: 'Persist a bounded lens over canonical project work.' })] }), selectedView ? jsx(StatusTag, { tone: 'info', label: 'loaded' }) : null] }),
          jsx('label', { htmlFor: 'dockyard-view-name', children: 'Name' }),
          jsx('input', { id: 'dockyard-view-name', value: name, onChange: (event) => setName(event.target.value) }),
          jsx('label', { htmlFor: 'dockyard-view-layout', children: 'Layout' }),
          jsx('select', { id: 'dockyard-view-layout', value: layout, onChange: (event) => setLayout(event.target.value), children: [
            jsx('option', { value: 'board', children: 'Board' }, 'board'),
            jsx('option', { value: 'table', children: 'Table' }, 'table'),
            jsx('option', { value: 'timeline', children: 'Timeline' }, 'timeline'),
          ]}),
          jsx('label', { htmlFor: 'dockyard-view-status', children: 'Status filter' }),
          jsx('select', { id: 'dockyard-view-status', value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [
            jsx('option', { value: 'in_progress', children: 'In progress' }, 'in_progress'),
            jsx('option', { value: 'in_review', children: 'In review' }, 'in_review'),
            jsx('option', { value: 'backlog', children: 'Backlog' }, 'backlog'),
          ]}),
          error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
          jsxs('div', { className: 'dockyard-form-actions', children: [
            jsx(Button, { variant: 'primary', disabled: saving || !name.trim(), onClick: save, children: saving ? 'Saving...' : selectedView ? 'Save view' : 'Create view' }),
            selectedView ? jsx(Button, { onClick: () => { setSelectedView(null); setName('Owner focus'); setLayout('board'); setStatusFilter('in_progress') }, children: 'Clear' }) : null,
          ]}),
        ]}),
      ]}),
    ]}),
  ]})
}

function ApprovalRow({ item, onResolved }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [rejectConfirm, setRejectConfirm] = useState(false)
  const [tone, label] = riskDetails(item.risk)
  const detail = item.detail ?? {}
  const decide = async (action) => {
    const resolvedState = action === 'approve' ? 'approved' : 'rejected'
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject'
    setState(action === 'approve' ? 'approving' : 'rejecting')
    setError(null)
    try {
      await api(`/initiatives/${encodeURIComponent(item.ref)}/${action}`, {
        method: 'POST', body: {}, suppressErrorToast: true,
      })
      setState(resolvedState)
      setTimeout(onResolved, 850)
    } catch (failure) {
      let stillPending = null
      try {
        const inbox = await api('/inbox')
        stillPending = (inbox?.items ?? []).some((pending) => pending.ref === item.ref)
      } catch {
        stillPending = null
      }
      if (stillPending === false) {
        setState(resolvedState)
        emitToast('success', `Initiative ${resolvedState}; status confirmed after a response error`)
        setTimeout(onResolved, 850)
        return
      }
      setState('failed')
      const detailMessage = String(failure?.message ?? failure)
      const message = stillPending === true
        ? `${actionLabel} was not recorded. The approval is still pending. ${detailMessage}`
        : `${actionLabel} could not be confirmed. Refresh before trying again. ${detailMessage}`
      setError(message)
      emitToast('danger', message)
    }
  }
  const resolved = state === 'approved' || state === 'rejected'
  const stateTone = state === 'approved' ? 'success' : state === 'rejected' || state === 'failed' ? 'danger' : tone
  const stateLabel = state === 'approved'
    ? 'Approved'
    : state === 'rejected'
      ? 'Rejected'
      : state === 'failed'
        ? 'Decision unconfirmed'
        : label
  const created = formatWhen(detail.created_at)
  return jsxs('article', {
    className: 'dockyard-approval-row',
    'data-approval-card': true,
    'data-approval-ref': item.ref,
    'data-state': state,
    children: [
      jsxs('div', { className: 'dockyard-approval-top', children: [
        jsx('span', { className: `dockyard-approval-icon ${tone}`, children: jsx(Icon, { name: tone === 'danger' ? 'alert' : 'check' }) }),
        jsxs('div', { className: 'dockyard-approval-main', children: [
          jsx('h2', { children: item.title }),
          jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}${created ? ` / proposed ${created}` : ''}` }),
        ]}),
        jsx(StatusTag, { tone: stateTone, label: stateLabel }),
      ]}),
      jsxs('div', { className: 'dockyard-evidence-grid', 'data-evidence-grid': true, children: [
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'rationale', children: [
          jsx('span', { children: 'WHY PROPOSED' }),
          jsx('strong', { children: detail.rationale || 'No rationale supplied' }),
        ]}),
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'outcome', children: [
          jsx('span', { children: 'EXPECTED OUTCOME' }),
          jsx('strong', { children: detail.expected_outcome || 'No expected outcome supplied' }),
        ]}),
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'validation', children: [
          jsx('span', { children: 'VALIDATION' }),
          jsx('strong', { children: validationSummary(detail.validation_contract) }),
        ]}),
      ]}),
      jsxs('div', { className: 'dockyard-approval-actions', children: [
        resolved ? jsx(StatusTag, { tone: stateTone, label: stateLabel }) : jsx(Button, {
          action: 'approve',
          variant: 'primary',
          disabled: state === 'approving' || state === 'rejecting',
          onClick: () => decide('approve'),
          children: state === 'approving' ? 'Approving...' : 'Approve',
        }),
        resolved ? null : jsx(Button, {
          action: 'reject',
          variant: 'danger',
          disabled: state === 'approving' || state === 'rejecting',
          onClick: () => setRejectConfirm(true),
          children: state === 'rejecting' ? 'Rejecting...' : 'Reject',
        }),
        jsx(Button, {
          action: 'toggle-evidence',
          variant: 'quiet',
          onClick: () => setExpanded((open) => !open),
          children: expanded ? 'Hide evidence details' : 'Show evidence details',
        }),
        !resolved ? jsx(StatusTag, { tone: 'neutral', label: 'Awaiting you' }) : null,
      ]}),
      jsx('div', {
        className: 'dockyard-evidence-details',
        'data-evidence-details': true,
        hidden: !expanded,
        children: `Status: ${detail.status || 'pending approval'}. Priority: ${number(detail.priority ?? 0)}. Approval state: ${detail.approval_state || 'pending'}. Context reference: ${item.deep_link || item.ref}.`,
      }),
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
      rejectConfirm ? jsx(ConfirmDialog, {
        confirmKey: `reject-${item.ref}`,
        title: 'Reject this initiative?',
        description: `${item.title} will leave the approval queue and be recorded as rejected.`,
        confirmLabel: 'Reject initiative',
        busy: state === 'rejecting',
        onCancel: () => setRejectConfirm(false),
        onConfirm: async () => { setRejectConfirm(false); await decide('reject') },
      }) : null,
    ],
  })
}

function InboxView({ view, onRefresh }) {
  const items = sortApprovals(view.items ?? [])
  if (items.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: 'Approval Inbox', description: 'Every pending human decision across every project, with enough context to decide here.', onRefresh }),
      jsx(EmptyState, { title: 'No approvals waiting', description: 'New owner decisions will appear here with their project, evidence context and risk.', icon: 'check' }),
    ]})
  }
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Approval Inbox',
      description: 'Every pending human decision across every project, with enough context to decide here.',
      status: `${number(items.length)} ${plural(items.length, 'decision')} owed`,
      onRefresh,
    }),
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
  const unread = notes.filter((note) => !note.acked).sort((left, right) => {
    const severity = (SEVERITY_PRIORITY[String(left.severity || 'info').toLowerCase()] ?? 3)
      - (SEVERITY_PRIORITY[String(right.severity || 'info').toLowerCase()] ?? 3)
    return severity !== 0 ? severity : String(right.created_at || '').localeCompare(String(left.created_at || ''))
  })
  const cleared = notes.filter((note) => note.acked).sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Notifications',
      description: 'Attributed fleet events and their cleared history.',
      status: unread.length > 0 ? `${number(unread.length)} unread` : null,
      onRefresh,
    }),
    unread.length > 0 ? jsx(NotificationGroup, { title: 'Needs attention', description: 'Unread fleet events.', items: unread, onAcknowledged }) : null,
    cleared.length > 0 ? jsx(NotificationGroup, { title: 'Cleared', description: 'Acknowledged events remain available for context.', items: cleared, onAcknowledged }) : null,
  ]})
}

function DashboardPage() {
  useDockyardStyles()
  const [tab, setTab] = useState('dashboard')
  const [selectedProject, setSelectedProject] = useState(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [counts, setCounts] = useState({ approvals: null, notifications: null })
  const [loadScope, setLoadScope] = useState(null)

  useEffect(() => {
    const timers = new Map()
    const handleToast = (event) => {
      const toast = event.detail
      if (!toast?.id || !toast?.message) return
      setToasts((current) => [...current.slice(-3), toast])
      timers.set(toast.id, window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
        timers.delete(toast.id)
      }, 5000))
    }
    window.addEventListener(TOAST_EVENT, handleToast)
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast)
      for (const timer of timers.values()) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    let current = true
    const nextLoadScope = `${tab}:${selectedProject ?? ''}`
    if (loadScope !== nextLoadScope) {
      setData(null)
      setLoadScope(nextLoadScope)
    }
    setError(null)
    const loader = tab === 'dashboard'
      ? loadDashboardData
      : tab === 'project'
        ? () => loadProjectData(selectedProject)
      : tab === 'backlog'
        ? () => loadBacklogData(selectedProject)
      : tab === 'teams'
        ? loadTeamsData
      : tab === 'initiative'
        ? () => loadProjectData(selectedProject)
      : tab === 'workflows'
        ? () => loadSavedViewsData(selectedProject)
      : tab === 'inbox'
        ? loadInboxData
        : () => api('/notifications')
    loader().then(
      (result) => {
        if (!current) return
        setData({ tab, payload: result })
        if (tab === 'dashboard') {
          setCounts({
            approvals: Number(result.inbox?.count ?? result.owed_decisions ?? 0),
            notifications: Number((result.notifications?.notifications ?? []).filter((note) => !note.acked).length),
          })
        } else if (tab === 'inbox') {
          setCounts((previous) => ({ ...previous, approvals: Number(result.count ?? result.items?.length ?? 0) }))
        } else {
          setCounts((previous) => ({ ...previous, notifications: Number((result.notifications ?? []).filter((note) => !note.acked).length) }))
        }
      },
      (failure) => { if (current) setError({ tab, error: failure }) },
    )
    return () => { current = false }
  }, [tab, selectedProject, requestVersion])

  const refresh = () => setRequestVersion((version) => version + 1)
  const dismissToast = (id) => setToasts((current) => current.filter((toast) => toast.id !== id))
  const completeOnboarding = (result) => {
    setOnboardingOpen(false)
    setSelectedProject(result?.project_id ?? null)
    setTab('project')
  }
  const acknowledge = (id) => {
    setData((previous) => {
      if (previous?.tab !== 'notifications' || !previous.payload?.notifications) return previous
      return {
        ...previous,
        payload: {
          ...previous.payload,
          notifications: previous.payload.notifications.map((note) => note.id === id ? { ...note, acked: true } : note),
        },
      }
    })
    setCounts((previous) => ({ ...previous, notifications: Math.max(0, Number(previous.notifications ?? 1) - 1) }))
  }

  const payload = data?.tab === tab ? data.payload : null
  const activeError = error?.tab === tab ? error.error : null
  let content
  if (activeError) {
    content = jsx(ErrorState, { error: activeError, onRetry: refresh })
  } else if (!payload) {
    content = jsx(LoadingState, {})
  } else if (tab === 'dashboard') {
    content = jsx(DashboardView, { view: payload, onInbox: () => setTab('inbox'), onRefresh: refresh })
  } else if (tab === 'project') {
    content = jsx(ProjectDashboard, { view: payload, onSelectProject: setSelectedProject, onRefresh: refresh })
  } else if (tab === 'backlog') {
    content = jsx(BacklogView, { view: payload, onSelectProject: setSelectedProject, onRefresh: refresh })
  } else if (tab === 'teams') {
    content = jsx(TeamsView, { view: payload, onRefresh: refresh })
  } else if (tab === 'initiative') {
    content = jsx(InitiativeView, { view: payload, onRefresh: refresh })
  } else if (tab === 'workflows') {
    content = jsx(SavedViewsView, { view: payload, onSelectProject: setSelectedProject, onRefresh: refresh })
  } else if (tab === 'inbox') {
    content = jsx(InboxView, { view: payload, onRefresh: refresh })
  } else {
    content = jsx(NotificationsView, { view: payload, onRefresh: refresh, onAcknowledged: acknowledge })
  }

  return jsxs('div', { className: 'dockyard-root', children: [
    jsxs('div', { className: 'dockyard-shell', children: [
      jsx(ConsoleBar, { tab, counts, onTab: setTab, onNewProject: () => setOnboardingOpen(true) }),
      jsx('main', {
        id: 'dockyard-panel',
        role: 'tabpanel',
        'aria-labelledby': `dockyard-tab-${tab}`,
        children: content,
      }),
    ]}),
    jsx(ToastRegion, { toasts, onDismiss: dismissToast }),
    onboardingOpen ? jsx(OnboardingWizard, { onClose: () => setOnboardingOpen(false), onComplete: completeOnboarding }) : null,
  ]})
}

const __plugin = {
  id: 'hermes-dockyard',
  name: 'Hermes Dockyard',
  register(ctx) {
    bindContext(ctx)
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
