// Loaded before every desktop test file by run-browser-suite.mjs (--import).
// Sahil 05/10: Dockyard opens on All projects when nothing is remembered,
// otherwise on the remembered project (GET/PUT /settings/last-project), and
// every screen follows that choice. All test files share one practice
// backend, so a project picked in one file would decide where the next file's
// app opens. Each file therefore starts as a fresh Dockyard does: nothing
// remembered. (A file that needs a project picks it; see project-scope.mjs.)
const api = process.env.STEWARD_API_URL
if (api) {
  const response = await fetch(`${api}/settings/last-project`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token' },
    body: JSON.stringify({ project_id: null }),
  })
  if (!response.ok) throw new Error(`fresh-scope: PUT /settings/last-project -> ${response.status}: ${await response.text()}`)
}
