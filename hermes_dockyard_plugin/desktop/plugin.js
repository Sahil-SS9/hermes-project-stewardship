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
.dockyard-root .dockyard-tabs { flex-wrap: wrap;
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
.dockyard-root .dockyard-wf3 { display: grid; grid-template-columns: 250px minmax(0, 1fr) 320px; gap: 0; margin-top: 16px; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px; background: var(--dy-surface); }
.dockyard-root .dockyard-wf3-lib { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
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
.dockyard-root .dockyard-wf3-insp { display: flex; flex-direction: column; gap: 10px; min-width: 0; overflow: auto; padding: 14px; border-left: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dockyard-root .dockyard-wf3-insp-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--dy-border); }
.dockyard-root .dockyard-wf3-insp-head strong { font-size: 12.5px; }
.dockyard-root .dockyard-wf3-insp-head span { color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-wf3-runkey { margin: 6px 0 2px; color: var(--dy-text); font-size: 12.5px; font-weight: 600; }
.dockyard-root .dockyard-wf3-counts { margin: 0 0 6px; color: var(--dy-text-3); font-size: 11px; }
.dockyard-root .dockyard-wf3-insp ul { margin: 6px 0 0; padding: 0 0 0 16px; display: grid; gap: 3px; }
.dockyard-root .dockyard-wf3-insp li { color: var(--dy-text-2); font-size: 12px; }
@media (max-width: 1250px) {
  .dockyard-root .dockyard-wf3 { grid-template-columns: 220px minmax(0, 1fr); }
  .dockyard-root .dockyard-wf3-insp { grid-column: 1 / -1; border-left: 0; border-top: 1px solid var(--dy-border); }
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

// hermes_dockyard_plugin/desktop/workflow-canvas-css.js
var workflow_canvas_css_default = `
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
     below) \u2014 declared once instead of twice. */
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
   colours (purpose only \u2014 status stays the status column beside it). */
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
   canvas styles \u2014 the canvas is the only thing these selectors touch.) */
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
/* Board switcher: compact on desktop and allowed to collapse on narrow screens. */
.dy-pc-scope .dy-pc-board-bar { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface); }
.dy-pc-scope .dy-pc-board-title { display: flex; align-items: baseline; gap: 9px; min-width: 0; flex: 1 1 auto; }
.dy-pc-scope .dy-pc-board-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dy-text); font-size: 13px; }
.dy-pc-scope .dy-pc-board-count { color: var(--dy-text-3); font-size: 11px; }
.dy-pc-scope .dy-pc-theme-toggle { display: flex; gap: 2px; border: 1px solid var(--dy-border); border-radius: 8px; padding: 2px; }
.dy-pc-scope .dy-pc-theme-toggle .dockyard-button { min-width: 29px; padding: 5px; }
.dy-pc-scope .dy-pc-board-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 6px; padding: 9px 12px; border-bottom: 1px solid var(--dy-border); background: var(--dy-surface-subtle); }
.dy-pc-scope .dy-pc-board-row { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 8px 9px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface); color: var(--dy-text); text-align: left; cursor: pointer; }
.dy-pc-scope .dy-pc-board-row:hover, .dy-pc-scope .dy-pc-board-row.active { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); }
.dy-pc-scope .dy-pc-board-row:disabled { cursor: wait; opacity: .65; }
.dy-pc-scope .dy-pc-board-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 99px; background: var(--dy-success); }
.dy-pc-scope .dy-pc-board-dot[data-status="submitted"] { background: var(--dy-warning); }
.dy-pc-scope .dy-pc-board-dot[data-status="completed"], .dy-pc-scope .dy-pc-board-dot[data-status="archived"] { background: var(--dy-text-3); }
.dy-pc-scope .dy-pc-board-row-copy { display: grid; min-width: 0; gap: 2px; }
.dy-pc-scope .dy-pc-board-row-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; }
.dy-pc-scope .dy-pc-board-row-copy small { color: var(--dy-text-3); font-size: 10px; }
.dy-pc-scope .dy-pc-board-warning { margin-left: auto; color: var(--dy-warning); font-weight: 800; }

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
/* B9: the stored rect drives the rendered box \u2014 the inline height style set by
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
.dy-pc-scope .dy-pc-obj[data-canvas-colour="yellow"] { border-top-color: #9a6206; }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="green"] { border-top-color: #1f7a55; }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="blue"] { border-top-color: #2f4bb5; }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="pink"] { border-top-color: #a8275f; }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="purple"] { border-top-color: #6b4bbd; }
.dy-pc-scope .dy-pc-obj[data-canvas-colour="orange"] { border-top-color: #a4520b; }
.dy-pc-scope .dy-pc-obj:hover { border-top-color: var(--dy-accent-border); border-right-color: var(--dy-accent-border); border-bottom-color: var(--dy-accent-border); }
.dy-pc-scope .dy-pc-obj.selected { border-top-color: var(--dy-accent-border); border-right-color: var(--dy-accent-border); border-bottom-color: var(--dy-accent-border); box-shadow: 0 0 0 2px var(--dy-accent-soft), var(--dy-shadow); }
.dy-pc-scope .dy-pc-obj:focus-visible { outline: 2px solid var(--dy-focus); outline-offset: 2px; }
.dy-pc-scope .dy-pc-obj small { display: block; font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--dy-text-3); }
.dy-pc-scope .dy-pc-obj strong { display: block; margin-top: 5px; font-size: 13px; font-weight: 500; line-height: 1.4; color: var(--dy-text); }
.dy-pc-scope .dy-pc-obj-meta { display: block; margin-top: 6px; color: var(--dy-text-3); font-size: 10px; }
.dy-pc-scope .dy-pc-empty { position: absolute; left: 18px; top: 16px; margin: 0; color: var(--dy-text-3); font-size: 12px; }
/* Frames are decorative group labels (v6's .pframe) \u2014 never controls. */
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
    const message = /(?:error\s*)?500|internal service error/i.test(raw) ? "Dockyard could not confirm the request." : raw;
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
  const words = String(value || "?").replace(/-bot$/i, "").split(/[-_\s]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join("") || "?";
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

// hermes_dockyard_plugin/desktop/src/project/canvas.js
var CANVAS_OBJECT_KINDS = Object.freeze(["evidence", "claim", "question", "decision", "plan_block", "note", "link", "media"]);
var CANVAS_CONNECTOR_MEANINGS = Object.freeze(["supports", "contradicts", "derived_from", "clarifies", "depends_on", "implements", "raises_question"]);
var CANVAS_KIND_LABELS = Object.freeze({ evidence: "Evidence", claim: "Claim", question: "Question", decision: "Decision", plan_block: "Plan block", note: "Note", link: "Link", media: "Media" });
var CANVAS_STICKER_COLOURS = Object.freeze(["yellow", "green", "blue", "pink", "purple", "orange"]);
var CANVAS_STICKER_LABELS = Object.freeze({ yellow: "Sun", green: "Mint", blue: "Sky", pink: "Rose", purple: "Violet", orange: "Amber" });
var CANVAS_KIND_ICONS = Object.freeze({
  evidence: "file-text",
  claim: "message-square",
  question: "lightbulb",
  decision: "flag",
  plan_block: "list-checks",
  note: "sticky-note",
  link: "link",
  media: "image"
});
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
function PlanningCanvasPanel({ project, canvas: initialCanvas, content = [], onRefresh }) {
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
  const [theme, setTheme] = useState(initialCanvas?.theme ?? "dark");
  const [modelOptions, setModelOptions] = useState(null);
  const [boardScoped, setBoardScoped] = useState(false);
  const stageRef = useRef(null);
  const encoded = encodeURIComponent(project.id);
  const revision = Number(canvas?.revision ?? 0);
  const selected = objects.find((item) => item.id === selectedId) ?? null;
  const canvasRoute = boardScoped && canvas?.canvas_id && canvas?.name ? `/projects/${encoded}/canvases/${encodeURIComponent(canvas.canvas_id)}` : `/projects/${encoded}/canvas`;
  useEffect(() => {
    const next = initialCanvas ?? { revision: 0, objects: [], connectors: [] };
    setCanvas(next);
    setObjects(next.objects ?? []);
    setConnectors(next.connectors ?? []);
    setDirty(false);
    setHistory([]);
    setFuture([]);
    setSelectedIds([]);
    setSelectedId(null);
  }, [initialCanvas]);
  useEffect(() => {
    let live = true;
    api(`/projects/${encoded}/canvases`).then((result) => {
      if (live) setBoards(result.canvases ?? []);
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
  const selectBoard = async (board) => {
    if (!board?.canvas_id || board.canvas_id === canvas?.canvas_id) return;
    setBoardBusy(true);
    try {
      const fresh = await api(`/projects/${encoded}/canvases/${encodeURIComponent(board.canvas_id)}`);
      setCanvas(fresh);
      setObjects(fresh.objects ?? []);
      setConnectors(fresh.connectors ?? []);
      setBoardScoped(true);
      setTheme(fresh.theme ?? "dark");
      setDirty(false);
      setSelectedId(null);
      setSelectedIds([]);
      setNotice({ tone: "ok", text: `Opened ${fresh.name} at revision ${fresh.revision}.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Board could not be opened: ${String(failure?.message ?? failure)}` });
    }
    setBoardBusy(false);
  };
  const setBoardTheme = async (nextTheme) => {
    setTheme(nextTheme);
    if (!canvas?.canvas_id) return;
    try {
      const fresh = await api(`/projects/${encoded}/canvases/${encodeURIComponent(canvas.canvas_id)}`, { method: "PATCH", body: { theme: nextTheme } });
      setCanvas((current) => ({ ...current ?? {}, ...fresh, theme: nextTheme }));
    } catch (failure) {
      setNotice({ tone: "danger", text: `Theme could not be saved: ${String(failure?.message ?? failure)}` });
    }
  };
  const selectedColour = selected?.colour ?? null;
  const setSelectedColour = (colour) => {
    if (!selected) return;
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, colour: colour || null } : item));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
  };
  const snapshot = (currentObjects, currentConnectors) => ({ objects: currentObjects.map((row) => ({ ...row })), connectors: currentConnectors.map((row) => ({ ...row })) });
  const undo = () => {
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
    try {
      const fresh = await api(canvasRoute);
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
      setNotice({ tone: "danger", text: `Reload failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
  };
  const save = async () => {
    setBusy(true);
    try {
      const rows = persistableObjects();
      const edges = persistableConnectors(rows);
      const saved = await api(canvasRoute, { method: "PUT", body: { expected_revision: revision, objects: rows, connectors: edges } });
      setCanvas(saved);
      setObjects(saved.objects ?? []);
      setConnectors(saved.connectors ?? []);
      setDirty(false);
      setNotice({ tone: "ok", text: `Canvas saved \u2014 revision ${saved.revision} with ${(saved.objects ?? []).length} object(s) and ${(saved.connectors ?? []).length} connector(s).` });
      onRefresh?.();
    } catch (failure) {
      const message = String(failure?.message ?? failure);
      if (/\b409\b|conflict/i.test(message)) {
        try {
          const fresh = await api(canvasRoute);
          setCanvas(fresh);
          setObjects(fresh.objects ?? []);
          setConnectors(fresh.connectors ?? []);
          setDirty(false);
          setNotice({ tone: "danger", text: `Revision conflict \u2014 this canvas changed elsewhere and was reloaded at revision ${fresh.revision}. Your unsaved edit was not applied.` });
        } catch (reloadFailure) {
          setNotice({ tone: "danger", text: `Canvas save failed: ${message}` });
        }
      } else {
        setNotice({ tone: "danger", text: `Canvas save failed: ${message}` });
      }
    }
    setBusy(false);
  };
  const addObject = (objectKind, text) => {
    const body = String(text ?? "").trim();
    if (!body) return null;
    const before = snapshot(objects, connectors);
    const position = canvasPlaced(objects);
    canvasObjectSeq += 1;
    const item = {
      id: `canvas-obj-${Date.now()}-${canvasObjectSeq}`,
      kind: objectKind,
      content: { text: body },
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
  };
  const applyDrawer = () => {
    if (!selected) return;
    const text = drawerText.trim();
    if (!text) return;
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item) => item.id === selected.id ? { ...item, kind: drawerKind, content: { ...item.content ?? {}, text } } : item));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: "Object updated \u2014 Save canvas to persist the change." });
  };
  const removeSelected = async () => {
    if (!selected) return;
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
    setBusy(true);
    try {
      const saved = await api(`${canvasRoute}/objects/${encodeURIComponent(selected.id)}?expected_revision=${revision}`, { method: "DELETE" });
      setCanvas(saved);
      setObjects(saved.objects ?? []);
      setConnectors(saved.connectors ?? []);
      setDirty(false);
      setSelectedId(null);
      setNotice({ tone: "ok", text: `Object removed \u2014 revision ${saved.revision} with ${(saved.objects ?? []).length} object(s).` });
      onRefresh?.();
    } catch (failure) {
      setNotice({ tone: "danger", text: `Remove failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
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
  const beginPan = (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target?.closest?.(".dy-pc-obj") || target?.closest?.(".dy-pc-drawer") || target?.closest?.(".dy-pc-chat")) return;
    const stageBox = stageRef.current?.getBoundingClientRect();
    if (!stageBox) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originPan = { x: pan.x, y: pan.y };
    let moved = false;
    if (mode === "select") {
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
        const scale = zoom;
        const x1 = (Math.min(startX, moveEvent.clientX) - stageBox.x - pan.x) / scale;
        const y1 = (Math.min(startY, moveEvent.clientY) - stageBox.y - pan.y) / scale;
        const x2 = (Math.max(startX, moveEvent.clientX) - stageBox.x - pan.x) / scale;
        const y2 = (Math.max(startY, moveEvent.clientY) - stageBox.y - pan.y) / scale;
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
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (!moved && Math.abs(dx) <= 3 && Math.abs(dy) <= 3) return;
      moved = true;
      setPan({ x: originPan.x + dx, y: originPan.y + dy });
    };
    const finish = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      if (!moved) {
        setSelectedId(null);
        setPendingConnect(null);
      }
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", finish);
  };
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
    const next = Number(canvasClamp(Math.min((box.width - 80) / Math.max(1, maxX - minX), (box.height - 80) / Math.max(1, maxY - minY)), CANVAS_ZOOM.min, CANVAS_ZOOM.max).toFixed(2));
    setZoom(next);
    setPan({ x: 40 - minX * next, y: 40 - minY * next });
  };
  const tidy = () => {
    const before = snapshot(objects, connectors);
    setObjects((current) => current.map((item, index) => ({ ...item, ...gridSlot(index, 3) })));
    setHistory((current) => [...current.slice(-49), before]);
    setFuture([]);
    setDirty(true);
    setNotice({ tone: "ok", text: "Tidied into a grid \u2014 Save canvas to persist the new positions." });
  };
  const onStageKeyDown = (event) => {
    const key = event.key;
    const meta = event.ctrlKey || event.metaKey;
    if (key === "Escape") {
      setSelectedId(null);
      setSelectedIds([]);
      setPendingConnect(null);
      return;
    }
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
    setBusy(true);
    setChatOpen(true);
    setChatBusy(true);
    try {
      const result = await api(`/projects/${encoded}/canvas/sessions`, { method: "POST", body: message ? { message } : {} });
      setSession(result);
      const proposals = (result.proposals ?? []).length;
      setNotice(result.status === "active" && result.current_question ? { tone: "ok", text: `Question: ${result.current_question.question}` } : { tone: "ok", text: `${number(proposals)} proposal(s) ready for review \u2014 nothing is applied automatically.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Curation failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
    setChatBusy(false);
  };
  const reviewCanvas = async () => {
    setBusy(true);
    setChatOpen(true);
    try {
      const result = await api(`${canvasRoute}/curate`, { method: "POST", body: {} });
      setReview(result);
      const summary = result.summary ?? {};
      const questions = (result.clarifying_questions ?? []).length;
      setNotice({ tone: "ok", text: `Review: ${number(summary.evidence_count)} evidence, ${number(summary.claim_count)} claim, ${number(summary.question_count)} question, ${number(summary.plan_block_count)} plan block \u2014 ${questions ? `${number(questions)} question(s) outstanding` : "no questions outstanding"}.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Review failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
  };
  const answerQuestion = async (outcome) => {
    if (!session?.session_id) return;
    setBusy(true);
    try {
      const result = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}/answer`, { method: "POST", body: { outcome, answer } });
      setSession(result);
      setAnswer("");
      const proposals = (result.proposals ?? []).length;
      if (result.status === "active" && result.current_question) setNotice({ tone: "ok", text: `Question: ${result.current_question.question}` });
      else if (outcome === "stop") setNotice({ tone: "ok", text: `Session stopped \u2014 ${number(proposals)} proposal(s) kept as scratch.` });
      else setNotice({ tone: "ok", text: `${number(proposals)} proposal(s) ready for review \u2014 approve or reject each one.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Answer failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
  };
  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text || chatBusy) return;
    setChatLog((current) => [...current, { role: "me", text }]);
    setChatDraft("");
    await curate(text);
  };
  const stopChat = () => {
    setChatBusy(false);
    setBusy(false);
    setNotice({ tone: "ok", text: "Assistant stopped \u2014 nothing runs after Stop." });
  };
  const decideProposal = async (proposal, approve) => {
    setBusy(true);
    try {
      const result = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/decision`, { method: "POST", body: { approve } });
      if (session?.session_id) {
        try {
          const fresh = await api(`/canvas/sessions/${encodeURIComponent(session.session_id)}`);
          setSession(fresh);
        } catch (readFailure) {
          setSession((current) => current ? { ...current, proposals: (current.proposals ?? []).map((row) => row.proposal_id === result.proposal_id ? { ...row, status: result.status } : row) } : current);
        }
      }
      setNotice({ tone: "ok", text: `Proposal ${result.status} \u2014 recorded only; the canvas is unchanged until you save an edit.` });
    } catch (failure) {
      setNotice({ tone: "danger", text: `Decision failed: ${String(failure?.message ?? failure)}` });
    }
    setBusy(false);
  };
  const synthesizePlan = async (proposal) => {
    setPlanBusy(true);
    try {
      const plan = await api(`/canvas/proposals/${encodeURIComponent(proposal.proposal_id)}/plan`, { method: "POST", body: { project_id: project.id }, suppressErrorToast: true });
      setPlanPanel(plan);
      setNotice({ tone: "ok", text: `Plan drafted from the approved proposal \u2014 ${number((plan.steps ?? []).length)} step(s), nothing applied to the board.` });
    } catch (failure) {
      setPlanPanel(null);
      setNotice({ tone: "danger", text: `Plan synthesis failed: ${String(failure?.message ?? failure)}` });
    }
    setPlanBusy(false);
  };
  const savePlanDocument = async () => {
    if (!planPanel?.plan_id) return;
    setPlanBusy(true);
    try {
      const saved = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/document/save`, { method: "POST", body: {} });
      setPlanPanel((current) => ({ ...current ?? {}, ...saved }));
      setNotice({ tone: "ok", text: "Implementation document saved to the Content tab as Markdown." });
      onRefresh?.();
    } catch (failure) {
      setNotice({ tone: "danger", text: `Document save failed: ${String(failure?.message ?? failure)}` });
    }
    setPlanBusy(false);
  };
  const planDocSaved = planPanel?.status === "documented";
  const createdOrders = new Set((planPanel?.backlog_created ?? []).map((row) => row.order));
  const pendingSteps = (planPanel?.steps ?? []).map((step) => step.order).filter((order) => !createdOrders.has(order));
  const createBacklogItems = async () => {
    if (!planPanel?.plan_id || !backlogConfirm?.length) return;
    setPlanBusy(true);
    try {
      const result = await api(`/projects/${encoded}/plans/${encodeURIComponent(planPanel.plan_id)}/backlog`, { method: "POST", body: { step_orders: backlogConfirm } });
      setPlanPanel((current) => ({ ...current ?? {}, backlog_created: result.backlog_created ?? [] }));
      setNotice({ tone: "ok", text: `${number((result.created ?? []).length)} backlog item(s) created: ${(result.created ?? []).map((row) => row.ref).join(", ")}.` });
      setBacklogConfirm(null);
      onRefresh?.();
    } catch (failure) {
      setNotice({ tone: "danger", text: `Backlog creation failed: ${String(failure?.message ?? failure)}` });
    }
    setPlanBusy(false);
  };
  const renderConnectors = () => {
    const byId = new Map(objects.map((item) => [item.id, item]));
    const laid = layoutConnectors(objects.map((item) => ({ ...item, ...canvasRect(item) })), connectors, (meaning) => CANVAS_MEANING_LABELS[meaning] ?? meaning, CANVAS_WORLD);
    const lines = [
      jsx("defs", { children: jsx("marker", { id: "dy-pc-arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", children: jsx("path", { className: "dy-pc-arrowhead", d: "M0,0 L10,5 L0,10 z" }) }) }, "defs")
    ];
    laid.forEach((edge) => {
      const box = edge.labelBox;
      lines.push(jsx("line", { "data-canvas-connector": edge.id, "data-canvas-meaning": edge.meaning, x1: edge.x1, y1: edge.y1, x2: edge.x2, y2: edge.y2, markerEnd: "url(#dy-pc-arrow)" }, edge.id));
      if (edge.leader) lines.push(jsx("line", { className: "dy-pc-leader", x1: edge.anchor.x, y1: edge.anchor.y, x2: box.x + box.width / 2, y2: box.y + box.height / 2 }, `${edge.id}:leader`));
      lines.push(jsx("rect", { className: "dy-pc-edge-chip", "data-canvas-meaning": edge.meaning, x: box.x, y: box.y, width: box.width, height: box.height, rx: box.height / 2 }, `${edge.id}:chip`));
      lines.push(jsx("text", { className: "dy-pc-edge-label", "data-canvas-edge-label": edge.id, x: box.x + box.width / 2, y: box.y + box.height / 2, textAnchor: "middle", dominantBaseline: "central", children: edge.label }, `${edge.id}:label`));
    });
    if (pendingConnect) {
      const pending = byId.get(pendingConnect);
      if (pending) {
        const rect = canvasRect(pending);
        lines.push(jsx("circle", { "data-canvas-pending": pendingConnect, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, r: 7 }, "pending"));
      }
    }
    return lines;
  };
  const renderFrames = () => layoutFrames(objects.map((item) => ({ ...item, ...canvasRect(item) })), CANVAS_WORLD).map((frame) => jsx("div", { className: "dy-pc-frame", "data-canvas-frame": frame.tag, style: { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.width}px`, height: `${frame.height}px` }, children: frame.tag }, frame.tag));
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
  return jsxs("section", {
    className: "dockyard-feature-card dy-pc-scope",
    "data-planning-canvas": project.id,
    "data-canvas-revision": String(revision),
    "data-canvas-dirty": dirty ? "true" : "false",
    "data-canvas-theme": theme,
    children: [
      jsxs("div", { className: `dy-pc-board-bar${boardListOpen ? " open" : " collapsed"}`, children: [
        jsxs("div", { className: "dy-pc-board-title", children: [
          jsx("span", { className: "dockyard-card-label", children: "BOARDS" }),
          jsx("strong", { children: canvas?.name ?? "Planning board" }),
          jsx("span", { className: "dy-pc-board-count", children: `${boards.length || 1} board${(boards.length || 1) === 1 ? "" : "s"}` })
        ] }),
        jsx(Button, { small: true, action: "pc-board-toggle", ariaLabel: boardListOpen ? "Collapse board list" : "Expand board list", onClick: () => setBoardListOpen((value) => !value), children: jsx(Icon, { name: boardListOpen ? "chevrons-left" : "chevrons-right" }) }),
        jsxs("div", { className: "dy-pc-theme-toggle", role: "group", "aria-label": "Canvas theme", children: [
          jsx(Button, { small: true, variant: theme === "light" ? "primary" : "", action: "pc-theme-light", ariaLabel: "Light canvas theme", onClick: () => setBoardTheme("light"), children: jsx(Icon, { name: "sun" }) }),
          jsx(Button, { small: true, variant: theme === "dark" ? "primary" : "", action: "pc-theme-dark", ariaLabel: "Dark canvas theme", onClick: () => setBoardTheme("dark"), children: jsx(Icon, { name: "moon" }) })
        ] })
      ] }),
      boardListOpen ? jsxs("nav", { className: "dy-pc-board-list", "aria-label": "Planning boards", children: (boards.length ? boards : [canvas]).filter(Boolean).map((board) => jsx("button", { type: "button", className: `dy-pc-board-row${board.canvas_id === canvas?.canvas_id ? " active" : ""}`, disabled: boardBusy, onClick: () => selectBoard(board), children: [
        jsx("span", { className: "dy-pc-board-dot", "data-status": board.status ?? "draft" }),
        jsxs("span", { className: "dy-pc-board-row-copy", children: [jsx("strong", { children: board.name ?? "Main board" }), jsx("small", { children: `${board.status ?? "draft"} \xB7 ${number(board.object_count ?? board.objects?.length ?? 0)} objects` })] }),
        board.changed_since_plan ? jsx("span", { className: "dy-pc-board-warning", title: "Board changed since plan", children: "!" }) : null
      ] }, board.canvas_id ?? board.name)) }) : null,
      jsxs("div", { className: "dockyard-section-head", children: [
        jsxs("div", { children: [
          jsx("span", { className: "dockyard-card-label", children: "PLANNING CANVAS" }),
          jsx("h2", { children: "Evidence to plan" }),
          jsx("p", { children: `One canvas per project: ${number(objects.length)} object(s), ${number(connectors.length)} connector(s), revision ${number(revision)}${dirty ? " \xB7 unsaved edits" : " \xB7 saved"}. Curation only proposes \u2014 every proposal lands as scratch and nothing is applied automatically.` }),
          content.length ? jsx("p", { className: "dockyard-meta", children: `${number(content.length)} project content item(s) available to reference.` }) : null
        ] })
      ] }),
      jsxs("div", { className: "dy-pc", children: [
        jsxs("div", { className: "dy-pc-toolbar", role: "toolbar", "aria-label": "Planning canvas tools", children: [
          jsxs("div", { className: "dy-pc-seg", role: "group", "aria-label": "Canvas mode", children: [
            jsx(Button, { small: true, variant: mode === "select" ? "primary" : "", action: "pc-mode-select", onClick: () => {
              setMode("select");
              setPendingConnect(null);
            }, children: "Select" }),
            jsx(Button, { small: true, variant: mode === "connect" ? "primary" : "", action: "pc-mode-connect", onClick: () => {
              setMode("connect");
              setPendingConnect(null);
            }, children: "Connect" })
          ] }),
          jsx(Button, { small: true, action: "pc-undo", disabled: !history.length, onClick: undo, children: "Undo" }),
          jsx(Button, { small: true, action: "pc-redo", disabled: !future.length, onClick: redo, children: "Redo" }),
          jsx(Button, { small: true, action: "pc-duplicate", disabled: !(selectedIds.length || selectedId), onClick: duplicateSelection, children: "Duplicate" }),
          jsx("span", { className: "dy-pc-sep", "aria-hidden": true }),
          jsxs("div", { className: "dy-pc-add", children: [
            jsx("select", { "data-canvas-kind-picker": true, "aria-label": "Object kind", value: kind, onChange: (event) => setKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx("option", { value, children: CANVAS_KIND_LABELS[value] }, value)) }),
            jsx("input", { "data-canvas-draft": true, "aria-label": "New object text", value: draft, placeholder: "Capture a note, observation, question or link...", onChange: (event) => setDraft(event.target.value) }),
            jsx(Button, { small: true, variant: "primary", action: "add-canvas-object", disabled: !draft.trim(), onClick: addFromDraft, children: "Add object" })
          ] }),
          jsx("span", { className: "dy-pc-sep", "aria-hidden": true }),
          ...CANVAS_OBJECT_KINDS.map((value) => jsx(Button, {
            small: true,
            action: `add-canvas-${value}`,
            data: { "data-canvas-add-kind": value },
            onClick: () => addObject(value, `New ${CANVAS_KIND_LABELS[value]}`),
            children: `\uFF0B ${CANVAS_KIND_LABELS[value]}`
          }, `add-${value}`)),
          jsx("span", { className: "dy-pc-spacer" }),
          jsx(Button, { small: true, action: "pc-tidy", disabled: !objects.length, onClick: tidy, children: "Tidy" }),
          jsx(Button, { small: true, action: "pc-review", disabled: busy, onClick: reviewCanvas, children: "Review" }),
          jsx("span", { className: "dy-pc-sep", "aria-hidden": true }),
          jsxs("div", { className: "dy-pc-seg", role: "group", "aria-label": "Zoom", children: [
            jsx(Button, { small: true, action: "pc-zoom-out", ariaLabel: "Zoom out", onClick: () => zoomBy(-CANVAS_ZOOM.step), children: "\u2212" }),
            jsx("span", { className: "dy-pc-readout", "data-canvas-zoom-readout": String(Math.round(zoom * 100)), children: `${Math.round(zoom * 100)}%` }),
            jsx(Button, { small: true, action: "pc-zoom-in", ariaLabel: "Zoom in", onClick: () => zoomBy(CANVAS_ZOOM.step), children: "\uFF0B" }),
            jsx(Button, { small: true, action: "pc-fit", onClick: fit, children: "Fit" })
          ] }),
          jsx("span", { className: "dy-pc-sep", "aria-hidden": true }),
          jsx(Button, { small: true, action: "pc-reload", disabled: busy, onClick: reload, children: "Reload" }),
          jsx(Button, { small: true, action: "pc-curate", disabled: busy, onClick: () => curate(), children: "Curate" }),
          jsx(Button, { small: true, variant: "primary", action: "pc-save", disabled: busy, onClick: save, children: busy ? "Working..." : "Save canvas" })
        ] }),
        objects.length >= 2 ? jsxs("div", { className: "dy-pc-linkbar", "data-canvas-connector-editor": true, children: [
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
          role: "group",
          "aria-label": "Planning canvas stage",
          tabIndex: 0,
          onPointerDown: beginPan,
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
            jsxs("aside", { className: `dy-pc-chat ${chatOpen ? "open" : "closed"}`, "data-canvas-assistant": true, children: [
              jsxs("button", { type: "button", className: "dy-pc-chat-h", "data-action": "pc-chat-toggle", onClick: () => setChatOpen((current) => !current), children: [
                jsx("span", { className: "av", "aria-hidden": true, children: "AI" }),
                jsxs("span", { style: { flex: "1 1 auto" }, children: [
                  jsx("strong", { children: "Steward" }),
                  jsx("span", { className: "sub", children: session?.current_question ? "clarification in progress \xB7 nothing applied" : `${number(pendingProposals)} proposal(s) waiting \xB7 nothing applied` })
                ] }),
                jsx("span", { className: "tog", "aria-hidden": true, children: chatOpen ? "\u25BC" : "\u25B2" })
              ] }),
              jsxs("div", { className: "dy-pc-chat-b", children: [
                jsx("div", { className: "dy-pc-msg bot", children: assistantSummary }),
                jsx("div", { "data-canvas-chat-log": true, children: (chatLog ?? []).map((message, index) => jsx("div", { className: `dy-pc-msg ${message.role}`, children: message.text }, `chat-${index}`)) }),
                questionBlock,
                review ? jsx("p", { className: "dy-pc-drawer-meta", "data-canvas-review": true, children: `Review: ${number(review.summary?.evidence_count)} evidence, ${number(review.summary?.claim_count)} claim, ${number(review.summary?.question_count)} question, ${number(review.summary?.plan_block_count)} plan block(s).` }) : null,
                proposalCards.length ? jsx("div", { "data-canvas-proposals": true, children: proposalCards }) : null,
                session?.answers?.length ? jsx("div", { className: "dy-pc-msg me", children: `${number(session.answers.length)} clarification answer(s) recorded.` }) : null,
                planPanel ? jsxs("div", { className: "dy-pc-proposal", "data-canvas-plan": planPanel.plan_id, children: [
                  jsx("strong", { children: "Plan ready for review" }),
                  jsx("small", { children: `${number((planPanel.steps ?? []).length)} step(s) \xB7 from proposal ${planPanel.proposal_id} \xB7 nothing applied to the board.` }),
                  jsx("pre", { className: "dy-pc-plan-steps", children: (planPanel.steps ?? []).map((step) => `${step.order}. ${step.title}`).join("\n") }),
                  jsxs("div", { className: "dockyard-form-actions", children: [
                    jsx(Button, { small: true, variant: planDocSaved ? "" : "primary", action: "save-plan-document", disabled: planBusy || planDocSaved, onClick: savePlanDocument, children: planDocSaved ? "Doc saved to Content" : "Save doc to Content" }),
                    jsx(Button, { small: true, variant: planDocSaved && pendingSteps.length ? "primary" : "", action: "backlog-from-plan", disabled: planBusy || !planDocSaved || !pendingSteps.length || Boolean(backlogConfirm?.length), onClick: () => setBacklogConfirm(pendingSteps), children: planDocSaved && !pendingSteps.length ? "Backlog items created" : "Create backlog items" })
                  ] }),
                  backlogConfirm?.length ? jsxs("div", { className: "dy-pc-proposal", "data-canvas-backlog-confirm": true, children: [
                    jsx("small", { children: `Create ${number(backlogConfirm.length)} backlog item(s)? One confirm per batch, nothing auto-runs.` }),
                    jsx(Button, { small: true, variant: "primary", action: "confirm-backlog-from-plan", disabled: planBusy, onClick: createBacklogItems, children: "Confirm create" }),
                    jsx(Button, { small: true, action: "cancel-backlog-from-plan", disabled: planBusy, onClick: () => setBacklogConfirm(null), children: "Cancel" })
                  ] }) : null
                ] }) : null
              ] }),
              jsxs("div", { className: "dy-pc-chat-f", children: [
                jsx("span", { className: "dy-pc-readout", children: "Approval contract: scratch + suggested only." }),
                jsx("input", { "data-canvas-chat-input": true, "aria-label": "Message the steward", value: chatDraft, placeholder: "Ask the steward about this board...", onChange: (event) => setChatDraft(event.target.value), onKeyDown: (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendChat();
                  }
                } }),
                jsx(Button, { small: true, action: "pc-chat-send", disabled: chatBusy || !chatDraft.trim(), onClick: sendChat, children: "Send" }),
                jsx(Button, { small: true, action: "pc-chat-stop", disabled: !chatBusy, onClick: stopChat, children: "Stop" })
              ] })
            ] }),
            jsxs("aside", { className: `dy-pc-drawer${selected ? " open" : ""}`, "data-canvas-drawer": selected?.id ?? "none", children: [
              jsxs("div", { className: "dy-pc-drawer-h", children: [
                jsxs("div", { children: [
                  jsx("strong", { children: selected ? `${CANVAS_KIND_LABELS[selected.kind] ?? selected.kind} \xB7 selected` : "Selected object" }),
                  jsx("span", { className: "dy-pc-drawer-meta", children: selected ? `x ${Math.round(canvasNumber(selected.x))} \xB7 y ${Math.round(canvasNumber(selected.y))}` : "Nothing selected" })
                ] }),
                jsx(Button, { small: true, action: "pc-close-drawer", ariaLabel: "Close selection drawer", onClick: () => setSelectedId(null), children: "\u2715" })
              ] }),
              selected ? jsxs("div", { className: "dy-pc-drawer-b", children: [
                jsxs("label", { children: [jsx("span", { children: "Title" }), jsx("input", { "data-canvas-object-title": true, value: drawerText, onChange: (event) => setDrawerText(event.target.value) })] }),
                jsxs("label", { children: [jsx("span", { children: "Kind" }), jsx("select", { "data-canvas-object-kind": true, value: drawerKind, onChange: (event) => setDrawerKind(event.target.value), children: CANVAS_OBJECT_KINDS.map((value) => jsx("option", { value, children: CANVAS_KIND_LABELS[value] }, value)) })] }),
                jsxs("label", { children: [jsx("span", { children: "Sticker colour" }), jsx("select", { "data-canvas-object-colour": true, value: selectedColour ?? "", onChange: (event) => setSelectedColour(event.target.value || null), children: [jsx("option", { value: "", children: "Default kind colour" }), ...CANVAS_STICKER_COLOURS.map((value) => jsx("option", { value, children: CANVAS_STICKER_LABELS[value] }, value))] })] }),
                jsx("p", { className: "dy-pc-drawer-meta", children: selected.evidence_ref ? `Evidence reference: ${selected.evidence_ref}` : "No evidence reference on this object." }),
                jsxs("div", { className: "dockyard-form-actions", children: [
                  jsx(Button, { small: true, variant: "danger", action: "remove-canvas-object", disabled: busy, onClick: removeSelected, children: "Remove object" }),
                  jsx(Button, { small: true, variant: "primary", action: "apply-canvas-object", disabled: busy || !drawerText.trim(), onClick: applyDrawer, children: "Apply" })
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
  task: {
    fill: "--dy-wf-purpose-task-fill",
    line: "--dy-wf-purpose-task-line",
    text: "--dy-wf-purpose-task-text",
    glyph: "\u25A1",
    label: "Task",
    glyphX: 20,
    textX: 36
  },
  gate: {
    fill: "--dy-wf-purpose-gate-fill",
    line: "--dy-wf-purpose-gate-line",
    text: "--dy-wf-purpose-gate-text",
    glyph: "\u25C6",
    label: "Human gate",
    glyphX: 24,
    textX: 42
  },
  branch: {
    fill: "--dy-wf-purpose-branch-fill",
    line: "--dy-wf-purpose-branch-line",
    text: "--dy-wf-purpose-branch-text",
    glyph: "\u22D4",
    label: "Conditional branch",
    glyphX: 22,
    textX: 40
  },
  loop: {
    fill: "--dy-wf-purpose-loop-fill",
    line: "--dy-wf-purpose-loop-line",
    text: "--dy-wf-purpose-loop-text",
    glyph: "\u21BB",
    label: "Bounded loop",
    glyphX: 20,
    textX: 36
  }
};
function nodePurpose(n) {
  if (n.human_gate || n.kind === "gate") return "gate";
  if (n.loop) return "loop";
  if (n.when) return "branch";
  return "task";
}
function nodeShapePath(purpose, w = NODE_W, h = NODE_H) {
  switch (purpose) {
    case "gate": {
      const i = Math.round(h * 0.22);
      return `M ${i} 0 H ${w - i} L ${w} ${h / 2} L ${w - i} ${h} H ${i} L 0 ${h / 2} Z`;
    }
    case "branch": {
      const i = Math.round(h * 0.19);
      return `M ${i} 0 H ${w - i} L ${w} ${i} V ${h - i} L ${w - i} ${h} H ${i} L 0 ${h - i} V ${i} Z`;
    }
    case "loop": {
      const r = 9;
      const notch = 13;
      return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${h / 2 + 10} L ${notch} ${h / 2} L 0 ${h / 2 - 10} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    }
    default:
      return null;
  }
}
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
  const wrap = elu("div", "dy-wf-wrap");
  const svg = sEl("svg", { class: "dy-wf-svg" });
  svg.setAttribute("data-lod", "read");
  const viewport = sEl("g", { class: "dy-wf-viewport" });
  svg.appendChild(viewport);
  const SVG_INDEX = sEl("svg", { class: "dy-wf-index" });
  const minimap = sEl("svg", { class: "dy-wf-minimap", width: 170, height: 104 });
  const miniViewport = sEl("rect", { class: "dy-wf-mini-view" });
  minimap.appendChild(miniViewport);
  const passport = elu("div", "dy-wf-passport");
  passport.setAttribute("aria-live", "polite");
  const zoomBar = elu("div", "dy-wf-zoombar");
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
  const feed = elu("div", "dy-wf-feed");
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
  const listView = elu("div", "dy-wf-list");
  listView.dataset.wfList = "";
  const listHead = elu("button", "dy-wf-list-head", "\u25B8 List view");
  listHead.type = "button";
  listHead.setAttribute("aria-expanded", "false");
  const listBody = elu("div", "dy-wf-list-body");
  listBody.setAttribute("role", "table");
  listBody.setAttribute("aria-label", "Workflow run as list");
  listBody.style.display = "none";
  listHead.addEventListener("click", () => {
    const open = listHead.getAttribute("aria-expanded") === "true";
    listHead.setAttribute("aria-expanded", String(!open));
    listHead.textContent = open ? "\u25B8 List view" : "\u25BE List view";
    listBody.style.display = open ? "none" : "block";
  });
  listView.append(listHead, listBody);
  wrap.append(svg, SVG_INDEX, feed, minimap, passport, zoomBar, listView);
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
  svg.appendChild(defs);
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
    const g = sEl("g", {
      class: `dy-wf-node ${purpose} ${status}`,
      transform: `translate(${p.x} ${p.y})`
    });
    g.dataset.wfPurpose = purpose;
    g.dataset.wfStatus = status;
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("data-node-id", n.node_id);
    g.setAttribute("aria-label", `${visuals.label}: ${n.title} (${n.status ?? "pending"})`);
    g.dataset.wfEditable = String(editable);
    g.setAttribute("aria-describedby", `wf-help-${n.node_id}`);
    const outline = nodeShapePath(purpose);
    const shape = outline === null ? sEl("rect", { width: NODE_W, height: NODE_H, rx: 9, class: "dy-wf-shape dy-wf-rect" }) : sEl("path", { d: outline, class: "dy-wf-shape dy-wf-rect" });
    shape.setAttribute("fill", `var(${visuals.fill})`);
    const glyph = sEl("text", { x: visuals.glyphX, y: 26, class: "dy-wf-glyph" });
    glyph.textContent = visuals.glyph;
    const label = sEl("text", { x: visuals.textX, y: 25, class: "dy-wf-label" });
    label.textContent = n.title.slice(0, 18);
    const sub = sEl("text", { x: 12, y: 45, class: "dy-wf-sub" });
    sub.textContent = visuals.label;
    const chip = sEl("rect", {
      x: NODE_W - 66,
      y: 34,
      width: 54,
      height: 16,
      rx: 8,
      class: `dy-wf-statuschip ${status}`
    });
    const statusText = sEl("text", {
      x: NODE_W - 39,
      y: 45.5,
      "text-anchor": "middle",
      class: `dy-wf-statustext ${status}`
    });
    statusText.textContent = n.status ?? "pending";
    g.append(shape, glyph, label, sub, chip, statusText);
    if (n.status === "working") {
      const timer2 = sEl("text", {
        x: 12,
        y: 60,
        class: "dy-wf-timer full"
      });
      timer2.textContent = `Workflow: ${elapsedLabel(run.started_at)}`;
      timer2.dataset.for = n.node_id;
      g.appendChild(timer2);
    }
    if (n.assignee) {
      g.appendChild((() => {
        const who = sEl("text", {
          x: NODE_W - 12,
          y: 60,
          "text-anchor": "end",
          class: "dy-wf-assignee"
        });
        who.textContent = n.assignee;
        return who;
      })());
    }
    const port = sEl("circle", { cx: NODE_W, cy: NODE_H / 2, r: 11, class: "dy-wf-port" });
    port.setAttribute("data-connect-from", n.node_id);
    port.setAttribute("tabindex", "0");
    port.setAttribute("aria-label", `Connect from ${n.title}`);
    g.appendChild(port);
    const dash = () => shape.setAttribute("stroke-dasharray", "4 3");
    const undash = () => shape.removeAttribute("stroke-dasharray");
    port.addEventListener("pointerdown", (ev) => {
      const e = ev;
      if (e.button !== 0 || !editable) return;
      e.stopPropagation();
      startConnect(n.node_id, g);
    });
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
    const assignments = run.nodes.some((n) => (n.team ?? n.phase_team ?? "").trim());
    const laneOf = assignments ? laneKeyOf : (n) => isExceptionNode(n) ? EXCEPTION_LANE_KEY : "main-path";
    let layout = buildLayout(run.nodes, { laneOf });
    if (layout.lanes.length < 2) layout = buildLayout(run.nodes);
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
    for (const n of run.nodes) {
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
            const x1 = to.x + NODE_W, y1 = to.y + NODE_H / 2;
            const x2 = from.x - 6, y2 = from.y + NODE_H / 2;
            const sameBand = Math.abs(y1 - y2) < NODE_H / 2;
            const dx = Math.max(COL_GAP / 2, Math.abs(x2 - x1) * 0.55);
            if (sameBand) {
              const bow = Math.min(46, Math.max(18, dx * 0.35));
              return `M ${x1} ${y1} C ${x1 + dx} ${y1 - bow}, ${x2 - dx} ${y2 - bow}, ${x2} ${y2}`;
            }
            return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          })(),
          // Leaves the marker 6px of room before the shape, so the head is
          // never tucked under the node it points at.
          "marker-end": `url(#${depMeaning.marker})`
        });
        path.dataset.from = dep;
        path.dataset.to = n.node_id;
        viewport.appendChild(path);
        const dot = sEl("circle", { class: "dy-wf-flowdot", r: 3.2, opacity: 0 });
        viewport.appendChild(dot);
      }
    }
    for (const n of run.nodes) {
      const p = positions[n.node_id];
      viewport.appendChild(buildNode(n, p, run, Boolean(handlers.onEdit)));
    }
    renderLegend(run);
    apply();
    updateMinimap();
  };
  const renderLegend = (run) => {
    SVG_INDEX.replaceChildren();
    SVG_INDEX.setAttribute("aria-label", "Node purposes on this canvas");
    if (!run || run.nodes.length === 0) return;
    const present = new Set(run.nodes.map((n) => nodePurpose(n)));
    const purposes = Object.keys(PURPOSE_VISUALS).filter((p) => present.has(p));
    const rowH = 26;
    const padX = 12;
    const width = 214;
    const height = 22 + purposes.length * rowH;
    SVG_INDEX.setAttribute("viewBox", `0 0 ${width} ${height}`);
    SVG_INDEX.setAttribute("width", String(width));
    SVG_INDEX.setAttribute("height", String(height));
    const frame = sEl("rect", {
      x: 0.5,
      y: 0.5,
      width: width - 1,
      height: height - 1,
      rx: 7,
      class: "dy-wf-index-bg"
    });
    const heading = sEl("text", { x: padX, y: 15, class: "dy-wf-index-title" });
    heading.textContent = "NODE PURPOSE";
    SVG_INDEX.append(frame, heading);
    purposes.forEach((p, i) => {
      const v = PURPOSE_VISUALS[p];
      const cy = 22 + i * rowH + 8;
      const outline = nodeShapePath(p, 20, 16);
      const swatch = outline === null ? sEl("rect", { x: 0, y: 0, width: 20, height: 16, rx: 3, class: "dy-wf-index-shape" }) : sEl("path", { d: outline, class: "dy-wf-index-shape" });
      swatch.setAttribute("fill", `var(${v.fill})`);
      swatch.setAttribute("stroke", `var(${v.line})`);
      swatch.setAttribute("data-wf-purpose", p);
      const row = sEl("g", { transform: `translate(${padX} ${cy - 8})` });
      row.appendChild(swatch);
      const glyph = sEl("text", { x: 30, y: 13, class: "dy-wf-index-glyph" });
      glyph.textContent = v.glyph;
      row.appendChild(glyph);
      const name = sEl("text", { x: 48, y: 13, class: "dy-wf-index-label" });
      name.textContent = v.label;
      row.appendChild(name);
      SVG_INDEX.appendChild(row);
    });
    const dep = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
    const edgeRow = sEl("g", { transform: `translate(${padX} ${height - 4})` });
    const line = sEl("path", { d: "M 0 -5 L 20 -5", class: "dy-wf-index-edge" });
    edgeRow.appendChild(line);
    const edgeLabel = sEl("text", { x: 30, y: -1, class: "dy-wf-index-edge-label" });
    edgeLabel.textContent = `${dep.label} \u2192 (workflow edges)`;
    edgeRow.appendChild(edgeLabel);
    SVG_INDEX.appendChild(edgeRow);
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
  const openPassport = (n, g) => {
    if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
    selectedEl = g ?? null;
    if (selectedEl) selectedEl.classList.add("dy-wf-selected");
    passport.replaceChildren();
    passport.appendChild(elu("h3", "", n.title));
    if (handlers.onEdit) {
      const edit = elu("div", "dy-wf-edit");
      const title = elu("input", "dy-wf-edit-title");
      title.value = n.title;
      title.setAttribute("aria-label", "Node title");
      const deps = elu("input", "dy-wf-edit-deps");
      deps.value = n.depends_on.join(", ");
      deps.setAttribute("aria-label", "Dependencies");
      const team = elu("input", "dy-wf-edit-team");
      team.value = n.phase_team ?? "";
      team.placeholder = "phase team override";
      team.setAttribute("aria-label", "Phase team override");
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
      edit.append(elu("label", "", "Title"), title, elu("label", "", "Dependencies (node IDs)"), deps, elu("label", "", "Phase team"), team, save);
      passport.appendChild(edit);
    }
    passport.appendChild(elu("span", `badge ${n.status ?? "pending"}`, n.status ?? "pending"));
    const lastConfirmed = elu("p", "dy-wf-last-confirmed");
    const updated = lastRun?.updated_at ?? null;
    lastConfirmed.textContent = `Last confirmed update: ${updated && isFinite(Date.parse(updated)) ? updated.replace("T", " ").slice(0, 16) + " UTC" : "unknown"}`;
    lastConfirmed.setAttribute("data-last-confirmed", updated ?? "unknown");
    passport.appendChild(lastConfirmed);
    if (n.assignee) passport.appendChild(elu("p", "dy-dim", `assignee: ${n.assignee}`));
    if (n.evidence_refs.length) {
      const p = elu("p", "dy-dim", "evidence: " + n.evidence_refs.join(", "));
      passport.appendChild(p);
    }
    if (n.task_ref) {
      passport.appendChild(elu("p", "dy-dim", `deep link: ${n.task_ref}`));
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
          "dy-wf-unsupported",
          "Pause and cancel are not supported by the native execution contract \u2014 a running worker cannot be stopped from here."
        );
        unsupported.setAttribute("data-unsupported-controls", "pause,cancel");
        recovery.appendChild(unsupported);
        passport.appendChild(recovery);
      }
      if (handlers.onExpand) {
        const sec = elu("div", "dy-wf-expand");
        const head = elu("button", "dy-wf-expand-head", "\u25B8 Live detail");
        head.setAttribute("aria-expanded", "false");
        const body = elu("div", "dy-wf-expand-body");
        body.style.display = "none";
        body.appendChild(elu("p", "dy-dim", "Loading live detail\u2026"));
        head.addEventListener("click", () => {
          const isOpen = head.getAttribute("aria-expanded") === "true";
          head.setAttribute("aria-expanded", String(!isOpen));
          head.textContent = isOpen ? "\u25B8 Live detail" : "\u25BE Live detail";
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
        sec.append(head, body);
        passport.appendChild(sec);
      }
    } else {
      passport.appendChild(elu("p", "dy-dim", "No canonical work bound to this node yet."));
    }
  };
  const buildThread = (items) => buildActivityThread(items, { decay: true });
  const buildTasks = (tasks, onOpen) => buildTaskListMini(tasks, onOpen);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  svg.addEventListener("pointerdown", (e) => {
    if (e.target?.closest?.(".dy-wf-node")) return;
    dragging = true;
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
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
    }
  });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const ev = e;
    const rect = svg.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const k = next / zoom;
    panX = cx - (cx - panX) * k;
    panY = cy - (cy - panY) * k;
    zoom = next;
    apply();
    updateMinimap();
  }, { passive: false });
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      passport.replaceChildren();
      if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
      selectedEl = null;
    }
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
    fetchRuns().then((runs) => {
      if (disposed || ticket < appliedTicket) return;
      appliedTicket = ticket;
      const latest = runs && runs.length ? runs[0] : null;
      const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
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
  disposers.push(() => {
    disposed = true;
    if (timer) clearInterval(timer);
    if (flowTimer) clearInterval(flowTimer);
    clearInterval(clockTimer);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
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
  nodes: (run.nodes ?? []).map(toCanvasNode)
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
    onEdit: handlers.onEdit
  }, handlers.pollMs ?? 6e4);
}

// hermes_dockyard_plugin/desktop/src/project/workflows.js
function ExecutableWorkflowsPanel({ project, workflows, onRefresh }) {
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
  const encoded = encodeURIComponent(project.id);
  const grouped = Object.values((workflows ?? []).reduce((all, row) => {
    const item = all[row.name] ?? { name: row.name, versions: [], archived_at: row.archived_at };
    item.versions.push(row);
    item.archived_at = row.archived_at;
    all[row.name] = item;
    return all;
  }, {}));
  const current = grouped.find((item) => item.name === selected) ?? grouped[0];
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
      }
    });
  }, [project.id, current?.name, current?.versions?.length, runs, mode]);
  const mutate = async (path, body = {}) => {
    setError(null);
    try {
      await api(path, { method: "POST", body });
      onRefresh?.();
    } catch (failure) {
      setError(String(failure?.message ?? failure));
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
    if (!current) return;
    void mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/versions`, {
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
  const autoLayout = () => persistNodes(currentCanvasNodes());
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
  const liveCounts = latest ? (latest.nodes ?? []).reduce((acc, node) => {
    const key = node.status ?? "pending";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}) : null;
  return jsxs("section", { className: "dockyard-feature-card dockyard-workflows-v6", "data-workflows-prototype": project.id, "data-executable-workflows": project.id, children: [
    jsxs("header", { className: "dockyard-section-head", children: [jsxs("div", { children: [jsx("h2", { children: "Workflows" }), jsx("p", { children: "Planning is saved as a version; execution is shown only from canonical runs." })] }), jsx(StatusTag, { tone: latest?.status === "running" ? "info" : "neutral", label: latest ? `Live: ${latest.status}` : `${number(grouped.length)} instances` })] }),
    error ? jsx("p", { className: "dockyard-inline-error", role: "alert", children: error }) : null,
    jsxs("div", { className: "dockyard-wf3", children: [
      // ---- Zone 1: workflow library + create/define editor ---------------
      jsxs("aside", { className: "dockyard-wf3-lib", "data-workflow-library": project.id, children: [
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
      // ---- Zone 2: toolbar + canvas (the surface) -------------------------
      jsxs("div", { className: "dockyard-wf3-stage", children: [
        jsxs("div", { className: "dockyard-wf3-toolbar", role: "toolbar", "aria-label": "Workflow canvas tools", children: [
          jsx(Button, { small: true, action: "wf-view-definition", variant: mode === "definition" ? "primary" : "", onClick: () => setMode("definition"), children: "Definition" }),
          jsx(Button, { small: true, action: "wf-view-live", variant: mode === "live" ? "primary" : "", disabled: !latest, onClick: () => setMode("live"), children: "Live run" }),
          jsx("span", { className: "dockyard-wf3-sep", "aria-hidden": true }),
          jsx(Button, { small: true, action: "wf-add-step", disabled: !current, onClick: () => addNode(false), children: "\uFF0B Step" }),
          jsx(Button, { small: true, action: "wf-add-gate", disabled: !current, onClick: () => addNode(true), children: "\uFF0B Gate" }),
          jsx(Button, { small: true, action: "wf-auto-layout", disabled: !current, onClick: autoLayout, children: "Auto layout" }),
          jsx(Button, { small: true, action: "wf-validate", disabled: !current, onClick: validateGraph, children: "Validate" }),
          jsx("span", { className: "dockyard-wf3-sep", "aria-hidden": true }),
          jsx(Button, { small: true, action: "inspect-workflow", disabled: !current, onClick: () => {
            setSelected(current.name);
            loadRuns(current.name);
          }, children: "Refresh canvas" })
        ] }),
        validation ? jsx("p", { className: "dockyard-wf3-validation", role: "status", "data-wf-validate-result": validation.ok ? "ok" : "issues", children: validation.text }) : null,
        current ? jsx("div", { ref: canvasRef, className: "dockyard-workflow-graph", "data-workflow-canvas": current.name, role: "img", "aria-label": "Workflow planning graph" }) : jsx("p", { className: "dockyard-meta", children: "No workflow selected." })
      ] }),
      // ---- Zone 3: run inspector (canonical runs + versions + lifecycle) --
      jsxs("aside", { className: "dockyard-wf3-insp", children: [
        jsxs("div", { className: "dockyard-wf3-insp-head", children: [jsx("strong", { children: "Run inspector" }), current ? jsx("span", { children: `v${current.versions[current.versions.length - 1].version}` }) : null] }),
        latest ? jsxs("div", { "data-workflow-live-run": latest.run_key, children: [
          jsx(StatusTag, { tone: latest.status === "completed" ? "success" : latest.status === "failed" ? "danger" : "info", label: latest.status }),
          jsx("p", { className: "dockyard-wf3-runkey", children: `${latest.run_key} \xB7 v${latest.version}` }),
          liveCounts ? jsx("p", { className: "dockyard-wf3-counts", children: ["done", "working", "blocked", "pending"].filter((k) => liveCounts[k]).map((k) => `${liveCounts[k]} ${k}`).join(" \xB7 ") }) : null,
          jsx("ul", { children: (latest.nodes ?? []).map((node) => jsx("li", { children: `${node.title} \u2014 ${node.status ?? "pending"}${node.assignee ? ` \xB7 ${node.assignee}` : ""}` }, node.node_id)) })
        ] }) : jsx("p", { className: "dockyard-meta", children: "No canonical run recorded. Start a run to see truthful state." }),
        jsxs("div", { className: "dockyard-form-actions", children: current ? current.versions.map((version) => jsx(Button, { action: "start-workflow", disabled: Boolean(current.archived_at), onClick: async () => {
          await mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/start`, { version: version.version, run_key: runKey || `${current.name}-${Date.now()}` });
          await loadRuns(current.name);
        }, children: `Start v${version.version}` }, String(version.version))) : null }),
        current ? jsxs("details", { className: "dockyard-workflow-definitions", "data-workflow-definitions": current.name, children: [
          jsx("summary", { children: "Stored definition versions" }),
          ...current.versions.map((version) => jsxs("section", { "data-workflow-definition-version": version.version, children: [
            jsx("strong", { children: `Version ${version.version}` }),
            jsx("pre", { children: JSON.stringify(version.definition?.nodes ?? [], null, 2) })
          ] }, `definition-${version.version}`))
        ] }) : null,
        jsxs("div", { className: "dockyard-form-actions", children: current ? [
          current.archived_at ? jsx(Button, { action: "restore-workflow", onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/restore`), children: "Restore workflow" }) : jsx(Button, { action: "archive-workflow", variant: "danger", onClick: () => mutate(`/projects/${encoded}/workflows/${encodeURIComponent(current.name)}/archive`), children: "Archive workflow" })
        ] : null })
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
      ] }),
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
      ] }),
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
function ProjectDashboard({ view, onSelectProject, onRefresh, onProjectDirty, pendingWorkRef, onPendingWorkConsumed, notice, initialView }) {
  const [projectView, setProjectView] = useState(initialView || "overview");
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
    panel = jsx(PlanningCanvasPanel, { project, canvas: view.canvas, content: view.content ?? [], onRefresh }, project.id);
  } else if (projectView === "workflows") {
    panel = jsx(ExecutableWorkflowsPanel, { project, workflows: view.workflows ?? [], onRefresh }, project.id);
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
          onClick: () => setProjectView(key),
          children: label
        }, key))
      })
    ] }),
    panel,
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

// hermes_dockyard_plugin/desktop/src/shell/dashboard-page.js
function DashboardPage() {
  useDockyardStyles();
  const [tab, setTab] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectOptions, setProjectOptions] = useState([]);
  const [projectEntryView, setProjectEntryView] = useState("overview");
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
    const loader = tab === "dashboard" ? loadDashboardData : tab === "project" || tab === "settings" || tab === "workflows" ? () => loadProjectData(selectedProject) : tab === "backlog" ? () => loadBacklogData(selectedProject) : tab === "teams" ? loadTeamsData : tab === "initiative" ? () => loadProjectData(selectedProject) : tab === "onboard" ? loadOnboardData : tab === "inbox" ? loadInboxData : () => api("/notifications");
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
    if (projectId === selectedProject) return;
    if (dirtyProject && dirtyProject !== projectId) {
      setPendingProject(projectId);
      return;
    }
    setDirtyProject(null);
    setSelectedProject(projectId);
    if (tab === "dashboard" || tab === "notifications" || tab === "inbox" || tab === "onboard") setTab("project");
  };
  const discardProjectChange = () => {
    const pending = pendingProject;
    setPendingProject(null);
    setDirtyProject(null);
    setSelectedProject(pending);
    if (tab === "dashboard" || tab === "notifications" || tab === "inbox" || tab === "onboard") setTab("project");
  };
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
      onProjectDirty: (dirty) => setDirtyProject(dirty ? payload.project?.id : null),
      onRefresh: refresh,
      pendingWorkRef,
      onPendingWorkConsumed: () => setPendingWorkRef(null),
      notice: deepLinkNotice
    }, `project:${payload.project?.id ?? payload.missingProject ?? "none"}`);
  } else if (tab === "settings") {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: "settings",
      onSelectProject: selectProject,
      onProjectDirty: (dirty) => setDirtyProject(dirty ? payload.project?.id : null),
      onRefresh: refresh,
      notice: deepLinkNotice
    }, `settings:${payload.project?.id ?? payload.missingProject ?? "none"}`);
  } else if (tab === "workflows") {
    content = jsx(ProjectDashboard, {
      view: payload,
      initialView: "workflows",
      onSelectProject: selectProject,
      onProjectDirty: (dirty) => setDirtyProject(dirty ? payload.project?.id : null),
      onRefresh: refresh,
      notice: deepLinkNotice
    }, `workflows:${payload.project?.id ?? payload.missingProject ?? "none"}`);
  } else if (tab === "onboard") {
    content = jsx(OnboardPanel, { view: payload, onOpen: () => setOnboardingOpen(true), onRefresh: refresh });
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
        onTab: (next) => {
          if (next === "project") setProjectEntryView("overview");
          if (next === "dashboard") setDashboardHomeVersion((value) => value + 1);
          setTab(next);
        },
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
    pendingProject ? jsxs("section", { className: "dockyard-modal-layer", "data-project-switch-confirm": true, children: [
      jsxs("div", { className: "dockyard-modal", role: "dialog", "aria-modal": true, children: [
        jsx("h2", { children: "Discard unsaved changes?" }),
        jsx("p", { children: "This project has unsaved changes. Choose Discard to switch projects or Cancel to keep editing." }),
        jsxs("div", { className: "dockyard-modal-actions", children: [
          jsx(Button, { onClick: () => setPendingProject(null), children: "Cancel" }),
          jsx(Button, { variant: "danger", onClick: discardProjectChange, children: "Discard" })
        ] })
      ] })
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
