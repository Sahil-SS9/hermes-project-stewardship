// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// PROTOTYPE (design round f, 05/10): the one Plan screen inside a project.
// This module loads a project's plan and holds every write the screen makes.
// Each write is an existing backend route, already used by the Objectives,
// Initiatives, milestone and Roadmap screens: no new backend behaviour.
import { api } from '../../runtime/context.js'
import { GOAL_LABEL } from '../../lib/plan-vocab.js'
import { GOAL_TONE } from '../../lib/plan-vocab.js'
import { OUTCOME_LABEL } from '../../lib/plan-vocab.js'
import { OUTCOME_TONE } from '../../lib/plan-vocab.js'
import { STATUS_LABEL } from '../../lib/plan-vocab.js'
import { STATUS_TONE } from '../../lib/plan-vocab.js'
import { effectiveMaxOpenInitiatives } from '../settings-model.js'

const enc = encodeURIComponent

export const needsReview = (initiative) => ['pending_approval', 'changes_requested'].includes(initiative?.status)
export const isOverdue = (milestone, today = new Date().toISOString().slice(0, 10)) =>
  Boolean(milestone && !milestone.closed && !milestone.archived && milestone.due && milestone.due < today)

// An item reference is { kind, id }; ids compare as strings (refs, numbers).
export const sameItem = (a, b) => Boolean(a && b && a.kind === b.kind && String(a.id) === String(b.id))
export const listOf = (plan, kind) => ({ initiative: plan.initiatives, milestone: plan.milestones, objective: plan.objectives, goal: plan.goals })[kind] ?? []
export const findItem = (plan, ref) => (plan && ref ? listOf(plan, ref.kind).find((row) => sameItem(row, ref)) ?? null : null)

// The one status a row and its details both show: { tone, label }.
export function statusOf(item) {
  if (item.archived) return { tone: 'neutral', label: 'Archived' }
  if (item.kind === 'initiative') return { tone: STATUS_TONE[item.status] ?? 'neutral', label: STATUS_LABEL[item.status] ?? item.status }
  if (item.kind === 'milestone') return item.closed ? { tone: 'success', label: 'Closed' } : isOverdue(item) ? { tone: 'danger', label: 'Overdue' } : { tone: 'info', label: 'Open' }
  if (item.kind === 'objective') return { tone: OUTCOME_TONE[item.outcome] ?? 'neutral', label: OUTCOME_LABEL[item.outcome] ?? item.outcome }
  return { tone: GOAL_TONE[item.state] ?? 'neutral', label: GOAL_LABEL[item.state] ?? item.state }
}

// One read of everything the screen shows. The Roadmap read model supplies
// the links (initiative -> milestones / objectives) and the derived states
// (delivery, goal); the project lists supply the editable fields and the
// archived rows the Roadmap leaves out.
export async function loadPlan(projectId) {
  const p = enc(projectId)
  const [roadmap, initiatives, objectives, goals, milestones, settings, missions, work] = await Promise.all([
    api(`/roadmap?project_id=${p}`),
    api(`/projects/${p}/initiatives`),
    api(`/projects/${p}/objectives?include_archived=true`),
    api(`/projects/${p}/goals?include_archived=true`),
    api(`/projects/${p}/milestones?include_archived=true`),
    api(`/projects/${p}/settings`),
    api(`/projects/${p}/missions/archive`).catch(() => ({ missions: [] })),
    api(`/projects/${p}/work-items`).catch(() => ({ work_items: [] })),
  ])
  return buildPlan({ roadmap, initiatives, objectives, goals, milestones, settings, missions, work })
}

function buildPlan({ roadmap, initiatives, objectives, goals, milestones, settings, missions, work }) {
  const project = roadmap?.projects?.[0] ?? null
  const read = new Map((project?.initiatives ?? []).map((row) => [row.ref, row]))
  const goalRead = new Map((project?.goals ?? []).map((row) => [row.id, row]))
  // The other side of each initiative link: milestone/objective id -> initiatives.
  const linksTo = (field) => {
    const map = new Map()
    for (const row of project?.initiatives ?? []) {
      for (const link of row[field] ?? []) map.set(link.id, [...(map.get(link.id) ?? []), { ref: row.ref, title: row.title, relationship: link.relationship }])
    }
    return map
  }
  const milestoneLinks = linksTo('milestones')
  const objectiveLinks = linksTo('objectives')
  const goalRows = (goals?.goals ?? []).map((goal) => ({
    kind: 'goal', id: goal.goal_id, title: goal.title, description: goal.description ?? '',
    position: goal.position ?? 0, archived: Boolean(goal.archived_at),
    objectiveIds: (goal.objective_ids ?? []).map(Number),
    state: goalRead.get(goal.goal_id)?.state ?? 'unknown',
    objectivesPassed: goalRead.get(goal.goal_id)?.objectives_passed ?? null,
  })).sort((a, b) => a.position - b.position)
  return {
    label: project?.label ?? settings?.project_id ?? '',
    canWrite: roadmap?.can_write !== false,
    mission: settings?.mission ?? '',
    missionHistory: missions?.missions ?? [],
    // Owner decision Q3: the limit the backend enforces, never a guess.
    maxOpenInitiatives: effectiveMaxOpenInitiatives(settings?.policies),
    goals: goalRows,
    objectives: (objectives?.objectives ?? []).map((row) => ({
      kind: 'objective', id: row.id, title: row.name, description: row.description ?? '',
      target: row.target ?? '>=1', severity: row.severity ?? 'medium', archived: row.enabled === false,
      outcome: row.evidence?.state ?? 'unknown', passRate: row.evidence?.pass_rate ?? null,
      samples: row.evidence?.sample_count ?? 0, window: row.window ?? '30d',
      initiatives: objectiveLinks.get(row.id) ?? [],
      goals: goalRows.filter((goal) => goal.objectiveIds.includes(row.id)).map((goal) => ({ id: goal.id, title: goal.title })),
    })),
    milestones: (milestones?.milestones ?? []).map((row) => ({
      kind: 'milestone', id: row.id, title: row.name, name: row.name, due: row.due ?? null,
      closed: Boolean(row.closed), archived: Boolean(row.archived_at),
      done: row.done ?? 0, total: row.total ?? 0, itemRefs: row.item_refs ?? [],
      initiatives: milestoneLinks.get(row.id) ?? [],
    })),
    initiatives: (initiatives?.initiatives ?? []).map((row) => {
      const link = read.get(row.ref)
      return {
        kind: 'initiative', id: row.ref, ref: row.ref, title: row.title, status: row.status,
        risk: row.risk ?? 'low', rationale: row.rationale ?? '', expectedOutcome: row.expected_outcome ?? '',
        priority: row.priority ?? 0,
        // The backend record, handed unchanged to the approval panel: the
        // Inbox gives it the same record, so a review shows the same facts.
        record: row,
        milestones: (link?.milestones ?? []).map((m) => ({ id: m.id, title: m.name, relationship: m.relationship })),
        objectives: (link?.objectives ?? []).map((o) => ({ id: o.id, title: o.name, relationship: o.relationship })),
        delivery: link?.delivery ?? null,
      }
    }),
    workItems: (work?.work_items ?? []).map((item) => ({ ref: item.ref, title: item.title })),
  }
}

// Every write the Plan screen makes. One place, so all three layouts share
// the same behaviour and the same error messages.
export function planActions(projectId) {
  const p = enc(projectId)
  // quiet: the Plan screen reports each change itself (one toast with the
  // item's name on success, the error inline where the person acted).
  const call = (path, method = 'POST', body = {}) => api(path, { method, body, quiet: true })
  const milestone = (name, rest = '') => `/projects/${p}/milestones/${enc(name)}${rest}`
  return {
    proposeInitiative: (form) => call(`/projects/${p}/initiatives`, 'POST', {
      title: form.title.trim(), rationale: form.rationale.trim(),
      expected_outcome: form.expectedOutcome.trim(), risk: form.risk,
    }),
    resubmitInitiative: (ref, form) => call(`/initiatives/${enc(ref)}/resubmit`, 'POST', {
      rationale: form.rationale.trim(), expected_outcome: form.expectedOutcome.trim(), risk: form.risk,
    }),
    createMilestone: (form) => call(`/projects/${p}/milestones`, 'POST', { name: form.title.trim(), due: form.due || null }),
    renameMilestone: (name, next) => call(milestone(name, '/rename'), 'POST', { new_name: next.trim() }),
    updateMilestone: (name, patch) => call(milestone(name), 'PATCH', patch),
    archiveMilestone: (name) => call(milestone(name, '/archive')),
    restoreMilestone: (name) => call(milestone(name, '/restore')),
    milestoneDetail: (name) => api(milestone(name), { quiet: true }),
    attachWork: (name, ref) => call(milestone(name, '/attach'), 'POST', { ref }),
    detachWork: (name, ref) => call(milestone(name, '/detach'), 'POST', { ref }),
    createObjective: (form) => call(`/projects/${p}/objectives`, 'POST', {
      name: form.title.trim(), description: form.description.trim(), target: form.target.trim(),
      severity: form.severity, evaluator_type: 'manual', window: '30d',
    }),
    updateObjective: (id, form) => call(`/projects/${p}/objectives/${id}`, 'PATCH', {
      name: form.title.trim(), description: form.description.trim(), target: form.target.trim(), severity: form.severity,
    }),
    archiveObjective: (id) => call(`/projects/${p}/objectives/${id}/archive`),
    removeObjective: (id) => call(`/projects/${p}/objectives/${id}`, 'DELETE'),
    evaluateObjective: (id) => call(`/projects/${p}/objectives/${id}/evaluate`),
    createGoal: (form) => call(`/projects/${p}/goals`, 'POST', {
      title: form.title.trim(), description: form.description.trim(), objective_ids: form.objectiveIds,
    }),
    updateGoal: (id, patch) => call(`/projects/${p}/goals/${enc(id)}`, 'PATCH', patch),
    orderGoals: (ids) => call(`/projects/${p}/goals/order`, 'PUT', { goal_ids: ids }),
    archiveGoal: (id) => call(`/projects/${p}/goals/${enc(id)}/archive`),
    restoreGoal: (id) => call(`/projects/${p}/goals/${enc(id)}/restore`),
    linkMilestone: (ref, milestoneId, relationship) =>
      call(`/projects/${p}/initiatives/${enc(ref)}/milestones`, 'POST', { milestone_id: Number(milestoneId), relationship }),
    unlinkMilestone: (ref, milestoneId) => call(`/projects/${p}/initiatives/${enc(ref)}/milestones/${Number(milestoneId)}`, 'DELETE'),
    linkObjective: (ref, objectiveId, relationship) =>
      call(`/projects/${p}/objectives/${Number(objectiveId)}/initiatives`, 'POST', { initiative_ref: ref, relationship }),
    unlinkObjective: (ref, objectiveId) => call(`/projects/${p}/objectives/${Number(objectiveId)}/initiatives/${enc(ref)}`, 'DELETE'),
    saveMission: (text) => call(`/projects/${p}/settings`, 'PATCH', { mission: text.trim() }),
    archiveMission: () => call(`/projects/${p}/mission/archive`),
    removeMission: () => call(`/projects/${p}/mission`, 'DELETE'),
    freeze: () => call(`/projects/${p}/freeze`),
  }
}
