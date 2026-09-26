// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { RISK_PRIORITY } from '../data/loaders.js'
import { number } from '../lib/ui.js'
import { validationSummary } from '../data/loaders.js'
import { useState } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { jsx } from '../runtime/react.js'
import { EmptyState } from '../lib/ui.js'
import { jsxs } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
import { Fragment } from '../runtime/react.js'
import { ConfirmDialog } from '../lib/ui.js'
export function InitiativeView({ view, onRefresh }) {
  const initiative = [...(view.initiatives ?? [])].sort((left, right) => (RISK_PRIORITY[left.risk] ?? 1) - (RISK_PRIORITY[right.risk] ?? 1))[0]
  const project = view.project
  const stages = [
    ['verify', 'Verify state', 'Confirm the project state and evidence source.'],
    ['detect', 'Detect gap', initiative?.rationale || 'Research the highest-value project gap.'],
    ['propose', 'Create initiative', initiative?.expected_outcome || 'Declare the expected outcome.'],
    ['prioritise', 'Prioritise', `Priority ${number(initiative?.priority ?? 0)} with a recorded rationale.`],
    ['approval', 'Human approval', 'Owner reviews the risk, evidence and validation contract.'],
    ['execute', 'Build and verify', validationSummary(initiative?.validation_contract)],
    ['release', 'Release', 'Release remains bounded by project policy.'],
    ['observe', 'Observe outcome', 'Measure whether the project improved.'],
  ]
  const currentIndex = initiative?.status === 'pending_approval' ? 4
    : ['approved', 'executing'].includes(initiative?.status) ? 5
      : ['completed', 'measured'].includes(initiative?.status) ? 7 : 2
  const [selectedStage, setSelectedStage] = useState(currentIndex)
  const [freezeState, setFreezeState] = useState(null)
  const [freezeConfirm, setFreezeConfirm] = useState(false)
  const freeze = async () => {
    if (!project) return
    setFreezeState('freezing')
    try {
      await api(`/projects/${encodeURIComponent(project.id)}/freeze`, { method: 'POST', body: {} })
      setFreezeState('frozen')
      onRefresh()
    } catch (failure) {
      setFreezeState(String(failure?.message ?? failure))
    }
  }
  if (!project || !initiative) return jsx(EmptyState, { title: 'No initiative available', description: 'A project initiative will appear here after it is proposed.', icon: 'project' })
  return jsxs('div', { 'data-initiative-loop': initiative.ref, children: [
    jsx(PageHead, {
      title: initiative.title,
      description: `${project.id} / ${initiative.ref} / one canonical improvement loop`,
      status: initiative.status || 'unknown',
      onRefresh,
    }),
    jsxs('div', { className: 'dockyard-loop-layout', children: [
      jsxs('section', { className: 'dockyard-feature-card dockyard-loop-card', children: [
        jsxs('div', { className: 'dockyard-loop-head', children: [
          jsxs('div', { children: [jsx('h2', { children: 'Initiative loop' }), jsx('p', { children: 'Select a stage to inspect its current evidence and state.' })] }),
          jsx(Button, { action: 'freeze-project', variant: 'danger', disabled: freezeState === 'freezing' || freezeState === 'frozen', onClick: () => setFreezeConfirm(true), children: freezeState === 'freezing' ? 'Freezing...' : freezeState === 'frozen' ? 'Project frozen' : 'Freeze project' }),
        ]}),
        jsx('div', { className: 'dockyard-loop-visual-wrap', children:
          jsx('svg', { viewBox: '0 0 1010 140', role: 'img', 'aria-label': 'Initiative stages from verification to observed outcome', 'data-loop-visual': true, children:
            stages.map(([key, label], index) => {
              const x = 20 + index * 123
              const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'queued'
              return jsxs(Fragment, { children: [
                index < stages.length - 1 ? jsx('path', { className: `dockyard-loop-edge ${state}`, d: `M${x + 105} 55H${x + 123}` }) : null,
                jsx('rect', { className: `dockyard-loop-node ${state}`, x, y: 30, width: 105, height: 52, rx: 10 }),
                jsx('text', { x: x + 52.5, y: 60, textAnchor: 'middle', children: label }),
              ]}, key)
            }),
          }),
        }),
        jsx('div', { className: 'dockyard-stage-list', children:
          stages.map(([key, label], index) => jsx('button', {
            type: 'button',
            className: selectedStage === index ? 'active' : '',
            'data-initiative-stage': key,
            onClick: () => setSelectedStage(index),
            children: jsxs(Fragment, { children: [
              jsx('span', { children: number(index + 1) }),
              jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: index < currentIndex ? 'Done' : index === currentIndex ? 'Current gate' : 'Queued' })] }),
            ]}),
          }, key)),
        }),
      ]}),
      jsxs('aside', { className: 'dockyard-feature-card dockyard-stage-detail', children: [
        jsx('span', { className: 'dockyard-card-label', children: 'SELECTED STAGE' }),
        jsx('h2', { children: stages[selectedStage][1] }),
        jsx('p', { children: stages[selectedStage][2] }),
        jsxs('div', { className: 'dockyard-evidence-details', children: [
          jsx('strong', { children: 'Initiative evidence' }),
          jsx('p', { children: initiative.rationale || 'No rationale supplied.' }),
          jsx('p', { children: `Validation: ${validationSummary(initiative.validation_contract)}` }),
        ]}),
        freezeState && !['freezing', 'frozen'].includes(freezeState) ? jsx('p', { className: 'dockyard-inline-error', children: freezeState }) : null,
      ]}),
    ]}),
    freezeConfirm ? jsx(ConfirmDialog, {
      confirmKey: 'freeze-project',
      title: 'Freeze this project?',
      description: 'Freezing stops new execution until the project is explicitly resumed.',
      confirmLabel: 'Freeze project',
      busy: freezeState === 'freezing',
      onCancel: () => setFreezeConfirm(false),
      onConfirm: async () => { setFreezeConfirm(false); await freeze() },
    }) : null,
  ]})
}
