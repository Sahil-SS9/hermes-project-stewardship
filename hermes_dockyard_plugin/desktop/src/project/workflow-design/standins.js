// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows builder (07/10/2026): stand-ins for what the engine cannot store
// or do yet (WORKFLOWS-SPEC-R1.md E2-E5; "Ask me first" is saved with the
// workflow since 08/10/2026). Everything here lives in this
// module's memory, lasts until the page reloads and never reaches the backend.
// Screens tag every control that writes here "Preview".

const stepSettings = new Map()
const workflowSettings = new Map()

export const EMPTY_STEP = Object.freeze({ check: Object.freeze({ by: 'none', doneWhen: '' }), limits: Object.freeze({ turns: '', minutes: '', skills: '' }) })
export const EMPTY_WORKFLOW = Object.freeze({ trigger: Object.freeze({ kind: 'manual', schedule: 'weekdays', time: '09:00', event: 'task-done' }), improve: Object.freeze({ on: false, afterRuns: 5, reviewer: '' }) })
const stepKey = (project, workflow, nodeId) => `${project}\u0000${workflow}\u0000${nodeId}`
export function readStepSettings(project, workflow, nodeId) { return stepSettings.get(stepKey(project, workflow, nodeId)) ?? EMPTY_STEP }
export function writeStepSettings(project, workflow, nodeId, value) { stepSettings.set(stepKey(project, workflow, nodeId), value) }
export function readWorkflowSettings(project, workflow) { return workflowSettings.get(`${project}\u0000${workflow}`) ?? EMPTY_WORKFLOW }
export function writeWorkflowSettings(project, workflow, value) { workflowSettings.set(`${project}\u0000${workflow}`, value) }

export const CHECK_WORDS = Object.freeze({ none: 'No check', judge: 'AI judge', person: 'You sign off', step: 'A check step' })

// ---- steps --------------------------------------------------------------
const task = (id, title, dependsOn, extra = {}) => ({ id, title, depends_on: dependsOn, human_gate: false, kind: 'task', ...extra })
const signOff = (id, title, dependsOn) => ({ id, title, depends_on: dependsOn, human_gate: true, kind: 'gate' })
export const slug = (text) => String(text ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'workflow'
export function uniqueName(base, taken) {
  const names = new Set(taken)
  if (!names.has(base)) return base
  let index = 2
  while (names.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}
export const loopRounds = (node) => Number(node?.loop?.max_iterations ?? 0)
export const withRounds = (node, rounds) => (rounds > 0 ? { ...node, loop: { max_iterations: Math.min(10, Math.max(1, rounds)), until: { status: 'done' } } } : { ...node, loop: null })

// ---- practice AI (canned; no model is called) ----------------------------
const RECIPES = [
  {
    match: /\b(bug|fix|failing|broken|crash|error)\b/i,
    name: 'fix-a-bug',
    nodes: () => [
      task('reproduce', 'Reproduce the bug', [], { body: 'Write a test that fails because of the bug.' }),
      task('fix', 'Fix the code', ['reproduce'], { body: 'Change the code until the new test passes and the other tests still pass.', loop: { max_iterations: 5, until: { status: 'done' } } }),
      signOff('check-fix', 'Check the fix', ['fix']),
      task('merge', 'Merge the fix', ['check-fix']),
    ],
    checks: { fix: { by: 'judge', doneWhen: 'The new test passes and every other test still passes.' } },
    explain: [
      'A bot first writes a test that fails because of the bug, so we know the bug is real.',
      'Then it fixes the code. If a round gets stuck it tries again, up to 5 rounds, then asks you.',
      'An AI judge checks each round against "the new test passes and every other test still passes".',
      'You check the fix before anything is merged, then it is merged.',
    ],
    loopStep: 'fix',
    workSteps: ['reproduce', 'fix'],
  },
  {
    match: /\b(release|ship|deploy|launch|publish)\b/i,
    name: 'release-check',
    nodes: () => [
      task('tests', 'Run the full test suite', []),
      task('notes', 'Write the release notes', ['tests'], { body: 'List what changed since the last release, in plain words.' }),
      signOff('sign-off', 'Sign off the release', ['notes']),
      task('publish', 'Publish the release', ['sign-off']),
    ],
    checks: {},
    explain: [
      'A bot runs the full test suite first; nothing else starts if it fails.',
      'Then it writes the release notes in plain words.',
      'You sign off the release, then it is published.',
    ],
    loopStep: null,
    workSteps: ['tests', 'notes'],
  },
  {
    match: /\b(research|report|summar|digest|investigate|look into)/i,
    name: 'research-summary',
    nodes: () => [
      task('sources', 'Find the sources', [], { body: 'Find recent, first-hand sources on the topic.' }),
      task('write', 'Write the summary', ['sources'], { loop: { max_iterations: 3, until: { status: 'done' } } }),
      signOff('review', 'Review the summary', ['write']),
    ],
    checks: { write: { by: 'judge', doneWhen: 'Every claim names its source.' } },
    explain: [
      'A bot finds recent, first-hand sources.',
      'Then it writes the summary. An AI judge sends it back until every claim names its source, up to 3 rounds, then asks you.',
      'You review the summary at the end.',
    ],
    loopStep: 'write',
    workSteps: ['sources', 'write'],
  },
]
const GENERIC = {
  name: 'new-workflow',
  nodes: () => [
    task('plan', 'Plan the work', []),
    task('do', 'Do the work', ['plan'], { loop: { max_iterations: 3, until: { status: 'done' } } }),
    signOff('check', 'Check the result', ['do']),
  ],
  checks: {},
  explain: [
    "I couldn't tell exactly what this is for, so I drafted a simple plan, do, check workflow.",
    'The work step tries again if it gets stuck, up to 3 rounds, then asks you.',
    'Tell me more and I will adjust it.',
  ],
  loopStep: 'do',
  workSteps: ['plan', 'do'],
}

// One draft: the plan in words, the steps, preview settings and questions.
export function practiceDraft(description, members = []) {
  const text = String(description ?? '').trim()
  if (!text) return { error: 'Say what the workflow should do first.' }
  const recipe = RECIPES.find((r) => r.match.test(text)) ?? GENERIC
  const nodes = recipe.nodes()
  const questions = []
  if (recipe.loopStep) questions.push({ id: 'rounds', text: 'How many rounds before it asks you?', options: [3, 5, 10].map((n) => ({ label: `${n} rounds`, value: n })), current: loopRounds(nodes.find((n) => n.id === recipe.loopStep)) })
  if (members.length) questions.push({ id: 'who', text: 'Who should do the work?', options: [{ label: 'Whoever the project picks', value: '' }, ...members.map((m) => ({ label: m, value: m }))], current: '' })
  if (nodes.some((n) => n.human_gate)) questions.push({ id: 'signoff', text: 'Do you want to sign off before it finishes?', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }], current: true })
  return { name: recipe.name, explain: recipe.explain, nodes, checks: recipe.checks, questions, recipe, did: [`Added ${nodes.length} steps`, ...(recipe.loopStep ? [`Made "${nodes.find((n) => n.id === recipe.loopStep).title}" repeat`] : []), ...(Object.keys(recipe.checks).length ? ['Set an AI judge as the check (preview)'] : [])] }
}

// Answer one of the draft's questions; returns the changed steps.
export function answerQuestion(draft, questionId, value) {
  const recipe = draft.recipe ?? GENERIC
  let nodes = draft.nodes
  if (questionId === 'rounds' && recipe.loopStep) nodes = nodes.map((n) => (n.id === recipe.loopStep ? withRounds(n, Number(value)) : n))
  if (questionId === 'who') nodes = nodes.map((n) => (recipe.workSteps.includes(n.id) ? { ...n, phase_team: value || null } : n))
  if (questionId === 'signoff') nodes = setSignOff(nodes, Boolean(value), recipe)
  return { ...draft, nodes, questions: draft.questions.map((q) => (q.id === questionId ? { ...q, current: value } : q)) }
}

function setSignOff(nodes, wanted, recipe) {
  const gates = nodes.filter((n) => n.human_gate)
  if (!wanted) {
    // Steps after a removed sign-off follow what the sign-off followed.
    const gateIds = new Set(gates.map((g) => g.id))
    return nodes.filter((n) => !gateIds.has(n.id)).map((n) => ({ ...n, depends_on: n.depends_on.flatMap((d) => (gateIds.has(d) ? (gates.find((g) => g.id === d)?.depends_on ?? []) : [d])) }))
  }
  if (gates.length) return nodes
  const fresh = (recipe ?? GENERIC).nodes()
  const gate = fresh.find((n) => n.human_gate)
  if (!gate) return nodes
  const after = gate.depends_on.filter((d) => nodes.some((n) => n.id === d))
  return [...nodes.map((n) => (n.depends_on.some((d) => after.includes(d)) && !n.human_gate && !after.includes(n.id) ? { ...n, depends_on: [gate.id] } : n)), { ...gate, depends_on: after }]
}

// Follow-up requests in the AI side panel. Understands a few phrasings and
// says so plainly when it does not.
export function practiceRevise(nodes, message, members = []) {
  const text = String(message ?? '').trim()
  const lower = text.toLowerCase()
  const repeating = nodes.find((n) => n.loop) ?? nodes.find((n) => !n.human_gate && n.depends_on.length) ?? nodes.find((n) => !n.human_gate)
  const rounds = lower.match(/(\d+)\s*(times|tries|rounds|attempts|goes)/)
  if (rounds && repeating) {
    const n = Math.min(10, Math.max(1, Number(rounds[1])))
    return { nodes: nodes.map((s) => (s.id === repeating.id ? withRounds(s, n) : s)), reply: [`"${repeating.title}" now repeats up to ${n} rounds, then asks you.`], did: [`Set "${repeating.title}" to at most ${n} rounds`] }
  }
  if (/(stop|don't|do not|no longer|never)\b.*repeat/.test(lower) && nodes.some((n) => n.loop)) {
    return { nodes: nodes.map((s) => (s.loop ? { ...s, loop: null } : s)), reply: ['Nothing repeats now: each step runs once.'], did: ['Removed the repeat'] }
  }
  if (/(remove|drop|without|no)\b.*(sign[- ]?off|approval|check)/.test(lower) && nodes.some((n) => n.human_gate)) {
    return { nodes: setSignOff(nodes, false), reply: ['Removed your sign-off; the steps after it follow the step before it.'], did: ['Removed the sign-off'] }
  }
  if (/(sign[- ]?off|approv|ask me|check with me)/.test(lower)) {
    const last = nodes.filter((n) => !nodes.some((m) => m.depends_on.includes(n.id))).pop()
    if (!last) return { nodes, reply: ['There are no steps to sign off yet.'], did: [] }
    const id = uniqueName('sign-off', nodes.map((n) => n.id))
    return { nodes: [...nodes, signOff(id, 'Your sign-off', [last.id])], reply: [`Added your sign-off after "${last.title}".`], did: ['Added a sign-off at the end'] }
  }
  const who = members.find((m) => lower.includes(m.toLowerCase()))
  if (who && /(give|assign|who|by|let|use)\b/.test(lower)) {
    const work = nodes.filter((n) => !n.human_gate)
    return { nodes: nodes.map((s) => (s.human_gate ? s : { ...s, phase_team: who })), reply: [`Gave ${work.length === 1 ? 'the step' : `the ${work.length} work steps`} to ${who}.`], did: [`Gave the work to ${who}`] }
  }
  const add = text.match(/^(?:then |and )?(?:add|also)\s+(?:a\s+)?(?:step\s+)?(?:to\s+|that\s+|which\s+)?(.{3,60})$/i)
  if (add) {
    const last = nodes.filter((n) => !nodes.some((m) => m.depends_on.includes(n.id))).pop()
    const title = add[1].replace(/[.!]+$/, '').replace(/^\w/, (c) => c.toUpperCase())
    const id = uniqueName(slug(title).slice(0, 24) || 'step', nodes.map((n) => n.id))
    return { nodes: [...nodes, task(id, title, last ? [last.id] : [])], reply: [`Added "${title}"${last ? ` after "${last.title}"` : ''}.`], did: [`Added "${title}"`] }
  }
  return { nodes, reply: ["This practice AI only knows a few requests. Try: 'repeat up to 3 times', 'add a sign-off at the end', 'remove the sign-off', 'give the work to reviewer', 'add a step to tell the team'."], did: [], unknown: true }
}

// ---- talking first (Sahil, 07/10/2026: suggest, then Apply) ---------------
// A question is answered from the steps on the canvas; it never changes them.
const QUESTION = /^(what|why|how|which|who|when|where|does|do|is|are|explain|describe|tell me about|walk me through|summari[sz]e)\b/i
export const isQuestion = (text) => /\?\s*$/.test(String(text ?? '').trim()) || QUESTION.test(String(text ?? '').trim())
export function practiceExplain(nodes, title) {
  if (!nodes.length) return { reply: ['It has no steps yet. Say what it should do and I will suggest some.'], steps: null, after: [] }
  const gates = nodes.filter((n) => n.human_gate).length
  return {
    reply: [`"${title}" has ${nodes.length} step${nodes.length === 1 ? '' : 's'}, in the order they run:`],
    steps: nodes,
    after: [
      gates ? `You sign off ${gates === 1 ? 'once' : `${gates} times`}.` : 'Nothing waits for your sign-off.',
      'Ask for a change and I will suggest it here first. Nothing changes until you press Apply.',
    ],
  }
}

// Whether two sets of steps are the same plan. Positions on the canvas do not
// count: dragging a step does not make a suggestion out of date.
const planKey = (n) => JSON.stringify([
  n.id ?? n.node_id, n.title ?? '', [...(n.depends_on ?? [])], Boolean(n.human_gate), n.kind ?? (n.human_gate ? 'gate' : 'task'),
  n.body ?? null, n.phase_team ?? null,
  n.loop ? [n.loop.max_iterations, n.loop.until?.status ?? 'done'] : null,
  n.when ? [n.when.node, n.when.status] : null,
  Boolean(n.ask_first),
])
export const sameSteps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((n, i) => planKey(n) === planKey(b[i]))
// Applying a suggestion keeps where each step sits on the canvas now.
export function withCurrentPositions(next, current) {
  const at = new Map(current.map((n) => [n.id ?? n.node_id, n.canvas_position]))
  return next.map((n) => (at.has(n.id) && at.get(n.id) ? { ...n, canvas_position: at.get(n.id) } : n))
}

// ---- import ---------------------------------------------------------------
export const IMPORT_MAX_BYTES = 262144
const isDockyardNode = (n) => n && typeof n === 'object' && typeof n.id === 'string' && typeof n.title === 'string'
export function readImport(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return { kind: 'invalid', reason: 'Paste a workflow, or choose a file, first.' }
  if (new TextEncoder().encode(raw).length > IMPORT_MAX_BYTES) return { kind: 'invalid', reason: 'This file is too big: Project Stewardship imports up to 256 KB.' }
  let data = null
  try { data = JSON.parse(raw) } catch { data = null }
  if (data && typeof data === 'object') {
    const nodes = Array.isArray(data.definition?.nodes) ? data.definition.nodes : Array.isArray(data.nodes) ? data.nodes : null
    if (nodes && nodes.length && nodes.every(isDockyardNode)) {
      const warnings = data.schema && data.schema !== 'stewardship.workflow/v2' ? [`The file says it is "${data.schema}"; Project Stewardship reads it as its own format.`] : []
      return { kind: 'dockyard', name: typeof data.name === 'string' ? data.name : '', nodes, warnings }
    }
    if (nodes && nodes.some((n) => n && typeof n.type === 'string' && 'parameters' in n)) return fromN8n(data)
  }
  if (/^\s*jobs\s*:/m.test(raw)) return fromActions(raw)
  return { kind: 'invalid', reason: "This isn't a workflow Project Stewardship can read. Check the text, or describe what you want to the AI instead." }
}
function fromN8n(data) {
  const names = data.nodes.map((n) => String(n.name ?? n.type))
  const taken = []
  const ids = new Map(names.map((name, i) => { const id = uniqueName(slug(name).slice(0, 24) || `step-${i + 1}`, taken); taken.push(id); return [name, id] }))
  const deps = new Map(names.map((name) => [name, []]))
  for (const [from, outputs] of Object.entries(data.connections ?? {})) {
    for (const branch of outputs?.main ?? []) for (const link of branch ?? []) if (deps.has(link?.node) && ids.has(from)) deps.get(link.node).push(ids.get(from))
  }
  const nodes = names.map((name) => task(ids.get(name), name, deps.get(name)))
  return { kind: 'other', format: 'an n8n workflow', name: slug(data.name ?? 'imported-workflow'), nodes, notCarried: ['each node’s settings', 'credentials', 'what starts it (n8n triggers become an ordinary first step)'] }
}
function fromActions(raw) {
  const titles = [...raw.matchAll(/^\s*-\s*name\s*:\s*['"]?(.+?)['"]?\s*$/gm)].map((m) => m[1]).slice(0, 30)
  if (!titles.length) return { kind: 'invalid', reason: 'This looks like a GitHub Actions file, but it has no named steps to carry over.' }
  const nodes = titles.map((title, i) => task(`step-${i + 1}`, title, i ? [`step-${i}`] : []))
  const name = raw.match(/^name\s*:\s*['"]?(.+?)['"]?\s*$/m)?.[1]
  return { kind: 'other', format: 'a GitHub Actions file', name: slug(name ?? 'imported-workflow'), nodes, notCarried: ['the commands each step runs', 'secrets', 'when it runs (the on: section)'] }
}
