/**
 * Hermes Dockyard desktop runtime plugin.
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
import { GoalsManager } from './project/objectives.js'
import { HEALTH_PRIORITY } from './data/loaders.js'
import { ICON_NAME } from './lib/ui.js'
import { Icon } from './lib/ui.js'
import { InboxView } from './views/inbox.js'
import { InitiativeRevisionRow } from './views/dashboard.js'
import { LoadingState } from './lib/ui.js'
import { NotificationGroup } from './views/notifications.js'
import { NotificationRow } from './views/notifications.js'
import { NotificationsView } from './views/notifications.js'
import { ObjectiveEvidence } from './work-item/detail.js'
import { ObjectivesPanel } from './project/objectives.js'
import { OnboardPanel } from './views/onboard.js'
import { OnboardingWizard } from './lib/ui.js'
import { PageHead } from './lib/ui.js'
import { PlanningCanvasPanel } from './project/canvas.js'
import { PlanningPanel } from './project/workflows.js'
import { ProjectContentPanel } from './project/content.js'
import { ProjectDashboard } from './project/dashboard.js'
import { ProjectPicker } from './lib/ui.js'
import { ProjectReportsPanel } from './project/panels.js'
import { ProjectSettingsPanel } from './project/panels.js'
import { RISK_PRIORITY } from './data/loaders.js'
import { SEVERITY_PRIORITY } from './data/loaders.js'
import { SavedViewsSection } from './project/saved-views.js'
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
import { emitToast } from './runtime/context.js'
import { fileAsBase64 } from './lib/ui.js'
import { formatBytes } from './lib/ui.js'
import { formatWhen } from './lib/ui.js'
import { healthDetails } from './lib/ui.js'
import { initials } from './data/loaders.js'
import { loadBacklogData } from './data/loaders.js'
import { loadDashboardData } from './data/loaders.js'
import { loadInboxData } from './data/loaders.js'
import { loadOnboardData } from './data/loaders.js'
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

export { DOCKYARD_TEST }
export default __plugin
