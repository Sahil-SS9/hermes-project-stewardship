// The light/dark mode Hermes Desktop paints, read through the plugin SDK.
//
// Catalog review (PR #136752): never watch the app's <html> markup. Desktop
// v0.21.6+ exports useTheme() (renderedMode = the painted surface,
// resolvedMode = the switch the user picked). It is read through the module
// namespace, never as a named import: older hosts' SDK shim has no useTheme
// export, and a named import of a missing export fails the whole plugin at
// load. Outside Desktop (the practice server in a browser), or on a host
// without the hook, the system setting decides.
import * as sdk from '@hermes/plugin-sdk'
import { useEffect, useState } from './react.js'

const noHostTheme = () => null
const useSdkTheme = typeof sdk.useTheme === 'function' ? sdk.useTheme : noHostTheme

const systemQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function systemIsDark() {
  return Boolean(systemQuery()?.matches)
}

// 'dark' | 'light' from a useTheme() value, or null when it names neither.
export function hostThemeMode(value) {
  const mode = value?.renderedMode ?? value?.resolvedMode
  return mode === 'dark' || mode === 'light' ? mode : null
}

export function useHostDark() {
  const hostMode = hostThemeMode(useSdkTheme())
  const [systemDark, setSystemDark] = useState(systemIsDark)
  useEffect(() => {
    const media = systemQuery()
    const read = () => setSystemDark(systemIsDark())
    media?.addEventListener?.('change', read)
    return () => media?.removeEventListener?.('change', read)
  }, [])
  return hostMode ? hostMode === 'dark' : systemDark
}

// True inside a Hermes Desktop whose SDK reports its theme (v0.21.6+): the
// documented --ui-* theme variables Match Hermes styles with are then in scope.
export function useHostIsDesktop() {
  return hostThemeMode(useSdkTheme()) !== null
}

// [r, g, b] (0-255) from a computed colour: 'rgb(...)'/'rgba(...)', or the
// 'color(srgb r g b)' form Chromium uses for color-mix() results. null when
// the value is anything else, or fully transparent.
export function parseComputedColour(value) {
  const text = String(value || '').trim()
  let match = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/)
  if (match) {
    if (match[4] !== undefined && parseFloat(match[4]) === 0) return null
    return [match[1], match[2], match[3]].map(Number)
  }
  match = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/)
  if (match) {
    if (match[4] !== undefined && parseFloat(match[4]) === 0) return null
    return [match[1], match[2], match[3]].map((channel) => Number(channel) * 255)
  }
  return null
}

function luminance([red, green, blue]) {
  const linear = (channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue)
}

// Black or white, whichever reads better on `rgb`. The better of the two always
// clears 4.5:1 (WCAG AA), whatever accent a Desktop theme chooses.
export function inkFor(rgb) {
  const lum = luminance(rgb)
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? '#000000' : '#ffffff'
}

// Inside Desktop's Match Hermes, primary buttons take Desktop's accent. The SDK
// documents --ui-accent as a stroke/accent colour, not a fill with readable
// text, so the text colour is computed: resolve the accent the SDK docs' way
// (getComputedStyle on a theme variable) and pick black or white. Read one frame
// after a theme change so Desktop has already rewritten its variables. null when
// Desktop defines no accent; the buttons then keep the app's checked colours.
export function useHostAccent(root, active) {
  const hostTheme = useSdkTheme()
  const [accent, setAccent] = useState(null)
  useEffect(() => {
    if (!active || !root) {
      setAccent(null)
      return undefined
    }
    const frame = window.requestAnimationFrame(() => {
      if (!getComputedStyle(root).getPropertyValue('--ui-accent').trim()) {
        setAccent(null)
        return
      }
      const probe = document.createElement('span')
      probe.style.color = 'var(--ui-accent)'
      root.appendChild(probe)
      const resolved = getComputedStyle(probe).color
      probe.remove()
      const rgb = parseComputedColour(resolved)
      const next = rgb ? { fill: resolved, ink: inkFor(rgb) } : null
      setAccent((previous) => (
        previous && next && previous.fill === next.fill && previous.ink === next.ink ? previous : next
      ))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [active, hostTheme, root])
  return accent
}
