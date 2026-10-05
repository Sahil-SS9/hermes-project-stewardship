// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// PROTOTYPE ONLY (design round d + h, 05/10): a small bar for comparing the
// three switcher directions and the themes without leaving the screen. It
// shows only on a review link (?review=1) and is removed before release.
// Theme and font changes go through the same saved setting as App settings.
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { SWITCHER_VARIANTS } from '../lib/project-switcher.js'
import { THEMES } from '../styles/themes.js'
import { FONTS } from '../styles/themes.js'

const DIRECTION = Object.freeze({ a: 'A: breadcrumb', b: 'B: palette (Ctrl/Cmd+J)', c: 'C: project row' })

export function DesignReviewBar({ variant, onVariant, appearance, onAppearance }) {
  const [collapsed, setCollapsed] = useState(false)
  return jsxs('aside', { className: 'dy-review-bar', 'aria-label': 'Design review', 'data-review-bar': 'true', 'data-collapsed': collapsed ? 'true' : undefined, children: [
    jsx('button', { type: 'button', className: 'dy-review-toggle', 'aria-expanded': !collapsed, 'aria-label': collapsed ? 'Show design review' : 'Hide design review',
      onClick: () => setCollapsed(!collapsed), children: collapsed ? 'Design review ▸' : '◂' }),
    jsx('strong', { children: 'Design review' }),
    jsxs('label', { children: ['Switcher', jsx('span', { className: 'dy-review-seg', role: 'group', 'aria-label': 'Switcher direction', children:
      SWITCHER_VARIANTS.map((id) => jsx('button', { type: 'button', 'aria-pressed': variant === id, 'data-review-switcher': id, title: DIRECTION[id],
        onClick: () => onVariant(id), children: id.toUpperCase() }, id)) })] }),
    jsxs('label', { children: ['Theme', jsx('select', { 'aria-label': 'Review theme', value: appearance.theme,
      onChange: (event) => onAppearance({ theme: event.target.value }),
      children: THEMES.map((theme) => jsx('option', { value: theme.id, children: theme.name }, theme.id)) })] }),
    jsxs('label', { children: ['Font', jsx('select', { 'aria-label': 'Review font', value: appearance.font,
      onChange: (event) => onAppearance({ font: event.target.value }),
      children: FONTS.map((font) => jsx('option', { value: font.id, children: font.name }, font.id)) })] }),
  ] })
}
