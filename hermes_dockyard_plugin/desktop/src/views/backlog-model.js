// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { readableLabel } from '../data/loaders.js'

export const DOCKYARD_TYPE_NAMES = ['epic', 'feature', 'task', 'subtask', 'bug', 'spike', 'initiative']
export const DOCKYARD_EDITABLE_TYPES = ['task', 'subtask', 'bug', 'spike']
export const DOCKYARD_ROOT_TYPES = ['epic', 'task', 'bug', 'spike']
export const DOCKYARD_CREATE_CHILD_TYPES = Object.freeze({
  epic: ['task', 'subtask', 'bug', 'spike'],
  feature: ['task', 'subtask'],
  initiative: ['subtask'],
  task: ['subtask'],
  bug: ['subtask'],
  spike: [],
  subtask: [],
})
export const DOCKYARD_ALLOWED_CHILDREN = Object.freeze({
  epic: ['feature', 'task', 'subtask', 'bug', 'spike', 'initiative'],
  feature: ['task', 'subtask'],
  initiative: ['subtask'],
  task: ['subtask'],
  bug: ['subtask'],
  spike: [],
  subtask: [],
})
export const dockyardTypeLabel = (type) => ({ epic: 'Epic', initiative: 'Initiative', feature: 'Feature', task: 'Task', subtask: 'Sub-task', bug: 'Bug', spike: 'Spike' }[type] || readableLabel(type || 'task'))
export const dockyardChildTypes = (parentType) => DOCKYARD_CREATE_CHILD_TYPES[parentType] ?? []
export const dockyardParentAccepts = (parentType, childType) => (DOCKYARD_ALLOWED_CHILDREN[parentType] ?? []).includes(childType)

