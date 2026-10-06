// C5 Activity: real project events, made through the real proxy with the
// app's own actions, so the Activity screen has true rows to show. The
// practice data is loaded before the backend starts recording events, so a
// fresh backend has none. Used by activity-screen.test.mjs, and by the
// practice server for Sahil's review (with the first read-only assessment).
//
// On one project, each step an action the app itself offers:
//   propose an initiative and approve it; propose one and reject it (reason);
//   propose one and request changes (feedback); propose one and withdraw it
//   propose one and leave it waiting; take an assigned work item off its
//   owner and give it straight back (work.unassigned, then work.assigned),
//   so the work data ends exactly as it started.
// Open initiatives afterwards: 3 more (approved, changes requested, waiting),
// never more than 3 more at any moment.
const FINISHED = new Set(['done', 'cancelled', 'canceled', 'closed', 'archived', 'completed'])

export async function seedActivity(call, projectId, { stamp = Date.now(), titles = {} } = {}) {
  const pid = encodeURIComponent(projectId)
  const propose = async (title) => {
    const made = await call(`/projects/${pid}/initiatives`, 'POST', { title, rationale: 'C5 Activity: a real event for the Activity screen.' })
    const ref = made?.ref ?? made?.initiative?.ref
    if (!ref) throw new Error(`proposing "${title}" returned no ref: ${JSON.stringify(made).slice(0, 200)}`)
    return ref
  }
  const decide = async (ref, action, body = {}) => {
    const decision = await call(`/initiatives/${encodeURIComponent(ref)}/decision`)
    return call(`/initiatives/${encodeURIComponent(ref)}/${action}`, 'POST', { expected_fingerprint: decision.fingerprint, ...body })
  }
  const name = (key, fallback) => `${titles[key] ?? fallback} (${stamp})`
  const refs = {}
  refs.approved = await propose(name('approved', 'Cache the price list'))
  await decide(refs.approved, 'approve')
  refs.rejected = await propose(name('rejected', 'Rebuild the invoice service'))
  await decide(refs.rejected, 'reject', { reason: 'Too costly this quarter' })
  refs.changes = await propose(name('changes', 'Retry failed payment webhooks'))
  await decide(refs.changes, 'request-changes', { feedback: 'Show the cost first' })
  refs.withdrawn = await propose(name('withdrawn', 'Second retry queue'))
  await call(`/initiatives/${encodeURIComponent(refs.withdrawn)}/withdraw`, 'POST', { reason: 'Duplicate of an existing initiative' })
  refs.waiting = await propose(name('waiting', 'Speed up the checkout page'))

  const items = (await call(`/projects/${pid}/work-items`))?.work_items ?? []
  // The list names the owner `assignee`; the assign request takes `assignee_id`.
  const owned = items.find((item) => typeof item.assignee === 'string' && item.assignee && (item.type ?? 'task') !== 'epic' && !FINISHED.has(String(item.status ?? '')))
  if (owned) {
    const path = `/projects/${pid}/work-items/${encodeURIComponent(owned.ref)}/assign`
    await call(path, 'POST', { assignee_id: null })
    await call(path, 'POST', { assignee_id: owned.assignee })
    refs.work = owned.ref
  }
  return refs
}
