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
// --dt-*/--theme-* palette Match Hermes takes is then in scope.
export function useHostIsDesktop() {
  return hostThemeMode(useSdkTheme()) !== null
}
