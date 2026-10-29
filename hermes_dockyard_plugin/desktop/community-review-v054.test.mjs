// Regression tests for the v0.5.4 community review: the two UI findings.
//
// 5. Delivery confirmations disappeared from the Inbox when a project had no
//    other inbox item.
// 6. Open from "All projects" lost the notification's owning project and
//    showed the project chooser instead of the task.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(fileURLToPath(new URL('../dashboard/package.json', import.meta.url)))
require('react') // keep the dashboard workspace resolution warm like other suites

const { buildInboxData } = await import('./src/data/inbox-load.js')
const { resolveDeepLink, ownerProjectOf } = await import('./src/shell/deep-link.js')

// ------------------------------------------------------------------ //
// Finding 5: the Inbox must find confirmations it has no other reason  //
// to look for                                                          //
// ------------------------------------------------------------------ //

// 'alpha' has an approval waiting. 'beta' has ONLY a delivery confirmation,
// so nothing in /inbox mentions it.
const INBOX = {
  items: [
    { kind: 'initiative_approval', project: 'alpha', ref: 'INI-A1', title: 'Alpha change' },
  ],
}
const ROADMAP = {
  projects: [
    { id: 'alpha', initiatives: [{ ref: 'INI-A1', title: 'Alpha change', ready_to_confirm: false }] },
    { id: 'beta', initiatives: [{ ref: 'INI-B1', title: 'Beta delivery', ready_to_confirm: true }] },
  ],
}

function fakeApi() {
  const calls = []
  const api = async (path) => {
    calls.push(path)
    if (path === '/inbox') return INBOX
    if (path.startsWith('/roadmap')) return ROADMAP
    if (/^\/projects\/[^/]+\/initiatives$/.test(path)) {
      return { initiatives: [{ ref: 'INI-A1', title: 'Alpha change', risk: 'low' }] }
    }
    throw new Error(`unexpected path ${path}`)
  }
  return { api, calls }
}

test('a confirmation is listed for a project with no other inbox item', async () => {
  const { api } = fakeApi()

  const data = await buildInboxData(api)

  assert.deepEqual(
    data.readyToConfirm.map((row) => `${row.project}/${row.ref}`),
    ['beta/INI-B1'],
    'the only project awaiting confirmation was never queried',
  )
})

test('readiness is read once for the whole fleet, not per inbox project', async () => {
  const { api, calls } = fakeApi()

  await buildInboxData(api)

  const roadmapCalls = calls.filter((path) => path.startsWith('/roadmap'))
  assert.deepEqual(roadmapCalls, ['/roadmap'])
})

test('inbox items still carry their initiative detail', async () => {
  const { api } = fakeApi()

  const data = await buildInboxData(api)

  assert.equal(data.items[0].detail.ref, 'INI-A1')
})

test('a failed readiness read leaves the approvals list intact', async () => {
  const api = async (path) => {
    if (path === '/inbox') return INBOX
    if (path.startsWith('/roadmap')) throw new Error('503')
    return { initiatives: [] }
  }

  const data = await buildInboxData(api)

  assert.deepEqual(data.readyToConfirm, [])
  assert.equal(data.items.length, 1)
})

// ------------------------------------------------------------------ //
// Finding 6: Open must carry the owning project                        //
// ------------------------------------------------------------------ //

// "All projects": nothing is selected and no board data has been loaded for
// the target project, which is exactly the state the scan could not resolve.
const ALL_PROJECTS = {
  projectContext: {},
  projects: [{ id: 'alpha' }, { id: 'beta' }],
  selectedProject: null,
}

test('a task notification opens its own project, not the chooser', () => {
  const target = resolveDeepLink({
    link: 's2:work/UNI-1',
    owner: { project: 'beta' },
    ...ALL_PROJECTS,
  })

  assert.equal(target.tab, 'project')
  assert.equal(target.project, 'beta')
  assert.equal(target.workRef, 'UNI-1')
  assert.equal(target.notice, null, 'a resolved task must not warn about missing board data')
})

test('without an owner the task link still falls back rather than crashing', () => {
  const target = resolveDeepLink({ link: 's2:work/UNI-1', ...ALL_PROJECTS })

  assert.equal(target.project, 'alpha')
  assert.match(target.notice, /not in the current board data/)
})

test('the owner never overrides a project named by the link itself', () => {
  const target = resolveDeepLink({
    link: 's2:project/alpha',
    owner: { project: 'beta' },
    ...ALL_PROJECTS,
  })

  assert.equal(target.project, 'alpha')
})

test('board data still resolves the project when no owner is supplied', () => {
  const target = resolveDeepLink({
    link: 's2:work/UNI-9',
    projectContext: { beta: { workItems: [{ ref: 'UNI-9' }] } },
    projects: [{ id: 'alpha' }],
    selectedProject: 'alpha',
  })

  assert.equal(target.project, 'beta')
  assert.equal(target.notice, null)
})

test('an approval notification opens the inbox on its own project', () => {
  const target = resolveDeepLink({
    link: 's6:initiative/INI-B1',
    owner: { project: 'beta' },
    ...ALL_PROJECTS,
  })

  assert.equal(target.tab, 'inbox')
  assert.equal(target.project, 'beta')
  assert.equal(target.focusRef, 'INI-B1')
})

test('ownerProjectOf accepts an id, a row, or nothing', () => {
  assert.equal(ownerProjectOf('beta'), 'beta')
  assert.equal(ownerProjectOf({ project: 'beta' }), 'beta')
  assert.equal(ownerProjectOf({ project_id: 'beta' }), 'beta')
  assert.equal(ownerProjectOf(undefined), null)
  assert.equal(ownerProjectOf(''), null)
})

test('an unroutable link changes nothing', () => {
  assert.equal(resolveDeepLink({ link: 'nonsense' }), null)
  assert.equal(resolveDeepLink({ link: null }), null)
})

test('the remaining screens keep their existing destinations', () => {
  assert.equal(resolveDeepLink({ link: 's5:teams' }).tab, 'teams')
  assert.equal(resolveDeepLink({ link: 's1:project/alpha' }).project, 'alpha')
  const backlog = resolveDeepLink({ link: 's3:unassigned/alpha' })
  assert.equal(backlog.tab, 'backlog')
  assert.deepEqual(backlog.backlogPreset, { kind: 'unassigned', projectId: 'alpha' })
})
