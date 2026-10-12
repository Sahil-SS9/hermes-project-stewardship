// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Sahil 05/10 (demo feedback h, design round d + h): the colour themes he
// designed in September (HPS-UI-Concepts-v6 + HPSUI2), with their backgrounds
// and fonts. The palettes are generated from assets/themes/theme-palettes.py,
// which checks every colour pair Project Stewardship uses against WCAG AA; edit there and
// regenerate rather than editing a colour here. Sources and licences:
// assets/themes/README.md. The choice lives in the backend (/settings/appearance).
import { THEME_ART } from './theme-assets.js'
import { THEME_FONTS } from './theme-assets.js'

export const DEFAULT_THEME = 'auto'
export const DEFAULT_FONT = 'system'
const SYSTEM_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export const THEMES = Object.freeze([
  { id: 'auto', name: 'Match Hermes', mode: 'auto', source: 'dockyard', art: null, tokens: null },
  { id: 'caffeine', name: 'Caffeine Paper', mode: 'light', source: 'v6', art: null,
    tokens: Object.freeze({ bg: '#f7f5f0', surface: '#fbfaf7', surfaceSubtle: '#f3f0e9', surfaceStrong: '#eee9e0', text: '#1c1a17', textSecondary: '#5d574e', textTertiary: '#5d574e', border: '#d8d2c4', controlBorder: '#8c8374', action: '#2563eb', actionHover: '#1d4fd8', onAction: '#ffffff', accentText: '#1d4ed8', accentSoft: '#e6edfc', accentBorder: '#b4c6f3', shadow: '0 10px 28px rgba(54, 44, 28, 0.08)', success: '#136c4a', successBg: '#e7f6ef', warning: '#805200', warningBg: '#fff3d4', danger: '#a72a2a', dangerBg: '#ffeded', info: '#315ca8', infoBg: '#eaf2ff', neutral: '#5a574f', neutralBg: '#ebe7de', focus: '#2563eb', disabledText: '#5d574e', disabledBg: '#eee9e0' }) },
  { id: 'kodama', name: 'Kodama Grove', mode: 'light', source: 'v6', art: null,
    tokens: Object.freeze({ bg: '#e9e2c8', surface: '#f1ebda', surfaceSubtle: '#ece5cf', surfaceStrong: '#e4dbbb', text: '#1d2416', textSecondary: '#4f4f35', textTertiary: '#4f4f35', border: '#bfae8a', controlBorder: '#776a4d', action: '#0e7490', actionHover: '#0b5f77', onAction: '#ffffff', accentText: '#0a5a70', accentSoft: '#d7e6e0', accentBorder: '#8db9c2', shadow: '0 10px 28px rgba(54, 44, 28, 0.08)', success: '#136c4a', successBg: '#e7f6ef', warning: '#805200', warningBg: '#fff3d4', danger: '#a72a2a', dangerBg: '#ffeded', info: '#315ca8', infoBg: '#eaf2ff', neutral: '#4f5444', neutralBg: '#e3dcc4', focus: '#0e7490', disabledText: '#4f4f35', disabledBg: '#e4dbbb' }) },
  { id: 'cobalt', name: 'Midnight Cobalt', mode: 'dark', source: 'v6', art: 'cobalt',
    tokens: Object.freeze({ bg: '#070a12', surface: '#0e1422', surfaceSubtle: '#121a2b', surfaceStrong: '#182338', text: '#eef3fb', textSecondary: '#a9bad4', textTertiary: '#9cb0cd', border: '#223148', controlBorder: '#566e94', action: '#60a5fa', actionHover: '#86bbfb', onAction: '#061224', accentText: '#9cc6fc', accentSoft: '#16253f', accentBorder: '#2f5487', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#bac2ce', neutralBg: '#202939', focus: '#93c5fd', disabledText: '#a9bad4', disabledBg: '#182338' }) },
  { id: 'estuary', name: 'Deep Estuary', mode: 'dark', source: 'v6', art: 'estuary',
    tokens: Object.freeze({ bg: '#060f0e', surface: '#0b1816', surfaceSubtle: '#0f201d', surfaceStrong: '#152a26', text: '#eef7f3', textSecondary: '#a6c7bb', textTertiary: '#9cc0b3', border: '#1f3a33', controlBorder: '#4f7a6d', action: '#5eead4', actionHover: '#8af0e0', onAction: '#03201b', accentText: '#93f1e2', accentSoft: '#11302b', accentBorder: '#2b6458', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#b8c8c2', neutralBg: '#1d2b28', focus: '#5eead4', disabledText: '#a6c7bb', disabledBg: '#152a26' }) },
  { id: 'burgundy', name: 'Burgundy Ink', mode: 'dark', source: 'v6', art: 'burgundy',
    tokens: Object.freeze({ bg: '#0f080d', surface: '#180c14', surfaceSubtle: '#1f111b', surfaceStrong: '#2a1724', text: '#fbeef2', textSecondary: '#d1aec3', textTertiary: '#c8a2b9', border: '#3a2233', controlBorder: '#83566e', action: '#f472b6', actionHover: '#f794c8', onAction: '#2b0718', accentText: '#f9a8d4', accentSoft: '#3a1529', accentBorder: '#73305a', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#cdbdc6', neutralBg: '#2c1f29', focus: '#f9a8d4', disabledText: '#d1aec3', disabledBg: '#2a1724' }) },
  { id: 'violet', name: 'Violet Signal', mode: 'dark', source: 'v6', art: 'violet',
    tokens: Object.freeze({ bg: '#0a0813', surface: '#110d1e', surfaceSubtle: '#171228', surfaceStrong: '#201936', text: '#f1eefb', textSecondary: '#bab2d9', textTertiary: '#b1a8d2', border: '#2c2449', controlBorder: '#675d97', action: '#a78bfa', actionHover: '#bba5fb', onAction: '#150a35', accentText: '#c9bcfd', accentSoft: '#241b45', accentBorder: '#4d3e88', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#c3bed6', neutralBg: '#231d36', focus: '#c4b5fd', disabledText: '#bab2d9', disabledBg: '#201936' }) },
  { id: 'ember', name: 'Ember Spectrum', mode: 'dark', source: 'v6', art: 'ember',
    tokens: Object.freeze({ bg: '#0f0811', surface: '#180c1b', surfaceSubtle: '#1f1023', surfaceStrong: '#2a162e', text: '#faf0f1', textSecondary: '#d4b1c4', textTertiary: '#cba5ba', border: '#3b2440', controlBorder: '#85607f', action: '#fb923c', actionHover: '#fcaa66', onAction: '#2b1203', accentText: '#fdba74', accentSoft: '#3a1f12', accentBorder: '#7f4519', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#cdbfc8', neutralBg: '#2b1f2e', focus: '#fdba74', disabledText: '#d4b1c4', disabledBg: '#2a162e' }) },
  { id: 'neon', name: 'Neon Block Night', mode: 'dark', source: 'hpsui2', art: 'neon',
    tokens: Object.freeze({ bg: '#03160f', surface: '#062419', surfaceSubtle: '#082c20', surfaceStrong: '#0c3828', text: '#fffdf1', textSecondary: '#b4d6c3', textTertiary: '#acd1bc', border: '#145238', controlBorder: '#3f8d6b', action: '#ffb21c', actionHover: '#ffc451', onAction: '#2a1900', accentText: '#ffe1a1', accentSoft: '#2b3313', accentBorder: '#8a6512', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#bfd3c8', neutralBg: '#12332a', focus: '#ffe1a1', disabledText: '#b4d6c3', disabledBg: '#0c3828' }) },
  { id: 'grove', name: 'Kodama Grove Night', mode: 'dark', source: 'hpsui2', art: 'grove',
    tokens: Object.freeze({ bg: '#12180e', surface: '#1b2315', surfaceSubtle: '#212a1a', surfaceStrong: '#2a3421', text: '#f5efd9', textSecondary: '#cdcca9', textTertiary: '#c5c4a2', border: '#3a4529', controlBorder: '#6f7f53', action: '#b9cf72', actionHover: '#cadc8f', onAction: '#1a2204', accentText: '#e4efb9', accentSoft: '#2c3a1a', accentBorder: '#66783a', shadow: '0 12px 30px rgba(0, 0, 0, 0.36)', success: '#72cda2', successBg: '#16372a', warning: '#f0bd64', warningBg: '#3a2c14', danger: '#ff9188', dangerBg: '#40201f', info: '#9ab9ff', infoBg: '#1c2d4a', neutral: '#cfcab4', neutralBg: '#2c3322', focus: '#e4efb9', disabledText: '#cdcca9', disabledBg: '#2a3421' }) },
]
)

export const FONTS = Object.freeze([
  { id: 'system', name: 'System', family: SYSTEM_STACK },
  { id: 'space-grotesk', name: 'Space Grotesk', family: `"Dockyard Space Grotesk", ${SYSTEM_STACK}` },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: '"Dockyard JetBrains Mono", ui-monospace, monospace' },
  { id: 'space-mono', name: 'Space Mono', family: '"Dockyard Space Mono", ui-monospace, monospace' },
])

export const themeById = (id) => THEMES.find((theme) => theme.id === id) ?? THEMES[0]
export const fontById = (id) => FONTS.find((font) => font.id === id) ?? FONTS[0]

// Which data-theme ("light"/"dark") the root carries: a theme's own mode, or
// for Match Hermes the mode Hermes Desktop shows.
export function themeMode(themeId, hostDark) {
  const theme = themeById(themeId)
  return theme.mode === 'auto' ? (hostDark ? 'dark' : 'light') : theme.mode
}

// Hermes Desktop's mode comes from the plugin SDK: see runtime/host-theme.js.

const VARS = [
  ['bg', '--dy-bg'], ['surface', '--dy-surface'], ['surfaceSubtle', '--dy-surface-subtle'], ['surfaceStrong', '--dy-surface-strong'],
  ['text', '--dy-text'], ['textSecondary', '--dy-text-2'], ['textTertiary', '--dy-text-3'],
  ['border', '--dy-border'], ['controlBorder', '--dy-control-border'],
  ['action', '--dy-action'], ['actionHover', '--dy-action-hover'], ['onAction', '--dy-on-action'],
  ['accentText', '--dy-accent-text'], ['accentSoft', '--dy-accent-soft'], ['accentBorder', '--dy-accent-border'],
  ['shadow', '--dy-shadow'],
  ['success', '--dy-success'], ['successBg', '--dy-success-bg'], ['warning', '--dy-warning'], ['warningBg', '--dy-warning-bg'],
  ['danger', '--dy-danger'], ['dangerBg', '--dy-danger-bg'], ['info', '--dy-info'], ['infoBg', '--dy-info-bg'],
  ['neutral', '--dy-neutral'], ['neutralBg', '--dy-neutral-bg'],
  ['focus', '--dy-focus'], ['disabledText', '--dy-disabled-text'], ['disabledBg', '--dy-disabled-bg'],
]

const themeRule = (theme) => {
  const art = theme.art ? THEME_ART[theme.art] : null
  return `.dockyard-root[data-dy-theme="${theme.id}"][data-theme] {
  color-scheme: ${theme.mode};
${VARS.map(([key, name]) => `  ${name}: ${theme.tokens[key]};`).join('\n')}
  color: ${theme.tokens.text};
  background: ${art ? `${theme.tokens.bg} url("${art}") center / cover no-repeat fixed` : theme.tokens.bg};
}`
}

const FONT_FACES = [
  ['Dockyard Space Grotesk', THEME_FONTS['space-grotesk'][0], '300 700'],
  ['Dockyard JetBrains Mono', THEME_FONTS['jetbrains-mono'][0], '100 800'],
  ['Dockyard Space Mono', THEME_FONTS['space-mono'][0], '400'],
  ['Dockyard Space Mono', THEME_FONTS['space-mono'][1], '700'],
].map(([family, url, weight]) => `@font-face { font-family: "${family}"; src: url("${url}") format("woff2"); font-weight: ${weight}; font-style: normal; font-display: swap; }`)

export const THEME_CSS = `
/* Names some rules used without a definition (accent, accent bg, secondary
   text): they now follow the active theme instead of fixed light colours. */
.dockyard-root { --dy-accent: var(--dy-action); --dy-accent-bg: var(--dy-accent-soft); --dy-text-secondary: var(--dy-text-2); }
/* Placeholder text used the browser's own grey (#757575): below 4.5:1 in every
   theme, the default included. The theme's tertiary text passes everywhere. */
.dockyard-root :is(input, textarea)::placeholder { color: var(--dy-text-3); opacity: 1; }
/* Plain links had no colour and showed the browser's own (#0000ee light,
   #9e9eff dark). They take the theme's accent text; classed links keep theirs. */
.dockyard-root a:where(:not([class])) { color: var(--dy-accent-text); }
${FONT_FACES.join('\n')}
${THEMES.filter((theme) => theme.tokens).map(themeRule).join('\n')}
/* Themes with a background: the art shows in the page gutters, the top bar is
   frosted glass, and reading surfaces (cards, panels, tables) stay opaque.
   The glass is a layer behind the bar's content, not the bar itself: a
   backdrop filter on the bar would trap the switcher's fixed overlay inside it. */
.dockyard-root[data-dy-art] .dockyard-consolebar { background: transparent; }
.dockyard-root[data-dy-art] .dockyard-consolebar::before {
  content: ""; position: absolute; inset: 0; z-index: -1; border-radius: inherit;
  background: color-mix(in srgb, var(--dy-surface) 78%, transparent);
  -webkit-backdrop-filter: blur(14px) saturate(1.15);
  backdrop-filter: blur(14px) saturate(1.15);
}
${FONTS.filter((font) => font.id !== DEFAULT_FONT).map((font) => `.dockyard-root[data-dy-font="${font.id}"] { font-family: ${font.family}; }`).join('\n')}
.dockyard-root[data-dy-font] :is(input, select, textarea) { font-family: inherit; }
/* Monospace letters are wider: the tab bar keeps its spacing with smaller tab text. */
.dockyard-root[data-dy-font$="-mono"] .dockyard-tab { font-size: 12px; padding-inline: 8px; }
`
