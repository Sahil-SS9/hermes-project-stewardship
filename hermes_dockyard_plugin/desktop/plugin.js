// GENERATED — edit desktop/src/, then run node hermes_dockyard_plugin/desktop/build.mjs

// hermes_dockyard_plugin/desktop/src/runtime/react.js
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

// hermes_dockyard_plugin/desktop/src/index.js
import { host } from "@hermes/plugin-sdk";

// hermes_dockyard_plugin/desktop/src/styles/tokens.js
var LIGHT_TOKENS = Object.freeze({
  bg: "#f6f7f9",
  surface: "#ffffff",
  surfaceSubtle: "#f0f2f5",
  surfaceStrong: "#e8ebf0",
  text: "#15171c",
  textSecondary: "#515968",
  textTertiary: "#626c7b",
  border: "#d7dce4",
  controlBorder: "#87909d",
  action: "#3654c7",
  actionHover: "#2945b4",
  accentText: "#293f9e",
  accentSoft: "#eef1ff",
  accentBorder: "#b8c4f0",
  shadow: "0 10px 28px rgba(31, 42, 68, 0.08)",
  success: "#136c4a",
  successBg: "#e7f6ef",
  warning: "#805200",
  warningBg: "#fff3d4",
  danger: "#a72a2a",
  dangerBg: "#ffeded",
  info: "#315ca8",
  infoBg: "#eaf2ff",
  neutral: "#596273",
  neutralBg: "#edf0f4",
  focus: "#3654c7",
  disabledText: "#515968",
  disabledBg: "#e8ebf0"
});
var DARK_TOKENS = Object.freeze({
  bg: "#0f1217",
  surface: "#171b22",
  surfaceSubtle: "#1d222b",
  surfaceStrong: "#252b36",
  text: "#f3f5f7",
  textSecondary: "#b6beca",
  textTertiary: "#949eac",
  border: "#2e3541",
  controlBorder: "#5f6977",
  action: "#3654c7",
  actionHover: "#4662d4",
  accentText: "#c2cbff",
  accentSoft: "#232c4f",
  accentBorder: "#46558f",
  shadow: "0 12px 30px rgba(0, 0, 0, 0.24)",
  success: "#72cda2",
  successBg: "#16372a",
  warning: "#f0bd64",
  warningBg: "#3a2c14",
  danger: "#ff9188",
  dangerBg: "#40201f",
  info: "#9ab9ff",
  infoBg: "#1c2d4a",
  neutral: "#bac2ce",
  neutralBg: "#2a303a",
  focus: "#8fa2ff",
  disabledText: "#b6beca",
  disabledBg: "#252b36"
});
var CONTRAST_PAIRS = Object.freeze([
  { theme: "light", label: "primary text on page", foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: "light", label: "primary text on surface", foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "primary text on subtle surface", foreground: LIGHT_TOKENS.text, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "light", label: "secondary text on page", foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: "light", label: "secondary text", foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "secondary text on subtle surface", foreground: LIGHT_TOKENS.textSecondary, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "light", label: "tertiary metadata on page", foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.bg, minimum: 4.5 },
  { theme: "light", label: "tertiary metadata", foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "tertiary metadata on subtle surface", foreground: LIGHT_TOKENS.textTertiary, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "light", label: "primary action", foreground: "#ffffff", background: LIGHT_TOKENS.action, minimum: 4.5 },
  { theme: "light", label: "primary action hover", foreground: "#ffffff", background: LIGHT_TOKENS.actionHover, minimum: 4.5 },
  { theme: "light", label: "accent tag", foreground: LIGHT_TOKENS.accentText, background: LIGHT_TOKENS.accentSoft, minimum: 4.5 },
  { theme: "light", label: "accent text on surface", foreground: LIGHT_TOKENS.accentText, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "success", foreground: LIGHT_TOKENS.success, background: LIGHT_TOKENS.successBg, minimum: 4.5 },
  { theme: "light", label: "success on surface", foreground: LIGHT_TOKENS.success, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "warning", foreground: LIGHT_TOKENS.warning, background: LIGHT_TOKENS.warningBg, minimum: 4.5 },
  { theme: "light", label: "warning on surface", foreground: LIGHT_TOKENS.warning, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "danger", foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.dangerBg, minimum: 4.5 },
  { theme: "light", label: "danger on surface", foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.surface, minimum: 4.5 },
  { theme: "light", label: "danger on subtle surface", foreground: LIGHT_TOKENS.danger, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "light", label: "information", foreground: LIGHT_TOKENS.info, background: LIGHT_TOKENS.infoBg, minimum: 4.5 },
  { theme: "light", label: "information on subtle surface", foreground: LIGHT_TOKENS.info, background: LIGHT_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "light", label: "neutral", foreground: LIGHT_TOKENS.neutral, background: LIGHT_TOKENS.neutralBg, minimum: 4.5 },
  { theme: "light", label: "disabled control", foreground: LIGHT_TOKENS.disabledText, background: LIGHT_TOKENS.disabledBg, minimum: 4.5 },
  { theme: "light", label: "control boundary on page", foreground: LIGHT_TOKENS.controlBorder, background: LIGHT_TOKENS.bg, minimum: 3 },
  { theme: "light", label: "control boundary on surface", foreground: LIGHT_TOKENS.controlBorder, background: LIGHT_TOKENS.surface, minimum: 3 },
  { theme: "light", label: "focus indicator", foreground: LIGHT_TOKENS.focus, background: LIGHT_TOKENS.bg, minimum: 3 },
  { theme: "dark", label: "primary text on page", foreground: DARK_TOKENS.text, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: "dark", label: "primary text on surface", foreground: DARK_TOKENS.text, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "primary text on subtle surface", foreground: DARK_TOKENS.text, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "dark", label: "secondary text on page", foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: "dark", label: "secondary text", foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "secondary text on subtle surface", foreground: DARK_TOKENS.textSecondary, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "dark", label: "tertiary metadata on page", foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.bg, minimum: 4.5 },
  { theme: "dark", label: "tertiary metadata", foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "tertiary metadata on subtle surface", foreground: DARK_TOKENS.textTertiary, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "dark", label: "primary action", foreground: "#ffffff", background: DARK_TOKENS.action, minimum: 4.5 },
  { theme: "dark", label: "primary action hover", foreground: "#ffffff", background: DARK_TOKENS.actionHover, minimum: 4.5 },
  { theme: "dark", label: "accent tag", foreground: DARK_TOKENS.accentText, background: DARK_TOKENS.accentSoft, minimum: 4.5 },
  { theme: "dark", label: "accent text on surface", foreground: DARK_TOKENS.accentText, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "success", foreground: DARK_TOKENS.success, background: DARK_TOKENS.successBg, minimum: 4.5 },
  { theme: "dark", label: "success on surface", foreground: DARK_TOKENS.success, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "warning", foreground: DARK_TOKENS.warning, background: DARK_TOKENS.warningBg, minimum: 4.5 },
  { theme: "dark", label: "warning on surface", foreground: DARK_TOKENS.warning, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "danger", foreground: DARK_TOKENS.danger, background: DARK_TOKENS.dangerBg, minimum: 4.5 },
  { theme: "dark", label: "danger on surface", foreground: DARK_TOKENS.danger, background: DARK_TOKENS.surface, minimum: 4.5 },
  { theme: "dark", label: "danger on subtle surface", foreground: DARK_TOKENS.danger, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "dark", label: "information", foreground: DARK_TOKENS.info, background: DARK_TOKENS.infoBg, minimum: 4.5 },
  { theme: "dark", label: "information on subtle surface", foreground: DARK_TOKENS.info, background: DARK_TOKENS.surfaceSubtle, minimum: 4.5 },
  { theme: "dark", label: "neutral", foreground: DARK_TOKENS.neutral, background: DARK_TOKENS.neutralBg, minimum: 4.5 },
  { theme: "dark", label: "disabled control", foreground: DARK_TOKENS.disabledText, background: DARK_TOKENS.disabledBg, minimum: 4.5 },
  { theme: "dark", label: "control boundary on page", foreground: DARK_TOKENS.controlBorder, background: DARK_TOKENS.bg, minimum: 3 },
  { theme: "dark", label: "control boundary on surface", foreground: DARK_TOKENS.controlBorder, background: DARK_TOKENS.surface, minimum: 3 },
  { theme: "dark", label: "focus indicator", foreground: DARK_TOKENS.focus, background: DARK_TOKENS.bg, minimum: 3 }
]);
var DOCKYARD_TEST = Object.freeze({
  palettes: { light: LIGHT_TOKENS, dark: DARK_TOKENS },
  contrastPairs: CONTRAST_PAIRS
});

// hermes_dockyard_plugin/desktop/src/styles/dockyard-css.js
var DOCKYARD_CSS = `
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
  /* Narrow screens: the priority reason is secondary audit metadata \u2014 it
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
.dockyard-root .dockyard-approval-comments { display: grid; gap: 9px; margin-top: 14px; padding-top: 13px; border-top: 1px solid var(--dy-border); }
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
  .dockyard-root .dockyard-approval-top { grid-template-columns: 38px minmax(0, 1fr); }
  .dockyard-root .dockyard-approval-top > .dockyard-status-tag { grid-column: 2; }
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
/* Approved design: single-line toolbar \u2014 search and every control on one
   row; the filter row folds into the same line at desktop width. */
.dockyard-root [data-backlog-board] .cm-search { max-width: 440px; background: var(--dy-surface); }
/* LANE-TOOLBAR: backlog toolbar \u2014 one line at desktop width, wraps (never
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
+/* Approved dark reference: breadcrumb, iconed fields, status dots, X clears,
+   full-width activity timeline. */
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
+/* Approved import design: summary cards, warnings toggle, per-row badges,
+   split-pane preview with parsed values + will-import-as. */
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
.dockyard-root .dockyard-detail-modal > .dockyard-modal-head > button::after { content: '\xD7'; font-size: 24px; font-weight: 400; line-height: 1; }
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
.dockyard-root .dockyard-detail-modal .dockyard-detail-activity-head h3::before { content: '\u25F7'; margin-right: 7px; color: var(--dy-accent-text); }
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
`;

// hermes_dockyard_plugin/desktop/src/styles/workflow-css.js
var WORKFLOW_LIBRARY_CSS = `
.dockyard-wf-entry { display: flex; align-items: center; gap: 12px; margin: 0 0 12px; }
.dockyard-wf-entry > span { color: var(--dy-text-secondary, #515968); font-size: 12px; }
.dockyard-wf-library-toolbar { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; flex-wrap: wrap; }
.dockyard-wf-library-scope { display: flex; gap: 6px; }
.dockyard-wf-library-toolbar input { flex: 1 1 220px; min-width: 180px; padding: 7px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #ffffff); color: inherit; }
.dockyard-wf-library-create { display: flex; align-items: flex-end; gap: 12px; margin: 0 0 16px; padding: 12px; border: 1px solid var(--dy-border, #87909d); border-radius: 8px; flex-wrap: wrap; }
.dockyard-wf-library-create label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.dockyard-wf-library-create input { padding: 7px 10px; border: 1px solid var(--dy-border, #87909d); border-radius: 6px; background: var(--dy-surface, #ffffff); color: inherit; min-width: 200px; }
.dockyard-wf-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.dockyard-wf-library-grid article header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dockyard-wf-library-grid article h3 { margin: 0; font-size: 15px; }
.dockyard-wf-library-grid article .dockyard-meta { margin: 6px 0 0; font-size: 12px; }
.dockyard-wf-library-grid article .dockyard-form-actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.dockyard-wf-enablement { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--dy-border, #87909d); }
.dockyard-wf-enablement .dockyard-wf-enablement-label { flex: 1 1 140px; min-width: 0; overflow-wrap: anywhere; }
.dockyard-wf-enablement .dockyard-switch { position: relative; display: inline-flex; width: 40px; height: 22px; flex: none; }
.dockyard-wf-enablement .dockyard-switch input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dockyard-wf-enablement .dockyard-switch .dockyard-switch-track { position: absolute; inset: 0; border-radius: 11px; background: var(--dy-border, #87909d); transition: background 120ms ease; pointer-events: none; }
.dockyard-wf-enablement .dockyard-switch .dockyard-switch-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 9px; background: #ffffff; transition: transform 120ms ease; pointer-events: none; }
.dockyard-wf-enablement .dockyard-switch input:checked ~ .dockyard-switch-track { background: var(--dy-accent, #3654c7); }
.dockyard-wf-enablement .dockyard-switch input:checked ~ .dockyard-switch-thumb { transform: translateX(18px); }
.dockyard-wf-enablement .dockyard-switch input:focus-visible ~ .dockyard-switch-track { outline: 2px solid var(--dy-focus, #3654c7); outline-offset: 2px; }
`;

// hermes_dockyard_plugin/desktop/src/styles/roadmap-css.js
var ROADMAP_CSS = `
.dy-rm-page { display: grid; gap: 14px; }
/* Filter toolbar (signed v4 order: project, search, attention, Reset). Every
   control is the same box: 38px tall, control border, 6px radius, 13px text. */
.dy-rm-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dy-rm-toolbar .dy-rm-control { position: relative; display: flex; align-items: center; gap: 8px; height: 38px; margin: 0; padding: 0 12px; border: 1px solid var(--dy-control-border); border-radius: 6px; background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 13px; line-height: 1; white-space: nowrap; }
.dy-rm-toolbar .dy-rm-control svg { flex: none; width: 15px; height: 15px; color: var(--dy-text-3); pointer-events: none; }
.dy-rm-toolbar .dy-rm-control:has(:focus-visible) { outline: 3px solid var(--dy-focus); outline-offset: 2px; }
.dy-rm-toolbar .dy-rm-control select,
.dy-rm-toolbar .dy-rm-control input[type="search"] { min-width: 0; height: 100%; margin: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--dy-text); font: inherit; }
.dy-rm-toolbar .dy-rm-scope { flex: none; padding-right: 0; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope-label { font-size: 12px; font-weight: 650; }
.dy-rm-toolbar .dy-rm-scope select { appearance: none; -webkit-appearance: none; width: 168px; padding-right: 34px; font-weight: 600; text-overflow: ellipsis; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope svg { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); }
.dy-rm-toolbar .dy-rm-search { flex: 1 1 260px; min-width: 200px; cursor: text; }
.dy-rm-toolbar .dy-rm-search input[type="search"] { flex: 1 1 auto; }
.dy-rm-toolbar .dy-rm-search input::placeholder { color: var(--dy-text-3); opacity: 1; }
.dy-rm-toolbar .dy-rm-attention { font-weight: 600; cursor: pointer; }
.dy-rm-toolbar .dy-rm-attention input { flex: none; width: 15px; height: 15px; margin: 0; outline: none; accent-color: var(--dy-action); cursor: pointer; }
.dy-rm-toolbar .dy-rm-reset { justify-content: center; font-weight: 650; cursor: pointer; }
.dy-rm-toolbar .dy-rm-scope:hover,
.dy-rm-toolbar .dy-rm-attention:hover,
.dy-rm-toolbar .dy-rm-reset:hover { background: var(--dy-surface-subtle); }
.dy-rm-toolbar .dy-rm-attention:has(input:checked) { border-color: var(--dy-warning); background: var(--dy-warning-bg); color: var(--dy-text); }
.dy-rm-tree { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); overflow: hidden; }
.dy-rm-tree-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); font-size: 12px; }
.dy-rm-tree-head span { color: var(--dy-text-3); font-size: 10px; }
.dy-rm-row { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 6px 11px; border-bottom: 1px solid var(--dy-border); background: transparent; border-left: 0; border-right: 0; border-top: 0; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.dy-rm-row:last-child { border-bottom: 0; }
.dy-rm-row:hover { background: var(--dy-accent-soft); }
.dy-rm-row[data-selected="true"] { background: var(--dy-accent-soft); box-shadow: inset 3px 0 0 var(--dy-action); }
.dy-rm-row.depth-1 { padding-left: 34px; }
.dy-rm-row.depth-2 { padding-left: 57px; }
.dy-rm-row.depth-3 { padding-left: 80px; }
.dy-rm-disclosure { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; border: 1px solid var(--dy-border); border-radius: 4px; background: var(--dy-surface); color: var(--dy-text-2); padding: 0; font-size: 12px; line-height: 1; }
.dy-rm-disclosure.blank { visibility: hidden; }
.dy-rm-icon { flex: 0 0 22px; display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--dy-border); border-radius: 5px; background: var(--dy-surface); color: var(--dy-text-2); font-size: 9px; font-weight: 800; }
.dy-rm-icon.project { border-radius: 50%; border-color: var(--dy-action); background: var(--dy-action); color: #fff; }
.dy-rm-icon.initiative { border-radius: 50%; }
.dy-rm-icon.work { border-style: dashed; }
.dy-rm-copy { min-width: 0; flex: 1; }
.dy-rm-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.dy-rm-copy small { display: block; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dy-text-2); font-size: 10px; }
.dy-rm-chips { display: flex; align-items: center; gap: 4px; flex: none; flex-wrap: wrap; justify-content: flex-end; }
.dy-rm-chip { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--dy-border); border-radius: 999px; padding: 2px 7px; font-size: 10px; font-weight: 700; color: var(--dy-text-2); background: var(--dy-surface-subtle); white-space: nowrap; }
.dy-rm-chip.blocked { color: var(--dy-danger); border-color: var(--dy-danger); }
.dy-rm-chip.attention { color: var(--dy-warning); background: var(--dy-warning-bg); border-color: var(--dy-warning); }
.dy-rm-chip.passed { color: var(--dy-success); border-color: var(--dy-success); }
.dy-rm-chip.failed { color: var(--dy-danger); border-color: var(--dy-danger); }
.dy-rm-chip.overdue { color: var(--dy-danger); background: var(--dy-danger-bg); border-color: var(--dy-danger); }
.dy-rm-row-actions { display: flex; align-items: center; gap: 4px; flex: none; }
.dy-rm-row:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: -2px; }
.dy-rm-copied { display: block; margin-top: 2px; color: var(--dy-text-2); font-size: 10px; font-weight: 400; }
.dy-rm-confirm { margin: 0; font-size: 12px; }
.dy-rm-confirm + .dy-rm-confirm { color: var(--dy-text-2); font-size: 11px; }
.dy-rm-blank { padding: 26px 15px; color: var(--dy-text-2); text-align: center; font-size: 12px; }
/* Drawer */
.dy-rm-shell { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 12px; align-items: start; }
.dy-rm-shell.full { grid-template-columns: minmax(0, 1fr); }
.dy-rm-drawer { border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); overflow: hidden; }
.dy-rm-drawer-head { padding: 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-rm-drawer-head h3 { margin: 4px 0 0; font-size: 14px; }
.dy-rm-drawer-head p { margin: 3px 0 0; color: var(--dy-text-2); font-size: 10px; }
.dy-rm-drawer-body { padding: 12px; display: grid; gap: 10px; }
.dy-rm-drawer-body > p { margin: 0; color: var(--dy-text-2); font-size: 11px; }
.dy-rm-facts { margin: 0; padding: 0; list-style: none; }
.dy-rm-facts li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-top: 1px solid var(--dy-border); font-size: 11px; }
.dy-rm-facts li span:first-child { color: var(--dy-text-2); }
.dy-rm-facts li span:last-child { font-weight: 700; text-align: right; overflow-wrap: anywhere; }
.dy-rm-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
/* Link picker dialog */
.dy-rm-modal-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 16px; background: rgba(10, 15, 25, .38); }
.dy-rm-modal { width: min(460px, 100%); max-height: min(560px, 90vh); overflow: auto; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); box-shadow: 0 18px 50px rgba(0, 0, 0, .26); }
.dy-rm-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px; border-bottom: 1px solid var(--dy-border); }
.dy-rm-modal-head h3 { margin: 3px 0 0; font-size: 15px; }
.dy-rm-modal-head p { margin: 2px 0 0; color: var(--dy-text-2); font-size: 11px; }
.dy-rm-modal-body { padding: 12px 14px; display: grid; gap: 10px; }
.dy-rm-modal-body label { display: grid; gap: 4px; font-size: 11px; color: var(--dy-text-2); }
.dy-rm-modal-body select { min-height: 34px; padding: 6px 8px; border: 1px solid var(--dy-control-border); border-radius: 5px; background: var(--dy-surface); color: inherit; }
.dy-rm-modal-error { margin: 0; color: var(--dy-danger); font-size: 11px; min-height: 14px; }
.dy-rm-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 0 14px 14px; }
/* Milestone items (loaded on open) */
.dy-rm-items { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 5px; }
.dy-rm-items li { display: flex; align-items: center; gap: 7px; padding: 6px 8px; border: 1px solid var(--dy-border); border-radius: 5px; font-size: 11px; }
.dy-rm-items li strong { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.dy-rm-items li small { color: var(--dy-text-2); }
@media (max-width: 800px) {
  .dy-rm-shell { grid-template-columns: minmax(0, 1fr); }
  .dy-rm-drawer { position: static; }
  .dy-rm-row.depth-1 { padding-left: 27px; }
  .dy-rm-row.depth-2 { padding-left: 43px; }
  .dy-rm-row.depth-3 { padding-left: 59px; }
  .dy-rm-chips { display: none; }
  /* Two rows on the same edges: project + search, then attention + Reset
     (Reset in the last column, so it ends under the search box). */
  .dy-rm-toolbar { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; }
  .dy-rm-toolbar .dy-rm-search { grid-column: 2 / -1; min-width: 0; }
  .dy-rm-toolbar .dy-rm-reset { grid-column: -2; }
}
@media (max-width: 520px) {
  /* Phone: project and search full width, then attention beside Reset.
     Reset keeps a real touch width so the last row is not lopsided. */
  .dy-rm-toolbar { grid-template-columns: minmax(0, 1fr) auto; }
  .dy-rm-toolbar .dy-rm-scope,
  .dy-rm-toolbar .dy-rm-search { grid-column: 1 / -1; }
  .dy-rm-toolbar .dy-rm-scope select { flex: 1 1 auto; width: auto; }
  .dy-rm-toolbar .dy-rm-reset { min-width: 96px; }
}
`;

// hermes_dockyard_plugin/desktop/src/styles/settings-css.js
var SETTINGS_CSS = `
/* C8 Settings option A (signed 16/09): three uppercase category labels over the
   existing Project configuration grid. The labels are decorative group headings
   for the existing fields; the fields themselves are unchanged. */
.dockyard-root .dockyard-settings-category { display: grid; gap: 14px; grid-column: 1 / -1; }
.dockyard-root .dockyard-settings-category-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 0;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--dy-border);
  color: var(--dy-text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.dockyard-root .dockyard-settings-category-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--dy-border);
}
`;

// hermes_dockyard_plugin/desktop/workflow-canvas-css.js
var workflow_canvas_css_default = `
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
.dy-wf-scope .dy-wf-passport > :last-child { margin-bottom: 16px; }
.dy-wf-scope .dy-wf-empty { fill: var(--dy-wf-card-dim); font: 13px system-ui, sans-serif; }
/* Lane bands (v6 composition): axis labels, never controls. The "exception"
   band carries branches/loops or a blocked node. (No backticks in here.) */
.dy-wf-scope .dy-wf-lane { fill: rgba(140, 170, 220, .035); stroke: rgba(140, 180, 255, .09); stroke-width: 1; }
.dy-wf-scope .dy-wf-lane.exception { fill: rgba(255, 123, 114, .05); }
.dy-wf-scope .dy-wf-lane-label { fill: #6f86a8; font: 600 7px system-ui, sans-serif; letter-spacing: .9px; text-transform: uppercase; pointer-events: none; }

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
/* B9: the stored rect drives the rendered box \u2014 the inline height style set by
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
/* Frames are decorative group labels (v6's .pframe) \u2014 never controls. */
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
`;

// hermes_dockyard_plugin/desktop/src/runtime/context.js
var _rest = null;
var _os = null;
var _toastId = 0;
var TOAST_EVENT = "dockyard:toast";
function bindContext(ctx) {
  _rest = ctx.rest;
  _os = ctx.os;
}
function mutationMessage(path, result) {
  if (path === "/onboard") return `Project ${result?.project_id || "created"} onboarded`;
  if (path.endsWith("/approve")) return "Initiative approved";
  if (path.endsWith("/reject")) return "Initiative rejected";
  if (path.endsWith("/ack")) return "Notification cleared";
  if (path.endsWith("/rerank")) return "Backlog priority updated";
  if (path.endsWith("/views")) return "Workflow view saved";
  if (path.endsWith("/reports")) return "Report generated";
  if (path.endsWith("/settings")) return "Project configuration saved";
  if (path.endsWith("/freeze")) return "Project frozen";
  if (path.endsWith("/resume")) return "Project resumed";
  if (path.endsWith("/transition")) return "Work item updated";
  return "Change saved";
}
function emitToast(tone, message) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new window.CustomEvent(TOAST_EVENT, {
    detail: { id: ++_toastId, tone, message }
  }));
}
async function api(path, init) {
  const method = init?.method ?? "GET";
  try {
    const result = await _rest(path, { method, body: init?.body });
    if (method !== "GET") emitToast("success", mutationMessage(path, result));
    return result;
  } catch (error) {
    const raw = String(error?.message ?? error).slice(0, 240);
    const message = /^403:\s*\[object Object\]$/.test(raw) && /^\/projects\/[^/]+\/workflows\/[^/]+\/archive$/.test(path) ? "403 Forbidden: archive permission (project_archive) is required or this action is denied. No change was made." : /(?:error\s*)?500|internal service error/i.test(raw) ? "Dockyard could not confirm the request." : raw;
    if (method !== "GET" && !init?.suppressErrorToast) emitToast("danger", message);
    const failure = new Error(message);
    failure.cause = error;
    throw failure;
  }
}
function useStylesheet(datasetKey, datasetValue, css) {
  useEffect(() => {
    const selector = `style[data-${datasetKey}="true"]`;
    const existing = document.querySelector(selector);
    if (existing) return void 0;
    const style = document.createElement("style");
    style.dataset[datasetValue] = "true";
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}
function useDockyardStyles() {
  useStylesheet("dockyard-style", "dockyardStyle", DOCKYARD_CSS);
  useStylesheet("dy-wf-library-stylesheet", "dyWfLibraryStylesheet", WORKFLOW_LIBRARY_CSS);
  useStylesheet("dy-roadmap-stylesheet", "dyRoadmapStylesheet", ROADMAP_CSS);
  useStylesheet("dy-settings-stylesheet", "dySettingsStylesheet", SETTINGS_CSS);
  useStylesheet("dy-wf-stylesheet", "dyWfStylesheet", workflow_canvas_css_default);
}

// hermes_dockyard_plugin/desktop/lucide-icons.js
var LUCIDE_ICON_NODES = {
  "activity": [
    [
      "path",
      {
        "d": "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"
      }
    ]
  ],
  "arrow-down-wide-narrow": [
    [
      "path",
      {
        "d": "m3 16 4 4 4-4"
      }
    ],
    [
      "path",
      {
        "d": "M7 20V4"
      }
    ],
    [
      "path",
      {
        "d": "M11 4h10"
      }
    ],
    [
      "path",
      {
        "d": "M11 8h7"
      }
    ],
    [
      "path",
      {
        "d": "M11 12h4"
      }
    ]
  ],
  "arrow-up-down": [
    [
      "path",
      {
        "d": "m21 16-4 4-4-4"
      }
    ],
    [
      "path",
      {
        "d": "M17 20V4"
      }
    ],
    [
      "path",
      {
        "d": "m3 8 4-4 4 4"
      }
    ],
    [
      "path",
      {
        "d": "M7 4v16"
      }
    ]
  ],
  "arrow-up-narrow-wide": [
    [
      "path",
      {
        "d": "m3 8 4-4 4 4"
      }
    ],
    [
      "path",
      {
        "d": "M7 4v16"
      }
    ],
    [
      "path",
      {
        "d": "M11 12h4"
      }
    ],
    [
      "path",
      {
        "d": "M11 16h7"
      }
    ],
    [
      "path",
      {
        "d": "M11 20h10"
      }
    ]
  ],
  "arrow-up-right": [
    [
      "path",
      {
        "d": "M7 7h10v10"
      }
    ],
    [
      "path",
      {
        "d": "M7 17 17 7"
      }
    ]
  ],
  "bell": [
    [
      "path",
      {
        "d": "M10.268 21a2 2 0 0 0 3.464 0"
      }
    ],
    [
      "path",
      {
        "d": "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
      }
    ]
  ],
  "bug": [
    [
      "path",
      {
        "d": "M12 20v-9"
      }
    ],
    [
      "path",
      {
        "d": "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z"
      }
    ],
    [
      "path",
      {
        "d": "M14.12 3.88 16 2"
      }
    ],
    [
      "path",
      {
        "d": "M21 21a4 4 0 0 0-3.81-4"
      }
    ],
    [
      "path",
      {
        "d": "M21 5a4 4 0 0 1-3.55 3.97"
      }
    ],
    [
      "path",
      {
        "d": "M22 13h-4"
      }
    ],
    [
      "path",
      {
        "d": "M3 21a4 4 0 0 1 3.81-4"
      }
    ],
    [
      "path",
      {
        "d": "M3 5a4 4 0 0 0 3.55 3.97"
      }
    ],
    [
      "path",
      {
        "d": "M6 13H2"
      }
    ],
    [
      "path",
      {
        "d": "m8 2 1.88 1.88"
      }
    ],
    [
      "path",
      {
        "d": "M9 7.13V6a3 3 0 1 1 6 0v1.13"
      }
    ]
  ],
  "calendar": [
    [
      "path",
      {
        "d": "M8 2v3"
      }
    ],
    [
      "path",
      {
        "d": "M16 2v3"
      }
    ],
    [
      "rect",
      {
        "x": "3",
        "y": "3",
        "width": "18",
        "height": "18",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "d": "M3 9h18"
      }
    ]
  ],
  "check": [
    [
      "path",
      {
        "d": "M20 6 9 17l-5-5"
      }
    ]
  ],
  "chevron-down": [
    [
      "path",
      {
        "d": "m6 9 6 6 6-6"
      }
    ]
  ],
  "chevron-right": [
    [
      "path",
      {
        "d": "m9 18 6-6-6-6"
      }
    ]
  ],
  "circle-check": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "10"
      }
    ],
    [
      "path",
      {
        "d": "m16 9-5.5 5.5L8 12"
      }
    ]
  ],
  "clock-3": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "10"
      }
    ],
    [
      "path",
      {
        "d": "M12 6v6h4"
      }
    ]
  ],
  "copy": [
    [
      "rect",
      {
        "width": "14",
        "height": "14",
        "x": "8",
        "y": "8",
        "rx": "2",
        "ry": "2"
      }
    ],
    [
      "path",
      {
        "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
      }
    ]
  ],
  "copy-plus": [
    [
      "line",
      {
        "x1": "15",
        "x2": "15",
        "y1": "12",
        "y2": "18"
      }
    ],
    [
      "line",
      {
        "x1": "12",
        "x2": "18",
        "y1": "15",
        "y2": "15"
      }
    ],
    [
      "rect",
      {
        "width": "14",
        "height": "14",
        "x": "8",
        "y": "8",
        "rx": "2",
        "ry": "2"
      }
    ],
    [
      "path",
      {
        "d": "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
      }
    ]
  ],
  "download": [
    [
      "path",
      {
        "d": "M12 15V3"
      }
    ],
    [
      "path",
      {
        "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      }
    ],
    [
      "path",
      {
        "d": "m7 10 5 5 5-5"
      }
    ]
  ],
  "eye": [
    [
      "path",
      {
        "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "3"
      }
    ]
  ],
  "file-text": [
    [
      "path",
      {
        "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
      }
    ],
    [
      "path",
      {
        "d": "M14 2v5a1 1 0 0 0 1 1h5"
      }
    ],
    [
      "path",
      {
        "d": "M10 9H8"
      }
    ],
    [
      "path",
      {
        "d": "M16 13H8"
      }
    ],
    [
      "path",
      {
        "d": "M16 17H8"
      }
    ]
  ],
  "filter": [
    [
      "path",
      {
        "d": "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"
      }
    ]
  ],
  "flag": [
    [
      "path",
      {
        "d": "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
      }
    ]
  ],
  "folder-kanban": [
    [
      "path",
      {
        "d": "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
      }
    ],
    [
      "path",
      {
        "d": "M8 10v4"
      }
    ],
    [
      "path",
      {
        "d": "M12 10v2"
      }
    ],
    [
      "path",
      {
        "d": "M16 10v6"
      }
    ]
  ],
  "folder-open": [
    [
      "path",
      {
        "d": "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
      }
    ]
  ],
  "folders": [
    [
      "path",
      {
        "d": "M20 5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2.5a1.5 1.5 0 0 1 1.2.6l.6.8a1.5 1.5 0 0 0 1.2.6z"
      }
    ],
    [
      "path",
      {
        "d": "M3 8.268a2 2 0 0 0-1 1.738V19a2 2 0 0 0 2 2h11a2 2 0 0 0 1.732-1"
      }
    ]
  ],
  "history": [
    [
      "path",
      {
        "d": "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
      }
    ],
    [
      "path",
      {
        "d": "M3 3v5h5"
      }
    ],
    [
      "path",
      {
        "d": "M12 7v5l4 2"
      }
    ]
  ],
  "image": [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2",
        "ry": "2"
      }
    ],
    [
      "circle",
      {
        "cx": "9",
        "cy": "9",
        "r": "2"
      }
    ],
    [
      "path",
      {
        "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
      }
    ]
  ],
  "layers": [
    [
      "path",
      {
        "d": "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"
      }
    ],
    [
      "path",
      {
        "d": "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"
      }
    ],
    [
      "path",
      {
        "d": "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"
      }
    ]
  ],
  "layout-dashboard": [
    [
      "rect",
      {
        "width": "7",
        "height": "9",
        "x": "3",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "5",
        "x": "14",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "9",
        "x": "14",
        "y": "12",
        "rx": "1"
      }
    ],
    [
      "rect",
      {
        "width": "7",
        "height": "5",
        "x": "3",
        "y": "16",
        "rx": "1"
      }
    ]
  ],
  "lightbulb": [
    [
      "path",
      {
        "d": "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
      }
    ],
    [
      "path",
      {
        "d": "M9 18h6"
      }
    ],
    [
      "path",
      {
        "d": "M10 22h4"
      }
    ]
  ],
  "link": [
    [
      "path",
      {
        "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      }
    ],
    [
      "path",
      {
        "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      }
    ]
  ],
  "list-checks": [
    [
      "path",
      {
        "d": "M13 5h8"
      }
    ],
    [
      "path",
      {
        "d": "M13 12h8"
      }
    ],
    [
      "path",
      {
        "d": "M13 19h8"
      }
    ],
    [
      "path",
      {
        "d": "m3 17 2 2 4-4"
      }
    ],
    [
      "path",
      {
        "d": "m3 7 2 2 4-4"
      }
    ]
  ],
  "list-filter": [
    [
      "path",
      {
        "d": "M2 5h20"
      }
    ],
    [
      "path",
      {
        "d": "M6 12h12"
      }
    ],
    [
      "path",
      {
        "d": "M9 19h6"
      }
    ]
  ],
  "message-square": [
    [
      "path",
      {
        "d": "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
      }
    ]
  ],
  "notebook": [
    [
      "path",
      {
        "d": "M2 6h4"
      }
    ],
    [
      "path",
      {
        "d": "M2 10h4"
      }
    ],
    [
      "path",
      {
        "d": "M2 14h4"
      }
    ],
    [
      "path",
      {
        "d": "M2 18h4"
      }
    ],
    [
      "rect",
      {
        "width": "16",
        "height": "20",
        "x": "4",
        "y": "2",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "d": "M16 2v20"
      }
    ]
  ],
  "paperclip": [
    [
      "path",
      {
        "d": "m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"
      }
    ]
  ],
  "pencil": [
    [
      "path",
      {
        "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ],
    [
      "path",
      {
        "d": "m15 5 4 4"
      }
    ]
  ],
  "redo-2": [
    [
      "path",
      {
        "d": "m15 14 5-5-5-5"
      }
    ],
    [
      "path",
      {
        "d": "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13"
      }
    ]
  ],
  "rotate-cw": [
    [
      "path",
      {
        "d": "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
      }
    ],
    [
      "path",
      {
        "d": "M21 3v5h-5"
      }
    ]
  ],
  "scroll-text": [
    [
      "path",
      {
        "d": "M15 12h-5"
      }
    ],
    [
      "path",
      {
        "d": "M15 8h-5"
      }
    ],
    [
      "path",
      {
        "d": "M19 17V5a2 2 0 0 0-2-2H4"
      }
    ],
    [
      "path",
      {
        "d": "M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"
      }
    ]
  ],
  "search": [
    [
      "path",
      {
        "d": "m21 21-4.34-4.34"
      }
    ],
    [
      "circle",
      {
        "cx": "11",
        "cy": "11",
        "r": "8"
      }
    ]
  ],
  "shield-alert": [
    [
      "path",
      {
        "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      }
    ],
    [
      "path",
      {
        "d": "M12 8v4"
      }
    ],
    [
      "path",
      {
        "d": "M12 16h.01"
      }
    ]
  ],
  "square-check-big": [
    [
      "path",
      {
        "d": "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"
      }
    ],
    [
      "path",
      {
        "d": "m9 11 3 3L22 4"
      }
    ]
  ],
  "square-dashed": [
    [
      "path",
      {
        "d": "M5 3a2 2 0 0 0-2 2"
      }
    ],
    [
      "path",
      {
        "d": "M19 3a2 2 0 0 1 2 2"
      }
    ],
    [
      "path",
      {
        "d": "M21 19a2 2 0 0 1-2 2"
      }
    ],
    [
      "path",
      {
        "d": "M5 21a2 2 0 0 1-2-2"
      }
    ],
    [
      "path",
      {
        "d": "M9 3h1"
      }
    ],
    [
      "path",
      {
        "d": "M9 21h1"
      }
    ],
    [
      "path",
      {
        "d": "M14 3h1"
      }
    ],
    [
      "path",
      {
        "d": "M14 21h1"
      }
    ],
    [
      "path",
      {
        "d": "M3 9v1"
      }
    ],
    [
      "path",
      {
        "d": "M21 9v1"
      }
    ],
    [
      "path",
      {
        "d": "M3 14v1"
      }
    ],
    [
      "path",
      {
        "d": "M21 14v1"
      }
    ]
  ],
  "sticky-note": [
    [
      "path",
      {
        "d": "M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"
      }
    ],
    [
      "path",
      {
        "d": "M15 3v5a1 1 0 0 0 1 1h5"
      }
    ]
  ],
  "target": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "10"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "6"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "2"
      }
    ]
  ],
  "triangle-alert": [
    [
      "path",
      {
        "d": "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
      }
    ],
    [
      "path",
      {
        "d": "M12 9v4"
      }
    ],
    [
      "path",
      {
        "d": "M12 17h.01"
      }
    ]
  ],
  "undo-2": [
    [
      "path",
      {
        "d": "M9 14 4 9l5-5"
      }
    ],
    [
      "path",
      {
        "d": "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"
      }
    ]
  ],
  "upload": [
    [
      "path",
      {
        "d": "M12 3v12"
      }
    ],
    [
      "path",
      {
        "d": "m17 8-5-5-5 5"
      }
    ],
    [
      "path",
      {
        "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      }
    ]
  ],
  "user": [
    [
      "path",
      {
        "d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "7",
        "r": "4"
      }
    ]
  ],
  "workflow": [
    [
      "rect",
      {
        "width": "8",
        "height": "8",
        "x": "3",
        "y": "3",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "d": "M7 11v4a2 2 0 0 0 2 2h4"
      }
    ],
    [
      "rect",
      {
        "width": "8",
        "height": "8",
        "x": "13",
        "y": "13",
        "rx": "2"
      }
    ]
  ],
  "x": [
    [
      "path",
      {
        "d": "M18 6 6 18"
      }
    ],
    [
      "path",
      {
        "d": "m6 6 12 12"
      }
    ]
  ],
  "zap": [
    [
      "path",
      {
        "d": "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"
      }
    ]
  ],
  "archive": [
    [
      "rect",
      {
        "width": "20",
        "height": "5",
        "x": "2",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "path",
      {
        "d": "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"
      }
    ],
    [
      "path",
      {
        "d": "M10 12h4"
      }
    ]
  ],
  "archive-restore": [
    [
      "rect",
      {
        "width": "20",
        "height": "5",
        "x": "2",
        "y": "3",
        "rx": "1"
      }
    ],
    [
      "path",
      {
        "d": "M4 8v11a2 2 0 0 0 2 2h2"
      }
    ],
    [
      "path",
      {
        "d": "M20 8v11a2 2 0 0 1-2 2h-2"
      }
    ],
    [
      "path",
      {
        "d": "m9 15 3-3 3 3"
      }
    ],
    [
      "path",
      {
        "d": "M12 12v9"
      }
    ]
  ],
  "bot": [
    [
      "path",
      {
        "d": "M12 8V4H8"
      }
    ],
    [
      "rect",
      {
        "width": "16",
        "height": "12",
        "x": "4",
        "y": "8",
        "rx": "2"
      }
    ],
    [
      "path",
      {
        "d": "M2 14h2"
      }
    ],
    [
      "path",
      {
        "d": "M20 14h2"
      }
    ],
    [
      "path",
      {
        "d": "M15 13v2"
      }
    ],
    [
      "path",
      {
        "d": "M9 13v2"
      }
    ]
  ],
  "chevron-up": [
    [
      "path",
      {
        "d": "m18 15-6-6-6 6"
      }
    ]
  ],
  "circle-help": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "10"
      }
    ],
    [
      "path",
      {
        "d": "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
      }
    ],
    [
      "path",
      {
        "d": "M12 17h.01"
      }
    ]
  ],
  "list": [
    [
      "path",
      {
        "d": "M3 5h.01"
      }
    ],
    [
      "path",
      {
        "d": "M3 12h.01"
      }
    ],
    [
      "path",
      {
        "d": "M3 19h.01"
      }
    ],
    [
      "path",
      {
        "d": "M8 5h13"
      }
    ],
    [
      "path",
      {
        "d": "M8 12h13"
      }
    ],
    [
      "path",
      {
        "d": "M8 19h13"
      }
    ]
  ],
  "list-ordered": [
    [
      "path",
      {
        "d": "M11 5h10"
      }
    ],
    [
      "path",
      {
        "d": "M11 12h10"
      }
    ],
    [
      "path",
      {
        "d": "M11 19h10"
      }
    ],
    [
      "path",
      {
        "d": "M4 4h1v5"
      }
    ],
    [
      "path",
      {
        "d": "M4 9h2"
      }
    ],
    [
      "path",
      {
        "d": "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02"
      }
    ]
  ],
  "align-left": [
    [
      "path",
      {
        "d": "M21 5H3"
      }
    ],
    [
      "path",
      {
        "d": "M15 12H3"
      }
    ],
    [
      "path",
      {
        "d": "M17 19H3"
      }
    ]
  ],
  "align-center": [
    [
      "path",
      {
        "d": "M21 5H3"
      }
    ],
    [
      "path",
      {
        "d": "M17 12H7"
      }
    ],
    [
      "path",
      {
        "d": "M19 19H5"
      }
    ]
  ],
  "align-right": [
    [
      "path",
      {
        "d": "M21 5H3"
      }
    ],
    [
      "path",
      {
        "d": "M21 12H9"
      }
    ],
    [
      "path",
      {
        "d": "M21 19H7"
      }
    ]
  ],
  "align-justify": [
    [
      "path",
      {
        "d": "M3 5h18"
      }
    ],
    [
      "path",
      {
        "d": "M3 12h18"
      }
    ],
    [
      "path",
      {
        "d": "M3 19h18"
      }
    ]
  ],
  "remove-formatting": [
    [
      "path",
      {
        "d": "M4 7V4h16v3"
      }
    ],
    [
      "path",
      {
        "d": "M5 20h6"
      }
    ],
    [
      "path",
      {
        "d": "M13 4 8 20"
      }
    ],
    [
      "path",
      {
        "d": "m15 15 5 5"
      }
    ],
    [
      "path",
      {
        "d": "m20 15-5 5"
      }
    ]
  ],
  "chevrons-left": [
    [
      "path",
      {
        "d": "m11 17-5-5 5-5"
      }
    ],
    [
      "path",
      {
        "d": "m18 17-5-5 5-5"
      }
    ]
  ],
  "chevrons-right": [
    [
      "path",
      {
        "d": "m6 17 5-5-5-5"
      }
    ],
    [
      "path",
      {
        "d": "m13 17 5-5-5-5"
      }
    ]
  ],
  "hand": [
    [
      "path",
      {
        "d": "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"
      }
    ],
    [
      "path",
      {
        "d": "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"
      }
    ],
    [
      "path",
      {
        "d": "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"
      }
    ],
    [
      "path",
      {
        "d": "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
      }
    ]
  ],
  "grip-horizontal": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "9",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "19",
        "cy": "9",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "5",
        "cy": "9",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "12",
        "cy": "15",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "19",
        "cy": "15",
        "r": "1"
      }
    ],
    [
      "circle",
      {
        "cx": "5",
        "cy": "15",
        "r": "1"
      }
    ]
  ],
  "maximize-2": [
    [
      "path",
      {
        "d": "M15 3h6v6"
      }
    ],
    [
      "path",
      {
        "d": "m21 3-7 7"
      }
    ],
    [
      "path",
      {
        "d": "m3 21 7-7"
      }
    ],
    [
      "path",
      {
        "d": "M9 21H3v-6"
      }
    ]
  ],
  "minimize-2": [
    [
      "path",
      {
        "d": "m14 10 7-7"
      }
    ],
    [
      "path",
      {
        "d": "M20 10h-6V4"
      }
    ],
    [
      "path",
      {
        "d": "m3 21 7-7"
      }
    ],
    [
      "path",
      {
        "d": "M4 14h6v6"
      }
    ]
  ],
  "minus": [
    [
      "path",
      {
        "d": "M5 12h14"
      }
    ]
  ],
  "moon": [
    [
      "path",
      {
        "d": "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
      }
    ]
  ],
  "mouse-pointer-2": [
    [
      "path",
      {
        "d": "M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
      }
    ]
  ],
  "plus": [
    [
      "path",
      {
        "d": "M5 12h14"
      }
    ],
    [
      "path",
      {
        "d": "M12 5v14"
      }
    ]
  ],
  "refresh-cw": [
    [
      "path",
      {
        "d": "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
      }
    ],
    [
      "path",
      {
        "d": "M21 3v5h-5"
      }
    ],
    [
      "path",
      {
        "d": "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
      }
    ],
    [
      "path",
      {
        "d": "M8 16H3v5"
      }
    ]
  ],
  "save": [
    [
      "path",
      {
        "d": "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
      }
    ],
    [
      "path",
      {
        "d": "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
      }
    ],
    [
      "path",
      {
        "d": "M7 3v4a1 1 0 0 0 1 1h7"
      }
    ]
  ],
  "scan": [
    [
      "path",
      {
        "d": "M3 7V5a2 2 0 0 1 2-2h2"
      }
    ],
    [
      "path",
      {
        "d": "M17 3h2a2 2 0 0 1 2 2v2"
      }
    ],
    [
      "path",
      {
        "d": "M21 17v2a2 2 0 0 1-2 2h-2"
      }
    ],
    [
      "path",
      {
        "d": "M7 21H5a2 2 0 0 1-2-2v-2"
      }
    ]
  ],
  "send": [
    [
      "path",
      {
        "d": "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
      }
    ],
    [
      "path",
      {
        "d": "m21.854 2.147-10.94 10.939"
      }
    ]
  ],
  "sparkles": [
    [
      "path",
      {
        "d": "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
      }
    ],
    [
      "path",
      {
        "d": "M20 2v4"
      }
    ],
    [
      "path",
      {
        "d": "M22 4h-4"
      }
    ],
    [
      "circle",
      {
        "cx": "4",
        "cy": "20",
        "r": "2"
      }
    ]
  ],
  "spline": [
    [
      "circle",
      {
        "cx": "19",
        "cy": "5",
        "r": "2"
      }
    ],
    [
      "circle",
      {
        "cx": "5",
        "cy": "19",
        "r": "2"
      }
    ],
    [
      "path",
      {
        "d": "M5 17A12 12 0 0 1 17 5"
      }
    ]
  ],
  "square": [
    [
      "rect",
      {
        "width": "18",
        "height": "18",
        "x": "3",
        "y": "3",
        "rx": "2"
      }
    ]
  ],
  "square-pen": [
    [
      "path",
      {
        "d": "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      }
    ],
    [
      "path",
      {
        "d": "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
      }
    ]
  ],
  "sun": [
    [
      "circle",
      {
        "cx": "12",
        "cy": "12",
        "r": "4"
      }
    ],
    [
      "path",
      {
        "d": "M12 2v2"
      }
    ],
    [
      "path",
      {
        "d": "M12 20v2"
      }
    ],
    [
      "path",
      {
        "d": "m4.93 4.93 1.41 1.41"
      }
    ],
    [
      "path",
      {
        "d": "m17.66 17.66 1.41 1.41"
      }
    ],
    [
      "path",
      {
        "d": "M2 12h2"
      }
    ],
    [
      "path",
      {
        "d": "M20 12h2"
      }
    ],
    [
      "path",
      {
        "d": "m6.34 17.66-1.41 1.41"
      }
    ],
    [
      "path",
      {
        "d": "m19.07 4.93-1.41 1.41"
      }
    ]
  ],
  "trash-2": [
    [
      "path",
      {
        "d": "M10 11v6"
      }
    ],
    [
      "path",
      {
        "d": "M14 11v6"
      }
    ],
    [
      "path",
      {
        "d": "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
      }
    ],
    [
      "path",
      {
        "d": "M3 6h18"
      }
    ],
    [
      "path",
      {
        "d": "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      }
    ]
  ],
  "zoom-in": [
    [
      "circle",
      {
        "cx": "11",
        "cy": "11",
        "r": "8"
      }
    ],
    [
      "line",
      {
        "x1": "21",
        "x2": "16.65",
        "y1": "21",
        "y2": "16.65"
      }
    ],
    [
      "line",
      {
        "x1": "11",
        "x2": "11",
        "y1": "8",
        "y2": "14"
      }
    ],
    [
      "line",
      {
        "x1": "8",
        "x2": "14",
        "y1": "11",
        "y2": "11"
      }
    ]
  ],
  "zoom-out": [
    [
      "circle",
      {
        "cx": "11",
        "cy": "11",
        "r": "8"
      }
    ],
    [
      "line",
      {
        "x1": "21",
        "x2": "16.65",
        "y1": "21",
        "y2": "16.65"
      }
    ],
    [
      "line",
      {
        "x1": "8",
        "x2": "14",
        "y1": "11",
        "y2": "11"
      }
    ]
  ]
};

// hermes_dockyard_plugin/desktop/src/data/loaders.js
var HEALTH_PRIORITY = Object.freeze({ critical: 0, frozen: 0, attention: 0, degraded: 1, watch: 1, unknown: 2, healthy: 3 });
var RISK_PRIORITY = Object.freeze({ critical: 0, high: 0, medium: 1, low: 2 });
var SEVERITY_PRIORITY = Object.freeze({ critical: 0, high: 0, error: 0, medium: 1, warning: 1, low: 2, info: 3 });
function sortProjects(projects) {
  return [...projects].sort((left, right) => {
    const health = (HEALTH_PRIORITY[left.health] ?? 2) - (HEALTH_PRIORITY[right.health] ?? 2);
    if (health !== 0) return health;
    const blocked = Number(right.work?.blocked ?? 0) - Number(left.work?.blocked ?? 0);
    if (blocked !== 0) return blocked;
    const alerts = Number(right.unacked_notifications ?? 0) - Number(left.unacked_notifications ?? 0);
    if (alerts !== 0) return alerts;
    return String(left.id).localeCompare(String(right.id));
  });
}
function sortApprovals(items) {
  return [...items].sort((left, right) => {
    const risk = (RISK_PRIORITY[String(left.risk || "medium").toLowerCase()] ?? 1) - (RISK_PRIORITY[String(right.risk || "medium").toLowerCase()] ?? 1);
    if (risk !== 0) return risk;
    return Number(right.detail?.priority ?? 0) - Number(left.detail?.priority ?? 0);
  });
}
function initials(value) {
  const words2 = String(value || "?").replace(/-bot$/i, "").split(/[-_\s]+/).filter(Boolean);
  return words2.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("") || "?";
}
function readableLabel(value, fallback = "All") {
  const text = String(value || fallback).replace(/[_-]+/g, " ").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : fallback;
}
function validationSummary(contract) {
  if (!contract || typeof contract !== "object") return "No validation contract supplied";
  const steps = Array.isArray(contract.steps) ? contract.steps.filter(Boolean) : [];
  const tests = typeof contract.tests === "string" ? contract.tests.trim() : "";
  if (steps.length > 0 && tests) return `${steps.length} checks plus ${tests}`;
  if (steps.length > 0) return steps.join("; ");
  if (tests) return tests;
  return "No validation contract supplied";
}
async function loadDashboardData() {
  const [dashboard, portfolio, inbox, notifications, bots, workload] = await Promise.all([
    api("/dashboard"),
    api("/portfolio"),
    api("/inbox"),
    api("/notifications"),
    api("/bots"),
    api("/workload")
  ]);
  const entries = await Promise.all((dashboard.projects ?? []).map(async (project) => {
    const projectId = encodeURIComponent(project.id);
    const [settings, workItems] = await Promise.all([
      api(`/projects/${projectId}/settings`),
      api(`/projects/${projectId}/work-items`)
    ]);
    return [project.id, { settings, workItems: workItems.work_items ?? [] }];
  }));
  return {
    ...dashboard,
    portfolio,
    groups: portfolio?.groups ?? null,
    inbox,
    notifications,
    bots,
    workload,
    projectContext: Object.fromEntries(entries)
  };
}
async function loadProjectData(projectId) {
  const dashboard = await api("/dashboard");
  const projects = sortProjects(dashboard.projects ?? []);
  const project = projectId ? projects.find((item) => item.id === projectId) ?? null : projects[0] ?? null;
  if (projectId && !project) {
    return { ...dashboard, projects, project: null, missingProject: projectId };
  }
  if (!project) return { ...dashboard, project: null, projects };
  const encoded = encodeURIComponent(project.id);
  const [settings, workItems, initiatives, objectives, goals, missionArchive, content, events, reports, milestones, workflows, views, canvas, discovery] = await Promise.all([
    api(`/projects/${encoded}/settings`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api(`/projects/${encoded}/objectives`),
    api(`/projects/${encoded}/goals`),
    api(`/projects/${encoded}/missions/archive`),
    api(`/projects/${encoded}/content`),
    api(`/projects/${encoded}/events`),
    api(`/projects/${encoded}/reports`),
    api(`/projects/${encoded}/milestones`),
    api(`/projects/${encoded}/workflows`),
    api(`/projects/${encoded}/views`),
    api(`/projects/${encoded}/canvas`),
    api("/onboard/discover")
  ]);
  return {
    ...dashboard,
    projects,
    project,
    settings,
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    objectives: objectives.objectives ?? [],
    goals: goals.goals ?? [],
    missionArchive: missionArchive.missions ?? [],
    content: content.content ?? [],
    events: events.events ?? [],
    reports: reports.reports ?? [],
    milestones: milestones.milestones ?? [],
    workflows: workflows.workflows ?? [],
    views: views.views ?? [],
    canvas: canvas ?? { revision: 1, objects: [], connectors: [] },
    profiles: discovery.profiles ?? []
  };
}
async function loadOnboardData() {
  const dashboard = await api("/dashboard");
  const projects = sortProjects(dashboard.projects ?? []);
  const discovery = await api("/onboard/discover");
  return { ...dashboard, projects, profiles: discovery.profiles ?? [] };
}
async function loadBacklogData(projectId) {
  const dashboard = await api("/dashboard");
  const projects = sortProjects(dashboard.projects ?? []);
  const project = projectId ? projects.find((item) => item.id === projectId) ?? null : projects[0] ?? null;
  if (projectId && !project) return { project: null, projects, missingProject: projectId, backlog: [], workItems: [], initiatives: [], bots: [] };
  if (!project) return { project: null, projects, backlog: [], workItems: [], initiatives: [], bots: [] };
  const encoded = encodeURIComponent(project.id);
  const [backlog, workItems, initiatives, bots, discovery] = await Promise.all([
    api(`/projects/${encoded}/backlog`),
    api(`/projects/${encoded}/work-items`),
    api(`/projects/${encoded}/initiatives`),
    api("/bots"),
    api("/onboard/discover")
  ]);
  return {
    project,
    projects,
    backlog: backlog.backlog ?? [],
    workItems: workItems.work_items ?? [],
    initiatives: initiatives.initiatives ?? [],
    bots: bots.bots ?? [],
    profiles: discovery.profiles ?? []
  };
}
async function loadRoadmapData(projectId) {
  const path = projectId ? `/roadmap?project_id=${encodeURIComponent(projectId)}` : "/roadmap";
  return api(path);
}
async function loadTeamsData() {
  const [bots, workload, groups, dashboard, discovery] = await Promise.all([
    api("/bots"),
    api("/workload"),
    api("/bot-groups"),
    api("/dashboard"),
    api("/onboard/discover")
  ]);
  const projects = sortProjects(dashboard.projects ?? []);
  const project = projects[0] ?? null;
  const team = project ? await api(`/projects/${encodeURIComponent(project.id)}/team`) : null;
  const messages = {};
  await Promise.all((groups.groups ?? []).map(async (group) => {
    const result = await api(`/bot-groups/${encodeURIComponent(group.name)}/messages`);
    messages[group.name] = result.messages ?? [];
  }));
  return {
    bots: bots.bots ?? [],
    workload,
    groups: groups.groups ?? [],
    messages,
    projects,
    project,
    team,
    profiles: discovery.profiles ?? []
  };
}
async function loadInboxData() {
  const inbox = await api("/inbox");
  const projectIds = [...new Set((inbox.items ?? []).map((item) => item.project).filter(Boolean))];
  const projectInitiatives = await Promise.all(projectIds.map(async (projectId) => {
    const result = await api(`/projects/${encodeURIComponent(projectId)}/initiatives`);
    return result.initiatives ?? [];
  }));
  const detailByRef = {};
  projectInitiatives.flat().forEach((initiative) => {
    detailByRef[initiative.ref] = initiative;
  });
  return {
    ...inbox,
    items: (inbox.items ?? []).map((item) => ({ ...item, detail: detailByRef[item.ref] ?? null }))
  };
}

// hermes_dockyard_plugin/desktop/src/lib/ui.js
var ICON_NAME = Object.freeze({
  dock: "layout-dashboard",
  project: "folder-kanban",
  check: "circle-check",
  alert: "triangle-alert",
  refresh: "rotate-cw",
  activity: "activity",
  eye: "eye",
  chevron: "chevron-right",
  "chevron-down": "chevron-down",
  search: "search",
  pencil: "pencil",
  bell: "bell",
  "type-epic": "list-checks",
  "type-feature": "folders",
  "type-initiative": "flag",
  "type-task": "square-check-big",
  "type-subtask": "list-checks",
  "type-bug": "bug",
  "type-spike": "zap"
});
var GROUP_LABELS = Object.freeze({ none: "None", status: "Status", assignee: "Owner", type: "Type", initiative: "Initiative", month: "Due month" });
function Icon({ name }) {
  const iconName = ICON_NAME[name] ?? name;
  const nodes = LUCIDE_ICON_NODES[iconName] ?? LUCIDE_ICON_NODES.bell;
  return jsxs("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    // Copy: React 19 reuses the config object as props and tags it with a key getter,
    // which would mutate the shared icon table and warn on the next render.
    children: nodes.map(([tag, attributes], index) => jsx(tag, { ...attributes }, `${iconName}-${index}`))
  });
}
function number(value) {
  return new Intl.NumberFormat("en-GB").format(Number(value ?? 0));
}
function plural(value, singular, multiple = `${singular}s`) {
  return Number(value) === 1 ? singular : multiple;
}
function healthDetails(value) {
  const map = {
    healthy: ["success", "Healthy"],
    watch: ["warning", "Watch"],
    frozen: ["danger", "Frozen"],
    attention: ["danger", "Needs attention"],
    degraded: ["warning", "Degraded"],
    critical: ["danger", "Critical"],
    unknown: ["neutral", "Not verified"]
  };
  return map[value] ?? ["neutral", "Not verified"];
}
function riskDetails(value) {
  const risk = String(value || "medium").toLowerCase();
  if (risk === "low") return ["success", "Low risk"];
  if (risk === "high" || risk === "critical") return ["danger", `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk`];
  return ["warning", "Medium risk"];
}
function severityTone(value) {
  const severity = String(value || "info").toLowerCase();
  if (severity === "high" || severity === "critical" || severity === "error") return "danger";
  if (severity === "medium" || severity === "warning") return "warning";
  return "info";
}
function formatWhen(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(parsed);
}
function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${number(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function mediaTypeLabel(value) {
  return {
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "application/pdf": "PDF",
    "image/png": "PNG image",
    "image/jpeg": "JPEG image",
    "image/webp": "WebP image"
  }[value] || readableLabel(value, "File");
}
function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      if (comma < 0) {
        reject(new Error("The selected file could not be encoded."));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
function StatusTag({ tone = "neutral", label }) {
  return jsxs("span", { className: `dockyard-status-tag ${tone}`, children: [
    jsx("span", { className: "dockyard-status-mark", "aria-hidden": true }),
    label
  ] });
}
function Button({ children, onClick, variant = "", small = false, disabled = false, action, ariaLabel, data = {} }) {
  return jsx("button", {
    type: "button",
    className: `dockyard-button${variant ? ` ${variant}` : ""}${small ? " small" : ""}`,
    disabled,
    onClick,
    "data-action": action,
    "aria-label": ariaLabel,
    ...data,
    children
  });
}
function useDialogFocusManager(containerSelector) {
  useEffect(() => {
    if (!containerSelector) return void 0;
    const container = () => document.querySelector(containerSelector);
    const focusables = (root) => Array.from(
      root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.closest("[hidden]"));
    const restoreTo = document.activeElement;
    const initial = focusables(container());
    initial[0]?.focus();
    const onKeydown = (event) => {
      if (event.key !== "Tab") return;
      const root = container();
      if (!root) return;
      const items = focusables(root);
      if (items.length === 0) return;
      const current = document.activeElement;
      const index = items.indexOf(current);
      event.preventDefault();
      let next;
      if (event.shiftKey) {
        next = items[(index <= 0 ? items.length : index) - 1];
      } else {
        next = items[(index + 1) % items.length];
        if (index === -1) next = items[0];
      }
      next?.focus();
    };
    window.addEventListener("keydown", onKeydown, true);
    return () => {
      window.removeEventListener("keydown", onKeydown, true);
      if (restoreTo && typeof restoreTo.focus === "function") {
        restoreTo.focus();
      }
    };
  }, [containerSelector]);
}
function ConfirmDialog({ confirmKey, title, description, confirmLabel, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onCancel]);
  useDialogFocusManager("[data-destructive-confirm]");
  return jsx("section", {
    className: "dockyard-modal-layer",
    "data-destructive-confirm": confirmKey,
    onClick: (event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    },
    children: jsxs("div", {
      className: "dockyard-modal",
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": `dockyard-confirm-${confirmKey}`,
      children: [
        jsx("h2", { id: `dockyard-confirm-${confirmKey}`, children: title }),
        jsx("p", { children: description }),
        jsxs("div", { className: "dockyard-modal-actions", children: [
          jsx(Button, { action: "cancel-destructive-action", disabled: busy, onClick: onCancel, children: "Cancel" }),
          jsx(Button, { action: "confirm-destructive-action", variant: "danger", disabled: busy, onClick: onConfirm, children: busy ? "Applying..." : confirmLabel })
        ] })
      ]
    })
  });
}
function ToastRegion({ toasts, onDismiss }) {
  return jsx("div", {
    className: "dockyard-toast-region",
    "data-toast-region": true,
    "aria-label": "Status messages",
    children: toasts.map((toast) => jsxs("div", {
      className: `dockyard-toast ${toast.tone}`,
      role: toast.tone === "danger" ? "alert" : "status",
      children: [
        jsx("span", { className: "dockyard-toast-icon", "aria-hidden": true, children: jsx(Icon, { name: toast.tone === "danger" ? "alert" : "check" }) }),
        jsx("span", { children: toast.message }),
        jsx("button", { type: "button", "aria-label": "Dismiss message", onClick: () => onDismiss(toast.id), children: "\xD7" })
      ]
    }, toast.id))
  });
}
function OnboardingWizard({ onClose, onComplete }) {
  useDialogFocusManager("[data-onboarding-wizard]");
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [mission, setMission] = useState("");
  const [leadProfile, setLeadProfile] = useState("");
  const [memberProfiles, setMemberProfiles] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [discovered, setDiscovered] = useState(null);
  const [discoverFailed, setDiscoverFailed] = useState(false);
  const [discoveryRefresh, setDiscoveryRefresh] = useState(0);
  const [preflightState, setPreflightState] = useState(null);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [preflightFields, setPreflightFields] = useState(null);
  const [preflightContract, setPreflightContract] = useState(null);
  const currentFields = () => JSON.stringify({
    project_id: projectId.trim(),
    repo_path: repoPath.trim(),
    mission: mission.trim(),
    lead_profile: leadProfile.trim(),
    member_profiles: memberProfiles
  });
  const preflightCurrent = preflightFields === currentFields();
  useEffect(() => {
    let current = true;
    setDiscoverFailed(false);
    api("/onboard/discover").then((result) => {
      if (!current) return;
      setDiscovered(result);
      setDiscoverFailed(false);
    }).catch(() => {
      if (current) {
        setDiscovered(null);
        setDiscoverFailed(true);
      }
    });
    return () => {
      current = false;
    };
  }, [discoveryRefresh]);
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, submitting]);
  const valid = step === 1 ? /^[a-z0-9][a-z0-9-]*$/.test(projectId.trim()) && repoPath.trim().startsWith("/") : step === 2 ? mission.trim().length >= 12 : step === 3 ? leadProfile.trim().length > 0 : true;
  const runPreflight = async () => {
    setPreflightBusy(true);
    setPreflightState(null);
    try {
      const result = await api("/onboard/preflight", {
        method: "POST",
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles
        }
      });
      setPreflightState({
        ok: true,
        mode: result.mode,
        text: result.mode === "connect_existing" ? "Host already owns this project \u2014 it will be connected, not recreated." : "Host validated the details; nothing exists yet \u2014 create-new.",
        projects: (result?.existing?.projects ?? []).map((p) => p.slug),
        // P7.4: exact proposed targets + automation state.
        preview: result.preview ?? null,
        // P7.3: inert suggestions for explicit owner review.
        suggestions: result.suggestions ?? []
      });
      setPreflightFields(currentFields());
      setPreflightContract(result.preflight ?? null);
    } catch (failure) {
      setPreflightState({ ok: false, message: String(failure?.message ?? failure) });
      setPreflightFields(null);
      setPreflightContract(null);
    }
    setPreflightBusy(false);
  };
  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api("/onboard", {
        method: "POST",
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles,
          idempotency_key: `dockyard-onboard:${projectId.trim()}`,
          expected_membership_revision: preflightContract?.membership_revision,
          preflight_token: preflightContract?.token
        }
      });
      onComplete(result);
    } catch (failure) {
      setError(String(failure?.message ?? failure));
      setSubmitting(false);
    }
  };
  const steps = [
    ["Project", "Name and repository"],
    ["Mission", "Define the outcome"],
    ["Lead", "Assign ownership"],
    ["Review", "Confirm the contract"]
  ];
  return jsx("div", {
    className: "dockyard-modal-backdrop",
    children: jsxs("section", {
      className: "dockyard-onboarding",
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": "dockyard-onboarding-title",
      "data-onboarding-wizard": true,
      children: [
        jsxs("header", { className: "dockyard-onboarding-head", children: [
          jsxs("div", { children: [
            jsx("span", { className: "dockyard-card-label", children: "NEW PROJECT" }),
            jsx("h2", { id: "dockyard-onboarding-title", children: "Bring a project into Dockyard" }),
            jsx("p", { children: "Four bounded steps. Nothing runs until the final review." })
          ] }),
          jsx("button", { type: "button", className: "dockyard-modal-close", "aria-label": "Close onboarding", disabled: submitting, onClick: onClose, children: "\xD7" })
        ] }),
        jsx("div", {
          className: "dockyard-wizard-progress",
          role: "progressbar",
          "aria-label": "Onboarding progress",
          "aria-valuemin": 1,
          "aria-valuemax": 4,
          "aria-valuenow": step,
          children: steps.map(([label, detail], index) => jsxs("div", { key: `step-${index}`, className: index + 1 <= step ? "complete" : "", children: [
            jsx("span", { children: number(index + 1) }),
            jsxs("span", { children: [jsx("strong", { children: label }), jsx("small", { children: detail })] })
          ] }))
        }),
        jsxs("div", { className: "dockyard-wizard-body", children: [
          jsxs("div", { className: step === 1 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: step !== 1, "data-wizard-step": "1", children: [
            jsx("h3", { children: "Project identity" }),
            jsx("p", { children: "Use the stable project identifier and its absolute repository path." }),
            discovered ? jsxs("div", { children: [
              jsxs("p", { className: "dockyard-meta", "data-discovered-projects": true, children: [
                "Host projects: ",
                (discovered.projects ?? []).length > 0 ? (discovered.projects ?? []).map((project) => project.slug).join(", ") : "none yet \u2014 create-new below"
              ] }),
              jsx("p", { className: "dockyard-meta", "data-profile-guidance": true, children: "Profiles are managed in the Hermes host profile manager." }),
              jsx(Button, { action: "refresh-onboarding-discovery", small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: "Refresh host discovery" })
            ] }) : discoverFailed ? jsxs("div", { children: [
              jsx("p", { className: "dockyard-inline-error", role: "alert", "data-discovery-failed": true, children: "Host discovery failed. Retry \u2014 onboarding stays closed until the host answers. No fallback choices are offered. If profiles are missing, manage them in the Hermes host profile manager, then retry." }),
              jsx(Button, { action: "refresh-onboarding-discovery", small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: "Retry host discovery" })
            ] }) : jsxs("div", { children: [
              jsx("p", { className: "dockyard-meta", children: "Loading host discovery\u2026" }),
              jsx(Button, { action: "refresh-onboarding-discovery", small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: "Refresh host discovery" })
            ] }),
            // R4: connect-existing as a real selectable path — fills/binds
            // the discovered host project into the form.
            discovered && (discovered.projects ?? []).length > 0 ? jsxs("div", { className: "dockyard-connect-existing", "data-connect-existing": true, children: [
              jsx("p", { className: "dockyard-card-label", children: "CONNECT AN EXISTING HOST PROJECT" }),
              ...(discovered.projects ?? []).map((project) => jsx(Button, {
                action: `connect-existing-${project.slug}`,
                small: true,
                onClick: () => {
                  setProjectId(project.slug);
                  setRepoPath(project.repo_path);
                },
                children: `Connect ${project.slug}`
              }, project.slug))
            ] }) : null,
            jsx("label", { htmlFor: "dockyard-project-id", children: "Project ID" }),
            jsx("input", { id: "dockyard-project-id", "data-field": "project-id", value: projectId, placeholder: "payments-relaunch", autoComplete: "off", onInput: (event) => setProjectId(event.target.value) }),
            jsx("small", { children: "Lowercase letters, numbers and hyphens." }),
            jsx("label", { htmlFor: "dockyard-repo-path", children: "Repository path" }),
            jsx("input", { id: "dockyard-repo-path", "data-field": "repo-path", value: repoPath, placeholder: "/path/to/repos/project", autoComplete: "off", onInput: (event) => setRepoPath(event.target.value) })
          ] }),
          jsxs("div", { className: step === 2 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: step !== 2, "data-wizard-step": "2", children: [
            jsx("h3", { children: "Mission and outcome" }),
            jsx("p", { children: "State what the project must improve. This anchors later initiative decisions." }),
            jsx("label", { htmlFor: "dockyard-mission", children: "Mission" }),
            jsx("textarea", { id: "dockyard-mission", "data-field": "mission", value: mission, rows: 5, placeholder: "Reduce payment failures without weakening release gates.", onInput: (event) => setMission(event.target.value) }),
            jsx("small", { children: `${number(mission.trim().length)} characters / minimum 12` })
          ] }),
          jsxs("div", { className: step === 3 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: step !== 3, "data-wizard-step": "3", children: [
            jsx("h3", { children: "Lead ownership" }),
            jsx("p", { children: "Assign the specialist profile accountable for the project." }),
            jsx("label", { htmlFor: "dockyard-lead-profile", children: "Lead profile" }),
            jsx("select", { id: "dockyard-lead-profile", "data-field": "lead-profile", value: leadProfile, onChange: (event) => setLeadProfile(event.target.value), children: [
              jsx("option", { value: "", children: "Select a lead profile" }),
              ...(discovered?.profiles ?? []).map((profile) => jsx("option", {
                value: profile.name,
                disabled: profile.available === false || profile.selectable === false || (profile.host_capabilities ?? []).length > 0 && !(profile.host_capabilities ?? []).includes("lead"),
                children: `${profile.name}${profile.available === false || profile.selectable === false ? " \u2014 unavailable" : ""}`
              }, profile.name))
            ] }),
            jsx("small", { children: discovered ? `Valid host profiles: ${(discovered.profiles ?? []).map((p) => `${p.name}${p.available === false || p.selectable === false ? " (unavailable)" : ""}`).join(", ") || "n/a"}.` : discoverFailed ? "Host profile list unavailable \u2014 onboarding is closed until discovery succeeds." : "Loading host profiles\u2026" }),
            jsx("label", { htmlFor: "dockyard-member-search", children: "Team members" }),
            jsx("input", { id: "dockyard-member-search", "data-field": "member-search", value: memberSearch, placeholder: "Search profiles", autoComplete: "off", onInput: (event) => setMemberSearch(event.target.value) }),
            jsx("div", { "data-member-picker": true, children: (discovered?.profiles ?? []).filter((profile) => profile.name.toLowerCase().includes(memberSearch.trim().toLowerCase())).filter((profile) => profile.name !== leadProfile).map((profile) => {
              const selectable = profile.available !== false && profile.selectable !== false && ((profile.host_capabilities ?? []).length === 0 || (profile.host_capabilities ?? []).includes("member"));
              return jsxs("label", { "data-member-option": profile.name, children: [
                jsx("input", {
                  type: "checkbox",
                  checked: memberProfiles.includes(profile.name),
                  disabled: !selectable,
                  onChange: (event) => setMemberProfiles((current) => event.target.checked ? [...current, profile.name] : current.filter((name) => name !== profile.name))
                }),
                `${profile.name}${selectable ? "" : " \u2014 unavailable"}`
              ] }, profile.name);
            }) }),
            jsx("small", { children: "This records ownership; it does not expand permissions." })
          ] }),
          jsxs("div", { className: step === 4 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: step !== 4, "data-wizard-step": "4", children: [
            jsx("h3", { children: "Review onboarding contract" }),
            jsxs("dl", { className: "dockyard-onboarding-review", children: [
              jsx("dt", { children: "Project" }),
              jsx("dd", { children: projectId }),
              jsx("dt", { children: "Repository" }),
              jsx("dd", { children: repoPath }),
              jsx("dt", { children: "Mission" }),
              jsx("dd", { children: mission }),
              jsx("dt", { children: "Lead" }),
              jsx("dd", { children: leadProfile }),
              jsx("dt", { children: "Members" }),
              jsx("dd", { children: memberProfiles.join(", ") || "None" })
            ] }),
            jsx(Button, {
              action: "run-onboarding-preflight",
              disabled: preflightBusy || !valid,
              onClick: runPreflight,
              children: preflightBusy ? "Validating\u2026" : "Validate with host before commit"
            }),
            preflightState ? jsx("p", {
              className: preflightState.ok ? "dockyard-review-note" : "dockyard-inline-error",
              role: preflightState.ok ? void 0 : "alert",
              "data-preflight-result": preflightState.ok ? preflightState.mode : "error",
              children: preflightState.ok ? `${preflightState.text} Host projects: ${preflightState.projects.join(", ") || "none"}.` : preflightState.message
            }) : null,
            // P7.4: the exact proposed governance/board/automation preview.
            preflightState?.ok && preflightState.preview ? jsx("pre", {
              className: "dockyard-onboarding-preview",
              "data-onboarding-preview": true,
              children: JSON.stringify(preflightState.preview, null, 2)
            }) : null,
            // P7.3: reviewable inert suggestions; unsupported ones stay
            // visible as unsupported; acceptance is explicit per item.
            preflightState?.ok && (preflightState.suggestions ?? []).length > 0 ? jsxs("div", { className: "dockyard-onboarding-suggestions", "data-onboarding-suggestions": true, children: [
              jsx("p", { className: "dockyard-card-label", children: "SUGGESTED MANUAL OBJECTIVES \u2014 nothing runs automatically" }),
              ...preflightState.suggestions.map((suggestion) => jsxs("p", { className: "dockyard-review-note", "data-suggestion": suggestion.name, children: [
                `${suggestion.name} \u2014 ${suggestion.description}`,
                suggestion.supported === false ? " (unsupported \u2014 shown for review only)" : ""
              ] }, suggestion.name))
            ] }) : null,
            jsx("p", { className: "dockyard-review-note", children: "Onboarding creates the project record and its initial oversight surfaces. It does not approve future initiatives." })
          ] })
        ] }),
        error ? jsx("p", { className: "dockyard-inline-error", children: error }) : null,
        jsxs("footer", { className: "dockyard-wizard-actions", children: [
          jsx(Button, { action: step === 1 ? "cancel-onboarding" : "wizard-back", disabled: submitting, onClick: step === 1 ? onClose : () => setStep((value) => value - 1), children: step === 1 ? "Cancel" : "Back" }),
          step < 4 ? jsx(Button, { action: "wizard-next", variant: "primary", disabled: !valid, onClick: () => setStep((value) => value + 1), children: "Continue" }) : jsx(Button, {
            action: "submit-onboarding",
            variant: "primary",
            disabled: submitting || !preflightCurrent,
            data: { "data-preflight-gate": preflightCurrent ? "open" : "locked" },
            onClick: submit,
            children: submitting ? "Onboarding\u2026" : preflightCurrent ? "Onboard project" : "Validate before onboarding"
          })
        ] })
      ]
    })
  });
}
function FleetSearch({ onOpen }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setActive(true);
      }
      if (event.key === "Escape" && active) {
        setActive(false);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [active]);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setBusy(false);
      setError("");
      return void 0;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const response = await api(`/search?q=${encodeURIComponent(term)}&limit=20`);
        if (!cancelled) {
          setResults(response.results ?? []);
          setError("");
        }
      } catch (failure) {
        if (!cancelled) {
          setResults([]);
          setError(String(failure?.message ?? failure));
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);
  return jsxs("div", { className: "dockyard-fleet-search", children: [
    jsx("input", {
      ref: inputRef,
      type: "search",
      "aria-label": "Search projects, work and initiatives",
      "aria-expanded": active && query.trim().length >= 2,
      "aria-controls": "dockyard-search-results",
      placeholder: "Search projects, work, initiatives\u2026",
      value: query,
      onFocus: () => setActive(true),
      onChange: (event) => {
        setQuery(event.target.value);
        setActive(true);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" && results[0]) {
          onOpen?.(results[0].deep_link);
          setActive(false);
        }
      }
    }),
    jsx("span", { className: "dockyard-search-shortcut", "aria-hidden": true, children: "\u2318K" }),
    active && query.trim().length >= 2 ? jsxs("div", { id: "dockyard-search-results", className: "dockyard-search-results", role: "region", "aria-label": "Search results", children: [
      busy ? jsx("p", { children: "Searching\u2026" }) : error ? jsx("p", { role: "alert", children: error }) : results.length === 0 ? jsx("p", { children: "No matches found" }) : results.map((item) => jsxs("button", { type: "button", onClick: () => {
        onOpen?.(item.deep_link);
        setActive(false);
      }, children: [
        jsx("strong", { children: item.title }),
        jsx("small", { children: `${readableLabel(item.kind)} \xB7 ${item.project}` })
      ] }, `${item.kind}:${item.ref}`))
    ] }) : null
  ] });
}
function ProjectPicker({ projects, selectedProject, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const trigger = useRef(null);
  const results = projects.filter((p) => `${p.name || ""} ${p.id}`.toLowerCase().includes(query.toLowerCase()));
  const selected = projects.find((p) => p.id === selectedProject);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const choose = (p) => {
    if (p) onChange(p.id);
    close();
  };
  return jsxs("div", { className: "dockyard-project-switcher", style: { position: "relative" }, onBlur: (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }, children: [
    jsx("button", { ref: trigger, type: "button", className: "dockyard-button", "aria-label": "Project context", "aria-haspopup": "listbox", "aria-expanded": open, onClick: () => {
      setOpen(!open);
      setQuery("");
      setActive(0);
    }, children: selected?.name || selectedProject || "Choose project" }),
    open ? jsxs("div", { className: "dockyard-feature-card", style: { position: "absolute", zIndex: 100, top: "100%", right: 0, width: "min(320px, 85vw)" }, children: [
      jsx("input", {
        autoFocus: true,
        role: "combobox",
        "aria-label": "Find project",
        "aria-expanded": true,
        "aria-controls": "dockyard-project-options",
        "aria-autocomplete": "list",
        "aria-activedescendant": results[active] ? `dockyard-project-option-${active}` : void 0,
        value: query,
        onChange: (e) => {
          setQuery(e.target.value);
          setActive(0);
        },
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
          if (e.key === "Enter") {
            e.preventDefault();
            choose(results[active]);
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            setActive(e.key === "Home" ? 0 : e.key === "End" ? Math.max(0, results.length - 1) : Math.max(0, Math.min(results.length - 1, active + (e.key === "ArrowDown" ? 1 : -1))));
          }
        }
      }),
      jsx("div", { role: "listbox", id: "dockyard-project-options", "aria-label": "Projects", style: { maxHeight: 260, overflowY: "auto" }, children: results.map((p, i) => jsx("button", { type: "button", role: "option", id: `dockyard-project-option-${i}`, "aria-selected": p.id === selectedProject, className: `dockyard-button ${i === active ? "primary" : ""}`, style: { display: "block", width: "100%" }, onMouseDown: (e) => e.preventDefault(), onClick: () => choose(p), children: p.name || p.id }, p.id)) }),
      results.length ? null : jsx("p", { role: "status", children: "No matching projects" })
    ] }) : null
  ] });
}
function ConsoleBar({ tab, counts, onTab, onNewProject, projects = [], selectedProject, onProjectChange, onOpen }) {
  const tabs = [
    ["dashboard", "Dashboard", null],
    ["project", "Projects", null],
    ["roadmap", "Roadmap", null],
    ["backlog", "Backlog", null],
    ["workflows", "Workflows", null],
    ["inbox", "Approval Inbox", counts.approvals],
    ["notifications", "Notifications", counts.notifications],
    ["onboard", "Onboard", null],
    ["settings", "Settings", null]
  ];
  const moveTab = (event, index) => {
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const nextKey = tabs[next][0];
    onTab(nextKey);
    document.getElementById(`dockyard-tab-${nextKey}`)?.focus();
  };
  return jsxs("header", { className: "dockyard-consolebar", children: [
    jsxs("div", { className: "dockyard-brand", children: [
      jsx("span", { className: "dockyard-brand-mark", children: jsx(Icon, { name: "dock" }) }),
      jsxs("span", { className: "dockyard-brand-copy", children: [
        jsx("strong", { children: "Dockyard" }),
        jsx("span", { children: "Fleet oversight" })
      ] })
    ] }),
    jsx(FleetSearch, { onOpen }),
    projects.length > 0 ? jsx(ProjectPicker, { projects, selectedProject, onChange: onProjectChange }) : null,
    jsx("nav", {
      className: "dockyard-tabs",
      role: "tablist",
      "aria-label": "Dockyard sections",
      children: tabs.map(([key, label, count], index) => jsxs("button", {
        id: `dockyard-tab-${key}`,
        type: "button",
        role: "tab",
        className: "dockyard-tab",
        "data-tab": key,
        "aria-selected": tab === key,
        "aria-controls": "dockyard-panel",
        tabIndex: tab === key ? 0 : -1,
        onClick: () => onTab(key),
        onKeyDown: (event) => moveTab(event, index),
        children: [
          label,
          Number(count) > 0 ? jsx("span", { className: "dockyard-tab-count", children: number(count) }) : null
        ]
      }, key))
    }),
    jsx(Button, {
      action: "open-onboarding",
      variant: "primary dockyard-console-action",
      small: true,
      ariaLabel: "New project",
      onClick: onNewProject,
      children: jsxs(Fragment, { children: [jsx(Icon, { name: "project" }), jsx("span", { className: "dockyard-console-action-label", children: "New project" })] })
    })
  ] });
}
function PageHead({ title, description, onRefresh, status }) {
  return jsxs("div", { className: "dockyard-page-head", children: [
    jsxs("div", { children: [
      jsx("h1", { children: title }),
      jsx("p", { children: description })
    ] }),
    status || onRefresh ? jsxs("div", { className: "dockyard-page-actions", children: [
      status ? jsxs("span", { className: "dockyard-owed-pill", children: [
        jsx("span", { className: "dockyard-status-mark", "aria-hidden": true }),
        status
      ] }) : null,
      onRefresh ? jsx(Button, {
        action: "refresh",
        onClick: onRefresh,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: "refresh" }), "Refresh"] })
      }) : null
    ] }) : null
  ] });
}
function EmptyState({ title, description, icon = "project" }) {
  return jsxs("section", { className: "dockyard-state-panel", "data-state": "empty", children: [
    jsx("span", { className: "dockyard-empty-icon", children: jsx(Icon, { name: icon }) }),
    jsx("h2", { children: title }),
    jsx("p", { children: description })
  ] });
}
function ErrorState({ error, onRetry }) {
  return jsxs("section", { className: "dockyard-state-panel", "data-state": "error", children: [
    jsx("span", { className: "dockyard-error-icon", children: jsx(Icon, { name: "alert" }) }),
    jsx("h2", { children: "Dockyard could not load this view" }),
    jsx("p", { children: String(error) }),
    jsx(Button, { action: "retry", variant: "primary", onClick: onRetry, children: "Try again" })
  ] });
}
function LoadingState() {
  return jsxs("div", { className: "dockyard-skeleton-page", "data-state": "loading", "aria-label": "Loading Dockyard data", children: [
    jsx("div", { className: "dockyard-skeleton title" }),
    jsx("div", { className: "dockyard-skeleton copy" }),
    jsxs("div", { className: "dockyard-overview-grid", children: [
      jsx("div", { className: "dockyard-skeleton summary" }),
      jsx("div", { className: "dockyard-skeleton summary" })
    ] }),
    jsx("div", {
      className: "dockyard-section",
      children: [0, 1, 2].map((index) => jsx("div", { className: "dockyard-skeleton row" }, index))
    })
  ] });
}

// hermes_dockyard_plugin/desktop/src/work-item/approvals.js
function ApprovalRow({ item, onResolved }) {
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [reviewedDecision, setReviewedDecision] = useState(null);
  const [decisionError, setDecisionError] = useState(null);
  useEffect(() => {
    let disposed = false;
    api(`/initiatives/${encodeURIComponent(item.ref)}/decision`).then((decision) => {
      if (!disposed) setReviewedDecision(decision);
    }).catch(() => {
      if (!disposed) setDecisionError("Decision evidence unavailable; refresh before deciding.");
    });
    return () => {
      disposed = true;
    };
  }, [item.ref]);
  const tone2source = reviewedDecision ? {
    title: reviewedDecision.title ?? item.title,
    risk: reviewedDecision.risk ?? item.risk,
    rationale: reviewedDecision.reason ?? reviewedDecision.rationale ?? (item.detail?.rationale ?? ""),
    expected_outcome: reviewedDecision.expected_outcome ?? (item.detail?.expected_outcome ?? ""),
    validation: reviewedDecision.validation?.contract ?? reviewedDecision.validation ?? item.detail?.validation_contract ?? null
  } : { title: item.title, risk: item.risk, rationale: item.detail?.rationale, expected_outcome: item.detail?.expected_outcome, validation: item.detail?.validation_contract ?? null };
  const [tone, label] = riskDetails(tone2source.risk);
  const detail = {
    ...item.detail,
    rationale: tone2source.rationale,
    expected_outcome: tone2source.expected_outcome,
    validation_contract: tone2source.validation
  };
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesFeedback, setChangesFeedback] = useState("");
  const [changesBusy, setChangesBusy] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState([]);
  useEffect(() => {
    let disposed = false;
    api(`/initiatives/${encodeURIComponent(item.ref)}/comments`).then((thread) => {
      if (!disposed) setComments(thread.comments ?? []);
    }).catch(() => {
    });
    return () => {
      disposed = true;
    };
  }, [item.ref]);
  const requestChanges = async () => {
    setChangesBusy(true);
    setError(null);
    try {
      if (!reviewedDecision) {
        throw new Error("Decision evidence not reviewed yet; refresh before deciding.");
      }
      await api(`/initiatives/${encodeURIComponent(item.ref)}/request-changes`, {
        method: "POST",
        body: {
          expected_fingerprint: reviewedDecision.fingerprint,
          feedback: changesFeedback.trim(),
          note: decisionNote || void 0
        },
        suppressErrorToast: true
      });
      setState("returned");
      emitToast("success", "Returned to the proposer with your feedback");
      setTimeout(onResolved, 850);
    } catch (failure) {
      setChangesOpen(false);
      setState("failed");
      const message = `Request changes was not recorded. ${String(failure?.message ?? failure)}`;
      setError(message);
      emitToast("danger", message);
    } finally {
      setChangesBusy(false);
    }
  };
  const addComment = async () => {
    const body = commentBody.trim();
    if (!body) return;
    try {
      const created2 = await api(`/initiatives/${encodeURIComponent(item.ref)}/comments`, {
        method: "POST",
        body: { body },
        suppressErrorToast: true
      });
      setComments((thread) => [...thread, created2]);
      setCommentBody("");
    } catch (failure) {
      emitToast("danger", `Comment was not recorded. ${String(failure?.message ?? failure)}`);
    }
  };
  const decide = async (action) => {
    const resolvedState = action === "approve" ? "approved" : "rejected";
    const actionLabel = action === "approve" ? "Approve" : "Reject";
    if (action === "reject" && !noteOpen) {
      setNoteOpen(true);
      return;
    }
    setState(action === "approve" ? "approving" : "rejecting");
    setError(null);
    try {
      if (!reviewedDecision) {
        throw new Error("Decision evidence not reviewed yet; refresh before deciding.");
      }
      const body = action === "reject" ? {
        expected_fingerprint: reviewedDecision.fingerprint,
        reason: decisionReason.trim() || "Rejected from Desktop review",
        note: decisionNote || void 0
      } : { expected_fingerprint: reviewedDecision.fingerprint, note: decisionNote || void 0 };
      await api(`/initiatives/${encodeURIComponent(item.ref)}/${action}`, {
        method: "POST",
        body,
        suppressErrorToast: true
      });
      setState(resolvedState);
      setTimeout(onResolved, 850);
    } catch (failure) {
      setNoteOpen(false);
      let confirmed = null;
      try {
        const receipts = await api(`/initiatives/${encodeURIComponent(item.ref)}/decision/receipts`);
        const rows = receipts?.receipts ?? [];
        if (rows.length > 0) {
          const latest = rows[rows.length - 1];
          confirmed = latest.decision === "approved" ? "approved" : latest.decision === "rejected" ? "rejected" : null;
        }
      } catch {
        confirmed = null;
      }
      if (confirmed === resolvedState) {
        setState(resolvedState);
        emitToast("success", `Initiative ${resolvedState}; confirmed by decision receipt`);
        setTimeout(onResolved, 850);
        return;
      }
      if (confirmed != null) {
        setState(confirmed);
        emitToast("warning", `Initiative was ${confirmed} by another decision; your ${actionLabel.toLowerCase()} was not applied`);
        setTimeout(onResolved, 850);
        return;
      }
      let stillPending = null;
      try {
        const inbox = await api("/inbox");
        stillPending = (inbox?.items ?? []).some((pending) => pending.ref === item.ref);
      } catch {
        stillPending = null;
      }
      if (stillPending === true) {
        setState("failed");
        const detailMessage2 = String(failure?.message ?? failure);
        const message2 = `${actionLabel} was not recorded. The approval is still pending. ${detailMessage2}`;
        setError(message2);
        emitToast("danger", message2);
        return;
      }
      setState("failed");
      const detailMessage = String(failure?.message ?? failure);
      const message = `${actionLabel} could not be confirmed. Refresh before trying again. ${detailMessage}`;
      setError(message);
      emitToast("danger", message);
    }
  };
  const resolved = state === "approved" || state === "rejected";
  const stateTone = state === "approved" ? "success" : state === "rejected" || state === "failed" ? "danger" : tone;
  const stateLabel = state === "approved" ? "Approved" : state === "rejected" ? "Rejected" : state === "failed" ? "Decision unconfirmed" : label;
  const created = formatWhen(detail.created_at);
  return jsxs("article", {
    className: "dockyard-approval-row",
    "data-approval-card": true,
    "data-approval-ref": item.ref,
    "data-state": state,
    children: [
      jsxs("div", { className: "dockyard-approval-top", children: [
        jsx("span", { className: `dockyard-approval-icon ${tone}`, children: jsx(Icon, { name: tone === "danger" ? "alert" : "check" }) }),
        jsxs("div", { className: "dockyard-approval-main", children: [
          jsx("h2", { children: tone2source.title }),
          jsx("span", { className: "dockyard-meta", children: `${item.project || "Unknown project"} / ${item.ref}${created ? ` / proposed ${created}` : ""}` })
        ] }),
        jsx(StatusTag, { tone: stateTone, label: stateLabel })
      ] }),
      jsxs("div", { className: "dockyard-evidence-grid", "data-evidence-grid": true, children: [
        jsxs("div", { className: "dockyard-evidence-cell", "data-evidence-cell": "rationale", children: [
          jsx("span", { children: "WHY PROPOSED" }),
          jsx("strong", { children: detail.rationale || "No rationale supplied" })
        ] }),
        jsxs("div", { className: "dockyard-evidence-cell", "data-evidence-cell": "outcome", children: [
          jsx("span", { children: "EXPECTED OUTCOME" }),
          jsx("strong", { children: detail.expected_outcome || "No expected outcome supplied" })
        ] }),
        jsxs("div", { className: "dockyard-evidence-cell", "data-evidence-cell": "validation", children: [
          jsx("span", { children: "VALIDATION" }),
          jsx("strong", { children: validationSummary(detail.validation_contract) })
        ] })
      ] }),
      decisionError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: decisionError }) : null,
      noteOpen && !resolved ? jsxs("div", { className: "dockyard-decision-note-form", "data-decision-note-form": true, children: [
        jsxs("label", { children: ["Rejection reason ", jsx("input", {
          value: decisionReason,
          onChange: (event) => setDecisionReason(event.target.value),
          placeholder: "Why this initiative is rejected"
        })] }),
        jsxs("label", { children: ["Note (optional) ", jsx("input", {
          value: decisionNote,
          onChange: (event) => setDecisionNote(event.target.value),
          placeholder: "Optional context recorded with the decision"
        })] }),
        jsxs("div", { className: "dockyard-form-actions", children: [
          jsx(Button, {
            action: "confirm-reject-with-reason",
            variant: "danger",
            disabled: state === "rejecting" || !decisionReason.trim(),
            onClick: () => decide("reject"),
            children: "Reject with reason"
          }),
          jsx(Button, { variant: "quiet", onClick: () => setNoteOpen(false), children: "Cancel" })
        ] })
      ] }) : null,
      changesOpen && !resolved ? jsxs("div", { className: "dockyard-decision-note-form", "data-request-changes-form": true, children: [
        jsxs("label", { children: ["Feedback for the proposer ", jsx("input", {
          value: changesFeedback,
          onChange: (event) => setChangesFeedback(event.target.value),
          placeholder: "What must change before you can approve"
        })] }),
        jsxs("div", { className: "dockyard-form-actions", children: [
          jsx(Button, {
            action: "confirm-request-changes",
            variant: "primary",
            disabled: changesBusy || !changesFeedback.trim(),
            onClick: requestChanges,
            children: changesBusy ? "Returning\u2026" : "Return to proposer"
          }),
          jsx(Button, { variant: "quiet", onClick: () => setChangesOpen(false), children: "Cancel" })
        ] })
      ] }) : null,
      jsxs("div", { className: "dockyard-approval-actions", children: [
        resolved ? jsx(StatusTag, { tone: stateTone, label: stateLabel }) : jsx(Button, {
          action: "approve",
          variant: "primary",
          disabled: state === "approving" || state === "rejecting",
          onClick: () => decide("approve"),
          children: state === "approving" ? "Approving..." : "Approve"
        }),
        resolved ? null : jsx(Button, {
          action: "reject",
          variant: "danger",
          disabled: state === "approving" || state === "rejecting",
          onClick: () => setRejectConfirm(true),
          children: state === "rejecting" ? "Rejecting..." : "Reject"
        }),
        resolved ? null : jsx(Button, {
          action: "request-changes",
          variant: "quiet",
          disabled: state === "approving" || state === "rejecting",
          onClick: () => setChangesOpen((open) => !open),
          children: "Request changes"
        }),
        jsx(Button, {
          action: "toggle-evidence",
          variant: "quiet",
          onClick: () => setExpanded((open) => !open),
          children: expanded ? "Hide evidence details" : "Show evidence details"
        }),
        !resolved ? jsx(StatusTag, { tone: "neutral", label: "Awaiting you" }) : null
      ] }),
      jsx("div", {
        className: "dockyard-evidence-details",
        "data-evidence-details": true,
        hidden: !expanded,
        children: `Status: ${detail.status || "pending approval"}. Priority: ${number(detail.priority ?? 0)}. Approval state: ${detail.approval_state || "pending"}. Context reference: ${item.deep_link || item.ref}.`
      }),
      error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
      rejectConfirm ? jsx(ConfirmDialog, {
        confirmKey: `reject-${item.ref}`,
        title: "Reject this initiative?",
        description: `${item.title} will leave the approval queue and be recorded as rejected.`,
        confirmLabel: "Reject initiative",
        busy: state === "rejecting",
        onCancel: () => setRejectConfirm(false),
        onConfirm: async () => {
          setRejectConfirm(false);
          await decide("reject");
        }
      }) : null,
      jsxs("div", { className: "dockyard-approval-comments", "data-approval-comments": true, children: [
        comments.length ? jsxs("div", {
          className: "dockyard-comment-thread",
          children: comments.map((comment) => jsxs("p", { children: [
            jsx("strong", { children: comment.actor }),
            jsx("span", { children: ` \xB7 ${formatWhen(comment.created_at)} \xB7 ${comment.body}` })
          ] }, comment.id))
        }) : jsx("p", { className: "dockyard-meta", children: "No comments yet." }),
        jsxs("div", { className: "dockyard-comment-form", children: [
          jsx("input", {
            value: commentBody,
            onChange: (event) => setCommentBody(event.target.value),
            placeholder: "Add context without deciding (recorded in the audit trail)",
            "aria-label": "Comment"
          }),
          jsx(Button, { small: true, variant: "quiet", onClick: addComment, disabled: !commentBody.trim(), children: "Comment" })
        ] })
      ] })
    ]
  });
}

// hermes_dockyard_plugin/desktop/src/views/bulk-import.js
function normaliseBulkImportText(text, mode) {
  let csvText = text;
  if (mode === "json") {
    let rowsJson;
    try {
      rowsJson = JSON.parse(text);
      if (!Array.isArray(rowsJson)) throw new Error("JSON must be an array");
      if (rowsJson.some((row) => row?.initiative_ref)) throw new Error("initiative_ref is not supported by bulk import; link the item after import");
      const supported = /* @__PURE__ */ new Set(["row_key", "type", "title", "parent", "parent_key", "labels", "estimate_days", "due"]);
      const unknown = rowsJson.flatMap((row) => Object.keys(row ?? {}).filter((key) => !supported.has(key)));
      if (unknown.length) throw new Error(`Unsupported import fields: ${[...new Set(unknown)].join(", ")}`);
    } catch (bad) {
      return { error: `Could not read that: ${bad?.message || bad}` };
    }
    const header = "row_key,type,title,parent_key,labels,estimate_days,due";
    const toCsvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    csvText = [header].concat(rowsJson.map((row, idx) => [
      toCsvCell(row.row_key ?? `json-${idx + 1}`),
      toCsvCell(row.type ?? "task"),
      toCsvCell(row.title),
      toCsvCell(row.parent ?? row.parent_key ?? ""),
      toCsvCell(row.labels ?? ""),
      toCsvCell(row.estimate_days ?? ""),
      toCsvCell(row.due ?? "")
    ].join(","))).join("\n");
  }
  return { csvText };
}

// hermes_dockyard_plugin/desktop/src/work-item/detail.js
function WorkItemDetail({ item, projectId, profiles, initiatives = [], onClose, onRefresh }) {
  const [draft, setDraft] = useState(null);
  const [detail, setDetail] = useState(null);
  const taskId = detail?.work_item?.id ?? item?.id ?? null;
  const taskIdText = taskId === null || taskId === "" ? null : String(taskId);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [depRef, setDepRef] = useState("");
  const [parentReason, setParentReason] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [baseline, setBaseline] = useState(null);
  const rebaseFromDetail = (result) => {
    if (!result) return null;
    const current = result.work_item ?? {};
    const record = {
      title: current.title ?? "",
      type: current.type ?? "task",
      assignee: current.assignee ?? "",
      status: current.status ?? "backlog",
      body: current.body ?? "",
      labels: (current.labels ?? []).join(", "),
      estimate_days: current.estimate_days == null ? "" : String(current.estimate_days),
      due: current.due ?? "",
      // Canonical shape supplies parent_task_id; detail.parent.ref mirrors it.
      parent_ref: current.parent_task_id ?? result.parent?.ref ?? "",
      initiative_ref: current.initiative_ref ?? "",
      evidence_refs: (current.evidence_refs ?? []).join(", "),
      labels_raw: current.labels ?? [],
      estimate_raw: current.estimate_days ?? null,
      evidence_raw: current.evidence_refs ?? []
    };
    setBaseline(record);
    return record;
  };
  const isDirty = Boolean(draft && baseline && (draft.title !== baseline.title || draft.type !== baseline.type || draft.body !== (baseline.body ?? "") || draft.labels !== baseline.labels || draft.estimate_days !== baseline.estimate_days || draft.due !== baseline.due || draft.parent_ref !== baseline.parent_ref || draft.initiative_ref !== baseline.initiative_ref || draft.evidence_refs !== baseline.evidence_refs || (draft.assignee ?? "") !== (baseline.assignee ?? "") || draft.status !== baseline.status));
  const undoChanges = () => {
    if (baseline) {
      setDraft({ ...baseline });
      setParentReason("");
      setConfirmDiscard(false);
      setError(null);
    }
  };
  useEffect(() => {
    if (!item) {
      setDraft(null);
      setDetail(null);
      setBaseline(null);
      setFeedback(null);
      setError(null);
      return;
    }
    setDraft({
      title: item.title ?? "",
      type: item.type ?? "task",
      assignee: item.assignee ?? "",
      status: item.status ?? "backlog",
      body: item.body ?? "",
      labels: (item.labels ?? []).join(", "),
      estimate_days: item.estimate_days == null ? "" : String(item.estimate_days),
      due: item.due ?? "",
      parent_ref: item.parent_task_id ?? item.parent_ref ?? "",
      initiative_ref: item.initiative_ref ?? "",
      evidence_refs: (item.evidence_refs ?? []).join(", ")
    });
    setBaseline({
      title: item.title ?? "",
      type: item.type ?? "task",
      assignee: item.assignee ?? "",
      status: item.status ?? "backlog",
      body: item.body ?? "",
      labels: (item.labels ?? []).join(", "),
      estimate_days: item.estimate_days == null ? "" : String(item.estimate_days),
      due: item.due ?? "",
      parent_ref: item.parent_task_id ?? item.parent_ref ?? "",
      initiative_ref: item.initiative_ref ?? "",
      evidence_refs: (item.evidence_refs ?? []).join(", "),
      labels_raw: item.labels ?? [],
      estimate_raw: item.estimate_days ?? null,
      evidence_raw: item.evidence_refs ?? []
    });
    setDetail(null);
    setParentReason("");
    setFeedback(null);
    setError(null);
  }, [item]);
  useEffect(() => {
    if (!item) return void 0;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (isDirty) {
        setConfirmDiscard(true);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [item, onClose, isDirty]);
  const loadDetail = (ref, guard) => {
    if (!item) return Promise.resolve(null);
    return api(`/projects/${encodeURIComponent(projectId || item.project_id)}/work-items/${encodeURIComponent(ref)}`).then((result) => {
      if (guard && !guard.current.alive) return result;
      setDetail(result);
      const record = rebaseFromDetail(result);
      if (record && !busy) setDraft((current) => current ? { ...record } : current);
      return result;
    }).catch((failure) => {
      if (!guard || guard.current.alive) {
        setDetail(null);
        setError(`Could not load item details: ${String(failure?.message ?? failure)}`);
      }
      return null;
    });
  };
  useEffect(() => {
    if (!item) return void 0;
    const guard = { current: { alive: true, ref: item.ref } };
    loadDetail(item.ref, guard);
    return () => {
      guard.current.alive = false;
    };
  }, [item?.ref, projectId]);
  const save = async () => {
    if (!item || !draft) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    const projectIdResolved = projectId || item.project_id;
    const base = baseline ?? draft;
    const changes = {};
    if (draft.title !== base.title) changes.title = draft.title;
    if (draft.type !== base.type) changes.type = draft.type;
    if (draft.body !== base.body) changes.body = draft.body || null;
    const hasFieldChanges = () => Object.keys(changes).length > 0;
    if (draft.labels !== base.labels) {
      changes.labels = draft.labels.split(",").map((v) => v.trim()).filter(Boolean);
    }
    const estimateValue = draft.estimate_days === "" ? null : Number(draft.estimate_days);
    if (estimateValue !== (base.estimate_days === "" ? null : Number(base.estimate_days))) {
      changes.estimate_days = estimateValue;
    }
    if (draft.due !== base.due) changes.due = draft.due || null;
    if (draft.parent_ref !== base.parent_ref) {
      if (parentReason.trim().length < 4) {
        setError("Changing the parent needs a reason of at least 4 characters.");
        setBusy(false);
        return;
      }
      changes.parent_ref = draft.parent_ref || null;
      changes.reason = parentReason.trim();
    }
    if (draft.initiative_ref !== base.initiative_ref) changes.initiative_ref = draft.initiative_ref || null;
    if (draft.evidence_refs !== base.evidence_refs) {
      changes.evidence_refs = draft.evidence_refs.split(",").map((v) => v.trim()).filter(Boolean);
    }
    try {
      if (hasFieldChanges()) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}`, {
          method: "PATCH",
          body: changes
        });
      }
      if ((draft.assignee ?? "") !== (base.assignee ?? "")) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}/assign`, {
          method: "POST",
          body: { assignee_id: draft.assignee.trim() || null }
        });
      }
      if (draft.status !== base.status) {
        await api(`/projects/${encodeURIComponent(projectIdResolved)}/work-items/${encodeURIComponent(item.ref)}/transition`, {
          method: "POST",
          body: { status: draft.status }
        });
      }
      await loadDetail(item.ref);
      setParentReason("");
      setFeedback("Saved.");
      await onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const addDependency = async () => {
    if (!depRef.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/projects/${encodeURIComponent(projectId || item.project_id)}/work-items/${encodeURIComponent(item.ref)}/dependencies`, {
        method: "POST",
        body: { dependency_ref: depRef.trim() }
      });
      setDepRef("");
      await loadDetail(item.ref);
      setFeedback("Dependency added.");
      await onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const [historyFilter, setHistoryFilter] = useState("all");
  const [activityExpanded, setActivityExpanded] = useState(false);
  useEffect(() => {
    setHistoryFilter("all");
    setActivityExpanded(false);
  }, [item?.ref]);
  const historyEntries = (detail?.history ?? []).filter((entry) => {
    if (historyFilter === "all") return true;
    const action = String(entry.summary || entry.action || entry.kind || "").toLowerCase();
    if (historyFilter === "status") return /status|transition|state/.test(action);
    if (historyFilter === "assignee") return /assign/.test(action);
    if (historyFilter === "fields") return !/status|transition|state|assign/.test(action);
    return true;
  });
  const detailProject = detail?.project?.title || detail?.project?.name || item?.project_name || projectId;
  const clearDue = () => {
    if (!busy && draft?.due) setDraft({ ...draft, due: "" });
  };
  const clearAssignee = () => {
    if (!busy && draft?.assignee) setDraft({ ...draft, assignee: "" });
  };
  return jsx("section", {
    className: "dockyard-modal-layer",
    "data-work-item-detail-layer": true,
    hidden: !item,
    onClick: (event) => {
      if (event.target !== event.currentTarget) return;
      if (isDirty) {
        setConfirmDiscard(true);
        return;
      }
      onClose();
    },
    children: item ? jsxs("div", {
      className: "dockyard-modal dockyard-create-modal dockyard-detail-modal",
      role: "dialog",
      "aria-modal": true,
      "aria-labelledby": "dockyard-work-item-title",
      "data-work-item-detail": item.ref,
      "data-dirty": isDirty ? "true" : void 0,
      children: [
        jsxs("header", { className: "dockyard-modal-head", children: [
          jsxs("div", { children: [
            jsx("span", { className: "dockyard-create-eyebrow", children: `Work item \xB7 ${detailProject || projectId}` }),
            jsx("h2", { id: "dockyard-work-item-title", children: "Edit backlog item" })
          ] }),
          jsx(Button, { action: "close-work-item-detail", ariaLabel: "Close work item details", onClick: () => {
            if (isDirty) {
              setConfirmDiscard(true);
            } else {
              onClose();
            }
          }, children: "Close" })
        ] }),
        confirmDiscard ? jsxs("div", { className: "dockyard-dirty-confirm", role: "alertdialog", "aria-label": "Unsaved changes", "data-discard-confirm": true, children: [
          jsx("strong", { children: "Discard unsaved changes?" }),
          jsx("p", { children: "Your edits to this work item have not been saved. Choosing discard loses them; keep editing returns you to the form." }),
          jsxs("div", { className: "dockyard-modal-actions", children: [
            jsx(Button, { action: "keep-editing", variant: "primary", onClick: () => setConfirmDiscard(false), children: "Keep editing" }),
            jsx(Button, { action: "confirm-discard", onClick: () => {
              setConfirmDiscard(false);
              onClose();
            }, children: "Discard changes" })
          ] })
        ] }) : null,
        jsxs("div", { className: "dockyard-create-body dockyard-edit-body", children: [
          jsxs("div", { className: "dockyard-create-context dockyard-edit-context", children: [
            jsx("span", { children: "Status" }),
            jsx("span", { className: `dockyard-status-dot status-${draft?.status ?? "backlog"}`, "aria-hidden": true }),
            jsx("select", {
              "aria-label": "Status",
              value: draft?.status ?? "backlog",
              onChange: (event) => setDraft({ ...draft, status: event.target.value }),
              children: ["backlog", "in_progress", "in_review", "blocked", "done"].map((status) => jsx("option", { value: status, children: readableLabel(status) }, status))
            }),
            jsxs("span", { className: "dockyard-detail-task-id", "data-task-id": taskIdText ?? void 0, children: [
              jsx("span", { children: "Task ID" }),
              jsx("code", { children: taskIdText ?? "Unavailable" })
            ] }),
            detail?.work_item?.created_by || item.created_by ? jsx("span", { children: `\xB7 Created by ${detail?.work_item?.created_by || item.created_by}` }) : null
          ] }),
          jsxs("div", { className: "dockyard-settings-grid dockyard-create-fields dockyard-edit-fields", children: [
            jsxs("label", { className: "dockyard-field dockyard-field-wide field-required", children: [jsx("span", { children: "Title" }), jsx("input", { "aria-label": "Title", value: draft?.title ?? "", onChange: (event) => setDraft({ ...draft, title: event.target.value }) })] }),
            jsxs("label", { className: "dockyard-field dockyard-field-wide", children: [jsx("span", { children: "Description (optional)" }), jsx("textarea", { "aria-label": "Body", rows: 3, placeholder: "Describe the outcome and acceptance criteria\u2026", value: draft?.body ?? "", onChange: (event) => setDraft({ ...draft, body: event.target.value }) })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Parent (optional)" }), jsx("select", { "aria-label": "Parent", value: draft?.parent_ref ?? "", onChange: (event) => setDraft({ ...draft, parent_ref: event.target.value }), children: [
              jsx("option", { value: "", children: "Top level" }, "none"),
              ...(detail?.parent_choices ?? []).map((choice) => jsx("option", { value: choice.ref, children: `${choice.ref} \xB7 ${choice.title}` }, choice.ref)),
              draft?.parent_ref && !(detail?.parent_choices ?? []).some((choice) => choice.ref === draft.parent_ref) ? jsx("option", { value: draft.parent_ref, children: draft.parent_ref }, "current-parent") : null
            ] })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Due date (optional)" }), jsx("input", { type: "date", "aria-label": "Due date", value: draft?.due ?? "", onChange: (event) => setDraft({ ...draft, due: event.target.value }) })] }),
            draft && baseline && draft.parent_ref !== baseline.parent_ref ? jsxs("label", { className: "dockyard-field dockyard-field-wide", children: [jsx("span", { children: "Reason for changing parent *" }), jsx("input", { "aria-label": "Reason for changing parent", value: parentReason, placeholder: "Required for the audit trail", onChange: (event) => setParentReason(event.target.value) })] }) : null,
            jsxs("label", { className: "dockyard-field field-required", children: [jsx("span", { children: "Type" }), jsx("select", {
              "aria-label": "Type",
              value: draft?.type ?? "task",
              onChange: (event) => setDraft({ ...draft, type: event.target.value }),
              children: [.../* @__PURE__ */ new Set([draft?.type || "task", "task", "bug", "spike", "subtask", "gate", "feature"])].map((kind) => jsx("option", { value: kind, children: readableLabel(kind) }, kind))
            })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Estimated days (optional)" }), jsx("input", { type: "number", min: 0, step: 0.5, "aria-label": "Estimated days", placeholder: "e.g. 2.5", value: draft?.estimate_days ?? "", onChange: (event) => setDraft({ ...draft, estimate_days: event.target.value }) })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Assignee (optional)" }), jsx("select", { "aria-label": "Assignee", value: draft?.assignee ?? "", disabled: busy, onChange: (event) => setDraft({ ...draft, assignee: event.target.value }), children: [
              jsx("option", { value: "", children: "Unassigned" }, "none"),
              ...(profiles ?? []).filter((profile) => profile.slug || profile.id || profile.name).map((profile) => {
                const value = profile.slug || profile.id || profile.name;
                return jsx("option", { value, disabled: profile.available === false && value !== draft?.assignee, children: profile.display_name || profile.name || value }, value);
              }),
              draft?.assignee && !(profiles ?? []).some((profile) => (profile.slug || profile.id || profile.name) === draft.assignee) ? jsx("option", { value: draft.assignee, children: `${draft.assignee} (current)` }, "current-assignee") : null
            ] })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { className: "field-optional-hint", children: "Initiative" }), jsx("select", { "aria-label": "Initiative", value: draft?.initiative_ref ?? "", onChange: (event) => setDraft({ ...draft, initiative_ref: event.target.value }), children: [
              jsx("option", { value: "", children: "No initiative" }, "none"),
              ...initiatives.map((initiative) => jsx("option", { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref)),
              draft?.initiative_ref && !initiatives.some((initiative) => initiative.ref === draft.initiative_ref) ? jsx("option", { value: draft.initiative_ref, children: `${draft.initiative_ref} (current)` }, "current-initiative") : null
            ] })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Evidence refs (optional)" }), jsx("input", { "aria-label": "Evidence refs", placeholder: "Comma-separated refs", value: draft?.evidence_refs ?? "", onChange: (event) => setDraft({ ...draft, evidence_refs: event.target.value }) })] }),
            jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Labels (optional)" }), jsx("input", { "aria-label": "Labels", placeholder: "Comma-separated labels", value: draft?.labels ?? "", onChange: (event) => setDraft({ ...draft, labels: event.target.value }) })] }),
            jsxs("div", { className: "dockyard-edit-backlog-fields dockyard-field-wide", children: [
              jsxs("span", { children: ["Current rank: ", jsx("strong", { children: detail?.work_item?.priority_rank ?? item.priority_rank ?? "Not ranked" })] }),
              jsxs("span", { children: ["Priority reason: ", jsx("strong", { children: detail?.work_item?.priority_reason || item.priority_reason || "Not recorded" })] }),
              jsx("small", { children: "Change rank from the backlog table; a new priority reason is required there." })
            ] })
          ] }),
          detail ? jsxs("div", { className: "dockyard-edit-dependencies", "data-dependency-editor": true, children: [
            jsxs("strong", { children: ["Dependencies", ` \xB7 ${(detail.dependencies ?? []).length}`] }),
            (detail.dependencies ?? []).length ? jsx("ul", { children: detail.dependencies.map((dependency) => jsx("li", { children: `${dependency.ref} \xB7 ${dependency.title}` }, dependency.ref)) }) : jsx("span", { children: "None recorded" }),
            jsx("input", { "aria-label": "Dependency task ref", placeholder: "Task ref, e.g. HDY-4", value: depRef, onChange: (event) => setDepRef(event.target.value) }),
            jsx(Button, { action: "add-dependency", variant: "quiet", disabled: busy || !depRef.trim(), onClick: addDependency, children: "Add" })
          ] }) : null,
          error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null
        ] }),
        // Approved reference: the Activity timeline is a full-width section
        // below the field columns, with an 'All activity' scope dropdown.
        detail ? jsxs("section", { className: "dockyard-detail-activity", "data-work-history": true, "aria-label": "Task activity", children: [
          jsxs("div", { className: "dockyard-detail-activity-head", children: [
            jsx("h3", { children: `Activity \xB7 ${historyEntries.length}` }),
            jsxs("div", { className: "dockyard-activity-actions", children: [
              historyEntries.length > 2 ? jsx("button", { type: "button", className: "dockyard-activity-expand", "aria-expanded": activityExpanded, onClick: () => setActivityExpanded(!activityExpanded), children: activityExpanded ? "Show less" : `View all ${historyEntries.length}` }) : null,
              jsx("label", { className: "dockyard-activity-scope", children: [
                jsxs("span", { className: "dockyard-field-shell dockyard-activity-scope-shell", children: [
                  jsx(Icon, { name: "filter" }),
                  jsx("select", { "data-activity-scope": true, "aria-label": "Activity scope", value: historyFilter, onChange: (event) => {
                    setHistoryFilter(event.target.value);
                    setActivityExpanded(false);
                  }, children: [
                    jsx("option", { value: "all", children: "All activity" }, "all"),
                    jsx("option", { value: "status", children: "Status changes" }, "status"),
                    jsx("option", { value: "assignee", children: "Assignment" }, "assignee"),
                    jsx("option", { value: "fields", children: "Field edits" }, "fields")
                  ] })
                ] })
              ] })
            ] })
          ] }),
          detail === null ? jsx("p", { className: "dockyard-meta", children: "Loading recorded activity\u2026" }) : historyEntries.length ? jsx("ol", { className: "dockyard-history-list", children: (activityExpanded ? historyEntries : historyEntries.slice(0, 2)).map((entry, index) => {
            const rawAction = String(entry.summary || entry.action || entry.kind || "workitem.updated");
            const detail2 = entry.detail && typeof entry.detail === "object" ? entry.detail : {};
            const changes = Array.isArray(detail2.changes) ? detail2.changes : /transition/.test(rawAction) && Object.hasOwn(detail2, "from") ? [{ field: "status", from: detail2.from, to: detail2.to }] : /assigned/.test(rawAction) && Object.hasOwn(detail2, "from") ? [{ field: "assignee", from: detail2.from, to: detail2.to }] : /dependency_added/.test(rawAction) ? [{ field: "dependencies", from: null, to: detail2.dependency }] : /dependency_removed/.test(rawAction) ? [{ field: "dependencies", from: detail2.dependency, to: null }] : [];
            const action = /workitem\.updated/.test(rawAction) ? "Updated fields" : /workitem\.transition/.test(rawAction) ? "Status changed" : /workitem\.assigned/.test(rawAction) ? "Assignee changed" : /dependency_added/.test(rawAction) ? "Dependency added" : /dependency_removed/.test(rawAction) ? "Dependency removed" : rawAction.replace(/[._]/g, " ");
            const fieldNames = { title: "Title", body: "Description", type: "Type", parent_ref: "Parent", initiative_ref: "Initiative", labels: "Labels", evidence_refs: "Evidence refs", estimate_days: "Estimate", due: "Due date", status: "Status", assignee: "Assignee", dependencies: "Dependency" };
            const valueText = (value, field) => Array.isArray(value) ? value.length ? value.join(", ") : "\u2014" : value === null || value === void 0 || value === "" ? "\u2014" : ["status", "type"].includes(field) ? readableLabel(value) : String(value);
            const actor = entry.actor_id || entry.actor || entry.verified_actor || "Actor not recorded";
            const at = entry.ts || entry.created_at || entry.at;
            return jsxs("li", { children: [
              jsx("strong", { children: action }),
              jsx("span", { children: `${actor}${at ? ` \xB7 ${formatWhen(at)}` : ""}` }),
              changes.length ? jsx("ul", { className: "dockyard-history-changes", children: changes.map((change, changeIndex) => jsxs("li", { className: "dockyard-history-change", children: [
                jsx("strong", { children: fieldNames[change.field] || readableLabel(change.field) }),
                jsx("span", { className: "dockyard-history-from", title: valueText(change.from, change.field), children: valueText(change.from, change.field) }),
                jsx("span", { className: "dockyard-history-arrow", "aria-label": "changed to", children: "\u2192" }),
                jsx("span", { className: "dockyard-history-to", title: valueText(change.to, change.field), children: valueText(change.to, change.field) })
              ] }, `${change.field}-${changeIndex}`)) }) : null,
              !changes.length && detail2.fields?.length ? jsx("span", { className: "dockyard-history-legacy", children: `Changed: ${detail2.fields.map((field) => fieldNames[field] || readableLabel(field)).join(", ")} (previous value not recorded)` }) : null,
              detail2.reason ? jsx("span", { children: `Reason: ${detail2.reason}` }) : null
            ] }, String(entry.id ?? index));
          }) }) : jsx("p", { className: "dockyard-meta", children: (detail?.history ?? []).length ? "No entries match this scope." : "No recorded activity for this item yet." })
        ] }) : null,
        jsxs("div", { className: "dockyard-form-actions dockyard-detail-footer", children: [
          // Approved reference: Cancel sits on the left; 'Unsaved changes' and
          // the primary Save sit on the right. Cancel discards via the same
          // guarded path as Escape (dirty edits ask first).
          jsx(Button, {
            action: "cancel-work-item-detail",
            onClick: () => {
              if (isDirty) {
                setConfirmDiscard(true);
              } else {
                onClose();
              }
            },
            disabled: busy,
            children: "Cancel"
          }),
          jsxs("span", { className: "dockyard-detail-footer-right", children: [
            isDirty ? jsxs("span", { className: "dockyard-edit-unsaved", role: "status", "data-dirty-banner": true, children: [
              jsx("span", { children: "Unsaved changes" }),
              jsx(Button, { small: true, action: "undo-work-item-changes", disabled: busy, onClick: undoChanges, children: "Undo" })
            ] }) : null,
            jsx(Button, {
              action: "save-work-item",
              variant: "primary",
              disabled: busy || !isDirty,
              onClick: save,
              children: busy ? "Saving..." : "Save changes"
            }),
            feedback ? jsx("span", { role: "status", children: feedback }) : null
          ] })
        ] })
      ]
    }) : null
  });
}
function ObjectiveEvidence({ objective, projectId, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const evidence = objective.evidence || {};
  const state = objective.enabled === false ? "not_applicable" : evidence.state || "unknown";
  const save = async (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/objectives/${objective.id}/assessment`, {
        method: "POST",
        body: { passed: fields.get("result") === "passed", evidence: [String(fields.get("evidence") || "")], detail: String(fields.get("detail") || ""), expires_at: fields.get("expiry") ? new Date(String(fields.get("expiry"))).toISOString() : null }
      });
      await onSaved();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  return jsxs("details", { "data-objective-evidence": objective.id, children: [
    jsx("summary", { children: `Result: ${readableLabel(state)} \xB7 Evidence/history` }),
    jsx("p", { children: evidence.detail || "Insufficient data: no recorded evidence." }),
    jsx("p", { children: `Evidence age: ${evidence.evidence_age_seconds == null ? "unavailable" : Math.floor(evidence.evidence_age_seconds) + " seconds"} \xB7 Window: ${objective.window || "30d"} \xB7 Samples: ${evidence.sample_count || 0} \xB7 Pass rate: ${evidence.pass_rate == null ? "insufficient data" : Math.round(evidence.pass_rate * 100) + "%"}` }),
    jsx("ul", { children: (evidence.history || []).map((sample, index) => jsx("li", { children: `${sample.recorded_at} \xB7 ${sample.state} \xB7 ${sample.verified_actor || sample.actor || sample.source_evidence?.source || "objective evaluator"}${sample.source === "evaluate-now" ? " (Evaluate now)" : ""} \xB7 ${sample.detail || ""} \xB7 ${JSON.stringify(sample.evidence || sample.source_evidence || {})}` }, index)) }),
    objective.evaluator_type === "manual" && objective.enabled !== false ? jsxs("form", { onSubmit: save, children: [
      jsxs("label", { children: ["Result ", jsx("select", { name: "result", children: ["passed", "failed"].map((value) => jsx("option", { value, children: value }, value)) })] }),
      jsxs("label", { children: ["Evidence reference ", jsx("input", { name: "evidence", required: true, maxLength: 500 })] }),
      jsxs("label", { children: ["Assessment note ", jsx("input", { name: "detail", maxLength: 2e3 })] }),
      jsxs("label", { children: ["Expires at (local time) ", jsx("input", { name: "expiry", type: "datetime-local" })] }),
      jsx("button", { type: "submit", disabled: busy || !objective.can_record_assessment, children: busy ? "Saving and verifying\u2026" : "Record human assessment" }),
      !objective.can_record_assessment ? jsx("p", { children: "Read-only: a dedicated authenticated human principal is required to record assessments." }) : null
    ] }) : null,
    error ? jsx("p", { role: "alert", children: error }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/backlog-import-wizard.js
function BacklogImportWizard(props) {
  const {
    project,
    importOpen,
    importStep,
    importText,
    importMode,
    importRows,
    importValid,
    importError,
    importBusy,
    importResult,
    importSelected,
    importWarningsOnly,
    importColumnMetadata,
    setImportMode,
    setImportText,
    setImportRows,
    setImportValid,
    setImportError,
    setImportBusy,
    setImportStep,
    setImportSelected,
    closeImport,
    parseImport,
    runImport,
    api: api2
  } = props;
  return !window.__V4_DISABLE?.has("wizard") ? jsxs("section", { className: "dockyard-modal-layer", "data-bulk-import-layer": true, hidden: !importOpen, children: [
    jsxs("div", { className: "dockyard-modal dockyard-onboarding", role: "dialog", "aria-modal": true, "aria-labelledby": "dockyard-import-title", children: [
      jsxs("header", { className: "dockyard-onboarding-head", children: [
        jsxs("div", { children: [
          jsx("h2", { id: "dockyard-import-title", children: "Bulk import backlog items" }),
          jsx("p", { children: `Import into ${project.name || project.id}. Paste JSON or choose a CSV file, validate every row, then confirm. No rows are written during preview.` })
        ] }),
        jsx("button", { type: "button", className: "dockyard-modal-close", "aria-label": "Close bulk import", onClick: closeImport, children: "\xD7" })
      ] }),
      jsx("div", {
        className: "dockyard-wizard-progress",
        role: "progressbar",
        "aria-label": "Import progress",
        "aria-valuemin": 1,
        "aria-valuemax": 3,
        "aria-valuenow": importStep,
        children: [["Source", "Upload or paste"], ["Preview", "Validate every row"], ["Result", "Commit outcome"]].map(([label, detail], index) => jsxs("div", { className: index + 1 < importStep ? "complete" : index + 1 === importStep ? "active" : "", children: [
          jsx("span", { children: index + 1 < importStep ? "\u2713" : number(index + 1) }),
          jsxs("span", { children: [jsx("strong", { children: label }), jsx("small", { children: detail })] })
        ] }, label))
      }),
      jsxs("div", { className: "dockyard-wizard-body", children: [
        jsxs("div", { className: importStep === 1 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: importStep !== 1, "data-import-step": "1", children: [
          jsx("h3", { children: "Add your source" }),
          jsx("p", { className: "import-source-hint", children: "Required: row_key, type, title. Other supported columns are optional; open Column reference for formats and examples." }),
          jsxs("div", { className: "dockyard-tabs", role: "tablist", children: [
            jsx("button", { type: "button", role: "tab", "aria-selected": String(importMode === "csv"), className: importMode === "csv" ? "active" : "", onClick: () => {
              setImportMode("csv");
              setImportRows(null);
            }, children: "CSV" }),
            jsx("button", { type: "button", role: "tab", "aria-selected": String(importMode === "json"), className: importMode === "json" ? "active" : "", onClick: () => {
              setImportMode("json");
              setImportRows(null);
            }, children: "JSON" })
          ] }),
          jsx("textarea", {
            "data-import-input": true,
            "aria-label": "CSV or JSON import content",
            spellCheck: false,
            value: importText,
            onInput: (event) => {
              setImportText(event.target.value);
              setImportRows(null);
              setImportValid(false);
              setImportError(null);
            },
            placeholder: importMode === "json" ? '[{"row_key":"release-1","type":"task","title":"Verify release checklist","estimate_days":2}]' : "row_key,type,title,parent_key,labels,estimate_days,due\nrelease-1,task,Verify release checklist,,,2,"
          }),
          jsx("div", { className: "import-source-divider", "aria-hidden": true, children: "or upload a file" }),
          jsxs("div", { className: "dockyard-import-actions-row", children: [
            importMode === "csv" ? jsxs("div", {
              className: "import-drop",
              "data-import-drop": true,
              onDragOver: (event) => {
                event.preventDefault();
                event.currentTarget.classList.add("dragover");
              },
              onDragLeave: (event) => event.currentTarget.classList.remove("dragover"),
              onDrop: (event) => {
                event.preventDefault();
                event.currentTarget.classList.remove("dragover");
                const file = event.dataTransfer?.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setImportMode("csv");
                  setImportText(String(reader.result ?? ""));
                  setImportRows(null);
                  setImportError(null);
                };
                reader.readAsText(file);
              },
              children: [
                jsx(Icon, { name: "upload" }),
                jsx("strong", { children: "Choose a CSV file or drop it here" }),
                jsx("small", { children: "CSV only. File contents appear above before validation." }),
                jsx("input", { type: "file", accept: ".csv,text/csv", "aria-label": "Choose CSV file", onChange: (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setImportMode("csv");
                    setImportText(String(reader.result ?? ""));
                    setImportRows(null);
                    setImportValid(false);
                    setImportError(null);
                  };
                  reader.onerror = () => setImportError("Could not read the selected CSV file.");
                  reader.readAsText(file);
                } })
              ]
            }) : jsx("div", { className: "create-help", children: "JSON is paste-only. Use an array of objects with row_key, type and title; optional parent_key, labels, estimate_days and due." }),
            jsx(Button, { action: "import-download-template", small: true, onClick: () => {
              const fallback = ["row_key,type,title,parent_key,labels,estimate_days,due", "epic-1,epic,Partner API v3,,,,", "feature-1,feature,Usage dashboard,,,", "task-1,task,Rotation cron,feature-1,,3,2026-10-01", "bug-1,bug,Login 500 on expired token,,,,"].join(String.fromCharCode(10));
              api2(`/projects/${encodeURIComponent(project.id)}/backlog/import-template`).then((template) => {
                const csv = String(template?.csv ?? fallback);
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "backlog-import-template.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
              }).catch(() => {
                const blob = new Blob([fallback], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "backlog-import-template.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
              });
            }, children: [jsx(Icon, { name: "download" }), "Download CSV template"] })
          ] }),
          importColumnMetadata.length ? jsxs("details", { className: "import-column-reference", children: [
            jsx("summary", { children: `Column reference \xB7 ${importColumnMetadata.filter((column) => column.required).map((column) => column.name).join(", ")} required \xB7 ${importColumnMetadata.length} supported` }),
            jsxs("div", { className: "import-column-scroll", children: [
              jsx("table", { children: [
                jsx("thead", { children: jsx("tr", { children: ["Column", "Requirement", "Description", "Format / example"].map((heading) => jsx("th", { children: heading }, heading)) }) }),
                jsx("tbody", { children: importColumnMetadata.map((column) => jsx("tr", { children: [jsx("td", { children: jsx("code", { children: column.name }) }), jsx("td", { children: jsx("span", { className: column.required ? "import-required" : "import-optional", children: column.required ? "Required" : "Optional" }) }), jsx("td", { children: column.description }), jsx("td", { children: `${column.format} \xB7 ${column.example}` })] }, column.name)) })
              ] })
            ] })
          ] }) : jsx("p", { className: "dockyard-meta", children: "Column reference unavailable. Download the server template before importing." }),
          importError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: importError }) : null
        ] }),
        importRows && importRows.length ? jsxs("div", { className: importStep === 2 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: importStep !== 2, "data-import-step": "2", children: [
          jsx("h3", { children: "Review before writing" }),
          // Approved design: four validation summary cards + warnings-only
          // toggle. Warnings never block; errors do.
          jsxs("div", { className: "import-summary", "data-import-summary": true, children: [
            jsxs("div", { className: "import-stat", children: [jsx("strong", { children: importRows.length }), jsx("span", { children: importRows.length === 1 ? "row detected" : "rows detected" })] }),
            jsxs("div", { className: "import-stat valid", children: [jsx(Icon, { name: "circle-check" }), jsxs("span", { children: [jsx("strong", { children: importRows.filter((row) => !row.problems.length).length }), " valid"] })] }),
            jsxs("div", { className: "import-stat warn", children: [jsx(Icon, { name: "triangle-alert" }), jsxs("span", { children: [jsx("strong", { children: importRows.filter((row) => row.warnings.length).length }), " warning", importRows.filter((row) => row.warnings.length).length === 1 ? "" : "s"] })] }),
            jsxs("div", { className: "import-stat errored", children: [jsx(Icon, { name: "alert" }), jsxs("span", { children: [jsx("strong", { children: importRows.filter((row) => row.errors.length).length }), " error", importRows.filter((row) => row.errors.length).length === 1 ? "" : "s"] })] })
          ] }),
          jsxs("div", { className: "import-review-toolbar", children: [
            jsx("p", { className: "dockyard-meta", children: importValid ? "Server validation passed. Preview only: no items have been written." : "Server validation found row errors. Nothing can be imported until they are fixed." }),
            jsxs("label", { className: "import-warnings-toggle", children: [
              jsx("input", { type: "checkbox", "data-warnings-toggle": true, checked: importWarningsOnly, onChange: (event) => setImportWarningsOnly(event.target.checked) }),
              "Show issues only"
            ] })
          ] }),
          !importValid ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: "Correct every row error in the source, then validate again." }) : null,
          importError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: importError }) : null,
          // Approved design: split pane — left: per-row table with validation
          // badges; right: selected row's parsed values and will-import-as.
          jsxs("div", { className: "import-split", "data-import-split": true, children: [
            jsx("ul", { "data-import-preview": true, children: importRows.filter((row) => !importWarningsOnly || row.problems.length).map((row) => jsxs("li", {
              className: [row.errors.length ? "has-error" : "", row.warnings.length ? "has-warning" : "", importSelected === row.idx ? "selected" : ""].filter(Boolean).join(" "),
              "data-import-row": row.idx,
              onClick: () => setImportSelected(row.idx),
              children: [
                jsx("strong", { children: row.type || "Unknown" }),
                jsx("span", { children: row.title || "Untitled row" }),
                row.errors.length ? jsx("span", { className: "import-badge error", children: "Error" }) : row.warnings.length ? jsx("span", { className: "import-badge warning", children: "Warning" }) : jsx("span", { className: "import-badge ok", "data-import-badge": "ready", children: "Ready" }),
                row.problems.length ? jsx("span", { className: "import-row-error", children: row.problems.join("; ") }) : null
              ]
            }, row.idx)) }),
            (() => {
              const selectedRow = (importRows ?? []).find((row) => row.idx === importSelected) ?? importRows.find((row) => row.problems.length) ?? importRows[0];
              return jsxs("aside", { className: "import-row-detail", "data-import-row-detail": true, children: [
                jsxs("h4", { children: [
                  "Row validation",
                  selectedRow.rowKey ? jsx("span", { className: "dockyard-meta", children: ` \xB7 ${selectedRow.rowKey}` }) : null,
                  selectedRow.errors.length ? jsx("span", { className: "import-badge error", children: "Error" }) : selectedRow.warnings.length ? jsx("span", { className: "import-badge warning", children: "Warning" }) : jsx("span", { className: "import-badge ok", children: "Ready" })
                ] }),
                selectedRow.errors.length ? jsx("p", { className: "dockyard-inline-error", children: selectedRow.errors.join("; ") }) : selectedRow.warnings.length ? jsx("p", { className: "import-warning-text", children: selectedRow.warnings.join("; ") }) : jsx("p", { className: "dockyard-meta", children: "No validation problems for this row." }),
                jsxs("div", { className: "import-parsed", children: [
                  jsx("strong", { children: "Parsed values (from CSV)" }),
                  jsx("dl", { children: [
                    jsxs("div", { children: [jsx("dt", { children: "Type" }), jsx("dd", { children: selectedRow.type || "task" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Title" }), jsx("dd", { children: selectedRow.title || "\u2014" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Parent" }), jsx("dd", { children: selectedRow.parent || "\u2014" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Labels" }), jsx("dd", { children: selectedRow.labels || "\u2014" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Estimate" }), jsx("dd", { children: selectedRow.estimate || "\u2014" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Due" }), jsx("dd", { children: selectedRow.due || "\u2014" })] }),
                    jsxs("div", { children: [jsx("dt", { children: "Initiative" }), jsx("dd", { children: selectedRow.initiative || "\u2014" })] })
                  ] })
                ] }),
                jsxs("div", { className: "import-as", children: [
                  jsx("strong", { children: "Will import as" }),
                  jsx("p", { children: `${readableLabel(selectedRow.type || "task")} \u2192 ${readableLabel("backlog")}` }),
                  jsx("small", { className: "dockyard-meta", children: `A new ${selectedRow.type || "task"} will be created in ${project.name || project.id}.` })
                ] })
              ] });
            })()
          ] })
        ] }) : null,
        importResult ? jsxs("div", { className: importStep === 3 ? "dockyard-wizard-step active" : "dockyard-wizard-step", hidden: importStep !== 3, "data-import-step": "3", children: [
          jsx("h3", { children: importResult.written ? "Import complete" : "No items imported" }),
          jsxs("p", { role: "status", children: [
            `Imported ${importResult.written} item${importResult.written === 1 ? "" : "s"}.`,
            importResult.failed.length ? ` ${importResult.failed.length} row(s) failed: ${importResult.failed.join(" | ")}` : ""
          ] }),
          importResult.items?.length ? jsxs("div", { className: "import-result-refs", children: [
            jsx("strong", { children: "Created work items" }),
            jsx("ul", { children: importResult.items.map((created) => jsx("li", { children: `${created.row_key} \u2192 ${created.ref}` }, created.row_key)) })
          ] }) : null
        ] }) : null
      ] }),
      jsxs("footer", { className: "dockyard-wizard-actions", children: [
        // Approved design: Cancel (and Back to source) on the left; the
        // primary forward action on the right.
        jsxs("span", { className: "dockyard-wizard-actions-left", children: [
          importStep !== 3 ? jsx(Button, { onClick: closeImport, children: "Cancel" }) : null,
          importStep === 2 && !importResult ? jsx(Button, { onClick: () => setImportStep(1), children: "Back to source" }) : null,
          importStep === 3 && importResult ? jsx(Button, { onClick: () => setImportStep(1), children: "Back to source" }) : null
        ] }),
        jsxs("span", { className: "dockyard-wizard-actions-right", children: [
          importStep === 1 ? jsx(Button, { action: "import-next", variant: "primary", disabled: importBusy, onClick: () => parseImport(true), children: importBusy ? "Validating\u2026" : "Validate and preview \u2192" }) : null,
          importStep === 2 ? importValid ? jsx(Button, { action: "confirm-bulk-import", variant: "primary", disabled: importBusy, onClick: runImport, children: importBusy ? "Importing..." : `Import ${importRows.length} item${importRows.length === 1 ? "" : "s"} \u2192` }) : jsx("button", { type: "button", className: "dockyard-button primary", disabled: true, "data-import-blocked": true, children: "Import blocked \u2014 fix row errors first" }) : null,
          importStep === 3 && importResult ? jsx(Button, { variant: "primary", onClick: closeImport, children: "Done" }) : null
        ] })
      ] })
    ] })
  ] }) : null;
}

// hermes_dockyard_plugin/desktop/src/views/backlog-model.js
var DOCKYARD_TYPE_NAMES = ["epic", "feature", "task", "subtask", "bug", "spike", "initiative"];
var DOCKYARD_EDITABLE_TYPES = ["task", "subtask", "bug", "spike"];
var DOCKYARD_ROOT_TYPES = ["epic", "task", "bug", "spike"];
var DOCKYARD_CREATE_CHILD_TYPES = Object.freeze({
  epic: ["task", "subtask", "bug", "spike"],
  feature: ["task", "subtask"],
  initiative: ["subtask"],
  task: ["subtask"],
  bug: ["subtask"],
  spike: [],
  subtask: []
});
var DOCKYARD_ALLOWED_CHILDREN = Object.freeze({
  epic: ["feature", "task", "subtask", "bug", "spike", "initiative"],
  feature: ["task", "subtask"],
  initiative: ["subtask"],
  task: ["subtask"],
  bug: ["subtask"],
  spike: [],
  subtask: []
});
var dockyardTypeLabel = (type) => ({ epic: "Epic", initiative: "Initiative", feature: "Feature", task: "Task", subtask: "Sub-task", bug: "Bug", spike: "Spike" })[type] || readableLabel(type || "task");
var dockyardChildTypes = (parentType) => DOCKYARD_CREATE_CHILD_TYPES[parentType] ?? [];
var dockyardParentAccepts = (parentType, childType) => (DOCKYARD_ALLOWED_CHILDREN[parentType] ?? []).includes(childType);

// hermes_dockyard_plugin/desktop/src/views/backlog-reason-modal.js
function BacklogReasonModal(props) {
  const {
    pendingMove,
    reason,
    setReason,
    error,
    saving,
    pendingParentItem,
    pendingParentRef,
    pendingParentChoices,
    pendingParentChanged,
    saveParent,
    saveMove,
    setPendingMove
  } = props;
  return jsxs("section", { className: "dockyard-modal-layer", "data-reason-modal": true, hidden: !pendingMove, children: [
    jsxs("div", { className: "dockyard-modal", role: "dialog", "aria-modal": true, "aria-labelledby": "dockyard-reason-title", children: [
      jsx("h2", { id: "dockyard-reason-title", children: pendingMove?.mode === "parent" ? "Re-parent item" : "Record the reason" }),
      jsx("p", { children: pendingMove ? pendingMove.mode === "parent" ? `Change what \u201C${pendingMove.title}\u201D sits under. The move is audited.` : `Move ${pendingMove.title} to rank ${pendingMove.newRank}.` : "" }),
      pendingMove?.mode === "parent" ? jsxs("label", { children: [
        jsx("span", { children: "New parent" }, "np-label"),
        jsx("select", {
          id: "dockyard-parent-select",
          value: pendingParentRef,
          onChange: (event) => setPendingMove((current) => ({ ...current, parent_ref: event.target.value })),
          children: [
            pendingParentItem?.type !== "subtask" ? jsx("option", { value: "", children: "No parent \xB7 top level" }, "none") : null,
            ...pendingParentChoices.map((parent) => jsx("option", { value: parent.ref, children: `${parent.title || parent.ref} \xB7 ${dockyardTypeLabel(parent.type)}` }, parent.ref))
          ]
        }, "np-select")
      ] }) : null,
      jsx("label", { htmlFor: "dockyard-rank-reason", children: pendingMove?.mode === "parent" ? "Reason for re-parenting" : "Reason for this priority change" }),
      jsx("textarea", { id: "dockyard-rank-reason", value: reason, onChange: (event) => setReason(event.target.value), placeholder: pendingMove?.mode === "parent" ? "Explain why this parent is the right fit." : "Explain why this rank is right for the project." }),
      jsx("p", { className: "dockyard-form-hint", children: "Enter at least 4 characters; this reason is stored in the audit history." }),
      error ? jsx("p", { className: "dockyard-inline-error", children: error }) : null,
      jsxs("div", { className: "dockyard-modal-actions", children: [
        jsx(Button, { onClick: () => setPendingMove(null), children: "Cancel" }),
        pendingMove?.mode === "parent" ? jsx(Button, { variant: "primary", disabled: saving || !pendingParentChanged || reason.trim().length < 4, onClick: saveParent, children: saving ? "Saving..." : "Save parent change" }) : jsx(Button, { variant: "primary", disabled: saving || reason.trim().length < 4, onClick: saveMove, children: saving ? "Saving..." : "Save rank change" })
      ] })
    ] })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/backlog-board.js
function BacklogBoard(ctx) {
  const {
    ROOT_TYPES,
    STATUS_LABELS,
    STATUS_OPTIONS,
    STATUS_UI,
    TYPE_NAMES,
    activeFilterCount,
    assignItem,
    assigneeFilterValues,
    availableCreateParents,
    availableCreateTypes,
    branchMatch,
    bulkBusy,
    bulkError,
    bulkOperation,
    bulkPreview,
    bulkSameSource,
    bulkSelected,
    canCreate,
    cellError,
    changeStatus,
    changeType,
    childTypesFor,
    childrenOf,
    closeImport,
    cmMenu,
    collapsedSet,
    columnFilters,
    commitRank,
    commitTitle,
    createError,
    createForm,
    createOpen,
    createSaving,
    createTouched,
    createValid,
    detailItem,
    draggedRef,
    editing,
    entries,
    error,
    executeBulk,
    flashCell,
    groupBy,
    groups,
    hasFilters,
    hasUnassignedItems,
    hiddenCols,
    importBusy,
    importColumnMetadata,
    importError,
    importMode,
    importOpen,
    importResult,
    importRows,
    importSelected,
    importStep,
    importText,
    importValid,
    importWarningsOnly,
    initiativeFilterValues,
    initiativeLabel,
    maxInitialRank,
    menuRef,
    onRefresh,
    openCreate,
    ownerLabel,
    parentOf,
    parentRefOf,
    parseImport,
    pendingMove,
    pendingParentChanged,
    pendingParentChoices,
    pendingParentItem,
    pendingParentRef,
    previewBulk,
    project,
    q,
    reason,
    refreshTransfer,
    reparentTargets,
    requestMove,
    requestReparent,
    resetFilters,
    retryBulk,
    retryTransfer,
    runImport,
    saveCreate,
    saveMove,
    saveParent,
    saving,
    search,
    selectedEligible,
    setBulkError,
    setBulkOperation,
    setBulkPreview,
    setBulkReplacement,
    setBulkSelected,
    setCmMenu,
    setColumnFilters,
    setCreateOpen,
    setDetailItem,
    setDraggedRef,
    setEditing,
    setGroupBy,
    setImportBusy,
    setImportError,
    setImportMode,
    setImportOpen,
    setImportResult,
    setImportRows,
    setImportSelected,
    setImportStep,
    setImportText,
    setImportValid,
    setMenuRef,
    setPendingMove,
    setReason,
    setSearch,
    setSortDir,
    setSortKey,
    sortDir,
    sortHeader,
    sortKey,
    sortLabels,
    statusChoicesFor,
    statusFilterValues,
    todayISO,
    toggleBulk,
    toggleCollapse,
    transfers,
    treeRows,
    typeChoicesFor,
    typeFilterValues,
    typeLabel,
    updateCreate,
    view,
    workByRef
  } = ctx;
  return jsxs("div", { "data-backlog-board": project.id, children: [
    jsx(PageHead, {
      title: "Backlog",
      description: "One ranked queue for what should happen next.",
      status: `${number(entries.length)} ranked`,
      onRefresh
    }),
    jsxs("div", { className: "dockyard-project-toolbar backlog-create-toolbar", children: [
      jsx("span", { className: "dockyard-meta", children: `${project.name || project.id} / Work items` }),
      jsx(Button, { action: "open-bulk-import", small: true, disabled: !canCreate, onClick: () => {
        setImportOpen(true);
        setImportRows(null);
        setImportValid(false);
        setImportError(null);
        setImportResult(null);
        setImportStep(1);
      }, children: "Import" }),
      jsx(Button, { action: "open-create-backlog-item", variant: "primary", small: true, disabled: !canCreate, onClick: () => openCreate(), children: "Create item" })
    ] }),
    // PROTOTYPE v4: bulk reassignment now lives in the selection popover;
    // preview/execute/retry handlers unchanged.
    bulkError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: bulkError }) : null,
    bulkPreview ? jsxs("div", { className: "dockyard-view-only-note", "data-bulk-preview": bulkPreview.fingerprint, children: [
      jsx("strong", { children: `Preview \xB7 ${number(bulkPreview.enumerated_count)} items \xB7 fingerprint ${bulkPreview.fingerprint}` }),
      jsx("span", { children: `${(bulkPreview.eligible_items ?? []).length} eligible \xB7 ${(bulkPreview.excluded_items ?? []).length} excluded \xB7 confirm in the popover below` }),
      jsx("ul", { children: [...bulkPreview.eligible_items ?? [], ...bulkPreview.excluded_items ?? []].map((item) => jsx("li", { children: `${item.id} \xB7 ${item.title || ""} \xB7 ${item.status} \xB7 ${item.reason || "eligible"}` }, item.id)) })
    ] }) : null,
    bulkOperation ? jsxs("div", { className: "dockyard-view-only-note", "data-bulk-operation": bulkOperation.op_id, role: "status", children: [
      jsx("strong", { children: `${bulkOperation.op_id} \xB7 ${bulkOperation.state}` }),
      jsx("span", { children: `${(bulkOperation.items ?? []).filter((item) => item.outcome === "completed").length} of ${(bulkOperation.items ?? []).length} completed \xB7 actor ${bulkOperation.actor || "verified principal"}` }),
      jsx("ul", { children: (bulkOperation.items ?? []).map((item) => jsx("li", { children: `${item.item_id} \xB7 ${item.outcome} \xB7 ${item.audit?.actor || bulkOperation.actor || "verified principal"} \xB7 ${item.audit?.action || "audit pending"}${item.detail ? ` \xB7 ${item.detail}` : ""}` }, item.item_id)) }),
      bulkOperation.state !== "completed" ? jsx(Button, { action: "retry-bulk-reassignment", disabled: bulkBusy, small: true, onClick: retryBulk, children: "Retry remaining items" }) : null
    ] }) : null,
    Object.values(transfers).map((operation) => jsxs("div", { className: "dockyard-view-only-note", "data-transfer-operation": operation.op_id, role: "status", children: [
      jsx("strong", { children: `${operation.op_id} \xB7 ${operation.state}` }),
      jsx("span", { children: `${(operation.items ?? []).length} items \xB7 project ${operation.project_id || project.id}` }),
      jsx("button", { type: "button", "data-transfer-refresh": operation.op_id, onClick: () => refreshTransfer(operation.op_id), children: "Refresh" }),
      jsx("button", { type: "button", "data-transfer-retry": operation.op_id, onClick: () => retryTransfer(operation.op_id), children: "Retry remaining items" })
    ] }, operation.op_id)),
    entries.length > 0 ? jsxs("section", { className: "dockyard-backlog-list", "data-backlog-table": true, children: [
      !window.__V4_DISABLE?.has("cmdbar") ? jsxs("div", { className: "dockyard-cmdbar", "data-column-filters": true, children: [
        jsxs("label", { className: "cm-search", children: [
          jsx(Icon, { name: "search" }, "v4-search"),
          jsx("input", { type: "search", "data-cm-search": true, "aria-label": "Search backlog", placeholder: "Search backlog", value: search, onInput: (event) => setSearch(event.target.value) })
        ] }),
        // LANE-TOOLBAR: icon-driven Sort/Group controls with floating popover menus.
        ...[
          [
            "sort",
            "arrow-up-down",
            "Sort",
            `${sortLabels[sortKey]} ${sortDir > 0 ? "\u2191" : "\u2193"}`,
            sortKey !== "rank" || sortDir < 0,
            ["rank", "type", "title", "status", "initiative", "assignee", "age"].map((key) => [key, sortLabels[key], sortKey === key]),
            (key) => {
              if (sortKey === key) setSortDir(-sortDir);
              else {
                setSortKey(key);
                setSortDir(1);
              }
            }
          ],
          [
            "group",
            "layers",
            "Group",
            GROUP_LABELS[groupBy],
            groupBy !== "none",
            Object.entries(GROUP_LABELS).map(([key, label]) => [key, label, groupBy === key]),
            (key) => setGroupBy(key)
          ]
        ].map(([menu, icon, label, value, modified, options, choose]) => jsxs("span", { className: "cm-anchor", "data-cm-anchor": menu, children: [
          jsxs("button", {
            type: "button",
            className: `cm-icon-btn${modified ? " is-modified" : ""}`,
            "data-cm-menu-btn": menu,
            "aria-haspopup": "menu",
            "aria-expanded": cmMenu === menu ? "true" : "false",
            "aria-label": `${label}: ${value}`,
            title: `${label}: ${value}`,
            onClick: (event) => {
              event.stopPropagation();
              setCmMenu(cmMenu === menu ? null : menu);
            },
            onKeyDown: (event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCmMenu(menu);
              }
            },
            children: [jsx(Icon, { name: icon }, `${menu}-icon`), modified ? jsx("span", { className: "cm-icon-dot", "aria-hidden": true }, `${menu}-dot`) : null]
          }),
          cmMenu === menu ? jsxs("div", {
            className: "cm-menu cm-popover",
            role: "menu",
            "aria-label": `${label} by`,
            "data-cm-menu": menu,
            onClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              const items = [...event.currentTarget.querySelectorAll("[data-cm-option]")];
              const at = items.indexOf(document.activeElement);
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                items[(at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
              } else if (event.key === "Home") {
                event.preventDefault();
                items[0]?.focus();
              } else if (event.key === "End") {
                event.preventDefault();
                items[items.length - 1]?.focus();
              } else if (event.key === "Tab") setCmMenu(null);
            },
            children: [
              jsx("div", { className: "menu-label", children: `${label} by` }, "label"),
              ...options.map(([key, optionLabel, active]) => jsxs("button", {
                type: "button",
                role: "menuitemradio",
                "aria-checked": active ? "true" : "false",
                className: active ? "is-active" : "",
                "data-cm-option": `${menu}-${key}`,
                autoFocus: active,
                onClick: () => {
                  choose(key);
                  setCmMenu(null);
                  document.querySelector(`[data-cm-menu-btn="${menu}"]`)?.focus();
                },
                children: [
                  jsx("span", { className: "cm-check", children: active ? jsx(Icon, { name: "check" }) : null }, "check"),
                  jsx("span", { className: "cm-option-label", children: optionLabel }, "label"),
                  menu === "sort" && active ? jsx("span", { className: "cm-dir", title: sortDir > 0 ? "Ascending \u2014 select again to reverse" : "Descending \u2014 select again to reverse", children: jsx(Icon, { name: sortDir > 0 ? "arrow-up-narrow-wide" : "arrow-down-wide-narrow" }) }, "dir") : null
                ]
              }, key))
            ]
          }) : null
        ] }, menu)),
        jsx("span", { className: "cm-divider", "aria-hidden": true }),
        jsxs("label", { className: "cm-filter", children: [
          jsx("span", { children: "Type" }),
          jsx("select", { "data-filter-field": "type", "aria-label": "Filter by type", value: columnFilters.type, onChange: (event) => setColumnFilters((current) => ({ ...current, type: event.target.value })), children: [
            jsx("option", { value: "", children: "All types" }),
            ...typeFilterValues.map((type) => jsx("option", { value: type, children: typeLabel(type) }, type))
          ] })
        ] }),
        jsxs("label", { className: "cm-filter", children: [
          jsx("span", { children: "Status" }),
          jsx("select", { "data-filter-field": "status", "aria-label": "Filter by status", value: columnFilters.status, onChange: (event) => setColumnFilters((current) => ({ ...current, status: event.target.value })), children: [
            jsx("option", { value: "", children: "All statuses" }),
            ...statusFilterValues.map((status) => jsx("option", { value: status, children: STATUS_LABELS[status] || readableLabel(status) }, status))
          ] })
        ] }),
        jsxs("label", { className: "cm-filter", children: [
          jsx("span", { children: "Initiative" }),
          jsx("select", { "data-filter-field": "initiative", "aria-label": "Filter by initiative", value: columnFilters.initiative, onChange: (event) => setColumnFilters((current) => ({ ...current, initiative: event.target.value })), children: [
            jsx("option", { value: "", children: "All initiatives" }),
            ...initiativeFilterValues.map((ref) => jsx("option", { value: ref, children: initiativeLabel(ref) }, ref))
          ] })
        ] }),
        jsxs("label", { className: "cm-filter", children: [
          jsx("span", { children: "Assignee" }),
          jsx("select", { "data-filter-field": "assignee", "aria-label": "Filter by assignee", value: columnFilters.assignee, onChange: (event) => setColumnFilters((current) => ({ ...current, assignee: event.target.value })), children: [
            jsx("option", { value: "", children: "All assignees" }),
            hasUnassignedItems ? jsx("option", { value: "__unassigned__", children: "Unassigned" }, "unassigned") : null,
            ...assigneeFilterValues.map((owner) => jsx("option", { value: owner, children: ownerLabel(owner) }, owner))
          ] })
        ] }),
        hasFilters ? jsx("button", { type: "button", className: "cm-reset-filters", "data-clear-filters": true, onClick: resetFilters, children: "Clear all" }) : null,
        jsx("span", { className: "cm-count", "data-cm-count": true, role: "status", title: [
          `${number(treeRows.length)} of ${number(entries.length)} items`,
          q ? `search \u201C${search}\u201D` : "",
          activeFilterCount ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : "",
          sortKey !== "rank" ? `sorted by ${sortLabels[sortKey]}` : "",
          groupBy !== "none" ? `grouped by ${GROUP_LABELS[groupBy]}` : ""
        ].filter(Boolean).join(" \xB7 "), children: treeRows.length === entries.length ? `${number(entries.length)} items` : `${number(treeRows.length)} of ${number(entries.length)}` })
      ] }) : null,
      !window.__V4_DISABLE?.has("head") ? jsxs("div", { className: "tree-head", children: [
        jsx("span", { className: "th-gutter" }),
        sortHeader("rank", "Rank", "th-rank"),
        sortHeader("type", "Type", "th-type"),
        sortHeader("title", "Work item", "th-title"),
        sortHeader("status", "Status", "th-status"),
        sortHeader("initiative", "Initiative", "th-initiative"),
        sortHeader("assignee", "Assignee", "th-who"),
        sortHeader("age", "Age", "th-age"),
        jsx("span", { className: "th-reason", children: "Priority reason" }),
        jsx("span", { className: "th-act", "aria-label": "Actions" })
      ] }) : null,
      !window.__V4_DISABLE?.has("head") && treeRows.length === 0 ? jsxs("div", { className: "tree-group-head", "data-no-matches": true, children: [
        jsx("span", { children: hasFilters ? "No items match the current search and filters." : "No backlog items to show." }),
        hasFilters ? jsx("button", { type: "button", className: "cm-chip", onClick: resetFilters, children: "Clear filters" }) : null
      ] }) : null,
      ...window.__V4_DISABLE?.has("rows") ? [] : groups.flatMap(([label, rows], gi) => [
        label !== null ? jsxs("div", { className: "tree-group-head", children: [
          jsx("span", { children: label }),
          jsx("span", { className: "grp-count", children: `\xB7 ${rows.length}` })
        ] }, `grp-${String(label)}-${gi}`) : null,
        ...rows.map(({ ref, depth, guides }) => {
          const entry = entries.find((candidate) => candidate.item_ref === ref);
          const item = workByRef[ref] ?? { ref, title: ref, status: "backlog", type: "task" };
          const kids = (childrenOf[ref] ?? []).filter(branchMatch);
          const overdue = Boolean(item.due) && item.status !== "done" && item.due < todayISO();
          const stUi = item.status && STATUS_UI[item.status] || item.status || "backlog";
          const err = cellError && cellError.ref === ref ? cellError : null;
          const cell = editing && editing.ref === ref ? editing.field : null;
          const titleText = item.title || ref;
          const validTypeChoices = typeChoicesFor(ref);
          const validStatusChoices = statusChoicesFor(item);
          const validParentChoices = reparentTargets(ref);
          const mayAddChild = canCreate && childTypesFor(item.type).length > 0;
          const mayReparent = Boolean(validParentChoices.length || parentRefOf(item));
          const estimateDays = item.estimate_days !== null && item.estimate_days !== void 0 && item.estimate_days !== "" ? Number(item.estimate_days) : null;
          const { openDetails, openDetailsSoon, startTitleEdit } = /* @__PURE__ */ (function() {
            let titleClickTimer = null;
            const cancelTitleTimer = () => {
              if (titleClickTimer) {
                clearTimeout(titleClickTimer);
                titleClickTimer = null;
              }
            };
            var openDetails2 = (event) => {
              event.stopPropagation();
              cancelTitleTimer();
              setDetailItem(item);
            };
            var openDetailsSoon2 = (event) => {
              event.stopPropagation();
              cancelTitleTimer();
              titleClickTimer = setTimeout(() => {
                titleClickTimer = null;
                setDetailItem(item);
              }, 220);
            };
            var startTitleEdit2 = (event) => {
              event.stopPropagation();
              cancelTitleTimer();
              setEditing({ ref, field: "title" });
            };
            return { openDetails: openDetails2, openDetailsSoon: openDetailsSoon2, startTitleEdit: startTitleEdit2, cancelTitleTimer };
          })();
          return jsxs("div", {
            onClick: (event) => {
              if (event.target.closest("button, input, select, a, [data-bulk-select], .tree-twisty, .drag-grip")) return;
              openDetails(event);
            },
            className: `dockyard-tree-row${draggedRef === ref ? " tree-dragging" : ""}`,
            role: "treeitem",
            "aria-level": depth + 1,
            "aria-expanded": kids.length ? String(!collapsedSet.has(ref)) : void 0,
            "data-backlog-item": ref,
            "data-tree-depth": depth,
            onDragOver: (event) => {
              if (draggedRef && depth === 0 && entry) {
                event.preventDefault();
                event.currentTarget.classList.add("tree-drop");
              }
            },
            onDragLeave: (event) => event.currentTarget.classList.remove("tree-drop"),
            onDrop: (event) => {
              event.preventDefault();
              event.currentTarget.classList.remove("tree-drop");
              if (!draggedRef || !entry) return;
              const source = entries.find((candidate) => candidate.item_ref === draggedRef);
              if (source && draggedRef !== ref) requestMove(source, Number(entry.rank));
              setDraggedRef(null);
            },
            children: [
              jsxs("span", { className: "tree-gutter", children: [
                ...guides.map((mode, idx) => jsx("span", { className: `tree-guide ${mode}`, "aria-hidden": true }, `g${idx}`)),
                kids.length ? jsx("button", { type: "button", className: "tree-twisty", "data-collapse-ref": ref, "aria-expanded": String(!collapsedSet.has(ref)), "aria-label": `${collapsedSet.has(ref) ? "Expand" : "Collapse"} ${kids.length} sub-item${kids.length === 1 ? "" : "s"}`, onClick: (event) => {
                  event.stopPropagation();
                  toggleCollapse(ref);
                }, children: jsx(Icon, { name: "chevron" }) }) : null,
                jsx("input", { type: "checkbox", className: "tree-check", "data-bulk-select": ref, "aria-label": `Select ${titleText}`, checked: bulkSelected.includes(ref), onClick: (event) => event.stopPropagation(), onChange: () => toggleBulk(ref) })
              ] }),
              !hiddenCols.includes("rank") ? jsxs("span", { className: "tree-rank", children: [
                depth === 0 ? jsx("span", { className: "drag-grip", "aria-hidden": true, draggable: true, onDragStart: (event) => {
                  event.stopPropagation();
                  setDraggedRef(ref);
                }, children: "\u283F" }) : null,
                entry ? cell === "rank" ? jsx("input", { autoFocus: true, type: "number", min: 1, max: entries.length, "data-cell-input": "rank", defaultValue: String(entry.rank), onKeyDown: (event) => {
                  if (event.key === "Enter") event.target.blur();
                  if (event.key === "Escape") setEditing(null);
                }, onBlur: (event) => commitRank(entry, event.target.value) }) : jsx("button", { type: "button", className: "cell-edit cell-rank", "data-cell": "rank", onClick: (event) => {
                  event.stopPropagation();
                  setEditing({ ref, field: "rank" });
                }, children: number(entry.rank) }) : jsx("span", { children: "\xB7" })
              ] }) : null,
              jsxs("span", { className: "tree-type-cell", title: `Type: ${typeLabel(item.type)}`, children: [
                jsx("span", { className: `tree-type ${TYPE_NAMES.includes(item.type) ? item.type : "task"}`, "aria-hidden": true, children: jsx(Icon, { name: `type-${TYPE_NAMES.includes(item.type) ? item.type : "task"}` }) }),
                jsx("span", { children: typeLabel(item.type) })
              ] }),
              jsxs("span", { className: "tree-title", children: [
                cell === "title" ? jsxs("span", { className: "cell-edit is-input", style: { display: "inline-flex", alignItems: "center", minWidth: 0, flex: 1 }, children: [
                  jsx("input", { autoFocus: true, className: "cell-title-input", "data-cell-input": "title", defaultValue: item.title || "", onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      event.target.blur();
                    }
                    if (event.key === "Escape") {
                      setEditing(null);
                    }
                  }, onBlur: (event) => commitTitle(ref, event.target.value) }),
                  err && err.field === "title" ? jsx("span", { className: "dockyard-inline-error", role: "alert", "data-cell-error": "title", style: { fontSize: 10.5, padding: "1px 6px", whiteSpace: "nowrap" }, children: err.message }) : null
                ] }) : jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }, children: [
                  jsxs("span", { className: "tree-title-stack", children: [
                    jsxs("span", { className: "tree-title-line", children: [
                      jsx("span", { className: "tree-ref-chip", children: item.ref }),
                      jsx("button", {
                        type: "button",
                        className: "cell-edit cell-title",
                        "data-cell": "title",
                        "data-title-edit": ref,
                        title: "Double-click to edit title inline \xB7 single-click opens details",
                        onDoubleClick: startTitleEdit,
                        onClick: openDetailsSoon,
                        children: titleText
                      }),
                      depth && parentOf[ref] ? jsx("span", { className: "tree-parent", children: ` \xB7 in ${workByRef[parentOf[ref]]?.title || parentOf[ref]}` }) : null
                    ] }),
                    item.body ? jsx("span", { className: "tree-desc", children: String(item.body).replace(/\s+/g, " ").slice(0, 90) }) : null
                  ] }),
                  err && err.field === "title" ? jsx("span", { className: "dockyard-inline-error", role: "alert", "data-cell-error": "title", style: { fontSize: 10.5, padding: "1px 6px", whiteSpace: "nowrap" }, children: err.message }) : null
                ] })
              ] }),
              jsxs("span", { className: "tree-status", children: [
                cell === "status" ? jsx("select", { autoFocus: true, className: "cell-edit is-input", "data-cell-input": "status", value: item.status && STATUS_UI[item.status] || "backlog", onChange: (event) => {
                  setEditing(null);
                  changeStatus(ref, event.target.value);
                }, onBlur: () => setEditing(null), children: validStatusChoices.map((st) => jsx("option", { value: st, children: STATUS_LABELS[st] }, st)) }) : jsx("button", { type: "button", className: `cell-edit cell-status tree-status ${stUi === "done" ? "success" : overdue || stUi === "blocked" ? "danger" : stUi === "in_progress" ? "info" : stUi === "in_review" ? "warning" : "neutral"}`, "data-cell": "status", title: "Change status", onClick: (event) => {
                  event.stopPropagation();
                  setEditing({ ref, field: "status" });
                }, children: [
                  jsx("span", { className: "tree-status-icon", "aria-hidden": true }),
                  jsx("span", { children: STATUS_LABELS[item.status] || "Backlog" })
                ] }),
                err && err.field === "status" ? jsx("span", { className: "cell-due overdue", children: err.message }) : null
              ] }),
              jsxs("span", { className: "tree-initiative", title: item.initiative_ref ? `Initiative ${item.initiative_ref}` : "No linked initiative", children: [
                item.initiative_ref ? jsxs("span", { className: "initiative-cell-value", children: [
                  jsx("strong", { children: initiativeLabel(item.initiative_ref) }),
                  jsx("small", { children: item.initiative_ref })
                ] }) : jsx("span", { className: "initiative-cell-empty", children: "\u2014" })
              ] }),
              jsxs("span", { className: "tree-who", children: [
                cell === "assignee" ? jsxs("select", { autoFocus: true, className: "cell-edit is-input", "data-cell-input": "assignee", value: item.assignee || "", onChange: (event) => {
                  setEditing(null);
                  assignItem(ref, event.target.value);
                }, onBlur: () => setEditing(null), children: [
                  jsx("option", { value: "", children: "Unassigned" }),
                  ...(view.bots ?? []).map((bot) => jsx("option", { value: bot.id, children: bot.name || bot.id }, bot.id))
                ] }) : jsx("button", { type: "button", className: "cell-edit cell-who", "data-cell": "assignee", title: item.type === "epic" ? "Epics are never assigned \u2014 their children carry the work" : "Change assignee", disabled: (item.type || "task") === "epic", onClick: (event) => {
                  event.stopPropagation();
                  if ((item.type || "task") === "epic") {
                    flashCell(ref, "assignee", "Epics are never assigned \u2014 assign one of its children instead.");
                    return;
                  }
                  setEditing({ ref, field: "assignee" });
                }, children: [
                  item.assignee ? jsx("span", { className: "tree-avatar", children: String(item.assignee).replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() }) : jsx("span", { className: "tree-avatar none", children: "\u2014" }),
                  jsx("span", { className: "who-name", children: ownerLabel(item.assignee) })
                ] }),
                err && err.field === "assignee" ? jsx("span", { className: "cell-due overdue", children: err.message }) : null
              ] }),
              jsx("span", { className: "tree-age", title: entry?.aged_since ? `Ranked since ${entry.aged_since}` : "Rank date unavailable", children: entry?.aged_since ? `${Math.max(0, Math.floor((Date.now() - Date.parse(entry.aged_since)) / 864e5))}d` : "\u2014" }),
              jsx("span", { className: "tree-priority-reason", title: entry?.priority_reason || "No priority reason recorded", children: entry?.priority_reason || "No reason recorded" }),
              jsxs("span", { className: "tree-actions", children: [
                jsx("button", { type: "button", className: "tree-menu-btn", "data-menu-ref": ref, "aria-expanded": String(menuRef === ref), "aria-label": `Actions for ${titleText}`, onClick: (event) => {
                  event.stopPropagation();
                  setMenuRef(menuRef === ref ? null : ref);
                }, children: "\u22EF" })
              ] }),
              menuRef === ref ? jsxs("div", { className: "tree-menu", role: "menu", onClick: (event) => event.stopPropagation(), children: [
                jsx("div", { className: "menu-label", children: "Open" }),
                jsxs("button", { type: "button", role: "menuitem", "data-menu-action": "details", onClick: () => {
                  setMenuRef(null);
                  setDetailItem(item);
                }, children: [jsx(Icon, { name: "pencil" }), "Open task details"] }),
                validTypeChoices.length > 1 ? jsxs("label", { className: "tree-menu-field", children: [
                  jsx("span", { children: "Type" }),
                  jsx("select", {
                    "data-menu-type": ref,
                    "aria-label": `Change type for ${titleText}`,
                    value: item.type,
                    onChange: (event) => {
                      setMenuRef(null);
                      changeType(ref, event.target.value);
                    },
                    children: validTypeChoices.map((type) => jsx("option", { value: type, children: typeLabel(type) }, type))
                  })
                ] }) : jsx("div", { className: "tree-menu-static", children: [jsx("span", { children: "Type" }), jsx("strong", { children: typeLabel(item.type) })] }),
                mayAddChild || mayReparent || depth === 0 && entry ? jsx("div", { className: "menu-label", children: "Structure" }) : null,
                mayAddChild ? jsxs("button", { type: "button", role: "menuitem", "data-menu-action": "add-child", onClick: () => {
                  setMenuRef(null);
                  openCreate(ref);
                }, children: [jsx(Icon, { name: "type-subtask" }), "Add child item"] }) : null,
                mayReparent ? jsxs("button", { type: "button", role: "menuitem", "data-menu-action": "reparent", onClick: () => requestReparent(ref), children: [jsx(Icon, { name: "arrow-right" }), "Change parent\u2026"] }) : null,
                depth === 0 && entry ? jsxs("div", { className: "tree-menu-rank-actions", children: [
                  jsx("div", { className: "menu-label", children: "Priority" }),
                  jsx("button", { type: "button", role: "menuitem", "data-menu-action": "up", disabled: Number(entry.rank) <= 1, onClick: () => {
                    setMenuRef(null);
                    requestMove(entry, Number(entry.rank) - 1);
                  }, children: "Move up" }),
                  jsx("button", { type: "button", role: "menuitem", "data-menu-action": "down", disabled: Number(entry.rank) >= entries.length, onClick: () => {
                    setMenuRef(null);
                    requestMove(entry, Number(entry.rank) + 1);
                  }, children: "Move down" })
                ] }) : null,
                item.status !== "done" && item.type !== "epic" ? jsxs("div", { className: "tree-menu-status-actions", children: [
                  jsx("div", { className: "menu-label", children: "Status" }),
                  jsx("button", { type: "button", role: "menuitem", "data-menu-action": "status-done", onClick: () => {
                    setMenuRef(null);
                    changeStatus(ref, "done");
                  }, children: "Mark done" })
                ] }) : null
              ] }) : null
            ]
          }, ref);
        })
      ]),
      !window.__V4_DISABLE?.has("popover") && bulkSelected.length ? jsxs("div", { className: "sel-pop", "data-selection-popover": true, onClick: (event) => event.stopPropagation(), children: [
        jsx("span", { className: "sel-count", children: `${bulkSelected.length} selected` }),
        jsx("span", { className: "sel-sep" }),
        jsxs("select", { "data-pop-target": true, "aria-label": "Bulk target", defaultValue: "", children: [
          jsx("option", { value: "", disabled: true, children: "Act on selection\u2026" }),
          ...(view.bots ?? []).map((bot) => jsxs("option", { value: `assign:${bot.id}`, children: [`Reassign all \u2192 ${bot.name || bot.id}`] }, `a-${bot.id}`)),
          ...STATUS_OPTIONS.map((st) => jsxs("option", { value: `status:${st}`, children: [`Set status \u2192 ${STATUS_LABELS[st]}`] }, `s-${st}`))
        ], onChange: (event) => {
          const [op, value] = event.target.value.split(":");
          event.target.value = "";
          const refs = bulkSelected.slice();
          if (!op || !refs.length) return;
          if (op === "assign") {
            setBulkReplacement(value);
            setBulkSelected(refs);
            setBulkPreview(null);
            setBulkOperation(null);
            previewBulk();
            return;
          }
          setBulkSelected([]);
          refs.forEach((ref) => changeStatus(ref, value));
        } }),
        !bulkSameSource && bulkSelected.length > 0 ? jsx("span", { style: { fontSize: 11, color: "var(--dy-warning)", padding: "0 6px" }, children: "mixed current assignees" }) : null,
        bulkPreview ? jsxs("button", { type: "button", "data-pop-action": "execute", disabled: bulkBusy || !selectedEligible, onClick: () => {
          executeBulk();
        }, children: [`Confirm reassign (${(bulkPreview.eligible_items ?? []).length})`] }) : null,
        jsxs("button", { type: "button", "data-pop-action": "clear", onClick: () => {
          setBulkSelected([]);
          setBulkPreview(null);
          setBulkOperation(null);
          setBulkError(null);
        }, children: ["Clear", jsx("span", { style: { opacity: 0.6 }, children: " esc" })] })
      ] }) : null
    ] }) : q ? jsx(EmptyState, { title: "No matches", description: `Nothing in the backlog matches \u201C${search}\u201D. Clear the filter to see all items.`, icon: "project", children: jsx(Button, { small: true, onClick: () => setSearch(""), children: "Clear filter" }) }) : jsx(EmptyState, { title: "No ranked backlog items", description: "Work items appear here after they are added to the project backlog.", icon: "project" }),
    detailItem ? jsx(WorkItemDetail, { item: detailItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setDetailItem(null), onRefresh }) : null,
    !window.__V4_DISABLE?.has("wizard") ? jsx(BacklogImportWizard, {
      project,
      importOpen,
      importStep,
      importText,
      importMode,
      importRows,
      importValid,
      importError,
      importBusy,
      importResult,
      importSelected,
      importWarningsOnly,
      importColumnMetadata,
      setImportMode,
      setImportText,
      setImportRows,
      setImportValid,
      setImportError,
      setImportBusy,
      setImportStep,
      setImportSelected,
      closeImport,
      parseImport,
      runImport,
      api
    }) : null,
    jsx(BacklogReasonModal, { pendingMove, reason, setReason, error, saving, pendingParentItem, pendingParentRef, pendingParentChoices, pendingParentChanged, saveParent, saveMove, setPendingMove, typeLabel }),
    jsxs("section", {
      className: "dockyard-modal-layer",
      "data-create-backlog-layer": true,
      hidden: !createOpen,
      onClick: (event) => {
        if (event.target === event.currentTarget && !createSaving) setCreateOpen(false);
      },
      children: [
        jsxs("form", { className: "dockyard-modal dockyard-create-modal", role: "dialog", "aria-modal": true, "aria-labelledby": "dockyard-create-title", "data-create-backlog-item": true, onSubmit: (event) => {
          event.preventDefault();
          saveCreate();
        }, children: [
          jsxs("header", { className: "dockyard-modal-head", children: [
            jsxs("div", { children: [jsx("span", { className: "dockyard-create-eyebrow", children: `New work item \xB7 ${project.id}` }), jsx("h2", { id: "dockyard-create-title", children: "Create backlog item" })] }),
            jsx(Button, { action: "close-create-backlog-item", ariaLabel: "Close create item dialog", disabled: createSaving, onClick: () => setCreateOpen(false), children: "Close" })
          ] }),
          jsxs("div", { className: "dockyard-create-body", children: [
            jsxs("p", { className: "dockyard-create-context", children: [jsx("span", { className: "dockyard-status-dot status-backlog", "aria-hidden": true }), "Starts in Backlog \xB7 Sahil is recorded as creator"] }),
            jsxs("div", { className: "dockyard-settings-grid dockyard-create-fields", children: [
              jsxs("label", { className: "dockyard-field dockyard-field-wide field-required", children: [jsx("span", { children: "Title" }), jsx("input", { "data-create-field": "title", value: createForm.title, onInput: (event) => updateCreate("title", event.target.value), onChange: (event) => updateCreate("title", event.target.value), placeholder: "Describe the delivery outcome" })] }),
              jsxs("label", { className: "dockyard-field dockyard-field-wide", children: [jsx("span", { children: "Description (optional)" }), jsx("textarea", { rows: 3, "data-create-field": "body", value: createForm.body, onChange: (event) => updateCreate("body", event.target.value), placeholder: "Describe the outcome and acceptance criteria\u2026" })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Parent (optional)" }), jsx("select", { "data-create-field": "parent", value: createForm.parent, onChange: (event) => updateCreate("parent", event.target.value), children: [
                ROOT_TYPES.includes(createForm.type) ? jsx("option", { value: "", children: "Top level" }, "none") : null,
                ...availableCreateParents.map((parent) => jsx("option", { value: parent.ref, children: `${parent.title || parent.ref} \xB7 ${typeLabel(parent.type)}` }, parent.ref))
              ] })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Due date (optional)" }), jsx("input", { type: "date", "data-create-field": "due", value: createForm.due, onInput: (event) => updateCreate("due", event.target.value), onChange: (event) => updateCreate("due", event.target.value) })] }),
              jsxs("label", { className: "dockyard-field field-required", children: [jsx("span", { children: "Type" }), jsx("select", {
                "data-create-field": "type",
                value: createForm.type,
                onChange: (event) => updateCreate("type", event.target.value),
                children: availableCreateTypes.map((type) => jsx("option", { value: type, children: typeLabel(type) }, type))
              })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Estimated days (optional)" }), jsx("input", { type: "number", min: 0, step: 0.5, "data-create-field": "estimate_days", value: createForm.estimate_days, onInput: (event) => updateCreate("estimate_days", event.target.value), onChange: (event) => updateCreate("estimate_days", event.target.value), placeholder: "e.g. 2.5" })] }),
              jsxs("label", { className: "dockyard-field field-required", children: [jsx("span", { children: "Assignee" }), jsx("select", { "data-create-field": "assignee", value: createForm.assignee, onChange: (event) => updateCreate("assignee", event.target.value), children: [
                jsx("option", { value: "", children: "Select a bot" }, "none"),
                ...(view.bots ?? []).map((bot) => jsx("option", { value: bot.id, children: bot.name || bot.id }, bot.id))
              ] })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { className: "field-optional-hint", children: "Initiative" }), jsx("select", { "data-create-field": "initiative", value: createForm.initiative, onChange: (event) => updateCreate("initiative", event.target.value), children: [
                jsx("option", { value: "", children: "No initiative" }, "none"),
                ...(view.initiatives ?? []).map((initiative) => jsx("option", { value: initiative.ref, children: `${initiative.ref} / ${initiative.title}` }, initiative.ref))
              ] })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Evidence refs (optional)" }), jsx("input", { "data-create-field": "evidence_refs", value: createForm.evidence_refs, onChange: (event) => updateCreate("evidence_refs", event.target.value), placeholder: "Comma-separated refs" })] }),
              jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Labels (optional)" }), jsx("input", { "data-create-field": "labels", value: createForm.labels, onChange: (event) => updateCreate("labels", event.target.value), placeholder: "Comma-separated labels" })] }),
              jsxs("label", { className: "dockyard-field field-required", children: [jsx("span", { children: "Initial rank" }), jsx("input", { type: "number", min: 1, max: maxInitialRank, "data-create-field": "rank", value: createForm.rank, onInput: (event) => updateCreate("rank", event.target.value), onChange: (event) => updateCreate("rank", event.target.value) })] }),
              jsxs("label", { className: "dockyard-field dockyard-field-wide field-required", children: [jsx("span", { children: "Priority reason" }), jsx("textarea", { rows: 3, "data-create-field": "reason", value: createForm.reason, onInput: (event) => updateCreate("reason", event.target.value), onChange: (event) => updateCreate("reason", event.target.value), placeholder: "Why should this item hold this rank?" })] })
            ] }),
            createTouched.title && createForm.title.trim().length < 3 ? jsx("p", { className: "create-help bad", "data-create-help": "title", children: "Title must be at least 3 characters." }) : null,
            createTouched.assignee && !createForm.assignee ? jsx("p", { className: "create-help bad", "data-create-help": "assignee", children: "Every work item needs a bot assignee." }) : null,
            createTouched.reason && createForm.reason.trim().length < 4 ? jsx("p", { className: "create-help bad", "data-create-help": "reason", children: "A ranking reason is required \u2014 it becomes the audit record." }) : null,
            jsx("p", { className: "create-help", "data-create-reqnote": true, children: "* required. Initial rank and priority reason are recorded in the backlog audit trail." }),
            createError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: createError }) : null
          ] }),
          jsxs("div", { className: "dockyard-modal-actions", children: [
            jsx(Button, { disabled: createSaving, onClick: () => setCreateOpen(false), children: "Cancel" }),
            jsx(Button, { action: "submit-create-backlog-item", variant: "primary", disabled: createSaving || !createValid, onClick: saveCreate, children: createSaving ? "Creating..." : "Create and add" })
          ] })
        ] })
      ]
    })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/backlog.js
function BacklogView({ view, onRefresh }) {
  const [draggedRef, setDraggedRef] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createForm, setCreateForm] = useState({
    type: "task",
    title: "",
    body: "",
    labels: "",
    evidence_refs: "",
    assignee: "",
    initiative: "",
    estimate_days: "",
    rank: "1",
    reason: "",
    parent: "",
    due: ""
  });
  const [createTouched, setCreateTouched] = useState({});
  const [bulkSelected, setBulkSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("rank");
  const [sortDir, setSortDir] = useState(1);
  const [groupBy, setGroupBy] = useState("none");
  const [columnFilters, setColumnFilters] = useState({ type: "", status: "", initiative: "", assignee: "" });
  const [hiddenCols, setHiddenCols] = useState([]);
  const [cmMenu, setCmMenu] = useState(null);
  const [collapsed, setCollapsed] = useState([]);
  const [menuRef, setMenuRef] = useState(null);
  const [editing, setEditing] = useState(null);
  const [cellError, setCellError] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState("csv");
  const [importRows, setImportRows] = useState(null);
  const [importValid, setImportValid] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importSelected, setImportSelected] = useState(null);
  const [importWarningsOnly, setImportWarningsOnly2] = useState(false);
  const [importColumnMetadata, setImportColumnMetadata] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const project = view.project;
  useEffect(() => {
    if (!importOpen) return void 0;
    const onEscape = (event) => {
      if (event.key !== "Escape" || importBusy) return;
      setImportOpen(false);
      setImportStep(1);
      setImportRows(null);
      setImportValid(false);
      setImportError(null);
      setImportResult(null);
      document.querySelector('[data-action="open-bulk-import"]')?.focus();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [importOpen, importBusy]);
  useEffect(() => {
    if (!importOpen) return void 0;
    api(`/projects/${encodeURIComponent(project.id)}/backlog/import-template`).then((template) => {
      setImportColumnMetadata(Array.isArray(template?.column_metadata) ? template.column_metadata : []);
    }).catch(() => setImportColumnMetadata([]));
    return void 0;
  }, [importOpen, project.id]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setCmMenu(null);
        setMenuRef(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!cmMenu) return void 0;
    const onPointer = (event) => {
      if (!event.target?.closest?.("[data-cm-anchor]")) setCmMenu(null);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [cmMenu]);
  const [bulkReplacement, setBulkReplacement] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkOperation, setBulkOperation] = useState(null);
  const [bulkError, setBulkError] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => {
    if (!createOpen) return void 0;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !createSaving) setCreateOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [createOpen, createSaving]);
  if (!project) return jsx(EmptyState, { title: "No project selected", description: "Select a project before prioritising its backlog.", icon: "project" });
  const canCreate = project.enabled !== false && project.phase === "active";
  const workByRef = Object.fromEntries((view.workItems ?? []).map((item) => [item.ref, item]));
  const entries = [...view.backlog ?? []].sort((left, right) => Number(left.rank) - Number(right.rank));
  const requestMove = (entry, newRank) => {
    if (!entry || newRank < 1 || newRank > entries.length || newRank === Number(entry.rank)) return;
    setPendingMove({ ref: entry.item_ref, newRank, title: workByRef[entry.item_ref]?.title || entry.item_ref });
    setReason("");
    setError(null);
  };
  const STATUS_LABELS = { backlog: "Backlog", triage: "Backlog", todo: "Backlog", ready: "Backlog", running: "In progress", in_progress: "In progress", review: "In review", in_review: "In review", blocked: "Blocked", done: "Done" };
  const STATUS_UI = { backlog: "backlog", triage: "backlog", todo: "backlog", ready: "backlog", running: "in_progress", in_progress: "in_progress", review: "in_review", in_review: "in_review", blocked: "blocked", done: "done" };
  const STATUS_OPTIONS = ["backlog", "in_progress", "in_review", "blocked", "done"];
  const TYPE_NAMES = DOCKYARD_TYPE_NAMES;
  const ROOT_TYPES = DOCKYARD_ROOT_TYPES;
  const CHILD_TYPES = DOCKYARD_CREATE_CHILD_TYPES;
  const typeLabel = dockyardTypeLabel;
  const childTypesFor = dockyardChildTypes;
  const parentAccepts = dockyardParentAccepts;
  const todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const allItems = view.workItems ?? [];
  const initiativeByRef = Object.fromEntries((view.initiatives ?? []).map((initiative) => [initiative.ref, initiative]));
  const botById = Object.fromEntries((view.bots ?? []).map((bot) => [bot.id, bot]));
  const initiativeLabel = (ref) => ref ? initiativeByRef[ref]?.title || ref : "No initiative";
  const ownerLabel = (id) => id ? botById[id]?.name || id : "Unassigned";
  const parentOf = {};
  const childrenOf = {};
  const allChildrenOf = {};
  const entrySet = new Set(entries.map((entry) => entry.item_ref));
  const parentRefOf = (item) => item?.parent_ref || item?.parent_task_id || item?.parent_id || "";
  for (const it of allItems) {
    const parentRef = parentRefOf(it);
    if (!parentRef || parentRef === it.ref) continue;
    (allChildrenOf[parentRef] ||= []).push(it.ref);
    if (entrySet.has(it.ref) && entrySet.has(parentRef)) {
      parentOf[it.ref] = parentRef;
      (childrenOf[parentRef] ||= []).push(it.ref);
    }
  }
  const rankOf = (ref) => {
    const e = entries.find((entry) => entry.item_ref === ref);
    return e ? Number(e.rank) : 1e9;
  };
  const collapsedSet = new Set(collapsed);
  const q = search.trim().toLowerCase();
  const typeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.type || "task"))].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
  const statusFilterValues = [...new Set(entries.map((entry) => STATUS_UI[workByRef[entry.item_ref]?.status] || workByRef[entry.item_ref]?.status || "backlog"))].sort((a, b) => STATUS_OPTIONS.indexOf(a) - STATUS_OPTIONS.indexOf(b));
  const initiativeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.initiative_ref).filter(Boolean))].sort((a, b) => initiativeLabel(a).localeCompare(initiativeLabel(b)));
  const assigneeFilterValues = [...new Set(entries.map((entry) => workByRef[entry.item_ref]?.assignee).filter(Boolean))].sort((a, b) => ownerLabel(a).localeCompare(ownerLabel(b)));
  const hasUnassignedItems = entries.some((entry) => !workByRef[entry.item_ref]?.assignee);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || Boolean(q);
  const selfMatch = (ref) => {
    const it = workByRef[ref] ?? {};
    const statusValue = STATUS_UI[it.status] || it.status || "backlog";
    const filterMatch = (!columnFilters.type || (it.type || "task") === columnFilters.type) && (!columnFilters.status || statusValue === columnFilters.status) && (!columnFilters.initiative || (it.initiative_ref || "") === columnFilters.initiative) && (!columnFilters.assignee || (columnFilters.assignee === "__unassigned__" ? !it.assignee : it.assignee === columnFilters.assignee));
    if (!filterMatch) return false;
    if (!q) return true;
    const entry = entries.find((candidate) => candidate.item_ref === ref);
    return [
      it.title,
      it.body,
      ref,
      typeLabel(it.type),
      ownerLabel(it.assignee),
      STATUS_LABELS[it.status],
      initiativeLabel(it.initiative_ref),
      it.due,
      entry?.priority_reason
    ].join(" ").toLowerCase().includes(q);
  };
  const branchMatch = (ref) => selfMatch(ref) || (childrenOf[ref] ?? []).some(branchMatch);
  const visibleTop = entries.map((entry) => entry.item_ref).filter((ref) => !parentOf[ref] && branchMatch(ref));
  const sortCmp = (a, b) => {
    const ia = workByRef[a] ?? {}, ib = workByRef[b] ?? {};
    const keyVal = (item, ref) => ({
      rank: rankOf(ref),
      type: typeLabel(item.type),
      title: String(item.title || ref),
      status: STATUS_LABELS[item.status] || readableLabel(item.status || "backlog"),
      initiative: item.initiative_ref ? initiativeLabel(item.initiative_ref) : "\\uffff",
      assignee: item.assignee ? ownerLabel(item.assignee) : "\\uffff",
      age: entries.find((candidate) => candidate.item_ref === ref)?.aged_since || "9999-12-31",
      estimate: item.estimate_days !== null && item.estimate_days !== void 0 && item.estimate_days !== "" && Number.isFinite(Number(item.estimate_days)) ? Number(item.estimate_days) : Number.POSITIVE_INFINITY,
      due: item.due || "9999-12-31"
    })[sortKey];
    const va = keyVal(ia, a), vb = keyVal(ib, b);
    const cmp = typeof va === "number" && typeof vb === "number" ? va < vb ? -1 : va > vb ? 1 : 0 : String(va).localeCompare(String(vb), void 0, { numeric: true, sensitivity: "base" });
    return cmp * sortDir;
  };
  const treeRows = [];
  (function build(refs, depth, prefixOpen) {
    refs.forEach((ref, idx) => {
      const last = idx === refs.length - 1;
      const guides = depth === 0 ? [] : prefixOpen.map((open) => open ? "line" : "blank").concat([last ? "elbow" : "tee"]);
      treeRows.push({ ref, depth, guides });
      const kids = (childrenOf[ref] ?? []).filter(branchMatch).sort(sortCmp);
      if (kids.length && !collapsedSet.has(ref)) build(kids, depth + 1, prefixOpen.concat([!last]));
    });
  })(visibleTop.slice().sort(sortCmp), 0, []);
  const groups = groupBy === "none" ? [[null, treeRows]] : (() => {
    const map = /* @__PURE__ */ new Map();
    for (const row of treeRows) {
      const it = workByRef[row.ref] ?? {};
      const key = groupBy === "status" ? STATUS_LABELS[it.status] || it.status || "Unset" : groupBy === "assignee" ? ownerLabel(it.assignee) : groupBy === "initiative" ? initiativeLabel(it.initiative_ref) : groupBy === "type" ? typeLabel(it.type) : String(it.due || "No due date").slice(0, 7) || "No due date";
      (map.get(key) || map.set(key, []).get(key)).push(row);
    }
    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  })();
  const toggleCollapse = (ref) => setCollapsed((current) => current.includes(ref) ? current.filter((r) => r !== ref) : [...current, ref]);
  const descendantsOf = (ref) => {
    const out = [];
    const seen = /* @__PURE__ */ new Set([ref]);
    (function walk(current) {
      for (const childRef of allChildrenOf[current] ?? []) {
        if (seen.has(childRef)) continue;
        seen.add(childRef);
        out.push(childRef);
        walk(childRef);
      }
    })(ref);
    return out;
  };
  const reparentTargets = (ref) => {
    const item = workByRef[ref];
    const banned = /* @__PURE__ */ new Set([ref, ...descendantsOf(ref)]);
    return entries.map((entry) => workByRef[entry.item_ref]).filter((candidate) => candidate && !banned.has(candidate.ref) && parentAccepts(candidate.type, item?.type || "task"));
  };
  const typeChoicesFor = (ref) => {
    const item = workByRef[ref];
    if (!item) return [];
    if (item.type === "epic" || !DOCKYARD_EDITABLE_TYPES.includes(item.type)) return [item.type];
    const parent = workByRef[parentRefOf(item)];
    const childRefs = allChildrenOf[ref] ?? [];
    const choices = DOCKYARD_EDITABLE_TYPES.filter((candidate) => (candidate !== "subtask" || Boolean(parent)) && (!parent || parentAccepts(parent.type, candidate)) && childRefs.every((childRef) => parentAccepts(candidate, workByRef[childRef]?.type)));
    return choices.includes(item.type) ? choices : [item.type, ...choices];
  };
  const createTypesForParent = (parentRef) => parentRef ? childTypesFor(workByRef[parentRef]?.type) : ROOT_TYPES;
  const createParentsForType = (type, excludeRef = "") => {
    const descendants = new Set(excludeRef ? descendantsOf(excludeRef) : []);
    return allItems.filter((candidate) => candidate.ref !== excludeRef && !descendants.has(candidate.ref) && parentAccepts(candidate.type, type));
  };
  const statusChoicesFor = (item) => STATUS_OPTIONS.filter((status) => item?.type !== "epic" || status !== "done");
  const flashCell = (ref, field, message) => {
    setCellError({ ref, field, message });
  };
  const patchItem = async (ref, patch, okMessage) => {
    const item = workByRef[ref];
    if (!item) return;
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}`, { method: "PATCH", body: patch });
      setCellError(null);
      emitToast("success", okMessage || `${item.title} updated.`);
      onRefresh();
    } catch (failure) {
      flashCell(ref, Object.keys(patch)[0], String(failure?.message ?? failure).replace(/^\d+:\s*/, "").slice(0, 120));
    }
  };
  const commitTitle = (ref, value) => {
    setEditing(null);
    const v = String(value || "").trim();
    if (v.length < 3) {
      flashCell(ref, "title", "Title must be at least 3 characters.");
      return;
    }
    if (v !== (workByRef[ref]?.title ?? "")) patchItem(ref, { title: v });
  };
  const commitRank = (entry, value) => {
    setEditing(null);
    const next = parseInt(value, 10);
    if (!Number.isInteger(next) || next < 1 || next > entries.length) {
      flashCell(entry.item_ref, "rank", `Rank must be between 1 and ${entries.length}.`);
      return;
    }
    if (next !== Number(entry.rank)) requestMove(entry, next);
  };
  const changeStatus = async (ref, nextStatus) => {
    const item = workByRef[ref];
    if (!item || nextStatus === item.status) return;
    if ((item.type || "task") === "epic" && nextStatus === "done") {
      flashCell(ref, "status", "Epics are completed through their children \u2014 close the sub-items first.");
      return;
    }
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/transition`, { method: "POST", body: { status: nextStatus } });
      setCellError(null);
      emitToast("success", `${item.title} \u2192 ${STATUS_LABELS[nextStatus] || nextStatus}`);
      onRefresh();
    } catch (failure) {
      flashCell(ref, "status", String(failure?.message ?? failure).replace(/^\d+:\s*/, "").slice(0, 130));
    }
  };
  const assignItem = async (ref, bot) => {
    const item = workByRef[ref];
    if (!item) return;
    if ((item.type || "task") === "epic") {
      flashCell(ref, "assignee", "Epics are never assigned \u2014 assign one of its children instead.");
      return;
    }
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/assign`, { method: "POST", body: { assignee_id: bot || null } });
      setCellError(null);
      emitToast("success", bot ? `${item.title} \u2192 ${bot}` : `${item.title} unassigned.`);
      onRefresh();
    } catch (failure) {
      flashCell(ref, "assignee", String(failure?.message ?? failure).replace(/^\d+:\s*/, "").slice(0, 130));
    }
  };
  const changeType = (ref, nextType) => {
    const item = workByRef[ref];
    if (!item || nextType === item.type) return;
    if (!typeChoicesFor(ref).includes(nextType)) {
      flashCell(ref, "type", `Changing ${item.type} to ${nextType} is not valid for this item's parent and children.`);
      return;
    }
    patchItem(ref, { type: nextType }, `${item.title} is now ${typeLabel(nextType)}.`);
  };
  const requestReparent = (ref) => {
    setMenuRef(null);
    setPendingMove({ ref, mode: "parent", title: workByRef[ref]?.title || ref, parent_ref: parentRefOf(workByRef[ref]) || "" });
    setReason("");
    setError(null);
  };
  const saveParent = async () => {
    if (!pendingMove || !pendingParentChanged || reason.trim().length < 4) return;
    setSaving(true);
    setError(null);
    try {
      const parent = pendingParentRef || null;
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(pendingMove.ref)}`, {
        method: "PATCH",
        body: { parent_ref: parent, reason: reason.trim() }
      });
      const title = pendingMove.title;
      setPendingMove(null);
      setReason("");
      emitToast("success", `${title} ${parent ? "moved under " + (workByRef[parent]?.title || parent) : "moved to top level"} (audit recorded).`);
      onRefresh();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setSaving(false);
  };
  const closeImport = () => {
    setImportOpen(false);
    setImportStep(1);
    setImportRows(null);
    setImportValid(false);
    setImportError(null);
    setImportResult(null);
    setImportSelected(null);
    setImportWarningsOnly2(false);
  };
  const parseImport = (advance) => {
    setImportError(null);
    setImportValid(false);
    const text = importText.trim();
    if (!text) {
      setImportError("Paste CSV lines or a JSON array first.");
      setImportRows(null);
      return;
    }
    const normalised = normaliseBulkImportText(text, importMode);
    if (normalised.error) {
      setImportError(normalised.error);
      setImportRows(null);
      return;
    }
    const csvText = normalised.csvText;
    setImportBusy(true);
    api(`/projects/${encodeURIComponent(project.id)}/backlog/import`, {
      method: "POST",
      body: { csv_text: csvText, apply: false }
    }).then((previewResult) => {
      setImportBusy(false);
      const preview = previewResult?.preview;
      if (!preview) {
        setImportError("The import service returned no preview.");
        setImportRows(null);
        return;
      }
      const errorByRow = {};
      for (const problem of preview.errors ?? []) {
        const key = String(problem.row ?? "");
        (errorByRow[key] = errorByRow[key] ?? []).push(problem.error);
      }
      const parsed = (preview.rows ?? []).map((row, idx) => {
        const type = String(row.type ?? "task").toLowerCase();
        const title = String(row.title ?? "").trim();
        const parent = String(row.parent_key ?? "").trim();
        const labels = String(row.labels ?? "").trim();
        const estimate = row.estimate_days == null || row.estimate_days === "" ? "" : String(row.estimate_days);
        const due = String(row.due ?? "").trim();
        const initiative = String(row.initiative_ref ?? "").trim();
        const rowKey = String(row.row_key ?? "").trim();
        const problems = [...errorByRow[String(idx + 2)] ?? [], ...errorByRow[String(row.row_key ?? "")] ?? []];
        if (parent && type === "epic") problems.push("epics are top level \u2014 parent must be empty");
        const errors = problems.filter((problem) => !/can still be imported|warning/i.test(problem));
        const warnings = problems.filter((problem) => /can still be imported|warning/i.test(problem));
        return { idx, type, title, parent, labels, estimate, due, initiative, rowKey, assignee: String(row.owner ?? row.assignee ?? "").trim(), problems, errors, warnings, csv_text: csvText };
      });
      if (!parsed.length) {
        setImportError("No rows found in that input.");
        setImportRows(null);
        return;
      }
      if ((preview.errors ?? []).length && !parsed.some((row) => row.problems.length)) {
        setImportError((preview.errors ?? []).map((problem) => `Row ${problem.row}: ${problem.error}`).join("; "));
      }
      setImportRows(parsed);
      setImportValid(preview.valid === true && parsed.every((row) => !row.errors.length));
      if (advance) setImportStep(2);
    }).catch((bad) => {
      setImportBusy(false);
      setImportError(`Could not validate: ${String(bad?.message ?? bad).slice(0, 140)}`);
      setImportRows(null);
    });
  };
  const runImport = async () => {
    const good = (importRows ?? []).filter((row) => !row.errors.length);
    if (!good.length || good.length !== importRows.length) return;
    setImportBusy(true);
    try {
      const result = await api(`/projects/${encodeURIComponent(project.id)}/backlog/import`, {
        method: "POST",
        body: { csv_text: good[0].csv_text, apply: true }
      });
      setImportBusy(false);
      setImportResult({
        written: Number(result?.imported ?? 0),
        items: Array.isArray(result?.items) ? result.items : [],
        failed: (result?.preview?.errors ?? []).map((problem) => `row ${problem.row}: ${problem.error}`)
      });
      if (result?.preview?.valid === false) setImportError("The server rejected the import. Return to the source and correct the reported rows.");
      setImportStep(3);
      onRefresh();
    } catch (bad) {
      setImportBusy(false);
      setImportError(`Import failed before commit: ${String(bad?.message ?? bad).slice(0, 140)}`);
    }
  };
  const saveMove = async () => {
    if (!pendingMove || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/backlog/${encodeURIComponent(pendingMove.ref)}/rerank`, {
        method: "POST",
        body: { new_rank: pendingMove.newRank, reason: reason.trim() }
      });
      setPendingMove(null);
      setReason("");
      onRefresh();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setSaving(false);
  };
  const updateCreate = (key, value) => {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "parent") {
        const allowed = createTypesForParent(value);
        if (!allowed.includes(next.type)) next.type = allowed.includes("task") ? "task" : allowed[0] || "task";
      } else if (key === "type" && next.parent && !childTypesFor(workByRef[next.parent]?.type).includes(value)) {
        next.parent = "";
      }
      return next;
    });
    setCreateTouched((current) => ({ ...current, [key]: true }));
  };
  const maxInitialRank = entries.length + 1;
  const initialRank = Number(createForm.rank);
  const availableCreateTypes = createTypesForParent(createForm.parent);
  const availableCreateParents = createParentsForType(createForm.type);
  const estimateValid = createForm.estimate_days === "" || Number.isFinite(Number(createForm.estimate_days)) && Number(createForm.estimate_days) >= 0;
  const createFieldError = (key) => {
    if (!createTouched[key]) return null;
    if (key === "title" && createForm.title.trim().length < 3) return "At least 3 characters.";
    if (key === "assignee" && !createForm.assignee) return "Choose who picks this up.";
    if (key === "reason" && createForm.reason.trim().length < 4) return "A ranking reason is required (audit trail).";
    if (key === "estimate_days" && !estimateValid) return "Use a non-negative number of days.";
    if (key === "type" && !availableCreateTypes.includes(createForm.type)) return "Choose a supported type for this parent.";
    return null;
  };
  const createValid = createForm.title.trim().length >= 3 && Boolean(createForm.assignee) && Number.isInteger(initialRank) && initialRank >= 1 && initialRank <= maxInitialRank && createForm.reason.trim().length >= 4 && estimateValid && availableCreateTypes.includes(createForm.type) && (!createForm.parent || availableCreateParents.some((parent) => parent.ref === createForm.parent));
  const openCreate = (parentRef) => {
    if (!canCreate) return;
    const parent = typeof parentRef === "string" ? parentRef : "";
    const allowed = createTypesForParent(parent);
    if (parent && allowed.length === 0) return;
    const type = allowed.includes("task") ? "task" : allowed[0] || "task";
    setCreateForm({ type, title: "", body: "", labels: "", evidence_refs: "", assignee: "", initiative: "", estimate_days: "", rank: String(maxInitialRank), reason: "", parent, due: "" });
    setCreateTouched({});
    setCreateError(null);
    setCreateOpen(true);
  };
  const saveCreate = async () => {
    if (!createValid) return;
    setCreateSaving(true);
    setCreateError(null);
    try {
      const body = {
        type: createForm.type,
        title: createForm.title.trim(),
        body: createForm.body.trim() || null,
        labels: createForm.labels.split(",").map((label) => label.trim()).filter(Boolean),
        evidence_refs: createForm.evidence_refs.split(",").map((ref) => ref.trim()).filter(Boolean),
        assignee_id: createForm.assignee,
        assignee_kind: "bot",
        initiative_ref: createForm.initiative || null,
        parent_ref: createForm.parent || null,
        estimate_days: createForm.estimate_days === "" ? null : Number(createForm.estimate_days),
        due: createForm.due || null,
        rank: initialRank,
        reason: createForm.reason.trim()
      };
      const created = await api(`/projects/${encodeURIComponent(project.id)}/backlog/items`, { method: "POST", body });
      setCreateOpen(false);
      emitToast("success", `${created.ref || "Work item"} created and added to the backlog.`);
      onRefresh();
    } catch (failure) {
      setCreateError(String(failure?.message ?? failure));
    }
    setCreateSaving(false);
  };
  const selectedItems = bulkSelected.map((ref) => workByRef[ref]).filter(Boolean);
  const bulkSource = selectedItems[0]?.assignee || "";
  const bulkSameSource = selectedItems.length > 0 && selectedItems.every((item) => item.assignee === bulkSource);
  const toggleBulk = (ref) => {
    setBulkSelected((current) => current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref]);
    setBulkPreview(null);
    setBulkOperation(null);
    setBulkError(null);
  };
  const previewBulk = async () => {
    setBulkBusy(true);
    setBulkError(null);
    setBulkPreview(null);
    try {
      setBulkPreview(await api(`/projects/${encodeURIComponent(project.id)}/transfers/preview`, { method: "POST", body: { from_profile: bulkSource, to_profile: bulkReplacement } }));
    } catch (failure) {
      setBulkError(String(failure?.message ?? failure));
    }
    setBulkBusy(false);
  };
  const executeBulk = async () => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      const result = await api(`/projects/${encodeURIComponent(project.id)}/reassignments`, { method: "POST", body: {
        from_profile: bulkSource,
        to_profile: bulkReplacement,
        fingerprint: bulkPreview.fingerprint,
        selected_ids: bulkSelected,
        idempotency_key: `desktop-bulk-${bulkPreview.fingerprint}-${bulkSelected.join("-")}`
      } });
      setBulkOperation(await api(`/operations/${encodeURIComponent(result.op_id)}`));
      await onRefresh?.();
    } catch (failure) {
      setBulkPreview(null);
      setBulkError(`Preview is stale or reassignment failed: ${String(failure?.message ?? failure)}. Refresh the preview and retry.`);
    }
    setBulkBusy(false);
  };
  const retryBulk = async () => {
    setBulkBusy(true);
    setBulkError(null);
    try {
      await api(`/operations/${encodeURIComponent(bulkOperation.op_id)}/retry`, { method: "POST", body: {} });
      setBulkOperation(await api(`/operations/${encodeURIComponent(bulkOperation.op_id)}`));
      await onRefresh?.();
    } catch (failure) {
      setBulkError(String(failure?.message ?? failure));
    }
    setBulkBusy(false);
  };
  const previewEligible = new Set((bulkPreview?.eligible_items ?? []).map((item) => item.id));
  const selectedEligible = bulkSelected.length > 0 && bulkSelected.every((ref) => previewEligible.has(ref));
  const pendingParentItem = pendingMove?.mode === "parent" ? workByRef[pendingMove.ref] : null;
  const pendingCurrentParent = parentRefOf(pendingParentItem);
  const pendingParentRef = pendingMove?.parent_ref ?? pendingCurrentParent ?? "";
  const pendingParentChoices = pendingMove?.mode === "parent" ? reparentTargets(pendingMove.ref) : [];
  if (pendingCurrentParent && !pendingParentChoices.some((item) => item.ref === pendingCurrentParent) && workByRef[pendingCurrentParent]) {
    pendingParentChoices.unshift(workByRef[pendingCurrentParent]);
  }
  const pendingParentChanged = Boolean(pendingMove?.mode === "parent" && pendingParentRef !== pendingCurrentParent);
  const sortLabels = { rank: "Rank", type: "Type", title: "Work item", status: "Status", initiative: "Initiative", assignee: "Assignee", age: "Age", estimate: "Estimate", due: "Due date" };
  const sortHeader = (key, label, className = "") => jsx("button", {
    type: "button",
    className: `th-sort th-cell ${className}${sortKey === key ? " active" : ""}`.trim(),
    "data-head-sort": key,
    "data-dir": sortKey === key && sortDir < 0 ? "desc" : "asc",
    onClick: () => {
      if (sortKey === key) setSortDir(-sortDir);
      else {
        setSortKey(key);
        setSortDir(1);
      }
    },
    children: [label, jsx(Icon, { name: "chevron-down" }, "v4-chev")]
  });
  const resetFilters = () => {
    setSearch("");
    setColumnFilters({ type: "", status: "", initiative: "", assignee: "" });
  };
  const [transfers, setTransfers] = useState({});
  const transferProjectRef = useRef("");
  const transferRequestRef = useRef(0);
  useEffect(() => {
    transferProjectRef.current = project.id;
    const requestId = ++transferRequestRef.current;
    setTransfers({});
    let live = true;
    api(`/projects/${encodeURIComponent(project.id)}/transfers/pending`).then((result) => {
      if (!live || transferProjectRef.current !== project.id || transferRequestRef.current !== requestId) return;
      const next = {};
      for (const operation of result?.operations ?? []) next[operation.op_id] = operation;
      setTransfers(next);
    }).catch(() => {
    });
    return () => {
      live = false;
    };
  }, [project.id]);
  const showTransfer = (operation) => {
    if (!operation || operation.project_id !== project.id) return;
    setTransfers((current) => ({ ...current, [operation.op_id]: operation }));
  };
  const removeTransfer = (opId) => setTransfers((current) => {
    const next = { ...current };
    delete next[opId];
    return next;
  });
  const refreshTransfer = (opId) => {
    const requestProject = project.id;
    api(`/operations/${opId}`).then((operation) => {
      if (requestProject !== project.id) return;
      if (operation?.project_id !== requestProject) return;
      if (operation?.state === "completed") removeTransfer(opId);
      else showTransfer(operation);
    }).catch(() => {
    });
  };
  const retryTransfer = (opId) => {
    const requestProject = project.id;
    api(`/operations/${opId}/retry`, { method: "POST" }).then((operation) => {
      if (requestProject !== project.id) return;
      if (operation?.project_id !== requestProject) return;
      if (operation?.state === "completed") removeTransfer(opId);
      else showTransfer(operation);
    }).catch(() => {
    });
  };
  return BacklogBoard({
    ROOT_TYPES,
    STATUS_LABELS,
    STATUS_OPTIONS,
    STATUS_UI,
    TYPE_NAMES,
    activeFilterCount,
    assignItem,
    assigneeFilterValues,
    availableCreateParents,
    availableCreateTypes,
    branchMatch,
    bulkBusy,
    bulkError,
    bulkOperation,
    bulkPreview,
    bulkSameSource,
    bulkSelected,
    canCreate,
    cellError,
    changeStatus,
    changeType,
    childTypesFor,
    childrenOf,
    closeImport,
    cmMenu,
    collapsedSet,
    columnFilters,
    commitRank,
    commitTitle,
    createError,
    createForm,
    createOpen,
    createSaving,
    createTouched,
    createValid,
    detailItem,
    draggedRef,
    editing,
    entries,
    error,
    executeBulk,
    flashCell,
    groupBy,
    groups,
    hasFilters,
    hasUnassignedItems,
    hiddenCols,
    importBusy,
    importColumnMetadata,
    importError,
    importMode,
    importOpen,
    importResult,
    importRows,
    importSelected,
    importStep,
    importText,
    importValid,
    importWarningsOnly,
    initiativeFilterValues,
    initiativeLabel,
    maxInitialRank,
    menuRef,
    onRefresh,
    openCreate,
    ownerLabel,
    parentOf,
    parentRefOf,
    parseImport,
    pendingMove,
    pendingParentChanged,
    pendingParentChoices,
    pendingParentItem,
    pendingParentRef,
    previewBulk,
    project,
    q,
    reason,
    refreshTransfer,
    reparentTargets,
    requestMove,
    requestReparent,
    resetFilters,
    retryBulk,
    retryTransfer,
    runImport,
    saveCreate,
    saveMove,
    saveParent,
    saving,
    search,
    selectedEligible,
    setBulkError,
    setBulkOperation,
    setBulkPreview,
    setBulkReplacement,
    setBulkSelected,
    setCmMenu,
    setColumnFilters,
    setCreateOpen,
    setDetailItem,
    setDraggedRef,
    setEditing,
    setGroupBy,
    setImportBusy,
    setImportError,
    setImportMode,
    setImportOpen,
    setImportResult,
    setImportRows,
    setImportSelected,
    setImportStep,
    setImportText,
    setImportValid,
    setMenuRef,
    setPendingMove,
    setReason,
    setSearch,
    setSortDir,
    setSortKey,
    sortDir,
    sortHeader,
    sortKey,
    sortLabels,
    statusChoicesFor,
    statusFilterValues,
    todayISO,
    toggleBulk,
    toggleCollapse,
    transfers,
    treeRows,
    typeChoicesFor,
    typeFilterValues,
    typeLabel,
    updateCreate,
    view,
    workByRef
  });
}
var DOCKYARD_VIEW_TEST = Object.freeze({ name: "BacklogView" });

// hermes_dockyard_plugin/desktop/planning-canvas-geometry.js
var CANVAS_FRAME_PAD = Object.freeze({ side: 18, top: 30 });
var CANVAS_GRID = Object.freeze({ originX: 60, originY: 60, stepX: 340, stepY: 220 });
var LABEL_CHAR_W = 6;
var LABEL_PAD_X = 12;
var LABEL_H = 18;
var PARALLEL_GAP = 14;
var CARD_CLEARANCE = 4;
var rectOf = (item) => ({
  x: Number(item?.x) || 0,
  y: Number(item?.y) || 0,
  width: Number(item?.width) || 240,
  height: Number(item?.height) || 140
});
var overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
var inflate = (r, by) => ({ x: r.x - by, y: r.y - by, width: r.width + by * 2, height: r.height + by * 2 });
var labelSize = (text) => ({ width: String(text).length * LABEL_CHAR_W + LABEL_PAD_X, height: LABEL_H });
var anchors = (from, to) => {
  const fcx = from.x + from.width / 2;
  const fcy = from.y + from.height / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + to.height / 2;
  const hGap = Math.max(to.x - (from.x + from.width), from.x - (to.x + to.width));
  const vGap = Math.max(to.y - (from.y + from.height), from.y - (to.y + to.height));
  if (hGap >= vGap) {
    const rightward = tcx >= fcx;
    return { axis: "h", x1: rightward ? from.x + from.width : from.x, y1: fcy, x2: rightward ? to.x : to.x + to.width, y2: tcy };
  }
  const downward = tcy >= fcy;
  return { axis: "v", x1: fcx, y1: downward ? from.y + from.height : from.y, x2: tcx, y2: downward ? to.y : to.y + to.height };
};
var layoutConnectors = (objects, connectors, labelFor = (m) => m, world = { width: 2e3, height: 1400 }) => {
  const byId = new Map(objects.map((item) => [item.id, item]));
  const cards = objects.map((item) => inflate(rectOf(item), CARD_CLEARANCE));
  const pairs = /* @__PURE__ */ new Map();
  const valid = connectors.filter((edge) => byId.has(edge.source) && byId.has(edge.target) && edge.source !== edge.target);
  valid.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join("\0");
    pairs.set(key, [...pairs.get(key) ?? [], edge]);
  });
  const placed = [];
  const out = [];
  valid.forEach((edge) => {
    const key = [edge.source, edge.target].sort().join("\0");
    const siblings = pairs.get(key);
    const index = siblings.indexOf(edge);
    const offset = (index - (siblings.length - 1) / 2) * PARALLEL_GAP;
    const a = anchors(rectOf(byId.get(edge.source)), rectOf(byId.get(edge.target)));
    const line = a.axis === "h" ? { x1: a.x1, y1: a.y1 + offset, x2: a.x2, y2: a.y2 + offset } : { x1: a.x1 + offset, y1: a.y1, x2: a.x2 + offset, y2: a.y2 };
    const text = labelFor(edge.meaning);
    const size = labelSize(text);
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const candidates = [];
    for (let t = 0.05; t <= 0.951; t += 0.05) {
      for (let p = 0; p <= 160; p += 8) {
        for (const sign of p === 0 ? [1] : [-1, 1]) {
          const ax = line.x1 + dx * t;
          const ay = line.y1 + dy * t;
          const cx = ax + nx * p * sign;
          const cy = ay + ny * p * sign;
          candidates.push({ cost: Math.abs(t - 0.5) * length + p * 1.6, ax, ay, box: { x: cx - size.width / 2, y: cy - size.height / 2, width: size.width, height: size.height }, perp: p });
        }
      }
    }
    candidates.sort((l, r) => l.cost - r.cost);
    const free = (box) => box.x >= 0 && box.y >= 0 && box.x + box.width <= world.width && box.y + box.height <= world.height && !cards.some((card) => overlaps(box, card)) && !placed.some((other) => overlaps(box, inflate(other, 2)));
    const pick = candidates.find((c) => free(c.box)) ?? candidates[0];
    placed.push(pick.box);
    out.push({
      id: edge.id,
      meaning: edge.meaning,
      source: edge.source,
      target: edge.target,
      ...line,
      label: text,
      labelBox: pick.box,
      anchor: { x: pick.ax, y: pick.ay },
      // A label pushed away from its line gets a short leader so it is still
      // unmistakably attached to the right connector.
      leader: pick.perp > 14
    });
  });
  return out;
};
var layoutFrames = (objects, world = { width: 2e3, height: 1400 }) => {
  const groups = /* @__PURE__ */ new Map();
  objects.forEach((item) => {
    ;
    (Array.isArray(item.tags) ? item.tags : []).forEach((tag) => groups.set(tag, [...groups.get(tag) ?? [], item]));
  });
  return [...groups.entries()].filter(([, list]) => list.length >= 2).map(([tag, list]) => {
    const rects = list.map(rectOf);
    const left = Math.max(0, Math.min(...rects.map((r) => r.x)) - CANVAS_FRAME_PAD.side);
    const top = Math.max(0, Math.min(...rects.map((r) => r.y)) - CANVAS_FRAME_PAD.top);
    const right = Math.min(world.width, Math.max(...rects.map((r) => r.x + r.width)) + CANVAS_FRAME_PAD.side);
    const bottom = Math.min(world.height, Math.max(...rects.map((r) => r.y + r.height)) + CANVAS_FRAME_PAD.side);
    return { tag, x: left, y: top, width: right - left, height: bottom - top };
  });
};
var CANVAS_MIN_POS = Object.freeze({ x: CANVAS_FRAME_PAD.side, y: CANVAS_FRAME_PAD.top });
var gridSlot = (index, cols) => ({
  x: CANVAS_GRID.originX + index % cols * CANVAS_GRID.stepX,
  y: CANVAS_GRID.originY + Math.floor(index / cols) * CANVAS_GRID.stepY
});

// hermes_dockyard_plugin/desktop/src/project/rich-text.js
var RICH_TEXT_SIZES = Object.freeze(["small", "large", "huge"]);
var ALIGNS = ["left", "center", "right", "justify"];
var LIST_TYPES = ["1", "a", "A", "i", "I"];
var MAX_LIST_LEVELS = 5;
var MARK_ORDER = ["bold", "italic", "underline", "strike", "fontSize"];
var RICH_TEXT_LIMITS = Object.freeze({ chars: 2e4, nodes: 3e3, bytes: 64 * 1024 });
var ZWSP = /\u200B/g;
var plainToDoc = (text) => ({
  type: "doc",
  content: String(text ?? "").split("\n").map((line) => line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" })
});
var alignOf = (el) => {
  const raw = String(el.style?.textAlign || el.getAttribute?.("align") || "").toLowerCase();
  const value = raw === "start" ? "left" : raw === "end" ? "right" : raw;
  return ALIGNS.includes(value) && value !== "left" ? value : null;
};
var marksFor = (el, marks) => {
  const tag = el.tagName;
  const next = { ...marks };
  if (tag === "B" || tag === "STRONG" || Number(el.style?.fontWeight) >= 600 || el.style?.fontWeight === "bold") next.bold = true;
  if (tag === "I" || tag === "EM" || el.style?.fontStyle === "italic") next.italic = true;
  const deco = String(el.style?.textDecorationLine || el.style?.textDecoration || "");
  if (tag === "U" || deco.includes("underline")) next.underline = true;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL" || deco.includes("line-through")) next.strike = true;
  const size = el.getAttribute?.("data-size");
  if (size !== null && size !== void 0) next.fontSize = RICH_TEXT_SIZES.includes(size) ? size : null;
  return next;
};
var markList = (marks) => MARK_ORDER.filter((m) => marks[m]).map((m) => m === "fontSize" ? { type: "fontSize", attrs: { size: marks.fontSize } } : { type: m });
var sameMarks = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b);
var BLOCK_TAGS = /* @__PURE__ */ new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "SECTION", "ARTICLE", "HEADER", "FOOTER", "FIGURE", "DL", "DT", "DD"]);
var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "IMG", "SVG", "VIDEO", "AUDIO", "CANVAS", "HEAD", "TITLE", "META", "LINK", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);
function pushText(inline, text, marks) {
  const clean = text.replace(ZWSP, "").replace(/[\r\n\t\u00A0]+/g, " ");
  if (!clean) return;
  const m = markList(marks);
  const last = inline[inline.length - 1];
  if (last && last.type === "text" && sameMarks(last.marks, m.length ? m : void 0)) {
    last.text += clean;
    return;
  }
  inline.push(m.length ? { type: "text", text: clean, marks: m } : { type: "text", text: clean });
}
function readBlocks(parent, ctx, makeBlock = () => ({ type: "paragraph" })) {
  const blocks = [];
  let inline = [];
  const flush = () => {
    const trimmed = inline;
    if (trimmed.length && trimmed[trimmed.length - 1].type === "hardBreak") trimmed.pop();
    const hasText2 = trimmed.some((n) => n.type === "text" && n.text.trim());
    if (hasText2 || trimmed.some((n) => n.type === "hardBreak")) {
      const block = makeBlock();
      block.content = trimmed;
      blocks.push(block);
    }
    inline = [];
  };
  const readInline = (node, marks) => {
    if (node.nodeType === 3) {
      pushText(inline, node.nodeValue || "", marks);
      return;
    }
    if (node.nodeType !== 1 || SKIP_TAGS.has(node.tagName)) return;
    if (node.tagName === "BR") {
      inline.push({ type: "hardBreak" });
      return;
    }
    if (BLOCK_TAGS.has(node.tagName)) {
      flush();
      blocks.push(...readBlock(node, ctx));
      return;
    }
    const next = marksFor(node, marks);
    for (const child of node.childNodes) readInline(child, next);
  };
  for (const child of parent.childNodes) readInline(child, ctx.marks || {});
  flush();
  return blocks;
}
function readList(el, ctx) {
  const level = ctx.level + 1;
  const items = [];
  for (const child of el.childNodes) {
    if (child.nodeType === 1 && child.tagName === "LI") {
      const kids = readBlocks(child, { ...ctx, level });
      const content = kids.length ? kids : [{ type: "paragraph" }];
      if (content[0].type !== "paragraph" && content[0].type !== "heading") content.unshift({ type: "paragraph" });
      items.push({ type: "listItem", content: content.map((b) => b.type === "heading" ? { ...b, type: "paragraph", attrs: b.attrs?.textAlign ? { textAlign: b.attrs.textAlign } : void 0 } : b).map(stripUndefined) });
    } else if (child.nodeType === 1 && (child.tagName === "UL" || child.tagName === "OL")) {
      const nested = readList(child, { ...ctx, level });
      if (!nested.length) continue;
      if (items.length && level < MAX_LIST_LEVELS) items[items.length - 1].content.push(...nested);
      else items.push(...nested.flatMap((list2) => list2.content || []));
    } else {
      const loose = readBlocks({ childNodes: [child] }, { ...ctx, level });
      for (const b of loose) {
        if (b.type === "bulletList" || b.type === "orderedList") {
          if (items.length) items[items.length - 1].content.push(b);
          else items.push(...b.content || []);
        } else items.push({ type: "listItem", content: [b] });
      }
    }
  }
  if (!items.length) return [];
  const lifted = [];
  for (const item of items) {
    const keep = [];
    const extra = [];
    for (const b of item.content) {
      if (b.type === "__lift") extra.push(...b.content);
      else keep.push(b);
    }
    lifted.push({ ...item, content: keep.length ? keep : [{ type: "paragraph" }] }, ...extra);
  }
  if (level > MAX_LIST_LEVELS) {
    return [{ type: "__lift", content: lifted }];
  }
  const list = { type: el.tagName === "OL" ? "orderedList" : "bulletList", content: lifted };
  if (el.tagName === "OL") {
    const attrs = {};
    const start = Number.parseInt(el.getAttribute("start") ?? "1", 10);
    if (Number.isFinite(start) && start !== 1) attrs.start = Math.min(9999, Math.max(1, start));
    if (attrs.start === 1) delete attrs.start;
    const kind = el.getAttribute("type");
    if (kind && LIST_TYPES.includes(kind) && kind !== "1") attrs.type = kind;
    if (Object.keys(attrs).length) list.attrs = attrs;
  }
  return [list];
}
var stripUndefined = (node) => {
  if (node.attrs === void 0) delete node.attrs;
  return node;
};
function readBlock(el, ctx) {
  const tag = el.tagName;
  if (tag === "UL" || tag === "OL") return readList(el, ctx).map((b) => b.type === "__lift" && ctx.level === 0 ? { type: el.tagName === "OL" ? "orderedList" : "bulletList", content: b.content } : b);
  const align = alignOf(el);
  if (tag === "H1" || tag === "H2" || tag === "H3") {
    const level = Number(tag[1]);
    const inner2 = readBlocks(el, ctx, () => ({ type: "heading", attrs: align ? { level, textAlign: align } : { level } }));
    if (!inner2.length) return [{ type: "heading", attrs: align ? { level, textAlign: align } : { level } }];
    return inner2;
  }
  const inner = readBlocks(el, ctx, () => align ? { type: "paragraph", attrs: { textAlign: align } } : { type: "paragraph" });
  if (!inner.length && (tag === "P" || tag === "DIV")) return [align ? { type: "paragraph", attrs: { textAlign: align } } : { type: "paragraph" }];
  return inner;
}
var tidy = (node) => {
  if (node.content) {
    node.content = node.content.map(tidy);
    if (!node.content.length) delete node.content;
  }
  if (node.attrs && !Object.keys(node.attrs).length) delete node.attrs;
  return node;
};
var hasText = (node) => node.type === "text" ? Boolean(node.text.trim()) : (node.content || []).some(hasText);
var dropEmptyLists = (nodes) => nodes.filter((n) => !((n.type === "bulletList" || n.type === "orderedList") && !hasText(n))).map((n) => n.content && n.type !== "paragraph" && n.type !== "heading" ? { ...n, content: dropEmptyLists(n.content) } : n);
function domToDoc(root) {
  const blocks = readBlocks(root, { level: 0, marks: {} });
  const content = dropEmptyLists(blocks.flatMap((b) => b.type === "__lift" ? [{ type: "bulletList", content: b.content }] : [b]));
  return tidy({ type: "doc", content: content.length ? content : [{ type: "paragraph" }] });
}
function docToPlain(doc) {
  const lines = [];
  const inline = (node) => (node.content || []).map((k) => k.type === "text" ? k.text : "\n").join("");
  const block = (node, prefix = "", indent = 0) => {
    if (node.type === "paragraph" || node.type === "heading") lines.push("  ".repeat(indent) + prefix + inline(node));
    else if (node.type === "bulletList" || node.type === "orderedList") {
      const start = node.attrs?.start ?? 1;
      (node.content || []).forEach((item, i) => {
        const marker = node.type === "bulletList" ? "- " : `${start + i}. `;
        (item.content || []).forEach((child, j) => {
          if (child.type === "bulletList" || child.type === "orderedList") block(child, "", indent + 1);
          else block(child, j === 0 ? marker : "", indent);
        });
      });
    }
  };
  for (const node of doc?.content || []) block(node);
  return lines.join("\n").trim();
}
function serverJsonBytes(value) {
  const enc = new TextEncoder();
  const size = (v, top = false) => {
    if (Array.isArray(v)) return 2 + v.reduce((n, x) => n + size(x), 0) + Math.max(0, v.length - 1) * 2;
    if (v && typeof v === "object") {
      const keys = Object.keys(v).filter((k) => v[k] !== void 0 && (!top || v[k] !== null && v[k] !== ""));
      return 2 + keys.reduce((n, k) => n + enc.encode(JSON.stringify(k)).length + 2 + size(v[k]), 0) + Math.max(0, keys.length - 1) * 2;
    }
    return enc.encode(JSON.stringify(v ?? null)).length;
  };
  return size(value, true);
}
function docProblem(doc, rest = {}) {
  let nodes = 0;
  const count = (node) => {
    for (const child of node.content || []) {
      nodes += 1;
      count(child);
    }
  };
  count(doc);
  const chars = [...docToPlain(doc)].length;
  const counted = { ...rest, description_doc: doc };
  delete counted.description;
  const bytes = serverJsonBytes(counted);
  if (chars > RICH_TEXT_LIMITS.chars) return `Too long: ${chars.toLocaleString("en-GB")} of ${RICH_TEXT_LIMITS.chars.toLocaleString("en-GB")} characters. Shorten it before applying.`;
  if (nodes > RICH_TEXT_LIMITS.nodes) return `Too much formatting: ${nodes.toLocaleString("en-GB")} of ${RICH_TEXT_LIMITS.nodes.toLocaleString("en-GB")} pieces. Remove some paragraphs or formatting before applying.`;
  if (bytes > RICH_TEXT_LIMITS.bytes) return "This card is too large to save. Remove some text or formatting before applying.";
  return null;
}
function renderInline(parent, nodes) {
  for (const node of nodes || []) {
    if (node.type === "hardBreak") {
      parent.appendChild(document.createElement("br"));
      continue;
    }
    if (node.type !== "text" || typeof node.text !== "string") continue;
    let el = document.createTextNode(node.text);
    for (const mark of [...node.marks || []].reverse()) {
      const tag = { bold: "strong", italic: "em", underline: "u", strike: "s" }[mark.type];
      let wrap = null;
      if (tag) wrap = document.createElement(tag);
      else if (mark.type === "fontSize" && RICH_TEXT_SIZES.includes(mark.attrs?.size)) {
        wrap = document.createElement("span");
        wrap.setAttribute("data-size", mark.attrs.size);
        wrap.className = `dy-rt-${mark.attrs.size}`;
      }
      if (wrap) {
        wrap.appendChild(el);
        el = wrap;
      }
    }
    parent.appendChild(el);
  }
}
function renderBlock(node) {
  let el;
  if (node.type === "heading") el = document.createElement(`h${[1, 2, 3].includes(node.attrs?.level) ? node.attrs.level : 2}`);
  else if (node.type === "bulletList" || node.type === "orderedList") {
    el = document.createElement(node.type === "bulletList" ? "ul" : "ol");
    if (node.type === "orderedList" && Number.isInteger(node.attrs?.start)) el.setAttribute("start", String(node.attrs.start));
    if (node.type === "orderedList" && LIST_TYPES.includes(node.attrs?.type)) el.setAttribute("type", node.attrs.type);
    for (const item of node.content || []) {
      const li = document.createElement("li");
      for (const child of item.content || []) li.appendChild(renderBlock(child));
      el.appendChild(li);
    }
    return el;
  } else el = document.createElement("p");
  if (ALIGNS.includes(node.attrs?.textAlign) && node.attrs.textAlign !== "left") el.style.textAlign = node.attrs.textAlign;
  renderInline(el, node.content);
  if (!el.childNodes.length) el.appendChild(document.createElement("br"));
  return el;
}
function renderDoc(target, doc) {
  while (target.firstChild) target.removeChild(target.firstChild);
  const blocks = doc && doc.type === "doc" && Array.isArray(doc.content) && doc.content.length ? doc.content : [{ type: "paragraph" }];
  for (const node of blocks) target.appendChild(renderBlock(node));
}
var closestIn = (host2, node, test) => {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== host2) {
    if (test(el)) return el;
    el = el.parentElement;
  }
  return null;
};
var blockOf = (host2, node) => closestIn(host2, node, (el) => /^(P|DIV|H[1-6]|LI)$/.test(el.tagName));
var listDepth = (host2, node) => {
  let n = 0;
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== host2) {
    if (el.tagName === "UL" || el.tagName === "OL") n += 1;
    el = el.parentElement;
  }
  return n;
};
var exec = (command, value) => document.execCommand(command, false, value);
var RENAME = { B: "strong", I: "em", STRIKE: "s", DEL: "s" };
var INNER_BLOCKS = /* @__PURE__ */ new Set(["P", "DIV", "H1", "H2", "H3", "UL", "OL"]);
function normaliseDom(host2, { afterDelete = false } = {}) {
  const sel = window.getSelection();
  const keep = sel.rangeCount && host2.contains(sel.anchorNode) ? [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset] : null;
  const swap = (el, tag) => {
    const next = document.createElement(tag);
    for (const attr of el.attributes) if (attr.name === "style" || attr.name === "data-size" || attr.name === "class" || attr.name === "start" || attr.name === "type") next.setAttribute(attr.name, attr.value);
    while (el.firstChild) next.appendChild(el.firstChild);
    el.replaceWith(next);
    return next;
  };
  let changed = false;
  const unwrap = (el) => {
    el.replaceWith(...el.childNodes);
    changed = true;
  };
  const walker = document.createTreeWalker(host2, 4);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const value = text.nodeValue || "";
    if (!value.includes("\u200B") || value.replace(ZWSP, "") === "") continue;
    if (keep) {
      for (const i of [0, 2]) {
        if (keep[i] === text) keep[i + 1] -= (value.slice(0, keep[i + 1]).match(ZWSP) || []).length;
      }
    }
    text.nodeValue = value.replace(ZWSP, "");
    changed = true;
  }
  for (const el of [...host2.querySelectorAll("b, i, strike, del")]) {
    swap(el, RENAME[el.tagName]);
    changed = true;
  }
  for (const el of [...host2.children]) if (el.tagName === "DIV") {
    swap(el, "p");
    changed = true;
  }
  for (const el of [...host2.querySelectorAll("font, span:not([data-size])")]) unwrap(el);
  for (const el of [...host2.querySelectorAll("strong, em, u, s, [data-size]")]) {
    if (el.style && el.style.length) {
      el.removeAttribute("style");
      changed = true;
    }
  }
  for (const el of [...host2.querySelectorAll("ul, ol")]) if (!el.querySelector("li")) {
    el.remove();
    changed = true;
  }
  if (afterDelete && !host2.textContent.replace(ZWSP, "").trim() && host2.querySelector("ul, ol")) {
    while (host2.firstChild) host2.removeChild(host2.firstChild);
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    host2.appendChild(p);
    if (keep) {
      keep[0] = p;
      keep[1] = 0;
      keep[2] = p;
      keep[3] = 0;
    }
    changed = true;
  }
  for (const el of [...host2.querySelectorAll("li[style], li > p[style], li > h1[style], li > h2[style], li > h3[style]")]) {
    if (el.style.textAlign) {
      el.style.removeProperty("text-align");
      if (!el.getAttribute("style")) el.removeAttribute("style");
      changed = true;
    }
  }
  for (let guard = 0; guard < 200; guard += 1) {
    const outer = [...host2.querySelectorAll("p, h1, h2, h3")].find((el) => [...el.children].some((c) => INNER_BLOCKS.has(c.tagName)));
    if (!outer) break;
    let anchor = outer;
    let run = null;
    for (const child of [...outer.childNodes]) {
      const isBlock = child.nodeType === 1 && INNER_BLOCKS.has(child.tagName);
      if (!isBlock && child === outer.firstChild) continue;
      if (isBlock) {
        anchor.after(child);
        anchor = child;
        run = null;
      } else if (anchor !== outer) {
        if (!run) {
          run = outer.cloneNode(false);
          anchor.after(run);
          anchor = run;
        }
        run.appendChild(child);
      }
    }
    if (!outer.childNodes.length) outer.remove();
    changed = true;
  }
  if (changed && keep && keep[0].isConnected && keep[2].isConnected) {
    try {
      sel.setBaseAndExtent(keep[0], keep[1], keep[2], keep[3]);
    } catch {
    }
  }
}
var TOOLS = [
  ["bold", "Bold (Ctrl+B)", "B", () => exec("bold"), (s) => s.bold],
  ["italic", "Italic (Ctrl+I)", "I", () => exec("italic"), (s) => s.italic],
  ["underline", "Underline (Ctrl+U)", "U", () => exec("underline"), (s) => s.underline],
  ["strike", "Strikethrough", "S", () => exec("strikeThrough"), (s) => s.strike],
  null,
  ["bullets", "Bullet list", { icon: "list" }, () => exec("insertUnorderedList"), (s) => s.list === "UL"],
  ["numbers", "Numbered list", { icon: "list-ordered" }, () => exec("insertOrderedList"), (s) => s.list === "OL"],
  null,
  ["left", "Align left", { icon: "align-left" }, () => exec("justifyLeft"), (s) => s.align === "left"],
  ["center", "Align centre", { icon: "align-center" }, () => exec("justifyCenter"), (s) => s.align === "center"],
  ["right", "Align right", { icon: "align-right" }, () => exec("justifyRight"), (s) => s.align === "right"],
  ["justify", "Justify", { icon: "align-justify" }, () => exec("justifyFull"), (s) => s.align === "justify"]
];
var POS_BLOCKS = /* @__PURE__ */ new Set(["P", "H1", "H2", "H3", "LI"]);
function measure(host2, target, targetOffset) {
  let n = 0;
  const go = (el) => {
    if (el.nodeType === 3) {
      if (el === target) return n + Math.min(targetOffset, el.nodeValue.length);
      n += el.nodeValue.length;
      return null;
    }
    if (el.nodeType !== 1) return null;
    if (el !== host2 && POS_BLOCKS.has(el.tagName) && !(el.tagName === "P" && el.parentElement?.tagName === "LI")) n += 1;
    if (el.tagName === "BR") n += 1;
    const kids = el.childNodes;
    for (let i = 0; i < kids.length; i += 1) {
      if (el === target && i === targetOffset) return n;
      const found2 = go(kids[i]);
      if (found2 !== null) return found2;
    }
    return el === target ? n : null;
  };
  const found = go(host2);
  return found === null ? n : found;
}
function locate(host2, pos) {
  let n = 0;
  let last = [host2, 0];
  const go = (el) => {
    if (el.nodeType === 3) {
      const len = el.nodeValue.length;
      if (pos <= n + len) return [el, pos - n];
      n += len;
      last = [el, len];
      return null;
    }
    if (el.nodeType !== 1) return null;
    if (el !== host2 && POS_BLOCKS.has(el.tagName) && !(el.tagName === "P" && el.parentElement?.tagName === "LI")) {
      n += 1;
      if (n >= pos && !el.querySelector("li")) return [el, 0];
    }
    if (el.tagName === "BR") {
      n += 1;
      if (n >= pos) return [el.parentNode, [...el.parentNode.childNodes].indexOf(el) + 1];
    }
    for (const child of el.childNodes) {
      const found = go(child);
      if (found) return found;
    }
    return null;
  };
  return go(host2) || last;
}
var MARK_TAGS = /* @__PURE__ */ new Set(["STRONG", "B", "EM", "I", "U", "S", "STRIKE", "DEL"]);
var isMark = (el) => MARK_TAGS.has(el.tagName) || el.hasAttribute?.("data-size");
function selectedTexts(host2) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  if (range.collapsed || !host2.contains(range.commonAncestorContainer)) return [];
  const { endContainer: ec, endOffset: eo } = range;
  if (ec.nodeType === 3 && eo > 0 && eo < ec.nodeValue.length) ec.splitText(eo);
  const { startContainer: sc, startOffset: so } = range;
  let first = null;
  if (sc.nodeType === 3 && so > 0 && so < sc.nodeValue.length) first = sc.splitText(so);
  const out = [];
  const walker = document.createTreeWalker(host2, 4);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!text.nodeValue || !range.intersectsNode(text)) continue;
    if (text === sc && !first && so >= text.nodeValue.length) continue;
    if (text === ec && eo === 0 && text !== first) continue;
    if (first && text === sc) continue;
    out.push(text);
  }
  return out;
}
var reselect = (texts) => {
  if (!texts.length) return;
  const last = texts[texts.length - 1];
  window.getSelection().setBaseAndExtent(texts[0], 0, last, last.nodeValue.length);
};
function splitAround(outer, node) {
  const before = document.createRange();
  before.setStart(outer, 0);
  before.setEndBefore(node);
  const head = outer.cloneNode(false);
  head.appendChild(before.extractContents());
  const after = document.createRange();
  after.setStartAfter(node);
  after.setEnd(outer, outer.childNodes.length);
  const tail = outer.cloneNode(false);
  tail.appendChild(after.extractContents());
  if (head.textContent) outer.before(head);
  if (tail.textContent) outer.after(tail);
}
function liftOut(host2, node, test) {
  for (let guard = 0; guard < 20; guard += 1) {
    const outer = closestIn(host2, node, test);
    if (!outer || POS_BLOCKS.has(outer.tagName)) return;
    splitAround(outer, node);
    outer.replaceWith(...outer.childNodes);
  }
}
var sizeSpan = (size) => {
  const span = document.createElement("span");
  span.setAttribute("data-size", size);
  span.className = `dy-rt-${size}`;
  return span;
};
var blocksIn = (host2) => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  const caretBlock = blockOf(host2, range.startContainer);
  const endBlock = blockOf(host2, range.endContainer);
  let skip = null;
  if (endBlock && endBlock !== caretBlock) {
    const head = document.createRange();
    head.setStart(endBlock, 0);
    head.setEnd(range.endContainer, range.endOffset);
    if (head.toString() === "") skip = endBlock;
  }
  const all = [...host2.querySelectorAll("p, h1, h2, h3, li")].filter((el) => el !== skip && range.intersectsNode(el) && !(skip && skip.contains(el)));
  return all.length ? all : caretBlock ? [caretBlock] : [];
};
function setBlockStyle(host2, style) {
  const sel = window.getSelection();
  if (style !== "p" && sel.rangeCount) {
    for (let guard = 0; guard < MAX_LIST_LEVELS + 1; guard += 1) {
      if (!closestIn(host2, sel.anchorNode, (el) => el.tagName === "LI")) break;
      exec("outdent");
    }
  }
  exec("formatBlock", style);
}
function clearFormatting(host2) {
  const texts = selectedTexts(host2);
  const blocks = blocksIn(host2);
  for (const text of texts) liftOut(host2, text, isMark);
  for (const block of blocks) {
    block.style.removeProperty("text-align");
    if (!block.getAttribute("style")) block.removeAttribute("style");
    block.removeAttribute("align");
    if (/^H[1-3]$/.test(block.tagName)) {
      const p = document.createElement("p");
      p.append(...block.childNodes);
      block.replaceWith(p);
    }
  }
  reselect(texts);
}
function stateAt(host2) {
  const empty = { style: "p", size: "normal", align: "left", list: null, bold: false, italic: false, underline: false, strike: false };
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!host2 || !sel || !sel.rangeCount || !host2.contains(sel.anchorNode)) return empty;
  const node = sel.anchorNode;
  const heading = closestIn(host2, node, (el) => /^H[1-3]$/.test(el.tagName));
  const sized = closestIn(host2, node, (el) => el.hasAttribute("data-size"));
  const list = closestIn(host2, node, (el) => el.tagName === "UL" || el.tagName === "OL");
  const block = blockOf(host2, node);
  const align = !list && block && alignOf(block) || "left";
  const q = (c) => {
    try {
      return document.queryCommandState(c);
    } catch {
      return false;
    }
  };
  const has = (tags) => Boolean(closestIn(host2, node, (el) => tags.includes(el.tagName)));
  return {
    style: heading ? heading.tagName.toLowerCase() : "p",
    size: sized && RICH_TEXT_SIZES.includes(sized.getAttribute("data-size")) ? sized.getAttribute("data-size") : "normal",
    align,
    list: list ? list.tagName : null,
    anyList: Boolean(list) || blocksIn(host2).some((b) => closestIn(host2, b, (el) => el.tagName === "UL" || el.tagName === "OL")),
    bold: has(["STRONG", "B"]) || !heading && q("bold"),
    italic: has(["EM", "I"]) || q("italic"),
    underline: has(["U"]) || q("underline"),
    strike: has(["S", "STRIKE", "DEL"]) || q("strikeThrough")
  };
}
function applySize(host2, size) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    const current = closestIn(host2, range.startContainer, (el) => el.hasAttribute("data-size"));
    const marker = document.createTextNode("\u200B");
    if (size === "normal") {
      if (!current) return;
      current.parentNode.insertBefore(marker, current.nextSibling);
    } else {
      const span = sizeSpan(size);
      span.appendChild(marker);
      if (current) current.parentNode.insertBefore(span, current.nextSibling);
      else range.insertNode(span);
    }
    const caret = document.createRange();
    caret.setStart(marker, 1);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    return;
  }
  const texts = selectedTexts(host2);
  for (const text of texts) {
    liftOut(host2, text, (el) => el.hasAttribute("data-size"));
    if (size !== "normal") {
      const span = sizeSpan(size);
      text.before(span);
      span.appendChild(text);
    }
  }
  reselect(texts);
}
function RichTextEditor({ value, fallbackText, onChange, onProblem, rest, readOnly, label = "Description" }) {
  const host2 = useRef(null);
  const saved = useRef(null);
  const changeRef = useRef(onChange);
  const problemRef = useRef(onProblem);
  const restRef = useRef(rest);
  restRef.current = rest;
  const history = useRef({ stack: [], index: -1 });
  const dragging = useRef(false);
  const [state, setState] = useState(stateAt(null));
  const [problem, setProblem] = useState(null);
  const restSize = serverJsonBytes(rest ?? {});
  changeRef.current = onChange;
  problemRef.current = onProblem;
  const refresh = () => {
    const el = host2.current;
    const sel = window.getSelection();
    if (el && sel.rangeCount && el.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
    setState(stateAt(el));
  };
  const caretNow = () => {
    const el = host2.current;
    const sel = window.getSelection();
    if (!el || !sel.rangeCount || !el.contains(sel.anchorNode)) return [0, 0];
    return [measure(el, sel.anchorNode, sel.anchorOffset), measure(el, sel.focusNode, sel.focusOffset)];
  };
  const report = (doc) => {
    const found = docProblem(doc, restRef.current || {});
    setProblem(found);
    problemRef.current?.(found);
  };
  const pendingBefore = useRef(null);
  const markBefore = () => {
    if (!pendingBefore.current) pendingBefore.current = caretNow();
  };
  const record = (doc, typing) => {
    const h = history.current;
    const json = JSON.stringify(doc);
    const top = h.stack[h.index];
    const before = pendingBefore.current || (top ? top.caret : [0, 0]);
    pendingBefore.current = null;
    if (top && top.json === json) {
      top.caret = caretNow();
      return;
    }
    const entry = { doc, json, caret: caretNow(), before, typing, at: Date.now() };
    if (typing && top && top.typing === typing && entry.at - top.at < 1e3 && h.index > 0 && h.index === h.stack.length - 1) h.stack[h.index] = { ...entry, before: top.before };
    else {
      h.stack = [...h.stack.slice(0, h.index + 1), entry].slice(-200);
      h.index = h.stack.length - 1;
    }
  };
  const emit = (typing = false) => {
    const el = host2.current;
    if (!el) return;
    normaliseDom(el, { afterDelete: typing === "delete" });
    const doc = domToDoc(el);
    record(doc, typing);
    changeRef.current?.(doc, docToPlain(doc));
    report(doc);
    refresh();
  };
  const travel = (step) => {
    const el = host2.current;
    const h = history.current;
    const next = h.index + step;
    if (!el || readOnly || next < 0 || next >= h.stack.length) return;
    const caret = step < 0 ? h.stack[h.index].before || h.stack[next].caret : h.stack[next].caret;
    h.index = next;
    const { doc } = h.stack[next];
    renderDoc(el, doc);
    el.focus();
    const [a, ao] = locate(el, caret[0]);
    const [f, fo] = locate(el, caret[1]);
    try {
      window.getSelection().setBaseAndExtent(a, ao, f, fo);
    } catch {
    }
    changeRef.current?.(doc, docToPlain(doc));
    report(doc);
    refresh();
  };
  useEffect(() => {
    const el = host2.current;
    renderDoc(el, value && value.type === "doc" ? value : plainToDoc(fallbackText));
    try {
      exec("defaultParagraphSeparator", "p");
      exec("styleWithCSS", false);
    } catch {
    }
    const first = domToDoc(el);
    history.current = { stack: [{ doc: first, json: JSON.stringify(first), caret: [0, 0], typing: false, at: 0 }], index: 0 };
    report(first);
    const onSelection = () => {
      if (document.activeElement === el) refresh();
    };
    const onBeforeInput = (event) => {
      if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
        event.preventDefault();
        travel(event.inputType === "historyUndo" ? -1 : 1);
        return;
      }
      markBefore();
    };
    document.addEventListener("selectionchange", onSelection);
    el.addEventListener("beforeinput", onBeforeInput);
    return () => {
      document.removeEventListener("selectionchange", onSelection);
      el.removeEventListener("beforeinput", onBeforeInput);
    };
  }, []);
  useEffect(() => {
    if (host2.current && history.current.stack.length) report(domToDoc(host2.current));
  }, [restSize]);
  const run = (act) => {
    const el = host2.current;
    if (!el || readOnly) return;
    el.focus();
    if (saved.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(saved.current);
    }
    markBefore();
    act(el);
    emit();
  };
  const onKeyDown = (event) => {
    if (readOnly) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (mod && !event.altKey && (key === "z" || key === "y")) {
      event.preventDefault();
      travel(key === "y" || event.shiftKey ? 1 : -1);
      return;
    }
    if (event.key === "Tab") {
      const sel = window.getSelection();
      const li = sel.rangeCount ? closestIn(host2.current, sel.anchorNode, (n) => n.tagName === "LI") : null;
      if (!li) return;
      event.preventDefault();
      if (event.shiftKey) exec("outdent");
      else if (listDepth(host2.current, li) < MAX_LIST_LEVELS) exec("indent");
      emit();
    }
  };
  const insertData = (data, range) => {
    markBefore();
    const html = data.getData("text/html");
    if (!html && !data.getData("text/plain")) return;
    const doc = html ? domToDoc(new DOMParser().parseFromString(html, "text/html").body) : plainToDoc(data.getData("text/plain"));
    const scratch = document.createElement("div");
    renderDoc(scratch, doc);
    const sel = window.getSelection();
    range.deleteContents();
    const frag = document.createDocumentFragment();
    if (scratch.childNodes.length === 1 && scratch.firstChild.tagName === "P") frag.append(...scratch.firstChild.childNodes);
    else frag.append(...scratch.childNodes);
    const last = frag.lastChild;
    const line = blockOf(host2.current, range.startContainer);
    const blocks = frag.firstChild && frag.firstChild.nodeType === 1 && /^(P|H[1-3]|UL|OL)$/.test(frag.firstChild.tagName);
    if (blocks && line && line.parentNode === host2.current && !line.textContent.replace(ZWSP, "")) line.replaceWith(frag);
    else range.insertNode(frag);
    if (last) {
      const caret = document.createRange();
      caret.setStartAfter(last);
      caret.collapse(true);
      sel.removeAllRanges();
      sel.addRange(caret);
    }
    emit();
  };
  const onPaste = (event) => {
    if (readOnly) return;
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();
    const sel = window.getSelection();
    if (!sel.rangeCount || !host2.current.contains(sel.anchorNode)) return;
    insertData(data, sel.getRangeAt(0));
  };
  const onDrop = (event) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    if (dragging.current) return;
    event.preventDefault();
    const data = event.dataTransfer;
    if (!data) return;
    const at = document.caretRangeFromPoint ? document.caretRangeFromPoint(event.clientX, event.clientY) : null;
    const range = at && host2.current.contains(at.startContainer) ? at : (() => {
      const r = document.createRange();
      r.selectNodeContents(host2.current);
      r.collapse(false);
      return r;
    })();
    host2.current.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    insertData(data, range);
  };
  const button = (tool) => {
    const [id, title, face, act, active] = tool;
    const on = Boolean(active(state));
    return jsx("button", {
      type: "button",
      className: `dy-rt-btn${on ? " on" : ""}`,
      "data-rt": id,
      title: ALIGNS.includes(id) && state.anyList ? `${title} (not available in lists)` : title,
      "aria-label": title,
      "aria-pressed": on ? "true" : "false",
      // Alignment is not stored on list items (Quan re-check L1).
      disabled: readOnly || ALIGNS.includes(id) && Boolean(state.anyList),
      onMouseDown: (event) => event.preventDefault(),
      onClick: () => run(act),
      children: typeof face === "string" ? jsx("span", { className: `dy-rt-face dy-rt-face-${id}`, children: face }) : jsx(Icon, { name: face.icon })
    }, id);
  };
  return jsxs("div", { className: "dy-rt", "data-canvas-rich-editor": true, children: [
    jsx("span", { className: "dy-pc-field-label", children: label }),
    // Owner 01/10: two tidy rows (style + size, then the buttons) instead of
    // letting everything wrap into a ragged five-row stack.
    readOnly ? null : jsxs("div", { className: "dy-rt-bar", role: "toolbar", "aria-label": "Text formatting", children: [
      jsxs("div", { className: "dy-rt-row dy-rt-row-sel", children: [
        jsxs("select", {
          className: "dy-rt-select",
          "data-rt": "style",
          "aria-label": "Text style",
          value: state.style,
          onChange: (event) => {
            const v = event.target.value;
            run((el) => setBlockStyle(el, v));
          },
          children: [["p", "Normal text"], ["h1", "Heading 1"], ["h2", "Heading 2"], ["h3", "Heading 3"]].map(([v, t]) => jsx("option", { value: v, children: t }, v))
        }),
        jsxs("select", {
          className: "dy-rt-select",
          "data-rt": "size",
          "aria-label": "Text size",
          value: state.size,
          onChange: (event) => {
            const v = event.target.value;
            run((el) => applySize(el, v));
          },
          children: [["small", "Small"], ["normal", "Normal size"], ["large", "Large"], ["huge", "Huge"]].map(([v, t]) => jsx("option", { value: v, children: t }, v))
        })
      ] }, "sel"),
      jsxs("div", { className: "dy-rt-row", children: [
        ...TOOLS.map((tool, i) => tool ? button(tool) : jsx("span", { className: "dy-rt-sep", "aria-hidden": "true" }, `sep-${i}`)),
        jsx("button", {
          type: "button",
          className: "dy-rt-btn",
          "data-rt": "clear",
          title: "Clear formatting",
          "aria-label": "Clear formatting",
          disabled: readOnly,
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => run((el) => clearFormatting(el)),
          children: jsx(Icon, { name: "remove-formatting" })
        }, "clear")
      ] }, "btns")
    ] }),
    problem ? jsx("p", { className: "dy-rt-problem", role: "alert", "data-canvas-rich-problem": true, children: problem }) : null,
    jsx("div", { className: `dy-rt-host${readOnly ? " readonly" : ""}`, children: jsx("div", {
      ref: host2,
      className: "dy-rt-body",
      "data-canvas-rich-text": "true",
      role: "textbox",
      "aria-multiline": "true",
      "aria-label": label,
      contentEditable: readOnly ? "false" : "true",
      suppressContentEditableWarning: true,
      spellCheck: true,
      onInput: (event) => {
        const kind = String(event.nativeEvent?.inputType || "");
        emit(kind.startsWith("insertText") ? "insert" : kind.startsWith("delete") ? "delete" : false);
      },
      onKeyDown,
      onPaste,
      onDrop,
      onDragOver: (event) => {
        if (!dragging.current) event.preventDefault();
      },
      onDragStart: () => {
        dragging.current = true;
      },
      onDragEnd: () => {
        dragging.current = false;
      },
      onKeyUp: refresh,
      onMouseUp: refresh,
      onFocus: refresh
    }) })
  ] });
}

// hermes_dockyard_plugin/desktop/src/project/canvas.js
var CANVAS_OBJECT_KINDS = Object.freeze(["evidence", "claim", "question", "decision", "plan_block", "risk", "assumption", "note", "link", "media"]);
var CANVAS_CONNECTOR_MEANINGS = Object.freeze(["supports", "contradicts", "derived_from", "clarifies", "depends_on", "implements", "raises_question"]);
var CANVAS_KIND_LABELS = Object.freeze({ evidence: "Evidence", claim: "Claim", question: "Question", decision: "Decision", plan_block: "Plan block", risk: "Risk", assumption: "Assumption", note: "Note", link: "Link", media: "Media" });
var CANVAS_STICKER_COLOURS = Object.freeze(["yellow", "orange", "coral", "pink", "purple", "indigo", "blue", "teal", "green", "lime", "clay", "slate"]);
var CANVAS_STICKER_LABELS = Object.freeze({ yellow: "Sun", green: "Mint", blue: "Sky", pink: "Rose", purple: "Violet", orange: "Amber", coral: "Coral", teal: "Teal", lime: "Lime", clay: "Clay", slate: "Slate", indigo: "Indigo" });
var CANVAS_KIND_ICONS = Object.freeze({
  evidence: "file-text",
  claim: "message-square",
  question: "lightbulb",
  decision: "flag",
  plan_block: "list-checks",
  note: "sticky-note",
  link: "link",
  media: "image",
  risk: "shield-alert",
  assumption: "circle-help"
});
var LEVELS = ["low", "medium", "high"];
var CANVAS_KIND_FIELDS = Object.freeze({
  evidence: [["source", "text", "Source", null, 300], ["observed_on", "date", "Date observed"], ["confidence", "choice", "Confidence", LEVELS], ["quote", "area", "Quote", null, 5e3]],
  claim: [["claim_status", "choice", "Status", ["unverified", "supported", "disputed", "refuted"]], ["confidence", "choice", "Confidence", LEVELS]],
  question: [["question_status", "choice", "Status", ["open", "answered"]], ["owner", "member", "Owner"], ["answer", "area", "Answer", null, 5e3]],
  decision: [["decision_status", "choice", "Status", ["proposed", "accepted", "rejected", "superseded"]], ["decided_by", "member", "Decided by"], ["decided_on", "date", "Decided on"], ["rationale", "area", "Rationale", null, 5e3], ["alternatives", "list", "Alternatives considered"]],
  plan_block: [["plan_status", "choice", "Status", ["todo", "in_progress", "blocked", "done"]], ["owner", "member", "Owner"], ["due_on", "date", "Due"], ["estimate", "text", "Estimate", null, 50], ["checklist", "checklist", "Checklist"]],
  risk: [["risk_status", "choice", "Status", ["open", "mitigating", "closed"]], ["likelihood", "choice", "Likelihood", LEVELS], ["impact", "choice", "Impact", LEVELS], ["owner", "member", "Owner"], ["mitigation", "area", "Mitigation", null, 5e3]],
  assumption: [["assumption_status", "choice", "Status", ["untested", "validated", "invalidated"]], ["confidence", "choice", "Confidence", LEVELS], ["test", "area", "How we will test it", null, 2e3]],
  media: [["content_id", "image", "Image"], ["alt", "text", "Alt text (describes the image)", null, 300], ["caption", "text", "Caption", null, 500]],
  link: [],
  note: []
});
var canvasChoiceLabel = (value) => ({ todo: "To do", in_progress: "In progress" })[value] ?? (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");
var CANVAS_IMAGE_TYPES = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" });
var CANVAS_IMAGE_MAX = 5 * 1024 * 1024;
var canvasSafeUrl = (value) => /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(String(value ?? "").trim());
var linksOf = (content) => Array.isArray(content?.links) ? content.links : content?.url ? [{ url: content.url }] : [];
var canvasSummary = (item) => {
  const c = item?.content ?? {};
  const parts = [];
  const status = (CANVAS_KIND_FIELDS[item?.kind] ?? []).find(([, input]) => input === "choice");
  if (status && c[status[0]]) parts.push(canvasChoiceLabel(c[status[0]]));
  const who = c.owner ?? c.decided_by;
  if (who && (CANVAS_KIND_FIELDS[item?.kind] ?? []).some(([f]) => f === "owner" || f === "decided_by")) parts.push(who);
  if (item?.kind === "plan_block" && Array.isArray(c.checklist) && c.checklist.length) parts.push(`${c.checklist.filter((x) => x.done).length}/${c.checklist.length} done`);
  const links = linksOf(c).length;
  if (links) parts.push(`${links} link${links === 1 ? "" : "s"}`);
  return parts.join(" \xB7 ");
};
var imageCache = /* @__PURE__ */ new Map();
function CanvasImage({ projectId, contentId, alt, className }) {
  const key = `${projectId}/${contentId}`;
  const [src, setSrc] = useState(() => imageCache.get(key) ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (imageCache.has(key)) {
      setSrc(imageCache.get(key));
      setFailed(false);
      return void 0;
    }
    setSrc(null);
    setFailed(false);
    api(`/projects/${encodeURIComponent(projectId)}/content/${encodeURIComponent(contentId)}/image`).then((result) => {
      if (!live) return;
      if (!CANVAS_IMAGE_TYPES[result?.media_type] || typeof result?.data_base64 !== "string") throw new Error("not an image");
      const url = `data:${result.media_type};base64,${result.data_base64}`;
      imageCache.set(key, url);
      let total = 0;
      for (const value of imageCache.values()) total += value.length;
      while (total > 30 * 1024 * 1024 && imageCache.size > 1) {
        const oldest = imageCache.keys().next().value;
        total -= imageCache.get(oldest).length;
        imageCache.delete(oldest);
      }
      setSrc(url);
    }).catch(() => {
      if (live) setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [key]);
  if (failed) return jsx("span", { className: "dy-pc-img-note", "data-canvas-image-missing": contentId, children: "Image unavailable" });
  if (!src) return jsx("span", { className: "dy-pc-img-note", children: "Loading image\u2026" });
  return jsx("img", { className, src, alt: alt || "", draggable: false, "data-canvas-image": contentId });
}
var CANVAS_BOARD_STATUS_LABELS = Object.freeze({ draft: "Draft", submitted: "Submitted", planned: "Plan made", completed: "Completed", archived: "Archived" });
var CANVAS_BOARD_MOVES = Object.freeze({ draft: ["submitted"], submitted: ["draft", "planned"], planned: ["submitted", "completed"], completed: ["planned"] });
var CANVAS_READ_ONLY = Object.freeze(["completed", "archived"]);
var CANVAS_MEANING_LABELS = Object.freeze({ supports: "supports", contradicts: "contradicts", derived_from: "derived from", clarifies: "clarifies", depends_on: "depends on", implements: "implements", raises_question: "raises a question" });
var CANVAS_WORLD = Object.freeze({ width: 2e3, height: 1400 });
var CANVAS_CARD = Object.freeze({ width: 240, height: 140 });
var CANVAS_ZOOM = Object.freeze({ min: 0.5, max: 1.5, step: 0.1 });
var canvasObjectSeq = 0;
var canvasEdgeSeq = 0;
var canvasText = (item) => String(item?.content?.text ?? item?.content?.title ?? item?.content?.url ?? "");
var canvasNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
var canvasClamp = (value, min, max) => Math.min(Math.max(value, min), max);
var canvasRect = (item) => ({
  x: canvasNumber(item?.x),
  y: canvasNumber(item?.y),
  width: canvasNumber(item?.width) || CANVAS_CARD.width,
  height: canvasNumber(item?.height) || CANVAS_CARD.height
});
var canvasPlaced = (objects) => {
  const cols = 4;
  for (let slot = 0; slot < cols * 12; slot += 1) {
    const { x, y } = gridSlot(slot, cols);
    const overlaps2 = objects.some((item) => {
      const rect = canvasRect(item);
      return x < rect.x + rect.width && x + CANVAS_CARD.width > rect.x && y < rect.y + rect.height && y + CANVAS_CARD.height > rect.y;
    });
    if (!overlaps2) return { x, y };
  }
  return { x: 60, y: 60 };
};
var canvasDeOverlap = (objects, movedId) => {
  const moved = objects.find((item) => item.id === movedId);
  if (!moved) return objects;
  const rect = canvasRect(moved);
  let x = rect.x;
  const y = rect.y;
  const others = objects.filter((item) => item.id !== movedId).map(canvasRect);
  for (let guard = 0; guard < 64; guard += 1) {
    const hit = others.find((other) => x < other.x + other.width && x + rect.width > other.x && y < other.y + other.height && y + rect.height > other.y);
    if (!hit) break;
    x = hit.x + hit.width + 20;
  }
  if (x === rect.x) return objects;
  return objects.map((item) => item.id === movedId ? { ...item, x } : item);
};
function PlanningCanvasPanel({ project, canvas: initialCanvas, content = [], onRefresh, onDirty }) {
  const [canvas, setCanvas] = useState(initialCanvas ?? null);
  const [objects, setObjects] = useState(initialCanvas?.objects ?? []);
  const [connectors, setConnectors] = useState(initialCanvas?.connectors ?? []);
  const [dirty, setDirty] = useState(false);
  const [kind, setKind] = useState("note");
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("select");
  const [pendingConnect, setPendingConnect] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerText, setDrawerText] = useState("");
  const [drawerKind, setDrawerKind] = useState("note");
  const [drawerFields, setDrawerFields] = useState({});
  const [richProblem, setRichProblem] = useState(null);
  const [members, setMembers] = useState([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [linkSource, setLinkSource] = useState("");
  const [linkTarget, setLinkTarget] = useState("");
  const [linkMeaning, setLinkMeaning] = useState("supports");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [chatOpen, setChatOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [marquee, setMarquee] = useState(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [planPanel, setPlanPanel] = useState(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [backlogConfirm, setBacklogConfirm] = useState(null);
  const [boards, setBoards] = useState([]);
  const [boardListOpen, setBoardListOpen] = useState(true);
  const [boardBusy, setBoardBusy] = useState(false);
  const [theme, setTheme] = useState(initialCanvas?.theme ?? null);
  const [hostTheme, setHostTheme] = useState("light");
  const [modelOptions, setModelOptions] = useState(null);
  const [boardsApi, setBoardsApi] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [boardForm, setBoardForm] = useState(null);
  const [chatPill, setChatPill] = useState(false);
  const [chatPos, setChatPos] = useState(null);
  const [chatDragging, setChatDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stepsDraft, setStepsDraft] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [connectPointer, setConnectPointer] = useState(null);
  const [pendingLeave, setPendingLeave] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [panning, setPanning] = useState(false);
  const [fitTick, setFitTick] = useState(0);
  const stageRef = useRef(null);
  const chatRef = useRef(null);
  const addMenuRef = useRef(null);
  const boardRef = useRef(initialCanvas?.canvas_id ?? null);
  const chatToken = useRef(0);
  const dirtyRef = useRef(false);
  const boardsApiRef = useRef(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const encoded = encodeURIComponent(project.id);
  const revision = Number(canvas?.revision ?? 0);
  const selected = objects.find((item) => item.id === selectedId) ?? null;
  useEffect(() => {
    let live = true;
    api(`/projects/${encodeURIComponent(project.id)}/members`).then((result) => {
      if (live) setMembers((result?.members ?? []).filter((m) => m && m.state !== "departed").map((m) => String(m.profile_slug)));
    }).catch(() => {
      if (live) setMembers([]);
    });
    return () => {
      live = false;
    };
  }, [project.id]);
  const boardPath = (id) => `/projects/${encoded}/canvases/${encodeURIComponent(id)}`;
  const boardScoped = boardsApi && Boolean(canvas?.canvas_id);
  const canvasRoute = boardScoped ? boardPath(canvas.canvas_id) : `/projects/${encoded}/canvas`;
  const boardStatus = canvas?.status ?? "draft";
  const readOnly = CANVAS_READ_ONLY.includes(boardStatus);
  boardRef.current = canvas?.canvas_id ?? null;
  useDialogFocusManager(pendingLeave ? "[data-canvas-unsaved-prompt] .dy-pc-overlay-card" : pendingStatus ? "[data-canvas-status-confirm] .dy-pc-overlay-card" : expanded ? "[data-canvas-expanded] .dy-pc-overlay-card" : null);
  dirtyRef.current = dirty;
  boardsApiRef.current = boardsApi;
  useEffect(() => {
    if (!pendingConnect) setConnectPointer(null);
  }, [pendingConnect]);
  zoomRef.current = zoom;
  panRef.current = pan;
  const failureText = (failure) => String(failure?.message ?? failure);
  useEffect(() => {
    if (boardsApiRef.current || dirtyRef.current) return;
    const next = initialCanvas ?? { revision: 0, objects: [], connectors: [] };
    setCanvas(next);
    setObjects(next.objects ?? []);
    setConnectors(next.connectors ?? []);
    setDirty(false);
    setHistory([]);
    setFuture([]);
    setSelectedIds([]);
    setSelectedId(null);
    setTheme(next.theme ?? null);
  }, [initialCanvas]);
  const saveRef = useRef(null);
  useEffect(() => {
    onDirty?.(dirty, dirty ? () => saveRef.current?.() : null);
  }, [dirty]);
  useEffect(() => () => onDirty?.(false), []);
  useEffect(() => {
    if (!dirty) return void 0;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const root = stageRef.current?.closest?.(".dockyard-root");
    if (!root) return void 0;
    const read = () => setHostTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    read();
    const watcher = new MutationObserver(read);
    watcher.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watcher.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    api(`/projects/${encoded}/canvases`).then((result) => {
      if (live && Array.isArray(result?.canvases)) {
        setBoards(result.canvases);
        setBoardsApi(true);
      }
    }).catch(() => {
    });
    api("/canvas/models").then((result) => {
      if (live) setModelOptions(result);
    }).catch(() => {
    });
    return () => {
      live = false;
    };
  }, [encoded]);
  const refreshBoards = async (withArchived = showArchived) => {
    try {
      const result = await api(`/projects/${encoded}/canvases${withArchived ? "?include_archived=true" : ""}`);
      if (Array.isArray(result?.canvases)) {
        setBoards(result.canvases);
        setBoardsApi(true);
        return result.canvases;
      }
    } catch (failure) {
    }
    return null;
  };
  const resetBoardState = () => {
    chatToken.current += 1;
    setSession(null);
    setReview(null);
    setChatLog([]);
    setPlanPanel(null);
    setBacklogConfirm(null);
    setAnswer("");
    setChatBusy(false);
    setBusy(false);
    setPlanBusy(false);
    setExpanded(false);
    setStepsDraft(null);
    setDirty(false);
    setSelectedId(null);
    setSelectedIds([]);
    setPendingConnect(null);
    setHistory([]);
    setFuture([]);
    setMarquee(null);
    setLinkSource("");
    setLinkTarget("");
  };
  const loadBoard = (fresh) => {
    resetBoardState();
    boardRef.current = fresh?.canvas_id ?? null;
    setCanvas(fresh);
    setObjects(fresh?.objects ?? []);
    setConnectors(fresh?.connectors ?? []);
    setTheme(fresh?.theme ?? null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setFitTick((tick) => Math.max(2, tick + 1));
  };
  const mergeMeta = (fresh) => setCanvas((current) => current?.canvas_id && fresh?.canvas_id && current.canvas_id !== fresh.canvas_id ? current : {
    ...current ?? {},
    name: fresh.name,
    status: fresh.status,
    archived_from: fresh.archived_from ?? null,
    theme: fresh.theme ?? null,
    model: fresh.model ?? null
  });
  const refreshMeta = async (at) => {
    if (!boardsApiRef.current || !at) return;
    try {
      const fresh = await api(boardPath(at));
      if (boardRef.current === at) mergeMeta(fresh);
    } catch (failure) {
    }
    refreshBoards();
  };
  const guardUnsaved = (label, action) => {
    if (!dirtyRef.current) return action();
    setPendingLeave({ label, action });
    return null;
  };
  const leaveSaving = async () => {
    const pending = pendingLeave;
    if (!pending) return;
    const ok = await save();
    if (!ok) {
      if (!dirtyRef.current) setPendingLeave(null);
      return;
    }
    setPendingLeave(null);
    await pending.action();
  };
  const leaveDiscarding = async () => {
    const pending = pendingLeave;
    if (!pending) return;
    setPendingLeave(null);
    dirtyRef.current = false;
    setDirty(false);
    setHistory([]);
    setFuture([]);
    setObjects(canvas?.objects ?? []);
    setConnectors(canvas?.connectors ?? []);
    await pending.action();
  };
  const openBoard = async (board) => {
    setBoardBusy(true);
    try {
      const fresh = await api(boardPath(board.canvas_id));
      loadBoard(fresh);
      setNotice({ tone: "ok", text: `Opened ${fresh.name} at revision ${fresh.revision}.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Board could not be opened: ${failureText(failure)}` });
    }
    setBoardBusy(false);
  };
  const selectBoard = (board) => {
    if (!board?.canvas_id || board.canvas_id === canvas?.canvas_id) return null;
    return guardUnsaved(`open ${board.name ?? "that board"}`, () => openBoard(board));
  };
  const submitBoardForm = async () => {
    const name = String(boardForm?.name ?? "").trim();
    if (!name) {
      setNotice({ tone: "danger", text: "A board needs a name." });
      return;
    }
    setBoardBusy(true);
    try {
      if (boardForm.mode === "rename") {
        const at = boardRef.current;
        const fresh = await api(boardPath(at), { method: "PATCH", body: { name } });
        if (boardRef.current === at) {
          mergeMeta(fresh);
          setNotice({ tone: "ok", text: `Board renamed to ${fresh.name}.` });
        }
      } else {
        const created = await api(`/projects/${encoded}/canvases`, { method: "POST", body: { name } });
        setBoardForm(null);
        await refreshBoards();
        setBoardBusy(false);
        guardUnsaved(`open the new board ${created.name} (it has been created)`, () => openBoard(created));
        return;
      }
      setBoardForm(null);
      await refreshBoards();
    } catch (failure) {
      setNotice({ tone: "danger", text: `Board could not be saved: ${failureText(failure)}` });
    }
    setBoardBusy(false);
  };
  const moveBoardStatus = async (status) => {
    const at = boardRef.current;
    setBoardBusy(true);
    try {
      const fresh = await api(boardPath(at), { method: "PATCH", body: { status } });
      if (boardRef.current !== at) return;
      mergeMeta(fresh);
      await refreshBoards();
      setNotice({ tone: "ok", text: `Board is now ${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status}.` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Status could not change: ${failureText(failure)}` });
    } finally {
      setBoardBusy(false);
    }
  };
  const changeBoardStatus = (status) => {
    if (!boardScoped || !status || status === boardStatus) return null;
    setPendingStatus(status);
    return null;
  };
  const confirmBoardStatus = () => {
    const status = pendingStatus;
    setPendingStatus(null);
    if (!status || status === boardStatus) return null;
    if (CANVAS_READ_ONLY.includes(status)) return guardUnsaved(`move this board to ${CANVAS_BOARD_STATUS_LABELS[status] ?? status}`, () => moveBoardStatus(status));
    return moveBoardStatus(status);
  };
  const archiveBoard = (board) => {
    if (board.canvas_id === canvas?.canvas_id) return guardUnsaved(`archive ${board.name}`, () => archiveNow(board));
    return archiveNow(board);
  };
  const archiveNow = async (board) => {
    const active = board.canvas_id === canvas?.canvas_id;
    setBoardBusy(true);
    try {
      await api(boardPath(board.canvas_id), { method: "PATCH", body: { status: "archived" } });
      const list = await refreshBoards();
      if (active) {
        const next = (list ?? []).find((row) => row.status !== "archived" && row.canvas_id !== board.canvas_id);
        const fresh = next ? await api(boardPath(next.canvas_id)) : await api(`/projects/${encoded}/canvas`);
        loadBoard(fresh);
        if (!next) await refreshBoards();
      }
      setNotice({ tone: "ok", text: `Board ${board.name} archived \u2014 restore it from Show archived.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Board could not be archived: ${failureText(failure)}` });
    }
    setBoardBusy(false);
  };
  const restoreBoard = async (board) => {
    setBoardBusy(true);
    try {
      const fresh = await api(boardPath(board.canvas_id), { method: "PATCH", body: { status: board.archived_from ?? "draft" } });
      await refreshBoards();
      setNotice({ tone: "ok", text: `Board ${fresh.name} restored as ${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status}.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Board could not be restored: ${failureText(failure)}` });
    }
    setBoardBusy(false);
  };
  const toggleArchived = async () => {
    const next = !showArchived;
    setShowArchived(next);
    await refreshBoards(next);
  };
  const setBoardTheme = async (picked) => {
    const previous = theme;
    const nextTheme = picked === theme ? null : picked;
    setTheme(nextTheme);
    if (!boardScoped) return;
    const at = boardRef.current;
    try {
      const fresh = await api(boardPath(at), { method: "PATCH", body: { theme: nextTheme } });
      if (boardRef.current === at) mergeMeta(fresh);
    } catch (failure) {
      if (boardRef.current !== at) return;
      setTheme(previous);
      setNotice({ tone: "danger", text: `Theme could not be saved: ${failureText(failure)}` });
    }
  };
  const modelKey = (model) => model?.provider && model?.model ? `${model.provider}::${model.model}` : "";
  const setBoardModel = async (value) => {
    if (!boardScoped) return;
    const [provider, ...rest] = String(value || "").split("::");
    const model = value ? { provider, model: rest.join("::") } : null;
    const at = boardRef.current;
    setBoardBusy(true);
    try {
      const fresh = await api(boardPath(at), { method: "PATCH", body: { model } });
      if (boardRef.current !== at) return;
      mergeMeta(fresh);
      setNotice({ tone: "ok", text: model ? `This board now asks ${model.model}.` : "This board now uses the Hermes main model." });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Model could not be set: ${failureText(failure)}` });
    } finally {
      setBoardBusy(false);
    }
  };
  const selectedColour = selected?.colour ?? null;
  const setSelectedColour = (colour) => {
    if (!selected || readOnly) return;
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, colour: colour || null } : item));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
  };
  const clampChat = (x, y) => {
    const stage = stageRef.current;
    const chat = chatRef.current;
    if (!stage || !chat) return { x, y };
    return {
      x: canvasClamp(x, 0, Math.max(0, stage.clientWidth - chat.offsetWidth)),
      // A normal drag may lift the window partly above the stage; an
      // extreme pointer jump (e.g. to -2000,-2000) snaps it back inside.
      y: canvasClamp(y < -stage.clientHeight ? 0 : y, -Math.max(0, chat.offsetHeight - 40), Math.max(0, stage.clientHeight - chat.offsetHeight))
    };
  };
  useEffect(() => {
    if (!chatPos) return void 0;
    const fix = () => setChatPos((current) => {
      if (!current) return current;
      const next = clampChat(current.x, current.y);
      return next.x === current.x && next.y === current.y ? current : next;
    });
    fix();
    window.addEventListener("resize", fix);
    return () => window.removeEventListener("resize", fix);
  }, [chatPos, chatOpen, chatPill]);
  const beginChatDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const stage = stageRef.current;
    const chat = chatRef.current;
    if (!stage || !chat) return;
    const stageBox = stage.getBoundingClientRect();
    const chatBox = chat.getBoundingClientRect();
    const offsetX = event.clientX - chatBox.left;
    const offsetY = event.clientY - chatBox.top;
    setChatDragging(true);
    const move = (moveEvent) => setChatPos(clampChat(moveEvent.clientX - stageBox.left - offsetX, moveEvent.clientY - stageBox.top - offsetY));
    const finish = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      setChatDragging(false);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  };
  const nudgeChat = (event) => {
    const chat = chatRef.current;
    if (!chat) return;
    if (event.key === "Home") {
      event.preventDefault();
      setChatPos(null);
      return;
    }
    const step = event.shiftKey ? 48 : 16;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    setChatPos(clampChat(chat.offsetLeft + delta[0], chat.offsetTop + delta[1]));
  };
  const minimiseChat = () => {
    setChatPill(true);
    setChatOpen(false);
  };
  const toggleChat = () => {
    if (chatPill) {
      setChatPill(false);
      setChatOpen(true);
      return;
    }
    setChatOpen((current) => !current);
  };
  const openExpanded = () => {
    setExpanded(true);
    setChatPill(false);
  };
  useEffect(() => {
    if (!addMenuOpen) return void 0;
    const close = (event) => {
      if (!addMenuRef.current?.contains(event.target)) setAddMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [addMenuOpen]);
  const snapshot = (currentObjects, currentConnectors) => ({ objects: currentObjects.map((row) => ({ ...row })), connectors: currentConnectors.map((row) => ({ ...row })) });
  const undo = () => {
    if (readOnly) return;
    setHistory((current) => {
      if (!current.length) return current;
      const before = current[current.length - 1];
      setFuture((next) => [...next, snapshot(objects, connectors)]);
      setObjects(before.objects);
      setConnectors(before.connectors);
      setDirty(true);
      return current.slice(0, -1);
    });
  };
  const redo = () => {
    if (readOnly) return;
    setFuture((current) => {
      if (!current.length) return current;
      const after = current[current.length - 1];
      setHistory((next) => [...next, snapshot(objects, connectors)]);
      setObjects(after.objects);
      setConnectors(after.connectors);
      setDirty(true);
      return current.slice(0, -1);
    });
  };
  const duplicateSelection = () => {
    if (readOnly) return;
    const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
    if (!ids.length) return;
    const before = snapshot(objects, connectors);
    const stamp = Date.now();
    setObjects((current) => {
      const next = [...current];
      ids.forEach((id) => {
        const origin = current.find((row) => row.id === id);
        if (!origin) return;
        canvasObjectSeq += 1;
        const rect = canvasRect(origin);
        next.push({
          ...origin,
          id: `canvas-obj-${stamp}-${canvasObjectSeq}`,
          content: { ...origin.content ?? {} },
          tags: [...origin.tags ?? []],
          x: canvasClamp(rect.x + 24, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
          y: canvasClamp(rect.y + 24, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y)
        });
      });
      return next;
    });
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: `Duplicated ${ids.length} object(s) \u2014 Save canvas to persist the copies.` });
  };
  const persistableObjects = () => objects.map((item) => ({
    id: item.id,
    kind: item.kind,
    content: item.content ?? { text: canvasText(item) },
    x: canvasNumber(item.x),
    y: canvasNumber(item.y),
    width: canvasNumber(item.width) || CANVAS_CARD.width,
    height: canvasNumber(item.height) || CANVAS_CARD.height,
    tags: Array.isArray(item.tags) ? item.tags : [],
    evidence_ref: item.evidence_ref ?? null,
    work_ref: item.work_ref ?? null,
    colour: CANVAS_STICKER_COLOURS.includes(item.colour) ? item.colour : null
  }));
  const persistableConnectors = (rows) => {
    const ids = new Set(rows.map((item) => item.id));
    return connectors.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, meaning: edge.meaning }));
  };
  const reload = async () => {
    setBusy(true);
    const at = boardRef.current;
    try {
      const fresh = await api(canvasRoute);
      if (boardRef.current !== at) return;
      const discarded = dirty;
      setCanvas(fresh);
      setObjects(fresh.objects ?? []);
      setConnectors(fresh.connectors ?? []);
      setDirty(false);
      setSelectedId(null);
      setHistory([]);
      setFuture([]);
      setSelectedIds([]);
      setNotice(discarded ? { tone: "danger", text: `Canvas reloaded at revision ${fresh.revision} \u2014 unsaved edits were discarded, not applied.` } : { tone: "ok", text: `Canvas reloaded at revision ${fresh.revision}.` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Reload failed: ${failureText(failure)}` });
    }
    setBusy(false);
  };
  const save = async () => {
    if (readOnly) {
      setNotice({ tone: "danger", text: `This board is ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} and read-only \u2014 move it back to Plan made to edit.` });
      return false;
    }
    const at = boardRef.current;
    setBusy(true);
    try {
      const rows = persistableObjects();
      const edges = persistableConnectors(rows);
      const saved = await api(canvasRoute, { method: "PUT", body: { expected_revision: revision, objects: rows, connectors: edges } });
      if (boardRef.current !== at) return false;
      dirtyRef.current = false;
      setCanvas(saved);
      setObjects(saved.objects ?? []);
      setConnectors(saved.connectors ?? []);
      setDirty(false);
      refreshBoards();
      setNotice({ tone: "ok", text: `Canvas saved \u2014 revision ${saved.revision} with ${(saved.objects ?? []).length} object(s) and ${(saved.connectors ?? []).length} connector(s).` });
      onRefresh?.();
      return true;
    } catch (failure) {
      if (boardRef.current !== at) return false;
      const message = failureText(failure);
      if (/\b409\b|conflict|board_locked|read-only/i.test(message)) {
        try {
          const fresh = await api(canvasRoute);
          if (boardRef.current !== at) return false;
          if (CANVAS_READ_ONLY.includes(fresh.status ?? "draft") || /board_locked|read-only/i.test(message)) {
            mergeMeta(fresh);
            refreshBoards();
            setNotice({ tone: "danger", text: `Not saved \u2014 this board is now ${CANVAS_BOARD_STATUS_LABELS[fresh.status] ?? fresh.status} and read-only. Your edits are still here: move the board back to Plan made (or restore it), then Save.` });
          } else {
            dirtyRef.current = false;
            setCanvas(fresh);
            setObjects(fresh.objects ?? []);
            setConnectors(fresh.connectors ?? []);
            setDirty(false);
            setNotice({ tone: "danger", text: `Revision conflict \u2014 this canvas changed elsewhere and was reloaded at revision ${fresh.revision}. Your unsaved edit was not applied.` });
          }
        } catch (reloadFailure) {
          setNotice({ tone: "danger", text: `Canvas save failed: ${message}` });
        }
      } else {
        setNotice({ tone: "danger", text: `Canvas save failed: ${message}` });
      }
      return false;
    } finally {
      if (boardRef.current === at) setBusy(false);
    }
  };
  saveRef.current = save;
  const addObject = (objectKind, text) => {
    const body = String(text ?? "").trim();
    if (!body || readOnly) return null;
    const before = snapshot(objects, connectors);
    const position = canvasPlaced(objects);
    canvasObjectSeq += 1;
    const item = {
      id: `canvas-obj-${Date.now()}-${canvasObjectSeq}`,
      kind: objectKind,
      content: { text: body },
      ...objectKind === "media" ? { height: 230 } : {},
      x: position.x,
      y: position.y,
      width: CANVAS_CARD.width,
      height: CANVAS_CARD.height,
      tags: [],
      evidence_ref: null,
      work_ref: null
    };
    setObjects((current) => [...current, item]);
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: `${CANVAS_KIND_LABELS[objectKind] ?? objectKind} added as scratch \u2014 Save canvas to persist it.` });
    return item;
  };
  const addFromDraft = () => {
    if (!addObject(kind, draft)) return;
    setDraft("");
  };
  const openDrawer = (item) => {
    setSelectedId(item.id);
    setDrawerText(canvasText(item));
    setDrawerKind(item.kind);
    const { text: _text, ...rest } = item.content ?? {};
    setDrawerFields({ ...rest, links: linksOf(item.content ?? {}).map((link) => ({ url: link.url ?? "", label: link.label ?? "" })) });
  };
  const setField = (field, value) => setDrawerFields((current) => ({ ...current, [field]: value }));
  const uploadImage = async (file) => {
    if (!file || readOnly) return;
    const mediaType = CANVAS_IMAGE_TYPES[file.type] ? file.type : null;
    if (!mediaType) {
      setNotice({ tone: "danger", text: "Choose a PNG, JPEG or WebP image. Video comes in a later stage." });
      return;
    }
    if (file.size <= 0 || file.size > CANVAS_IMAGE_MAX) {
      setNotice({ tone: "danger", text: "Images must be under 5 MB." });
      return;
    }
    setImageBusy(true);
    try {
      const created = await api(`/projects/${encodeURIComponent(project.id)}/content`, { method: "POST", body: { filename: file.name, media_type: mediaType, content_base64: await fileAsBase64(file) } });
      setField("content_id", created.content_id);
      const guess = String(file.name).replace(/\.[a-z0-9]+$/i, "").slice(0, 300);
      setDrawerFields((current) => current.alt ? current : { ...current, alt: guess });
      setNotice({ tone: "ok", text: "Image uploaded \u2014 Apply, then Save canvas, to place it on the card." });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Image could not be uploaded: ${failureText(failure)}` });
    } finally {
      setImageBusy(false);
    }
  };
  const applyDrawer = () => {
    if (!selected || readOnly) return;
    const text = drawerText.trim();
    if (!text) return;
    if (richProblem) {
      setNotice({ tone: "danger", text: richProblem });
      return;
    }
    const links = (drawerFields.links ?? []).map((link) => ({ url: String(link.url ?? "").trim(), label: String(link.label ?? "").trim() })).filter((link) => link.url);
    const bad = links.find((link) => !canvasSafeUrl(link.url));
    if (bad) {
      setNotice({ tone: "danger", text: `"${bad.url.slice(0, 60)}" is not a web link. Links must start with http:// or https://.` });
      return;
    }
    if (links.length > 20) {
      setNotice({ tone: "danger", text: "A card holds at most 20 links." });
      return;
    }
    const fields = {
      ...drawerFields,
      links: links.map((link) => link.label ? link : { url: link.url }),
      ...Array.isArray(drawerFields.alternatives) ? { alternatives: drawerFields.alternatives.map((v) => String(v).trim()).filter(Boolean) } : {},
      ...Array.isArray(drawerFields.checklist) ? { checklist: drawerFields.checklist.map((v) => ({ text: String(v.text ?? "").trim(), done: Boolean(v.done) })).filter((v) => v.text) } : {}
    };
    if (typeof selected.content?.url === "string" && !Array.isArray(selected.content?.links)) fields.url = "";
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, kind: drawerKind, content: { ...item.content ?? {}, ...fields, text } } : item));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: "Object updated \u2014 Save canvas to persist the change." });
  };
  const removeSelected = async () => {
    if (!selected || readOnly) return;
    const before = snapshot(objects, connectors);
    const persistable = new Set((canvas?.objects ?? []).map((row) => row.id));
    if (!persistable.has(selected.id) || dirty) {
      const wasPersisted = persistable.has(selected.id);
      const removedId = selected.id;
      setObjects((current) => current.filter((row) => row.id !== removedId));
      setConnectors((current) => current.filter((edge) => edge.source !== removedId && edge.target !== removedId));
      setHistory((current) => [...current.slice(-49), before]);
      setFuture([]);
      setDirty(true);
      setSelectedId(null);
      setNotice({ tone: "ok", text: wasPersisted ? "Removed locally \u2014 Save canvas to persist the removal." : "Scratch object removed \u2014 it was never saved." });
      return;
    }
    const at = boardRef.current;
    setBusy(true);
    try {
      const saved = await api(`${canvasRoute}/objects/${encodeURIComponent(selected.id)}?expected_revision=${revision}`, { method: "DELETE" });
      if (boardRef.current !== at) return;
      setCanvas(saved);
      setObjects(saved.objects ?? []);
      setConnectors(saved.connectors ?? []);
      setDirty(false);
      setSelectedId(null);
      setNotice({ tone: "ok", text: `Object removed \u2014 revision ${saved.revision} with ${(saved.objects ?? []).length} object(s).` });
      onRefresh?.();
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Remove failed: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setBusy(false);
    }
  };
  const addConnector = (source, target, meaning) => {
    if (!source || !target || source === target) {
      setNotice({ tone: "danger", text: "A connector needs two different objects." });
      return;
    }
    if (connectors.some((edge) => edge.source === source && edge.target === target && edge.meaning === meaning)) {
      setNotice({ tone: "danger", text: `Already linked: these two objects already carry a "${meaning}" connector.` });
      return;
    }
    const before = snapshot(objects, connectors);
    canvasEdgeSeq += 1;
    setConnectors((current) => [...current, { id: `canvas-edge-${Date.now()}-${canvasEdgeSeq}`, source, target, meaning }]);
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: `Connector added (${CANVAS_MEANING_LABELS[meaning] ?? meaning}) \u2014 Save canvas to persist it.` });
  };
  const connectFromEditor = () => addConnector(linkSource, linkTarget, linkMeaning);
  const beginObjectDrag = (event, item) => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (readOnly) {
      openDrawer(item);
      return;
    }
    if (mode === "connect") {
      if (!pendingConnect) {
        setPendingConnect(item.id);
        setNotice({ tone: "ok", text: "Connect mode: pick the second object to link." });
        return;
      }
      if (pendingConnect === item.id) {
        setPendingConnect(null);
        setNotice({ tone: "ok", text: "Connect cancelled \u2014 the same object was picked twice (no self-connector)." });
        return;
      }
      addConnector(pendingConnect, item.id, linkMeaning);
      setPendingConnect(null);
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = canvasRect(item);
    let moved = false;
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
      moved = true;
      setObjects((current) => current.map((row) => row.id === item.id ? {
        ...row,
        x: canvasClamp(origin.x + dx / zoom, CANVAS_MIN_POS.x, CANVAS_WORLD.width - CANVAS_CARD.width - CANVAS_MIN_POS.x),
        y: canvasClamp(origin.y + dy / zoom, CANVAS_MIN_POS.y, CANVAS_WORLD.height - CANVAS_CARD.height - CANVAS_MIN_POS.y)
      } : row));
      setDirty(true);
    };
    const finish = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      if (moved) {
        setObjects((current) => canvasDeOverlap(current, item.id));
        setNotice({ tone: "ok", text: "Moved \u2014 Save canvas to persist the new position." });
      } else openDrawer(item);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  };
  const clampPan = (x, y, scale = zoomRef.current) => {
    const stage = stageRef.current;
    if (!stage) return { x, y };
    const margin = 160;
    const minX = Math.min(0, stage.clientWidth - CANVAS_WORLD.width * scale) - margin;
    const minY = Math.min(0, stage.clientHeight - CANVAS_WORLD.height * scale) - margin;
    return { x: canvasClamp(x, minX, margin), y: canvasClamp(y, minY, margin) };
  };
  const beginPan = (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target;
    if (target?.closest?.(".dy-pc-obj") || target?.closest?.(".dy-pc-drawer") || target?.closest?.(".dy-pc-chat") || target?.closest?.(".dy-pc-overlay")) return;
    if (mode === "connect" && event.button === 0) {
      event.preventDefault();
      if (pendingConnect) {
        setPendingConnect(null);
        setConnectPointer(null);
        setNotice({ tone: "ok", text: "Connect: link cancelled. Click a sticker to start again." });
      }
      return;
    }
    const stageBox = stageRef.current?.getBoundingClientRect();
    if (!stageBox) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originPan = { ...panRef.current };
    let moved = false;
    if (mode === "select" && event.shiftKey && event.button === 0) {
      const band = { x: startX - stageBox.x, y: startY - stageBox.y, width: 0, height: 0 };
      const marqueeMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
        moved = true;
        band.x = dx < 0 ? startX - stageBox.x + dx : startX - stageBox.x;
        band.y = dy < 0 ? startY - stageBox.y + dy : startY - stageBox.y;
        band.width = Math.abs(dx);
        band.height = Math.abs(dy);
        setMarquee({ ...band });
      };
      const marqueeFinish = (moveEvent) => {
        document.removeEventListener("pointermove", marqueeMove);
        document.removeEventListener("pointerup", marqueeFinish);
        setMarquee(null);
        if (!moved) {
          setSelectedId(null);
          setPendingConnect(null);
          setSelectedIds([]);
          return;
        }
        const scale = zoomRef.current;
        const offset = panRef.current;
        const x1 = (Math.min(startX, moveEvent.clientX) - stageBox.x - offset.x) / scale;
        const y1 = (Math.min(startY, moveEvent.clientY) - stageBox.y - offset.y) / scale;
        const x2 = (Math.max(startX, moveEvent.clientX) - stageBox.x - offset.x) / scale;
        const y2 = (Math.max(startY, moveEvent.clientY) - stageBox.y - offset.y) / scale;
        const hits = [];
        objects.forEach((row) => {
          const rect = canvasRect(row);
          if (rect.x < x2 && rect.x + rect.width > x1 && rect.y < y2 && rect.y + rect.height > y1) hits.push(row.id);
        });
        setSelectedIds(hits);
        if (hits.length) setNotice({ tone: "ok", text: `Marquee selected ${hits.length} object(s).` });
      };
      document.addEventListener("pointermove", marqueeMove);
      document.addEventListener("pointerup", marqueeFinish);
      return;
    }
    if (event.button === 1) event.preventDefault();
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
      if (!moved) setPanning(true);
      moved = true;
      setPan(clampPan(originPan.x + dx, originPan.y + dy));
    };
    const finish = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      setPanning(false);
      if (!moved) {
        setSelectedId(null);
        setPendingConnect(null);
        setSelectedIds([]);
      }
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  };
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return void 0;
    const onWheel = (event) => {
      if (event.target?.closest?.(".dy-pc-chat, .dy-pc-drawer, .dy-pc-overlay")) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      const current = zoomRef.current;
      const offset = panRef.current;
      if (event.ctrlKey || event.metaKey) {
        const box = stage.getBoundingClientRect();
        const px = event.clientX - box.left;
        const py = event.clientY - box.top;
        const next = Number(canvasClamp(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2));
        if (next === current) return;
        const wx = (px - offset.x) / current;
        const wy = (py - offset.y) / current;
        setZoom(next);
        setPan(clampPan(px - wx * next, py - wy * next, next));
        return;
      }
      const sideways = event.shiftKey && !event.deltaX;
      const dx = (sideways ? event.deltaY : event.deltaX) * unit;
      const dy = (sideways ? 0 : event.deltaY) * unit;
      setPan(clampPan(offset.x - dx, offset.y - dy));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);
  const zoomBy = (delta) => setZoom((current) => canvasClamp(Number((current + delta).toFixed(2)), CANVAS_ZOOM.min, CANVAS_ZOOM.max));
  const fit = () => {
    const stage = stageRef.current;
    if (!stage || objects.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const box = stage.getBoundingClientRect();
    const rects = objects.map(canvasRect);
    const minX = Math.min(...rects.map((rect) => rect.x));
    const minY = Math.min(...rects.map((rect) => rect.y));
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
    const chat = chatRef.current;
    const docked = !chatPos && chat;
    const reserveRight = docked && box.width >= 760 && chatOpen && !chatPill ? chat.offsetWidth + 28 : 0;
    const reserveBottom = docked && !reserveRight ? chat.offsetHeight + 14 : 0;
    const next = Number(canvasClamp(Math.min((box.width - 80 - reserveRight) / Math.max(1, maxX - minX), (box.height - 80 - reserveBottom) / Math.max(1, maxY - minY)), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2));
    setZoom(next);
    setPan({ x: 40 - minX * next, y: 40 - minY * next });
  };
  const cardsObstructed = () => {
    const stage = stageRef.current;
    if (!stage) return false;
    const box = stage.getBoundingClientRect();
    const chat = !chatPos && chatRef.current ? chatRef.current.getBoundingClientRect() : null;
    return [...stage.querySelectorAll(".dy-pc-obj")].some((el) => {
      const r = el.getBoundingClientRect();
      const outside = r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
      const underChat = Boolean(chat) && r.left < chat.right && r.right > chat.left && r.top < chat.bottom && r.bottom > chat.top;
      return outside || underChat;
    });
  };
  useEffect(() => {
    if (fitTick < 2) return void 0;
    const frame = requestAnimationFrame(() => {
      if (cardsObstructed()) fit();
    });
    return () => cancelAnimationFrame(frame);
  }, [fitTick]);
  useEffect(() => {
    if (!chatOpen || chatPill || chatPos) return void 0;
    const frame = requestAnimationFrame(() => {
      if ((stageRef.current?.clientWidth ?? 0) >= 760 && cardsObstructed()) fit();
    });
    return () => cancelAnimationFrame(frame);
  }, [chatOpen, chatPill]);
  const tidy2 = () => {
    if (readOnly) return;
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item, index) => ({ ...item, ...gridSlot(index, 3) })));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: "Tidied into a grid \u2014 Save canvas to persist the new positions." });
  };
  const onStageKeyDown = (event) => {
    const key = event.key;
    const target = event.target;
    if (target && target !== stageRef.current && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName) || target.closest?.('.dy-pc-drawer, .dy-pc-chat, .dy-pc-overlay, .dy-pc-linkbar, [role="toolbar"]'))) {
      if (!target.closest?.(".dy-pc-obj")) return;
    }
    const meta = event.ctrlKey || event.metaKey;
    if (key === "Escape") {
      setSelectedId(null);
      setSelectedIds([]);
      setPendingConnect(null);
      return;
    }
    const arrow = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[key];
    if (arrow && !selectedId && !selectedIds.length && event.target === stageRef.current) {
      event.preventDefault();
      const step = event.shiftKey ? 240 : 80;
      setPan(clampPan(panRef.current.x + arrow[0] * step, panRef.current.y + arrow[1] * step));
      return;
    }
    if (readOnly) return;
    if (meta && key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (meta && key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (meta && key.toLowerCase() === "d") {
      event.preventDefault();
      duplicateSelection();
      return;
    }
    if (key === "Delete" || key === "Backspace") {
      const ids = selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
      if (!ids.length) return;
      event.preventDefault();
      const before = snapshot(objects, connectors);
      setObjects((current) => current.filter((row) => !ids.includes(row.id)));
      setConnectors((current) => current.filter((edge) => !ids.includes(edge.source) && !ids.includes(edge.target)));
      setHistory((current) => [...current.slice(-49), before]);
      setFuture([]);
      setDirty(true);
      setSelectedId(null);
      setSelectedIds([]);
      setNotice({ tone: "ok", text: `Removed ${ids.length} object(s) locally \u2014 Save canvas to persist.` });
    }
  };
  const curate = async (message = null) => {
    if (readOnly) {
      setNotice({ tone: "danger", text: `This board is ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} \u2014 reopen it to ask the steward.` });
      return;
    }
    const at = boardRef.current;
    const token = ++chatToken.current;
    setSelectedId(null);
    setSelectedIds([]);
    setBusy(true);
    setChatOpen(true);
    setChatPill(false);
    setChatBusy(true);
    try {
      const result = await api(`${canvasRoute}/sessions`, { method: "POST", body: message ? { message } : {} });
      if (token !== chatToken.current || boardRef.current !== at) return;
      setSession(result);
      refreshMeta(at);
      const proposals = (result.proposals ?? []).length;
      setNotice(result.status === "active" && result.current_question ? { tone: "ok", text: `Question: ${result.current_question.question}` } : { tone: "ok", text: `${number(proposals)} proposal(s) ready for review \u2014 nothing is applied automatically.` });
    } catch (failure) {
      if (token !== chatToken.current || boardRef.current !== at) return;
      setNotice({ tone: "danger", text: `Curation failed: ${failureText(failure)}` });
    }
    if (token === chatToken.current && boardRef.current === at) {
      setBusy(false);
      setChatBusy(false);
    }
  };
  const reviewCanvas = async () => {
    const at = boardRef.current;
    setBusy(true);
    setChatOpen(true);
    setChatPill(false);
    try {
      const result = await api(`${canvasRoute}/curate`, { method: "POST", body: {} });
      if (boardRef.current !== at) return;
      setReview(result);
      const summary = result.summary ?? {};
      const questions = (result.clarifying_questions ?? []).length;
      setNotice({ tone: "ok", text: `Review: ${number(summary.evidence_count)} evidence, ${number(summary.claim_count)} claim, ${number(summary.question_count)} question, ${number(summary.plan_block_count)} plan block \u2014 ${questions ? `${number(questions)} question(s) outstanding` : "no questions outstanding"}.` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Review failed: ${failureText(failure)}` });
    }
    if (boardRef.current === at) setBusy(false);
  };
  const answerQuestion = async (outcome) => {
    if (!session?.session_id) return;
    const at = boardRef.current;
    setBusy(true);
    try {
      const result = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}/answer`, { method: "POST", body: { outcome, answer } });
      if (boardRef.current !== at) return;
      setSession(result);
      setAnswer("");
      const proposals = (result.proposals ?? []).length;
      if (result.status === "active" && result.current_question) setNotice({ tone: "ok", text: `Question: ${result.current_question.question}` });
      else if (outcome === "stop") setNotice({ tone: "ok", text: `Session stopped \u2014 ${number(proposals)} proposal(s) kept as scratch.` });
      else setNotice({ tone: "ok", text: `${number(proposals)} proposal(s) ready for review \u2014 approve or reject each one.` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Answer failed: ${failureText(failure)}` });
    }
    if (boardRef.current === at) setBusy(false);
  };
  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text || chatBusy) return;
    setChatLog((current) => [...current, { role: "me", text }]);
    setChatDraft("");
    await curate(text);
  };
  const stopChat = () => {
    chatToken.current += 1;
    setChatBusy(false);
    setBusy(false);
    setNotice({ tone: "ok", text: "Stopped \u2014 this answer will be ignored here. The steward may still finish and record it; nothing is ever applied to the board without your approval." });
  };
  const decideProposal = async (proposal, approve) => {
    const at = boardRef.current;
    setBusy(true);
    try {
      const result = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/decision`, { method: "POST", body: { approve, project_id: project.id } });
      if (boardRef.current !== at) return;
      if (session?.session_id) {
        try {
          const fresh = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}`);
          if (boardRef.current !== at) return;
          setSession(fresh);
        } catch (readFailure) {
          setSession((current) => current ? { ...current, proposals: (current.proposals ?? []).map((row) => row.proposal_id === result.proposal_id ? { ...row, status: result.status } : row) } : current);
        }
      }
      setNotice({ tone: "ok", text: `Proposal ${result.status} \u2014 recorded only; the canvas is unchanged until you save an edit.` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Decision failed: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setBusy(false);
    }
  };
  const synthesizePlan = async (proposal) => {
    const at = boardRef.current;
    setPlanBusy(true);
    try {
      const plan = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/plan`, { method: "POST", body: { project_id: project.id }, suppressErrorToast: true });
      if (boardRef.current !== at) return;
      setPlanPanel(plan);
      refreshMeta(at);
      const edited = plan.edited_by || (plan.status ?? "draft") !== "draft";
      setNotice({ tone: "ok", text: edited ? `This proposal already has a plan (${plan.status ?? "draft"}) \u2014 showing it unchanged, your edits are kept.` : `Plan drafted from the approved proposal \u2014 ${number((plan.steps ?? []).length)} step(s), nothing applied to the board.` });
    } catch (failure) {
      if (boardRef.current !== at) return;
      setPlanPanel(null);
      setNotice({ tone: "danger", text: `Plan synthesis failed: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setPlanBusy(false);
    }
  };
  const savePlanDocument = async () => {
    if (!planPanel?.plan_id) return;
    const at = boardRef.current;
    setPlanBusy(true);
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/document/save`, { method: "POST", body: {} });
      if (boardRef.current !== at) return;
      setPlanPanel((current) => ({ ...current ?? {}, ...saved }));
      setNotice({ tone: "ok", text: "Implementation document saved to the Content tab as Markdown." });
      onRefresh?.();
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Document save failed: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setPlanBusy(false);
    }
  };
  const planEditable = Boolean(planPanel?.plan_id) && (planPanel?.status ?? "draft") === "draft" && !readOnly;
  const startStepEdit = () => {
    canvasObjectSeq += 1;
    setStepsDraft((planPanel?.steps ?? []).map((step) => ({ key: `s${step.order}-${canvasObjectSeq}`, order: step.order, title: step.title ?? "" })));
    openExpanded();
  };
  const editStep = (index, patch) => setStepsDraft((current) => current.map((row, at) => at === index ? { ...row, ...patch } : row));
  const moveStep = (index, delta) => setStepsDraft((current) => {
    const to = index + delta;
    if (to < 0 || to >= current.length) return current;
    const next = [...current];
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row);
    return next;
  });
  const addStep = () => {
    canvasObjectSeq += 1;
    setStepsDraft((current) => [...current ?? [], { key: `new-${canvasObjectSeq}`, order: null, title: "" }]);
  };
  const removeStep = (index) => setStepsDraft((current) => current.length > 1 ? current.filter((_, at) => at !== index) : current);
  const saveSteps = async () => {
    if (!planPanel?.plan_id || !stepsDraft?.length) return;
    if (stepsDraft.some((row) => !row.title.trim())) {
      setNotice({ tone: "danger", text: "Every step needs a title \u2014 remove empty steps before saving." });
      return;
    }
    const at = boardRef.current;
    setPlanBusy(true);
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}`, {
        method: "PATCH",
        body: { steps: stepsDraft.map((row) => row.order ? { order: row.order, title: row.title.trim() } : { title: row.title.trim() }) }
      });
      if (boardRef.current !== at) return;
      setPlanPanel((current) => ({ ...current ?? {}, ...saved }));
      setStepsDraft(null);
      setNotice({ tone: "ok", text: `Plan steps saved \u2014 ${number((saved.steps ?? []).length)} step(s).` });
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Plan steps could not be saved: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setPlanBusy(false);
    }
  };
  const planDocSaved = planPanel?.status === "documented";
  const createdOrders = new Set((planPanel?.backlog_created ?? []).map((row) => row.order));
  const pendingSteps = (planPanel?.steps ?? []).map((step) => step.order).filter((order) => !createdOrders.has(order));
  const createBacklogItems = async () => {
    if (!planPanel?.plan_id || !backlogConfirm?.length) return;
    const at = boardRef.current;
    setPlanBusy(true);
    try {
      const result = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/backlog`, { method: "POST", body: { step_orders: backlogConfirm } });
      if (boardRef.current !== at) return;
      setPlanPanel((current) => ({ ...current ?? {}, backlog_created: result.backlog_created ?? [] }));
      setNotice({ tone: "ok", text: `${number((result.created ?? []).length)} backlog item(s) created: ${(result.created ?? []).map((row) => row.ref).join(", ")}.` });
      setBacklogConfirm(null);
      onRefresh?.();
    } catch (failure) {
      if (boardRef.current === at) setNotice({ tone: "danger", text: `Backlog creation failed: ${failureText(failure)}` });
    } finally {
      if (boardRef.current === at) setPlanBusy(false);
    }
  };
  const renderConnectors = () => {
    const byId = new Map(objects.map((item) => [item.id, item]));
    const laid = layoutConnectors(objects.map((item) => ({ ...item, ...canvasRect(item) })), connectors, (meaning) => CANVAS_MEANING_LABELS[meaning] ?? meaning, CANVAS_WORLD);
    const lines = [
      jsx("defs", { children: jsx("marker", { id: "dy-pc-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", children: jsx("path", { className: "dy-pc-arrowhead", d: "M0,0 L10,5 L0,10 z" }) }) }, "defs")
    ];
    laid.forEach((edge) => {
      const box = edge.labelBox;
      lines.push(jsx("line", { "data-canvas-connector": edge.id, "data-canvas-meaning": edge.meaning, "data-canvas-source": edge.source, "data-canvas-target": edge.target, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, markerEnd: "url(#dy-pc-arrow)" }, edge.id));
      if (edge.leader) lines.push(jsx("line", { className: "dy-pc-leader", x1: edge.anchor.x, y1: edge.anchor.y, x2: box.x + box.width / 2, y2: box.y + box.height / 2 }, `${edge.id}:leader`));
      lines.push(jsx("rect", { className: "dy-pc-edge-chip", "data-canvas-meaning": edge.meaning, x: box.x, y: box.y, width: box.width, height: box.height, rx: box.height / 2 }, `${edge.id}:chip`));
      lines.push(jsx("text", { className: "dy-pc-edge-label", "data-canvas-edge-label": edge.id, x: box.x + box.width / 2, y: box.y + box.height / 2, textAnchor: "middle", dominantBaseline: "central", children: edge.label }, `${edge.id}:label`));
    });
    if (pendingConnect) {
      const pending = byId.get(pendingConnect);
      if (pending) {
        const rect = canvasRect(pending);
        if (connectPointer) lines.push(jsx("line", { "data-pc-pending": "true", "data-canvas-connect-preview": pendingConnect, x1: rect.x + rect.width / 2, y1: rect.y + rect.height / 2, x2: connectPointer.x, y2: connectPointer.y }, "pending-line"));
        lines.push(jsx("circle", { "data-canvas-pending": pendingConnect, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, r: 7 }, "pending"));
      }
    }
    return lines;
  };
  const renderFrames = () => layoutFrames(objects.map((item) => ({ ...item, ...canvasRect(item) })), CANVAS_WORLD).map((frame) => jsx("div", { className: "dy-pc-frame", "data-canvas-frame": frame.tag, style: { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` }, children: frame.tag }, frame.tag));
  const renderFieldEditors = () => {
    const f = drawerFields;
    const off = readOnly;
    const out = [];
    out.push(jsx(RichTextEditor, { value: f.description_doc, fallbackText: f.description, readOnly: off, onChange: (doc, plain) => {
      setField("description_doc", plain ? doc : void 0);
      setField("description", plain || void 0);
    }, onProblem: setRichProblem, rest: { ...f, text: drawerText } }, `rt-${selected?.id}`));
    const links = f.links ?? [];
    out.push(jsxs("fieldset", { className: "dy-pc-fieldset", "data-canvas-links": true, children: [
      jsx("legend", { children: `Links${links.length ? ` (${links.length})` : ""}` }),
      ...links.map((link, index) => jsxs("div", { className: "dy-pc-row", "data-canvas-link-row": index, children: [
        jsx("input", { "data-canvas-link-url": index, type: "url", inputMode: "url", placeholder: "https://\u2026", maxLength: 2048, value: link.url, disabled: off, "aria-label": `Link ${index + 1} address`, "aria-invalid": link.url && !canvasSafeUrl(link.url) ? "true" : void 0, onChange: (event) => setField("links", links.map((l, i) => i === index ? { ...l, url: event.target.value } : l)) }),
        jsx("input", { "data-canvas-link-label": index, placeholder: "Label (optional)", maxLength: 200, value: link.label, disabled: off, "aria-label": `Link ${index + 1} label`, onChange: (event) => setField("links", links.map((l, i) => i === index ? { ...l, label: event.target.value } : l)) }),
        canvasSafeUrl(link.url) ? jsx("a", { className: "dy-pc-open", href: link.url.trim(), target: "_blank", rel: "noopener noreferrer nofollow", title: "Open link", "aria-label": `Open link ${index + 1}`, children: jsx(Icon, { name: "arrow-up-right" }) }) : null,
        off ? null : jsx(Button, { small: true, action: "pc-link-remove", ariaLabel: `Remove link ${index + 1}`, onClick: () => setField("links", links.filter((_, i) => i !== index)), children: jsx(Icon, { name: "x" }) })
      ] }, `link-${index}`)),
      off ? null : jsx(Button, { small: true, action: "pc-link-add", disabled: links.length >= 20, onClick: () => setField("links", [...links, { url: "", label: "" }]), children: [jsx(Icon, { name: "plus" }, "i"), "Add link"] })
    ] }));
    for (const [field, input, label, choices, max] of CANVAS_KIND_FIELDS[drawerKind] ?? []) {
      const value = f[field];
      let control;
      if (input === "choice") control = jsx("select", { "data-canvas-field": field, value: value ?? "", disabled: off, onChange: (event) => setField(field, event.target.value), children: [jsx("option", { value: "", children: "Not set" }, ""), ...choices.map((c) => jsx("option", { value: c, children: canvasChoiceLabel(c) }, c))] });
      else if (input === "member") {
        const known = members.includes(value);
        control = jsx("select", { "data-canvas-field": field, value: value ?? "", disabled: off, onChange: (event) => setField(field, event.target.value), children: [
          jsx("option", { value: "", children: "Unassigned" }, ""),
          ...members.map((m) => jsx("option", { value: m, children: m }, m)),
          value && !known ? jsx("option", { value, children: `${value} (no longer a member)` }, "former") : null
        ] });
      } else if (input === "date") control = jsx("input", { type: "date", "data-canvas-field": field, value: value ?? "", disabled: off, onChange: (event) => setField(field, event.target.value) });
      else if (input === "area") control = jsx("textarea", { "data-canvas-field": field, rows: 3, maxLength: max, value: value ?? "", readOnly: off, disabled: off, onChange: (event) => setField(field, event.target.value) });
      else if (input === "text") control = jsx("input", { "data-canvas-field": field, maxLength: max, value: value ?? "", readOnly: off, disabled: off, onChange: (event) => setField(field, event.target.value) });
      else if (input === "list") {
        const rows = Array.isArray(value) ? value : [];
        out.push(jsxs("fieldset", { className: "dy-pc-fieldset", "data-canvas-field": field, children: [
          jsx("legend", { children: label }),
          ...rows.map((row, index) => jsxs("div", { className: "dy-pc-row", children: [
            jsx("input", { maxLength: 500, value: row, disabled: off, "aria-label": `${label} ${index + 1}`, onChange: (event) => setField(field, rows.map((r, i) => i === index ? event.target.value : r)) }),
            off ? null : jsx(Button, { small: true, ariaLabel: `Remove ${label} ${index + 1}`, onClick: () => setField(field, rows.filter((_, i) => i !== index)), children: jsx(Icon, { name: "x" }) })
          ] }, index)),
          off ? null : jsx(Button, { small: true, action: `pc-${field}-add`, disabled: rows.length >= 50, onClick: () => setField(field, [...rows, ""]), children: [jsx(Icon, { name: "plus" }, "i"), "Add"] })
        ] }));
        continue;
      } else if (input === "checklist") {
        const rows = Array.isArray(value) ? value : [];
        out.push(jsxs("fieldset", { className: "dy-pc-fieldset", "data-canvas-field": field, children: [
          jsx("legend", { children: `${label}${rows.length ? ` (${rows.filter((r) => r.done).length}/${rows.length})` : ""}` }),
          ...rows.map((row, index) => jsxs("div", { className: "dy-pc-row", children: [
            jsx("input", { type: "checkbox", checked: Boolean(row.done), disabled: off, "aria-label": `Done: ${row.text || `item ${index + 1}`}`, onChange: (event) => setField(field, rows.map((r, i) => i === index ? { ...r, done: event.target.checked } : r)) }),
            jsx("input", { maxLength: 300, value: row.text ?? "", disabled: off, "aria-label": `Checklist item ${index + 1}`, onChange: (event) => setField(field, rows.map((r, i) => i === index ? { ...r, text: event.target.value } : r)) }),
            off ? null : jsx(Button, { small: true, ariaLabel: `Remove checklist item ${index + 1}`, onClick: () => setField(field, rows.filter((_, i) => i !== index)), children: jsx(Icon, { name: "x" }) })
          ] }, index)),
          off ? null : jsx(Button, { small: true, action: "pc-checklist-add", disabled: rows.length >= 50, onClick: () => setField(field, [...rows, { text: "", done: false }]), children: [jsx(Icon, { name: "plus" }, "i"), "Add item"] })
        ] }));
        continue;
      } else if (input === "image") {
        out.push(jsxs("div", { className: "dy-pc-fieldset", "data-canvas-image-field": true, children: [
          jsx("span", { className: "dy-pc-field-label", children: label }),
          value ? jsx("span", { className: "dy-pc-drawer-thumb", children: jsx(CanvasImage, { projectId: project.id, contentId: value, alt: f.alt }) }) : jsx("p", { className: "dy-pc-drawer-meta", children: "No image yet." }),
          off ? null : jsxs("label", { className: "dy-pc-upload", children: [
            jsx("span", { children: imageBusy ? "Uploading\u2026" : value ? "Replace image" : "Upload image (PNG, JPEG or WebP, up to 5 MB)" }),
            jsx("input", { type: "file", "data-canvas-image-upload": true, accept: "image/png,image/jpeg,image/webp", disabled: imageBusy, onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              uploadImage(file);
            } })
          ] }),
          off || !value ? null : jsx(Button, { small: true, action: "pc-image-clear", onClick: () => setField("content_id", ""), children: "Remove image from card" })
        ] }));
        continue;
      }
      out.push(jsxs("label", { children: [jsx("span", { children: label }), control] }));
    }
    return out;
  };
  const renderObject = (item) => {
    const rect = canvasRect(item);
    const tag = (Array.isArray(item.tags) ? item.tags : [])[0];
    const label = CANVAS_KIND_LABELS[item.kind] ?? item.kind;
    const multiSelected = selectedIds.includes(item.id);
    return jsxs("button", {
      type: "button",
      className: `dy-pc-obj${selectedId === item.id ? " selected" : ""}${pendingConnect === item.id ? " pending" : ""}${multiSelected ? " marquee-selected" : ""}`,
      "data-canvas-object": item.id,
      "data-canvas-kind": item.kind,
      "data-canvas-colour": item.colour ?? "",
      "data-canvas-x": String(Math.round(rect.x)),
      "data-canvas-y": String(Math.round(rect.y)),
      style: { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` },
      "data-canvas-height": String(Math.round(rect.height)),
      "aria-label": `${label}: ${canvasText(item) || "untitled"}`,
      onPointerDown: (event) => beginObjectDrag(event, item),
      children: [
        jsx("small", { children: `${label}${tag ? ` \xB7 ${tag}` : ""}` }),
        jsx("span", { className: "dy-pc-obj-kind-icon", "aria-hidden": true, children: jsx(Icon, { name: CANVAS_KIND_ICONS[item.kind] ?? "sticky-note" }) }),
        jsx("strong", { children: canvasText(item) || "Untitled object" }),
        item.kind === "media" && item.content?.content_id ? jsx("span", { className: "dy-pc-obj-thumb", children: jsx(CanvasImage, { projectId: project.id, contentId: item.content.content_id, alt: item.content.alt }) }) : null,
        canvasSummary(item) ? jsx("span", { className: "dy-pc-obj-sub", "data-canvas-summary": true, children: canvasSummary(item) }) : null,
        item.content?.description ? jsx("span", { className: "dy-pc-obj-desc", children: item.content.description }) : null,
        jsx("span", { className: "dy-pc-obj-meta", children: `${item.evidence_ref ? `evidence ${item.evidence_ref}` : "no evidence reference"}${item.work_ref ? ` \xB7 work ${item.work_ref}` : ""}` })
      ]
    }, item.id);
  };
  const pendingProposals = (session?.proposals ?? []).filter((proposal) => (proposal.status ?? "pending") === "pending").length;
  const assistantSummary = session?.current_question ? "Before I can propose anything I need one clarification. Nothing is applied automatically." : (session?.proposals ?? []).length ? `${number((session.proposals ?? []).length)} proposal(s) drafted as scratch \u2014 approve or dismiss each one. Nothing is applied to the canvas.` : "No curation session yet. Run Curate to review this canvas; every proposal lands as scratch and needs your decision.";
  const questionBlock = session?.current_question ? jsxs("div", { className: "dy-pc-proposal", "data-canvas-question": session.current_question.id ?? "question", children: [
    jsx("strong", { children: `Question: ${session.current_question.question}` }),
    jsx("textarea", { "data-canvas-answer": true, rows: 2, value: answer, placeholder: "Answer, or skip, defer or stop this clarification...", onChange: (event) => setAnswer(event.target.value) }),
    jsxs("div", { className: "dockyard-form-actions", children: [
      jsx(Button, { small: true, action: "skip-canvas-question", disabled: busy, onClick: () => answerQuestion("skip"), children: "Skip" }),
      jsx(Button, { small: true, action: "defer-canvas-question", disabled: busy, onClick: () => answerQuestion("defer"), children: "Defer" }),
      jsx(Button, { small: true, action: "stop-canvas-session", disabled: busy, onClick: () => answerQuestion("stop"), children: "Stop" }),
      jsx(Button, { small: true, variant: "primary", action: "answer-canvas-question", disabled: busy || !answer.trim(), onClick: () => answerQuestion("answer"), children: "Answer" })
    ] })
  ] }) : null;
  const proposalCards = (session?.proposals ?? []).map((proposal) => {
    const status = proposal.status ?? "pending";
    return jsxs("article", { className: "dy-pc-proposal", "data-canvas-proposal": proposal.proposal_id, "data-canvas-proposal-status": status, children: [
      jsx("strong", { children: proposal.title ?? CANVAS_KIND_LABELS[proposal.kind] ?? proposal.kind ?? "Proposal" }),
      jsx("small", { children: `${proposal.kind ?? "proposal"} \xB7 ${status} \xB7 scratch + suggested \xB7 ${number((proposal.source_object_ids ?? []).length)} source object(s)` }),
      status === "pending" ? jsxs("div", { className: "dockyard-form-actions", children: [
        jsx(Button, { small: true, action: "dismiss-canvas-proposal", disabled: busy, onClick: () => decideProposal(proposal, false), children: "Dismiss" }),
        jsx(Button, { small: true, variant: "primary", action: "approve-canvas-proposal", disabled: busy, onClick: () => decideProposal(proposal, true), children: "Approve" })
      ] }) : status === "approved" && proposal.kind === "technical_plan" ? jsx(Button, { small: true, action: "plan-from-proposal", disabled: planBusy, onClick: () => synthesizePlan(proposal), children: "Plan from proposal" }) : jsx("small", { children: "Decision recorded \u2014 this proposal can no longer be decided again." })
    ] }, proposal.proposal_id);
  });
  const chatBody = () => [
    jsx("div", { className: "dy-pc-msg bot", children: assistantSummary }, "summary"),
    jsx("div", { "data-canvas-chat-log": true, ref: (node) => {
      if (node) node.lastElementChild?.scrollIntoView?.({ block: "nearest" });
    }, children: (chatLog ?? []).map((message, index) => jsx("div", { className: `dy-pc-msg ${message.role}`, children: message.text }, `chat-${index}`)) }, "log"),
    questionBlock ? jsx("div", { children: questionBlock }, "question") : null,
    review ? jsx("p", { className: "dy-pc-drawer-meta", "data-canvas-review": true, children: `Review: ${number(review.summary?.evidence_count)} evidence, ${number(review.summary?.claim_count)} claim, ${number(review.summary?.question_count)} question, ${number(review.summary?.plan_block_count)} plan block(s).` }, "review") : null,
    proposalCards.length ? jsx("div", { "data-canvas-proposals": true, children: proposalCards }, "proposals") : null,
    session?.answers?.length ? jsx("div", { className: "dy-pc-msg me", children: `${number(session.answers.length)} clarification answer(s) recorded.` }, "answers") : null,
    planPanel ? jsxs("div", { className: "dy-pc-proposal", "data-canvas-plan": planPanel.plan_id, children: [
      jsx("strong", { children: "Plan ready for review" }),
      jsx("small", { children: `${number((planPanel.steps ?? []).length)} step(s) \xB7 from proposal ${planPanel.proposal_id} \xB7 nothing applied to the board.` }),
      jsx("pre", { className: "dy-pc-plan-steps", children: (planPanel.steps ?? []).map((step) => `${step.order}. ${step.title}`).join("\n") }),
      jsxs("div", { className: "dockyard-form-actions", children: [
        planEditable ? jsx(Button, { small: true, action: "pc-steps-edit", disabled: planBusy, onClick: startStepEdit, children: "Edit steps" }) : null,
        jsx(Button, { small: true, variant: planDocSaved ? "" : "primary", action: "save-plan-document", disabled: planBusy || planDocSaved, onClick: savePlanDocument, children: planDocSaved ? "Doc saved to Content" : "Save doc to Content" }),
        jsx(Button, { small: true, variant: planDocSaved && pendingSteps.length ? "primary" : "", action: "backlog-from-plan", disabled: planBusy || !planDocSaved || !pendingSteps.length || Boolean(backlogConfirm?.length), onClick: () => setBacklogConfirm(pendingSteps), children: planDocSaved && !pendingSteps.length ? "Backlog items created" : "Create backlog items" })
      ] }),
      backlogConfirm?.length ? jsxs("div", { className: "dy-pc-proposal", "data-canvas-backlog-confirm": true, children: [
        jsx("small", { children: `Create ${number(backlogConfirm.length)} backlog item(s)? One confirm per batch, nothing auto-runs.` }),
        jsx(Button, { small: true, variant: "primary", action: "confirm-backlog-from-plan", disabled: planBusy, onClick: createBacklogItems, children: "Confirm create" }),
        jsx(Button, { small: true, action: "cancel-backlog-from-plan", disabled: planBusy, onClick: () => setBacklogConfirm(null), children: "Cancel" })
      ] }) : null
    ] }, "plan") : null
  ];
  const tool = ({ action, icon, name, tip, onClick, disabled = false, variant = "", label = null, data = {} }) => jsxs("span", { className: "dy-pc-tool", children: [
    jsx(Button, { small: true, variant, action, ariaLabel: name, disabled, onClick, data: { title: `${name} \u2014 ${tip}`, ...data }, children: label ? [jsx(Icon, { name: icon }, "i"), jsx("span", { children: label }, "l")] : jsx(Icon, { name: icon }) }),
    jsxs("span", { className: "dy-pc-tip", role: "tooltip", "aria-hidden": true, children: [jsx("strong", { children: name }), jsx("span", { children: tip })] })
  ] }, action);
  const group = (label, children) => jsxs("div", { className: "dy-pc-group", role: "group", "aria-label": label, "data-pc-group": label.toLowerCase(), children: [
    jsx("span", { className: "dy-pc-group-label", "aria-hidden": true, children: label }, "label"),
    jsxs("div", { className: "dy-pc-group-tools", children }, "tools")
  ] });
  const liveBoards = boards.filter((board) => board.status !== "archived");
  const archivedBoards = boards.filter((board) => board.status === "archived");
  const listed = boardsApi ? liveBoards : [canvas].filter(Boolean);
  const statusMoves = CANVAS_BOARD_MOVES[boardStatus] ?? [];
  const modelValue = modelKey(canvas?.model);
  const modelChoices = (modelOptions?.providers ?? []).flatMap((provider) => (provider.models ?? []).map((model) => ({ value: `${provider.slug}::${model}`, label: `${provider.name ?? provider.slug} \xB7 ${model}` })));
  if (modelValue && !modelChoices.some((choice) => choice.value === modelValue)) modelChoices.unshift({ value: modelValue, label: `${canvas.model.provider} \xB7 ${canvas.model.model} (not configured)` });
  const defaultModelLabel = modelOptions?.default?.model ? `Hermes main model (${modelOptions.default.model})` : "Hermes main model";
  const effectiveTheme = theme ?? hostTheme;
  const chatState = chatPill ? "pill" : chatOpen ? "open" : "closed";
  const chatStyle = chatPos ? { left: `${chatPos.x}px`, top: `${chatPos.y}px`, right: "auto", bottom: "auto" } : void 0;
  return jsxs("section", {
    className: "dockyard-feature-card dy-pc-scope",
    "data-planning-canvas": project.id,
    "data-canvas-revision": String(revision),
    "data-canvas-dirty": dirty ? "true" : "false",
    "data-canvas-theme": effectiveTheme,
    "data-canvas-theme-source": theme ? "board" : "app",
    // Full screen: the page under the fixed frame is hidden (not just covered)
    // so its controls cannot be focused or hit-tested through the frame.
    "data-canvas-fullscreen-active": fullscreen ? "true" : "false",
    "data-canvas-board": canvas?.canvas_id ?? "",
    "data-canvas-status": boardStatus,
    onKeyDown: (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || boardForm) return;
      if (pendingLeave) {
        setPendingLeave(null);
        return;
      }
      if (pendingStatus) {
        setPendingStatus(null);
        return;
      }
      if (expanded) {
        setExpanded(false);
        return;
      }
      if (addMenuOpen) {
        setAddMenuOpen(false);
        return;
      }
      if (selectedId || selectedIds.length) {
        setSelectedId(null);
        setSelectedIds([]);
        setPendingConnect(null);
        return;
      }
      if (pendingConnect) {
        setPendingConnect(null);
        return;
      }
      if (fullscreen) setFullscreen(false);
    },
    children: [
      jsxs("div", { className: `dy-pc-board-bar${boardListOpen ? " open" : " collapsed"}`, children: [
        jsx(Button, { small: true, action: "pc-board-toggle", ariaLabel: boardListOpen ? "Hide board list" : "Show board list", data: { title: boardListOpen ? "Hide board list" : "Show board list", "aria-expanded": boardListOpen ? "true" : "false", "data-canvas-board-toggle": boardListOpen ? "open" : "closed" }, onClick: () => setBoardListOpen((value) => !value), children: jsx(Icon, { name: boardListOpen ? "chevron-up" : "chevron-down" }) }),
        jsxs("div", { className: "dy-pc-board-title", children: [
          jsx("span", { className: "dockyard-card-label", children: "OPEN BOARD" }),
          jsx("strong", { "data-canvas-board-name": true, children: canvas?.name ?? "Planning board" }),
          jsxs("span", { className: "dy-pc-board-chip", "data-canvas-board-chip": boardStatus, children: [jsx("span", { className: "dy-pc-board-dot", "data-status": boardStatus }, "d"), CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus, readOnly ? " \xB7 read-only" : ""] }),
          jsx("span", { className: "dy-pc-board-count", children: `${listed.length || 1} board${(listed.length || 1) === 1 ? "" : "s"}` })
        ] }),
        boardScoped ? jsxs("label", { className: "dy-pc-board-status", children: [
          jsx("span", { className: "dy-pc-board-dot", "data-status": boardStatus }),
          jsxs("select", { "data-canvas-board-status": true, "aria-label": "Board status", value: boardStatus, disabled: boardBusy || boardStatus === "archived", onChange: (event) => changeBoardStatus(event.target.value), children: [
            jsx("option", { value: boardStatus, children: CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus }, boardStatus),
            ...statusMoves.map((status) => jsx("option", { value: status, children: `Move to ${CANVAS_BOARD_STATUS_LABELS[status]}` }, status))
          ] })
        ] }) : null
      ] }),
      boardListOpen ? jsxs("div", { className: "dy-pc-board-panel", children: [
        // Actions sit ABOVE the list so they are found first.
        boardsApi ? boardForm ? jsxs("div", { className: "dy-pc-board-form", children: [
          jsx("input", { "data-canvas-board-form": boardForm.mode, "aria-label": boardForm.mode === "rename" ? "New board name" : "Board name", maxLength: 120, value: boardForm.name, placeholder: "Board name", autoFocus: true, onChange: (event) => setBoardForm({ ...boardForm, name: event.target.value }), onKeyDown: (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitBoardForm();
            }
            if (event.key === "Escape") setBoardForm(null);
          } }),
          jsx(Button, { small: true, variant: "primary", action: "pc-board-form-save", disabled: boardBusy || !String(boardForm.name ?? "").trim(), onClick: submitBoardForm, children: boardForm.mode === "rename" ? "Rename" : "Create board" }),
          jsx(Button, { small: true, action: "pc-board-form-cancel", onClick: () => setBoardForm(null), children: "Cancel" })
        ] }) : jsxs("div", { className: "dy-pc-board-form", children: [
          jsx(Button, { small: true, variant: "primary", action: "pc-board-new", disabled: boardBusy, onClick: () => setBoardForm({ mode: "create", name: "" }), children: [jsx(Icon, { name: "plus" }, "i"), "New board"] }),
          jsx(Button, { small: true, action: "pc-board-rename", disabled: boardBusy || !boardScoped, onClick: () => setBoardForm({ mode: "rename", name: canvas?.name ?? "" }), children: [jsx(Icon, { name: "square-pen" }, "i"), "Rename open board"] }),
          jsx(Button, { small: true, action: "pc-board-show-archived", disabled: boardBusy, data: { "aria-pressed": showArchived ? "true" : "false" }, onClick: toggleArchived, children: [jsx(Icon, { name: "archive" }, "i"), showArchived ? "Hide archived" : "Show archived"] })
        ] }) : null,
        jsxs("nav", { className: "dy-pc-board-list", "aria-label": "Planning boards", children: [
          ...listed.map((board) => {
            const active = board.canvas_id === canvas?.canvas_id;
            return jsxs("div", { className: `dy-pc-board-item${active ? " active" : ""}`, "data-canvas-board-row": board.canvas_id ?? "legacy", "data-canvas-board-active": active ? "true" : "false", children: [
              jsxs("button", { type: "button", className: `dy-pc-board-row${active ? " active" : ""}`, "aria-current": active ? "true" : void 0, "aria-label": active ? `${board.name ?? "Main board"} (open)` : `Open ${board.name ?? "board"}`, disabled: boardBusy, onClick: () => selectBoard(board), children: [
                jsx("span", { className: "dy-pc-board-dot", "data-status": board.status ?? "draft" }),
                jsxs("span", { className: "dy-pc-board-row-copy", children: [jsx("strong", { children: board.name ?? "Main board" }), jsx("small", { children: `${CANVAS_BOARD_STATUS_LABELS[board.status ?? "draft"] ?? board.status} \xB7 ${number(board.object_count ?? board.objects?.length ?? 0)} objects` })] }),
                active ? jsx("span", { className: "dy-pc-board-open", "data-canvas-board-open": true, children: "Open" }) : null,
                board.changed_since_plan ? jsx("span", { className: "dy-pc-board-warning", title: "Board changed since its plan was made", "aria-label": "Changed since plan", children: "!" }) : null
              ] }),
              boardsApi && board.canvas_id ? jsx(Button, { small: true, action: "pc-board-archive", ariaLabel: `Archive ${board.name}`, data: { title: liveBoards.length > 1 ? `Archive ${board.name}` : "The last live board cannot be archived \u2014 create another board first" }, disabled: boardBusy || liveBoards.length <= 1, onClick: () => archiveBoard(board), children: jsx(Icon, { name: "archive" }) }) : null
            ] }, board.canvas_id ?? "legacy");
          }),
          boardsApi && showArchived ? archivedBoards.length ? archivedBoards.map((board) => jsxs("div", { className: "dy-pc-board-item archived", "data-canvas-board-row": board.canvas_id, "data-canvas-board-archived": true, children: [
            jsxs("span", { className: "dy-pc-board-row", children: [jsx("span", { className: "dy-pc-board-dot", "data-status": "archived" }), jsxs("span", { className: "dy-pc-board-row-copy", children: [jsx("strong", { children: board.name }), jsx("small", { children: `Archived \xB7 was ${CANVAS_BOARD_STATUS_LABELS[board.archived_from] ?? "Draft"}` })] })] }),
            jsx(Button, { small: true, action: "pc-board-restore", ariaLabel: `Restore ${board.name}`, data: { title: `Restore ${board.name}` }, disabled: boardBusy, onClick: () => restoreBoard(board), children: jsx(Icon, { name: "archive-restore" }) })
          ] }, board.canvas_id)) : [jsx("p", { className: "dy-pc-board-archived", children: "No archived boards." }, "none")] : null
        ] })
      ] }) : null,
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [
          jsx("span", { className: "dockyard-card-label", children: "PLANNING CANVAS" }),
          jsx("h2", { children: "Evidence to plan" }),
          jsx("p", { children: `${number(objects.length)} object(s), ${number(connectors.length)} connector(s), revision ${number(revision)}${dirty ? " \xB7 unsaved edits" : " \xB7 saved"}${readOnly ? ` \xB7 ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} (read-only)` : ""}. The steward only proposes; nothing is applied automatically.` }),
          content.length ? jsx("p", { className: "dockyard-meta", children: `${number(content.length)} project content item(s) available to reference.` }) : null
        ] })
      ] }),
      jsxs("div", { className: `dy-pc${fullscreen ? " dy-pc-full" : ""}`, "data-canvas-theme": theme ?? void 0, "data-canvas-fullscreen": fullscreen ? "true" : "false", children: [
        jsxs("div", { className: "dy-pc-toolbar dy-pc-ribbon", role: "toolbar", "aria-label": "Planning canvas tools", children: [
          group("Edit", [
            tool({ action: "pc-mode-select", icon: "mouse-pointer-2", name: "Select", tip: "Click to edit, drag a sticker to move it. Drag empty space or scroll to move around; Shift+drag to multi-select; Ctrl+scroll zooms.", variant: mode === "select" ? "primary" : "", onClick: () => {
              setMode("select");
              setPendingConnect(null);
            } }),
            tool({ action: "pc-mode-connect", icon: "spline", name: "Connect", tip: "Click two stickers to link them with the chosen meaning.", variant: mode === "connect" ? "primary" : "", disabled: readOnly, onClick: () => {
              setMode("connect");
              setPendingConnect(null);
              setNotice({ tone: "ok", text: "Connect mode: click a sticker, then the sticker to link it to. Dragging is off while connecting; scroll to move around, Esc cancels." });
            } }),
            tool({ action: "pc-undo", icon: "undo-2", name: "Undo", tip: "Step back one board edit (Ctrl+Z).", disabled: !history.length || readOnly, onClick: undo }),
            tool({ action: "pc-redo", icon: "redo-2", name: "Redo", tip: "Re-apply the edit you undid (Ctrl+Shift+Z).", disabled: !future.length || readOnly, onClick: redo }),
            tool({ action: "pc-duplicate", icon: "copy-plus", name: "Duplicate", tip: "Copy the selected sticker(s) (Ctrl+D).", disabled: !(selectedIds.length || selectedId) || readOnly, onClick: duplicateSelection }),
            tool({ action: "pc-tidy", icon: "layout-dashboard", name: "Tidy", tip: "Line every sticker up on a grid.", disabled: !objects.length || readOnly, onClick: tidy2 })
          ]),
          group("Add", [
            jsxs("div", { className: "dy-pc-add", children: [
              jsx("select", { "data-canvas-kind-picker": true, "aria-label": "Object kind", value: kind, disabled: readOnly, onChange: (event) => setKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx("option", { value, children: CANVAS_KIND_LABELS[value] }, value)) }),
              jsx("input", { "data-canvas-draft": true, "aria-label": "New object text", value: draft, disabled: readOnly, maxLength: 4e3, placeholder: "Type a note, question or link\u2026", onChange: (event) => setDraft(event.target.value), onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addFromDraft();
                }
              } }),
              tool({ action: "add-canvas-object", icon: "plus", name: "Add object", tip: "Add the text above as a sticker of the chosen kind.", variant: "primary", disabled: !draft.trim() || readOnly, onClick: addFromDraft })
            ] }),
            jsxs("div", { className: "dy-pc-tool", ref: addMenuRef, children: [
              jsx(Button, { small: true, action: "pc-add-menu", ariaLabel: "Add sticker", disabled: readOnly, data: { title: "Add sticker \u2014 pick a kind to drop a blank sticker", "aria-haspopup": "menu", "aria-expanded": addMenuOpen ? "true" : "false" }, onClick: () => setAddMenuOpen((value) => !value), children: [jsx(Icon, { name: "sticky-note" }, "i"), jsx(Icon, { name: "chevron-down" }, "c")] }),
              jsx("div", { className: "dy-pc-addmenu", role: "menu", "aria-label": "Add sticker", hidden: !addMenuOpen, children: CANVAS_OBJECT_KINDS.map((value) => jsxs("button", {
                type: "button",
                role: "menuitem",
                "data-action": `add-canvas-${value}`,
                "data-canvas-add-kind": value,
                onClick: () => {
                  addObject(value, `New ${CANVAS_KIND_LABELS[value]}`);
                  setAddMenuOpen(false);
                },
                children: [jsx("span", { className: "swatch", style: { background: `var(--dy-pc-fill-${value})`, borderLeft: `3px solid var(--dy-pc-kind-${value})` } }, "s"), jsx(Icon, { name: CANVAS_KIND_ICONS[value] }, "i"), CANVAS_KIND_LABELS[value]]
              }, `add-${value}`)) })
            ] })
          ]),
          group("View", [
            tool({ action: "pc-zoom-out", icon: "zoom-out", name: "Zoom out", tip: "Shrink the board view.", onClick: () => zoomBy(-CANVAS_ZOOM.step) }),
            jsx("span", { className: "dy-pc-readout", "data-canvas-zoom-readout": String(Math.round(zoom * 100)), children: `${Math.round(zoom * 100)}%` }, "zoom"),
            tool({ action: "pc-zoom-in", icon: "zoom-in", name: "Zoom in", tip: "Enlarge the board view.", onClick: () => zoomBy(CANVAS_ZOOM.step) }),
            tool({ action: "pc-fit", icon: "scan", name: "Fit", tip: "Fit every sticker in view.", onClick: fit }),
            tool({ action: "pc-fullscreen", icon: fullscreen ? "minimize-2" : "maximize-2", name: fullscreen ? "Exit full screen" : "Full screen", tip: fullscreen ? "Back to the normal page layout (Esc)." : "Give the board the whole window. Esc returns.", variant: fullscreen ? "primary" : "", onClick: () => setFullscreen((value) => !value), data: { "aria-pressed": fullscreen ? "true" : "false" } }),
            tool({ action: "pc-theme-light", icon: "sun", name: "Light canvas", tip: "Light canvas for this board only. Click again to follow the app.", variant: theme === "light" ? "primary" : "", onClick: () => setBoardTheme("light"), data: { "aria-pressed": theme === "light" ? "true" : "false" } }),
            tool({ action: "pc-theme-dark", icon: "moon", name: "Dark canvas", tip: "Dark glowing canvas for this board only. Click again to follow the app.", variant: theme === "dark" ? "primary" : "", onClick: () => setBoardTheme("dark"), data: { "aria-pressed": theme === "dark" ? "true" : "false" } })
          ]),
          group("AI", [
            tool({ action: "pc-curate", icon: "sparkles", name: "Curate", tip: "Ask the steward to turn this board into proposals.", disabled: busy || readOnly, onClick: () => curate() }),
            tool({ action: "pc-review", icon: "list-checks", name: "Review", tip: "Count what is on this board; nothing is sent to AI.", disabled: busy, onClick: reviewCanvas })
          ]),
          jsx("div", { className: "dy-pc-ribbon-fill", "aria-hidden": true }, "fill"),
          group("Save", [
            tool({ action: "pc-reload", icon: "refresh-cw", name: "Reload", tip: "Re-read the saved board; discards unsaved edits.", disabled: busy, onClick: reload }),
            tool({ action: "pc-save", icon: "save", name: "Save canvas", tip: "Save this board as a new revision.", variant: "primary", label: busy ? "Working..." : "Save", disabled: busy || readOnly, onClick: save })
          ])
        ] }),
        objects.length >= 2 && !readOnly ? jsxs("div", { className: "dy-pc-linkbar", "data-canvas-connector-editor": true, children: [
          jsxs("label", { children: [jsx("span", { children: "From" }), jsx("select", { value: linkSource, onChange: (event) => setLinkSource(event.target.value), children: [jsx("option", { value: "", children: "Choose source" }, "none"), ...objects.map((item) => jsx("option", { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsxs("label", { children: [jsx("span", { children: "Relationship" }), jsx("select", { value: linkMeaning, onChange: (event) => setLinkMeaning(event.target.value), children: CANVAS_CONNECTOR_MEANINGS.map((value) => jsx("option", { value, children: value }, value)) })] }),
          jsxs("label", { children: [jsx("span", { children: "To" }), jsx("select", { value: linkTarget, onChange: (event) => setLinkTarget(event.target.value), children: [jsx("option", { value: "", children: "Choose target" }, "none"), ...objects.map((item) => jsx("option", { value: item.id, children: canvasText(item) || item.id }, item.id))] })] }),
          jsx(Button, { small: true, action: "connect-canvas-objects", disabled: !linkSource || !linkTarget || linkSource === linkTarget, onClick: connectFromEditor, children: "Connect objects" })
        ] }) : null,
        jsxs("div", {
          ref: stageRef,
          className: "dy-pc-stage",
          "data-pc-stage": true,
          "data-pc-mode": mode,
          "data-pc-panning": panning ? "true" : "false",
          role: "group",
          "aria-label": "Planning canvas stage",
          tabIndex: 0,
          onPointerDown: beginPan,
          onPointerMove: mode === "connect" && pendingConnect ? (event) => {
            const box = stageRef.current?.getBoundingClientRect();
            if (!box) return;
            setConnectPointer({ x: (event.clientX - box.left - panRef.current.x) / zoomRef.current, y: (event.clientY - box.top - panRef.current.y) / zoomRef.current });
          } : void 0,
          onKeyDown: onStageKeyDown,
          children: [
            jsxs("div", {
              className: "dy-pc-world",
              "data-pc-world": true,
              "data-canvas-pan": `${Math.round(pan.x)},${Math.round(pan.y)}`,
              "data-canvas-zoom": String(Math.round(zoom * 100)),
              style: { transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` },
              children: [
                jsx("svg", { className: "dy-pc-svg", viewBox: `0 0 ${CANVAS_WORLD.width} ${CANVAS_WORLD.height}`, width: CANVAS_WORLD.width, height: CANVAS_WORLD.height, "aria-hidden": true, children: renderConnectors() }),
                ...renderFrames(),
                ...objects.map(renderObject),
                marquee ? jsx("div", { className: "dy-pc-marquee", "data-pc-marquee": true, style: { left: `${marquee.x}px`, top: `${marquee.y}px`, width: `${marquee.width}px`, height: `${marquee.height}px` } }) : null,
                objects.length === 0 ? jsx("p", { className: "dy-pc-empty", children: "No canvas objects yet. Capture a note or evidence above, then drag it into place." }) : null
              ]
            }),
            jsx("div", { className: `dy-pc-backdrop${selected ? " open" : ""}`, "data-pc-backdrop": true, onClick: () => setSelectedId(null) }),
            jsxs("aside", { ref: chatRef, className: `dy-pc-chat ${chatState}${chatDragging ? " dragging" : ""}${selected ? " behind-drawer" : ""}`, "data-canvas-assistant": true, "data-canvas-chat-state": chatState, style: chatStyle, "aria-label": "Steward chat", children: [
              jsxs("div", { className: "dy-pc-chat-bar", children: [
                jsx("span", { className: "dy-pc-chat-grip", "data-canvas-chat-grip": true, role: "button", tabIndex: 0, "aria-label": "Move chat window (arrow keys; Home resets)", title: "Drag to move \xB7 arrow keys move \xB7 Home resets", onPointerDown: beginChatDrag, onKeyDown: nudgeChat, children: jsx(Icon, { name: "grip-horizontal" }) }),
                jsxs("button", { type: "button", className: "dy-pc-chat-h", "data-action": "pc-chat-toggle", "aria-expanded": chatOpen && !chatPill ? "true" : "false", onClick: toggleChat, children: [
                  jsx("span", { className: "av", "aria-hidden": true, children: jsx(Icon, { name: "bot" }) }),
                  jsxs("span", { style: { flex: "1 1 auto", minWidth: 0 }, children: [
                    jsx("strong", { children: "Steward" }),
                    chatPill ? null : jsx("span", { className: "sub", children: session?.current_question ? "clarification in progress \xB7 nothing applied" : `${number(pendingProposals)} proposal(s) waiting \xB7 nothing applied` })
                  ] }),
                  chatPill ? null : jsx("span", { className: "tog", "aria-hidden": true, children: chatOpen ? "\u25BC" : "\u25B2" })
                ] }),
                chatPill ? null : jsx(Button, { small: true, action: "pc-chat-minimise", ariaLabel: "Minimise chat to a pill", data: { title: "Minimise to a pill" }, onClick: minimiseChat, children: jsx(Icon, { name: "minimize-2" }) }),
                chatPill ? null : jsx(Button, { small: true, action: "pc-chat-expand", ariaLabel: "Expand chat into a large view", data: { title: "Expand for reading and editing plans" }, onClick: openExpanded, children: jsx(Icon, { name: "maximize-2" }) })
              ] }),
              boardScoped ? jsxs("label", { className: "dy-pc-chat-model", children: [
                jsx("span", { children: "Model" }),
                jsxs("select", { "data-canvas-model": true, "aria-label": "Model for this board", value: modelValue, disabled: boardBusy || readOnly, onChange: (event) => setBoardModel(event.target.value), children: [
                  jsx("option", { value: "", children: defaultModelLabel }, "default"),
                  ...modelChoices.map((choice) => jsx("option", { value: choice.value, children: choice.label }, choice.value))
                ] })
              ] }) : null,
              jsxs("div", { className: "dy-pc-chat-b", children: chatBody() }),
              jsxs("div", { className: "dy-pc-chat-f", children: [
                jsx("span", { className: "dy-pc-readout", children: readOnly ? `Board is ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} \u2014 reopen it to chat.` : "Approval contract: scratch + suggested only." }),
                jsx("input", { "data-canvas-chat-input": true, "aria-label": "Message the steward", value: chatDraft, maxLength: 4e3, disabled: readOnly, placeholder: "Ask the steward about this board...", onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChat();
                  }
                } }),
                jsx(Button, { small: true, action: "pc-chat-send", ariaLabel: "Send", disabled: chatBusy || !chatDraft.trim() || readOnly, onClick: sendChat, children: [jsx(Icon, { name: "send" }, "i"), "Send"] }),
                jsx(Button, { small: true, action: "pc-chat-stop", ariaLabel: "Stop", disabled: !chatBusy, onClick: stopChat, children: [jsx(Icon, { name: "square" }, "i"), "Stop"] })
              ] })
            ] }),
            expanded ? jsx("div", { className: "dy-pc-overlay", "data-canvas-expanded": stepsDraft ? "steps" : "chat", onPointerDown: (event) => {
              if (event.target === event.currentTarget) setExpanded(false);
            }, onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setExpanded(false);
              }
            }, children: jsxs("div", { className: `dy-pc-overlay-card${stepsDraft ? " steps" : " chat"}`, role: "dialog", "aria-modal": "true", "aria-label": stepsDraft ? "Edit plan steps" : "Steward chat \u2014 large view", children: [
              jsxs("div", { className: "dy-pc-overlay-h", children: [
                jsx("span", { className: "dy-pc-overlay-av", "aria-hidden": true, children: jsx(Icon, { name: "bot" }) }),
                jsxs("div", { className: "dy-pc-overlay-title", children: [
                  jsx("strong", { children: stepsDraft ? "Edit plan steps" : "Steward" }),
                  jsx("span", { children: `${canvas?.name ?? "Planning board"} \xB7 ${CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus}` })
                ] }),
                jsx(Button, { small: true, action: "pc-expanded-close", ariaLabel: "Close large view", data: { title: "Back to the canvas (Esc)" }, onClick: () => setExpanded(false), children: jsx(Icon, { name: "minimize-2" }) })
              ] }),
              !stepsDraft && boardScoped ? jsxs("label", { className: "dy-pc-chat-model dy-pc-overlay-model", children: [
                jsx("span", { children: "Model" }),
                jsxs("select", { "aria-label": "Model for this board (large view)", value: modelValue, disabled: boardBusy || readOnly, onChange: (event) => setBoardModel(event.target.value), children: [
                  jsx("option", { value: "", children: defaultModelLabel }, "default"),
                  ...modelChoices.map((choice) => jsx("option", { value: choice.value, children: choice.label }, choice.value))
                ] })
              ] }) : null,
              jsxs("div", { className: "dy-pc-overlay-b", "data-canvas-expanded-body": true, children: [
                ...stepsDraft ? [] : chatBody(),
                stepsDraft ? jsxs("div", { "data-canvas-steps-editor": planPanel?.plan_id ?? true, children: [
                  jsx("p", { className: "dy-pc-drawer-meta", children: "Edit, reorder, add or remove steps. Steps you keep keep their sources; new steps start with none." }),
                  jsx("ol", { children: stepsDraft.map((row, index) => jsxs("li", { children: [
                    jsx("span", { children: `${index + 1}.` }),
                    jsx("input", { "data-canvas-step-title": index, "aria-label": `Step ${index + 1} title`, maxLength: 400, value: row.title, onChange: (event) => editStep(index, { title: event.target.value }) }),
                    jsx(Button, { small: true, action: "pc-step-up", ariaLabel: `Move step ${index + 1} up`, disabled: index === 0, onClick: () => moveStep(index, -1), children: "\u2191" }),
                    jsx(Button, { small: true, action: "pc-step-down", ariaLabel: `Move step ${index + 1} down`, disabled: index === stepsDraft.length - 1, onClick: () => moveStep(index, 1), children: "\u2193" }),
                    jsx(Button, { small: true, action: "pc-step-remove", ariaLabel: `Remove step ${index + 1}`, disabled: stepsDraft.length === 1, onClick: () => removeStep(index), children: jsx(Icon, { name: "trash-2" }) })
                  ] }, row.key)) })
                ] }) : null
              ] }),
              stepsDraft ? jsxs("div", { className: "dy-pc-overlay-f", children: [
                jsx(Button, { small: true, action: "pc-step-add", onClick: addStep, disabled: stepsDraft.length >= 50, children: [jsx(Icon, { name: "plus" }, "i"), "Add step"] }),
                jsx(Button, { small: true, action: "pc-steps-cancel", onClick: () => setStepsDraft(null), children: "Cancel" }),
                jsx(Button, { small: true, variant: "primary", action: "pc-steps-save", disabled: planBusy, onClick: saveSteps, children: "Save steps" })
              ] }) : jsxs("div", { className: "dy-pc-overlay-f dy-pc-overlay-composer", children: [
                jsx("textarea", { "data-canvas-chat-input-large": true, "aria-label": "Message the steward (large view)", value: chatDraft, maxLength: 4e3, rows: 3, disabled: readOnly, placeholder: readOnly ? `Board is ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} \u2014 reopen it to chat.` : "Ask the steward about this board... (Enter sends, Shift+Enter new line)", onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChat();
                  }
                } }),
                jsxs("div", { className: "dy-pc-overlay-actions", children: [
                  jsx(Button, { small: true, action: "pc-chat-stop-large", ariaLabel: "Stop", disabled: !chatBusy, onClick: stopChat, children: [jsx(Icon, { name: "square" }, "i"), "Stop"] }),
                  jsx(Button, { small: true, variant: "primary", action: "pc-chat-send-large", ariaLabel: "Send", disabled: chatBusy || !chatDraft.trim() || readOnly, onClick: sendChat, children: [jsx(Icon, { name: "send" }, "i"), "Send"] })
                ] })
              ] })
            ] }) }) : null,
            pendingStatus ? jsx("div", { className: "dy-pc-overlay dy-pc-leave", "data-canvas-status-confirm": pendingStatus, children: jsxs("div", { className: "dy-pc-overlay-card dy-pc-leave-card", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "dy-pc-status-title", "aria-describedby": "dy-pc-status-body", onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setPendingStatus(null);
              }
            }, children: [
              jsxs("div", { className: "dy-pc-overlay-h", children: [
                jsx("span", { className: "dy-pc-overlay-av", "aria-hidden": true, children: jsx(Icon, { name: "list-checks" }) }),
                jsx("strong", { id: "dy-pc-status-title", children: "Change board status?" })
              ] }),
              jsx("p", { className: "dy-pc-leave-body", id: "dy-pc-status-body", children: `Move ${canvas?.name ?? "this board"} from ${CANVAS_BOARD_STATUS_LABELS[boardStatus] ?? boardStatus} to ${CANVAS_BOARD_STATUS_LABELS[pendingStatus] ?? pendingStatus}?${CANVAS_READ_ONLY.includes(pendingStatus) ? " The board becomes read-only until you move it back." : ""}` }),
              jsxs("div", { className: "dy-pc-overlay-f", children: [
                jsx(Button, { small: true, action: "pc-status-cancel", onClick: () => setPendingStatus(null), children: "Cancel" }),
                jsx(Button, { small: true, variant: "primary", action: "pc-status-confirm", disabled: boardBusy, onClick: confirmBoardStatus, children: `Move to ${CANVAS_BOARD_STATUS_LABELS[pendingStatus] ?? pendingStatus}` })
              ] })
            ] }) }) : null,
            pendingLeave ? jsx("div", { className: "dy-pc-overlay dy-pc-leave", "data-canvas-unsaved-prompt": true, children: jsxs("div", { className: "dy-pc-overlay-card dy-pc-leave-card", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "dy-pc-leave-title", "aria-describedby": "dy-pc-leave-body", onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setPendingLeave(null);
              }
            }, children: [
              jsxs("div", { className: "dy-pc-overlay-h", children: [
                jsx("span", { className: "dy-pc-overlay-av warn", "aria-hidden": true, children: jsx(Icon, { name: "save" }) }),
                jsx("strong", { id: "dy-pc-leave-title", children: "Unsaved changes" })
              ] }),
              jsx("p", { className: "dy-pc-leave-body", id: "dy-pc-leave-body", children: `${canvas?.name ?? "This board"} has unsaved edits. Save them before you ${pendingLeave.label}?` }),
              jsxs("div", { className: "dy-pc-overlay-f", children: [
                jsx(Button, { small: true, action: "pc-leave-cancel", autoFocus: true, onClick: () => setPendingLeave(null), children: "Cancel" }),
                jsx(Button, { small: true, variant: "danger", action: "pc-leave-discard", disabled: busy, onClick: leaveDiscarding, children: "Discard changes" }),
                jsx(Button, { small: true, variant: "primary", action: "pc-leave-save", disabled: busy || readOnly, onClick: leaveSaving, children: busy ? "Saving..." : "Save and continue" })
              ] })
            ] }) }) : null,
            jsxs("aside", { className: `dy-pc-drawer${selected ? " open" : ""}`, "data-canvas-drawer": selected?.id ?? "none", "aria-hidden": selected ? void 0 : "true", onKeyDown: (event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setSelectedId(null);
                setSelectedIds([]);
              }
            }, children: [
              jsxs("div", { className: "dy-pc-drawer-h", children: [
                jsxs("div", { children: [
                  jsx("strong", { children: selected ? `${CANVAS_KIND_LABELS[selected.kind] ?? selected.kind} \xB7 selected` : "Selected object" }),
                  jsx("span", { className: "dy-pc-drawer-meta", children: selected ? `x ${Math.round(canvasNumber(selected.x))} \xB7 y ${Math.round(canvasNumber(selected.y))}` : "Nothing selected" })
                ] }),
                jsx(Button, { small: true, action: "pc-close-drawer", ariaLabel: "Close selection drawer", onClick: () => setSelectedId(null), children: "\u2715" })
              ] }),
              selected ? jsxs("div", { className: "dy-pc-drawer-b", children: [
                readOnly ? jsx("p", { className: "dy-pc-drawer-meta", "data-canvas-drawer-readonly": true, children: `This board is ${CANVAS_BOARD_STATUS_LABELS[boardStatus]} \u2014 details are view-only.` }) : null,
                jsxs("label", { children: [jsx("span", { children: "Title" }), jsx("input", { "data-canvas-object-title": true, maxLength: 4e3, value: drawerText, readOnly, disabled: readOnly, onChange: (event) => setDrawerText(event.target.value) })] }),
                jsxs("label", { children: [jsx("span", { children: "Kind" }), jsx("select", { "data-canvas-object-kind": true, value: drawerKind, disabled: readOnly, onChange: (event) => setDrawerKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx("option", { value, children: CANVAS_KIND_LABELS[value] }, value)) })] }),
                jsxs("div", { className: "dy-pc-colours-field", children: [
                  jsx("span", { className: "dy-pc-field-label", id: "dy-pc-colour-label", children: `Sticker colour \xB7 ${selectedColour ? CANVAS_STICKER_LABELS[selectedColour] : "Default for kind"}` }),
                  // Owner 01/10: a coloured dot per choice so the colour is visible before
                  // picking. Dots read the live theme tokens, so a dark board shows dark fills.
                  jsx("div", { className: "dy-pc-colours", role: "group", "aria-labelledby": "dy-pc-colour-label", "data-canvas-object-colour": selectedColour ?? "", children: [null, ...CANVAS_STICKER_COLOURS].map((value) => jsx("button", {
                    type: "button",
                    className: "dy-pc-colour",
                    "data-canvas-colour-option": value ?? "default",
                    disabled: readOnly,
                    "aria-pressed": (selectedColour ?? null) === value ? "true" : "false",
                    "aria-label": value ? CANVAS_STICKER_LABELS[value] : "Default for kind",
                    title: value ? CANVAS_STICKER_LABELS[value] : "Default for kind",
                    onClick: () => setSelectedColour(value),
                    children: jsx("span", { className: `dy-pc-colour-dot${value ? "" : " default"}`, style: { background: value ? `var(--dy-pc-sticker-${value})` : `var(--dy-pc-fill-${selected.kind})` } })
                  }, value ?? "default")) })
                ] }),
                ...renderFieldEditors(),
                jsx("p", { className: "dy-pc-drawer-meta", children: selected.evidence_ref ? `Evidence reference: ${selected.evidence_ref}` : "No evidence reference on this object." }),
                readOnly ? null : jsxs("div", { className: "dockyard-form-actions", children: [
                  jsx(Button, { small: true, variant: "danger", action: "remove-canvas-object", disabled: busy, onClick: removeSelected, children: "Remove object" }),
                  jsx(Button, { small: true, variant: "primary", action: "apply-canvas-object", disabled: busy || !drawerText.trim() || Boolean(richProblem), onClick: applyDrawer, children: "Apply" })
                ] })
              ] }) : jsx("p", { className: "dy-pc-drawer-meta", children: "Select an object on the canvas to edit its title, kind or removal." })
            ] })
          ]
        }),
        notice ? jsx("p", { className: "dy-pc-notice", role: "status", "data-pc-tone": notice.tone, "data-canvas-notice": true, children: notice.text }) : null
      ] })
    ]
  });
}

// hermes_dockyard_plugin/desktop/src/views/dashboard.js
function DiscoveredProfilePicker({ profiles = [], value = "", onChange, name, label = "Hermes profile", disabled = false }) {
  const [search, setSearch] = useState("");
  const normalised = profiles.map((profile) => ({
    ...profile,
    value: profile.slug || profile.name || profile.id,
    label: profile.display_name || profile.slug || profile.name || profile.id
  })).filter((profile) => profile.value);
  if (value && !normalised.some((profile) => profile.value === value)) {
    normalised.push({ value, label: value, available: false, selectable: false, historical_reference: true });
  }
  const query = search.trim().toLowerCase();
  const visible = normalised.filter((profile) => !query || profile.label.toLowerCase().includes(query) || profile.value.toLowerCase().includes(query));
  return jsxs("div", { className: "dockyard-field dockyard-profile-picker", "data-profile-picker": name, children: [
    jsx("label", { htmlFor: `dockyard-profile-search-${name}`, children: `${label} search` }),
    jsx("input", { id: `dockyard-profile-search-${name}`, "data-profile-search": true, value: search, placeholder: "Search discovered profiles", disabled, onInput: (event) => setSearch(event.target.value), onChange: (event) => setSearch(event.target.value) }),
    jsx("select", { value, disabled, "aria-label": label, onChange: (event) => onChange?.(event.target.value), children: [
      jsx("option", { value: "", children: "Choose an available profile" }, "none"),
      ...visible.map((profile) => jsx("option", { value: profile.value, disabled: profile.available === false || profile.selectable === false, children: `${profile.label}${profile.available === false || profile.selectable === false ? " (unavailable)" : ""}` }, profile.value))
    ] })
  ] });
}
function WorkBar({ work, project = false, label = "Work distribution" }) {
  const backlog = Number(work?.backlog ?? 0);
  const active = Number(work?.active ?? 0);
  const done = Number(work?.done ?? 0);
  const total = Math.max(1, backlog + active + done);
  return jsxs("div", {
    className: `dockyard-work-visual${project ? " compact" : ""}`,
    role: "img",
    "aria-label": `${label}: ${backlog} backlog, ${active} active, ${done} done`,
    "data-work-visual": project ? true : void 0,
    children: [
      backlog > 0 ? jsx("span", { className: "backlog", style: { width: `${backlog / total * 100}%` } }) : null,
      active > 0 ? jsx("span", { className: "active", style: { width: `${active / total * 100}%` } }) : null,
      done > 0 ? jsx("span", { className: "done", style: { width: `${done / total * 100}%` } }) : null
    ]
  });
}
function DashboardView({ view, onInbox, onRefresh, onOpen, resetView }) {
  const STATUS_PRIORITY = { at_risk: 0, stalled: 1, on_track: 2, idle: 3 };
  const projects = [...view.portfolio?.projects ?? []].sort((left, right) => (STATUS_PRIORITY[left.status] ?? 2) - (STATUS_PRIORITY[right.status] ?? 2));
  const decisions = view.groups?.decisions ?? [];
  const interventions = view.groups?.interventions ?? [];
  const rows = [...decisions, ...interventions].sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0));
  const [selected, setSelected] = useState(null);
  const [subview, setSubview] = useState("overview");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [issueFilter, setIssueFilter] = useState("all");
  useEffect(() => {
    setSubview("overview");
  }, [resetView]);
  const [decision, setDecision] = useState(null);
  const [detailError, setDetailError] = useState("");
  const focusItem = selected === false ? null : selected ?? decisions[0] ?? null;
  useEffect(() => {
    if (!focusItem?.ref || focusItem.kind !== "initiative_approval") {
      setDecision(null);
      setDetailError("");
      return void 0;
    }
    let cancelled = false;
    setDecision(null);
    api(`/initiatives/${encodeURIComponent(focusItem.ref)}/decision`).then((result) => {
      if (!cancelled) {
        setDecision(result);
        setDetailError("");
      }
    }).catch((error) => {
      if (!cancelled) setDetailError(String(error?.message ?? error));
    });
    return () => {
      cancelled = true;
    };
  }, [focusItem?.ref, focusItem?.kind]);
  const onTrack = projects.filter((project) => project.status === "on_track").length;
  const evidenceFiles = view.portfolio?.evidence_files;
  const workActive = Number(view.totals?.active_work ?? 0);
  const waiting = Number(view.inbox?.count ?? 0);
  const statusName = { on_track: "On track", at_risk: "At risk", stalled: "Stalled", idle: "Idle" };
  const metric = (label, value, detail, icon, tone, onClick) => jsxs(onClick ? "button" : "div", {
    type: onClick ? "button" : void 0,
    onClick,
    "data-metric": label.toLowerCase().replace(/[^a-z]+/g, "-"),
    className: `dockyard-command-metric dockyard-command-metric-${tone}${onClick ? " is-actionable" : ""}`,
    children: [
      jsxs("span", { className: "dockyard-command-metric-label", children: [jsx(Icon, { name: icon }), label] }),
      jsx("strong", { children: value }),
      jsx("small", { children: detail })
    ]
  }, label);
  const renderProjectRow = (project) => {
    const total = Number(project.items?.total ?? 0);
    const done = Number(project.items?.done ?? 0);
    const status = statusName[project.status] ?? readableLabel(project.status, "Unknown");
    return jsxs("div", {
      role: "row",
      className: "dockyard-command-row dockyard-command-project-row",
      "data-project-row": project.project_id,
      children: [
        jsx("span", { role: "cell", children: jsx("button", { type: "button", className: "dockyard-button small", onClick: () => onOpen?.(`s1:project/${project.project_id}`), children: project.project_id }) }),
        jsx("span", { role: "cell", children: project.owner || "Not assigned" }),
        jsx("span", { role: "cell", className: `dockyard-command-health ${project.status}`, children: status }),
        jsxs("span", { role: "cell", className: "dockyard-command-progress", children: [
          jsx("span", { children: total ? `${number(done)} / ${number(total)} work items` : "No work items" }),
          jsx("span", { className: "dockyard-command-progress-track", children: jsx("span", { style: { width: `${total ? Math.round(done / total * 100) : 0}%` } }) })
        ] }),
        jsx("span", { role: "cell", children: project.next_milestone ? `${project.next_milestone.name} \xB7 ${project.next_milestone.due || "No due date"}` : "Not scheduled" }),
        jsx("span", { role: "cell", children: project.items?.blocked || project.items?.overdue ? `${number(project.items.blocked || 0)} blocked \xB7 ${number(project.items.overdue || 0)} overdue` : "No open blockers" })
      ]
    }, project.project_id);
  };
  const empty = projects.length === 0;
  if (subview === "projects") {
    const match = directoryQuery.trim().toLowerCase();
    const filtered = projects.filter((project) => !match || [project.project_id, project.owner, project.status].some((field) => String(field || "").toLowerCase().includes(match)));
    return jsxs("div", { className: "dockyard-command dockyard-command-directory", "data-dashboard-subview": "projects", children: [
      jsx(Button, { small: true, onClick: () => setSubview("overview"), children: "\u2190 Back to Dashboard" }),
      jsxs("div", { className: "dockyard-command-head", children: [
        jsxs("div", { children: [
          jsx("span", { className: "dockyard-command-eyebrow", children: "FLEET DIRECTORY" }),
          jsx("h1", { children: "All projects" }),
          jsx("p", { children: `${number(projects.length)} ${plural(projects.length, "project")} under watch. Select one for its Overview.` })
        ] }),
        jsx("input", {
          type: "search",
          className: "dockyard-command-directory-search",
          value: directoryQuery,
          onChange: (event) => setDirectoryQuery(event.target.value),
          placeholder: "Filter by project, owner or status",
          "aria-label": "Filter projects"
        })
      ] }),
      jsxs("section", { className: "dockyard-command-section dockyard-command-directory-list", role: "table", "aria-label": "Project fleet", children: [
        jsx("div", { className: "dockyard-command-row dockyard-command-project-head", role: "row", children: ["Project", "Owner", "Health", "Progress", "Next milestone", "Delivery risk"].map((label) => jsx("span", { role: "columnheader", children: label }, label)) }),
        filtered.length ? filtered.map(renderProjectRow) : jsx("p", { className: "dockyard-command-empty", children: "No projects match this filter." })
      ] })
    ] });
  }
  if (subview === "issues") {
    const options = [
      ["all", "All issues"],
      ["decision", "Decisions"],
      ["blocked_item", "Blocked"],
      ["overdue_item", "Overdue"],
      ["evidence_stale", "Stale evidence"],
      ["project_attention", "Project state"]
    ];
    const filtered = rows.filter((item) => issueFilter === "all" || (issueFilter === "decision" ? item.kind === "initiative_approval" : item.cause === issueFilter));
    return jsxs("div", { className: "dockyard-command dockyard-command-directory", "data-dashboard-subview": "issues", children: [
      jsx(Button, { small: true, onClick: () => setSubview("overview"), children: "\u2190 Back to Dashboard" }),
      jsxs("div", { className: "dockyard-command-head", children: [
        jsxs("div", { children: [
          jsx("span", { className: "dockyard-command-eyebrow", children: "FLEET ATTENTION" }),
          jsx("h1", { children: "All issues" }),
          jsx("p", { children: `${number(rows.length)} ${plural(rows.length, "item")} need a decision or intervention across the fleet.` })
        ] }),
        jsx(Button, { onClick: onInbox, children: "Open Approval Inbox" })
      ] }),
      jsx("div", {
        className: "dockyard-command-issue-filters",
        role: "group",
        "aria-label": "Filter issues",
        children: options.map(([key, label]) => jsx("button", {
          type: "button",
          className: issueFilter === key ? "is-active" : "",
          "aria-pressed": issueFilter === key,
          onClick: () => setIssueFilter(key),
          children: `${label} (${number(key === "all" ? rows.length : rows.filter((item) => key === "decision" ? item.kind === "initiative_approval" : item.cause === key).length)})`
        }, key))
      }),
      jsxs("section", { className: "dockyard-command-section dockyard-command-directory-list", children: [
        jsx("div", { className: "dockyard-command-row dockyard-command-attention-head", children: ["Type", "Item", "Project", "Owner / risk", "Waiting"].map((label) => jsx("span", { children: label }, label)) }),
        filtered.length ? filtered.map((item, index) => jsxs("button", {
          type: "button",
          className: "dockyard-command-row dockyard-command-attention-row",
          onClick: () => item.deep_link ? onOpen?.(item.deep_link) : onInbox?.(),
          children: [
            jsx("span", {
              className: `dockyard-command-type ${item.kind === "initiative_approval" ? "approval" : "blocker"}`,
              children: item.kind === "initiative_approval" ? "Approval" : readableLabel(item.cause, "Issue")
            }),
            jsxs("span", { className: "dockyard-command-title", children: [
              jsx("strong", { children: item.title }),
              jsx("small", { children: item.ref || item.detail || "" })
            ] }),
            jsx("span", { children: item.project }),
            jsx("span", { children: item.owner || readableLabel(item.risk, "Not assigned") }),
            jsx("span", { children: typeof item.age_days === "number" ? `${number(item.age_days)}d` : "Not recorded" })
          ]
        }, `${item.kind}:${item.ref || index}`)) : jsx("p", { className: "dockyard-command-empty", children: "No issues match this filter." })
      ] })
    ] });
  }
  return jsxs("div", { className: "dockyard-command", children: [
    jsxs("div", { className: "dockyard-command-head", children: [
      jsxs("div", { children: [
        jsx("span", { className: "dockyard-command-eyebrow", children: "FLEET OVERVIEW" }),
        jsx("h1", { children: "Command Center" }),
        jsx("p", { children: "Stewardship at a glance. Evidence over assumptions." })
      ] }),
      jsxs("div", { className: "dockyard-command-head-actions", children: [
        jsx(Button, { action: "refresh", onClick: onRefresh, children: "Refresh" }),
        jsx(Button, { action: "open-bot-teams", onClick: () => onOpen?.("s5:teams"), children: "Bot teams" }),
        waiting > 0 ? jsx(Button, { variant: "primary", onClick: onInbox, children: `Review ${number(waiting)} ${plural(waiting, "decision")}` }) : null
      ] })
    ] }),
    empty ? jsx(EmptyState, { title: "No projects under watch", description: "Use New project above to connect your first project.", icon: "project" }) : jsxs(Fragment, { children: [
      jsxs("section", { className: "dockyard-command-metrics", "aria-label": "Fleet summary", children: [
        metric("PROJECTS", number(projects.length), `${number(projects.filter((p) => p.status === "at_risk").length)} at risk`, "folders", "info", () => setSubview("projects")),
        metric("NEEDS YOUR REVIEW", number(waiting), `${number(interventions.length)} other ${plural(interventions.length, "intervention")}`, "triangle-alert", "warning", () => setSubview("issues")),
        metric("ON TRACK", `${number(onTrack)} / ${number(projects.length)}`, "Project delivery status", "activity", onTrack ? "success" : "neutral", () => setSubview("projects")),
        metric("EVIDENCE FILES", evidenceFiles == null ? "Unavailable" : number(evidenceFiles), "Files attached to tracked projects", "file-text", "accent")
      ] }),
      jsxs("div", { className: "dockyard-command-health-summary", children: [
        jsx("span", { children: "FLEET HEALTH" }),
        jsx("div", {
          className: "dockyard-command-health-track",
          role: "img",
          "aria-label": `${number(onTrack)} on track, ${number(projects.filter((p) => p.status === "at_risk").length)} at risk, ${number(projects.filter((p) => p.status === "stalled").length)} stalled, ${number(projects.filter((p) => p.status === "idle").length)} idle, ${number(projects.filter((p) => !["on_track", "at_risk", "stalled", "idle"].includes(p.status)).length)} unverified`,
          children: ["on_track", "at_risk", "stalled", "idle", "unknown"].map((state) => {
            const count = projects.filter((p) => (["on_track", "at_risk", "stalled", "idle"].includes(p.status) ? p.status : "unknown") === state).length;
            return count ? jsx("span", { className: `dockyard-health-segment ${state}`, style: { width: `${count / projects.length * 100}%` } }, state) : null;
          })
        }),
        jsx("div", { className: "dockyard-command-health-legend", children: [
          ["on_track", "On track"],
          ["at_risk", "At risk"],
          ["stalled", "Stalled"],
          ["idle", "Idle"],
          ["unknown", "Unverified"]
        ].map(([state, label]) => jsxs("span", { children: [jsx("i", { className: `dockyard-health-dot ${state}`, "aria-hidden": true }), label] }, state)) })
      ] }),
      jsxs("div", { className: "dockyard-command-layout", children: [
        jsxs("div", { className: "dockyard-command-main", children: [
          jsxs("section", { className: "dockyard-command-section", children: [
            jsxs("div", { className: "dockyard-section-head", children: [
              jsxs("div", { children: [jsxs("h2", { children: [jsx(Icon, { name: "triangle-alert" }), "Needs you now"] }), jsx("p", { children: "Decisions and blocked work, ranked by waiting age." })] }),
              jsxs("div", { className: "dockyard-command-section-actions", children: [
                jsx(Button, { small: true, onClick: () => setSubview("issues"), children: "View all issues" }),
                jsx(Button, { small: true, onClick: onInbox, children: `View approvals (${number(waiting)})` })
              ] })
            ] }),
            jsxs("div", { className: "dockyard-command-table-wrap", children: [
              jsxs("div", { className: "dockyard-command-row dockyard-command-attention-head", role: "row", children: [
                jsx("span", { children: "Type" }),
                jsx("span", { children: "Item" }),
                jsx("span", { children: "Project" }),
                jsx("span", { children: "Impact" }),
                jsx("span", { children: "Waiting" })
              ] }),
              rows.length ? rows.map((item, index) => jsxs("button", {
                type: "button",
                className: `dockyard-command-row dockyard-command-attention-row${focusItem === item ? " is-selected" : ""}`,
                onClick: () => setSelected(item),
                "aria-label": `Inspect ${item.title}`,
                children: [
                  jsx("span", { className: `dockyard-command-type ${item.kind === "initiative_approval" ? "approval" : "blocker"}`, children: item.kind === "initiative_approval" ? "Approval" : "Blocked" }),
                  jsxs("span", { className: "dockyard-command-title", children: [jsx("strong", { children: item.title }), jsx("small", { children: item.ref || item.detail || "" })] }),
                  jsx("span", { children: item.project }),
                  jsx("span", { children: item.kind === "initiative_approval" ? `Risk: ${readableLabel(item.risk)}` : "Work blocked" }),
                  jsx("span", { children: typeof item.age_days === "number" ? `${number(item.age_days)}d` : "Not recorded" })
                ]
              }, `${item.kind}:${item.ref || index}`)) : jsx("p", { className: "dockyard-command-empty", children: "No decisions or blocked work need attention." })
            ] })
          ] }),
          jsxs("section", { className: "dockyard-command-section", children: [
            jsxs("div", { className: "dockyard-section-head", children: [
              jsxs("div", { children: [jsxs("h2", { children: [jsx(Icon, { name: "folder-kanban" }), "Project health"] }), jsx("p", { children: `Portfolio status across ${number(projects.length)} ${plural(projects.length, "project")}.` })] }),
              jsx(Button, { small: true, onClick: () => setSubview("projects"), children: "View all projects" })
            ] }),
            jsxs("div", { className: "dockyard-command-table-wrap", role: "table", "aria-label": "Project fleet", children: [
              jsxs("div", { className: "dockyard-command-row dockyard-command-project-head", role: "row", children: [
                ...["Project", "Owner", "Health", "Progress", "Next milestone", "Delivery risk"].map((label) => jsx("span", { role: "columnheader", children: label }, label))
              ] }),
              projects.map(renderProjectRow)
            ] })
          ] })
        ] }),
        jsxs("aside", { className: "dockyard-command-detail", "aria-label": "Selected item details", children: [
          jsxs("div", { className: "dockyard-command-detail-head", children: [jsx("h2", { children: focusItem?.kind === "initiative_approval" ? "Approval" : "Item details" }), focusItem ? jsx(Button, { small: true, onClick: () => setSelected(false), children: "Close" }) : null] }),
          focusItem ? jsxs(Fragment, { children: [
            jsx("h3", { children: focusItem.title }),
            jsx("p", { className: "dockyard-meta", children: `${focusItem.project} \xB7 ${focusItem.ref || ""} \xB7 ${number(focusItem.age_days ?? 0)} ${plural(focusItem.age_days ?? 0, "day")} waiting` }),
            detailError ? jsx("p", { role: "alert", children: detailError }) : null,
            focusItem.kind === "initiative_approval" && decision ? jsxs(Fragment, { children: [
              jsx("h4", { children: "Summary" }),
              jsx("p", { children: decision.reason || "No rationale supplied." }),
              jsx("h4", { children: "Expected outcome" }),
              jsx("p", { children: decision.expected_outcome || "Not supplied." }),
              jsx("h4", { children: "Decision context" }),
              jsxs("dl", { children: [
                jsx("dt", { children: "Risk" }),
                jsx("dd", { children: readableLabel(decision.risk) }),
                jsx("dt", { children: "Proposer" }),
                jsx("dd", { children: String(decision.proposer || "Stewardship") }),
                jsx("dt", { children: "Evidence contract" }),
                jsx("dd", { children: validationSummary(decision.validation?.contract) })
              ] })
            ] }) : null,
            jsx("h4", { children: "Recent activity" }),
            jsx("div", { className: "dockyard-command-detail-activity", children: (view.notifications?.notifications ?? []).filter((note) => note.project === focusItem.project).slice(0, 3).map((note) => jsx("p", { children: `${note.title} \xB7 ${formatWhen(note.created_at)}` }, note.id)) }),
            jsx(Button, { variant: "primary", onClick: () => focusItem.kind === "initiative_approval" ? onInbox?.() : onOpen?.(focusItem.deep_link), children: focusItem.kind === "initiative_approval" ? "Review approval" : "Open work item" })
          ] }) : jsx("p", { children: "Select an item to see its details." })
        ] })
      ] })
    ] })
  ] });
}
function InitiativeRevisionRow({ initiative, onResubmitted }) {
  const returned = initiative.status === "changes_requested";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [rationale, setRationale] = useState(initiative.rationale || "");
  useEffect(() => {
    if (!returned || !open) return void 0;
    let disposed = false;
    api(`/initiatives/${encodeURIComponent(initiative.ref)}/decision/receipts`).then((receipts) => {
      if (disposed) return;
      const rows = (receipts.receipts ?? []).filter((r) => r.decision === "changes_requested");
      setFeedback(rows);
    }).catch(() => {
    });
    return () => {
      disposed = true;
    };
  }, [returned, open, initiative.ref]);
  const resubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/initiatives/${encodeURIComponent(initiative.ref)}/resubmit`, {
        method: "POST",
        body: { rationale: rationale.trim() },
        suppressErrorToast: true
      });
      emitToast("success", "Resubmitted for approval");
      onResubmitted?.(initiative.ref);
    } catch (failure) {
      setError(`Resubmission was not recorded. ${String(failure?.message ?? failure)}`);
    } finally {
      setBusy(false);
    }
  };
  return jsxs("article", { "data-initiative-row": initiative.ref, "data-initiative-status": initiative.status, children: [
    jsxs("span", { children: [jsx("strong", { children: initiative.title }), jsx("small", { children: initiative.expected_outcome || initiative.rationale || initiative.ref })] }),
    returned ? jsx(Button, { small: true, onClick: () => setOpen((v) => !v), children: open ? "Hide revision" : "Revise & resubmit" }) : jsx(StatusTag, { tone: initiative.status === "pending_approval" ? "warning" : "info", label: String(initiative.status || "unknown").replaceAll("_", " ") }),
    returned && open ? jsxs("div", { className: "dockyard-initiative-revision", "data-resubmit-form": true, children: [
      feedback.length ? jsxs("div", {
        className: "dockyard-comment-thread",
        children: feedback.map((row) => jsxs("p", { children: [
          jsx("strong", { children: row.actor }),
          jsx("span", { children: ` \xB7 ${row.reason}` })
        ] }, row.id))
      }) : jsx("p", { className: "dockyard-meta", children: "Loading reviewer feedback\u2026" }),
      jsx("input", {
        value: rationale,
        onChange: (event) => setRationale(event.target.value),
        placeholder: "Revised rationale (address the feedback)",
        "aria-label": "Revised rationale"
      }),
      jsx(Button, { small: true, variant: "primary", onClick: resubmit, disabled: busy || !rationale.trim(), children: busy ? "Resubmitting\u2026" : "Resubmit" }),
      error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null
    ] }) : null
  ] });
}
function FirstAssessmentCard({ projectId }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await api(`/projects/${encodeURIComponent(projectId)}/first-assessment`, {
        method: "POST",
        body: {}
      });
      setResult(out);
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  return jsxs("section", { className: "dockyard-feature-card dockyard-first-assessment", "data-first-assessment": true, children: [
    jsxs("div", { className: "dockyard-section-head", children: [
      jsxs("div", { children: [
        jsx("h2", { children: "First read-only assessment" }),
        jsx("p", { children: "One manual cycle: verifies the repo, records health and objective evidence. Enables no schedules." })
      ] }),
      jsx(Button, {
        action: "run-first-assessment",
        variant: "primary",
        small: true,
        disabled: busy,
        onClick: run,
        children: busy ? "Assessing\u2026" : "Run first assessment"
      })
    ] }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
    result ? jsxs("dl", { className: "dockyard-onboarding-review", "data-assessment-result": true, children: [
      jsx("dt", { children: "Verification" }),
      jsx("dd", { children: result.assessment?.verification_ok ? "Passed" : "Not passed" }),
      jsx("dt", { children: "Health" }),
      jsx("dd", { children: result.assessment?.health_state ?? "unknown" }),
      jsx("dt", { children: "Objectives assessed" }),
      jsx("dd", { children: number((result.assessment?.objective_results ?? []).length) }),
      jsx("dt", { children: "Initiatives created" }),
      jsx("dd", { children: number(result.assessment?.initiatives_created ?? 0) }),
      jsx("dt", { children: "Schedules" }),
      jsx("dd", { children: result.schedules_enabled ? "enabled" : "disabled (onboarding never enables automation)" })
    ] }) : null
  ] });
}

// hermes_dockyard_plugin/dashboard/src/components/live-detail.ts
function buildActivityThread(items, opts = {}) {
  const max = opts.max ?? 8;
  const wrap = document.createElement("div");
  wrap.className = "dy-activity-thread";
  const list = items.slice(0, max);
  const rows = [];
  list.forEach((it) => {
    const row = document.createElement("div");
    row.className = "dy-activity-item";
    row.style.opacity = opts.decay ? "1" : "";
    if (it.ts) {
      const t = document.createElement("span");
      t.className = "dy-activity-time";
      const d = new Date(it.ts);
      t.textContent = isNaN(d.getTime()) ? String(it.ts) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      row.appendChild(t);
    }
    const body = document.createElement("span");
    body.textContent = it.text;
    row.appendChild(body);
    wrap.appendChild(row);
    rows.push(row);
  });
  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "dy-dim";
    empty.textContent = "No recent activity.";
    wrap.appendChild(empty);
  }
  if (opts.decay && rows.length) {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 8e3);
      let done = true;
      rows.forEach((row, i) => {
        const target = Math.max(0.3, 1 - i * 0.14);
        row.style.opacity = String(1 - (1 - target) * p);
        if (p < 1) done = false;
      });
      if (done) clearInterval(iv);
    }, 300);
  }
  return wrap;
}
function buildTaskListMini(tasks, onOpen) {
  const wrap = document.createElement("div");
  wrap.className = "dy-tasklist";
  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "dy-dim";
    empty.textContent = "No sub-tasks.";
    wrap.appendChild(empty);
    return wrap;
  }
  const ul = document.createElement("ul");
  for (const t of tasks) {
    const li = document.createElement("li");
    li.className = "dy-taskitem";
    const mark = document.createElement("span");
    mark.className = "dy-taskmark " + (t.status ?? "pending");
    mark.textContent = t.status === "done" ? "\u2713" : t.status === "working" ? "\u25D0" : t.status === "blocked" ? "\u2715" : "\u25CB";
    const label = document.createElement("span");
    label.className = "dy-tasklabel" + (t.status === "done" ? " dy-tasklabel-done" : "");
    label.textContent = t.title;
    li.append(mark, label);
    if (t.assignee) {
      const who = document.createElement("span");
      who.className = "dy-taskassignee";
      who.textContent = t.assignee;
      li.appendChild(who);
    }
    if (onOpen) {
      li.style.cursor = "pointer";
      li.addEventListener("click", () => onOpen(t.ref));
    }
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}

// hermes_dockyard_plugin/dashboard/src/workflow-canvas.ts
function validateConnection(nodes, from, to) {
  if (!from || !to) return "Both source and target are required";
  if (from === to) return "A node cannot depend on itself";
  const ids = new Set(nodes.map((n) => n.node_id));
  if (!ids.has(from) || !ids.has(to)) return "Unknown node";
  const deps = new Map(nodes.map((n) => [n.node_id, [...n.depends_on]]));
  const seen = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (id === to) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return (deps.get(id) ?? []).some(visit);
  };
  return visit(from) ? "Connection would create a cycle" : null;
}
var NODE_W = 208;
var NODE_H = 72;
var COL_GAP = 116;
var ROW_GAP = 30;
var PAD = 64;
var LANE_PAD = 30;
var LOD_FULL = 1.4;
var ZOOM_IN = 1.1;
var ZOOM_OUT = 0.9;
function statusToken(status) {
  return status === "done" || status === "working" || status === "blocked" ? status : "pending";
}
var STATUS_TOKENS = {
  done: "--dy-wf-status-done",
  working: "--dy-wf-status-working",
  blocked: "--dy-wf-status-blocked",
  pending: "--dy-wf-status-pending"
};
var PURPOSE_VISUALS = {
  task: { label: "Task" },
  gate: { label: "Human gate" },
  branch: { label: "Conditional branch" },
  loop: { label: "Bounded loop" }
};
function nodePurpose(n) {
  if (n.human_gate || n.kind === "gate") return "gate";
  if (n.loop) return "loop";
  if (n.when) return "branch";
  return "task";
}
function isAwaitingDecision(n) {
  return nodePurpose(n) === "gate" && statusToken(n.status) === "pending";
}
var CARD_RADIUS = 12;
var EDGE_MEANINGS = {
  depends_on: {
    meaning: "depends_on",
    color: "--dy-edge-dep",
    activeColor: "--dy-edge-dep-active",
    marker: "dyArrowDep",
    activeMarker: "dyArrowDepActive",
    label: "depends on",
    rendered: true
  },
  supports: {
    meaning: "supports",
    color: "--dy-edge-plan-supports",
    activeColor: "--dy-edge-plan-supports-active",
    marker: "dyArrowPlanSupports",
    activeMarker: "dyArrowPlanSupportsActive",
    label: "supports",
    rendered: false
  },
  contradicts: {
    meaning: "contradicts",
    color: "--dy-edge-plan-contradicts",
    activeColor: "--dy-edge-plan-contradicts-active",
    marker: "dyArrowPlanContradicts",
    activeMarker: "dyArrowPlanContradictsActive",
    label: "contradicts",
    rendered: false
  },
  derived_from: {
    meaning: "derived_from",
    color: "--dy-edge-plan-derived_from",
    activeColor: "--dy-edge-plan-derived_from-active",
    marker: "dyArrowPlanDerivedFrom",
    activeMarker: "dyArrowPlanDerivedFromActive",
    label: "derived from",
    rendered: false
  },
  clarifies: {
    meaning: "clarifies",
    color: "--dy-edge-plan-clarifies",
    activeColor: "--dy-edge-plan-clarifies-active",
    marker: "dyArrowPlanClarifies",
    activeMarker: "dyArrowPlanClarifiesActive",
    label: "clarifies",
    rendered: false
  },
  implements: {
    meaning: "implements",
    color: "--dy-edge-plan-implements",
    activeColor: "--dy-edge-plan-implements-active",
    marker: "dyArrowPlanImplements",
    activeMarker: "dyArrowPlanImplementsActive",
    label: "implements",
    rendered: false
  },
  raises_question: {
    meaning: "raises_question",
    color: "--dy-edge-plan-raises_question",
    activeColor: "--dy-edge-plan-raises_question-active",
    marker: "dyArrowPlanRaisesQuestion",
    activeMarker: "dyArrowPlanRaisesQuestionActive",
    label: "raises question",
    rendered: false
  }
};
var DEFAULT_EDGE_MEANING = "depends_on";
function elapsedLabel(updatedAt) {
  if (!updatedAt) return "unavailable";
  const base = Date.parse(updatedAt);
  if (!isFinite(base)) return "unavailable";
  const secs = Math.max(0, Math.floor((Date.now() - base) / 1e3));
  return String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
}
var prefersReducedMotion = () => {
  try {
    const m = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    return Boolean(m && m.matches);
  } catch {
    return false;
  }
};
function elu(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== void 0) el.textContent = text;
  return el;
}
function sEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}
function laneKeyOf(n) {
  return (n.team ?? n.phase_team ?? "").trim() || "unassigned";
}
function laneLabelOf(key) {
  if (key === "unassigned") return "Unassigned";
  if (key === "main-path") return "Main path";
  if (key === EXCEPTION_LANE_KEY) return "Exception path";
  return key;
}
var EXCEPTION_LANE_KEY = "exception-path";
function isExceptionNode(n) {
  const purpose = nodePurpose(n);
  return purpose === "branch" || purpose === "loop" || n.status === "blocked";
}
function buildLayout(nodes, opts) {
  const byId = new Map(nodes.map((n) => [n.node_id, n]));
  const depthCache = /* @__PURE__ */ new Map();
  const computeDepth = (id) => {
    if (depthCache.has(id)) return depthCache.get(id);
    const n = byId.get(id);
    if (!n) return 0;
    let d = 0;
    for (const dep of n.depends_on) d = Math.max(d, computeDepth(dep) + 1);
    depthCache.set(id, d);
    return d;
  };
  nodes.forEach((n) => computeDepth(n.node_id));
  const perDepth = {};
  const positions = {};
  if (opts?.mobile) {
    nodes.forEach((n, index) => {
      positions[n.node_id] = { x: PAD, y: PAD + index * (NODE_H + ROW_GAP + 24), depth: index };
    });
    return { positions, lanes: [], width: PAD * 2 + NODE_W, height: PAD * 2 + nodes.length * (NODE_H + ROW_GAP + 24) };
  }
  nodes.forEach((n) => {
    const d = depthCache.get(n.node_id) ?? 0;
    const row = perDepth[d] ?? 0;
    perDepth[d] = row + 1;
    positions[n.node_id] = {
      x: PAD + d * (NODE_W + COL_GAP),
      y: PAD + row * (NODE_H + ROW_GAP),
      depth: d
    };
  });
  const maxDepth = Math.max(0, ...nodes.map((n) => depthCache.get(n.node_id) ?? 0));
  const rows = Math.max(1, ...Object.values(perDepth));
  const grid = {
    positions,
    lanes: [],
    width: PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP,
    height: PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP
  };
  const laneOf = opts?.laneOf;
  if (!laneOf) return grid;
  const order = [];
  const members = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    const key = laneOf(n);
    if (!members.has(key)) {
      members.set(key, []);
      order.push(key);
    }
    members.get(key).push(n);
  }
  const laneH = LANE_PAD * 2 + NODE_H;
  const positionsLane = {};
  const lanes = [];
  let widest = 0;
  order.forEach((key, li) => {
    const band = members.get(key);
    const sorted = [...band].sort((a, b) => {
      const da = depthCache.get(a.node_id) ?? 0;
      const db = depthCache.get(b.node_id) ?? 0;
      return da - db || nodes.indexOf(a) - nodes.indexOf(b);
    });
    const y = PAD + li * laneH;
    sorted.forEach((n, i) => {
      positionsLane[n.node_id] = { x: PAD + i * (NODE_W + COL_GAP), y: y + LANE_PAD, depth: i };
    });
    widest = Math.max(widest, sorted.length);
    lanes.push({
      key,
      label: laneLabelOf(key),
      y,
      height: laneH,
      exception: band.some((n) => {
        const purpose = nodePurpose(n);
        return purpose === "branch" || purpose === "loop" || n.status === "blocked";
      })
    });
  });
  return {
    positions: positionsLane,
    lanes,
    width: PAD * 2 + Math.max(1, widest) * (NODE_W + COL_GAP) - COL_GAP,
    height: PAD * 2 + Math.max(1, lanes.length) * laneH - (LANE_PAD - PAD > 0 ? 0 : 0) - PAD + PAD
  };
}
function mountWorkflowCanvas(host2, projectId, runName, fetchRuns, handlers, pollMs = 8e3) {
  host2.replaceChildren();
  host2.className = "dy-wf dy-wf-scope";
  const canvasWindow = host2.ownerDocument?.defaultView ?? globalThis.window;
  const wrap = elu("div", "dy-wf-wrap");
  const svg = sEl("svg", { class: "dy-wf-svg" });
  svg.setAttribute("data-lod", "read");
  const viewport = sEl("g", { class: "dy-wf-viewport" });
  svg.appendChild(viewport);
  const minimap = sEl("svg", { class: "dy-wf-minimap dy-wf-glass", width: 170, height: 104 });
  minimap.setAttribute("aria-label", "Canvas overview: click to move the view");
  const miniViewport = sEl("rect", { class: "dy-wf-mini-view" });
  minimap.appendChild(miniViewport);
  const passport = elu("div", "dy-wf-passport dy-wf-glass");
  passport.setAttribute("aria-live", "polite");
  const zoomBar = elu("div", "dy-wf-zoombar dy-wf-glass");
  zoomBar.setAttribute("role", "group");
  zoomBar.setAttribute("aria-label", "Zoom controls");
  const zoomButton = (action, label, title) => {
    const b = elu("button", "dy-wf-zoombtn", label);
    b.dataset.wfAction = action;
    b.type = "button";
    b.setAttribute("aria-label", title);
    return b;
  };
  const zoomInBtn = zoomButton("zoom-in", "+", "Zoom in");
  const zoomOutBtn = zoomButton("zoom-out", "\u2212", "Zoom out");
  const zoomFitBtn = zoomButton("zoom-fit", "Fit", "Fit graph to view");
  const zoomResetBtn = zoomButton("zoom-reset", "Reset", "Reset zoom to 100%");
  zoomBar.append(zoomInBtn, zoomOutBtn, zoomFitBtn, zoomResetBtn);
  const feed = elu("div", "dy-wf-feed dy-wf-glass");
  feed.setAttribute("aria-live", "polite");
  const feedHead = elu("button", "dy-wf-feed-head", "\u25BE Activity");
  const feedBody = elu("div", "dy-wf-feed-body");
  feedHead.addEventListener("click", () => {
    const open = feedHead.getAttribute("aria-expanded") === "true";
    feedHead.setAttribute("aria-expanded", String(!open));
    feedHead.textContent = open ? "\u25B8 Activity" : "\u25BE Activity";
    feedBody.style.display = open ? "none" : "block";
  });
  feedHead.setAttribute("aria-expanded", "true");
  feed.append(feedHead, feedBody);
  const feedMsgs = [];
  const feedLog = (text) => {
    const item = elu("div", "dy-wf-feed-item");
    const t = elu("span", "dy-wf-feed-time");
    t.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const b = elu("span", "", " " + text);
    item.append(t, b);
    feedBody.prepend(item);
    feedMsgs.unshift({ ts: Date.now(), text, el: item });
    while (feedMsgs.length > 6) {
      const old = feedMsgs.pop();
      if (old) old.el.remove();
    }
    feedMsgs.forEach((m, i) => {
      m.el.style.opacity = String(Math.max(0.25, 1 - i * 0.15));
    });
  };
  const listView = elu("div", "dy-wf-list dy-wf-glass");
  listView.dataset.wfList = "";
  const listHead = elu("button", "dy-wf-zoombtn dy-wf-list-head", "\u25B8 List view");
  listHead.type = "button";
  listHead.setAttribute("aria-expanded", "false");
  const listBody = elu("div", "dy-wf-list-body");
  listBody.setAttribute("role", "table");
  listBody.setAttribute("aria-label", "Workflow run as list");
  listBody.style.display = "none";
  listView.hidden = true;
  listHead.addEventListener("click", () => {
    const open = listHead.getAttribute("aria-expanded") === "true";
    listHead.setAttribute("aria-expanded", String(!open));
    listHead.textContent = open ? "\u25B8 List view" : "\u25BE List view";
    listBody.style.display = open ? "none" : "block";
    listView.hidden = open;
  });
  zoomBar.appendChild(listHead);
  listView.append(listBody);
  let playbackBar = null;
  let playbackSlider = null;
  let playbackLabel = null;
  let playbackButton = null;
  playbackBar = elu("div", "dy-wf-playback dy-wf-glass");
  playbackBar.setAttribute("role", "group");
  playbackBar.setAttribute("aria-label", "Workflow playback");
  playbackButton = elu("button", "dy-wf-playback-btn", "\u25B6 Play");
  playbackButton.type = "button";
  playbackButton.disabled = true;
  playbackSlider = elu("input", "dy-wf-playback-slider");
  playbackSlider.type = "range";
  playbackSlider.min = "0";
  playbackSlider.value = "0";
  playbackSlider.step = "1";
  playbackSlider.disabled = true;
  playbackSlider.setAttribute("aria-label", "Workflow playback");
  playbackLabel = elu("span", "dy-wf-playback-label", "Live");
  const motionButton = elu("button", "dy-wf-motion-btn", "Motion on");
  motionButton.type = "button";
  motionButton.setAttribute("aria-label", "Toggle workflow canvas motion");
  motionButton.setAttribute("aria-pressed", "true");
  motionButton.addEventListener("click", () => {
    const on = motionButton.getAttribute("aria-pressed") === "true";
    motionButton.setAttribute("aria-pressed", String(!on));
    motionButton.textContent = on ? "Motion off" : "Motion on";
    host2.classList.toggle("dy-wf-still", on);
  });
  playbackBar.append(playbackButton, playbackSlider, playbackLabel, motionButton);
  wrap.append(svg, feed, minimap, passport, zoomBar, listView, playbackBar);
  playbackBar.style.overflowX = "auto";
  host2.appendChild(wrap);
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  let fullW = 0;
  let fullH = 0;
  let originX = 0;
  let originY = 0;
  let currentNodes = [];
  let nodePositions = {};
  let previousMobileLayout = null;
  let dragNode = null;
  let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
  let connectFrom = null;
  let disposers = [];
  let dragSession = null;
  const matrixNumbers = (transform) => (transform ?? "").match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g)?.map(Number) ?? [];
  const readNodeTransform = (g) => {
    const nums = matrixNumbers(g.getAttribute("transform"));
    if (nums.length < 2 || !isFinite(nums[0]) || !isFinite(nums[1])) return null;
    return { x: nums[0], y: nums[1] };
  };
  const worldPoint = (clientX, clientY) => {
    let ox = 0;
    let oy = 0;
    try {
      const ctm = svg.getScreenCTM();
      if (ctm && isFinite(ctm.a) && isFinite(ctm.e) && isFinite(ctm.f)) {
        ox = ctm.e;
        oy = ctm.f;
      }
    } catch {
      ox = 0;
      oy = 0;
    }
    return { x: (clientX - ox - panX) / zoom, y: (clientY - oy - panY) / zoom };
  };
  const writeNodePosition = (nodeId, g, x, y) => {
    nodePositions[nodeId] = { x, y, depth: nodePositions[nodeId]?.depth ?? 0 };
    g.setAttribute("transform", `translate(${x} ${y})`);
  };
  const startDrag = (nodeId, g, e, depth) => {
    if (connectFrom) return;
    const current = nodePositions[nodeId] ?? { x: 0, y: 0, depth };
    const world = worldPoint(e.clientX, e.clientY);
    dragNode = nodeId;
    dragSession = {
      nodeId,
      pointerId: e.pointerId,
      offsetX: world.x - current.x,
      offsetY: world.y - current.y,
      moved: false
    };
    dragStart = { x: e.clientX, y: e.clientY, ox: current.x, oy: current.y };
    try {
      g.setPointerCapture(e.pointerId);
    } catch {
    }
  };
  const dragMove = (e) => {
    const session = dragSession;
    if (!session || e.pointerId !== session.pointerId) return;
    const g = viewport.querySelector(`[data-node-id="${session.nodeId}"]`);
    if (!g) return;
    const movedBy = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    if (movedBy > 3) session.moved = true;
    if (!session.moved) return;
    const world = worldPoint(e.clientX, e.clientY);
    writeNodePosition(session.nodeId, g, world.x - session.offsetX, world.y - session.offsetY);
  };
  const commitNodePosition = async (nodeId) => {
    const committed = nodePositions[nodeId];
    if (!committed) return;
    const nextNodes = currentNodes.map((item) => item.node_id === nodeId ? { ...item, canvas_position: { x: committed.x, y: committed.y } } : item);
    currentNodes = nextNodes;
    await handlers.onEdit?.(nextNodes);
  };
  const endDragSession = (e, commit) => {
    const session = dragSession;
    if (!session) return;
    const g = viewport.querySelector(`[data-node-id="${session.nodeId}"]`);
    if (g) {
      try {
        g.releasePointerCapture(session.pointerId);
      } catch {
      }
    }
    dragSession = null;
    dragNode = null;
    dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
    if (commit && session.moved) void commitNodePosition(session.nodeId);
  };
  const startConnect = (nodeId, g) => {
    if (connectFrom && connectFrom !== nodeId) {
      const previous = viewport.querySelector(`[data-node-id="${connectFrom}"]`);
      previous?.classList.remove("dy-wf-connecting");
    }
    if (dragNode) endDragSession({ pointerId: -1 }, false);
    connectFrom = nodeId;
    g.classList.add("dy-wf-connecting");
  };
  const cancelConnect = () => {
    if (connectFrom) {
      const g = viewport.querySelector(`[data-node-id="${connectFrom}"]`);
      g?.classList.remove("dy-wf-connecting");
    }
    connectFrom = null;
  };
  const endConnectGesture = (to) => {
    const from = connectFrom;
    if (!from) return;
    connectFrom = null;
    for (const g of viewport.querySelectorAll(".dy-wf-node.dy-wf-connecting")) {
      g.classList.remove("dy-wf-connecting");
    }
    if (!to) return;
    const error = validateConnection(currentNodes, from, to);
    if (error) {
      feedLog(error);
      return;
    }
    const nextNodes = currentNodes.map((item) => item.node_id === to ? { ...item, depends_on: [.../* @__PURE__ */ new Set([...item.depends_on, from])] } : item);
    currentNodes = nextNodes;
    void handlers.onEdit?.(nextNodes);
  };
  const apply = () => {
    viewport.setAttribute("transform", `translate(${panX} ${panY}) scale(${zoom})`);
    viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    svg.setAttribute("data-lod", zoom > LOD_FULL ? "full" : zoom < 0.75 ? "map" : "read");
  };
  const ZOOM_STEP = 1.25;
  const ZOOM_MIN = 0.45;
  const ZOOM_MAX = 2.4;
  const setZoom = (next) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
    apply();
  };
  zoomInBtn.addEventListener("click", () => setZoom(zoom * ZOOM_STEP));
  zoomOutBtn.addEventListener("click", () => setZoom(zoom / ZOOM_STEP));
  zoomResetBtn.addEventListener("click", () => {
    zoom = 1;
    panX = 0;
    panY = 0;
    apply();
  });
  zoomFitBtn.addEventListener("click", () => {
    if (!fullW || !fullH) return;
    const sw = svg.clientWidth || 1300;
    const sh = svg.clientHeight || 760;
    const s = Math.min(sw / fullW, sh / fullH, 2.4);
    zoom = Math.max(ZOOM_MIN, s);
    panX = (sw - fullW * zoom) / 2;
    panY = (sh - fullH * zoom) / 2;
    apply();
  });
  const defs = sEl("defs", {});
  const mkMarker = (id, fillToken, fallback) => {
    const m = sEl("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      // Larger than the 1.5px stroke and in userSpaceOnUse so the head keeps a
      // constant, legible size instead of thinning with the stroke width.
      markerWidth: "6",
      markerHeight: "6",
      markerUnits: "userSpaceOnUse",
      orient: "auto-start-reverse"
    });
    const head = sEl("path", {
      d: "M 0 0 L 10 5 L 0 10 z",
      class: "dy-wf-arrow",
      fill: `var(${fillToken}, ${fallback})`
    });
    m.appendChild(head);
    return m;
  };
  for (const meaning of Object.values(EDGE_MEANINGS)) {
    if (!meaning.rendered) continue;
    defs.appendChild(mkMarker(meaning.marker, meaning.color, "#8fa3c8"));
    defs.appendChild(mkMarker(meaning.activeMarker, meaning.activeColor, "#9cc4ff"));
  }
  const sheenGrad = sEl("linearGradient", { id: "dyWfCardSheen", x1: "0", y1: "0", x2: "0", y2: "1" });
  sheenGrad.append(
    sEl("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.09" }),
    sEl("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0" })
  );
  defs.appendChild(sheenGrad);
  svg.appendChild(defs);
  const timelineFor = (run) => run?.timeline ?? [];
  const clearRoute = () => {
    viewport.querySelectorAll(".dy-wf-route-dim, .dy-wf-route-edge").forEach((el) => el.classList.remove("dy-wf-route-dim", "dy-wf-route-edge"));
  };
  const renderPlaybackState = (run, index) => {
    if (!run || index === null || !run.timeline?.length) return;
    const state = /* @__PURE__ */ new Map();
    for (const event of run.timeline.slice(0, index + 1)) state.set(event.node_id, event.to_status);
    viewport.querySelectorAll("[data-node-id]").forEach((g) => {
      const id = g.getAttribute("data-node-id") ?? "";
      const status = state.get(id);
      if (status) g.dataset.wfPlaybackStatus = status;
      g.classList.toggle("dy-wf-playback-active", state.has(id));
    });
    if (playbackLabel) playbackLabel.textContent = `Event ${index + 1}/${run.timeline.length}`;
  };
  const setPlayback = (run, index) => {
    const timeline = timelineFor(run);
    playbackIndex = index;
    const enabled = timeline.length > 1;
    if (playbackSlider) {
      playbackSlider.disabled = !enabled;
      playbackSlider.max = String(Math.max(0, timeline.length - 1));
      playbackSlider.value = String(Math.max(0, index ?? timeline.length - 1));
    }
    if (playbackButton) playbackButton.disabled = !enabled;
    render(run);
    if (index !== null) renderPlaybackState(run, index);
  };
  playbackSlider?.addEventListener("input", () => {
    if (lastRun) setPlayback(lastRun, Number(playbackSlider?.value ?? 0));
  });
  playbackButton?.addEventListener("click", () => {
    if (!lastRun?.timeline?.length) return;
    const next = playbackIndex === null ? 0 : playbackIndex + 1;
    if (next >= lastRun.timeline.length) {
      setPlayback(lastRun, null);
      if (playbackButton) playbackButton.textContent = "\u25B6 Play";
      return;
    }
    if (playbackButton) playbackButton.textContent = "\u23F8 Pause";
    setPlayback(lastRun, next);
  });
  let lastRun = null;
  const renderList = (run) => {
    listBody.replaceChildren();
    if (!run || run.nodes.length === 0) {
      listBody.appendChild(elu("p", "dy-dim", "No workflow runs yet."));
      return;
    }
    const titleOf = new Map(run.nodes.map((n) => [n.node_id, n.title]));
    for (const n of run.nodes) {
      const row = elu("div", "dy-wf-list-row");
      row.dataset.wfListRow = n.node_id;
      row.setAttribute("role", "row");
      const name = elu("span", "dy-wf-list-title", n.title);
      const kindText = nodePurpose(n);
      const kind = elu(
        "span",
        `dy-wf-list-kind ${kindText}`,
        PURPOSE_VISUALS[kindText].label
      );
      const deps = elu(
        "span",
        "dy-wf-list-deps",
        n.depends_on.length ? `depends on: ${n.depends_on.map((d) => titleOf.get(d) ?? d).join(", ")}` : "no dependencies"
      );
      const status = elu(
        `span`,
        `dy-wf-list-status ${n.status ?? "pending"}`,
        n.status ?? "pending"
      );
      const open = () => openPassport(n, null);
      const activate = elu("button", "dy-wf-list-open", "Open");
      activate.type = "button";
      activate.setAttribute("aria-label", `Open ${n.title} details`);
      activate.addEventListener("click", open);
      row.append(name, kind, deps, status, activate);
      listBody.appendChild(row);
    }
  };
  const buildNode = (n, p, run, editable) => {
    const purpose = nodePurpose(n);
    const status = statusToken(n.status);
    const visuals = PURPOSE_VISUALS[purpose];
    const awaiting = isAwaitingDecision(n);
    const g = sEl("g", {
      class: `dy-wf-node ${purpose} ${status}${awaiting ? " awaiting" : ""}`,
      transform: `translate(${p.x} ${p.y})`
    });
    g.dataset.wfPurpose = purpose;
    g.dataset.wfStatus = status;
    if (awaiting) g.dataset.wfAwaiting = "true";
    if (playbackIndex !== null) g.dataset.wfPlaybackStatus = n.status ?? "pending";
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("data-node-id", n.node_id);
    g.setAttribute("aria-label", `${visuals.label}: ${n.title} (${n.status ?? "pending"})`);
    g.dataset.wfEditable = String(editable);
    g.setAttribute("aria-describedby", `wf-help-${n.node_id}`);
    const shape = sEl("rect", {
      width: NODE_W,
      height: NODE_H,
      rx: CARD_RADIUS,
      class: "dy-wf-shape dy-wf-card"
    });
    shape.setAttribute("fill", "#101c30");
    const sheen = sEl("rect", {
      x: 1,
      y: 1,
      width: NODE_W - 2,
      height: NODE_H / 2,
      rx: CARD_RADIUS - 1,
      class: "dy-wf-card-sheen"
    });
    const dot = sEl("circle", { cx: 18, cy: 22, r: 4.5, class: `dy-wf-statusdot ${status}` });
    const label = sEl("text", { x: 30, y: 26, class: "dy-wf-label" });
    label.textContent = n.title.length > 22 ? n.title.slice(0, 21) + "\u2026" : n.title;
    const sub = sEl("text", { x: 14, y: 46, class: "dy-wf-sub" });
    sub.textContent = visuals.label;
    const statusText = sEl("text", {
      x: NODE_W - 14,
      y: 46,
      "text-anchor": "end",
      class: `dy-wf-statustext ${status}`
    });
    statusText.textContent = awaiting ? "awaiting decision" : n.status ?? "pending";
    g.append(shape, sheen, dot, label, sub, statusText);
    if (n.status === "working") {
      const timer2 = sEl("text", {
        x: 14,
        y: 62,
        class: "dy-wf-timer full"
      });
      timer2.textContent = `Workflow: ${elapsedLabel(run.started_at)}`;
      timer2.dataset.for = n.node_id;
      g.appendChild(timer2);
    }
    if (n.assignee) {
      const who = sEl("text", {
        x: NODE_W - 14,
        y: 62,
        "text-anchor": "end",
        class: "dy-wf-assignee"
      });
      who.textContent = n.assignee;
      g.appendChild(who);
    }
    const port = sEl("circle", { cx: NODE_W, cy: NODE_H / 2, r: 7, class: "dy-wf-port" });
    const portHit = sEl("circle", { cx: NODE_W, cy: NODE_H / 2, r: 12, class: "dy-wf-port-hit" });
    portHit.setAttribute("aria-hidden", "true");
    port.setAttribute("data-connect-from", n.node_id);
    port.setAttribute("tabindex", "0");
    port.setAttribute("aria-label", `Connect from ${n.title}`);
    g.append(portHit, port);
    const dash = () => shape.setAttribute("stroke-dasharray", "4 3");
    const undash = () => shape.removeAttribute("stroke-dasharray");
    for (const target of [port, portHit]) {
      target.addEventListener("pointerdown", (ev) => {
        const e = ev;
        if (e.button !== 0 || !editable) return;
        e.stopPropagation();
        startConnect(n.node_id, g);
      });
    }
    g.addEventListener("pointerdown", (ev) => {
      const e = ev;
      if (e.button !== 0 || !editable) return;
      e.stopPropagation();
      if (e.shiftKey) {
        startConnect(n.node_id, g);
        return;
      }
      startDrag(n.node_id, g, e, p.depth ?? 0);
    });
    g.addEventListener("pointermove", (ev) => dragMove(ev));
    g.addEventListener("pointerup", (ev) => {
      const e = ev;
      if (dragSession && dragSession.nodeId === n.node_id) {
        e.stopPropagation();
        endDragSession(e, true);
        return;
      }
      if (connectFrom) {
        e.stopPropagation();
        endConnectGesture(n.node_id);
      }
    });
    g.addEventListener("pointercancel", (ev) => {
      const e = ev;
      if (dragSession && dragSession.nodeId === n.node_id) {
        e.stopPropagation();
        endDragSession(e, false);
      }
    });
    g.addEventListener("keydown", (ev) => {
      const e = ev;
      if (!editable) return;
      if (e.key === " " || e.key === "c") {
        e.preventDefault();
        if (connectFrom === n.node_id) cancelConnect();
        else startConnect(n.node_id, g);
      } else if (e.key === "Enter" && connectFrom && connectFrom !== n.node_id) {
        e.preventDefault();
        endConnectGesture(n.node_id);
      }
    });
    g.addEventListener("pointerenter", dash);
    g.addEventListener("pointerleave", () => {
      if (!g.classList.contains("dy-wf-selected")) undash();
    });
    const open = () => openPassport(n, g);
    g.addEventListener("click", open);
    g.addEventListener("keydown", (e) => {
      const ev = e;
      if (ev.key === "Enter") {
        open();
        return;
      }
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown" || ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
        ev.preventDefault();
        const all = [...viewport.querySelectorAll(".dy-wf-node")];
        const idx = all.indexOf(g);
        if (idx === -1) return;
        const step = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1;
        const next = all[(idx + step + all.length) % all.length];
        if (next) next.focus();
      }
    });
    return g;
  };
  const render = (run) => {
    lastRun = run;
    const timeline = timelineFor(run);
    if (playbackSlider) {
      playbackSlider.disabled = timeline.length < 2;
      playbackSlider.max = String(Math.max(0, timeline.length - 1));
      playbackSlider.value = String(Math.max(0, playbackIndex ?? timeline.length - 1));
    }
    if (playbackButton) {
      playbackButton.disabled = timeline.length < 2;
      playbackButton.textContent = playbackIndex === null ? "\u25B6 Play" : "\u23F8 Pause";
    }
    if (playbackLabel) playbackLabel.textContent = playbackIndex === null ? timeline.length ? `Live \xB7 ${timeline.length} events` : "Live" : `Event ${playbackIndex + 1}/${timeline.length}`;
    renderList(run);
    viewport.replaceChildren();
    viewport.appendChild(defs);
    if (!run || run.nodes.length === 0) {
      const t = sEl("text", { x: 20, y: 40, class: "dy-wf-empty" });
      t.textContent = "No workflow runs yet.";
      viewport.appendChild(t);
      updateMinimap();
      return;
    }
    currentNodes = run.nodes;
    if (timeline.length > 1 && playbackIndex !== null) {
      const states = /* @__PURE__ */ new Map();
      for (const event of timeline.slice(0, playbackIndex + 1)) states.set(event.node_id, event.to_status);
      currentNodes = currentNodes.map((node) => states.has(node.node_id) ? { ...node, status: states.get(node.node_id) ?? node.status } : { ...node, status: "pending" });
    }
    const assignments = currentNodes.some((n) => (n.team ?? n.phase_team ?? "").trim());
    const laneOf = assignments ? laneKeyOf : (n) => isExceptionNode(n) ? EXCEPTION_LANE_KEY : "main-path";
    const mobileLayout = canvasWindow.innerWidth <= 640;
    svg.dataset.mobileLayout = String(mobileLayout);
    if (previousMobileLayout !== null && previousMobileLayout !== mobileLayout) nodePositions = {};
    previousMobileLayout = mobileLayout;
    let layout = buildLayout(run.nodes, { laneOf, mobile: mobileLayout });
    if (!mobileLayout && layout.lanes.length < 2) layout = buildLayout(run.nodes);
    const positions = nodePositions = Object.keys(nodePositions).length ? { ...layout.positions, ...nodePositions } : run.nodes.reduce((acc, item) => {
      if (item.canvas_position) acc[item.node_id] = { ...layout.positions[item.node_id], ...item.canvas_position };
      return acc;
    }, { ...layout.positions });
    let worldW = layout.width;
    let worldH = layout.height;
    let minX = 0;
    let minY = 0;
    for (const p of Object.values(positions)) {
      worldW = Math.max(worldW, p.x + NODE_W + PAD);
      worldH = Math.max(worldH, p.y + NODE_H + PAD);
      minX = Math.min(minX, p.x - PAD);
      minY = Math.min(minY, p.y - PAD);
    }
    worldW -= minX;
    worldH -= minY;
    fullW = worldW;
    fullH = worldH;
    originX = minX;
    originY = minY;
    svg.setAttribute("viewBox", `${minX} ${minY} ${worldW} ${worldH}`);
    for (const lane of layout.lanes) {
      const band = sEl("rect", {
        x: minX,
        y: lane.y,
        width: worldW,
        height: lane.height,
        class: lane.exception ? "dy-wf-lane exception" : "dy-wf-lane"
      });
      band.setAttribute("data-lane", lane.key);
      const lbl = sEl("text", { x: minX + 14, y: lane.y + 16, class: "dy-wf-lane-label" });
      lbl.textContent = lane.label;
      viewport.append(band, lbl);
    }
    const depMeaning = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
    for (const n of currentNodes) {
      const from = positions[n.node_id];
      for (const dep of n.depends_on) {
        const to = positions[dep];
        if (!from || !to) continue;
        const path = sEl("path", {
          class: "dy-wf-edge",
          "data-meaning": depMeaning.meaning,
          // Curved connector. Same-band edges bow gently so the curve is
          // visible; cross-band edges take a wider S-curve between the two
          // lane anchors, so a dependency that crosses lanes reads as one
          // flow instead of a ruler line.
          d: (() => {
            if (mobileLayout) {
              const x12 = to.x + NODE_W / 2, y12 = to.y + NODE_H;
              const x22 = from.x + NODE_W / 2, y22 = from.y;
              const dy = Math.max(ROW_GAP / 2, Math.abs(y22 - y12) * 0.45);
              return `M ${x12} ${y12} C ${x12} ${y12 + dy}, ${x22} ${y22 - dy}, ${x22} ${y22}`;
            }
            const x1 = to.x + NODE_W, y1 = to.y + NODE_H / 2;
            const x2 = from.x, y2 = from.y + NODE_H / 2;
            const sameBand = Math.abs(y1 - y2) < NODE_H / 2;
            const dx = Math.max(COL_GAP / 2, Math.abs(x2 - x1) * 0.55);
            if (sameBand) {
              const bow = Math.min(46, Math.max(18, dx * 0.35));
              return `M ${x1} ${y1} C ${x1 + dx} ${y1 - bow}, ${x2 - dx} ${y2 - bow}, ${x2} ${y2}`;
            }
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          })(),
          // Terminate at the dependent node's left boundary. The arrowhead
          // is part of the connector, so the line remains visibly attached.
          "marker-end": `url(#${depMeaning.marker})`
        });
        path.dataset.from = dep;
        path.dataset.to = n.node_id;
        path.dataset.sourcePort = mobileLayout ? "bottom" : "right";
        path.dataset.targetPort = mobileLayout ? "top" : "left";
        viewport.appendChild(path);
        const dot = sEl("circle", { class: "dy-wf-flowdot", r: 3.2, opacity: 0 });
        viewport.appendChild(dot);
      }
    }
    for (const n of currentNodes) {
      const p = positions[n.node_id];
      viewport.appendChild(buildNode(n, p, run, Boolean(handlers.onEdit)));
    }
    apply();
    updateMinimap();
  };
  const updateMinimap = () => {
    minimap.replaceChildren(miniViewport);
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    const vx = (0 - panX) / zoom;
    const vy = (0 - panY) / zoom;
    const vw = (svg.clientWidth || 1300) / zoom;
    const vh = (svg.clientHeight || 760) / zoom;
    miniViewport.setAttribute("x", String(vx * s));
    miniViewport.setAttribute("y", String(vy * s));
    miniViewport.setAttribute("width", String(Math.max(10, vw * s)));
    miniViewport.setAttribute("height", String(Math.max(7, vh * s)));
    for (const n of currentNodes) {
      const p = nodePositions[n.node_id];
      if (!p) continue;
      const dot = sEl("rect", {
        x: (p.x - originX) * s,
        y: (p.y - originY) * s,
        width: Math.max(3, NODE_W * s),
        height: Math.max(2, NODE_H * s),
        fill: `var(${STATUS_TOKENS[statusToken(n.status)]}, #6e7681)`,
        opacity: 0.8
      });
      minimap.appendChild(dot);
    }
  };
  minimap.addEventListener("click", (e) => {
    const ev = e;
    const r = minimap.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / 170;
    const fy = (ev.clientY - r.top) / 104;
    if (fullW <= 0) return;
    const s = Math.min(170 / fullW, 104 / fullH);
    panX = 650 - fx * 170 / s * zoom;
    panY = 380 - fy * 104 / s * zoom;
    apply();
    updateMinimap();
  });
  let lastFrames = [];
  let selectedEl = null;
  let playbackIndex = null;
  const openPassport = (n, g) => {
    if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
    selectedEl = g ?? null;
    if (selectedEl) selectedEl.classList.add("dy-wf-selected");
    const selectedId = n.node_id;
    const related = /* @__PURE__ */ new Set([selectedId]);
    const byId = new Map(currentNodes.map((node) => [node.node_id, node]));
    const walkUp = (id) => {
      for (const dep of byId.get(id)?.depends_on ?? []) if (!related.has(dep)) {
        related.add(dep);
        walkUp(dep);
      }
    };
    const walkDown = (id) => {
      for (const node of currentNodes) if (node.depends_on.includes(id) && !related.has(node.node_id)) {
        related.add(node.node_id);
        walkDown(node.node_id);
      }
    };
    walkUp(selectedId);
    walkDown(selectedId);
    viewport.querySelectorAll(".dy-wf-node").forEach((node) => node.classList.toggle("dy-wf-route-dim", !related.has(node.getAttribute("data-node-id") ?? "")));
    viewport.querySelectorAll(".dy-wf-edge").forEach((edge) => edge.classList.toggle("dy-wf-route-edge", related.has(edge.dataset.from ?? "") && related.has(edge.dataset.to ?? "")));
    passport.replaceChildren();
    const status = n.status ?? "pending";
    const head = elu("div", "dy-wf-pp-head");
    const meta = elu("div", "dy-wf-pp-meta");
    meta.append(elu("span", "dy-wf-passport-kind", PURPOSE_VISUALS[nodePurpose(n)].label), elu("span", `badge ${status}`, status));
    const close = elu("button", "dy-wf-passport-close", "\xD7");
    close.type = "button";
    close.setAttribute("aria-label", "Close step details");
    close.addEventListener("click", () => closePassport());
    head.append(meta, elu("h3", "", n.title), close);
    passport.appendChild(head);
    const facts = elu("dl", "dy-wf-pp-facts");
    const fact = (k, v, cls = "") => {
      const row = elu("div", `dy-wf-pp-fact ${cls}`.trim());
      row.append(elu("dt", "", k), elu("dd", "", v));
      facts.appendChild(row);
      return row;
    };
    const updated = lastRun?.updated_at ?? null;
    const lastConfirmed = fact("Last confirmed update", updated && isFinite(Date.parse(updated)) ? updated.replace("T", " ").slice(0, 16) + " UTC" : "unknown", "dy-wf-last-confirmed");
    lastConfirmed.setAttribute("data-last-confirmed", updated ?? "unknown");
    if (n.depends_on.length) fact("Depends on", n.depends_on.join(", "));
    if (n.assignee) fact("Assignee", n.assignee);
    if (n.evidence_refs.length) fact("Evidence", n.evidence_refs.join(", "));
    if (n.task_ref) fact("Work item", n.task_ref);
    passport.appendChild(facts);
    const nodeEvents = (lastRun?.timeline ?? []).filter((event) => event.node_id === n.node_id);
    if (nodeEvents.length) {
      passport.appendChild(elu("h4", "", "Status history"));
      const history = elu("ol", "dy-wf-node-history");
      for (const event of nodeEvents.slice(-6)) history.appendChild(elu("li", "", `${event.from_status ?? "\u2014"} \u2192 ${event.to_status}`));
      passport.appendChild(history);
    }
    const appendEditor = () => {
      if (!handlers.onEdit) return;
      const edit = elu("div", "dy-wf-edit");
      edit.appendChild(elu("h4", "", "Edit step"));
      const field = (label, input) => {
        const f = elu("label", "dy-wf-field");
        f.append(elu("span", "", label), input);
        edit.appendChild(f);
      };
      const title = elu("input", "dy-wf-edit-title");
      title.value = n.title;
      title.setAttribute("aria-label", "Node title");
      const deps = elu("input", "dy-wf-edit-deps");
      deps.value = n.depends_on.join(", ");
      deps.placeholder = "e.g. build, tests";
      deps.setAttribute("aria-label", "Dependencies");
      const team = elu("input", "dy-wf-edit-team");
      team.value = n.phase_team ?? "";
      team.placeholder = "phase team override";
      team.setAttribute("aria-label", "Phase team override");
      field("Title", title);
      field("Depends on (step IDs)", deps);
      field("Phase team", team);
      const save = elu("button", "dy-btn primary", "Save graph version");
      save.type = "button";
      save.addEventListener("click", async () => {
        const ids = new Set(deps.value.split(",").map((v) => v.trim()).filter(Boolean));
        ids.delete(n.node_id);
        const edited = currentNodes.map((item) => item.node_id === n.node_id ? { ...item, title: title.value.trim() || item.title, depends_on: [...ids], phase_team: team.value.trim() || null } : item);
        save.disabled = true;
        save.textContent = "Saving\u2026";
        try {
          await handlers.onEdit(edited);
          save.textContent = "Saved \u2713";
        } catch {
          save.disabled = false;
          save.textContent = "Save failed \u2014 retry";
        }
      });
      edit.appendChild(save);
      passport.appendChild(edit);
    };
    if (n.task_ref) {
      const decisionState = n.kind === "gate" && n.status !== "done" && n.status !== "blocked" ? elu("span", "dy-wf-decision-state", "Awaiting decision") : null;
      if (decisionState) {
        decisionState.setAttribute("data-decision-state", "awaiting_decision");
        passport.appendChild(decisionState);
      }
      if (n.kind === "gate" && n.status !== "done" && n.status !== "blocked") {
        const row = elu("div", "dy-wf-actions");
        const approve = elu("button", "dy-btn primary", "Approve");
        const reject = elu("button", "dy-btn", "Reject");
        let inFlight = false;
        const setDecisionState = (state, text) => {
          if (!decisionState) return;
          decisionState.setAttribute("data-decision-state", state);
          decisionState.textContent = text;
        };
        const runAction = async (act, okLabel, pendingLabel, failPrefix, okState, pendingState) => {
          if (inFlight) return;
          inFlight = true;
          approve.disabled = true;
          reject.disabled = true;
          approve.textContent = pendingLabel;
          reject.textContent = pendingLabel;
          setDecisionState(pendingState, pendingLabel.replace(/…$/, "") + " in progress");
          try {
            await act(n.task_ref);
            approve.textContent = okLabel;
            reject.textContent = "Reject";
            approve.disabled = true;
            reject.disabled = true;
            setDecisionState(okState, okLabel);
          } catch {
            reject.textContent = "Reject";
            approve.textContent = failPrefix + " failed \u2014 retry";
            approve.disabled = false;
            reject.disabled = false;
            setDecisionState("failed", failPrefix + " failed \u2014 retry");
          } finally {
            inFlight = false;
          }
        };
        approve.addEventListener("click", () => {
          void runAction(handlers.onApprove, "Approved \u2713", "Approving\u2026", "Approve", "approved", "approved_pending");
        });
        reject.addEventListener("click", () => {
          void runAction(handlers.onReject, "Rejected \u2715", "Rejecting\u2026", "Reject", "rejected", "rejected_pending");
        });
        row.append(approve, reject);
        passport.appendChild(row);
      }
      if (n.kind !== "gate" && (n.status === "blocked" || n.status === "working") && handlers.onRetry) {
        const recovery = elu("div", "dy-wf-recovery");
        if (n.status === "blocked") {
          const retry = elu("button", "dy-btn", "Re-queue (retry)");
          retry.type = "button";
          retry.setAttribute("aria-label", `Re-queue ${n.title} through the canonical transition`);
          retry.addEventListener("click", () => {
            retry.disabled = true;
            try {
              handlers.onRetry(n.task_ref);
              retry.textContent = "Re-queued \u2713";
            } catch {
              retry.textContent = "Re-queue failed \u2014 retry";
              retry.disabled = false;
            }
          });
          recovery.appendChild(retry);
        }
        const unsupported = elu(
          "p",
          "dy-wf-unsupported dy-wf-pp-note",
          "Pause and cancel are not supported by the native execution contract \u2014 a running worker cannot be stopped from here."
        );
        unsupported.setAttribute("data-unsupported-controls", "pause,cancel");
        recovery.appendChild(unsupported);
        passport.appendChild(recovery);
      }
      if (handlers.onExpand) {
        const sec = elu("div", "dy-wf-expand");
        const head2 = elu("button", "dy-wf-expand-head", "\u25B8 Live detail");
        head2.setAttribute("aria-expanded", "false");
        const body = elu("div", "dy-wf-expand-body");
        body.style.display = "none";
        body.appendChild(elu("p", "dy-dim", "Loading live detail\u2026"));
        head2.addEventListener("click", () => {
          const isOpen = head2.getAttribute("aria-expanded") === "true";
          head2.setAttribute("aria-expanded", String(!isOpen));
          head2.textContent = isOpen ? "\u25B8 Live detail" : "\u25BE Live detail";
          body.style.display = isOpen ? "none" : "block";
          if (!isOpen && !body.dataset.loaded) {
            body.dataset.loaded = "1";
            handlers.onExpand(n.task_ref).then((data) => {
              body.replaceChildren();
              if (!data) {
                body.appendChild(elu("p", "dy-dim", "Detail unavailable."));
                return;
              }
              const kids = data.children;
              const doneCount = kids.filter((c) => (c.status ?? "") === "done").length;
              const total = kids.length;
              body.appendChild(elu("h4", "", "Progress"));
              const barWrap = elu("div", "dy-wf-progress");
              const barFill = elu("div", "dy-wf-progress-fill");
              const pct = total > 0 ? Math.round(doneCount / total * 100) : 0;
              barFill.style.width = pct + "%";
              barWrap.appendChild(barFill);
              body.appendChild(barWrap);
              body.appendChild(
                elu("p", "dy-wf-progress-label", `${doneCount} of ${total} sub-tasks done (${pct}%)`)
              );
              body.appendChild(elu("h4", "", "Sub-tasks"));
              body.appendChild(
                buildTasks(
                  kids.map((c) => ({
                    ref: c.ref,
                    title: c.title,
                    status: c.status,
                    assignee: c.assignee ?? null
                  })),
                  (ref) => passport.dispatchEvent(new CustomEvent("openwork", { detail: ref }))
                )
              );
              body.appendChild(elu("h4", "", "Activity"));
              body.appendChild(
                buildThread(data.history.map((h) => ({ ts: h.ts, text: h.text })))
              );
            }).catch(() => {
              body.replaceChildren(elu("p", "dy-dim", "Detail unavailable."));
            });
          }
        });
        sec.append(head2, body);
        passport.appendChild(sec);
      }
    } else {
      passport.appendChild(elu("p", "dy-wf-pp-note", "No canonical work bound to this step yet."));
    }
    appendEditor();
  };
  const buildThread = (items) => buildActivityThread(items, { decay: true });
  const buildTasks = (tasks, onOpen) => buildTaskListMini(tasks, onOpen);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target?.closest?.(".dy-wf-node")) return;
    dragging = true;
    host2.classList.add("dy-wf-panning");
    lastX = e.clientX;
    lastY = e.clientY;
    const target = e.target;
    const captureEl = target && target.closest && target.closest("g.dy-wf-node");
    const cap = captureEl ?? svg;
    try {
      cap.setPointerCapture(e.pointerId);
    } catch {
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (dragSession) return;
    const ev = e;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    apply();
    updateMinimap();
  });
  svg.addEventListener("pointerup", (e) => {
    if (dragSession) {
      endDragSession(e, true);
      dragging = false;
      host2.classList.remove("dy-wf-panning");
      return;
    }
    if (connectFrom) {
      const target = e.target?.closest?.("[data-node-id]");
      endConnectGesture(target?.getAttribute("data-node-id") ?? null);
    }
    dragging = false;
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
    }
  });
  svg.addEventListener("pointercancel", (e) => {
    if (dragSession) endDragSession(e, false);
    cancelConnect();
    dragging = false;
    host2.classList.remove("dy-wf-panning");
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
    }
  });
  let wheelSettle = null;
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const ev = e;
    const rect = svg.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    host2.classList.add("dy-wf-panning");
    if (wheelSettle) clearTimeout(wheelSettle);
    wheelSettle = setTimeout(() => host2.classList.remove("dy-wf-panning"), 160);
    const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const k = next / zoom;
    panX = cx - (cx - panX) * k;
    panY = cy - (cy - panY) * k;
    zoom = next;
    apply();
    updateMinimap();
  }, { passive: false });
  const closePassport = () => {
    passport.replaceChildren();
    if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
    selectedEl = null;
    clearRoute();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") closePassport();
  };
  document.addEventListener("keydown", onKeyDown);
  let flowT = 0;
  let flowStopped = false;
  const flowTimer = setInterval(() => {
    if (flowStopped) return;
    if (document.hidden || prefersReducedMotion()) {
      flowStopped = true;
      viewport.querySelectorAll(".dy-wf-flowdot").forEach((d) => {
        d.setAttribute("opacity", "0");
      });
      return;
    }
    flowT = (flowT + 0.03) % 1;
    const edgeMap = /* @__PURE__ */ new Map();
    viewport.querySelectorAll("path.dy-wf-edge").forEach((p) => {
      const key = (p.dataset.from ?? "") + ">" + (p.dataset.to ?? "");
      const dot = p.nextElementSibling;
      if (dot && dot.classList.contains("dy-wf-flowdot")) edgeMap.set(key, { path: p, dot });
    });
    const doneIds = new Set(
      currentNodes.filter((n) => n.status === "done").map((n) => n.node_id)
    );
    viewport.querySelectorAll("path.dy-wf-edge").forEach((p) => {
      const to = currentNodes.find((n) => n.node_id === p.dataset.to);
      const fromDone = doneIds.has(p.dataset.from ?? "");
      const meaning = EDGE_MEANINGS[p.dataset.meaning ?? DEFAULT_EDGE_MEANING];
      const active = !!to && to.status !== "pending" && fromDone;
      p.classList.toggle("active", active);
      if (meaning) {
        p.setAttribute("marker-end", `url(#${active ? meaning.activeMarker : meaning.marker})`);
      }
    });
    edgeMap.forEach(({ path, dot }) => {
      if (!path.classList.contains("active")) {
        dot.setAttribute("opacity", "0");
        return;
      }
      let pt = null;
      try {
        const L = path.getTotalLength();
        if (L > 0) pt = path.getPointAtLength(L * flowT);
      } catch {
        pt = null;
      }
      if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) {
        const nums = (path.getAttribute("d") || "").match(/-?\d+(\.\d+)?/g) ?? [];
        if (nums.length >= 4 && nums[0] !== void 0 && nums[1] !== void 0) {
          const ax = +(nums[0] ?? 0), ay = +(nums[1] ?? 0);
          const mx = +(nums[2] ?? ax), my = +(nums[3] ?? ay);
          const bx = +(nums[nums.length - 2] ?? ax), by = +(nums[nums.length - 1] ?? ay);
          pt = flowT < 0.5 ? { x: ax + (mx - ax) * flowT * 2, y: ay + (my - ay) * flowT * 2 } : { x: mx + (bx - mx) * (flowT - 0.5) * 2, y: my + (by - my) * (flowT - 0.5) * 2 };
        }
      }
      if (pt && isFinite(pt.x) && isFinite(pt.y)) {
        dot.setAttribute("cx", String(pt.x));
        dot.setAttribute("cy", String(pt.y));
        dot.setAttribute("opacity", "0.9");
      } else dot.setAttribute("opacity", "0");
    });
  }, 40);
  let timer = null;
  let lastSig = "";
  let lastTimelineCount = 0;
  let pollTicket = 0;
  let appliedTicket = 0;
  let disposed = false;
  const tickTimers = () => {
    viewport.querySelectorAll("text.dy-wf-timer").forEach((t) => {
      const node = currentNodes.find((n) => n.node_id === t.dataset.for);
      if (!node || node.status !== "working") return;
      t.textContent = `Workflow: ${elapsedLabel(currentStartedAt)}`;
    });
  };
  let currentStartedAt = null;
  const clockTimer = setInterval(tickTimers, 1e3);
  const onVisibility = () => {
    if (!document.hidden) flowStopped = false;
  };
  document.addEventListener("visibilitychange", onVisibility);
  const pollOnce = () => {
    const ticket = ++pollTicket;
    fetchRuns().then(async (runs) => {
      if (disposed || ticket < appliedTicket) return;
      appliedTicket = ticket;
      const latest = runs && runs.length ? runs[0] : null;
      if (latest?.run_key && latest.status !== "definition" && handlers.fetchTimeline) {
        try {
          const history = await handlers.fetchTimeline(projectId, runName, latest.run_key);
          latest.timeline = (history.events ?? []).map((event) => ({
            seq: Number(event.seq ?? 0),
            node_id: String(event.node_id),
            from_status: event.from_status == null ? null : String(event.from_status),
            to_status: String(event.to_status ?? "pending"),
            ts: event.ts == null ? void 0 : String(event.ts)
          }));
        } catch {
        }
      }
      const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
      if (latest?.timeline?.length && latest.timeline.length > lastTimelineCount) {
        feedLog(`Run timeline: ${latest.timeline.length} observed events`);
        lastTimelineCount = latest.timeline.length;
      }
      if (sig !== lastSig) {
        if (lastSig !== "") {
          const prev = /* @__PURE__ */ new Map();
          try {
            JSON.parse(lastSig).forEach(([id, st]) => prev.set(id, st));
          } catch {
          }
          (latest?.nodes ?? []).forEach((n) => {
            const old = prev.get(n.node_id);
            if (old !== void 0 && old !== n.status) {
              feedLog(`${n.title}: ${old ?? "pending"} \u2192 ${n.status ?? "pending"}`);
            }
          });
        }
        lastSig = sig;
      }
      const frameSig = JSON.stringify(latest ?? null);
      if (frameSig !== lastFrameSig) {
        playbackIndex = null;
        render(latest);
        lastFrameSig = frameSig;
      }
      currentStartedAt = latest?.started_at ?? null;
      tickTimers();
      setStale(false);
    }).catch(() => {
      if (disposed || ticket < appliedTicket) return;
      appliedTicket = ticket;
      setStale(true);
    });
  };
  let lastFrameSig = "";
  const setStale = (on) => {
    const existing = wrap.querySelector(".dy-wf-stale");
    if (on && !existing) {
      const badge = elu("div", "dy-wf-stale", "stale \u2014 last refresh failed, showing last known state");
      wrap.insertBefore(badge, wrap.firstChild);
    } else if (!on && existing) existing.remove();
  };
  pollOnce();
  if (pollMs > 0) timer = setInterval(pollOnce, pollMs);
  const onResize = () => {
    if (!disposed && lastRun) render(lastRun);
  };
  canvasWindow.addEventListener("resize", onResize);
  let lastHostWidth = host2.clientWidth;
  let resizeFrame = 0;
  const RO = canvasWindow.ResizeObserver;
  const hostObserver = RO ? new RO(() => {
    const w = host2.clientWidth;
    if (w === lastHostWidth) return;
    lastHostWidth = w;
    if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
    resizeFrame = canvasWindow.requestAnimationFrame(() => {
      resizeFrame = 0;
      onResize();
    });
  }) : null;
  hostObserver?.observe(host2);
  disposers.push(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    if (flowTimer) clearInterval(flowTimer);
    clearInterval(clockTimer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
    canvasWindow.removeEventListener("resize", onResize);
    hostObserver?.disconnect();
    if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
    host2.replaceChildren();
  });
  return () => {
    disposers.forEach((d) => d());
    disposers = [];
  };
}

// hermes_dockyard_plugin/desktop/workflow-canvas-mount.js
var toCanvasNode = (node) => ({
  node_id: node.node_id ?? node.id,
  title: node.title ?? node.name ?? node.id,
  depends_on: node.depends_on ?? [],
  human_gate: Boolean(node.human_gate),
  task_ref: node.task_ref ?? null,
  kind: node.kind ?? (node.human_gate ? "gate" : "task"),
  status: node.status ?? null,
  assignee: node.assignee ?? null,
  // The run projection's resolved assignment. Dropping it collapsed every
  // lane band to 'unassigned' on the Desktop surface, so the canvas could
  // never group by the real roster (the Dashboard half reads it directly).
  team: node.team ?? null,
  phase_team: node.phase_team ?? null,
  evidence_refs: node.evidence_refs ?? [],
  canvas_position: node.canvas_position ?? void 0,
  // Graph-shape modifiers the run projection already returns. Dropping them
  // collapsed a conditional branch and a bounded loop onto the plain-task
  // silhouette, so two of the four node purposes could never appear on the
  // Desktop surface. Data only — this adapter still invents no graph state.
  when: node.when ?? null,
  loop: node.loop ?? null
});
var toCanvasRun = (run) => ({
  run_key: run.run_key,
  version: Number(run.version ?? 0),
  status: run.status ?? "unknown",
  started_at: run.started_at ?? null,
  updated_at: run.updated_at ?? null,
  nodes: (run.nodes ?? []).map(toCanvasNode),
  timeline: (run.timeline ?? []).map((event) => ({
    seq: event.seq,
    node_id: String(event.node_id),
    from_status: event.from_status ?? null,
    to_status: String(event.to_status ?? "pending"),
    ts: event.ts
  }))
});
function mountDesktopWorkflowCanvas(host2, projectId, workflowName, definition, runs, handlers = {}) {
  const nodes = (definition?.nodes ?? []).map(toCanvasNode);
  const fetchRuns = async () => {
    const mapped = (runs ?? []).map(toCanvasRun);
    return mapped.length ? mapped : [{ run_key: `definition:${workflowName}`, version: 0, status: "definition", started_at: null, updated_at: null, nodes }];
  };
  return mountWorkflowCanvas(host2, projectId, workflowName, fetchRuns, {
    onApprove: handlers.onApprove ?? (() => void 0),
    onReject: handlers.onReject ?? (() => void 0),
    onRetry: handlers.onRetry,
    onExpand: handlers.onExpand,
    onEdit: handlers.onEdit,
    fetchTimeline: handlers.fetchTimeline
  }, handlers.pollMs ?? 6e4);
}

// hermes_dockyard_plugin/desktop/src/project/workflows.js
function ExecutableWorkflowsPanel({ project, workflows, onRefresh, onOpenLibrary }) {
  const [name, setName] = useState("release");
  const [title, setTitle] = useState("Draft release plan");
  const [team, setTeam] = useState("");
  const [runKey, setRunKey] = useState("");
  const [phaseTeams, setPhaseTeams] = useState({});
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState(workflows?.[0]?.name ?? "");
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("live");
  const [validation, setValidation] = useState(null);
  const [layoutPendingVersion, setLayoutPendingVersion] = useState(null);
  const [libCollapsed, setLibCollapsed] = useState(false);
  const encoded = encodeURIComponent(project.id);
  const grouped = Object.values((workflows ?? []).reduce((all, row) => {
    const item = all[row.name] ?? { name: row.name, versions: [], archived_at: row.archived_at };
    item.versions.push(row);
    item.archived_at = row.archived_at;
    all[row.name] = item;
    return all;
  }, {}));
  const current = grouped.find((item) => item.name === selected) ?? grouped[0];
  useEffect(() => {
    if (layoutPendingVersion !== null && current?.versions?.length > layoutPendingVersion) {
      setLayoutPendingVersion(null);
    }
  }, [layoutPendingVersion, current?.versions?.length]);
  const definition = current?.versions?.[current.versions.length - 1]?.definition ?? { nodes: [] };
  const nodes = definition.nodes ?? [];
  const currentCanvasNodes = () => nodes.map((n) => ({
    node_id: n.node_id ?? n.id,
    title: n.title ?? n.name ?? n.id,
    depends_on: n.depends_on ?? [],
    human_gate: Boolean(n.human_gate),
    task_ref: n.task_ref ?? null,
    kind: n.kind ?? (n.human_gate ? "gate" : "task"),
    phase_team: n.phase_team ?? null,
    canvas_position: n.canvas_position ?? void 0
  }));
  const loadRuns = async (workflow = current?.name) => {
    if (!workflow) return;
    try {
      const result = await api(`/projects/${encoded}/workflows/${encodeURIComponent(workflow)}/runs`);
      setRuns(result.runs ?? []);
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
  };
  useEffect(() => {
    loadRuns();
  }, [selected, workflows?.length]);
  useEffect(() => {
    if (!canvasRef.current || !current) return void 0;
    const visibleRuns = mode === "live" ? runs : [];
    return mountDesktopWorkflowCanvas(canvasRef.current, project.id, current.name, definition, visibleRuns, {
      onEdit: async (editedNodes) => {
        await api(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, { method: "POST", body: { nodes: editedNodes.map(({ node_id, title: title2, depends_on, human_gate, task_ref, kind, phase_team, canvas_position }) => ({ id: node_id, title: title2, depends_on, human_gate, task_ref, kind, phase_team, canvas_position })) } });
        onRefresh?.();
      },
      // Gate decisions use the same canonical authority as the dashboard: the
      // reviewed decision fingerprint is submitted with the action, so a stale
      // review can never approve something else. Retry re-queues via the
      // canonical work-item transition — never an optimistic local flip.
      onApprove: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`);
        await api(`/initiatives/${encodeURIComponent(ref)}/approve`, { method: "POST", body: { expected_fingerprint: decision.fingerprint } });
        await loadRuns(current.name);
      },
      onReject: async (ref) => {
        const decision = await api(`/initiatives/${encodeURIComponent(ref)}/decision`);
        await api(`/initiatives/${encodeURIComponent(ref)}/reject`, { method: "POST", body: { expected_fingerprint: decision.fingerprint, reason: "Rejected from workflow gate review" } });
        await loadRuns(current.name);
      },
      onRetry: async (ref) => {
        await api(`/projects/${encoded}/work-items/${encodeURIComponent(ref)}/transition`, { method: "POST", body: { status: "backlog" } });
        await loadRuns(current.name);
      },
      fetchTimeline: async (pid, wname, runKey2) => api(`/projects/${encodeURIComponent(pid)}/workflows/${encodeURIComponent(wname)}/runs/${encodeURIComponent(runKey2)}/timeline`)
    });
  }, [project.id, current?.name, current?.versions?.length, runs, mode]);
  const mutate = async (path, body = {}) => {
    setError(null);
    try {
      await api(path, { method: "POST", body });
      onRefresh?.();
      return true;
    } catch (failure) {
      setError(String(failure?.message ?? failure));
      return false;
    }
  };
  const define = () => {
    if (!name.trim() || !title.trim()) return;
    const existing = grouped.find((item) => item.name === name.trim());
    const path = `/projects/${encoded}/workflows${existing ? `/${encodeURIComponent(name.trim())}/versions` : ""}`;
    mutate(path, { ...existing ? {} : { name: name.trim() }, nodes: [{ id: "step-1", title: title.trim(), depends_on: [], human_gate: false, team: team || null, phase_team: phaseTeams["step-1"] || null }] });
    setSelected(name.trim());
    setTitle("");
  };
  const persistNodes = (nextNodes) => {
    if (!current) return Promise.resolve(false);
    return mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, {
      nodes: nextNodes.map(({ node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position }) => ({ id: node_id, title: nodeTitle, depends_on, human_gate, task_ref, kind, phase_team, canvas_position }))
    });
  };
  const addNode = (gate) => {
    const existingIds = new Set(currentCanvasNodes().map((n) => n.node_id));
    let index = nodes.length + 1;
    while (existingIds.has(gate ? `gate-${index}` : `step-${index}`)) index += 1;
    const id = gate ? `gate-${index}` : `step-${index}`;
    persistNodes([...currentCanvasNodes(), {
      node_id: id,
      title: gate ? `Gate ${index}` : `Step ${index}`,
      depends_on: [],
      human_gate: gate,
      task_ref: null,
      kind: gate ? "gate" : "task",
      phase_team: null
    }]);
  };
  const autoLayout = async () => {
    if (!current || layoutPendingVersion !== null) return;
    setLayoutPendingVersion(current.versions.length);
    if (!await persistNodes(currentCanvasNodes())) setLayoutPendingVersion(null);
  };
  const validateGraph = () => {
    const nodesNow = currentCanvasNodes();
    const issues = [];
    for (const n of nodesNow) {
      for (const dep of n.depends_on) {
        const problem = validateConnection(nodesNow, dep, n.node_id);
        if (problem) issues.push(`${n.title} \u2190 ${dep}: ${problem}`);
      }
    }
    if (!nodesNow.some((n) => n.human_gate)) issues.push("no human gate on this graph");
    setValidation(issues.length ? { ok: false, text: `Validation: ${issues.join("; ")}` } : { ok: true, text: "Validation: no issues found" });
  };
  const statusFor = (run, node) => run?.nodes?.find((item) => item.node_id === (node.id || node.node_id))?.status ?? "pending";
  const latest = runs[0];
  const latestVersion = current?.versions?.[current.versions.length - 1] ?? null;
  const needsAttention = (node) => node.status === "blocked" || node.status === "pending" && node.human_gate;
  const attentionCount = latest ? (latest.nodes ?? []).filter(needsAttention).length : 0;
  const startVersion = async (version) => {
    if (!current || !version) return;
    await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: runKey || `${current.name}-${Date.now()}` });
    await loadRuns(current.name);
  };
  const liveCounts = latest ? (latest.nodes ?? []).reduce((acc, node) => {
    const key = node.status ?? "pending";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}) : null;
  return jsxs("section", { className: "dockyard-feature-card dockyard-workflows-v6", "data-workflows-prototype": project.id, "data-executable-workflows": project.id, children: [
    jsxs("div", { className: "dockyard-wf-entry", "data-workflow-library-entry": true, children: [
      jsx(Button, { action: "open-workflow-library", variant: "primary", onClick: onOpenLibrary, children: "Open workflow library" }),
      jsx("span", { children: "The library holds every workflow: global (available to all projects) and this project's dedicated ones." })
    ] }),
    jsxs("header", { className: "dockyard-section-head", children: [jsxs("div", { children: [jsx("h2", { children: "Workflows" }), jsx("p", { children: "Planning is saved as a version; execution is shown only from canonical runs." })] }), jsx(StatusTag, { tone: latest?.status === "running" ? "info" : "neutral", label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} instances` })] }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
    jsxs("div", { className: libCollapsed ? "dockyard-wf3 lib-collapsed" : "dockyard-wf3", "data-wf-library-collapsed": libCollapsed ? "true" : "false", children: [
      // ---- Zone 1: workflow library + create/define editor ---------------
      jsxs("aside", { className: "dockyard-wf3-lib", "data-workflow-library": project.id, "aria-hidden": libCollapsed ? "true" : void 0, inert: libCollapsed ? true : void 0, children: [
        jsxs("div", { className: "dockyard-wf3-lib-head", children: [jsx("strong", { children: "Library" }), jsx("span", { children: number(grouped.length) })] }),
        grouped.length ? jsx("div", { className: "dockyard-wf3-lib-list", children: grouped.map((item) => jsxs("button", {
          type: "button",
          className: item.name === current?.name ? "active" : "",
          "data-workflow-library-item": item.name,
          "data-action": "select-workflow",
          onClick: () => {
            setSelected(item.name);
            loadRuns(item.name);
          },
          children: [
            jsx("strong", { children: item.name }),
            jsx("small", { children: `v${item.versions[item.versions.length - 1].version}${item.archived_at ? " \xB7 archived" : ""}` })
          ]
        }, item.name)) }) : jsx("p", { className: "dockyard-meta", children: "No workflow instances yet." }),
        jsxs("div", { className: "dockyard-inline-editor", children: [
          jsxs("label", { children: [jsx("span", { children: "Template / instance" }), jsx("input", { "data-workflow-name": true, value: name, onChange: (event) => setName(event.target.value) })] }),
          jsxs("label", { children: [jsx("span", { children: "Phase title" }), jsx("input", { "data-workflow-title": true, value: title, onChange: (event) => setTitle(event.target.value) })] }),
          jsxs("label", { children: [jsx("span", { children: "Default bot team" }), jsx("input", { "data-workflow-team": true, value: team, placeholder: "team slug", onChange: (event) => setTeam(event.target.value) })] }),
          jsxs("label", { children: [jsx("span", { children: "Run key" }), jsx("input", { "data-workflow-run-key": current?.name ?? name, value: runKey, onChange: (event) => setRunKey(event.target.value), placeholder: "execution key" })] }),
          jsx(Button, { action: "define-workflow", variant: "primary", disabled: !name.trim() || !title.trim(), onClick: define, children: current ? "Save planning version" : "Create instance" })
        ] })
      ] }),
      // ---- Zone 2: toolbar + run readout + canvas (the surface) ----------
      // There is no third column: run lifecycle lives in the toolbar, the
      // canonical run state is a one-line readout above the canvas, and step
      // details open in the canvas's own floating panel.
      jsxs("div", { className: "dockyard-wf3-stage", children: [
        jsxs("div", { className: "dockyard-wf3-toolbar", role: "toolbar", "aria-label": "Workflow canvas tools", children: [
          jsx("button", { type: "button", className: "dockyard-wf3-libtoggle", "data-action": "wf-toggle-library", "aria-expanded": libCollapsed ? "false" : "true", "aria-label": libCollapsed ? "Show workflow library" : "Hide workflow library", title: libCollapsed ? "Show library" : "Hide library", onClick: () => setLibCollapsed((v) => !v), children: libCollapsed ? "\xBB" : "\xAB" }),
          jsx("span", { className: "dockyard-wf3-sep", "aria-hidden": true }),
          jsx(Button, { small: true, action: "wf-view-definition", variant: mode === "definition" ? "primary" : "", onClick: () => setMode("definition"), children: "Definition" }),
          jsx(Button, { small: true, action: "wf-view-live", variant: mode === "live" ? "primary" : "", disabled: !latest, onClick: () => setMode("live"), children: "Live run" }),
          jsx("span", { className: "dockyard-wf3-sep", "aria-hidden": true }),
          jsx(Button, { small: true, action: "wf-add-step", disabled: !current, onClick: () => addNode(false), children: "\uFF0B Step" }),
          jsx(Button, { small: true, action: "wf-add-gate", disabled: !current, onClick: () => addNode(true), children: "\uFF0B Gate" }),
          jsx(Button, { small: true, action: "wf-auto-layout", disabled: !current || layoutPendingVersion !== null, onClick: autoLayout, children: layoutPendingVersion !== null ? "Saving layout\u2026" : "Auto layout" }),
          jsx(Button, { small: true, action: "wf-validate", disabled: !current, onClick: validateGraph, children: "Validate" }),
          jsx("span", { className: "dockyard-wf3-sep", "aria-hidden": true }),
          // Run lifecycle (was the inspector column). Start runs the LATEST
          // stored version; older versions start from the Versions menu.
          jsx(Button, { small: true, action: "start-workflow", variant: "primary", disabled: !current || Boolean(current?.archived_at), onClick: () => startVersion(latestVersion), children: latestVersion ? `\u25B6 Start v${latestVersion.version}` : "\u25B6 Start" }),
          current ? jsxs("details", { className: "dockyard-wf3-versions", "data-workflow-definitions": current.name, children: [
            jsx("summary", { children: `Versions (${current.versions.length})` }),
            jsx("div", { className: "dockyard-wf3-versions-menu", children: [...current.versions].reverse().map((version) => jsxs("section", { "data-workflow-definition-version": version.version, children: [
              jsxs("div", { className: "dockyard-wf3-version-head", children: [
                jsx("strong", { children: `Version ${version.version}${version === latestVersion ? " \xB7 latest" : ""}` }),
                jsx(Button, { small: true, action: "start-workflow-version", disabled: Boolean(current.archived_at), onClick: () => startVersion(version), children: `Start v${version.version}` })
              ] }),
              jsx("pre", { children: JSON.stringify(version.definition?.nodes ?? [], null, 2) })
            ] }, `definition-${version.version}`)) })
          ] }) : null,
          current ? current.archived_at ? jsx(Button, { small: true, action: "restore-workflow", onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/restore`), children: "Restore" }) : jsx(Button, { small: true, action: "archive-workflow", variant: "danger", onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/archive`), children: "Archive" }) : null,
          jsx(Button, { small: true, action: "inspect-workflow", disabled: !current, onClick: () => {
            setSelected(current.name);
            loadRuns(current.name);
          }, children: "Refresh" })
        ] }),
        validation ? jsx("p", { className: "dockyard-wf3-validation", role: "status", "data-wf-validate-result": validation.ok ? "ok" : "issues", children: validation.text }) : null,
        layoutPendingVersion !== null ? jsx("p", { role: "status", "data-wf-layout-saving": true, children: "Saving layout version before the graph can be edited\u2026" }) : null,
        // Run readout: the latest canonical run only. Nothing here is inferred.
        latest ? jsxs("div", { className: "dockyard-wf3-run", "data-workflow-live-run": latest.run_key, children: [
          jsx(StatusTag, { tone: latest.status === "completed" ? "success" : latest.status === "failed" ? "danger" : "info", label: latest.status }),
          jsx("span", { className: "dockyard-wf3-runkey", children: `${latest.run_key} \xB7 v${latest.version}` }),
          liveCounts ? jsx("span", { className: "dockyard-wf3-counts", children: ["done", "working", "blocked", "pending"].filter((k) => liveCounts[k]).map((k) => `${liveCounts[k]} ${k}`).join(" \xB7 ") }) : null,
          jsxs("details", { className: "dockyard-wf3-steps", children: [
            jsx("summary", { children: attentionCount ? `Steps \xB7 ${attentionCount} need attention` : "Steps" }),
            jsx("ul", { "data-wf-live-map": latest.run_key, children: (latest.nodes ?? []).map((node) => jsx("li", { "data-wf-live-node": node.node_id, "data-wf-needs-attention": needsAttention(node) ? "true" : void 0, children: `${node.title} \u2014 ${node.status ?? "pending"}${node.assignee ? ` \xB7 ${node.assignee}` : ""}${needsAttention(node) ? " \xB7 needs attention" : ""}` }, node.node_id)) })
          ] })
        ] }) : jsx("p", { className: "dockyard-wf3-run dockyard-meta", "data-workflow-no-run": true, children: "No canonical run recorded. Start a run to see truthful state." }),
        current ? jsx("div", { ref: canvasRef, className: "dockyard-workflow-graph", "data-workflow-canvas": current.name, role: "img", "aria-label": "Workflow planning graph", "aria-busy": layoutPendingVersion !== null, style: layoutPendingVersion !== null ? { pointerEvents: "none" } : void 0 }) : jsx("p", { className: "dockyard-meta", children: "No workflow selected." })
      ] })
    ] })
  ] });
}
function PlanningPanel({ project, milestones, workItems, onRefresh }) {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDue, setNewDue] = useState("");
  const loadDetail = (name) => {
    if (expanded === name) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(name);
    setDetail(null);
    api(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(name)}`).then((d) => setDetail(d)).catch(() => setNotice(`Planning details for ${name} are unavailable.`));
  };
  const act = (path, body = {}, method = "POST") => {
    setNotice(null);
    api(path, { method, body }).then(() => {
      setExpanded(null);
      setDetail(null);
      onRefresh?.();
    }).catch((error) => setNotice(error?.message || "Action failed."));
  };
  const create = () => {
    if (!newName.trim()) return;
    act(`/projects/${encodeURIComponent(project.id)}/milestones`, {
      name: newName.trim(),
      due: newDue || null
    });
    setNewName("");
    setNewDue("");
  };
  const rename = (name) => {
    const target = detail?.renameValue?.trim();
    if (!target || target === name) return;
    act(
      `/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(name)}/rename`,
      { new_name: target }
    );
  };
  const closeReopen = (m) => act(
    `/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}`,
    { closed: !m.closed },
    "PATCH"
  );
  const updateDue = (m) => act(
    `/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}`,
    { due: detail?.dueValue || null },
    "PATCH"
  );
  const forecastLine = (fc) => {
    if (!fc) return "Forecast unavailable.";
    if (fc.state === "complete") return "Forecast: complete.";
    if (fc.state === "insufficient_history") {
      return `Forecast: insufficient history (${fc.sample_size ?? 0} completions in the last ${fc.assumptions?.window_weeks ?? 4} complete weeks; needs ${fc.assumptions?.min_sample ?? 8}).`;
    }
    if (fc.state === "not_comparable") return "Forecast: work history is not comparable.";
    const range = fc.range_weeks ?? {};
    const upper = range.upper_open_ended ? "open-ended (a zero-throughput week was observed)" : `${range.upper} weeks`;
    return `Forecast: ~${fc.central_weeks} weeks central (range ${range.lower}\u2013${upper}); ${fc.sample_size} completions. A count-based scenario, not a delivery promise.`;
  };
  return jsxs("section", { className: "dockyard-feature-card", "data-planning-panel": true, children: [
    jsx("h2", { children: "Milestone planning" }),
    notice && jsx("p", { className: "dockyard-inline-error", role: "alert", children: notice }),
    jsx("p", { className: "dockyard-meta", children: "Counts are item counts, not hour estimates. Forecast is a scenario from completed-item history, never a delivery promise." }),
    jsxs("div", { className: "dockyard-inline-editor", "data-milestone-create": true, children: [
      jsxs("label", { children: [jsx("span", { children: "Milestone name" }), jsx("input", { "data-milestone-name": true, value: newName, onChange: (event) => setNewName(event.target.value) })] }),
      jsxs("label", { children: [jsx("span", { children: "Due date" }), jsx("input", { "data-milestone-due": true, type: "date", value: newDue, onChange: (event) => setNewDue(event.target.value) })] }),
      jsx(Button, { action: "create-milestone", variant: "primary", disabled: !newName.trim(), onClick: create, children: "Create milestone" })
    ] }),
    milestones.length === 0 ? jsx("p", { className: "dockyard-meta", children: "No milestones yet. Create one here with the form above; it appears in this panel for review." }) : null,
    jsx("div", {
      className: "dockyard-planning-table",
      role: "table",
      "aria-label": "Milestones and delivery risk",
      children: milestones.map((m, index) => {
        const overdue = !m.closed && m.due && m.due < today;
        const isOpen = expanded === m.name;
        const d = isOpen ? detail : null;
        return jsxs("div", { className: `dockyard-planning-row${overdue ? " dockyard-milestone-overdue" : ""}`, "data-milestone-row": m.name, role: "row", children: [
          jsxs("button", { type: "button", className: "dockyard-planning-toggle", onClick: () => loadDetail(m.name), "aria-expanded": String(isOpen), children: [
            jsx("span", { className: "dockyard-planning-name", children: m.closed ? `${m.name} (closed)` : m.name }, "name"),
            jsx("span", { children: m.due ? `Due ${m.due}` : "No due date" }, "due"),
            jsx("span", { children: `${m.done}/${m.total} done` }, "count")
          ] }),
          d && jsx("div", { className: "dockyard-planning-detail", children: [
            jsx("p", { className: "dockyard-meta", children: `Scope: ${d.committed ?? d.total} committed, ${d.done} done, ${d.blocked ?? 0} blocked (${d.units || "items"}, not hours).` }, "scope"),
            d.assignee_wip && Object.keys(d.assignee_wip).length > 0 ? jsx("p", { className: "dockyard-meta", children: `Assignee WIP: ${Object.entries(d.assignee_wip).map(([who, n]) => `${who}: ${n}`).join(", ")} (item counts).` }, "wip") : jsx("p", { className: "dockyard-meta", children: "No in-progress assignments." }, "no-wip"),
            (d.risks ?? []).length > 0 ? jsx("ul", { className: "dockyard-planning-risks", children: d.risks.map((risk, index2) => jsxs("li", { "data-risk-kind": risk.kind, children: [
              risk.kind === "dependency_blocker" && risk.item ? `${risk.item} blocked by ${(risk.blockers ?? []).join(", ")} \u2014 owner ${risk.owner || "unassigned"}` : risk.kind === "overdue_item" && risk.item ? `${risk.item} overdue \u2014 owner ${risk.owner || "unassigned"}` : risk.kind === "milestone_overdue" ? `Milestone past its due date with ${risk.remaining} item(s) remaining.` : risk.kind
            ] }, `${risk.kind}:${risk.item ?? "risk"}:${index2}`)) }, "risks") : jsx("p", { className: "dockyard-meta", children: "No blocking risks recorded." }, "no-risks"),
            jsx("p", { className: "dockyard-planning-forecast", children: forecastLine(d.forecast) }, "forecast"),
            jsxs("div", { className: "dockyard-inline-editor", children: [
              jsxs("label", { children: [jsx("span", { children: "Rename" }), jsx("input", { "data-milestone-rename": m.name, defaultValue: m.name, onChange: (event) => setDetail((current) => ({ ...current, renameValue: event.target.value })) })] }, "rename-field"),
              jsx(Button, { action: "rename-milestone", onClick: () => rename(m.name), children: "Rename" }, "rename"),
              jsxs("label", { children: [jsx("span", { children: "Due date" }), jsx("input", { type: "date", "data-milestone-edit-due": m.name, defaultValue: m.due || "", onChange: (event) => setDetail((current) => ({ ...current, dueValue: event.target.value })) })] }, "due-field"),
              jsx(Button, { action: "update-milestone-due", onClick: () => updateDue(m), children: "Update due date" }, "due"),
              jsx(Button, { action: m.closed ? "reopen-milestone" : "close-milestone", onClick: () => closeReopen(m), children: m.closed ? "Reopen" : "Close" }, "close"),
              m.archived_at ? jsx(Button, { action: "restore-milestone", onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/restore`), children: "Restore" }, "restore") : jsx(Button, { action: "archive-milestone", variant: "danger", onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/archive`), children: "Archive" }, "archive"),
              jsxs("label", { children: [jsx("span", { children: "Scope item" }), jsx("select", { "data-milestone-scope": m.name, defaultValue: "", onChange: (event) => setDetail((current) => ({ ...current, scopeRef: event.target.value })), children: [jsx("option", { value: "", children: "Select work item" }, "empty"), ...workItems.map((item) => jsx("option", { value: item.ref, children: `${item.ref} \u2014 ${item.title}` }, item.ref))] })] }, "scope-field"),
              jsx(Button, { action: "attach-milestone-scope", disabled: !d.scopeRef, onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/attach`, { ref: d.scopeRef }), children: "Attach" }, "attach"),
              (d.item_refs ?? []).map((ref) => jsx(Button, { action: "detach-milestone-scope", onClick: () => act(`/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(m.name)}/detach`, { ref }), children: `Detach ${ref}` }, ref))
            ] }, "editor"),
            jsx("p", { className: "dockyard-meta", children: "Open a work item ref in the Board tab to drill into a blocker. Nothing is auto-reassigned or replanned." }, "note")
          ] })
        ] }, `${m.name}:item:${index}`);
      })
    })
  ] });
}

// hermes_dockyard_plugin/desktop/src/project/saved-views.js
function SavedViewsSection({ project, views, onApply, onClear, appliedName, onRefresh }) {
  const [name, setName] = useState("");
  const [layout, setLayout] = useState("board");
  const [statusFilter, setStatusFilter] = useState("in_progress");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [recallNotice, setRecallNotice] = useState(null);
  const encoded = encodeURIComponent(project.id);
  const savedList = views ?? [];
  const loadSavedView = (saved) => {
    setSelectedView(saved.name);
    setName(saved.name ?? "");
    setLayout(saved.layout ?? "board");
    setStatusFilter(saved.filters?.status ?? "in_progress");
    setError(null);
    setRecallNotice(null);
  };
  const recall = async (saved) => {
    loadSavedView(saved);
    try {
      const result = await api(`/projects/${encoded}/views/${encodeURIComponent(saved.name)}/items`);
      onApply({ name: saved.name, layout: saved.layout ?? "board", items: result.items ?? [] });
    } catch (failure) {
      setRecallNotice(`Could not run saved view ${saved.name}: ${String(failure?.message ?? failure)}`);
    }
  };
  const persist = async (viewName) => {
    setSaving(true);
    setError(null);
    try {
      await api(`/projects/${encoded}/views`, {
        method: "PUT",
        body: { name: viewName, layout, filters: { status: statusFilter }, shared: false }
      });
      setSelectedView(viewName);
      if (appliedName && appliedName !== viewName) onClear();
      emitToast("success", `Saved view ${viewName}.`);
      onRefresh();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setSaving(false);
  };
  const save = () => {
    const viewName = name.trim();
    if (!viewName) return;
    if (savedList.some((saved) => saved.name === viewName)) {
      setOverwriteConfirm(true);
      return;
    }
    persist(viewName);
  };
  const remove = async () => {
    const viewName = selectedView;
    if (!viewName) return;
    setDeleting(true);
    setError(null);
    try {
      await api(`/projects/${encoded}/views/${encodeURIComponent(viewName)}`, { method: "DELETE" });
      if (appliedName === viewName) onClear();
      setSelectedView(null);
      setName("");
      emitToast("success", `Deleted saved view ${viewName}.`);
      onRefresh();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setDeleting(false);
  };
  return jsxs("section", { className: "dockyard-feature-card", "data-saved-views-screen": project.id, children: [
    jsxs("div", { className: "dockyard-section-head", children: [
      jsxs("div", { children: [
        jsx("h2", { children: "Saved views" }),
        jsx("p", { children: "Display preferences over canonical project work. Saved views change how canonical work is displayed; they do not run automations, assign work or expand permissions." })
      ] }),
      jsx(StatusTag, { tone: "neutral", label: `${number(savedList.length)} saved` })
    ] }),
    jsxs("div", { className: "dockyard-saved-views-layout", children: [
      jsx("div", {
        className: "dockyard-saved-views",
        children: savedList.length > 0 ? savedList.map((saved) => jsxs("button", { type: "button", className: (appliedName ?? selectedView) === saved.name ? "active" : "", "data-saved-view": saved.name, onClick: () => recall(saved), children: [
          jsxs("span", { children: [jsx("strong", { children: saved.name }), jsx("small", { children: `${readableLabel(saved.layout, "Board")} / ${readableLabel(saved.filters?.status)}` })] }),
          jsx(Icon, { name: "chevron" })
        ] }, saved.name)) : jsx("p", { className: "dockyard-meta", children: "No saved views yet." })
      }),
      jsxs("div", { className: "dockyard-saved-view-editor", "data-saved-view-editor": true, children: [
        jsxs("div", { className: "dockyard-section-head", children: [
          jsxs("div", { children: [jsx("h2", { children: selectedView ? "Edit saved view" : "Create saved view" }), jsx("p", { children: "Persist a bounded lens over canonical project work." })] }),
          selectedView ? jsx(StatusTag, { tone: "info", label: "loaded" }) : null
        ] }),
        jsx("label", { htmlFor: "dockyard-view-name", children: "Name" }),
        jsx("input", { id: "dockyard-view-name", value: name, onChange: (event) => setName(event.target.value) }),
        jsx("label", { htmlFor: "dockyard-view-layout", children: "Layout" }),
        jsx("select", { id: "dockyard-view-layout", value: layout, onChange: (event) => setLayout(event.target.value), children: [
          jsx("option", { value: "board", children: "Board" }, "board"),
          jsx("option", { value: "table", children: "Table" }, "table"),
          jsx("option", { value: "timeline", children: "Timeline" }, "timeline")
        ] }),
        jsx("label", { htmlFor: "dockyard-view-status", children: "Status filter" }),
        jsx("select", { id: "dockyard-view-status", value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [
          jsx("option", { value: "backlog", children: "Backlog" }, "backlog"),
          jsx("option", { value: "in_progress", children: "In progress" }, "in_progress"),
          jsx("option", { value: "in_review", children: "In review" }, "in_review"),
          jsx("option", { value: "blocked", children: "Blocked" }, "blocked"),
          jsx("option", { value: "done", children: "Done" }, "done")
        ] }),
        recallNotice ? jsx("p", { className: "dockyard-inline-error", role: "alert", "data-recall-notice": true, children: recallNotice }) : null,
        error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
        jsxs("div", { className: "dockyard-form-actions", children: [
          jsx(Button, { action: "save-view", variant: "primary", disabled: saving || deleting || !name.trim(), onClick: save, children: saving ? "Saving..." : selectedView ? "Save view" : "Create view" }),
          selectedView ? jsx(Button, { action: "delete-view", disabled: saving || deleting, onClick: () => setDeleteConfirm(true), children: deleting ? "Deleting..." : "Delete view" }) : null,
          selectedView ? jsx(Button, { onClick: () => {
            setSelectedView(null);
            setName("");
            setLayout("board");
            setStatusFilter("in_progress");
            setError(null);
            setRecallNotice(null);
          }, children: "Clear" }) : null
        ] })
      ] })
    ] }),
    overwriteConfirm ? jsx(ConfirmDialog, {
      confirmKey: "overwrite-view",
      title: `Overwrite saved view ${name.trim()}?`,
      description: "An existing saved view with this name will be replaced by the current layout and filters.",
      confirmLabel: "Overwrite view",
      busy: saving,
      onCancel: () => setOverwriteConfirm(false),
      onConfirm: async () => {
        setOverwriteConfirm(false);
        await persist(name.trim());
      }
    }) : null,
    deleteConfirm ? jsx(ConfirmDialog, {
      confirmKey: "delete-view",
      title: `Delete saved view ${selectedView}?`,
      description: "This removes the stored display preference for this project. Canonical work is not affected.",
      confirmLabel: "Delete view",
      busy: deleting,
      onCancel: () => setDeleteConfirm(false),
      onConfirm: async () => {
        setDeleteConfirm(false);
        await remove();
      }
    }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/initiative.js
function InitiativeView({ view, onRefresh }) {
  const initiative = [...view.initiatives ?? []].sort((left, right) => (RISK_PRIORITY[left.risk] ?? 1) - (RISK_PRIORITY[right.risk] ?? 1))[0];
  const project = view.project;
  const stages = [
    ["verify", "Verify state", "Confirm the project state and evidence source."],
    ["detect", "Detect gap", initiative?.rationale || "Research the highest-value project gap."],
    ["propose", "Create initiative", initiative?.expected_outcome || "Declare the expected outcome."],
    ["prioritise", "Prioritise", `Priority ${number(initiative?.priority ?? 0)} with a recorded rationale.`],
    ["approval", "Human approval", "Owner reviews the risk, evidence and validation contract."],
    ["execute", "Build and verify", validationSummary(initiative?.validation_contract)],
    ["release", "Release", "Release remains bounded by project policy."],
    ["observe", "Observe outcome", "Measure whether the project improved."]
  ];
  const currentIndex = initiative?.status === "pending_approval" ? 4 : ["approved", "executing"].includes(initiative?.status) ? 5 : ["completed", "measured"].includes(initiative?.status) ? 7 : 2;
  const [selectedStage, setSelectedStage] = useState(currentIndex);
  const [freezeState, setFreezeState] = useState(null);
  const [freezeConfirm, setFreezeConfirm] = useState(false);
  const freeze = async () => {
    if (!project) return;
    setFreezeState("freezing");
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/freeze`, { method: "POST", body: {} });
      setFreezeState("frozen");
      onRefresh();
    } catch (failure) {
      setFreezeState(String(failure?.message ?? failure));
    }
  };
  if (!project || !initiative) return jsx(EmptyState, { title: "No initiative available", description: "A project initiative will appear here after it is proposed.", icon: "project" });
  return jsxs("div", { "data-initiative-loop": initiative.ref, children: [
    jsx(PageHead, {
      title: initiative.title,
      description: `${project.id} / ${initiative.ref} / one canonical improvement loop`,
      status: initiative.status || "unknown",
      onRefresh
    }),
    jsxs("div", { className: "dockyard-loop-layout", children: [
      jsxs("section", { className: "dockyard-feature-card dockyard-loop-card", children: [
        jsxs("div", { className: "dockyard-loop-head", children: [
          jsxs("div", { children: [jsx("h2", { children: "Initiative loop" }), jsx("p", { children: "Select a stage to inspect its current evidence and state." })] }),
          jsx(Button, { action: "freeze-project", variant: "danger", disabled: freezeState === "freezing" || freezeState === "frozen", onClick: () => setFreezeConfirm(true), children: freezeState === "freezing" ? "Freezing..." : freezeState === "frozen" ? "Project frozen" : "Freeze project" })
        ] }),
        jsx("div", {
          className: "dockyard-loop-visual-wrap",
          children: jsx("svg", {
            viewBox: "0 0 1010 140",
            role: "img",
            "aria-label": "Initiative stages from verification to observed outcome",
            "data-loop-visual": true,
            children: stages.map(([key, label], index) => {
              const x = 20 + index * 123;
              const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "queued";
              return jsxs(Fragment, { children: [
                index < stages.length - 1 ? jsx("path", { className: `dockyard-loop-edge ${state}`, d: `M${x + 105} 55H${x + 123}` }) : null,
                jsx("rect", { className: `dockyard-loop-node ${state}`, x, y: 30, width: 105, height: 52, rx: 10 }),
                jsx("text", { x: x + 52.5, y: 60, textAnchor: "middle", children: label })
              ] }, key);
            })
          })
        }),
        jsx("div", {
          className: "dockyard-stage-list",
          children: stages.map(([key, label], index) => jsx("button", {
            type: "button",
            className: selectedStage === index ? "active" : "",
            "data-initiative-stage": key,
            onClick: () => setSelectedStage(index),
            children: jsxs(Fragment, { children: [
              jsx("span", { children: number(index + 1) }),
              jsxs("span", { children: [jsx("strong", { children: label }), jsx("small", { children: index < currentIndex ? "Done" : index === currentIndex ? "Current gate" : "Queued" })] })
            ] })
          }, key))
        })
      ] }),
      jsxs("aside", { className: "dockyard-feature-card dockyard-stage-detail", children: [
        jsx("span", { className: "dockyard-card-label", children: "SELECTED STAGE" }),
        jsx("h2", { children: stages[selectedStage][1] }),
        jsx("p", { children: stages[selectedStage][2] }),
        jsxs("div", { className: "dockyard-evidence-details", children: [
          jsx("strong", { children: "Initiative evidence" }),
          jsx("p", { children: initiative.rationale || "No rationale supplied." }),
          jsx("p", { children: `Validation: ${validationSummary(initiative.validation_contract)}` })
        ] }),
        freezeState && !["freezing", "frozen"].includes(freezeState) ? jsx("p", { className: "dockyard-inline-error", children: freezeState }) : null
      ] })
    ] }),
    freezeConfirm ? jsx(ConfirmDialog, {
      confirmKey: "freeze-project",
      title: "Freeze this project?",
      description: "Freezing stops new execution until the project is explicitly resumed.",
      confirmLabel: "Freeze project",
      busy: freezeState === "freezing",
      onCancel: () => setFreezeConfirm(false),
      onConfirm: async () => {
        setFreezeConfirm(false);
        await freeze();
      }
    }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/project/objectives.js
function GoalsManager({ project, goals, objectives, onRefresh }) {
  const [rows, setRows] = useState(goals ?? []);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", objective_ids: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const encoded = encodeURIComponent(project.id);
  const start = (goal = null) => {
    setEditor(goal?.goal_id ?? "new");
    setForm({
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      objective_ids: [...goal?.objective_ids ?? []]
    });
    setError(null);
  };
  const toggleObjective = (objectiveId) => setForm((current) => ({
    ...current,
    objective_ids: current.objective_ids.includes(objectiveId) ? current.objective_ids.filter((value) => value !== objectiveId) : [...current.objective_ids, objectiveId]
  }));
  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, title: form.title.trim(), description: form.description.trim() };
      const saved = editor === "new" ? await api(`/projects/${encoded}/goals`, { method: "POST", body }) : await api(`/projects/${encoded}/goals/${encodeURIComponent(editor)}`, { method: "PATCH", body });
      setRows((current) => editor === "new" ? [...current, saved] : current.map((goal) => goal.goal_id === saved.goal_id ? saved : goal));
      setEditor(null);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const move = async (goalId, direction) => {
    const active2 = rows.filter((goal) => !goal.archived_at).sort((a, b) => a.position - b.position);
    const index = active2.findIndex((goal) => goal.goal_id === goalId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active2.length) return;
    const reordered = [...active2];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusy(true);
    setError(null);
    try {
      const result = await api(`/projects/${encoded}/goals/order`, { method: "PUT", body: { goal_ids: reordered.map((goal) => goal.goal_id) } });
      const archived2 = rows.filter((goal) => goal.archived_at);
      setRows([...result.goals ?? [], ...archived2]);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const lifecycle = async (goal, action) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await api(`/projects/${encoded}/goals/${encodeURIComponent(goal.goal_id)}/${action}`, { method: "POST", body: {} });
      setRows((current) => current.map((item) => item.goal_id === saved.goal_id ? saved : item));
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const objectiveName = (id) => objectives.find((item) => Number(item.id) === Number(id))?.name ?? `Objective ${id}`;
  const active = rows.filter((goal) => !goal.archived_at).sort((a, b) => a.position - b.position);
  const archived = rows.filter((goal) => goal.archived_at);
  return jsxs("section", { className: "dockyard-feature-card", "data-goals-manager": true, children: [
    jsxs("div", { className: "dockyard-section-head", children: [
      jsxs("div", { children: [jsx("span", { className: "dockyard-card-label", children: "GOALS" }), jsx("h2", { children: `${active.length} active` }), jsx("p", { children: "Goals order outcomes. Objectives may stay unlinked." })] }),
      jsx(Button, { action: "add-goal", variant: "primary", small: true, onClick: () => start(), children: "Add goal" })
    ] }),
    editor !== null ? jsxs("div", { className: "dockyard-inline-editor", "data-goal-editor": String(editor), children: [
      jsxs("label", { children: [jsx("span", { children: "Title" }), jsx("input", { "data-goal-field": "title", value: form.title, onChange: (event) => setForm((current) => ({ ...current, title: event.target.value })) })] }),
      jsxs("label", { children: [jsx("span", { children: "Description" }), jsx("textarea", { "data-goal-field": "description", rows: 3, value: form.description, onChange: (event) => setForm((current) => ({ ...current, description: event.target.value })) })] }),
      jsxs("fieldset", { "data-goal-objectives": true, children: [
        jsx("legend", { children: "Linked objectives (optional)" }),
        ...(objectives ?? []).map((objective) => jsxs("label", { children: [jsx("input", { type: "checkbox", value: String(objective.id), checked: form.objective_ids.includes(Number(objective.id)), onChange: () => toggleObjective(Number(objective.id)) }), objective.name] }, String(objective.id)))
      ] }),
      jsxs("div", { className: "dockyard-form-actions", children: [
        jsx(Button, { disabled: busy, onClick: () => setEditor(null), children: "Cancel" }),
        jsx(Button, { action: "save-goal", variant: "primary", disabled: busy || !form.title.trim(), onClick: save, children: busy ? "Saving..." : editor === "new" ? "Create goal" : "Save goal" })
      ] })
    ] }) : null,
    jsx("div", { className: "dockyard-objective-list", children: [...active, ...archived].map((goal, index) => jsxs("article", { "data-goal-row": goal.goal_id, className: goal.archived_at ? "archived" : "", children: [
      jsxs("div", { className: "dockyard-objective-copy", children: [jsxs("span", { children: [jsx("strong", { children: goal.title }), jsx("small", { children: goal.description || "No description supplied." })] }), jsx(StatusTag, { tone: goal.archived_at ? "neutral" : "success", label: goal.archived_at ? "Archived" : `Order ${goal.position + 1}` })] }),
      jsx("p", { children: goal.objective_ids?.length ? `Objectives: ${goal.objective_ids.map(objectiveName).join(", ")}` : "No linked objectives." }),
      jsxs("div", { className: "dockyard-form-actions", children: goal.archived_at ? [
        jsx(Button, { action: "restore-goal", small: true, disabled: busy, onClick: () => lifecycle(goal, "restore"), children: "Restore" }, "restore")
      ] : [
        jsx(Button, { action: "move-goal-up", small: true, disabled: busy || index === 0, onClick: () => move(goal.goal_id, -1), children: "Move up" }, "up"),
        jsx(Button, { action: "move-goal-down", small: true, disabled: busy || index === active.length - 1, onClick: () => move(goal.goal_id, 1), children: "Move down" }, "down"),
        jsx(Button, { action: "edit-goal", small: true, disabled: busy, onClick: () => start(goal), children: "Edit" }, "edit"),
        jsx(Button, { action: "archive-goal", small: true, disabled: busy, onClick: () => lifecycle(goal, "archive"), children: "Archive" }, "archive")
      ] })
    ] }, goal.goal_id)) }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null
  ] });
}
function ObjectivesPanel({ project, settings, objectives, goals, missionArchive, onRefresh }) {
  const [mission, setMission] = useState(settings?.mission ?? "");
  const [missionDraft, setMissionDraft] = useState(settings?.mission ?? "");
  const [missionEditing, setMissionEditing] = useState(false);
  const [history, setHistory] = useState(missionArchive ?? []);
  const [items, setItems] = useState(objectives ?? []);
  const [objectiveEditor, setObjectiveEditor] = useState(null);
  const [objectiveForm, setObjectiveForm] = useState({ name: "", description: "", target: ">=1", severity: "medium" });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [evaluating, setEvaluating] = useState(null);
  const [evaluations, setEvaluations] = useState({});
  const encoded = encodeURIComponent(project.id);
  const startObjective = (objective = null) => {
    setObjectiveEditor(objective?.id ?? "new");
    setObjectiveForm({
      name: objective?.name ?? "",
      description: objective?.description ?? "",
      target: objective?.target ?? ">=1",
      severity: objective?.severity ?? "medium"
    });
    setError(null);
  };
  const saveMission = async () => {
    const clean = missionDraft.trim();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api(`/projects/${encoded}/settings`, { method: "PATCH", body: { mission: clean } });
      setMission(result?.mission ?? clean);
      setMissionDraft(result?.mission ?? clean);
      setMissionEditing(false);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const saveObjective = async () => {
    if (!objectiveForm.name.trim() || !objectiveForm.target.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: objectiveForm.name.trim(),
        description: objectiveForm.description.trim(),
        target: objectiveForm.target.trim(),
        severity: objectiveForm.severity
      };
      if (objectiveEditor === "new") {
        const created = await api(`/projects/${encoded}/objectives`, { method: "POST", body: { ...body, evaluator_type: "manual", window: "30d" } });
        setItems((current) => [...current, created]);
      } else {
        const updated = await api(`/projects/${encoded}/objectives/${objectiveEditor}`, { method: "PATCH", body });
        setItems((current) => current.map((item) => Number(item.id) === Number(objectiveEditor) ? updated : item));
      }
      setObjectiveEditor(null);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const evaluateNow = async (objective) => {
    setEvaluating(objective.id);
    setError(null);
    try {
      const result = await api(`/projects/${encoded}/objectives/${objective.id}/evaluate`, { method: "POST" });
      setEvaluations((current) => ({ ...current, [objective.id]: result }));
      const refreshed = await api(`/projects/${encoded}/objectives`);
      setItems(refreshed.objectives || []);
      const state = result?.result?.state ?? "unknown";
      emitToast(
        state === "passed" ? "success" : "danger",
        `Evaluate now (${objective.name}): ${readableLabel(state, "unknown")}.` + (state === "unknown" ? " No evidence was fabricated \u2014 the objective stays unproven." : "")
      );
      onRefresh?.();
    } catch (failure) {
      setEvaluations((current) => ({ ...current, [objective.id]: { error: String(failure?.message ?? failure) } }));
    }
    setEvaluating(null);
  };
  const applyDestructive = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.type === "archive-mission") {
        const archived = await api(`/projects/${encoded}/mission/archive`, { method: "POST", body: {} });
        setHistory((current) => [archived, ...current]);
        setMission("");
        setMissionDraft("");
        setMissionEditing(false);
      } else if (pending.type === "remove-mission") {
        await api(`/projects/${encoded}/mission`, { method: "DELETE", body: {} });
        setMission("");
        setMissionDraft("");
        setMissionEditing(false);
      } else if (pending.type === "archive-objective") {
        const archived = await api(`/projects/${encoded}/objectives/${pending.id}/archive`, { method: "POST", body: {} });
        setItems((current) => current.map((item) => Number(item.id) === Number(pending.id) ? archived : item));
      } else if (pending.type === "remove-objective") {
        await api(`/projects/${encoded}/objectives/${pending.id}`, { method: "DELETE", body: {} });
        setItems((current) => current.filter((item) => Number(item.id) !== Number(pending.id)));
      }
      setPending(null);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const confirmation = pending ? {
    "archive-mission": {
      key: "archive-mission",
      title: "Archive this mission?",
      description: "The mission moves to history and is removed from the active project.",
      label: "Archive mission"
    },
    "remove-mission": {
      key: "remove-mission",
      title: "Remove this mission?",
      description: "The active mission is cleared without adding it to mission history.",
      label: "Remove mission"
    },
    "archive-objective": {
      key: `archive-objective-${pending.id}`,
      title: "Archive this objective?",
      description: "The objective remains visible in history but stops participating in active evaluation.",
      label: "Archive objective"
    },
    "remove-objective": {
      key: `remove-objective-${pending.id}`,
      title: "Remove this objective?",
      description: "This permanently removes the objective from the project.",
      label: "Remove objective"
    }
  }[pending.type] : null;
  return jsxs("div", { className: "dockyard-objectives-layout", children: [
    jsx(GoalsManager, { project, goals, objectives: items, onRefresh }),
    jsxs("section", { className: "dockyard-feature-card", "data-mission-manager": true, children: [
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [jsx("span", { className: "dockyard-card-label", children: "MISSION" }), jsx("h2", { children: mission || "No active mission" })] }),
        mission ? jsx(StatusTag, { tone: "success", label: "Active" }) : jsx(StatusTag, { tone: "neutral", label: "Not set" })
      ] }),
      missionEditing ? jsxs("div", { className: "dockyard-inline-editor", children: [
        jsx("label", { htmlFor: "dockyard-mission-editor", children: "Mission statement" }),
        jsx("textarea", { id: "dockyard-mission-editor", "data-mission-field": true, rows: 4, value: missionDraft, onInput: (event) => setMissionDraft(event.target.value), onChange: (event) => setMissionDraft(event.target.value) }),
        jsxs("div", { className: "dockyard-form-actions", children: [
          jsx(Button, { disabled: busy, onClick: () => {
            setMissionDraft(mission);
            setMissionEditing(false);
          }, children: "Cancel" }),
          jsx(Button, { action: "save-mission", variant: "primary", disabled: busy || !missionDraft.trim(), onClick: saveMission, children: busy ? "Saving..." : "Save mission" })
        ] })
      ] }) : jsxs("div", { className: "dockyard-form-actions", children: [
        jsx(Button, { action: "edit-mission", onClick: () => {
          setMissionDraft(mission);
          setMissionEditing(true);
        }, children: mission ? "Edit mission" : "Set mission" }),
        mission ? jsx(Button, { action: "archive-mission", variant: "danger", onClick: () => setPending({ type: "archive-mission" }), children: "Archive" }) : null,
        mission ? jsx(Button, { action: "remove-mission", variant: "danger", onClick: () => setPending({ type: "remove-mission" }), children: "Remove" }) : null
      ] }),
      history.length > 0 ? jsxs("div", { className: "dockyard-mission-history", children: [
        jsx("h3", { children: "Mission history" }),
        history.map((entry) => jsxs("article", { children: [
          jsx("strong", { children: entry.mission }),
          jsx("span", { children: `Archived ${formatWhen(entry.archived_at) || "previously"} by ${entry.archived_by || "unknown"}` })
        ] }, entry.archive_id))
      ] }) : null
    ] }),
    jsxs("section", { className: "dockyard-feature-card", children: [
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [jsx("span", { className: "dockyard-card-label", children: "OBJECTIVES" }), jsx("h2", { children: `${number(items.filter((item) => item.enabled !== false).length)} active` })] }),
        jsx(Button, { action: "add-objective", variant: "primary", small: true, onClick: () => startObjective(), children: "Add objective" })
      ] }),
      objectiveEditor !== null ? jsxs("div", { className: "dockyard-inline-editor", "data-objective-editor": String(objectiveEditor), children: [
        jsxs("label", { children: [jsx("span", { children: "Name" }), jsx("input", { "data-objective-field": "name", value: objectiveForm.name, onChange: (event) => setObjectiveForm((current) => ({ ...current, name: event.target.value })) })] }),
        jsxs("label", { children: [jsx("span", { children: "Description" }), jsx("textarea", { "data-objective-field": "description", rows: 3, value: objectiveForm.description, onInput: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })), onChange: (event) => setObjectiveForm((current) => ({ ...current, description: event.target.value })) })] }),
        jsxs("div", { className: "dockyard-settings-grid", children: [
          jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Target" }), jsx("input", { "data-objective-field": "target", value: objectiveForm.target, onChange: (event) => setObjectiveForm((current) => ({ ...current, target: event.target.value })) })] }),
          jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Severity" }), jsx("select", { "data-objective-field": "severity", value: objectiveForm.severity, onChange: (event) => setObjectiveForm((current) => ({ ...current, severity: event.target.value })), children: ["info", "low", "medium", "high"].map((value) => jsx("option", { value, children: readableLabel(value) }, value)) })] })
        ] }),
        jsxs("div", { className: "dockyard-form-actions", children: [
          jsx(Button, { disabled: busy, onClick: () => setObjectiveEditor(null), children: "Cancel" }),
          jsx(Button, { action: "save-objective", variant: "primary", disabled: busy || !objectiveForm.name.trim() || !objectiveForm.target.trim(), onClick: saveObjective, children: busy ? "Saving..." : objectiveEditor === "new" ? "Create objective" : "Save objective" })
        ] })
      ] }) : null,
      items.length > 0 ? jsx("div", { className: "dockyard-objective-list", children: items.map((objective) => jsxs("article", { "data-objective-row": objective.id, className: objective.enabled === false ? "archived" : "", children: [
        jsxs("div", { className: "dockyard-objective-copy", children: [
          jsxs("span", { children: [jsx("strong", { children: objective.name }), jsx("small", { children: objective.description || "No description supplied." })] }),
          jsx(StatusTag, { tone: objective.enabled === false ? "neutral" : severityTone(objective.severity), label: objective.enabled === false ? "Archived" : readableLabel(objective.severity) })
        ] }),
        jsx("p", { children: `Target ${objective.target} / ${readableLabel(objective.evaluator_type, "Manual")} / ${objective.window || "30d"}` }),
        jsx(ObjectiveEvidence, { objective, projectId: project.id, onSaved: async () => {
          const refreshed = await api(`/projects/${encoded}/objectives`);
          setItems(refreshed.objectives || []);
          onRefresh?.();
        } }),
        jsxs("div", { className: "dockyard-objective-evaluate", children: [
          jsx("button", { type: "button", className: "dockyard-button small", "data-action": "evaluate-objective", "data-objective-id": objective.id, disabled: objective.enabled === false || evaluating === objective.id, onClick: () => evaluateNow(objective), children: evaluating === objective.id ? "Evaluating..." : "Evaluate now" }),
          jsx("span", { className: "dockyard-meta", children: "Evaluates this objective only. The full stewardship cycle is a separate action." })
        ] }),
        evaluations[objective.id] ? evaluations[objective.id].error ? jsx("p", { className: "dockyard-inline-error", role: "alert", "data-objective-evaluation": objective.id, children: evaluations[objective.id].error }) : jsx("p", { className: "dockyard-meta", "data-objective-evaluation": objective.id, children: [
          `Last evaluation: ${readableLabel(evaluations[objective.id].result?.state, "unknown")}`,
          evaluations[objective.id].result?.measured != null ? ` / measured ${evaluations[objective.id].result.measured}` : "",
          evaluations[objective.id].result?.detail ? ` / ${evaluations[objective.id].result.detail}` : "",
          evaluations[objective.id].recorded === false ? " (no new evidence recorded)" : ""
        ].join("") }) : null,
        jsxs("div", { className: "dockyard-form-actions", children: [
          objective.enabled !== false ? jsx("button", { type: "button", className: "dockyard-button small", "data-action": "edit-objective", "data-objective-id": objective.id, onClick: () => startObjective(objective), children: "Edit" }) : null,
          objective.enabled !== false ? jsx("button", { type: "button", className: "dockyard-button danger small", "data-action": "archive-objective", "data-objective-id": objective.id, onClick: () => setPending({ type: "archive-objective", id: objective.id }), children: "Archive" }) : null,
          jsx("button", { type: "button", className: "dockyard-button danger small", "data-action": "remove-objective", "data-objective-id": objective.id, onClick: () => setPending({ type: "remove-objective", id: objective.id }), children: "Remove" })
        ] })
      ] }, String(objective.id))) }) : jsx("p", { className: "dockyard-meta", children: "No objectives are configured." })
    ] }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
    confirmation ? jsx(ConfirmDialog, { confirmKey: confirmation.key, title: confirmation.title, description: confirmation.description, confirmLabel: confirmation.label, busy, onConfirm: applyDestructive, onCancel: () => setPending(null) }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/project/content.js
function ProjectContentPanel({ project, content, onRefresh }) {
  const [items, setItems] = useState(content ?? []);
  const [selected, setSelected] = useState(null);
  const [previewState, setPreviewState] = useState("idle");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [contentAction, setContentAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const encoded = encodeURIComponent(project.id);
  const openPreview = async (item) => {
    setSelected(item);
    setPreviewState("loading");
    setError(null);
    try {
      const result = await api(`/projects/${encoded}/content/${encodeURIComponent(item.content_id)}/preview`);
      setSelected(result);
      setPreviewState("ready");
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
  };
  const upload = async () => {
    if (!file || file.size <= 0 || file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    setError(null);
    try {
      const extension = file.name.toLowerCase().split(".").pop();
      const mediaType = file.type || { txt: "text/plain", md: "text/markdown", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[extension];
      if (!mediaType) throw new Error("Choose a text, Markdown, PDF, PNG, JPEG or WebP file.");
      const contentBase64 = await fileAsBase64(file);
      const created = await api(`/projects/${encoded}/content`, {
        method: "POST",
        body: { filename: file.name, media_type: mediaType, content_base64: contentBase64 }
      });
      setItems((current) => [created, ...current.filter((item) => item.content_id !== created.content_id)]);
      setFile(null);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setUploading(false);
  };
  const applyContentAction = async () => {
    if (!selected || !contentAction) return;
    setActionBusy(true);
    setError(null);
    try {
      const cid = encodeURIComponent(selected.content_id);
      if (contentAction === "remove") {
        const dependencyResult = await api(`/projects/${encoded}/content/${cid}/dependencies`);
        if ((dependencyResult.dependencies ?? []).length > 0) throw new Error("Removal blocked: this content is still referenced.");
        await api(`/projects/${encoded}/content/${cid}`, { method: "DELETE" });
      } else {
        await api(`/projects/${encoded}/content/${cid}/${contentAction}`, { method: "POST", body: {} });
      }
      const refreshed = await api(`/projects/${encoded}/content`);
      setItems(refreshed.content ?? []);
      setSelected(null);
      setPreviewState("idle");
      setContentAction(null);
      emitToast("success", `Content ${contentAction === "remove" ? "removed" : `${contentAction}d`}.`);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setActionBusy(false);
  };
  return jsxs("div", { className: "dockyard-content-layout", "data-project-content": project.id, children: [
    jsxs("section", { className: "dockyard-feature-card", children: [
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [jsx("h2", { children: "Project documentation" }), jsx("p", { children: "Supporting files linked to this project." })] }),
        jsx(StatusTag, { tone: "neutral", label: `${number(items.length)} ${plural(items.length, "file")}` })
      ] }),
      items.length > 0 ? jsx("div", { className: "dockyard-content-list", children: items.map((item) => jsxs("button", { type: "button", "data-project-content-item": item.content_id, onClick: () => openPreview(item), children: [
        jsxs("span", { children: [jsx("strong", { children: item.filename }), jsx("small", { children: `${mediaTypeLabel(item.media_type)} / ${formatBytes(item.size_bytes)} / ${formatWhen(item.uploaded_at) || "Uploaded"}` })] }),
        jsx(Icon, { name: "chevron" })
      ] }, item.content_id)) }) : jsx("p", { className: "dockyard-meta", children: "No supporting content uploaded yet." }),
      jsxs("div", { className: "dockyard-upload-panel", children: [
        jsxs("label", { className: "dockyard-upload-dropzone", children: [
          jsx("span", { children: file ? file.name : "Choose supporting content" }),
          jsx("small", { children: file ? `${formatBytes(file.size)} selected` : "Text, Markdown, PDF or image. Maximum 5 MB." }),
          jsx("input", { type: "file", "data-content-file": true, accept: ".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp", onChange: (event) => {
            setFile(event.target.files?.[0] ?? null);
            setError(null);
          } })
        ] }),
        jsx(Button, { action: "upload-project-content", variant: "primary", disabled: uploading || !file || file.size <= 0 || file.size > 5 * 1024 * 1024, onClick: upload, children: uploading ? "Uploading..." : "Upload content" })
      ] }),
      file && file.size > 5 * 1024 * 1024 ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: "This file exceeds the 5 MB limit." }) : null,
      error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null
    ] }),
    jsxs("aside", { className: "dockyard-feature-card dockyard-content-preview-card", children: [
      jsx("span", { className: "dockyard-card-label", children: "PREVIEW" }),
      selected ? jsx("h2", { children: selected.filename }) : jsx("h2", { children: "Select a document" }),
      previewState === "loading" ? jsx("p", { children: "Loading preview..." }) : null,
      previewState === "ready" && selected?.preview_kind === "text" ? jsx("pre", { "data-content-preview": true, className: "dockyard-content-preview", children: selected.text || "This text file is empty." }) : previewState === "ready" ? jsx("div", { "data-content-preview": true, className: "dockyard-report-placeholder", children: `Preview is not available for ${mediaTypeLabel(selected?.media_type)}. File metadata remains visible.` }) : previewState === "idle" ? jsx("p", { className: "dockyard-meta", children: "Text and Markdown files can be read here. Other formats show verified metadata." }) : null,
      selected ? jsxs("div", { className: "dockyard-form-actions", children: [
        selected.archived_at ? jsx(Button, { action: "restore-project-content", disabled: actionBusy, onClick: () => setContentAction("restore"), children: "Restore" }) : jsx(Button, { action: "archive-project-content", disabled: actionBusy, onClick: () => setContentAction("archive"), children: "Archive" }),
        jsx(Button, { action: "remove-project-content", variant: "danger", disabled: actionBusy, onClick: () => setContentAction("remove"), children: "Remove file" })
      ] }) : null
    ] }),
    contentAction ? jsx(ConfirmDialog, {
      confirmKey: `content-${contentAction}`,
      title: `${contentAction === "remove" ? "Remove" : readableLabel(contentAction)} this content?`,
      description: contentAction === "remove" ? "The managed file is deleted only after authority, dependency, containment and identity checks pass." : "The content record and history are retained.",
      confirmLabel: contentAction === "remove" ? "Remove managed file" : readableLabel(contentAction),
      busy: actionBusy,
      onConfirm: applyContentAction,
      onCancel: () => setContentAction(null)
    }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/download.js
var MAX_SEGMENT = 60;
function safeFilenameSegment(value, fallback = "") {
  const cleaned = String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]+/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[-._]+/, "").replace(/[-._]+$/, "");
  return cleaned.slice(0, MAX_SEGMENT) || fallback;
}
function reportDownloadFilename(projectId, report) {
  const reportId = safeFilenameSegment(report?.report_id, "");
  const title = safeFilenameSegment(report?.title, "");
  const project = safeFilenameSegment(projectId, "project");
  const parts = [project, title, reportId].filter(Boolean);
  if (parts.length === 0) parts.push("report");
  return `${parts.join("-")}.md`;
}
function downloadTextFile(content, filename, mediaType = "text/markdown;charset=utf-8") {
  const doc = typeof globalThis !== "undefined" ? globalThis.document : null;
  if (!doc || !doc.body) return false;
  const blob = new Blob([String(content ?? "")], { type: mediaType });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  const revoke = () => URL.revokeObjectURL(url);
  if (typeof setTimeout === "function") setTimeout(revoke, 4e3);
  else revoke();
  return true;
}

// hermes_dockyard_plugin/desktop/src/project/panels.js
function ProjectSettingsPanel({ project, settings, onRefresh, onDirty }) {
  const buildForm = () => ({
    mission: settings?.mission ?? "",
    leadProfile: settings?.owner?.lead_profile ?? "",
    members: (settings?.owner?.member_profiles ?? []).join(", "),
    autonomyLevel: String(settings?.autonomy_level ?? 0),
    humanGateRisk: settings?.policies?.autonomy?.human_gate_risk ?? "medium",
    autoStartLowRisk: Boolean(settings?.policies?.autonomy?.auto_start_low_risk),
    requireTests: settings?.policies?.verification?.require_tests !== false,
    maxOpenInitiatives: String(settings?.policies?.verification?.max_open_initiatives ?? 3),
    requireRollback: settings?.policies?.release?.require_rollback !== false,
    soakHours: String(settings?.policies?.release?.soak_hours ?? 24),
    severityThreshold: settings?.policies?.notification?.severity_threshold ?? "medium",
    digest: settings?.policies?.notification?.digest ?? "daily"
  });
  const [form, setForm] = useState(buildForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingLifecycle, setPendingLifecycle] = useState(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleState, setLifecycleState] = useState(settings);
  useEffect(() => {
    onDirty?.(editing && JSON.stringify(form) !== JSON.stringify(buildForm()));
  }, [form, editing, onDirty]);
  useEffect(() => {
    if (!pendingLifecycle) return void 0;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !lifecycleBusy) setPendingLifecycle(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingLifecycle, lifecycleBusy]);
  const enabled = lifecycleState?.enabled !== false;
  const phase = lifecycleState?.phase || project.phase || "unknown";
  const lifecycleCopy = {
    enable: { endpoint: "re-enable", label: "Enable", past: "enabled" },
    disable: { endpoint: "disable", label: "Disable", past: "disabled" },
    pause: { endpoint: "pause", label: "Pause", past: "paused" },
    resume: { endpoint: "resume", label: "Resume", past: "resumed" },
    freeze: { endpoint: "freeze", label: "Freeze", past: "frozen" },
    archive: { endpoint: "archive", label: "Archive", past: "archived" },
    restore: { endpoint: "restore", label: "Restore", past: "restored" }
  };
  const archived = Boolean(lifecycleState?.archived_at);
  const lifecycleActions = archived ? ["restore"] : !enabled ? ["enable"] : phase === "active" ? ["pause", "freeze", "archive", "disable"] : phase === "paused" ? ["resume", "freeze", "archive", "disable"] : phase === "frozen" ? ["resume", "archive", "disable"] : ["disable"];
  const update = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    onDirty?.(editing && JSON.stringify(next) !== JSON.stringify(buildForm()));
    return next;
  });
  const save = async () => {
    if (!enabled || !editing) return;
    setSaving(true);
    setMessage(null);
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/settings`, {
        method: "PATCH",
        body: {
          mission: form.mission.trim(),
          lead_profile: form.leadProfile.trim(),
          member_profiles: form.members.split(",").map((value) => value.trim()).filter(Boolean),
          autonomy_level: Number(form.autonomyLevel),
          autonomy_policy: {
            human_gate_risk: form.humanGateRisk,
            auto_start_low_risk: form.autoStartLowRisk
          },
          verification_policy: {
            require_tests: form.requireTests,
            max_open_initiatives: Number(form.maxOpenInitiatives)
          },
          release_policy: {
            require_rollback: form.requireRollback,
            soak_hours: Number(form.soakHours)
          },
          notification_policy: {
            severity_threshold: form.severityThreshold,
            digest: form.digest
          }
        }
      });
      setMessage({ tone: "success", text: "Project configuration saved." });
      setEditing(false);
      onDirty?.(false);
      onRefresh?.();
    } catch (failure) {
      setMessage({ tone: "danger", text: String(failure?.message ?? failure) });
    }
    setSaving(false);
  };
  const confirmLifecycle = async () => {
    const config = lifecycleCopy[pendingLifecycle];
    if (!config) return;
    setLifecycleBusy(true);
    setMessage(null);
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/${config.endpoint}`, { method: "POST", body: {} });
      const readback = await api(`/projects/${encodeURIComponent(project.id)}/settings`);
      setLifecycleState(readback);
      if (readback.enabled === false) setEditing(false);
      setPendingLifecycle(null);
      emitToast("success", `Project ${config.past}.`);
      onRefresh?.();
    } catch (failure) {
      setMessage({ tone: "danger", text: String(failure?.message ?? failure) });
    }
    setLifecycleBusy(false);
  };
  return jsxs("section", { className: "dockyard-feature-card dockyard-settings-card", "data-project-settings-form": true, children: [
    jsxs("header", { className: "dockyard-section-head", children: [
      jsxs("div", { children: [jsx("h2", { children: "Project configuration" }), jsx("p", { children: "Ownership, autonomy, verification, release and notification boundaries." })] }),
      jsxs("div", { className: "dockyard-project-state-summary", children: [
        jsx("span", { "data-project-enabled-state": true, children: jsx(StatusTag, { tone: enabled ? "success" : "neutral", label: enabled ? "Enabled" : "Disabled" }) }),
        jsx("span", { "data-project-phase-state": true, children: jsx(StatusTag, { tone: phase === "active" ? "success" : "warning", label: phase.charAt(0).toUpperCase() + phase.slice(1) }) })
      ] })
    ] }),
    jsxs("section", { className: "dockyard-lifecycle-panel", "data-project-lifecycle": true, children: [
      jsxs("header", { children: [
        jsxs("div", { children: [jsx("h3", { children: "Project lifecycle" }), jsx("p", { children: enabled ? "Only actions valid for the current phase are available." : "Configuration remains readable while the project is disabled." })] }),
        jsx("div", { className: "dockyard-lifecycle-actions", children: lifecycleActions.map((action) => jsx("button", {
          type: "button",
          className: `dockyard-button small${["disable", "freeze", "archive"].includes(action) ? " danger" : ["enable", "restore"].includes(action) ? " primary" : ""}`,
          "data-lifecycle-action": action,
          disabled: lifecycleBusy,
          onClick: () => setPendingLifecycle(action),
          children: lifecycleCopy[action].label
        }, action)) })
      ] })
    ] }),
    jsxs("fieldset", { className: "dockyard-settings-grid dockyard-settings-fieldset", disabled: !enabled || !editing, children: [
      jsxs("div", { className: "dockyard-settings-category", children: [
        jsx("div", { className: "dockyard-settings-category-label", children: "General" }),
        jsxs("label", { className: "dockyard-field dockyard-field-wide", children: [
          jsx("span", { children: "Mission" }),
          jsx("textarea", { "data-setting-field": "mission", rows: 3, value: form.mission, onInput: (event) => update("mission", event.target.value), onChange: (event) => update("mission", event.target.value) })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Lead profile" }),
          jsx("input", { "data-setting-field": "lead-profile", value: form.leadProfile, onChange: (event) => update("leadProfile", event.target.value) })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Member profiles" }),
          jsx("input", { "data-setting-field": "members", value: form.members, placeholder: "bot-a, bot-b", onChange: (event) => update("members", event.target.value) })
        ] })
      ] }),
      jsxs("div", { className: "dockyard-settings-category", children: [
        jsx("div", { className: "dockyard-settings-category-label", children: "Autonomy & verification" }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Autonomy level" }),
          jsx("select", {
            "data-setting-field": "autonomy",
            value: form.autonomyLevel,
            onChange: (event) => update("autonomyLevel", event.target.value),
            children: [0, 1, 2, 3, 4, 5].map((level) => jsx("option", { value: String(level), children: `${level} / ${level === 0 ? "manual" : level === 5 ? "bounded maximum" : "bounded"}` }, String(level)))
          })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Human gate from risk" }),
          jsx("select", {
            value: form.humanGateRisk,
            onChange: (event) => update("humanGateRisk", event.target.value),
            children: ["low", "medium", "high", "critical"].map((risk) => jsx("option", { value: risk, children: risk }, risk))
          })
        ] }),
        jsxs("label", { className: "dockyard-check-field", children: [
          jsx("input", { type: "checkbox", checked: form.autoStartLowRisk, onChange: (event) => update("autoStartLowRisk", event.target.checked) }),
          jsxs("span", { children: [jsx("strong", { children: "Auto-start low-risk work" }), jsx("small", { children: "Only inside the declared autonomy boundary." })] })
        ] }),
        jsxs("label", { className: "dockyard-check-field", children: [
          jsx("input", { type: "checkbox", "data-setting-field": "require-tests", checked: form.requireTests, onChange: (event) => update("requireTests", event.target.checked) }),
          jsxs("span", { children: [jsx("strong", { children: "Require test evidence" }), jsx("small", { children: "Block verification without a test result." })] })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Maximum open initiatives" }),
          jsx("input", { type: "number", min: 1, max: 25, value: form.maxOpenInitiatives, onChange: (event) => update("maxOpenInitiatives", event.target.value) })
        ] })
      ] }),
      jsxs("div", { className: "dockyard-settings-category", children: [
        jsx("div", { className: "dockyard-settings-category-label", children: "Release & notifications" }),
        jsxs("label", { className: "dockyard-check-field", children: [
          jsx("input", { type: "checkbox", checked: form.requireRollback, onChange: (event) => update("requireRollback", event.target.checked) }),
          jsxs("span", { children: [jsx("strong", { children: "Require rollback plan" }), jsx("small", { children: "Every release must declare its recovery path." })] })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Soak period in hours" }),
          jsx("input", { type: "number", min: 0, max: 720, "data-setting-field": "soak-hours", value: form.soakHours, onChange: (event) => update("soakHours", event.target.value) })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Alert threshold" }),
          jsx("select", {
            value: form.severityThreshold,
            onChange: (event) => update("severityThreshold", event.target.value),
            children: ["info", "low", "medium", "high", "critical"].map((severity) => jsx("option", { value: severity, children: severity }, severity))
          })
        ] }),
        jsxs("label", { className: "dockyard-field", children: [
          jsx("span", { children: "Notification cadence" }),
          jsx("select", {
            "data-setting-field": "digest",
            value: form.digest,
            onChange: (event) => update("digest", event.target.value),
            children: ["immediate", "daily", "weekly", "off"].map((cadence) => jsx("option", { value: cadence, children: cadence }, cadence))
          })
        ] })
      ] })
    ] }),
    message ? jsx("p", { className: message.tone === "danger" ? "dockyard-inline-error" : "dockyard-inline-success", role: "status", children: message.text }) : null,
    enabled ? jsx("div", {
      className: "dockyard-form-actions",
      children: editing ? jsxs(Fragment, { children: [
        jsx(Button, { action: "cancel-project-settings", disabled: saving, onClick: () => {
          setForm(buildForm());
          setEditing(false);
          onDirty?.(false);
          setMessage(null);
        }, children: "Cancel" }),
        jsx(Button, { action: "save-project-settings", variant: "primary", disabled: saving || !form.mission.trim(), onClick: save, children: saving ? "Saving..." : "Save configuration" })
      ] }) : jsx(Button, { action: "edit-project-settings", variant: "primary", onClick: () => {
        setForm(buildForm());
        setEditing(true);
        onDirty?.(false);
        setMessage(null);
      }, children: "Edit configuration" })
    }) : jsx("p", { className: "dockyard-meta", children: "Enable this project before editing its configuration." }),
    jsxs("section", { className: "dockyard-modal-layer", "data-lifecycle-confirm": true, hidden: !pendingLifecycle, children: [
      jsxs("div", { className: "dockyard-modal", role: "dialog", "aria-modal": true, "aria-labelledby": "dockyard-lifecycle-title", children: [
        jsx("h2", { id: "dockyard-lifecycle-title", children: `${lifecycleCopy[pendingLifecycle]?.label || "Change"} project?` }),
        jsx("p", { children: pendingLifecycle === "archive" ? `This archives ${project.id} in stewardship only. The canonical project, board, tasks and repository remain untouched and available for explicit restore.` : `This changes ${project.id} from its current ${enabled ? "enabled" : "disabled"} and ${phase} state.` }),
        jsxs("div", { className: "dockyard-modal-actions", children: [
          jsx(Button, { disabled: lifecycleBusy, onClick: () => setPendingLifecycle(null), children: "Cancel" }),
          jsx(Button, { action: "confirm-lifecycle-action", variant: ["disable", "freeze", "archive"].includes(pendingLifecycle) ? "danger" : "primary", disabled: lifecycleBusy, onClick: confirmLifecycle, children: lifecycleBusy ? "Applying..." : `Confirm ${lifecycleCopy[pendingLifecycle]?.label || "change"}` })
        ] })
      ] })
    ] })
  ] });
}
function ProjectReportsPanel({ project, reports, onRefresh }) {
  const [reportType, setReportType] = useState("executive");
  const [includeActivity, setIncludeActivity] = useState(true);
  const [history, setHistory] = useState(reports);
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const loadReport = async (reportId) => {
    setError(null);
    try {
      setSelected(await api(`/projects/${encodeURIComponent(project.id)}/reports/${encodeURIComponent(reportId)}`));
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
  };
  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const report = await api(`/projects/${encodeURIComponent(project.id)}/reports`, {
        method: "POST",
        body: { report_type: reportType, include_activity: includeActivity }
      });
      setSelected(report);
      setHistory((current) => [report, ...current.filter((item) => item.report_id !== report.report_id)]);
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setGenerating(false);
  };
  const copy = async () => {
    const copied = selected?.content && _os?.writeClipboard ? await _os.writeClipboard(selected.content) : false;
    emitToast(copied ? "success" : "danger", copied ? "Report copied to clipboard" : "Clipboard is unavailable");
  };
  const download = () => {
    if (!selected?.content) return;
    const filename = reportDownloadFilename(project.id, selected);
    const started = downloadTextFile(selected.content, filename);
    emitToast(
      started ? "success" : "danger",
      started ? `Downloading ${filename}` : "Download could not start in this environment"
    );
  };
  return jsxs("section", { className: "dockyard-reports-layout", "data-project-reports": true, children: [
    jsxs("div", { className: "dockyard-feature-card dockyard-report-builder", children: [
      jsx("h2", { children: "Generate report" }),
      jsx("p", { children: "Create a durable Markdown snapshot from canonical project data." }),
      jsxs("label", { className: "dockyard-field", children: [
        jsx("span", { children: "Report type" }),
        jsx("select", { "data-report-type": true, value: reportType, onChange: (event) => setReportType(event.target.value), children: [
          jsx("option", { value: "executive", children: "Executive summary" }, "executive"),
          jsx("option", { value: "delivery", children: "Delivery report" }, "delivery"),
          jsx("option", { value: "risk", children: "Risk and decisions" }, "risk"),
          jsx("option", { value: "full", children: "Full project report" }, "full")
        ] })
      ] }),
      jsxs("label", { className: "dockyard-check-field", children: [
        jsx("input", { type: "checkbox", checked: includeActivity, onChange: (event) => setIncludeActivity(event.target.checked) }),
        jsxs("span", { children: [jsx("strong", { children: "Include recent activity" }), jsx("small", { children: "Includes attributed project events only." })] })
      ] }),
      error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
      jsx(Button, { action: "generate-report", variant: "primary", disabled: generating, onClick: generate, children: generating ? "Generating..." : "Generate report" }),
      jsxs("div", { className: "dockyard-report-history-list", children: [
        jsx("h3", { children: "Report history" }),
        history.length > 0 ? history.map((report) => jsxs("button", { type: "button", "data-report-history": report.report_id, className: selected?.report_id === report.report_id ? "active" : "", onClick: () => loadReport(report.report_id), children: [
          jsxs("span", { children: [jsx("strong", { children: report.title }), jsx("small", { children: `${report.report_type} / ${formatWhen(report.generated_at)}` })] }),
          jsx(Icon, { name: "chevron" })
        ] }, report.report_id)) : jsx("p", { className: "dockyard-meta", children: "No generated reports yet." })
      ] })
    ] }),
    jsxs("article", { className: "dockyard-feature-card dockyard-report-preview-card", children: [
      jsxs("header", { children: [
        jsxs("div", { children: [jsx("span", { className: "dockyard-card-label", children: "REPORT PREVIEW" }), jsx("h2", { children: selected?.title || "Generate or open a report" })] }),
        selected?.content ? jsx(Button, { action: "download-report", small: true, onClick: download, children: "Download Markdown" }) : null,
        selected?.content ? jsx(Button, { action: "copy-report", small: true, onClick: copy, children: "Copy Markdown" }) : null
      ] }),
      selected?.content ? jsx("pre", { className: "dockyard-report-preview", "data-report-preview": true, children: selected.content }) : jsxs("div", { className: "dockyard-report-placeholder", children: [jsx(Icon, { name: "project" }), jsx("p", { children: "The report preview will appear here." })] })
    ] })
  ] });
}

// hermes_dockyard_plugin/desktop/src/project/dashboard.js
function ProjectDashboard({ view, onSelectProject, onRefresh, onProjectDirty, pendingWorkRef, onPendingWorkConsumed, notice, initialView, onOpenLibrary, onOpenRoadmap }) {
  const [projectView, setProjectView] = useState(initialView || "overview");
  const [canvasDirty, setCanvasDirty] = useState(false);
  const [pendingView, setPendingView] = useState(null);
  const changeView = (key) => {
    if (key === projectView) return;
    if (projectView === "planning" && canvasDirty) {
      setPendingView(key);
      return;
    }
    setProjectView(key);
  };
  const canvasSaver = useRef(null);
  const [viewSaving, setViewSaving] = useState(false);
  const onCanvasDirty = (dirty, saver) => {
    setCanvasDirty(dirty);
    canvasSaver.current = dirty ? saver : null;
    onProjectDirty?.(dirty, dirty ? saver : null);
  };
  useDialogFocusManager(pendingView ? "[data-view-switch-confirm] .dockyard-modal" : null);
  const leaveView = (next) => {
    setPendingView(null);
    setCanvasDirty(false);
    canvasSaver.current = null;
    onProjectDirty?.(false);
    setProjectView(next);
  };
  const saveThenLeave = async () => {
    const next = pendingView;
    if (!next || !canvasSaver.current) return;
    setViewSaving(true);
    const ok = await canvasSaver.current();
    setViewSaving(false);
    if (ok) leaveView(next);
    else if (!canvasSaver.current) setPendingView(null);
  };
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [workNotice, setWorkNotice] = useState(null);
  const [appliedView, setAppliedView] = useState(null);
  const [draggedRef, setDraggedRef] = useState(null);
  const [moving, setMoving] = useState(false);
  const moveLock = useRef(false);
  const project = view.project;
  useEffect(() => {
    if (initialView) setProjectView(initialView);
  }, [initialView]);
  useEffect(() => {
    if (!pendingWorkRef || !project) return;
    const target = (view.workItems ?? []).find((item) => item.ref === pendingWorkRef);
    setWorkNotice(target ? null : `Work item ${pendingWorkRef} is not in this project's board data.`);
    if (target) setProjectView("board");
    setSelectedWorkItem(target ?? null);
    onPendingWorkConsumed?.();
  }, [pendingWorkRef]);
  if (!project && view.missingProject) {
    return jsxs("section", { className: "dockyard-deep-link-miss", "data-deep-link-miss": view.missingProject, children: [
      jsx("p", { className: "dockyard-inline-error", role: "alert", children: `Project ${view.missingProject} no longer exists or is not connected. Nothing was substituted.` }),
      jsx(Button, { onClick: () => onSelectProject?.((view.projects ?? [])[0]?.id ?? null), children: "Back to fleet" })
    ] });
  }
  if (!project) return jsx(EmptyState, { title: "No project selected", description: "Connect a project before opening the project dashboard.", icon: "project" });
  const [healthTone, healthLabel] = healthDetails(project.health);
  const views = [
    ["overview", "Overview"],
    ["board", "Kanban"],
    ["objectives", "Objectives"],
    ["planning", "Planning"],
    ["workflows", "Workflows"],
    ["content", "Content"],
    ["activity", "Activity"],
    ["initiative", "Initiatives"],
    ["reports", "Reports"],
    ["settings", "Settings"]
  ];
  const columns = [
    ["backlog", "Backlog", ["backlog"]],
    ["active", "In progress", ["in_progress", "executing", "active"]],
    ["review", "Review", ["in_review", "review"]],
    ["blocked", "Blocked", ["blocked"]],
    ["done", "Done", ["done", "complete", "completed"]],
    ["other", "Other states", null]
  ];
  const projectOptions = view.projects ?? [];
  const transitionStatus = async (ref, status) => {
    if (!project || !ref || !status || moveLock.current || !(view.workItems ?? []).some((item) => item.ref === ref)) return;
    moveLock.current = true;
    setMoving(true);
    setDraggedRef(null);
    setWorkNotice(null);
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/work-items/${encodeURIComponent(ref)}/transition`, {
        method: "POST",
        body: { status }
      });
      const readback = await api(`/projects/${encodeURIComponent(project.id)}/work-items`);
      if (!(readback.work_items ?? []).some((item) => item.ref === ref && item.status === status)) throw new Error("Canonical readback did not confirm the requested status");
      if (appliedView) {
        const result = await api(`/projects/${encodeURIComponent(project.id)}/views/${encodeURIComponent(appliedView.name)}/items`);
        setAppliedView((current) => current?.name === appliedView.name ? { ...current, items: result.items ?? [] } : current);
      }
      onRefresh?.();
      emitToast("success", `Work item moved to ${status.replaceAll("_", " ")}.`);
    } catch (failure) {
      setWorkNotice(`Could not complete move or refresh: ${String(failure?.message ?? failure)}. Refresh to confirm the canonical state before retrying.`);
      onRefresh?.();
    } finally {
      moveLock.current = false;
      setMoving(false);
    }
  };
  let panel;
  if (projectView === "board") {
    const boardItems = appliedView ? appliedView.items ?? [] : view.workItems ?? [];
    const layout = appliedView?.layout ?? "board";
    panel = jsxs("div", { className: "dockyard-board-wrap", "data-applied-view": appliedView?.name ?? void 0, children: [
      appliedView ? jsxs("div", { className: "dockyard-view-only-note", "data-applied-view-note": appliedView.name, children: [
        jsx(Icon, { name: "eye" }),
        jsx("span", { children: `Showing saved view "${appliedView.name}" (${readableLabel(layout, "Board")} layout${layout === "timeline" ? " \u2014 timeline is not available on Desktop, showing board" : ""}). ${number(boardItems.length)} matching ${plural(boardItems.length, "item")}.` }),
        jsx("button", { type: "button", className: "dockyard-button small", "data-action": "clear-applied-view", onClick: () => setAppliedView(null), children: "Clear view" })
      ] }) : jsxs("div", { className: "dockyard-view-only-note", "data-kanban-help": true, children: [
        jsx(Icon, { name: "eye" }),
        jsx("span", { children: "Drag an item to move it, or use its Move menu. The canonical work system validates every transition." })
      ] }),
      layout === "table" ? jsxs("section", { className: "dockyard-feature-card", children: [
        jsx("h2", { children: "Work items" }),
        boardItems.length === 0 ? jsx("p", { className: "dockyard-meta", "data-work-table-empty": true, children: "No work items match this saved view." }) : jsxs("table", { className: "dockyard-backlog-table", "data-work-table": true, children: [
          jsx("thead", { children: jsxs("tr", { children: ["Ref", "Title", "Type", "Status", "Assignee"].map((heading) => jsx("th", { children: heading }, heading)) }) }),
          jsx("tbody", { children: boardItems.filter((item) => item.status !== "archived").map((item) => jsxs("tr", { "data-work-row": item.ref, children: [
            jsx("td", { children: item.ref }),
            jsx("td", { children: item.title }),
            jsx("td", { children: item.type || "task" }),
            jsx("td", { children: item.status || "unknown" }),
            jsx("td", { children: item.assignee || "Unassigned" })
          ] }, item.ref)) })
        ] })
      ] }) : jsx("div", {
        className: "dockyard-board",
        children: columns.map(([key, label, statuses]) => {
          const items = statuses === null ? boardItems.filter((item) => item.status !== "archived" && !["backlog", "in_progress", "executing", "active", "in_review", "review", "blocked", "done", "complete", "completed"].includes(item.status)) : boardItems.filter((item) => item.status !== "archived" && statuses.includes(item.status));
          return jsxs("section", {
            className: "dockyard-board-column",
            "data-board-column": key,
            onDragOver: (event) => {
              if (draggedRef?.project === project.id && !moving && statuses) event.preventDefault();
            },
            onDrop: (event) => {
              event.preventDefault();
              if (draggedRef?.project === project.id && statuses?.[0]) transitionStatus(draggedRef.ref, statuses[0]);
              setDraggedRef(null);
            },
            children: [
              jsxs("header", { children: [jsx("h3", { children: label }), jsx("span", { children: number(items.length) })] }),
              jsx("div", {
                className: "dockyard-board-cards",
                children: items.length > 0 ? items.map((item) => jsxs("article", {
                  className: "dockyard-work-card",
                  draggable: !moving,
                  "data-work-card": item.ref,
                  onDragStart: (event) => {
                    event.dataTransfer.setData("text/plain", item.ref);
                    setDraggedRef({ ref: item.ref, project: project.id });
                  },
                  onDragEnd: () => setDraggedRef(null),
                  children: [
                    jsx("button", { type: "button", className: "dockyard-button small", onClick: () => setSelectedWorkItem(item), children: "Open details" }),
                    jsx("select", { "aria-label": `Move ${item.ref}`, disabled: moving, value: "", onChange: (event) => transitionStatus(item.ref, event.target.value), children: [jsx("option", { value: "", children: "Move to\u2026" }), ...columns.filter(([, , states]) => states).map(([, label2, states]) => jsx("option", { value: states[0], children: label2 }, states[0]))] }),
                    jsx("span", { className: "dockyard-work-type", children: item.type || "task" }),
                    jsx("h4", { children: item.title }),
                    jsxs("footer", { children: [jsx("span", { children: item.ref }), jsx("span", { children: item.assignee || "Unassigned" })] })
                  ]
                }, item.ref)) : jsx("p", { className: "dockyard-meta", children: "No work in this stage." })
              })
            ]
          }, key);
        })
      }),
      jsx(PlanningPanel, { project, milestones: view.milestones ?? [], workItems: view.workItems ?? [], onRefresh }),
      jsx(SavedViewsSection, {
        project,
        views: view.views ?? [],
        onApply: setAppliedView,
        onClear: () => setAppliedView(null),
        appliedName: appliedView?.name ?? null,
        onRefresh
      }, `${project.id}:saved-views`)
    ] });
  } else if (projectView === "initiative") {
    panel = jsx(InitiativeView, { view, onRefresh });
  } else if (projectView === "objectives") {
    panel = jsx(ObjectivesPanel, { project, settings: view.settings ?? {}, objectives: view.objectives ?? [], goals: view.goals ?? [], missionArchive: view.missionArchive ?? [], onRefresh }, project.id);
  } else if (projectView === "planning") {
    panel = jsx(PlanningCanvasPanel, { project, canvas: view.canvas, content: view.content ?? [], onRefresh, onDirty: onCanvasDirty }, project.id);
  } else if (projectView === "workflows") {
    panel = jsx(ExecutableWorkflowsPanel, { project, workflows: view.workflows ?? [], onRefresh, onOpenLibrary }, project.id);
  } else if (projectView === "content") {
    panel = jsx(ProjectContentPanel, { project, content: view.content ?? [], onRefresh }, project.id);
  } else if (projectView === "activity") {
    panel = jsxs("section", { className: "dockyard-feature-card", children: [
      jsx("h2", { children: "Project activity" }),
      (view.events ?? []).length > 0 ? jsx("div", { className: "dockyard-activity-list", children: view.events.map((event, index) => jsx("p", { children: JSON.stringify(event) }, String(event.id ?? index))) }) : jsx("p", { className: "dockyard-meta", children: "No attributed project events have been recorded yet." })
    ] });
  } else if (projectView === "settings") {
    panel = jsx(ProjectSettingsPanel, { project, settings: view.settings ?? {}, onRefresh, onDirty: onProjectDirty }, `${project.id}:${view.settings?.updated_at || "initial"}`);
  } else if (projectView === "reports") {
    panel = jsx(ProjectReportsPanel, { project, reports: view.reports ?? [], onRefresh });
  } else {
    const visibleWork = [...view.workItems ?? []].sort((left, right) => String(left.status || "").localeCompare(String(right.status || ""))).slice(0, 5);
    const visibleInitiatives = [...view.initiatives ?? []].sort((left, right) => Number(right.priority ?? 0) - Number(left.priority ?? 0)).slice(0, 3);
    const visibleEvents = [...view.events ?? []].sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || ""))).slice(0, 4);
    panel = jsxs(Fragment, { children: [
      jsxs("div", { className: "dockyard-project-grid", "data-project-visual": true, children: [
        jsxs("section", { className: "dockyard-feature-card dockyard-project-hero", children: [
          jsx(StatusTag, { tone: healthTone, label: healthLabel }),
          jsx("h2", { children: view.settings?.mission || project.id }),
          jsx("p", { children: "Work distribution and current delivery state from the canonical Dockyard backend." }),
          jsx(WorkBar, { work: project.work ?? {}, label: `${project.id} delivery state` }),
          jsxs("div", { className: "dockyard-work-legend", children: [
            jsxs("span", { className: "backlog", children: [jsx("i", {}), `${number(project.work?.backlog ?? 0)} backlog`] }),
            jsxs("span", { className: "active", children: [jsx("i", {}), `${number(project.work?.active ?? 0)} active`] }),
            jsxs("span", { className: "done", children: [jsx("i", {}), `${number(project.work?.done ?? 0)} done`] })
          ] })
        ] }),
        jsxs("section", { className: "dockyard-feature-card", children: [
          jsx("span", { className: "dockyard-card-label", children: "CURRENT SIGNALS" }),
          jsx("h2", { children: `${number(project.work?.blocked ?? 0)} blocked` }),
          jsx("p", { children: `${number(view.workItems?.length ?? 0)} work items and ${number(view.initiatives?.length ?? 0)} initiatives are attached to this project.` })
        ] })
      ] }),
      jsxs("div", { className: "dockyard-project-overview-grid", children: [
        jsxs("section", { className: "dockyard-feature-card dockyard-overview-card", "data-overview-work": true, children: [
          jsxs("header", { children: [jsx("h2", { children: "Current work" }), jsx("span", { children: number(view.workItems?.length ?? 0) })] }),
          jsx("p", { children: "Live work, ownership and stage." }),
          visibleWork.length > 0 ? jsx("div", {
            className: "dockyard-overview-list",
            children: visibleWork.map((item) => jsxs("article", { children: [
              jsxs("span", { children: [jsx("strong", { children: item.title || item.ref }), jsx("small", { children: `${item.ref} / ${item.assignee || "Unassigned"}` })] }),
              jsx(StatusTag, { tone: ["done", "completed"].includes(item.status) ? "success" : item.status === "in_progress" ? "info" : "neutral", label: String(item.status || "unknown").replaceAll("_", " ") })
            ] }, item.ref))
          }) : jsx("p", { className: "dockyard-meta", children: "No work items are attached." })
        ] }),
        jsxs("section", { className: "dockyard-feature-card dockyard-overview-card", "data-overview-initiatives": true, children: [
          jsxs("header", { children: [jsx("h2", { children: "Initiatives" }), jsx("span", { children: number(view.initiatives?.length ?? 0) })] }),
          jsx("p", { children: "Current improvement bets and their decision state." }),
          visibleInitiatives.length > 0 ? jsx("div", {
            className: "dockyard-overview-list",
            children: visibleInitiatives.map((initiative) => jsx(InitiativeRevisionRow, { initiative, onResubmitted: onRefresh }, initiative.ref))
          }) : jsx("p", { className: "dockyard-meta", children: "No initiatives are attached." })
        ] }),
        jsxs("section", { className: "dockyard-feature-card dockyard-overview-card", "data-overview-activity": true, children: [
          jsxs("header", { children: [jsx("h2", { children: "Recent activity" }), jsx("span", { children: number(view.events?.length ?? 0) })] }),
          jsx("p", { children: "Attributed events from this project." }),
          visibleEvents.length > 0 ? jsx("div", {
            className: "dockyard-overview-list activity",
            children: visibleEvents.map((event, index) => jsxs("article", { children: [
              jsxs("span", { children: [jsx("strong", { children: event.title || event.event_type || event.type || "Project event" }), jsx("small", { children: event.actor_id || event.actor || formatWhen(event.created_at) || "Attributed event" })] })
            ] }, String(event.id ?? index)))
          }) : jsx("p", { className: "dockyard-meta", children: "No attributed project events recorded yet." })
        ] })
      ] }),
      jsx(FirstAssessmentCard, { projectId: project.id })
    ] });
  }
  return jsxs("div", { "data-project-dashboard": project.id, children: [
    jsx(PageHead, {
      title: view.settings?.mission || project.id,
      description: `Project dashboard / ${project.id}`,
      status: project.health && project.health !== "healthy" ? healthLabel : null,
      onRefresh
    }),
    projectView === "overview" && jsx("div", {
      className: "dockyard-view-only-note",
      "data-roadmap-link": true,
      children: jsx("a", { href: "#", onClick: (event) => {
        event.preventDefault();
        onOpenRoadmap?.();
      }, children: "View in Roadmap" })
    }),
    workNotice || notice ? jsxs("div", { className: "dockyard-view-only-note", role: "alert", "data-deep-link-notice": true, children: [
      jsx(Icon, { name: "alert" }),
      jsx("span", { children: workNotice || notice })
    ] }) : null,
    jsx("p", { className: "dockyard-inline-error", role: "alert", "data-deep-link-error": true, hidden: !(workNotice || notice), children: workNotice || notice }),
    jsxs("div", { className: "dockyard-project-toolbar", children: [
      jsx("label", { children: "Project" }),
      jsx("select", {
        value: project.id,
        onChange: (event) => onSelectProject(event.target.value),
        children: projectOptions.map((option) => jsx("option", { value: option.id, children: option.id }, option.id))
      }),
      jsx("nav", {
        className: "dockyard-project-tabs",
        "aria-label": "Project views",
        children: views.map(([key, label]) => jsx("button", {
          type: "button",
          className: projectView === key ? "active" : "",
          "data-project-view": key,
          "aria-pressed": projectView === key,
          onClick: () => changeView(key),
          children: label
        }, key))
      })
    ] }),
    panel,
    pendingView ? jsxs("section", { className: "dockyard-modal-layer", "data-view-switch-confirm": pendingView, children: [
      jsxs("div", {
        className: "dockyard-modal",
        role: "alertdialog",
        "aria-modal": true,
        "aria-label": "Unsaved planning board changes",
        onKeyDown: (event) => {
          if (event.key === "Escape" && !viewSaving) {
            event.stopPropagation();
            setPendingView(null);
          }
        },
        children: [
          jsx("h2", { children: "Unsaved changes on this board" }),
          jsx("p", { children: "The planning board has edits that are not saved. Save them before you leave, discard them, or cancel to keep editing." }),
          jsxs("div", { className: "dockyard-modal-actions", children: [
            jsx(Button, { action: "view-switch-cancel", disabled: viewSaving, onClick: () => setPendingView(null), children: "Cancel" }),
            jsx(Button, { variant: "danger", action: "view-switch-discard", disabled: viewSaving, onClick: () => leaveView(pendingView), children: "Discard" }),
            jsx(Button, { variant: "primary", action: "view-switch-save", disabled: viewSaving || !canvasSaver.current, onClick: saveThenLeave, children: viewSaving ? "Saving..." : "Save and continue" })
          ] })
        ]
      })
    ] }) : null,
    jsx(WorkItemDetail, { item: selectedWorkItem, projectId: project.id, profiles: view.profiles ?? [], initiatives: view.initiatives ?? [], onClose: () => setSelectedWorkItem(null), onRefresh })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/onboard.js
function OnboardPanel({ view, onOpen, onRefresh }) {
  const profiles = view.profiles ?? [];
  return jsxs("div", { "data-onboard-tab": true, children: [
    jsx(PageHead, {
      title: "Onboard a project",
      description: "Create a new project or connect an existing repository. Onboarding validates and connects; it never enables automation by itself.",
      onRefresh
    }),
    jsxs("section", { className: "dockyard-feature-card", children: [
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [jsx("h2", { children: "New project" }), jsx("p", { children: "The wizard discovers the host, validates the project and connects it before stewardship is enabled." })] }),
        jsx(StatusTag, { tone: "neutral", label: `${number(profiles.length)} discoverable ${plural(profiles.length, "profile")}` })
      ] }),
      jsx(Button, { action: "open-onboard-tab", variant: "primary", onClick: onOpen, children: "Open onboarding wizard" })
    ] })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/teams.js
function TeamsView({ view, onRefresh }) {
  const bots = view.bots ?? [];
  const workload = view.workload ?? { busy: [], idle: [], stuck: [], offline: [] };
  const total = Math.max(1, bots.length);
  const [selectedBot, setSelectedBot] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [sessionState, setSessionState] = useState("idle");
  const [sessionError, setSessionError] = useState(null);
  const [profiles, setProfiles] = useState(view.profiles ?? []);
  const [team, setTeam] = useState(view.team ?? null);
  const [teamError, setTeamError] = useState(null);
  const [chosenProfile, setChosenProfile] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [preview, setPreview] = useState(null);
  const [operation, setOperation] = useState(null);
  const [pendingOperations, setPendingOperations] = useState([]);
  const transferScope = useRef(null);
  const projectId = view.project?.id || view.projects?.[0]?.id || "";
  useEffect(() => {
    const members = team?.members ?? [];
    setProfiles((view.profiles ?? []).filter((profile) => profile.available !== false));
    setTransferFrom(members.find((member) => member.role !== "lead")?.profile_slug || "");
    setTransferTo(members.find((member) => member.role === "lead")?.profile_slug || "");
  }, [projectId]);
  useEffect(() => {
    let cancelled = false;
    const scope = { projectId };
    transferScope.current = scope;
    setOperation(null);
    setPendingOperations([]);
    if (projectId) api(`/projects/${encodeURIComponent(projectId)}/transfers/pending`).then((result) => {
      if (!cancelled) setPendingOperations(result.operations ?? []);
    }).catch((failure) => {
      if (!cancelled) setTeamError(String(failure?.message ?? failure));
    });
    return () => {
      cancelled = true;
      transferScope.current = null;
    };
  }, [projectId]);
  const refreshTeam = async () => setTeam(await api(`/projects/${encodeURIComponent(projectId)}/team`));
  const addMember = async () => {
    setTeamError(null);
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/members`, { method: "POST", body: { profile_slug: chosenProfile, role: "member" } });
      await refreshTeam();
    } catch (failure) {
      setTeamError(String(failure?.message ?? failure));
    }
  };
  const transferLead = async () => {
    setTeamError(null);
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(chosenProfile)}/lead`, { method: "POST", body: { profile_slug: chosenProfile } });
      await refreshTeam();
    } catch (failure) {
      setTeamError(String(failure?.message ?? failure));
    }
  };
  const previewTransfer = async () => {
    setTeamError(null);
    setPreview(null);
    try {
      setPreview(await api(`/projects/${encodeURIComponent(projectId)}/transfers/preview`, { method: "POST", body: { from_profile: transferFrom, to_profile: transferTo } }));
    } catch (failure) {
      setTeamError(String(failure?.message ?? failure));
    }
  };
  const executeTransfer = async () => {
    setTeamError(null);
    try {
      const result = await api(`/projects/${encodeURIComponent(projectId)}/transfers/execute`, { method: "POST", body: { from_profile: transferFrom, to_profile: transferTo, fingerprint: preview.fingerprint, idempotency_key: `desktop-${preview.fingerprint}` } });
      setOperation(await api(`/operations/${encodeURIComponent(result.op_id)}`));
      await refreshTeam();
    } catch (failure) {
      setPreview(null);
      setTeamError(`Preview is stale or transfer failed: ${String(failure?.message ?? failure)}`);
    }
  };
  const acceptTransfer = (result, scope) => {
    if (transferScope.current !== scope || result.project_id !== scope?.projectId) return false;
    setOperation(result);
    if (result.state === "completed") setPendingOperations((items) => items.filter((item) => item.op_id !== result.op_id));
    return true;
  };
  const resumeTransfer = async (opId) => {
    const scope = transferScope.current;
    if (!scope || scope.projectId !== projectId) return;
    try {
      acceptTransfer(await api(`/operations/${encodeURIComponent(opId)}`), scope);
    } catch (failure) {
      if (transferScope.current === scope) setTeamError(String(failure?.message ?? failure));
    }
  };
  const retryTransfer = async () => {
    const scope = transferScope.current;
    if (!scope || scope.projectId !== projectId || operation?.project_id !== projectId) return;
    try {
      await api(`/operations/${encodeURIComponent(operation.op_id)}/retry`, { method: "POST", body: {} });
      if (transferScope.current !== scope) return;
      const refreshed = await api(`/operations/${encodeURIComponent(operation.op_id)}`);
      if (!acceptTransfer(refreshed, scope)) return;
      const roster = await api(`/projects/${encodeURIComponent(projectId)}/team`);
      if (transferScope.current === scope) setTeam(roster);
    } catch (failure) {
      if (transferScope.current === scope) setTeamError(String(failure?.message ?? failure));
    }
  };
  const openSessions = async (botId) => {
    setSelectedBot(botId);
    setTranscript(null);
    setSessionData(null);
    setSessionState("loading");
    setSessionError(null);
    try {
      setSessionData(await api(`/bots/${encodeURIComponent(botId)}/sessions`));
      setSessionState("ready");
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure));
      setSessionState("error");
    }
  };
  const openTranscript = async (sessionId) => {
    if (!selectedBot) return;
    setSessionState("loading-transcript");
    setSessionError(null);
    try {
      setTranscript(await api(`/bots/${encodeURIComponent(selectedBot)}/sessions/${encodeURIComponent(sessionId)}`));
      setSessionState("ready");
    } catch (failure) {
      setSessionError(String(failure?.message ?? failure));
      setSessionState("error");
    }
  };
  return jsxs("div", { "data-bot-teams": true, children: [
    jsx(PageHead, {
      title: "Bot teams",
      description: "Capabilities, availability, group ownership and structured handoffs.",
      status: workload.stuck?.length > 0 ? `${number(workload.stuck.length)} stuck` : null,
      onRefresh
    }),
    jsxs("section", { className: "dockyard-feature-card", "data-team-management": true, children: [
      jsxs("header", { children: [jsx("h2", { children: "Project team" }), jsx("span", { children: team ? `Revision ${team.membership_revision}` : "Loading canonical roster\u2026" })] }),
      teamError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: teamError }) : null,
      jsx("div", { className: "dockyard-bot-grid", children: (team?.members ?? []).map((member) => jsxs("article", { className: "dockyard-bot-card", "data-project-member": member.profile_slug, children: [
        jsxs("strong", { children: [member.profile_slug, member.role === "lead" ? " \xB7 Lead" : " \xB7 Member"] }),
        jsx(StatusTag, { tone: member.hermes_available ? "success" : "warning", label: member.hermes_available ? "Hermes available" : "Unavailable" }),
        jsx("span", { children: `${number(member.workload?.total ?? 0)} canonical work items` }),
        jsx("small", { children: member.state })
      ] }, member.profile_slug)) }),
      jsx(DiscoveredProfilePicker, { profiles, name: "team-member-lead", label: "Discovered Hermes profile", value: chosenProfile, onChange: setChosenProfile }),
      jsxs("div", { className: "dockyard-modal-actions", children: [
        jsx(Button, { action: "add-project-member", disabled: !chosenProfile || !projectId, onClick: addMember, children: "Add member" }),
        jsx(Button, { action: "transfer-project-lead", disabled: !chosenProfile || !projectId, onClick: transferLead, children: "Transfer lead" })
      ] }),
      jsxs("div", { className: "dockyard-settings-grid", children: [
        jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Member leaving" }), jsx("select", { ["data-transfer-from"]: true, value: transferFrom, onChange: (event) => setTransferFrom(event.target.value), children: (team?.members ?? []).map((member) => jsx("option", { value: member.profile_slug, children: member.profile_slug }, member.profile_slug)) })] }),
        jsxs("label", { className: "dockyard-field", children: [jsx("span", { children: "Replacement" }), jsx("select", { "data-transfer-to": true, value: transferTo, onChange: (event) => setTransferTo(event.target.value), children: (team?.members ?? []).map((member) => jsx("option", { value: member.profile_slug, children: member.profile_slug }, member.profile_slug)) })] })
      ] }),
      jsx(Button, { action: "preview-work-transfer", disabled: !transferFrom || !transferTo || transferFrom === transferTo, onClick: previewTransfer, children: "Preview exact consequences" }),
      preview ? jsxs("div", { "data-transfer-preview": preview.fingerprint, children: [
        jsx("strong", { children: `${number(preview.enumerated_count)} items enumerated \xB7 fingerprint ${preview.fingerprint}` }),
        jsx("ul", { children: [...preview.eligible_items ?? [], ...preview.excluded_items ?? []].map((item) => jsx("li", { children: `${item.id} \xB7 ${item.title || ""} \xB7 ${item.status} \xB7 ${item.reason || "eligible"}` }, item.id)) }),
        jsx(Button, { action: "execute-work-transfer", variant: "primary", disabled: preview.complete !== true || (preview.excluded_items ?? []).length > 0, onClick: executeTransfer, children: "Confirm exact transfer" })
      ] }) : null,
      pendingOperations.length ? jsxs("section", { "data-pending-transfers": true, children: [
        jsx("h3", { children: "Unfinished transfers \xB7 member departure" }),
        ...pendingOperations.map((pending) => jsx(Button, {
          onClick: () => resumeTransfer(pending.op_id),
          children: `Resume ${pending.op_id}`
        }, pending.op_id))
      ] }) : null,
      operation?.project_id === projectId ? jsxs("div", { "data-transfer-operation": operation.op_id, role: "status", children: [
        jsx("strong", { children: `${operation.op_id} \xB7 ${operation.state}` }),
        jsx("span", { children: `${(operation.items ?? []).filter((item) => item.outcome === "completed").length} of ${(operation.items ?? []).length} transferred` }),
        jsx("ul", { children: (operation.items ?? []).map((item) => jsx("li", { children: `${item.item_id} \xB7 ${item.outcome}${item.detail ? ` \xB7 ${item.detail}` : ""}` }, item.item_id)) }),
        operation.state !== "completed" ? jsx(Button, { action: "retry-work-transfer", onClick: retryTransfer, children: "Retry remaining items" }) : null
      ] }) : null
    ] }),
    jsxs("section", { className: "dockyard-workload-card", "data-workload-visual": true, children: [
      jsxs("div", { children: [jsx("h2", { children: "Workload heat" }), jsx("p", { children: "Current fleet availability from owned work." })] }),
      jsxs("div", { className: "dockyard-workload-chart", children: [
        jsxs("div", { className: "dockyard-work-visual", role: "img", "aria-label": `${workload.busy?.length ?? 0} busy, ${workload.idle?.length ?? 0} idle, ${workload.stuck?.length ?? 0} stuck, ${workload.offline?.length ?? 0} offline`, children: [
          workload.busy?.length > 0 ? jsx("span", { className: "active", style: { width: `${workload.busy.length / total * 100}%` } }) : null,
          workload.idle?.length > 0 ? jsx("span", { className: "done", style: { width: `${workload.idle.length / total * 100}%` } }) : null,
          workload.stuck?.length > 0 ? jsx("span", { className: "danger", style: { width: `${workload.stuck.length / total * 100}%` } }) : null
        ] }),
        jsx("p", { children: `${number(workload.busy?.length ?? 0)} busy / ${number(workload.idle?.length ?? 0)} idle / ${number(workload.stuck?.length ?? 0)} stuck / ${number(workload.offline?.length ?? 0)} offline` })
      ] })
    ] }),
    jsxs("div", { className: "dockyard-teams-layout", children: [
      jsxs("section", { className: "dockyard-feature-card", children: [
        jsx("h2", { children: "Registry" }),
        jsx("p", { children: "Declared capabilities and current state. Capability never expands permission." }),
        jsx("div", {
          className: "dockyard-bot-grid",
          children: bots.map((bot) => jsxs("article", { className: "dockyard-bot-card", "data-bot-card": bot.id, children: [
            jsxs("header", { children: [
              jsx("span", { className: "dockyard-avatar", children: initials(bot.name || bot.id) }),
              jsxs("span", { children: [jsx("strong", { children: bot.name || bot.id }), jsx("small", { children: bot.current_item || "No active item" })] }),
              jsx(StatusTag, { tone: bot.status === "busy" ? "warning" : bot.status === "idle" ? "success" : "neutral", label: bot.status || "unknown" })
            ] }),
            jsx("div", {
              className: "dockyard-capabilities",
              children: (bot.capabilities ?? []).length > 0 ? bot.capabilities.map((capability) => jsx("span", { children: capability }, capability)) : jsx("span", { children: "No capabilities declared" })
            }),
            jsxs("button", {
              type: "button",
              className: "dockyard-bot-session-button",
              "data-action": "open-bot-sessions",
              "data-bot-id": bot.id,
              "aria-expanded": selectedBot === bot.id,
              onClick: () => openSessions(bot.id),
              children: [jsx(Icon, { name: "activity" }), jsx("span", { children: "Session logs" }), jsx(Icon, { name: "chevron" })]
            })
          ] }, bot.id))
        })
      ] }),
      jsxs("section", { className: "dockyard-feature-card", children: [
        jsx("h2", { children: "Groups and handoffs" }),
        jsx("p", { children: "Group membership and audited A2A messages from the canonical feed." }),
        jsx("div", {
          className: "dockyard-group-list",
          children: (view.groups ?? []).length > 0 ? view.groups.map((group) => jsxs("article", { className: "dockyard-group-card", "data-bot-group": group.name, children: [
            jsxs("header", { children: [jsx("strong", { children: group.name }), jsx("span", { children: `${number(group.members?.length ?? 0)} members` })] }),
            jsx("p", { children: group.purpose || "No purpose supplied" }),
            jsx("div", { className: "dockyard-group-members", children: (group.members ?? []).map((member) => jsx("span", { className: "dockyard-avatar", title: member, children: initials(member) }, member)) }),
            jsx("div", {
              className: "dockyard-handoff-list",
              children: (view.messages?.[group.name] ?? []).length > 0 ? view.messages[group.name].map((message, index) => jsxs("div", { children: [
                jsx("strong", { children: message.payload?.summary || message.msg_type || "A2A event" }),
                jsx("span", { children: `${message.from_actor || "Unknown actor"} / ${formatWhen(message.created_at)}` })
              ] }, String(message.id ?? index))) : jsx("span", { className: "dockyard-meta", children: "No handoff messages recorded." })
            })
          ] }, group.name)) : jsx("p", { className: "dockyard-meta", children: "No bot groups configured." })
        })
      ] })
    ] }),
    selectedBot ? jsxs("section", { className: "dockyard-feature-card dockyard-bot-session-panel", "data-bot-session-panel": selectedBot, children: [
      jsxs("header", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [
          jsx("span", { className: "dockyard-card-label", children: "SESSION EVIDENCE" }),
          jsx("h2", { children: `${bots.find((bot) => bot.id === selectedBot)?.name || selectedBot} activity` }),
          jsx("p", { children: sessionData?.scope_note || "System prompts and private reasoning are excluded." })
        ] }),
        jsx(Button, { small: true, onClick: () => {
          setSelectedBot(null);
          setSessionData(null);
          setTranscript(null);
        }, children: "Close" })
      ] }),
      sessionError ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: sessionError }) : null,
      sessionState === "loading" ? jsx("p", { className: "dockyard-meta", children: "Loading sessions..." }) : jsxs("div", { className: "dockyard-session-layout", children: [
        jsxs("aside", { className: "dockyard-session-list", children: [
          jsx("h3", { children: "Recent sessions" }),
          sessionData?.available === false ? jsx("p", { className: "dockyard-meta", children: "No Hermes session store is available for this bot profile." }) : (sessionData?.sessions ?? []).length > 0 ? sessionData.sessions.map((session) => jsxs("button", {
            type: "button",
            "data-bot-session": session.session_id,
            className: transcript?.session?.session_id === session.session_id ? "active" : "",
            onClick: () => openTranscript(session.session_id),
            children: [
              jsxs("span", { children: [jsx("strong", { children: session.title }), jsx("small", { children: `${session.source} / ${formatWhen(session.last_activity_at)}` })] }),
              jsx(StatusTag, { tone: session.status === "active" ? "success" : "neutral", label: session.status })
            ]
          }, session.session_id)) : jsx("p", { className: "dockyard-meta", children: "No sessions were recorded for this bot." })
        ] }),
        transcript ? jsxs("article", { className: "dockyard-transcript", "data-session-transcript": transcript.session?.session_id, children: [
          jsxs("header", { children: [
            jsxs("div", { children: [jsx("h3", { children: transcript.session?.title || "Session transcript" }), jsx("span", { children: `${transcript.session?.source || "unknown"} / ${transcript.session?.model || "model not recorded"}` })] }),
            jsx(StatusTag, { tone: "info", label: `${number(transcript.messages?.length ?? 0)} messages` })
          ] }),
          jsx("div", {
            className: "dockyard-transcript-messages",
            children: (transcript.messages ?? []).map((message, index) => jsxs("div", { className: `dockyard-transcript-message ${message.role}`, "data-transcript-message": message.role, children: [
              jsxs("div", { children: [jsx("strong", { children: message.tool_name || message.role }), jsx("span", { children: formatWhen(message.timestamp) })] }),
              jsx("pre", { children: message.content || "(empty message)" }),
              message.truncated ? jsx("small", { children: "Message truncated at the safe display limit." }) : null
            ] }, String(message.message_id ?? index)))
          }),
          jsx("p", { className: "dockyard-transcript-scope", children: transcript.scope_note })
        ] }) : jsx("div", { className: "dockyard-transcript-placeholder", children: sessionState === "loading-transcript" ? "Loading transcript..." : "Select a session to inspect its transcript." })
      ] })
    ] }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/inbox.js
function InboxView({ view, onRefresh }) {
  const items = sortApprovals(view.items ?? []);
  if (items.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: "Approval Inbox", description: "Every pending human decision across every project, with enough context to decide here.", onRefresh }),
      jsx(EmptyState, { title: "No approvals waiting", description: "New owner decisions will appear here with their project, evidence context and risk.", icon: "check" })
    ] });
  }
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: "Approval Inbox",
      description: "Every pending human decision across every project, with enough context to decide here.",
      status: `${number(items.length)} ${plural(items.length, "decision")} owed`,
      onRefresh
    }),
    jsx("section", {
      className: "dockyard-approval-list",
      "aria-label": "Pending approvals",
      children: items.map((item) => jsx(ApprovalRow, { item, onResolved: onRefresh }, item.ref))
    })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/workflow-library.js
function WorkflowLibraryView({ projectId, onOpenBuilder }) {
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [enablement, setEnablement] = useState({});
  const [refusals, setRefusals] = useState({});
  const load = async () => {
    setError(null);
    try {
      const result = await api(`/workflow-library${scope === "all" ? "" : `?scope=${scope}`}`);
      const nextRows = result.workflows ?? [];
      setRows(nextRows);
      if (projectId) {
        const available = await api(`/projects/${encodeURIComponent(projectId)}/workflows/available`);
        setEnablement(Object.fromEntries((available.workflows ?? []).map((row) => [`${row.scope}:${row.name}`, row.enabled])));
      } else {
        setEnablement({});
      }
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
  };
  useEffect(() => {
    void load();
  }, [scope, projectId]);
  const filtered = (rows ?? []).filter((row) => !search.trim() || row.name.toLowerCase().includes(search.trim().toLowerCase()));
  const create = async () => {
    if (!name.trim() || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/workflow-library", { method: "POST", body: { scope: "global", name: name.trim(), nodes: [{ id: "step-1", title: title.trim(), depends_on: [] }] } });
      setName("");
      setTitle("");
      setCreating(false);
      await load();
      emitToast("success", "Workflow library updated.");
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    } finally {
      setBusy(false);
    }
  };
  const act = async (path) => {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "POST" });
      await load();
      emitToast("success", "Workflow library updated.");
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (rowScope, rowName, owner) => {
    setBusy(true);
    setError(null);
    try {
      const params = owner ? `?owner_project_id=${encodeURIComponent(owner)}` : "";
      await api(`/workflow-library/${rowScope}/${encodeURIComponent(rowName)}${params}`, { method: "DELETE" });
      await load();
      emitToast("success", "Workflow library updated.");
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (rowScope, rowName) => {
    if (!projectId) return;
    const key = `${rowScope}:${rowName}`;
    setBusy(true);
    setError(null);
    try {
      const next = !(enablement[key] ?? rowScope === "project");
      await api(`/projects/${encodeURIComponent(projectId)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/enablement`, { method: "PUT", body: { enabled: next } });
      setEnablement((current) => ({ ...current, [key]: next }));
      emitToast("success", `Workflow turned ${next ? "on" : "off"} for ${projectId}.`);
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    } finally {
      setBusy(false);
    }
  };
  const start = async (rowScope, rowName) => {
    if (!projectId) return;
    const key = `${rowScope}:${rowName}`;
    setBusy(true);
    setError(null);
    try {
      await api(`/projects/${encodeURIComponent(projectId)}/workflows/${rowScope}/${encodeURIComponent(rowName)}/start`, { method: "POST", body: { run_key: `${rowName}-${Date.now()}` } });
      setRefusals((current) => ({ ...current, [key]: null }));
      emitToast("success", `Run of ${rowName} started for ${projectId}.`);
    } catch (failure) {
      setRefusals((current) => ({ ...current, [key]: `Run refused: ${String(failure?.message ?? failure)}` }));
    } finally {
      setBusy(false);
    }
  };
  return jsxs("section", { "data-workflow-library-screen": true, children: [
    jsx(PageHead, { title: "Workflows", description: "Every workflow available to project teams. Global workflows are shared by all projects; dedicated ones belong to a single project." }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", "data-library-error": true, children: error }) : null,
    jsxs("div", { className: "dockyard-wf-library-toolbar", children: [
      jsxs("div", { className: "dockyard-wf-library-scope", role: "group", "aria-label": "Scope filter", children: [
        jsx(Button, { small: true, action: "library-scope-all", variant: scope === "all" ? "primary" : "", onClick: () => setScope("all"), children: "All" }),
        jsx(Button, { small: true, action: "library-scope-global", variant: scope === "global" ? "primary" : "", onClick: () => setScope("global"), children: "Global" }),
        jsx(Button, { small: true, action: "library-scope-project", variant: scope === "project" ? "primary" : "", onClick: () => setScope("project"), children: "Project" })
      ] }),
      jsx("input", { "data-library-search": true, "aria-label": "Search workflows", placeholder: "Search workflows", value: search, onChange: (event) => setSearch(event.target.value) }),
      jsx(Button, { action: "library-create", variant: "primary", disabled: busy, onClick: () => setCreating((open) => !open), children: creating ? "Close" : "New workflow" })
    ] }),
    creating ? jsxs("div", { className: "dockyard-wf-library-create", "data-library-create-form": true, children: [
      jsxs("label", { children: [jsx("span", { children: "Workflow name" }), jsx("input", { "data-library-name": true, value: name, onChange: (event) => setName(event.target.value) })] }),
      jsxs("label", { children: [jsx("span", { children: "First step title" }), jsx("input", { "data-library-title": true, value: title, onChange: (event) => setTitle(event.target.value) })] }),
      jsx(Button, { action: "library-create-confirm", variant: "primary", disabled: busy || !name.trim() || !title.trim(), onClick: create, children: "Create global workflow" })
    ] }) : null,
    rows === null && !error ? jsx(LoadingState, {}) : rows === null && error ? jsx(ErrorState, { error, onRetry: load }) : filtered.length === 0 ? jsx(EmptyState, { title: "No workflows yet", description: "Create a workflow and project teams can adopt it for autonomous work.", icon: "project" }) : jsxs("div", { className: "dockyard-wf-library-grid", "data-library-rows": true, children: filtered.map((row) => jsxs("article", { className: "dockyard-feature-card", "data-library-row": row.name, "data-library-scope": row.scope, children: [
      jsxs("header", { children: [
        jsx("h3", { children: row.name }),
        jsx(StatusTag, { tone: row.scope === "global" ? "info" : "neutral", label: row.scope === "global" ? "Global" : "Project" })
      ] }),
      jsx("p", { className: "dockyard-meta", children: row.owner_project_id ? `Dedicated to ${row.owner_project_id} \xB7 v${row.version}` : `Available to every project \xB7 v${row.version}` }),
      jsx("p", { className: "dockyard-meta", children: `${number(row.definition?.nodes?.length ?? 0)} nodes` }),
      row.archived_at ? jsx(Button, { small: true, action: "library-restore", disabled: busy, onClick: () => act(`/workflow-library/${row.scope}/${encodeURIComponent(row.name)}/restore${row.owner_project_id ? `?owner_project_id=${encodeURIComponent(row.owner_project_id)}` : ""}`), children: "Restore" }) : jsxs("div", { className: "dockyard-form-actions", children: [
        jsx(Button, { small: true, action: "library-open", disabled: busy, onClick: () => onOpenBuilder?.(row), children: "Open builder" }),
        jsx(Button, { small: true, action: "library-archive", disabled: busy, onClick: () => act(`/workflow-library/${row.scope}/${encodeURIComponent(row.name)}/archive${row.owner_project_id ? `?owner_project_id=${encodeURIComponent(row.owner_project_id)}` : ""}`), children: "Archive" }),
        jsx(Button, { small: true, action: "library-delete", variant: "danger", disabled: busy, onClick: () => remove(row.scope, row.name, row.owner_project_id), children: "Delete" })
      ] }),
      !projectId || row.scope === "project" && row.owner_project_id !== projectId ? jsx("p", { className: "dockyard-meta", "data-wf-enablement-na": `${row.scope}:${row.name}`, children: projectId ? `Only ${row.owner_project_id} can run this workflow.` : "Select a project to turn workflows on or off." }) : jsxs("div", { className: "dockyard-wf-enablement", children: [
        jsxs("label", { className: "dockyard-switch", children: [
          jsx("input", { type: "checkbox", role: "switch", "data-wf-enablement": `${row.scope}:${row.name}`, "aria-label": `Turn ${row.name} on for ${projectId}`, checked: Boolean(enablement[`${row.scope}:${row.name}`] ?? row.scope === "project"), "aria-checked": String(Boolean(enablement[`${row.scope}:${row.name}`] ?? row.scope === "project")), disabled: busy, onChange: () => toggle(row.scope, row.name) }),
          jsx("span", { className: "dockyard-switch-track", "aria-hidden": true }),
          jsx("span", { className: "dockyard-switch-thumb", "aria-hidden": true })
        ] }),
        jsx("span", { className: "dockyard-wf-enablement-label", children: row.scope === "global" ? `On for ${projectId} (off by default)` : `On for ${projectId}` }),
        jsx(Button, { small: true, action: "library-run", data: { "data-wf-run-start": `${row.scope}:${row.name}` }, disabled: busy, onClick: () => start(row.scope, row.name), children: "Start run" })
      ] }),
      refusals[`${row.scope}:${row.name}`] ? jsx("p", { className: "dockyard-inline-error", role: "alert", "data-wf-run-refused": `${row.scope}:${row.name}`, children: refusals[`${row.scope}:${row.name}`] }) : null
    ] }, `${row.scope}:${row.name}:${row.owner_project_id ?? ""}`)) })
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/notifications.js
function NotificationRow({ note, onAcknowledged, onOpen }) {
  const [state, setState] = useState(note.acked ? "cleared" : "unread");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const tone = severityTone(note.severity);
  const acknowledge = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/notifications/${note.id}/ack`, { method: "POST", body: {} });
      setState("cleared");
      onAcknowledged(note.id);
    } catch (failure) {
      setError(String(failure?.message ?? failure));
    }
    setBusy(false);
  };
  const when = formatWhen(note.created_at);
  return jsxs("article", { className: "dockyard-notification-row", "data-notification-id": String(note.id), "data-notification-state": state, children: [
    jsx("span", { className: `dockyard-notification-marker ${tone}`, children: jsx(Icon, { name: tone === "danger" || tone === "warning" ? "alert" : "bell" }) }),
    jsxs("div", { className: "dockyard-notification-main", children: [
      jsx("h3", { children: note.title ?? "Fleet notification" }),
      jsx("p", { children: note.body ?? "" }),
      jsx("span", { className: "dockyard-meta", children: `${note.project || "Fleet"}${when ? ` / ${when}` : ""}` })
    ] }),
    jsxs("div", { className: "dockyard-notification-action", children: [
      typeof onOpen === "function" && note.deep_link ? jsx(Button, { action: "open", small: true, onClick: () => onOpen(note.deep_link), children: "Open" }) : null,
      state === "cleared" ? jsx(StatusTag, { tone: "neutral", label: "Cleared" }) : jsx(Button, { action: "acknowledge", small: true, disabled: busy, onClick: acknowledge, children: busy ? "Clearing..." : "Acknowledge" })
    ] }),
    error ? jsx("p", { className: "dockyard-inline-error", children: `Could not clear: ${error}` }) : null
  ] });
}
function NotificationGroup({ title, description, items, onAcknowledged, onOpen }) {
  return jsxs("section", { className: "dockyard-feed-group", children: [
    jsxs("div", { className: "dockyard-feed-head", children: [
      jsxs("div", { children: [jsx("h2", { children: title }), jsx("p", { children: description })] }),
      jsx("span", { className: "dockyard-section-count", children: number(items.length) })
    ] }),
    items.map((note) => jsx(NotificationRow, { note, onAcknowledged, onOpen }, String(note.id)))
  ] });
}
function NotificationsView({ view, onRefresh, onAcknowledged, onOpen }) {
  const notes = view.notifications ?? [];
  if (notes.length === 0) {
    return jsxs(Fragment, { children: [
      jsx(PageHead, { title: "Notifications", description: "Attributed fleet events and their cleared history.", onRefresh }),
      jsx(EmptyState, { title: "No notifications yet", description: "Fleet events will appear here when work changes state or needs attention.", icon: "bell" })
    ] });
  }
  const unread = notes.filter((note) => !note.acked).sort((left, right) => {
    const severity = (SEVERITY_PRIORITY[String(left.severity || "info").toLowerCase()] ?? 3) - (SEVERITY_PRIORITY[String(right.severity || "info").toLowerCase()] ?? 3);
    return severity !== 0 ? severity : String(right.created_at || "").localeCompare(String(left.created_at || ""));
  });
  const cleared = notes.filter((note) => note.acked).sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: "Notifications",
      description: "Attributed fleet events and their cleared history.",
      status: unread.length > 0 ? `${number(unread.length)} unread` : null,
      onRefresh
    }),
    unread.length > 0 ? jsx(NotificationGroup, { title: "Needs attention", description: "Unread fleet events.", items: unread, onAcknowledged, onOpen }) : null,
    cleared.length > 0 ? jsx(NotificationGroup, { title: "Cleared", description: "Acknowledged events remain available for context.", items: cleared, onAcknowledged, onOpen }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/views/roadmap.js
var BUCKETS = [
  ["planned", "Planned"],
  ["building", "Building"],
  ["ready_for_review", "Ready for review"],
  ["complete", "Complete"]
];
var GOAL_LABEL = { met: "Met", at_risk: "At risk", unknown: "Unknown evidence", unproven: "Unproven" };
var OUTCOME_LABEL = { passed: "Passed", failed: "Failed", stale: "Stale", unknown: "Unknown", not_applicable: "Not applicable" };
var REL_LABEL = { delivers: "delivers", depends_on: "depends on", supports: "supports", measures: "measures", unblocks: "unblocks" };
var CONTRACT_STATUS = { active: "Active", paused: "Paused", done: "Done", cleared: "Cleared" };
var ICON = { project: "P", initiative: "I", milestone: "M", work: "W", objective: "O", goal: "G" };
var OPEN_VIEW = { project: "overview", initiative: "initiative", milestone: "board", objective: "objectives", goal: "objectives" };
var LINK_KIND = {
  milestone: {
    title: "Link a milestone to an initiative",
    itemLabel: "Milestone",
    relationships: ["delivers", "depends_on"],
    items: (project) => (project.unlinked?.milestones ?? []).map((row) => ({ id: String(row.id), label: row.name })),
    submit: (projectId, itemId, ref, relationship) => api(
      `/projects/${encodeURIComponent(projectId)}/initiatives/${encodeURIComponent(ref)}/milestones`,
      { method: "POST", body: { milestone_id: Number(itemId), relationship } }
    )
  },
  objective: {
    title: "Link an objective to an initiative",
    itemLabel: "Objective",
    relationships: ["supports", "measures", "unblocks"],
    items: (project) => (project.unlinked?.objectives ?? []).map((row) => ({ id: String(row.id), label: row.name })),
    submit: (projectId, itemId, ref, relationship) => api(
      `/projects/${encodeURIComponent(projectId)}/objectives/${encodeURIComponent(itemId)}/initiatives`,
      { method: "POST", body: { initiative_ref: ref, relationship } }
    )
  }
};
var words = (value) => String(value ?? "").replace(/_/g, " ");
var chip = (text, tone = "") => jsx("span", { className: `dy-rm-chip${tone ? ` ${tone}` : ""}`, children: text });
function treeKeydown(event) {
  const rows = [...event.currentTarget.querySelectorAll("[data-rm-row]")];
  const row = document.activeElement?.closest?.("[data-rm-row]");
  const index = rows.indexOf(row);
  if (index < 0) return;
  const move = (target) => {
    event.preventDefault();
    target?.focus();
  };
  const level = Number(row.getAttribute("aria-level"));
  if (event.key === "ArrowDown") move(rows[index + 1]);
  else if (event.key === "ArrowUp") move(rows[index - 1]);
  else if (event.key === "Home") move(rows[0]);
  else if (event.key === "End") move(rows[rows.length - 1]);
  else if (event.key === "ArrowRight" && row.dataset.rmExpandable === "true") {
    event.preventDefault();
    if (row.dataset.rmOpen === "true") rows[index + 1]?.focus();
    else row.querySelector("[data-rm-disclosure]")?.click();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (row.dataset.rmOpen === "true") row.querySelector("[data-rm-disclosure]")?.click();
    else rows.slice(0, index).reverse().find((other) => Number(other.getAttribute("aria-level")) === level - 1)?.focus();
  } else if ((event.key === "Enter" || event.key === " ") && event.target === row) {
    event.preventDefault();
    row.click();
  }
}
function deliveryChips(delivery) {
  if (!delivery) return null;
  if (delivery.state === "no_linked_work") return chip("No linked work");
  if (delivery.state === "unavailable") return chip("Unavailable");
  const chips = BUCKETS.map(([key, label]) => Number(delivery[key] ?? 0) > 0 ? jsx("span", { className: "dy-rm-chip", children: `${label} ${number(delivery[key])}` }, key) : null).filter(Boolean);
  if (Number(delivery.blocked ?? 0) > 0) {
    chips.push(jsx("span", { className: "dy-rm-chip blocked", children: `Blocked ${number(delivery.blocked)}` }, "blocked"));
  }
  chips.push(jsx("span", { className: "dy-rm-chip", children: `${number(delivery.total)} total` }, "total"));
  return chips;
}
function goalChip(goal) {
  if (!goal) return null;
  if (goal.unavailable === "archived") return chip(`Goal ${goal.title} \u2014 unavailable (archived)`);
  return chip(`Goal: ${GOAL_LABEL[goal.state] ?? goal.state}`);
}
function deliveryDetail(delivery) {
  if (!delivery) return [];
  if (delivery.state === "no_linked_work") return [["Linked work", "No linked work"]];
  if (delivery.state === "unavailable") return [["Linked work", "Unavailable (the work host did not respond)"]];
  return [
    ...BUCKETS.map(([key, label]) => [label, number(delivery[key] ?? 0)]),
    ["Blocked", number(delivery.blocked ?? 0)],
    ["Total linked", number(delivery.total)]
  ];
}
function focusProps(node, tabStop, onFocusRow) {
  return {
    "data-rm-node": node,
    tabIndex: tabStop ? 0 : -1,
    onFocus: (event) => {
      if (event.target === event.currentTarget) onFocusRow(node);
    }
  };
}
function Row({ node, type, depth, label, detail, open, expandable, selected, tabStop, chips, actions, onFocusRow, onToggle, onOpen }) {
  return jsxs("div", {
    className: `dy-rm-row depth-${depth}`,
    "data-rm-row": true,
    "data-rm-expandable": String(Boolean(expandable)),
    "data-rm-open": String(Boolean(open)),
    "data-selected": String(Boolean(selected)),
    role: "treeitem",
    "aria-level": depth + 1,
    "aria-expanded": expandable ? Boolean(open) : void 0,
    "aria-selected": Boolean(selected),
    ...focusProps(node, tabStop, onFocusRow),
    onClick: () => onOpen(),
    children: [
      jsx("button", {
        type: "button",
        className: `dy-rm-disclosure${expandable ? "" : " blank"}`,
        "data-rm-disclosure": true,
        tabIndex: -1,
        "aria-hidden": !expandable,
        "aria-label": `${open ? "Collapse" : "Expand"} ${label}`,
        onClick: (event) => {
          event.stopPropagation();
          if (expandable) onToggle();
        },
        children: open ? "\u2212" : "+"
      }),
      jsx("span", { className: `dy-rm-icon ${type}`, "aria-hidden": true, children: ICON[type] ?? "\xB7" }),
      jsxs("span", { className: "dy-rm-copy", children: [
        jsx("strong", { children: label }),
        jsx("small", { children: detail })
      ] }),
      jsx("span", { className: "dy-rm-chips", children: chips ?? null }),
      // Actions sit outside the chip strip: the narrow layout hides chips, never actions.
      actions ? jsx("span", { className: "dy-rm-row-actions", children: actions }) : null
    ]
  });
}
function PlainRow({ node, depth, label, detail, tabStop, onFocusRow }) {
  return jsx("div", {
    className: `dy-rm-row depth-${depth}`,
    "data-rm-row": true,
    role: "treeitem",
    "aria-level": depth + 1,
    ...focusProps(node, tabStop, onFocusRow),
    children: jsxs("span", { className: "dy-rm-copy", children: [jsx("strong", { children: label }), jsx("small", { children: detail })] })
  });
}
function MilestoneItems({ projectId, milestoneId, onOpen }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let current = true;
    api(`/roadmap/projects/${encodeURIComponent(projectId)}/milestones/${milestoneId}/items`).then((result) => {
      if (current) {
        setItems(result.items ?? []);
        setError(result.state === "unavailable" ? "Work items are unavailable (the work host did not respond)." : null);
      }
    }).catch((failure) => {
      if (current) setError(String(failure?.message ?? failure));
    });
    return () => {
      current = false;
    };
  }, [projectId, milestoneId]);
  if (error) return jsx("p", { role: "status", children: error });
  if (!items) return jsx("p", { role: "status", children: "Loading work items\u2026" });
  if (!items.length) return jsx("p", { role: "status", children: "No work items are attached to this milestone." });
  return jsx("ul", { className: "dy-rm-items", children: items.map((item) => jsxs("li", { children: [
    jsx("strong", { children: item.title }),
    jsx("small", { children: words(item.bucket) }),
    Array.isArray(item.blockers) && item.blockers.length ? jsx("small", { children: `waiting on ${item.blockers.join(", ")}` }) : null,
    jsx(Button, {
      small: true,
      action: "roadmap-open-work",
      ariaLabel: `Open ${item.title} on the project board`,
      onClick: (event) => {
        event.stopPropagation();
        onOpen({ project: projectId, entryView: "board", workRef: item.ref });
      },
      children: "Open"
    })
  ] }, item.ref)) });
}
function MilestoneItemsRow({ node, projectId, milestoneId, tabStop, onFocusRow, onOpen }) {
  return jsx("div", {
    className: "dy-rm-row depth-3",
    "data-rm-row": true,
    "data-rm-items-row": milestoneId,
    role: "treeitem",
    "aria-level": 4,
    ...focusProps(node, tabStop, onFocusRow),
    children: jsx("div", { style: { minWidth: 0, flex: 1 }, children: jsx(MilestoneItems, { projectId, milestoneId, onOpen }) })
  });
}
function contractFacts(entry, goalTitle) {
  if (!entry || entry.loading) return [["Goal contract", "Loading\u2026"]];
  if (entry.error) return [["Goal contract", `Unavailable: ${entry.error}`]];
  const contract = entry.contract;
  const text = (value) => value === null || value === void 0 || String(value).trim() === "" ? "\u2014" : String(value);
  const outcome = String(contract.outcome ?? "").trim();
  const copied = outcome !== "" && outcome === String(goalTitle ?? "").trim();
  return [
    ["Outcome", copied ? jsxs(Fragment, { children: [contract.outcome, jsx("small", { className: "dy-rm-copied", children: "Copied from the goal title" })] }) : text(contract.outcome)],
    ["Contract status", CONTRACT_STATUS[contract.status] ?? words(contract.status)],
    ...contract.status === "paused" ? [["Paused because", text(contract.paused_reason)]] : [],
    ["Verification", text(contract.verification)],
    ["Constraints", text(contract.constraints)],
    ["Boundaries", text(contract.boundaries)],
    ["Stop when", text(contract.stop_when)],
    ...contract.max_turns !== null && contract.max_turns !== void 0 ? [["Turn limit", number(contract.max_turns)]] : []
  ];
}
function drawerBody(sel, project, contract, onOpen) {
  const open = { project: project.id, entryView: OPEN_VIEW[sel.type] };
  const initiativeOf = (ref) => (project.initiatives ?? []).find((row) => row.ref === ref);
  if (sel.type === "project") {
    return {
      title: project.label ?? project.id,
      subtitle: project.mission || "No mission recorded",
      open,
      facts: [
        ["Initiatives", number(project.initiatives?.length ?? 0)],
        ["Goals", number(project.goals?.length ?? 0)],
        ["Milestones not linked", number(project.unlinked?.milestones?.length ?? 0)],
        ["Objectives not linked", number(project.unlinked?.objectives?.length ?? 0)],
        ["Work host", project.work_host === "unavailable" ? "Unavailable" : "Connected"]
      ]
    };
  }
  if (sel.type === "initiative") {
    const initiative = initiativeOf(sel.id);
    if (!initiative) return null;
    return {
      title: initiative.title,
      subtitle: `Governance: ${words(initiative.governance)}`,
      open,
      facts: [
        ...deliveryDetail(initiative.delivery),
        ["Work not in a milestone", initiative.unmilestoned_work?.state === "ok" ? number(initiative.unmilestoned_work.count) : "Unavailable"],
        ["Objectives linked", number(initiative.objectives?.length ?? 0)],
        ["Attention", initiative.attention_reasons?.length ? initiative.attention_reasons.map(words).join(", ") : "none"]
      ]
    };
  }
  if (sel.type === "milestone") {
    const milestone = (initiativeOf(sel.via)?.milestones ?? []).find((row) => row.id === sel.id);
    if (!milestone) return null;
    return {
      title: milestone.name,
      open,
      subtitle: milestone.relationship ? `Relationship: ${REL_LABEL[milestone.relationship] ?? milestone.relationship}` : "Not linked yet",
      facts: [
        ...deliveryDetail(milestone.delivery),
        ["Due", milestone.due ?? "No due date"],
        ["Closed", milestone.closed ? "Yes" : "No"],
        ...milestone.overdue ? [["Overdue", "Yes \u2014 past due and not closed"]] : [],
        ...milestone.archived ? [["Status", "Unavailable (archived)"]] : [],
        ...milestone.also_under?.length ? [["Also under", milestone.also_under.map((row) => row.title).join(", ")]] : []
      ],
      extra: milestone.archived ? null : jsx(MilestoneItems, { projectId: project.id, milestoneId: milestone.id, onOpen })
    };
  }
  if (sel.type === "objective") {
    const objective = (initiativeOf(sel.via)?.objectives ?? []).find((row) => row.id === sel.id);
    if (!objective) return null;
    return {
      title: objective.name,
      open,
      subtitle: objective.relationship ? `Relationship: ${REL_LABEL[objective.relationship] ?? objective.relationship}` : "Not linked yet",
      facts: [
        ["Outcome", OUTCOME_LABEL[objective.outcome?.state] ?? "Unknown"],
        ["Evidence window", objective.outcome?.window ?? "\u2014"],
        ["Last evaluated", objective.outcome?.evaluated_at ?? "Never"],
        ...objective.unavailable === "archived" ? [["Status", "Unavailable (archived)"]] : [],
        ...objective.goal ? [["Goal", objective.goal.unavailable === "archived" ? `${objective.goal.title} (unavailable, archived)` : `${objective.goal.title} \u2014 ${GOAL_LABEL[objective.goal.state] ?? objective.goal.state}`]] : []
      ]
    };
  }
  if (sel.type === "goal") {
    const goal = (project.goals ?? []).find((row) => row.id === sel.id);
    if (!goal) {
      return { title: sel.goal?.title ?? sel.id, subtitle: "Goal", open, facts: [["Status", "Unavailable (archived)"]] };
    }
    const entry = contract?.key === `${project.id}/${goal.id}` ? contract : null;
    return {
      title: goal.title,
      subtitle: "Goal \xB7 its contract is read-only here",
      open,
      facts: [
        ["State", GOAL_LABEL[goal.state] ?? goal.state],
        ["Objectives linked", number(goal.objectives_linked ?? 0)],
        ["Objectives passed", goal.objectives_passed === null || goal.objectives_passed === void 0 ? "Unknown (evidence missing)" : number(goal.objectives_passed)],
        ...contractFacts(entry, goal.title)
      ]
    };
  }
  return null;
}
function Drawer({ type, body, onClose, onOpen }) {
  return jsxs("aside", { className: "dy-rm-drawer", "aria-live": "polite", "data-rm-drawer": type, children: [
    jsxs("header", { className: "dy-rm-drawer-head", children: [
      jsx("p", { className: "dockyard-meta", children: type }),
      jsx("h3", { children: body.title }),
      jsx("p", { children: body.subtitle })
    ] }),
    jsxs("div", { className: "dy-rm-drawer-body", children: [
      jsx("ul", { className: "dy-rm-facts", children: body.facts.map(([label, value]) => jsxs("li", { children: [
        jsx("span", { children: label }),
        jsx("span", { children: value })
      ] }, label)) }),
      body.extra ?? null,
      jsxs("div", { className: "dy-rm-actions", children: [
        jsx(Button, { variant: "primary", action: "roadmap-open", ariaLabel: `Open ${body.title} on its project screen`, onClick: () => onOpen(body.open), children: "Open" }),
        jsx(Button, { onClick: onClose, children: "Close" })
      ] })
    ] })
  ] });
}
function LinkDialog({ kind, projectId, projectLabel, onClose, onDone }) {
  const spec = LINK_KIND[kind];
  const [choices, setChoices] = useState(null);
  const [item, setItem] = useState("");
  const [initiative, setInitiative] = useState("");
  const [relationship, setRelationship] = useState(spec.relationships[0]);
  const [step, setStep] = useState("choose");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useDialogFocusManager(`[data-rm-link-dialog][data-rm-step="${step}"] .dy-rm-modal`);
  useEffect(() => {
    let current = true;
    loadRoadmapData(projectId).then((result) => {
      if (!current) return;
      const project = result.projects?.[0];
      setChoices({
        items: project ? spec.items(project) : [],
        initiatives: (project?.initiatives ?? []).map((row) => ({ ref: row.ref, title: row.title, governance: words(row.governance) }))
      });
    }).catch((failure) => {
      if (current) setError(String(failure?.message ?? failure));
    });
    return () => {
      current = false;
    };
  }, []);
  const itemLabel = choices?.items.find((row) => row.id === item)?.label ?? "";
  const initiativeTitle = choices?.initiatives.find((row) => row.ref === initiative)?.title ?? "";
  const ready = Boolean(choices && item && initiative);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await spec.submit(projectId, item, initiative, relationship);
      emitToast("success", `Linked \u201C${itemLabel}\u201D to \u201C${initiativeTitle}\u201D.`);
      onDone();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
      setBusy(false);
    }
  };
  const field = (id, label, value, onChange, options) => jsxs("label", { htmlFor: id, children: [
    label,
    jsx("select", { id, value, onChange: (event) => onChange(event.target.value), children: options })
  ] });
  const choose = jsxs("div", { className: "dy-rm-modal-body", children: [
    choices === null && !error ? jsx("p", { role: "status", children: "Loading choices\u2026" }) : null,
    choices && choices.items.length === 0 ? jsx("p", { children: `Nothing to link: every ${spec.itemLabel.toLowerCase()} in this project is already linked.` }) : null,
    choices && choices.items.length > 0 ? field("dy-rm-link-choice", spec.itemLabel, item, setItem, [
      jsx("option", { value: "", children: "Choose\u2026" }, ""),
      ...choices.items.map((row) => jsx("option", { value: row.id, children: row.label }, row.id))
    ]) : null,
    choices && choices.initiatives.length === 0 ? jsx("p", { children: "This project has no initiatives yet. Create one on the project screen first." }) : null,
    choices && choices.initiatives.length > 0 ? field("dy-rm-link-initiative", "Initiative", initiative, setInitiative, [
      jsx("option", { value: "", children: "Choose\u2026" }, ""),
      ...choices.initiatives.map((row) => jsx("option", { value: row.ref, children: `${row.title} (${row.governance})` }, row.ref))
    ]) : null,
    choices ? field(
      "dy-rm-link-rel",
      "Relationship",
      relationship,
      setRelationship,
      spec.relationships.map((value) => jsx("option", { value, children: REL_LABEL[value] ?? value }, value))
    ) : null,
    jsx("p", { className: "dy-rm-modal-error", role: "alert", children: error })
  ] });
  const confirm = jsxs("div", { className: "dy-rm-modal-body", "data-rm-link-confirm": true, children: [
    jsx("p", { className: "dy-rm-confirm", children: `Link the ${spec.itemLabel.toLowerCase()} \u201C${itemLabel}\u201D to the initiative \u201C${initiativeTitle}\u201D (${REL_LABEL[relationship] ?? relationship})?` }),
    jsx("p", { className: "dy-rm-confirm", children: "This records one link and an audit entry under your name." }),
    jsx("p", { className: "dy-rm-modal-error", role: "alert", children: error })
  ] });
  return jsx("div", {
    className: "dy-rm-modal-backdrop",
    "data-rm-link-dialog": true,
    "data-rm-step": step,
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    },
    children: jsxs("section", { className: "dy-rm-modal", role: "dialog", "aria-modal": true, "aria-label": spec.title, children: [
      jsxs("header", { className: "dy-rm-modal-head", children: [
        jsxs("div", { children: [jsx("p", { className: "dockyard-meta", children: "Link" }), jsx("h3", { children: spec.title }), jsx("p", { children: `Project ${projectLabel}` })] }),
        jsx(Button, { onClick: onClose, ariaLabel: "Close link dialog", children: "\xD7" })
      ] }),
      step === "choose" ? choose : confirm,
      step === "choose" ? jsxs("div", { className: "dy-rm-modal-actions", children: [
        jsx(Button, { onClick: onClose, children: "Cancel" }),
        jsx(Button, { variant: "primary", disabled: !ready, onClick: () => {
          setError(null);
          setStep("confirm");
        }, children: "Continue" })
      ] }) : jsxs("div", { className: "dy-rm-modal-actions", children: [
        jsx(Button, { disabled: busy, onClick: () => {
          setError(null);
          setStep("choose");
        }, children: "Back" }),
        jsx(Button, { variant: "primary", disabled: busy, onClick: submit, children: busy ? "Linking\u2026" : "Create link" })
      ] })
    ] })
  });
}
function RoadmapView({ initialScope = "all", onOpen, onRefresh }) {
  const [scope, setScope] = useState(initialScope);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [openNodes, setOpenNodes] = useState(() => /* @__PURE__ */ new Set());
  const [selection, setSelection] = useState(null);
  const [focusNode, setFocusNode] = useState(null);
  const [linkDialog, setLinkDialog] = useState(null);
  const [contract, setContract] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pickerProjects, setPickerProjects] = useState([]);
  const loadSerial = useRef(0);
  const load = async () => {
    const serial = ++loadSerial.current;
    setLoading(true);
    setError(null);
    setRefreshTick((tick) => tick + 1);
    try {
      const result = await loadRoadmapData(scope === "all" ? null : scope);
      if (serial !== loadSerial.current) return;
      setData(result);
      if (scope === "all") setPickerProjects((result.projects ?? []).map(({ id, label }) => ({ id, label })));
    } catch (failure) {
      if (serial === loadSerial.current) setError(String(failure?.message ?? failure));
    } finally {
      if (serial === loadSerial.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [scope]);
  useEffect(() => {
    if (scope === "all" || pickerProjects.length) return void 0;
    let current = true;
    loadRoadmapData(null).then((result) => {
      if (current) setPickerProjects((result.projects ?? []).map(({ id, label }) => ({ id, label })));
    }).catch(() => {
    });
    return () => {
      current = false;
    };
  }, [scope]);
  useEffect(() => {
    if (selection?.type !== "goal" || selection.goal?.unavailable === "archived") return void 0;
    const key = `${selection.projectId}/${selection.id}`;
    let current = true;
    setContract({ key, loading: true });
    api(`/projects/${encodeURIComponent(selection.projectId)}/goals/${encodeURIComponent(selection.id)}/contract`).then((result) => {
      if (current) setContract({ key, contract: result });
    }).catch((failure) => {
      if (current) setContract({ key, error: String(failure?.message ?? failure) });
    });
    return () => {
      current = false;
    };
  }, [selection?.node, refreshTick]);
  const changeScope = (next) => {
    setSelection(null);
    if (next === scope) return;
    setData(null);
    setScope(next);
  };
  const projects = data?.projects ?? [];
  const canWrite = data?.can_write === true;
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (project) => {
      if (attentionOnly && !project.attention) return false;
      if (!query) return true;
      const haystack = [
        project.id,
        project.label,
        project.mission,
        ...(project.initiatives ?? []).flatMap((row) => [
          row.ref,
          row.title,
          ...(row.milestones ?? []).map((m) => m.name),
          ...(row.objectives ?? []).flatMap((o) => [o.name, o.goal?.title])
        ]),
        ...(project.goals ?? []).map((g) => g.title),
        ...(project.unlinked?.milestones ?? []).map((m) => m.name),
        ...(project.unlinked?.objectives ?? []).map((o) => o.name)
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    };
  }, [search, attentionOnly]);
  const toggle = (node) => setOpenNodes((current) => {
    const next = new Set(current);
    if (next.has(node)) next.delete(node);
    else next.add(node);
    return next;
  });
  const openNode = (node) => setOpenNodes((current) => current.has(node) ? current : /* @__PURE__ */ new Set([...current, node]));
  useEffect(() => {
    const query = search.trim().toLowerCase();
    if (!query) return;
    setOpenNodes((current) => {
      const next = new Set(current);
      const hit = (value) => String(value ?? "").toLowerCase().includes(query);
      for (const project of projects) {
        for (const row of project.initiatives ?? []) {
          const goalHits = (row.objectives ?? []).filter((o) => o.goal && hit(o.goal.title));
          const childHit = (row.milestones ?? []).some((m) => hit(m.name)) || (row.objectives ?? []).some((o) => hit(o.name)) || goalHits.length > 0;
          if (childHit || hit(row.title) || hit(row.ref)) next.add(`project:${project.id}`);
          if (childHit) next.add(`initiative:${row.ref}`);
          for (const o of goalHits) next.add(`objective:${o.id}@${row.ref}`);
        }
        if ([...project.unlinked?.milestones ?? [], ...project.unlinked?.objectives ?? []].some((x) => hit(x.name))) next.add(`project:${project.id}`);
      }
      return next;
    });
  }, [search, data]);
  const linkButton = (kind, project) => jsx(Button, {
    small: true,
    action: `roadmap-link-${kind}`,
    onClick: (event) => {
      event.stopPropagation();
      setLinkDialog({ kind, projectId: project.id, projectLabel: project.label ?? project.id });
    },
    children: "Link\u2026"
  });
  const rows = [];
  const add = (node, render) => rows.push({ node, render });
  const base = (node) => ({ node, selected: selection?.node === node, onFocusRow: setFocusNode });
  const visibleProjects = projects.filter(matches);
  for (const project of visibleProjects) {
    const pid = project.id;
    const projectNode = `project:${pid}`;
    const projectOpen = openNodes.has(projectNode);
    const initiativeCount = project.initiatives?.length ?? 0;
    add(projectNode, (tabStop2) => jsx(Row, {
      ...base(projectNode),
      tabStop: tabStop2,
      type: "project",
      depth: 0,
      label: project.label ?? pid,
      detail: `${number(initiativeCount)} ${plural(initiativeCount, "initiative")}${project.mission ? ` \xB7 ${project.mission}` : ""}`,
      expandable: true,
      open: projectOpen,
      chips: project.attention ? chip("Needs attention", "attention") : null,
      onToggle: () => toggle(projectNode),
      onOpen: () => {
        openNode(projectNode);
        setSelection({ type: "project", id: pid, projectId: pid, node: projectNode });
      }
    }, projectNode));
    if (!projectOpen) continue;
    if (project.features?.initiatives === false) {
      add(`${projectNode}:off`, (tabStop2) => jsx(PlainRow, {
        node: `${projectNode}:off`,
        depth: 1,
        tabStop: tabStop2,
        onFocusRow: setFocusNode,
        label: "Initiatives are turned off for this project.",
        detail: "Turn them on in the project settings to use the Roadmap here."
      }, `${projectNode}:off`));
      continue;
    }
    for (const initiative of project.initiatives ?? []) {
      const ref = initiative.ref;
      const initiativeNode = `initiative:${ref}`;
      const initiativeOpen = openNodes.has(initiativeNode);
      add(initiativeNode, (tabStop2) => jsx(Row, {
        ...base(initiativeNode),
        tabStop: tabStop2,
        type: "initiative",
        depth: 1,
        label: initiative.title,
        detail: initiative.attention_reasons?.length ? initiative.attention_reasons.map(words).join(" \xB7 ") : initiative.delivery?.state === "ok" ? `${number(initiative.delivery.total)} linked work items` : "No linked work",
        expandable: true,
        open: initiativeOpen,
        chips: jsxs(Fragment, { children: [
          deliveryChips(initiative.delivery),
          initiative.attention ? chip("Attention", "attention") : null
        ] }),
        onToggle: () => toggle(initiativeNode),
        onOpen: () => {
          openNode(initiativeNode);
          setSelection({ type: "initiative", id: ref, projectId: pid, node: initiativeNode });
        }
      }, initiativeNode));
      if (!initiativeOpen) continue;
      for (const milestone of initiative.milestones ?? []) {
        const milestoneNode = `milestone:${milestone.id}@${ref}`;
        const milestoneOpen = openNodes.has(milestoneNode) && !milestone.archived;
        add(milestoneNode, (tabStop2) => jsx(Row, {
          ...base(milestoneNode),
          tabStop: tabStop2,
          type: "milestone",
          depth: 2,
          label: milestone.name,
          detail: milestone.archived ? "Unavailable (archived)" : `${milestone.relationship ? REL_LABEL[milestone.relationship] : "not linked"}${milestone.also_under?.length ? ` \xB7 also under ${milestone.also_under.map((row) => row.title).join(", ")}` : ""}`,
          expandable: !milestone.archived,
          open: milestoneOpen,
          chips: jsxs(Fragment, { children: [
            deliveryChips(milestone.delivery),
            milestone.overdue ? chip("Overdue", "overdue") : null
          ] }),
          onToggle: () => toggle(milestoneNode),
          onOpen: () => {
            if (!milestone.archived) openNode(milestoneNode);
            setSelection({ type: "milestone", id: milestone.id, via: ref, projectId: pid, node: milestoneNode });
          }
        }, milestoneNode));
        if (milestoneOpen) {
          const itemsNode = `items:${milestone.id}@${ref}`;
          add(itemsNode, (tabStop2) => jsx(MilestoneItemsRow, {
            node: itemsNode,
            projectId: pid,
            milestoneId: milestone.id,
            tabStop: tabStop2,
            onFocusRow: setFocusNode,
            onOpen
          }, itemsNode));
        }
      }
      if (initiative.unmilestoned_work?.count > 0) {
        const looseNode = `loose:${ref}`;
        add(looseNode, (tabStop2) => jsx(PlainRow, {
          node: looseNode,
          depth: 2,
          tabStop: tabStop2,
          onFocusRow: setFocusNode,
          label: "Not in a milestone",
          detail: initiative.unmilestoned_work.items.map((item) => `${item.title} (${words(item.bucket)})`).join(", ")
        }, looseNode));
      }
      for (const objective of initiative.objectives ?? []) {
        const objectiveNode = `objective:${objective.id}@${ref}`;
        const objectiveOpen = openNodes.has(objectiveNode) && Boolean(objective.goal);
        add(objectiveNode, (tabStop2) => jsx(Row, {
          ...base(objectiveNode),
          tabStop: tabStop2,
          type: "objective",
          depth: 2,
          label: objective.name,
          detail: objective.unavailable === "archived" ? "Unavailable (archived)" : `Outcome: ${OUTCOME_LABEL[objective.outcome?.state] ?? "Unknown"}${objective.outcome?.evaluated_at ? "" : " \xB7 never evaluated"}`,
          expandable: Boolean(objective.goal),
          open: objectiveOpen,
          chips: jsxs(Fragment, { children: [
            chip(OUTCOME_LABEL[objective.outcome?.state] ?? "Unknown", objective.outcome?.state === "passed" ? "passed" : objective.outcome?.state === "failed" ? "failed" : ""),
            goalChip(objective.goal)
          ] }),
          onToggle: () => {
            if (objective.goal) toggle(objectiveNode);
          },
          onOpen: () => {
            if (objective.goal) openNode(objectiveNode);
            setSelection({ type: "objective", id: objective.id, via: ref, projectId: pid, node: objectiveNode });
          }
        }, objectiveNode));
        if (objectiveOpen) {
          const goal = objective.goal;
          const goalNode = `goal:${goal.id}@${objective.id}@${ref}`;
          add(goalNode, (tabStop2) => jsx(Row, {
            ...base(goalNode),
            tabStop: tabStop2,
            type: "goal",
            depth: 3,
            label: goal.unavailable === "archived" ? `${goal.title} \u2014 unavailable (archived)` : goal.title,
            detail: "Goal context \xB7 contract in the drawer (read-only)",
            expandable: false,
            open: false,
            chips: goal.unavailable !== "archived" ? chip(GOAL_LABEL[goal.state] ?? goal.state) : null,
            onToggle: () => {
            },
            onOpen: () => setSelection({ type: "goal", id: goal.id, goal, projectId: pid, node: goalNode })
          }, goalNode));
        }
      }
    }
    const unlinkedMilestones = project.unlinked?.milestones ?? [];
    if (unlinkedMilestones.length) {
      const node = `unlinked-milestones:${pid}`;
      add(node, (tabStop2) => jsx(Row, {
        ...base(node),
        tabStop: tabStop2,
        type: "milestone",
        depth: 1,
        label: "Milestones not linked to an initiative",
        detail: unlinkedMilestones.map((m) => m.name).join(", "),
        expandable: false,
        open: false,
        actions: canWrite ? linkButton("milestone", project) : null,
        onToggle: () => {
        },
        onOpen: () => {
        }
      }, node));
    }
    const unlinkedObjectives = project.unlinked?.objectives ?? [];
    if (unlinkedObjectives.length) {
      const node = `unlinked-objectives:${pid}`;
      add(node, (tabStop2) => jsx(Row, {
        ...base(node),
        tabStop: tabStop2,
        type: "objective",
        depth: 1,
        label: "Objectives not linked to an initiative",
        detail: unlinkedObjectives.map((o) => o.name).join(", "),
        expandable: false,
        open: false,
        actions: canWrite ? linkButton("objective", project) : null,
        onToggle: () => {
        },
        onOpen: () => {
        }
      }, node));
    }
  }
  const nodes = rows.map((row) => row.node);
  const tabStop = nodes.includes(focusNode) ? focusNode : nodes[0];
  const selectedProject = selection ? projects.find((project) => project.id === selection.projectId) ?? null : null;
  const body = selection && selectedProject ? drawerBody(selection, selectedProject, contract, onOpen) : null;
  const content = loading && !data ? jsx(LoadingState, {}) : error ? jsx(ErrorState, { error, onRetry: load }) : !visibleProjects.length ? jsx(EmptyState, { title: "No projects match this view", description: "Adjust the search, the attention filter, or the project picker." }) : jsxs("div", { className: `dy-rm-shell${body ? "" : " full"}`, children: [
    jsxs("section", { className: "dy-rm-tree", role: "tree", "aria-label": "Project roadmap tree", onKeyDown: treeKeydown, "data-rm-tree": true, children: [
      jsxs("header", { className: "dy-rm-tree-head", children: [
        jsx("strong", { children: scope === "all" ? "All projects" : projects[0]?.label ?? scope }),
        jsx("span", { children: `${number(visibleProjects.length)} shown` })
      ] }),
      ...rows.map((row) => row.render(row.node === tabStop))
    ] }),
    body ? jsx(Drawer, { type: selection.type, body, onClose: () => setSelection(null), onOpen }) : null
  ] });
  const known = pickerProjects.length ? pickerProjects : projects.map(({ id, label }) => ({ id, label }));
  const options = scope !== "all" && !known.some((project) => project.id === scope) ? [...known, { id: scope, label: scope }] : known;
  return jsxs("div", { className: "dy-rm-page", "data-roadmap-screen": true, children: [
    jsx(PageHead, {
      title: "Roadmap",
      description: "Projects first: initiatives, milestones, objectives and goals \u2014 linked by hand, never inferred.",
      onRefresh: () => {
        void load();
        onRefresh?.();
      },
      status: error ? "Load failed" : null
    }),
    // Filters in the signed v4 order: project, search, attention, Reset.
    // Every control shares one height, radius and font (roadmap-css.js).
    jsxs("div", { className: "dy-rm-toolbar", role: "group", "aria-label": "Roadmap filters", children: [
      jsxs("label", { className: "dy-rm-control dy-rm-scope", children: [
        jsx("span", { className: "dy-rm-scope-label", children: "Project" }),
        jsx("select", { value: scope, onChange: (event) => changeScope(event.target.value), "aria-label": "Roadmap project picker", children: [
          jsx("option", { value: "all", children: "All projects" }, "all"),
          ...options.map((project) => jsx("option", { value: project.id, children: project.label ?? project.id }, project.id))
        ] }),
        jsx(Icon, { name: "chevron-down" })
      ] }),
      jsxs("label", { className: "dy-rm-control dy-rm-search", children: [
        jsx(Icon, { name: "search" }),
        jsx("input", { type: "search", placeholder: "Search the roadmap", value: search, onChange: (event) => setSearch(event.target.value), "aria-label": "Search the roadmap" })
      ] }),
      jsxs("label", { className: "dy-rm-control dy-rm-attention", children: [
        jsx("input", { type: "checkbox", checked: attentionOnly, onChange: (event) => setAttentionOnly(event.target.checked) }),
        jsx("span", { children: "Needs attention only" })
      ] }),
      jsx("button", { type: "button", className: "dy-rm-control dy-rm-reset", onClick: () => {
        setSearch("");
        setAttentionOnly(false);
        setOpenNodes(/* @__PURE__ */ new Set());
        changeScope("all");
      }, children: "Reset" })
    ] }),
    content,
    linkDialog ? jsx(LinkDialog, {
      ...linkDialog,
      onClose: () => setLinkDialog(null),
      onDone: () => {
        setLinkDialog(null);
        void load();
      }
    }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/shell/dashboard-page.js
function DashboardPage() {
  useDockyardStyles();
  const [tab, setTab] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOptions, setProjectOptions] = useState([]);
  const [projectEntryView, setProjectEntryView] = useState("overview");
  const [roadmap, setRoadmap] = useState({ scope: "all", version: 0 });
  const showRoadmap = (scope) => setRoadmap(({ version }) => ({ scope, version: version + 1 }));
  const [dashboardHomeVersion, setDashboardHomeVersion] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [counts, setCounts] = useState({ approvals: null, notifications: null });
  const [loadScope, setLoadScope] = useState(null);
  const [pendingWorkRef, setPendingWorkRef] = useState(null);
  const loadSerial = useRef(0);
  const [dirtyProject, setDirtyProject] = useState(null);
  const [pendingProject, setPendingProject] = useState(null);
  const [pendingTab, setPendingTab] = useState(null);
  const dirtySaver = useRef(null);
  const [navSaving, setNavSaving] = useState(false);
  const markDirty = (projectId) => (dirty, saver) => {
    setDirtyProject(dirty ? projectId : null);
    dirtySaver.current = dirty ? saver ?? null : null;
  };
  useEffect(() => {
    const timers = /* @__PURE__ */ new Map();
    const handleToast = (event) => {
      const toast = event.detail;
      if (!toast?.id || !toast?.message) return;
      setToasts((current) => [...current.slice(-3), toast]);
      timers.set(toast.id, window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
        timers.delete(toast.id);
      }, 5e3));
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      for (const timer of timers.values()) window.clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const serial = ++loadSerial.current;
    let current = true;
    const nextLoadScope = `${tab}:${selectedProject ?? ""}`;
    if (loadScope !== nextLoadScope) {
      setData(null);
      setLoadScope(nextLoadScope);
    }
    setError(null);
    const loader = tab === "workflows-library" ? async () => ({ workflows: (await api("/workflow-library")).workflows ?? [] }) : tab === "dashboard" ? loadDashboardData : tab === "roadmap" ? async () => ({}) : tab === "project" || tab === "settings" || tab === "workflows" ? () => loadProjectData(selectedProject) : tab === "backlog" ? () => loadBacklogData(selectedProject) : tab === "teams" ? loadTeamsData : tab === "initiative" ? () => loadProjectData(selectedProject) : tab === "onboard" ? loadOnboardData : tab === "inbox" ? loadInboxData : () => api("/notifications");
    loader().then(
      (result) => {
        if (!current || serial !== loadSerial.current) return;
        setData({ tab, projectId: selectedProject, payload: result });
        if (result.projects) {
          const options = sortProjects(result.projects);
          setProjectOptions(options);
          if (!selectedProject && options.length) setSelectedProject(result.project?.id || options[0].id);
        }
        if (tab === "dashboard") {
          setCounts({
            approvals: Number(result.inbox?.count ?? result.owed_decisions ?? 0),
            notifications: Number((result.notifications?.notifications ?? []).filter((note) => !note.acked).length)
          });
        } else if (tab === "inbox") {
          setCounts((previous) => ({ ...previous, approvals: Number(result.count ?? result.items?.length ?? 0) }));
        } else if (tab === "notifications") {
          setCounts((previous) => ({ ...previous, notifications: Number((result.notifications ?? []).filter((note) => !note.acked).length) }));
        }
      },
      (failure) => {
        if (current && serial === loadSerial.current) setError({ tab, error: failure });
      }
    );
    return () => {
      current = false;
    };
  }, [tab, selectedProject, requestVersion]);
  const refresh = () => setRequestVersion((version) => version + 1);
  const selectProject = (projectId) => {
    if (projectId === selectedProject) {
      if (tab === "roadmap") showRoadmap(projectId);
      return;
    }
    if (dirtyProject && dirtyProject !== projectId) {
      setPendingProject(projectId);
      return;
    }
    setDirtyProject(null);
    setSelectedProject(projectId);
    if (tab === "roadmap") showRoadmap(projectId ?? "all");
    if (tab === "dashboard" || tab === "notifications" || tab === "inbox" || tab === "onboard") setTab("project");
  };
  const pendingTabOpts = useRef({});
  const goTab = (next, opts = {}) => {
    if (opts.project) setSelectedProject(opts.project);
    if (next === "project") setProjectEntryView(opts.entryView ?? "overview");
    if (next === "roadmap") showRoadmap(opts.roadmapScope ?? "all");
    if (next === "dashboard") setDashboardHomeVersion((value) => value + 1);
    setTab(next);
  };
  const requestTab = (next, opts = {}) => {
    if (next !== tab && dirtyProject) {
      pendingTabOpts.current = opts;
      setPendingTab(next);
      return;
    }
    goTab(next, opts);
  };
  const cancelNav = () => {
    setPendingProject(null);
    setPendingTab(null);
    pendingTabOpts.current = {};
  };
  const continueNav = () => {
    const project = pendingProject;
    const nextTab = pendingTab;
    setPendingProject(null);
    setPendingTab(null);
    setDirtyProject(null);
    dirtySaver.current = null;
    if (project) {
      setSelectedProject(project);
      if (tab === "roadmap") showRoadmap(project);
      if (tab === "dashboard" || tab === "notifications" || tab === "inbox" || tab === "onboard") setTab("project");
    } else if (nextTab) {
      const opts = pendingTabOpts.current;
      pendingTabOpts.current = {};
      goTab(nextTab, opts);
    }
  };
  const discardProjectChange = continueNav;
  const saveThenNavigate = async () => {
    if (!dirtySaver.current) return;
    setNavSaving(true);
    const ok = await dirtySaver.current();
    setNavSaving(false);
    if (ok) continueNav();
    else if (!dirtySaver.current) cancelNav();
  };
  const navPending = pendingProject || pendingTab;
  useDialogFocusManager(navPending ? "[data-project-switch-confirm] .dockyard-modal" : null);
  const dismissToast = (id) => setToasts((current) => current.filter((toast) => toast.id !== id));
  const completeOnboarding = (result) => {
    setOnboardingOpen(false);
    setSelectedProject(result?.project_id ?? null);
    setTab("project");
  };
  const acknowledge = (id) => {
    setData((previous) => {
      if (previous?.tab !== "notifications" || !previous.payload?.notifications) return previous;
      return {
        ...previous,
        payload: {
          ...previous.payload,
          notifications: previous.payload.notifications.map((note) => note.id === id ? { ...note, acked: true } : note)
        }
      };
    });
    setCounts((previous) => ({ ...previous, notifications: Math.max(0, Number(previous.notifications ?? 1) - 1) }));
  };
  const [deepLinkNotice, setDeepLinkNotice] = useState(null);
  const openDeepLink = (link) => {
    if (typeof link !== "string" || !link.includes(":")) return;
    const [screen, rest] = link.split(":", 2);
    const slash = rest.indexOf("/");
    const objectKind = slash >= 0 ? rest.slice(0, slash) : "";
    const objectId = slash >= 0 ? rest.slice(slash + 1) : rest;
    if (screen === "s4" || screen === "s6" && objectKind === "initiative") {
      setDeepLinkNotice(objectId ? `Approval inbox: focus ${objectId}` : null);
      setTab("inbox");
      return;
    }
    if (screen === "s2" && objectKind === "work" && objectId) {
      const known = Object.entries(data?.payload?.projectContext ?? {});
      const ownerProject = known.find(([, context]) => (context.workItems ?? []).some((item) => item.ref === objectId));
      setDeepLinkNotice(ownerProject ? null : `Work item ${objectId} is not in the current board data.`);
      setSelectedProject(ownerProject ? ownerProject[0] : selectedProject ?? data?.payload?.projects?.[0]?.id ?? null);
      setProjectEntryView("overview");
      setTab("project");
      setPendingWorkRef(objectId);
      return;
    }
    if (screen === "s2" && objectKind === "project" && objectId) {
      setDeepLinkNotice(null);
      setSelectedProject(objectId);
      setProjectEntryView("overview");
      setTab("project");
      return;
    }
    if (screen === "s1" && objectKind === "project" && objectId) {
      setDeepLinkNotice(null);
      setSelectedProject(objectId);
      setProjectEntryView("overview");
      setTab("project");
      return;
    }
    if (screen === "s2" || screen === "s1") {
      if (objectId) {
        setSelectedProject(objectId);
        setProjectEntryView("overview");
        setTab("project");
        return;
      }
      setTab("dashboard");
      return;
    }
    if (screen === "s5") {
      setTab("teams");
      return;
    }
    setTab("dashboard");
  };
  const payload = data?.tab === tab && data.projectId === selectedProject ? data.payload : null;
  const activeError = error?.tab === tab ? error.error : null;
  let content;
  if (activeError) {
    content = jsx(ErrorState, { error: activeError, onRetry: refresh });
  } else if (!payload) {
    content = jsx(LoadingState, {});
  } else if (tab === "dashboard") {
    content = jsx(DashboardView, { view: payload, onInbox: () => setTab("inbox"), onRefresh: refresh, onOpen: openDeepLink, resetView: dashboardHomeVersion });
  } else if (tab === "project") {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: projectEntryView,
      onSelectProject: selectProject,
      onProjectDirty: markDirty(payload.project?.id ?? null),
      onRefresh: refresh,
      onOpenLibrary: () => requestTab("workflows"),
      onOpenRoadmap: () => requestTab("roadmap", { roadmapScope: payload.project?.id }),
      pendingWorkRef,
      onPendingWorkConsumed: () => setPendingWorkRef(null),
      notice: deepLinkNotice
    }, `project:${payload.project?.id ?? payload.missingProject ?? "none"}`);
  } else if (tab === "settings") {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: "settings",
      onSelectProject: selectProject,
      onProjectDirty: markDirty(payload.project?.id ?? null),
      onRefresh: refresh,
      notice: deepLinkNotice
    }, `settings:${payload.project?.id ?? payload.missingProject ?? "none"}`);
  } else if (tab === "workflows") {
    content = jsx(WorkflowLibraryView, {
      projectId: selectedProject,
      onOpenBuilder: (row) => {
        const owner = row?.owner_project_id;
        requestTab("project", { entryView: "workflows", project: owner && owner !== selectedProject ? owner : void 0 });
      }
    }, `workflow-library:${selectedProject ?? "none"}`);
  } else if (tab === "onboard") {
    content = jsx(OnboardPanel, { view: payload, onOpen: () => setOnboardingOpen(true), onRefresh: refresh });
  } else if (tab === "roadmap") {
    content = jsx(RoadmapView, {
      initialScope: roadmap.scope,
      onRefresh: refresh,
      onOpen: ({ project, entryView, workRef }) => {
        if (workRef) setPendingWorkRef(workRef);
        requestTab("project", { project, entryView });
      }
    }, `roadmap:${roadmap.version}`);
  } else if (tab === "backlog") {
    content = jsx(BacklogView, { view: payload, onRefresh: refresh });
  } else if (tab === "teams") {
    content = jsx(TeamsView, { view: payload, onRefresh: refresh });
  } else if (tab === "initiative") {
    content = jsx(InitiativeView, { view: payload, onRefresh: refresh });
  } else if (tab === "inbox") {
    content = jsx(InboxView, { view: payload, onRefresh: refresh });
  } else {
    content = jsx(NotificationsView, { view: payload, onRefresh: refresh, onAcknowledged: acknowledge, onOpen: openDeepLink });
  }
  return jsxs("div", { className: "dockyard-root", children: [
    jsxs("div", { className: "dockyard-shell", children: [
      jsx(ConsoleBar, {
        tab,
        counts,
        projects: projectOptions,
        selectedProject,
        onProjectChange: selectProject,
        onTab: requestTab,
        onNewProject: () => setOnboardingOpen(true),
        onOpen: openDeepLink
      }),
      jsx("main", {
        id: "dockyard-panel",
        role: "tabpanel",
        "aria-labelledby": `dockyard-tab-${tab}`,
        children: content
      })
    ] }),
    jsx(ToastRegion, { toasts, onDismiss: dismissToast }),
    navPending ? jsxs("section", { className: "dockyard-modal-layer", "data-project-switch-confirm": true, "data-nav-target": pendingProject ? `project:${pendingProject}` : `tab:${pendingTab}`, children: [
      jsxs("div", {
        className: "dockyard-modal",
        role: "alertdialog",
        "aria-modal": true,
        "aria-label": "Unsaved changes",
        onKeyDown: (event) => {
          if (event.key === "Escape" && !navSaving) {
            event.stopPropagation();
            cancelNav();
          }
        },
        children: [
          jsx("h2", { children: "Unsaved changes" }),
          jsx("p", { children: `This project has unsaved changes. ${dirtySaver.current ? "Save them and continue, discard them, or cancel to keep editing." : "Discard them to continue, or cancel to keep editing."}` }),
          jsxs("div", { className: "dockyard-modal-actions", children: [
            jsx(Button, { action: "nav-cancel", disabled: navSaving, onClick: cancelNav, children: "Cancel" }),
            jsx(Button, { variant: "danger", action: "nav-discard", disabled: navSaving, onClick: discardProjectChange, children: "Discard" }),
            dirtySaver.current ? jsx(Button, { variant: "primary", action: "nav-save", disabled: navSaving, onClick: saveThenNavigate, children: navSaving ? "Saving..." : "Save and continue" }) : null
          ] })
        ]
      })
    ] }) : null,
    onboardingOpen ? jsx(OnboardingWizard, { onClose: () => setOnboardingOpen(false), onComplete: completeOnboarding }) : null
  ] });
}

// hermes_dockyard_plugin/desktop/src/index.js
var __plugin = {
  id: "hermes-dockyard",
  name: "Hermes Dockyard",
  register(ctx) {
    bindContext(ctx);
    ctx.registerMany([
      {
        id: "page",
        area: "routes",
        data: { path: "/dockyard" },
        render: () => jsx(DashboardPage, {})
      },
      {
        id: "nav",
        area: "sidebar.nav",
        order: 55,
        data: { codicon: "project", label: "Dockyard", path: "/dockyard" }
      },
      {
        id: "open",
        area: "palette",
        data: {
          id: "hermes-dockyard.open",
          label: "Dockyard: Open fleet overview",
          keywords: ["dockyard", "fleet", "projects", "approvals", "notifications"],
          run: () => host.navigate("/dockyard")
        }
      }
    ]);
  }
};
var index_default = __plugin;
export {
  DOCKYARD_TEST,
  index_default as default
};
