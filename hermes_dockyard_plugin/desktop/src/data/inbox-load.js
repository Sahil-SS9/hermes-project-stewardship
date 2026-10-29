// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// The Approval Inbox read, as a function of its transport so it can be tested
// without a runtime. Kept out of loaders.js only because that module pulls in
// the React runtime context.

/**
 * Build the Inbox payload.
 *
 * @param fetchApi async (path) => parsed JSON, i.e. the runtime ``api``.
 */
export async function buildInboxData(fetchApi) {
  const inbox = await fetchApi('/inbox')
  const projectIds = [...new Set((inbox.items ?? []).map((item) => item.project).filter(Boolean))]
  const projectInitiatives = await Promise.all(projectIds.map(async (projectId) => {
    const result = await fetchApi(`/projects/${encodeURIComponent(projectId)}/initiatives`)
    return result.initiatives ?? []
  }))
  const detailByRef = {}
  projectInitiatives.flat().forEach((initiative) => { detailByRef[initiative.ref] = initiative })
  // Batch L: initiatives ready for a person to confirm as delivered, read from
  // the roadmap ladder. The Approval Inbox lists these with the same Confirm
  // action the Roadmap offers.
  //
  // Read the whole fleet, NOT the projects that happen to appear in
  // `inbox.items`: a project whose only waiting item IS a delivery
  // confirmation has no other inbox item to be discovered by, so scoping the
  // lookup to inbox projects hid exactly the confirmations this list exists
  // to show. One call covers every project.
  let readyToConfirm = []
  try {
    const roadmap = await fetchApi('/roadmap')
    readyToConfirm = (roadmap?.projects ?? []).flatMap((project) =>
      (project?.initiatives ?? [])
        .filter((row) => row.ready_to_confirm)
        .map((row) => ({ project: project.id, ref: row.ref, title: row.title })))
  } catch {
    readyToConfirm = []
  }
  return {
    ...inbox,
    items: (inbox.items ?? []).map((item) => ({ ...item, detail: detailByRef[item.ref] ?? null })),
    readyToConfirm,
  }
}
