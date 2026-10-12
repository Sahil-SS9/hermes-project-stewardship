/**
 * Hermes Project Stewardship desktop runtime plugin.
 * The committed plugin.js is generated from these hand-edited modules.
 */
import { jsx } from './runtime/react.js'
import { host } from '@hermes/plugin-sdk'
import { ApprovalRow } from './work-item/approvals.js'
import { BacklogView } from './views/backlog.js'
import { Button } from './lib/ui.js'
import { CANVAS_CARD } from './project/canvas.js'
import { CANVAS_CONNECTOR_MEANINGS } from './project/canvas.js'
import { CANVAS_KIND_LABELS } from './project/canvas.js'
import { CANVAS_MEANING_LABELS } from './project/canvas.js'
import { CANVAS_OBJECT_KINDS } from './project/canvas.js'
import { CANVAS_WORLD } from './project/canvas.js'
import { CANVAS_ZOOM } from './project/canvas.js'
import { ConfirmDialog } from './lib/ui.js'
import { ConsoleBar } from './lib/ui.js'
import { DOCKYARD_ALLOWED_CHILDREN } from './views/backlog.js'
import { DOCKYARD_CREATE_CHILD_TYPES } from './views/backlog.js'
import { DOCKYARD_CSS } from './styles/dockyard-css.js'
import { INBOX_CSS } from './styles/inbox-css.js'
import { DOCKYARD_EDITABLE_TYPES } from './views/backlog.js'
import { DOCKYARD_ROOT_TYPES } from './views/backlog.js'
import { DOCKYARD_TYPE_NAMES } from './views/backlog.js'
import { DashboardPage } from './shell/dashboard-page.js'
import { DashboardView } from './views/dashboard.js'
import { DiscoveredProfilePicker } from './views/dashboard.js'
import { EmptyState } from './lib/ui.js'
import { ErrorState } from './lib/ui.js'
import { ExecutableWorkflowsPanel } from './project/workflows.js'
import { FirstAssessmentCard } from './views/dashboard.js'
import { FleetSearch } from './lib/ui.js'
import { GROUP_LABELS } from './lib/ui.js'
import { HEALTH_PRIORITY } from './data/loaders.js'
import { ICON_NAME } from './lib/ui.js'
import { Icon } from './lib/ui.js'
import { InboxView } from './views/inbox.js'
import { InitiativeRevisionRow } from './views/dashboard.js'
import { LoadingState } from './lib/ui.js'
import { NotificationRow } from './views/notifications.js'
import { NotificationsView } from './views/notifications.js'
import { ObjectiveEvidence } from './work-item/detail.js'
import { OnboardingWizard } from './lib/ui.js'
import { PageHead } from './lib/ui.js'
import { PlanningCanvasPanel } from './project/canvas.js'
import { ProjectContentPanel } from './project/content.js'
import { ProjectDashboard } from './project/dashboard.js'
import { ProjectReportsPanel } from './project/reports.js'
import { ProjectSettingsPanel } from './project/panels.js'
import { RISK_PRIORITY } from './data/loaders.js'
import { SEVERITY_PRIORITY } from './data/loaders.js'
import { StatusTag } from './lib/ui.js'
import { TOAST_EVENT } from './runtime/context.js'
import { ToastRegion } from './lib/ui.js'
import { WorkBar } from './views/dashboard.js'
import { WorkItemDetail } from './work-item/detail.js'
import { _os } from './runtime/context.js'
import { _rest } from './runtime/context.js'
import { _toastId } from './runtime/context.js'
import { api } from './runtime/context.js'
import { bindContext } from './runtime/context.js'
import { canvasClamp } from './project/canvas.js'
import { canvasEdgeSeq } from './project/canvas.js'
import { canvasNumber } from './project/canvas.js'
import { canvasObjectSeq } from './project/canvas.js'
import { canvasPlaced } from './project/canvas.js'
import { canvasRect } from './project/canvas.js'
import { canvasText } from './project/canvas.js'
import { dockyardChildTypes } from './views/backlog.js'
import { dockyardParentAccepts } from './views/backlog.js'
import { dockyardTypeLabel } from './views/backlog.js'
import { fileAsBase64 } from './lib/ui.js'
import { formatBytes } from './lib/ui.js'
import { formatWhen } from './lib/ui.js'
import { healthDetails } from './lib/ui.js'
import { initials } from './data/loaders.js'
import { loadBacklogData } from './data/loaders.js'
import { loadDashboardData } from './data/loaders.js'
import { loadInboxData } from './data/loaders.js'
import { loadProjectData } from './data/loaders.js'
import { loadTeamsData } from './data/loaders.js'
import { mediaTypeLabel } from './lib/ui.js'
import { mutationMessage } from './runtime/context.js'
import { number } from './lib/ui.js'
import { plural } from './lib/ui.js'
import { readableLabel } from './data/loaders.js'
import { riskDetails } from './lib/ui.js'
import { severityTone } from './lib/ui.js'
import { sortApprovals } from './data/loaders.js'
import { sortProjects } from './data/loaders.js'
import { useDialogFocusManager } from './lib/ui.js'
import { useDockyardStyles } from './runtime/context.js'
import { useStylesheet } from './runtime/context.js'
import { validationSummary } from './data/loaders.js'

// Retain the design-token test surface in the generated bundle for the
// behaviour-equivalence and accessibility harnesses.
import { DOCKYARD_TEST } from './styles/tokens.js'
void DOCKYARD_TEST

// Batch E5: pop-up poller. Every 60 seconds, while the window is visible:
// fetch /notifications/popups (the backend returns at most 3 due items plus a
// count of the rest), surface each through host.notify, then mark them shown.
// The backend's popup_shown_at mark stops a pop-up returning, across reloads
// too. No browser storage (26/08 locked rule): the only client memory is an
// in-page set, so an item whose shown-mark failed is not shown again while
// the mark is retried on the next tick.
const POPUP_INTERVAL_MS = 60000
const POPUP_CAP = 3

// Hermes Desktop's host.notify reads only: id, kind, icon, accentColor, meta,
// title, message, detail, action, secondaryAction, onDismiss, durationMs,
// placement. `message` is required and other fields are dropped, so pop-ups
// use exactly these names (apps/desktop/src/store/notifications.ts).
function openDockyard() {
  host?.navigate?.('/dockyard')
}

function surfacePopup(item) {
  // The host owns system-surface pop-ups; the poller never falls back to
  // in-app toasts (those are for user-triggered mutations).
  const text = String(item?.body ?? '').trim()
  host.notify({
    id: `dockyard-notification-${item?.id}`,
    kind: 'info',
    title: item?.title ?? 'Fleet notification',
    message: text || 'Open Project Stewardship to review it.',
    action: { label: 'Open Project Stewardship', onClick: openDockyard },
  })
}

function surfaceMore(count) {
  host.notify({
    id: 'dockyard-notification-more',
    kind: 'info',
    title: `and ${count} more notification${count === 1 ? '' : 's'}`,
    message: 'See them all in Project Stewardship Notifications.',
    action: { label: 'Open Project Stewardship', onClick: openDockyard },
  })
}

function startPopupPoller(ctxRest) {
  // Pop-ups are a host capability: without host.notify there is nothing to
  // surface them on (jsdom/test hosts), so no poller, no stray timers.
  if (typeof host?.notify !== 'function') return
  if (typeof window === 'undefined' || window.__dockyardPopupPoller) return
  const surfaced = new Set()
  const tick = async () => {
    if (document.visibilityState !== 'visible') return
    try {
      const result = await ctxRest('/notifications/popups', { method: 'GET' })
      const popups = (Array.isArray(result?.popups) ? result.popups : []).slice(0, POPUP_CAP)
      const more = Math.max(0, Number(result?.more) || 0)
      const fresh = popups.filter((item) => !surfaced.has(item.id))
      for (const item of fresh) {
        surfaced.add(item.id)
        surfacePopup(item)
      }
      if (fresh.length && more > 0) surfaceMore(more)
      const shownIds = popups.map((item) => item.id)
      if (shownIds.length) {
        await ctxRest('/notifications/popups/shown', { method: 'POST', body: { ids: shownIds } })
      }
    } catch {
      // Offline or restarting backend: try again on the next tick.
    }
  }
  const interval = Number(window.__dockyardPopupIntervalMs) > 0
    ? Number(window.__dockyardPopupIntervalMs)
    : POPUP_INTERVAL_MS
  window.__dockyardPopupPoller = setInterval(tick, interval)
  // Prime shortly after load so a fresh pop-up does not wait a full minute.
  window.setTimeout(tick, 1500)
}

// The interval is the plugin's own timer: clear it when the surface unloads
// (pagehide) and re-arm when the surface returns (pageshow); the guard inside
// startPopupPoller keeps a fresh load from stacking a second timer
// (catalog review, PR #136752).
function stopPopupPoller() {
  if (!window.__dockyardPopupPoller) return
  clearInterval(window.__dockyardPopupPoller)
  window.__dockyardPopupPoller = undefined
}

window.addEventListener('pagehide', stopPopupPoller)
window.addEventListener('pageshow', () => startPopupPoller())

const __plugin = {
  id: 'hermes-project-stewardship',
  name: 'Hermes Project Stewardship',
  register(ctx) {
    bindContext(ctx)
    startPopupPoller(ctx.rest)
    ctx.registerMany([
      {
        id: 'page',
        area: 'routes',
        data: { path: '/dockyard' },
        render: () => jsx(DashboardPage, { inboxCss: INBOX_CSS }),
      },
      {
        id: 'nav',
        area: 'sidebar.nav',
        order: 55,
        data: { codicon: 'project', label: 'Project Stewardship', path: '/dockyard' },
      },
      {
        id: 'open',
        area: 'palette',
        data: {
          id: 'hermes-project-stewardship.open',
          label: 'Project Stewardship: Open fleet overview',
          keywords: ['dockyard', 'fleet', 'projects', 'approvals', 'notifications'],
          run: () => host.navigate('/dockyard'),
        },
      },
    ])
  },
}

export { DOCKYARD_TEST }
export default __plugin
