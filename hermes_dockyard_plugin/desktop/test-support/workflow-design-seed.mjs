// Workflows design round (07/10/2026): practice workflows for the review link
// and the design-round browser test. One helper for both, so the test checks
// exactly what Sahil clicks. Everything goes through the plugin's own routes
// (the same calls the screens make); nothing is written to the database
// directly. Safe to run twice: anything that already exists is left alone.
//
// Templates are global library workflows (the engine's define_template saves a
// template as a global library entry). The two project workflows live in
// atlas-mobile, which no other workflow test uses.

export const DESIGN_PROJECT = 'atlas-mobile'

export const DESIGN_TEMPLATES = [
  {
    name: 'fix-until-green',
    nodes: [
      { id: 'reproduce', title: 'Reproduce the bug', depends_on: [], body: 'Write a test that fails because of the bug.' },
      { id: 'fix', title: 'Fix the code', depends_on: ['reproduce'], body: 'Change the code until the new test passes and the other tests still pass.', loop: { max_iterations: 5, until: { status: 'done' } } },
      { id: 'review', title: 'Review the change', depends_on: ['fix'], human_gate: true, kind: 'gate' },
      { id: 'merge', title: 'Merge', depends_on: ['review'] },
    ],
  },
  {
    name: 'release-check',
    nodes: [
      { id: 'tests', title: 'Run the full test suite', depends_on: [] },
      { id: 'notes', title: 'Write the release notes', depends_on: ['tests'] },
      { id: 'signoff', title: 'Sign off the release', depends_on: ['notes'], human_gate: true, kind: 'gate' },
    ],
  },
  {
    name: 'weekly-tidy',
    nodes: [
      { id: 'stale', title: 'Close stale tasks', depends_on: [] },
      { id: 'summary', title: 'Summarise the week', depends_on: ['stale'] },
    ],
  },
]

export const DESIGN_WORKFLOWS = [
  {
    name: 'bug-fix',
    nodes: [
      { id: 'reproduce', title: 'Reproduce the bug', depends_on: [], phase_team: 'worker', body: 'Write a test that fails because of the bug.' },
      { id: 'fix', title: 'Fix the code', depends_on: ['reproduce'], phase_team: 'worker', body: 'Change the code until the new test passes and the other tests still pass.', loop: { max_iterations: 5, until: { status: 'done' } } },
      { id: 'review', title: 'Review the change', depends_on: ['fix'], human_gate: true, kind: 'gate' },
      { id: 'stuck', title: 'Tell me it is stuck', depends_on: ['fix'], body: 'Say what was tried and where it stopped.', when: { node: 'fix', status: 'blocked' } },
      { id: 'merge', title: 'Merge', depends_on: ['review'], phase_team: 'fixture-lead' },
    ],
  },
  {
    name: 'weekly-release',
    nodes: [
      { id: 'tests', title: 'Run the full test suite', depends_on: [], phase_team: 'worker' },
      { id: 'notes', title: 'Write the release notes', depends_on: ['tests'], phase_team: 'reviewer' },
      { id: 'signoff', title: 'Sign off the release', depends_on: ['notes'], human_gate: true, kind: 'gate' },
    ],
  },
]

async function call(apiUrl, headers, method, path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...headers, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

export async function seedWorkflowDesign(apiUrl, headers) {
  const made = []
  const library = await call(apiUrl, headers, 'GET', '/workflow-library?scope=global')
  const globalNames = new Set((library.workflows ?? []).map((row) => row.name))
  for (const template of DESIGN_TEMPLATES) {
    if (globalNames.has(template.name)) continue
    await call(apiUrl, headers, 'POST', '/workflow-library', { scope: 'global', name: template.name, nodes: template.nodes })
    made.push(`template ${template.name}`)
  }
  const project = encodeURIComponent(DESIGN_PROJECT)
  const existing = await call(apiUrl, headers, 'GET', `/projects/${project}/workflows`)
  const projectNames = new Set((existing.workflows ?? []).map((row) => row.name))
  for (const workflow of DESIGN_WORKFLOWS) {
    if (projectNames.has(workflow.name)) continue
    await call(apiUrl, headers, 'POST', `/projects/${project}/workflows`, { name: workflow.name, nodes: workflow.nodes })
    made.push(`workflow ${workflow.name}`)
  }
  return made
}
