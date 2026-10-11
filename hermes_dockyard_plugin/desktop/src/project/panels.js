// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { StatusTag } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { effectiveMaxOpenInitiatives } from './settings-model.js'
export function ProjectSettingsPanel({ project, settings, onRefresh, onDirty, onArchived, restoreFrom }) {
  const buildForm = () => ({
    mission: settings?.mission ?? '',
    leadProfile: settings?.owner?.lead_profile ?? '',
    members: (settings?.owner?.member_profiles ?? []).join(', '),
    autonomyLevel: String(settings?.autonomy_level ?? 0),
    humanGateRisk: settings?.policies?.autonomy?.human_gate_risk ?? 'medium',
    autoStartLowRisk: Boolean(settings?.policies?.autonomy?.auto_start_low_risk),
    requireTests: settings?.policies?.verification?.require_tests !== false,
    maxOpenInitiatives: String(effectiveMaxOpenInitiatives(settings?.policies)),
    requireRollback: settings?.policies?.release?.require_rollback !== false,
    soakHours: String(settings?.policies?.release?.soak_hours ?? 24),
    severityThreshold: settings?.policies?.notification?.severity_threshold ?? 'medium',
    digest: settings?.policies?.notification?.digest ?? 'daily',
  })
  const [form, setForm] = useState(buildForm)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [pendingLifecycle, setPendingLifecycle] = useState(null)
  const [lifecycleBusy, setLifecycleBusy] = useState(false)
  const [lifecycleState, setLifecycleState] = useState(settings)
  useEffect(() => {
    onDirty?.(editing && JSON.stringify(form) !== JSON.stringify(buildForm()))
  }, [form, editing, onDirty])
  useEffect(() => {
    if (!pendingLifecycle) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !lifecycleBusy) setPendingLifecycle(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [pendingLifecycle, lifecycleBusy])
  const enabled = lifecycleState?.enabled !== false
  const phase = lifecycleState?.phase || project.phase || 'unknown'
  const lifecycleCopy = {
    enable: { endpoint: 're-enable', label: 'Enable', past: 'enabled' },
    disable: { endpoint: 'disable', label: 'Disable', past: 'disabled' },
    pause: { endpoint: 'pause', label: 'Pause', past: 'paused' },
    resume: { endpoint: 'resume', label: 'Resume', past: 'resumed' },
    freeze: { endpoint: 'freeze', label: 'Freeze', past: 'frozen' },
    archive: { endpoint: 'archive', label: 'Archive', past: 'archived' },
    restore: { endpoint: 'restore', label: 'Restore', past: 'restored' },
  }
  const archived = Boolean(lifecycleState?.archived_at)
  const lifecycleActions = archived
    ? ['restore']
    : !enabled
    ? ['enable']
    : phase === 'active'
      ? ['pause', 'freeze', 'archive', 'disable']
      : phase === 'paused'
        ? ['resume', 'freeze', 'archive', 'disable']
        : phase === 'frozen'
          ? ['resume', 'archive', 'disable']
          : ['disable']
  // The effect above reports unsaved changes after each edit. Calling onDirty
  // here, inside the state updater, updated the parent while this panel was
  // rendering (React: "Cannot update a component while rendering a different
  // component", 09/10).
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = async () => {
    if (!enabled || !editing) return
    setSaving(true)
    setMessage(null)
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/settings`, {
        method: 'PATCH',
        body: {
          mission: form.mission.trim(),
          lead_profile: form.leadProfile.trim(),
          member_profiles: form.members.split(',').map((value) => value.trim()).filter(Boolean),
          autonomy_level: Number(form.autonomyLevel),
          autonomy_policy: {
            human_gate_risk: form.humanGateRisk,
            auto_start_low_risk: form.autoStartLowRisk,
          },
          verification_policy: {
            require_tests: form.requireTests,
            max_open_initiatives: Number(form.maxOpenInitiatives),
          },
          release_policy: {
            require_rollback: form.requireRollback,
            soak_hours: Number(form.soakHours),
          },
          notification_policy: {
            severity_threshold: form.severityThreshold,
            digest: form.digest,
          },
        },
      })
      setMessage({ tone: 'success', text: 'Project configuration saved.' })
      setEditing(false)
      onDirty?.(false)
      onRefresh?.()
    } catch (failure) {
      setMessage({ tone: 'danger', text: String(failure?.message ?? failure) })
    }
    setSaving(false)
  }
  const confirmLifecycle = async () => {
    const config = lifecycleCopy[pendingLifecycle]
    if (!config) return
    setLifecycleBusy(true)
    setMessage(null)
    try {
      // Archive hides the project everywhere (11/10/2026): the app leaves it
      // and says where to restore it, so no second toast here.
      const archiving = pendingLifecycle === 'archive' && onArchived
      await api(`/projects/${encodeURIComponent(project.id)}/${config.endpoint}`, { method: 'POST', body: {}, quiet: Boolean(archiving) })
      if (archiving) {
        setPendingLifecycle(null)
        setLifecycleBusy(false)
        onArchived(project.id)
        return
      }
      const readback = await api(`/projects/${encodeURIComponent(project.id)}/settings`)
      setLifecycleState(readback)
      if (readback.enabled === false) setEditing(false)
      setPendingLifecycle(null)
      emitToast('success', `Project ${config.past}.`)
      onRefresh?.()
    } catch (failure) {
      setMessage({ tone: 'danger', text: String(failure?.message ?? failure) })
    }
    setLifecycleBusy(false)
  }
  return jsxs('section', { className: 'dockyard-feature-card dockyard-settings-card', 'data-project-settings-form': true, children: [
    jsxs('header', { className: 'dockyard-section-head', children: [
      jsxs('div', { children: [jsx('h2', { children: 'Project configuration' }), jsx('p', { children: 'Ownership, autonomy, verification, release and notification boundaries.' })] }),
      jsxs('div', { className: 'dockyard-project-state-summary', children: [
        jsx('span', { 'data-project-enabled-state': true, children: jsx(StatusTag, { tone: enabled ? 'success' : 'neutral', label: enabled ? 'Enabled' : 'Disabled' }) }),
        jsx('span', { 'data-project-phase-state': true, children: jsx(StatusTag, { tone: phase === 'active' ? 'success' : 'warning', label: phase.charAt(0).toUpperCase() + phase.slice(1) }) }),
      ]}),
    ]}),
    jsxs('section', { className: 'dockyard-lifecycle-panel', 'data-project-lifecycle': true, children: [
      jsxs('header', { children: [
        jsxs('div', { children: [jsx('h3', { children: 'Project lifecycle' }), jsx('p', { children: enabled ? 'Only actions valid for the current phase are available.' : 'Configuration remains readable while the project is disabled.' })] }),
        jsx('div', { className: 'dockyard-lifecycle-actions', children: lifecycleActions.map((action) => jsx('button', {
          type: 'button',
          className: `dockyard-button small${['disable', 'freeze', 'archive'].includes(action) ? ' danger' : ['enable', 'restore'].includes(action) ? ' primary' : ''}`,
          'data-lifecycle-action': action,
          disabled: lifecycleBusy,
          onClick: () => setPendingLifecycle(action),
          children: lifecycleCopy[action].label,
        }, action)) }),
      ]}),
    ]}),
    jsxs('fieldset', { className: 'dockyard-settings-grid dockyard-settings-fieldset', disabled: !enabled || !editing, children: [
      jsxs('div', { className: 'dockyard-settings-category', children: [
        jsx('div', { className: 'dockyard-settings-category-label', children: 'General' }),
        jsxs('label', { className: 'dockyard-field dockyard-field-wide', children: [
          jsx('span', { children: 'Mission' }),
          jsx('textarea', { 'data-setting-field': 'mission', rows: 3, value: form.mission, onInput: (event) => update('mission', event.target.value), onChange: (event) => update('mission', event.target.value) }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Lead profile' }),
          jsx('input', { 'data-setting-field': 'lead-profile', value: form.leadProfile, onChange: (event) => update('leadProfile', event.target.value) }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Member profiles' }),
          jsx('input', { 'data-setting-field': 'members', value: form.members, placeholder: 'bot-a, bot-b', onChange: (event) => update('members', event.target.value) }),
        ]}),
      ]}),
      jsxs('div', { className: 'dockyard-settings-category', children: [
        jsx('div', { className: 'dockyard-settings-category-label', children: 'Autonomy & verification' }),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Autonomy level' }),
          jsx('select', { 'data-setting-field': 'autonomy', value: form.autonomyLevel, onChange: (event) => update('autonomyLevel', event.target.value), children:
            [0, 1, 2, 3, 4, 5].map((level) => jsx('option', { value: String(level), children: `${level} / ${level === 0 ? 'manual' : level === 5 ? 'bounded maximum' : 'bounded'}` }, String(level))),
          }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Human gate from risk' }),
          jsx('select', { value: form.humanGateRisk, onChange: (event) => update('humanGateRisk', event.target.value), children:
            ['low', 'medium', 'high', 'critical'].map((risk) => jsx('option', { value: risk, children: risk }, risk)),
          }),
        ]}),
        jsxs('label', { className: 'dockyard-check-field', children: [
          jsx('input', { type: 'checkbox', checked: form.autoStartLowRisk, onChange: (event) => update('autoStartLowRisk', event.target.checked) }),
          jsxs('span', { children: [jsx('strong', { children: 'Auto-start low-risk work' }), jsx('small', { children: 'Only inside the declared autonomy boundary.' })] }),
        ]}),
        jsxs('label', { className: 'dockyard-check-field', children: [
          jsx('input', { type: 'checkbox', 'data-setting-field': 'require-tests', checked: form.requireTests, onChange: (event) => update('requireTests', event.target.checked) }),
          jsxs('span', { children: [jsx('strong', { children: 'Require test evidence' }), jsx('small', { children: 'Block verification without a test result.' })] }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Maximum open initiatives' }),
          jsx('input', { type: 'number', min: 1, max: 25, value: form.maxOpenInitiatives, onChange: (event) => update('maxOpenInitiatives', event.target.value) }),
        ]}),
      ]}),
      jsxs('div', { className: 'dockyard-settings-category', children: [
        jsx('div', { className: 'dockyard-settings-category-label', children: 'Release & notifications' }),
        jsxs('label', { className: 'dockyard-check-field', children: [
          jsx('input', { type: 'checkbox', checked: form.requireRollback, onChange: (event) => update('requireRollback', event.target.checked) }),
          jsxs('span', { children: [jsx('strong', { children: 'Require rollback plan' }), jsx('small', { children: 'Every release must declare its recovery path.' })] }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Soak period in hours' }),
          jsx('input', { type: 'number', min: 0, max: 720, 'data-setting-field': 'soak-hours', value: form.soakHours, onChange: (event) => update('soakHours', event.target.value) }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Alert threshold' }),
          jsx('select', { value: form.severityThreshold, onChange: (event) => update('severityThreshold', event.target.value), children:
            ['info', 'low', 'medium', 'high', 'critical'].map((severity) => jsx('option', { value: severity, children: severity }, severity)),
          }),
        ]}),
        jsxs('label', { className: 'dockyard-field', children: [
          jsx('span', { children: 'Notification cadence' }),
          jsx('select', { 'data-setting-field': 'digest', value: form.digest, onChange: (event) => update('digest', event.target.value), children:
            ['immediate', 'daily', 'weekly', 'off'].map((cadence) => jsx('option', { value: cadence, children: cadence }, cadence)),
          }),
        ]}),
      ]}),
    ]}),
    message ? jsx('p', { className: message.tone === 'danger' ? 'dockyard-inline-error' : 'dockyard-inline-success', role: 'status', children: message.text }) : null,
    enabled ? jsx('div', { className: 'dockyard-form-actions', children: editing
      ? jsxs(Fragment, { children: [
          jsx(Button, { action: 'cancel-project-settings', disabled: saving, onClick: () => { setForm(buildForm()); setEditing(false); onDirty?.(false); setMessage(null) }, children: 'Cancel' }),
          jsx(Button, { action: 'save-project-settings', variant: 'primary', disabled: saving || !form.mission.trim(), onClick: save, children: saving ? 'Saving...' : 'Save configuration' }),
        ]})
      : jsx(Button, { action: 'edit-project-settings', variant: 'primary', onClick: () => { setForm(buildForm()); setEditing(true); onDirty?.(false); setMessage(null) }, children: 'Edit configuration' }),
    }) : jsx('p', { className: 'dockyard-meta', children: 'Enable this project before editing its configuration.' }),
    jsxs('section', { className: 'dockyard-modal-layer', 'data-lifecycle-confirm': true, hidden: !pendingLifecycle, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-lifecycle-title', children: [
        jsx('h2', { id: 'dockyard-lifecycle-title', children: `${lifecycleCopy[pendingLifecycle]?.label || 'Change'} project?` }),
        jsx('p', { 'data-lifecycle-confirm-text': pendingLifecycle || '', children: pendingLifecycle === 'archive'
          ? `${project.id} will be hidden everywhere: dashboard, projects, roadmap, inbox, search and alerts. Stewardship stops for it while it is archived. Nothing is deleted: its Hermes project, board, tasks and repository stay exactly as they are. Restore it any time from ${restoreFrom || 'the archived projects list'}, and it comes back exactly as it is now (${enabled ? 'switched on' : 'switched off'}, ${phase}).`
          : `This changes ${project.id} from its current ${enabled ? 'enabled' : 'disabled'} and ${phase} state.` }),
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { disabled: lifecycleBusy, onClick: () => setPendingLifecycle(null), children: 'Cancel' }),
          jsx(Button, { action: 'confirm-lifecycle-action', variant: ['disable', 'freeze', 'archive'].includes(pendingLifecycle) ? 'danger' : 'primary', disabled: lifecycleBusy, onClick: confirmLifecycle, children: lifecycleBusy ? 'Applying...' : `Confirm ${lifecycleCopy[pendingLifecycle]?.label || 'change'}` }),
        ]}),
      ]}),
    ]}),
  ]})
}
