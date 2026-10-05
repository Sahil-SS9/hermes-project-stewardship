// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { LUCIDE_ICON_NODES } from '../../lucide-icons.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { readableLabel } from '../data/loaders.js'
import { useEffect } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { useRef } from '../runtime/react.js'
import { Fragment } from '../runtime/react.js'
export const ICON_NAME = Object.freeze({
  dock: 'layout-dashboard', project: 'folder-kanban', check: 'circle-check',
  alert: 'triangle-alert', refresh: 'rotate-cw', activity: 'activity',
  eye: 'eye', chevron: 'chevron-right', 'chevron-down': 'chevron-down',
  search: 'search', pencil: 'pencil', bell: 'bell',
  'type-epic': 'list-checks', 'type-feature': 'folders', 'type-initiative': 'flag',
  'type-task': 'square-check-big', 'type-subtask': 'list-checks',
  'type-bug': 'bug', 'type-spike': 'zap',
})
// LANE-TOOLBAR: backlog group-by labels shared by the toolbar and count summary.
export const GROUP_LABELS = Object.freeze({ none: 'None', status: 'Status', assignee: 'Owner', type: 'Type', initiative: 'Initiative', month: 'Due month' })
export function Icon({ name }) {
  const iconName = ICON_NAME[name] ?? name
  const nodes = LUCIDE_ICON_NODES[iconName] ?? LUCIDE_ICON_NODES.bell
  return jsxs('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': true,
    // Copy: React 19 reuses the config object as props and tags it with a key getter,
    // which would mutate the shared icon table and warn on the next render.
    children: nodes.map(([tag, attributes], index) => jsx(tag, { ...attributes }, `${iconName}-${index}`)),
  })
}

export function number(value) {
  return new Intl.NumberFormat('en-GB').format(Number(value ?? 0))
}

export function plural(value, singular, multiple = `${singular}s`) {
  return Number(value) === 1 ? singular : multiple
}

export function healthDetails(value) {
  const map = {
    healthy: ['success', 'Healthy'],
    watch: ['warning', 'Watch'],
    frozen: ['danger', 'Frozen'],
    attention: ['danger', 'Needs attention'],
    degraded: ['warning', 'Degraded'],
    critical: ['danger', 'Critical'],
    unknown: ['neutral', 'Not verified'],
  }
  return map[value] ?? ['neutral', 'Not verified']
}

export function riskDetails(value) {
  const risk = String(value || 'medium').toLowerCase()
  if (risk === 'low') return ['success', 'Low risk']
  if (risk === 'high' || risk === 'critical') return ['danger', `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk`]
  return ['warning', 'Medium risk']
}

export function severityTone(value) {
  const severity = String(value || 'info').toLowerCase()
  if (severity === 'high' || severity === 'critical' || severity === 'error') return 'danger'
  if (severity === 'medium' || severity === 'warning') return 'warning'
  return 'info'
}

export function formatWhen(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

export function formatBytes(value) {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size'
  if (bytes < 1024) return `${number(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mediaTypeLabel(value) {
  return {
    'text/plain': 'Text',
    'text/markdown': 'Markdown',
    'application/pdf': 'PDF',
    'image/png': 'PNG image',
    'image/jpeg': 'JPEG image',
    'image/webp': 'WebP image',
    'video/mp4': 'MP4 video',
    'video/webm': 'WebM video',
  }[value] || readableLabel(value, 'File')
}

export function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      if (comma < 0) {
        reject(new Error('The selected file could not be encoded.'))
        return
      }
      resolve(result.slice(comma + 1))
    }
    reader.readAsDataURL(file)
  })
}

export function StatusTag({ tone = 'neutral', label }) {
  return jsxs('span', { className: `dockyard-status-tag ${tone}`, children: [
    jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
    label,
  ]})
}

export function Button({ children, onClick, variant = '', small = false, disabled = false, action, ariaLabel, data = {} }) {
  return jsx('button', {
    type: 'button',
    className: `dockyard-button${variant ? ` ${variant}` : ''}${small ? ' small' : ''}`,
    disabled,
    onClick,
    'data-action': action,
    'aria-label': ariaLabel,
    ...data,
    children,
  })
}

// PM-0604/Phase6 UX hardening (Lane-B-03): one focus manager for MODAL
// dialog surfaces (ConfirmDialog, OnboardingWizard). Behaviour, driven only
// by real DOM events:
//   1. initial focus moves to the first enabled focusable element inside
//      the dialog on mount (the least-destructive control for confirms);
//   2. Tab / Shift+Tab are trapped — they cycle within the dialog and
//      never escape it while it is mounted;
//   3. on unmount, focus returns to the control that was active at mount
//      (the trigger a real browser focused on click/keyboard activation).
// Inline fields such as DiscoveredProfilePicker are deliberately NOT wired:
// they are not dialogs, and trapping Tab inside an inline field would make
// it impossible to keyboard-navigate past it. Inside the wizard they are
// covered by the wizard's dialog-level manager.
export function useDialogFocusManager(containerSelector) {
  useEffect(() => {
    if (!containerSelector) return undefined
    const container = () => document.querySelector(containerSelector)
    const focusables = (root) => Array.from(
      root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.closest('[hidden]'))
    const restoreTo = document.activeElement
    // Initial focus: first enabled focusable inside the container.
    const initial = focusables(container())
    initial[0]?.focus()
    // Tab containment: cycle focus inside the container on real keydowns.
    const onKeydown = (event) => {
      if (event.key !== 'Tab') return
      const root = container()
      if (!root) return
      const items = focusables(root)
      if (items.length === 0) return
      const current = document.activeElement
      const index = items.indexOf(current)
      event.preventDefault()
      let next
      if (event.shiftKey) {
        next = items[(index <= 0 ? items.length : index) - 1]
      } else {
        next = items[(index + 1) % items.length]
        if (index === -1) next = items[0]
      }
      next?.focus()
    }
    window.addEventListener('keydown', onKeydown, true)
    return () => {
      window.removeEventListener('keydown', onKeydown, true)
      // Return focus to the trigger that opened the dialog.
      if (restoreTo && typeof restoreTo.focus === 'function') {
        restoreTo.focus()
      }
    }
  }, [containerSelector])
}

export function ConfirmDialog({ confirmKey, title, description, confirmLabel, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])
  useDialogFocusManager('[data-destructive-confirm]')
  return jsx('section', {
    className: 'dockyard-modal-layer',
    'data-destructive-confirm': confirmKey,
    onClick: (event) => { if (event.target === event.currentTarget && !busy) onCancel() },
    children: jsxs('div', {
      className: 'dockyard-modal',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': `dockyard-confirm-${confirmKey}`,
      children: [
        jsx('h2', { id: `dockyard-confirm-${confirmKey}`, children: title }),
        jsx('p', { children: description }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { action: 'cancel-destructive-action', disabled: busy, onClick: onCancel, children: 'Cancel' }),
          jsx(Button, { action: 'confirm-destructive-action', variant: 'danger', disabled: busy, onClick: onConfirm, children: busy ? 'Applying...' : confirmLabel }),
        ]}),
      ],
    }),
  })
}

export function ToastRegion({ toasts, onDismiss }) {
  return jsx('div', {
    className: 'dockyard-toast-region',
    'data-toast-region': true,
    'aria-label': 'Status messages',
    children: toasts.map((toast) => jsxs('div', {
      className: `dockyard-toast ${toast.tone}`,
      role: toast.tone === 'danger' ? 'alert' : 'status',
      children: [
        jsx('span', { className: 'dockyard-toast-icon', 'aria-hidden': true, children: jsx(Icon, { name: toast.tone === 'danger' ? 'alert' : 'check' }) }),
        jsx('span', { children: toast.message }),
        jsx('button', { type: 'button', 'aria-label': 'Dismiss message', onClick: () => onDismiss(toast.id), children: '×' }),
      ],
    }, toast.id)),
  })
}

export function OnboardingWizard({ onClose, onComplete }) {
  useDialogFocusManager('[data-onboarding-wizard]')
  const [step, setStep] = useState(1)
  const [projectId, setProjectId] = useState('')
  const [repoPath, setRepoPath] = useState('')
  const [mission, setMission] = useState('')
  const [leadProfile, setLeadProfile] = useState('')
  const [memberProfiles, setMemberProfiles] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  // P7.1: host-driven discovery replaces hard-coded lead choices and lists
  // existing projects (connect-existing before create-new). R4: discovery
  // failure fails CLOSED — no manual profile entry, no invented choices.
  const [discovered, setDiscovered] = useState(null)
  const [discoverFailed, setDiscoverFailed] = useState(false)
  const [discoveryRefresh, setDiscoveryRefresh] = useState(0)
  const [preflightState, setPreflightState] = useState(null)
  const [preflightBusy, setPreflightBusy] = useState(false)
  // R4: preflight validity bound to the exact current field set.
  const [preflightFields, setPreflightFields] = useState(null)
  const [preflightContract, setPreflightContract] = useState(null)
  const currentFields = () => JSON.stringify({
    project_id: projectId.trim(),
    repo_path: repoPath.trim(),
    mission: mission.trim(),
    lead_profile: leadProfile.trim(),
    member_profiles: memberProfiles,
  })
  const preflightCurrent = preflightFields === currentFields()

  useEffect(() => {
    let current = true
    setDiscoverFailed(false)
    api('/onboard/discover').then((result) => {
      if (!current) return
      setDiscovered(result)
      setDiscoverFailed(false)
      // Refresh must not overwrite values already entered in the wizard.
    }).catch(() => {
      if (current) {
        setDiscovered(null)
        // Keep wizard input intact while explaining how to recover externally.
        setDiscoverFailed(true)
      }
    })
    return () => { current = false }
  }, [discoveryRefresh])

  useEffect(() => {
    const handleKey = (event) => { if (event.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const valid = step === 1
    ? /^[a-z0-9][a-z0-9-]*$/.test(projectId.trim()) && repoPath.trim().startsWith('/')
    : step === 2
      ? mission.trim().length >= 12
      : step === 3
        ? leadProfile.trim().length > 0
        : true
  // P7.2: preflight runs the host's own validator BEFORE commitment.
  // P7.4: the response's preview + suggestions are carried into the review.
  const runPreflight = async () => {
    setPreflightBusy(true)
    setPreflightState(null)
    try {
      const result = await api('/onboard/preflight', {
        method: 'POST',
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles,
        },
      })
      setPreflightState({
        ok: true,
        mode: result.mode,
        text: result.mode === 'connect_existing'
          ? 'Host already owns this project — it will be connected, not recreated.'
          : 'Host validated the details; nothing exists yet — create-new.',
        projects: (result?.existing?.projects ?? []).map((p) => p.slug),
        // P7.4: exact proposed targets + automation state.
        preview: result.preview ?? null,
        // P7.3: inert suggestions for explicit owner review.
        suggestions: result.suggestions ?? [],
      })
      // R4: bind validity to the exact current field set.
      setPreflightFields(currentFields())
      setPreflightContract(result.preflight ?? null)
    } catch (failure) {
      setPreflightState({ ok: false, message: String(failure?.message ?? failure) })
      setPreflightFields(null)
      setPreflightContract(null)
    }
    setPreflightBusy(false)
  }
  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api('/onboard', {
        method: 'POST',
        body: {
          project_id: projectId.trim(),
          repo_path: repoPath.trim(),
          mission: mission.trim(),
          lead_profile: leadProfile.trim(),
          member_profiles: memberProfiles,
          idempotency_key: `dockyard-onboard:${projectId.trim()}`,
          expected_membership_revision: preflightContract?.membership_revision,
          preflight_token: preflightContract?.token,
        },
      })
      onComplete(result)
    } catch (failure) {
      setError(String(failure?.message ?? failure))
      setSubmitting(false)
    }
  }
  const steps = [
    ['Project', 'Name and repository'],
    ['Mission', 'Define the outcome'],
    ['Lead', 'Assign ownership'],
    ['Review', 'Confirm the contract'],
  ]
  return jsx('div', { className: 'dockyard-modal-backdrop', children:
    jsxs('section', {
      className: 'dockyard-onboarding',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'dockyard-onboarding-title',
      'data-onboarding-wizard': true,
      children: [
        jsxs('header', { className: 'dockyard-onboarding-head', children: [
          jsxs('div', { children: [
            jsx('span', { className: 'dockyard-card-label', children: 'NEW PROJECT' }),
            jsx('h2', { id: 'dockyard-onboarding-title', children: 'Bring a project into Dockyard' }),
            jsx('p', { children: 'Four bounded steps. Nothing runs until the final review.' }),
          ]}),
          jsx('button', { type: 'button', className: 'dockyard-modal-close', 'aria-label': 'Close onboarding', disabled: submitting, onClick: onClose, children: '×' }),
        ]}),
        jsx('div', { className: 'dockyard-wizard-progress', role: 'progressbar', 'aria-label': 'Onboarding progress', 'aria-valuemin': 1, 'aria-valuemax': 4, 'aria-valuenow': step, children:
          steps.map(([label, detail], index) => jsxs('div', { key: `step-${index}`, className: index + 1 <= step ? 'complete' : '', children: [
            jsx('span', { children: number(index + 1) }),
            jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: detail })] }),
          ]})),
        }),
        jsxs('div', { className: 'dockyard-wizard-body', children: [
          jsxs('div', { className: step === 1 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 1, 'data-wizard-step': '1', children: [
            jsx('h3', { children: 'Project identity' }),
            jsx('p', { children: 'Use the stable project identifier and its absolute repository path.' }),
            discovered
              ? jsxs('div', { children: [
                  jsxs('p', { className: 'dockyard-meta', 'data-discovered-projects': true, children: [
                    'Host projects: ',
                    (discovered.projects ?? []).length > 0
                      ? (discovered.projects ?? []).map((project) => project.slug).join(', ')
                      : 'none yet — create-new below',
                  ]}),
                  jsx('p', { className: 'dockyard-meta', 'data-profile-guidance': true, children: 'Profiles are managed in the Hermes host profile manager.' }),
                  jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Refresh host discovery' }),
                ]})
              : discoverFailed
                ? jsxs('div', { children: [
                    jsx('p', { className: 'dockyard-inline-error', role: 'alert', 'data-discovery-failed': true, children: 'Host discovery failed. Retry — onboarding stays closed until the host answers. No fallback choices are offered. If profiles are missing, manage them in the Hermes host profile manager, then retry.' }),
                    jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Retry host discovery' }),
                  ]})
                : jsxs('div', { children: [
                    jsx('p', { className: 'dockyard-meta', children: 'Loading host discovery…' }),
                    jsx(Button, { action: 'refresh-onboarding-discovery', small: true, onClick: () => setDiscoveryRefresh((value) => value + 1), children: 'Refresh host discovery' }),
                  ]}),
            // R4: connect-existing as a real selectable path — fills/binds
            // the discovered host project into the form.
            discovered && (discovered.projects ?? []).length > 0
              ? jsxs('div', { className: 'dockyard-connect-existing', 'data-connect-existing': true, children: [
                  jsx('p', { className: 'dockyard-card-label', children: 'CONNECT AN EXISTING HOST PROJECT' }),
                  ...(discovered.projects ?? []).map((project) => jsx(Button, {
                    action: `connect-existing-${project.slug}`,
                    small: true,
                    onClick: () => {
                      setProjectId(project.slug)
                      setRepoPath(project.repo_path)
                    },
                    children: `Connect ${project.slug}`,
                  }, project.slug)),
                ]})
              : null,
            jsx('label', { htmlFor: 'dockyard-project-id', children: 'Project ID' }),
            jsx('input', { id: 'dockyard-project-id', 'data-field': 'project-id', value: projectId, placeholder: 'payments-relaunch', autoComplete: 'off', onInput: (event) => setProjectId(event.target.value) }),
            jsx('small', { children: 'Lowercase letters, numbers and hyphens.' }),
            jsx('label', { htmlFor: 'dockyard-repo-path', children: 'Repository path' }),
            jsx('input', { id: 'dockyard-repo-path', 'data-field': 'repo-path', value: repoPath, placeholder: '/path/to/repos/project', autoComplete: 'off', onInput: (event) => setRepoPath(event.target.value) }),
          ]}),
          jsxs('div', { className: step === 2 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 2, 'data-wizard-step': '2', children: [
            jsx('h3', { children: 'Mission and outcome' }),
            jsx('p', { children: 'State what the project must improve. This anchors later initiative decisions.' }),
            jsx('label', { htmlFor: 'dockyard-mission', children: 'Mission' }),
            jsx('textarea', { id: 'dockyard-mission', 'data-field': 'mission', value: mission, rows: 5, placeholder: 'Reduce payment failures without weakening release gates.', onInput: (event) => setMission(event.target.value) }),
            jsx('small', { children: `${number(mission.trim().length)} characters / minimum 12` }),
          ]}),
          jsxs('div', { className: step === 3 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 3, 'data-wizard-step': '3', children: [
            jsx('h3', { children: 'Lead ownership' }),
            jsx('p', { children: 'Assign the specialist profile accountable for the project.' }),
            jsx('label', { htmlFor: 'dockyard-lead-profile', children: 'Lead profile' }),
            jsx('select', { id: 'dockyard-lead-profile', 'data-field': 'lead-profile', value: leadProfile, onChange: (event) => setLeadProfile(event.target.value), children: [
              jsx('option', { value: '', children: 'Select a lead profile' }),
              ...(discovered?.profiles ?? []).map((profile) => jsx('option', {
                value: profile.name,
                disabled: profile.available === false || profile.selectable === false || ((profile.host_capabilities ?? []).length > 0 && !(profile.host_capabilities ?? []).includes('lead')),
                children: `${profile.name}${profile.available === false || profile.selectable === false ? ' — unavailable' : ''}`,
              }, profile.name)),
            ]}),
            jsx('small', { children: discovered
              ? `Valid host profiles: ${(discovered.profiles ?? []).map((p) => `${p.name}${p.available === false || p.selectable === false ? ' (unavailable)' : ''}`).join(', ') || 'n/a'}.`
              : discoverFailed
                ? 'Host profile list unavailable — onboarding is closed until discovery succeeds.'
                : 'Loading host profiles…' }),
            jsx('label', { htmlFor: 'dockyard-member-search', children: 'Team members' }),
            jsx('input', { id: 'dockyard-member-search', 'data-field': 'member-search', value: memberSearch, placeholder: 'Search profiles', autoComplete: 'off', onInput: (event) => setMemberSearch(event.target.value) }),
            jsx('div', { 'data-member-picker': true, children: (discovered?.profiles ?? [])
              .filter((profile) => profile.name.toLowerCase().includes(memberSearch.trim().toLowerCase()))
              .filter((profile) => profile.name !== leadProfile)
              .map((profile) => {
                const selectable = profile.available !== false && profile.selectable !== false && ((profile.host_capabilities ?? []).length === 0 || (profile.host_capabilities ?? []).includes('member'))
                return jsxs('label', { 'data-member-option': profile.name, children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: memberProfiles.includes(profile.name),
                    disabled: !selectable,
                    onChange: (event) => setMemberProfiles((current) => event.target.checked ? [...current, profile.name] : current.filter((name) => name !== profile.name)),
                  }),
                  `${profile.name}${selectable ? '' : ' — unavailable'}`,
                ] }, profile.name)
              }) }),
            jsx('small', { children: 'This records ownership; it does not expand permissions.' }),
          ]}),
          jsxs('div', { className: step === 4 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: step !== 4, 'data-wizard-step': '4', children: [
            jsx('h3', { children: 'Review onboarding contract' }),
            jsxs('dl', { className: 'dockyard-onboarding-review', children: [
              jsx('dt', { children: 'Project' }), jsx('dd', { children: projectId }),
              jsx('dt', { children: 'Repository' }), jsx('dd', { children: repoPath }),
              jsx('dt', { children: 'Mission' }), jsx('dd', { children: mission }),
              jsx('dt', { children: 'Lead' }), jsx('dd', { children: leadProfile }),
              jsx('dt', { children: 'Members' }), jsx('dd', { children: memberProfiles.join(', ') || 'None' }),
            ]}),
            jsx(Button, {
              action: 'run-onboarding-preflight',
              disabled: preflightBusy || !valid,
              onClick: runPreflight,
              children: preflightBusy ? 'Validating…' : 'Validate with host before commit',
            }),
            preflightState
              ? jsx('p', {
                  className: preflightState.ok ? 'dockyard-review-note' : 'dockyard-inline-error',
                  role: preflightState.ok ? undefined : 'alert',
                  'data-preflight-result': preflightState.ok ? preflightState.mode : 'error',
                  children: preflightState.ok ? `${preflightState.text} Host projects: ${preflightState.projects.join(', ') || 'none'}.` : preflightState.message,
                })
              : null,
            // P7.4: the exact proposed governance/board/automation preview.
            preflightState?.ok && preflightState.preview
              ? jsx('pre', {
                  className: 'dockyard-onboarding-preview',
                  'data-onboarding-preview': true,
                  children: JSON.stringify(preflightState.preview, null, 2),
                })
              : null,
            // P7.3: reviewable inert suggestions; unsupported ones stay
            // visible as unsupported; acceptance is explicit per item.
            preflightState?.ok && (preflightState.suggestions ?? []).length > 0
              ? jsxs('div', { className: 'dockyard-onboarding-suggestions', 'data-onboarding-suggestions': true, children: [
                  jsx('p', { className: 'dockyard-card-label', children: 'SUGGESTED MANUAL OBJECTIVES — nothing runs automatically' }),
                  ...preflightState.suggestions.map((suggestion) => jsxs('p', { className: 'dockyard-review-note', 'data-suggestion': suggestion.name, children: [
                    `${suggestion.name} — ${suggestion.description}`,
                    suggestion.supported === false ? ' (unsupported — shown for review only)' : '',
                  ] }, suggestion.name)),
                ]})
              : null,
            jsx('p', { className: 'dockyard-review-note', children: 'Onboarding creates the project record and its initial oversight surfaces. It does not approve future initiatives.' }),
          ]}),
        ]}),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('footer', { className: 'dockyard-wizard-actions', children: [
          jsx(Button, { action: step === 1 ? 'cancel-onboarding' : 'wizard-back', disabled: submitting, onClick: step === 1 ? onClose : () => setStep((value) => value - 1), children: step === 1 ? 'Cancel' : 'Back' }),
          step < 4
            ? jsx(Button, { action: 'wizard-next', variant: 'primary', disabled: !valid, onClick: () => setStep((value) => value + 1), children: 'Continue' })
            // R4: final confirmation opens only with a successful preflight of
            // the exact current field set; any later edit re-locks it.
            : jsx(Button, {
                action: 'submit-onboarding',
                variant: 'primary',
                disabled: submitting || !preflightCurrent,
                data: { 'data-preflight-gate': preflightCurrent ? 'open' : 'locked' },
                onClick: submit,
                children: submitting ? 'Onboarding…' : (preflightCurrent ? 'Onboard project' : 'Validate before onboarding'),
              }),
        ]}),
      ],
    }),
  })
}

export function FleetSearch({ onOpen }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [active, setActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setActive(true)
      }
      if (event.key === 'Escape' && active) { setActive(false); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [active])
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) { setResults([]); setBusy(false); setError(''); return undefined }
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setBusy(true)
      try {
        const response = await api(`/search?q=${encodeURIComponent(term)}&limit=20`)
        if (!cancelled) { setResults(response.results ?? []); setError('') }
      } catch (failure) {
        if (!cancelled) { setResults([]); setError(String(failure?.message ?? failure)) }
      } finally { if (!cancelled) setBusy(false) }
    }, 180)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])
  return jsxs('div', { className: 'dockyard-fleet-search', children: [
    jsx('input', { ref: inputRef, type: 'search', 'aria-label': 'Search projects, work and initiatives',
      'aria-expanded': active && query.trim().length >= 2, 'aria-controls': 'dockyard-search-results',
      placeholder: 'Search projects, work, initiatives…', value: query,
      onFocus: () => setActive(true), onChange: (event) => { setQuery(event.target.value); setActive(true) },
      onKeyDown: (event) => { if (event.key === 'Enter' && results[0]) { onOpen?.(results[0].deep_link); setActive(false) } },
    }),
    jsx('span', { className: 'dockyard-search-shortcut', 'aria-hidden': true, children: '⌘K' }),
    active && query.trim().length >= 2 ? jsxs('div', { id: 'dockyard-search-results', className: 'dockyard-search-results', role: 'region', 'aria-label': 'Search results', children: [
      busy ? jsx('p', { children: 'Searching…' }) : error ? jsx('p', { role: 'alert', children: error })
        : results.length === 0 ? jsx('p', { children: 'No matches found' }) :
          results.map((item) => jsxs('button', { type: 'button', onClick: () => { onOpen?.(item.deep_link); setActive(false) }, children: [
            jsx('strong', { children: item.title }),
            jsx('small', { children: `${readableLabel(item.kind)} · ${item.project}` }),
          ]}, `${item.kind}:${item.ref}`)),
    ]}) : null,
  ]})
}

export function ProjectPicker({ projects, selectedProject, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const trigger = useRef(null)
  const results = projects.filter((p) => `${p.name || ''} ${p.id}`.toLowerCase().includes(query.toLowerCase()))
  const selected = projects.find((p) => p.id === selectedProject)
  const close = () => { setOpen(false); trigger.current?.focus() }
  const choose = (p) => { if (p) onChange(p.id); close() }
  return jsxs('div', { className: 'dockyard-project-switcher', style: { position: 'relative' }, onBlur: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }, children: [
    jsx('button', { ref: trigger, type: 'button', className: 'dockyard-button', 'aria-label': 'Project context', 'aria-haspopup': 'listbox', 'aria-expanded': open, onClick: () => { setOpen(!open); setQuery(''); setActive(0) }, children: selected?.name || selectedProject || 'Choose project' }),
    open ? jsxs('div', { className: 'dockyard-feature-card', style: { position: 'absolute', zIndex: 100, top: '100%', right: 0, width: 'min(320px, 85vw)' }, children: [
      jsx('input', { autoFocus: true, role: 'combobox', 'aria-label': 'Find project', 'aria-expanded': true, 'aria-controls': 'dockyard-project-options', 'aria-autocomplete': 'list', 'aria-activedescendant': results[active] ? `dockyard-project-option-${active}` : undefined, value: query,
        onChange: (e) => { setQuery(e.target.value); setActive(0) }, onKeyDown: (e) => {
          if (e.key === 'Escape') { e.preventDefault(); close() }
          if (e.key === 'Enter') { e.preventDefault(); choose(results[active]) }
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) { e.preventDefault(); setActive(e.key === 'Home' ? 0 : e.key === 'End' ? Math.max(0, results.length - 1) : Math.max(0, Math.min(results.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)))) }
        } }),
      jsx('div', { role: 'listbox', id: 'dockyard-project-options', 'aria-label': 'Projects', style: { maxHeight: 260, overflowY: 'auto' }, children: results.map((p, i) => jsx('button', { type: 'button', role: 'option', id: `dockyard-project-option-${i}`, 'aria-selected': p.id === selectedProject, className: `dockyard-button ${i === active ? 'primary' : ''}`, style: { display: 'block', width: '100%' }, onMouseDown: (e) => e.preventDefault(), onClick: () => choose(p), children: p.name || p.id }, p.id)) }),
      results.length ? null : jsx('p', { role: 'status', children: 'No matching projects' }),
    ]}) : null,
  ]})
}

export function ConsoleBar({ tab, counts, onTab, onNewProject, projects = [], selectedProject, onProjectChange, onOpen }) {
  // P3: the project context is persistent in the shell, not repeated in each panel.
  const tabs = [
    ['dashboard', 'Dashboard', null],
    ['project', 'Projects', null],
    ['roadmap', 'Roadmap', null],
    ['backlog', 'Backlog', null],
    ['workflows', 'Workflows', null],
    ['inbox', 'Approval Inbox', counts.approvals],
    ['notifications', 'Notifications', counts.notifications],
    ['onboard', 'Onboard', null],
    // Sahil 04/10: app-wide settings only; each project's settings live in the project.
    ['settings', 'App settings', null],
  ]
  const moveTab = (event, index) => {
    let next = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    const nextKey = tabs[next][0]
    onTab(nextKey)
    document.getElementById(`dockyard-tab-${nextKey}`)?.focus()
  }
  return jsxs('header', { className: 'dockyard-consolebar', children: [
    jsxs('div', { className: 'dockyard-brand', children: [
      jsx('span', { className: 'dockyard-brand-mark', children: jsx(Icon, { name: 'dock' }) }),
      jsxs('span', { className: 'dockyard-brand-copy', children: [
        jsx('strong', { children: 'Dockyard' }),
        jsx('span', { children: 'Fleet oversight' }),
      ]}),
    ]}),
    jsx(FleetSearch, { onOpen }),
    projects.length > 0 ? jsx(ProjectPicker, { projects, selectedProject, onChange: onProjectChange }) : null,
    jsx('nav', { className: 'dockyard-tabs', role: 'tablist', 'aria-label': 'Dockyard sections', children:
      tabs.map(([key, label, count], index) => jsxs('button', {
        id: `dockyard-tab-${key}`,
        type: 'button',
        role: 'tab',
        className: 'dockyard-tab',
        'data-tab': key,
        'aria-selected': tab === key,
        'aria-controls': 'dockyard-panel',
        tabIndex: tab === key ? 0 : -1,
        onClick: () => onTab(key),
        onKeyDown: (event) => moveTab(event, index),
        children: [
          label,
          Number(count) > 0 ? jsx('span', { className: 'dockyard-tab-count', children: number(count) }) : null,
        ],
      }, key)),
    }),
    jsx(Button, {
      action: 'open-onboarding',
      variant: 'primary dockyard-console-action',
      small: true,
      ariaLabel: 'New project',
      onClick: onNewProject,
      children: jsxs(Fragment, { children: [jsx(Icon, { name: 'project' }), jsx('span', { className: 'dockyard-console-action-label', children: 'New project' })] }),
    }),
  ]})
}

export function PageHead({ title, description, onRefresh, status }) {
  return jsxs('div', { className: 'dockyard-page-head', children: [
    jsxs('div', { children: [
      jsx('h1', { children: title }),
      jsx('p', { children: description }),
    ]}),
    status || onRefresh ? jsxs('div', { className: 'dockyard-page-actions', children: [
      status ? jsxs('span', { className: 'dockyard-owed-pill', children: [
        jsx('span', { className: 'dockyard-status-mark', 'aria-hidden': true }),
        status,
      ]}) : null,
      onRefresh ? jsx(Button, {
        action: 'refresh',
        onClick: onRefresh,
        children: jsxs(Fragment, { children: [jsx(Icon, { name: 'refresh' }), 'Refresh'] }),
      }) : null,
    ]}) : null,
  ]})
}

export function EmptyState({ title, description, icon = 'project' }) {
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'empty', children: [
    jsx('span', { className: 'dockyard-empty-icon', children: jsx(Icon, { name: icon }) }),
    jsx('h2', { children: title }),
    jsx('p', { children: description }),
  ]})
}

export function ErrorState({ error, onRetry }) {
  return jsxs('section', { className: 'dockyard-state-panel', 'data-state': 'error', children: [
    jsx('span', { className: 'dockyard-error-icon', children: jsx(Icon, { name: 'alert' }) }),
    jsx('h2', { children: 'Dockyard could not load this view' }),
    jsx('p', { children: String(error) }),
    jsx(Button, { action: 'retry', variant: 'primary', onClick: onRetry, children: 'Try again' }),
  ]})
}

export function LoadingState() {
  return jsxs('div', { className: 'dockyard-skeleton-page', 'data-state': 'loading', 'aria-label': 'Loading Dockyard data', children: [
    jsx('div', { className: 'dockyard-skeleton title' }),
    jsx('div', { className: 'dockyard-skeleton copy' }),
    jsxs('div', { className: 'dockyard-overview-grid', children: [
      jsx('div', { className: 'dockyard-skeleton summary' }),
      jsx('div', { className: 'dockyard-skeleton summary' }),
    ]}),
    jsx('div', { className: 'dockyard-section', children:
      [0, 1, 2].map((index) => jsx('div', { className: 'dockyard-skeleton row' }, index)),
    }),
  ]})
}
