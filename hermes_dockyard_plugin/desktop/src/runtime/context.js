// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useEffect } from './react.js'
import { DOCKYARD_CSS } from '../styles/dockyard-css.js'
import workflowCanvasCss from './workflow-canvas-css.js'
export let _rest = null
export let _os = null
export let _toastId = 0
export const TOAST_EVENT = 'dockyard:toast'

export function bindContext(ctx) {
  _rest = ctx.rest
  _os = ctx.os
}

export function mutationMessage(path, result) {
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

export function emitToast(tone, message) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(new window.CustomEvent(TOAST_EVENT, {
    detail: { id: ++_toastId, tone, message },
  }))
}

export async function api(path, init) {
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

export function useStylesheet(datasetKey, datasetValue, css) {
  useEffect(() => {
    const selector = `style[data-${datasetKey}="true"]`
    const existing = document.querySelector(selector)
    if (existing) return undefined
    const style = document.createElement('style')
    style.dataset[datasetValue] = 'true'
    style.textContent = css
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
}

export function useDockyardStyles() {
  useStylesheet('dockyard-style', 'dockyardStyle', DOCKYARD_CSS)
  // The workflow canvas owns a stylesheet of its own (the palette has exactly
  // one home: dashboard/src/workflow-canvas-css.ts). Its rules are scoped to
  // `.dy-wf-scope`, a class the canvas mount host carries itself, so this file
  // only has to make the text present — it does not scope or wrap the canvas.
  // Without it every `var(--dy-wf-*)` fill resolves to nothing and the nodes
  // paint solid black (measured regression, 2026-09-22).
  useStylesheet('dy-wf-stylesheet', 'dyWfStylesheet', workflowCanvasCss)
}
