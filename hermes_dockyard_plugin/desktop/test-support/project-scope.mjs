// Sahil 05/10 (design round d): Dockyard opens on All projects when nothing is
// remembered, every screen follows the global switcher, and screens that work
// on one project ask for one. Journeys written before then got a project
// without asking (the app used to open on the project needing most
// attention); they now pick it the way a person does, through the switcher.
export const ALL_PROJECTS = '*'

export async function pickProject(page, id) {
  await page.getByRole('button', { name: 'Project context', exact: true }).click()
  if (id !== ALL_PROJECTS) await page.getByRole('combobox', { name: 'Find project' }).fill(id)
  await page.locator(`[role="listbox"] [data-project-option="${id}"]`).click()
  await page.locator(`.dy-sw-trigger[data-scope="${id}"]`).waitFor()
}

// Picking a project is remembered by the backend (GET/PUT
// /settings/last-project). Suites that share one backend put the remembered
// value back, so a later test still opens the way it expects.
export async function rememberedProject(apiUrl, headers) {
  const response = await fetch(`${apiUrl}/settings/last-project`, { headers })
  if (!response.ok) throw new Error(`GET /settings/last-project -> ${response.status}`)
  return (await response.json()).project_id ?? null
}

export async function restoreRememberedProject(apiUrl, headers, projectId) {
  const response = await fetch(`${apiUrl}/settings/last-project`, {
    method: 'PUT',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  })
  if (!response.ok) throw new Error(`PUT /settings/last-project -> ${response.status}: ${await response.text()}`)
}
