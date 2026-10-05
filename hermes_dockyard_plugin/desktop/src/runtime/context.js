// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useEffect } from './react.js'
import { DOCKYARD_CSS } from '../styles/dockyard-css.js'
import { THEME_CSS } from '../styles/themes.js'
import { SWITCHER_CSS } from '../styles/switcher-css.js'
import { WORKFLOW_LIBRARY_CSS } from '../styles/workflow-css.js'
import { ROADMAP_CSS } from '../styles/roadmap-css.js'
import { PLAN_CSS } from '../styles/plan-css.js'
import { SETTINGS_CSS } from '../styles/settings-css.js'
import { KANBAN_CSS } from '../styles/kanban-css.js'
import workflowCanvasCss from '../../workflow-canvas-css.js'
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
  // `quiet` is for background saves the person did not ask to confirm (the
  // remembered project): no success or error toast.
  const quiet = init?.quiet === true
  try {
    const result = await _rest(path, { method, body: init?.body })
    if (method !== 'GET' && !quiet) emitToast('success', mutationMessage(path, result))
    return result
  } catch (error) {
    const raw = String(error?.message ?? error).slice(0, 240)
    // The Desktop host can stringify a structured 403 response detail as
    // "403: [object Object]" before passing the error to this plugin. The
    // original detail is unavailable here: preserve the status and offer
    // only the verified archive permission as an actionable hint.
    const message = /^403:\s*\[object Object\]$/.test(raw) &&
      /^\/projects\/[^/]+\/workflows\/[^/]+\/archive$/.test(path)
      ? '403 Forbidden: archive permission (project_archive) is required or this action is denied. No change was made.'
      : /(?:error\s*)?500|internal service error/i.test(raw)
        ? 'Dockyard could not confirm the request.'
        : raw
    if (method !== 'GET' && !init?.suppressErrorToast && !quiet) emitToast('danger', message)
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
  // W3/W4: workflow library + enablement styles (W-owned; appended here so
  // dockyard-css.js does not grow, per the Batch W shared-file table).
  useStylesheet('dy-wf-library-stylesheet', 'dyWfLibraryStylesheet', WORKFLOW_LIBRARY_CSS)
  // R2 Phase C: Roadmap styles (R2-owned; appended here so dockyard-css.js
  // does not grow, same rule as the workflow library block above).
  useStylesheet('dy-roadmap-stylesheet', 'dyRoadmapStylesheet', ROADMAP_CSS)
  // C8 Settings option A: three uppercase category labels over the existing
  // Project configuration grid (C8-owned; appended here so dockyard-css.js does
  // not grow, same rule as the workflow library and roadmap blocks above).
  useStylesheet('dy-settings-stylesheet', 'dySettingsStylesheet', SETTINGS_CSS)
  // C2 Kanban: the board's own rules (C2-owned; moved here out of
  // dockyard-css.js, same rule as the blocks above).
  useStylesheet('dy-kanban-stylesheet', 'dyKanbanStylesheet', KANBAN_CSS)
  // The workflow canvas owns a stylesheet of its own (the palette has exactly
  // one home: dashboard/src/workflow-canvas-css.ts). Its rules are scoped to
  // `.dy-wf-scope`, a class the canvas mount host carries itself, so this file
  // only has to make the text present — it does not scope or wrap the canvas.
  // Without it every `var(--dy-wf-*)` fill resolves to nothing and the nodes
  // paint solid black (measured regression, 2026-09-22).
  useStylesheet('dy-wf-stylesheet', 'dyWfStylesheet', workflowCanvasCss)
  // Sahil 05/10 (design round d): the global project switcher.
  useStylesheet('dy-switcher-stylesheet', 'dySwitcherStylesheet', SWITCHER_CSS)
  // Design round f prototype (05/10): the one Plan screen inside a project.
  useStylesheet('dy-plan-stylesheet', 'dyPlanStylesheet', PLAN_CSS)
  // Sahil 05/10 (design round d + h): colour themes, backgrounds and fonts.
  // Last, so a chosen theme's colours win over every block above.
  useStylesheet('dy-theme-stylesheet', 'dyThemeStylesheet', THEME_CSS)
}
