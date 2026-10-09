// Chat with a project's bots (checks round 1; Sahil 08/10 pick 1a = A): the
// Chat menu's rules, without a browser. The browser half (the menu in the
// header strip, the request it sends, the chat it opens) lives in
// project-chat-screen.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chatOutcomeMessage, chatRoute, chatTargets, openProjectChat } from './src/project/chat.js'

test('the team is listed lead first, once each, never a departed member', () => {
  const members = [
    { profile_slug: 'coder', role: 'member', state: 'active' },
    { profile_slug: 'lead', role: 'lead', state: 'active' },
    { profile_slug: 'qa', role: 'member', state: 'departure_pending' },
    { profile_slug: 'gone', role: 'member', state: 'departed' },
    { profile_slug: 'coder', role: 'member', state: 'active' },
  ]
  assert.deepEqual(chatTargets(members), [
    { profile: 'lead', role: 'lead' }, { profile: 'coder', role: 'member' }, { profile: 'qa', role: 'member' },
  ])
  // The settings' lead wins when the team list has not loaded.
  assert.deepEqual(chatTargets(null, 'lead'), [{ profile: 'lead', role: 'lead' }])
  assert.deepEqual(chatTargets([], ''), [])
})

test('the route is the bot on the active connection, backend profile first', () => {
  const routes = [
    { connectionId: 'remote-1', mode: 'remote', profile: 'coder', targetProfile: 'coder' },
    { connectionId: 'local', mode: 'local', profile: 'desk-coder', targetProfile: 'coder' },
    { connectionId: 'local', mode: 'local', profile: 'lead', targetProfile: 'lead' },
  ]
  assert.equal(chatRoute(routes, 'local', 'coder').profile, 'desk-coder')
  assert.equal(chatRoute(routes, 'local', 'lead').targetProfile, 'lead')
  assert.equal(chatRoute(routes, 'remote-1', 'lead'), null, 'never a bot on another connection')
  assert.equal(chatRoute(routes, null, 'coder'), null)
})

function fakeHost({ routes = null, active = 'local', newChat = true } = {}) {
  const calls = []
  const host = {
    ...(newChat ? { newChat: (target) => calls.push(target) } : {}),
    ...(routes ? { profileRoutes: async () => routes, activeConnectionId: () => active } : {}),
  }
  return { host, calls }
}

test('Chat records the link, then opens the bot on its route', async () => {
  const route = { connectionId: 'local', mode: 'local', profile: 'coder', targetProfile: 'coder' }
  const { host, calls } = fakeHost({ routes: [route] })
  const requests = []
  const api = async (path, init) => { requests.push([path, init]); return { id: 1 } }
  const outcome = await openProjectChat({ host, api, projectId: 'alpha one', profile: 'coder' })
  assert.deepEqual(outcome, { opened: true, linked: true, via: 'route' })
  assert.deepEqual(requests, [['/projects/alpha%20one/chat-links', { method: 'POST', body: { profile: 'coder' }, quiet: true }]])
  assert.deepEqual(calls, [route])
  assert.notEqual(calls[0], route, 'the host gets a copy, not the list entry')
})

test('without routes the chat opens by profile name; a refused link still opens the chat', async () => {
  const { host, calls } = fakeHost()
  const refused = async () => { throw new Error('403: lacks capability') }
  const outcome = await openProjectChat({ host, api: refused, projectId: 'alpha', profile: 'lead' })
  assert.deepEqual(outcome, { opened: true, linked: false, via: 'profile' })
  assert.deepEqual(calls, ['lead'])
  assert.equal(chatOutcomeMessage('lead', outcome)[0], 'danger')
  assert.match(chatOutcomeMessage('lead', outcome)[1], /without this project's memory/)
})

test('an old Desktop without newChat opens nothing and says so', async () => {
  const { host, calls } = fakeHost({ newChat: false })
  let asked = false
  const outcome = await openProjectChat({ host, api: async () => { asked = true }, projectId: 'alpha', profile: 'lead' })
  assert.deepEqual(outcome, { opened: false, reason: 'unsupported' })
  assert.equal(asked, false, 'no link is recorded for a chat that cannot open')
  assert.deepEqual(calls, [])
  assert.match(chatOutcomeMessage('lead', outcome)[1], /Update Hermes Desktop/)
  assert.deepEqual(chatOutcomeMessage('lead', { opened: true, linked: true }), ['success', "Chat with lead opened. Its first message brings this project's memory."])
})
