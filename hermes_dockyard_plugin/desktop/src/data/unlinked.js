// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Unlinked projects (found on Sahil's live app, 10/10/2026): a stewardship
// project Hermes has no project for. Its work items, milestones and team live
// in Hermes, so those reads fail with "canonical project was not found" (or
// "canonical board was not found"). Every view shows what it can and says why
// the rest is missing, in the backend's words (the unlinked_project
// intervention in dockyard_service.py), never an error card.
export const UNLINKED_TITLE = 'Not linked to a Hermes project'
export const UNLINKED_DETAIL = 'Hermes has no project with this id or slug, so its work cannot be shown.'
export const UNLINKED_LABEL = 'Not linked'

export function unlinkedNextStep(projectId) {
  return `Create a Hermes project with the slug "${projectId}" to link it.`
}

// /dashboard marks each project linked or not.
export function isUnlinked(project) {
  return project?.linked === false
}

// Hermes refused because it has no project or board for this id. The plugin
// proxy hands the Desktop the backend's message, so the message is what
// arrives; a missing task or epic is a different miss and does not match.
const MISSING_LINK = /canonical (project|board) was not found/i

export function isUnlinkedError(error) {
  return error?.unlinked === true || MISSING_LINK.test(String(error?.message ?? error ?? ''))
}

// A read that needs Hermes. For a project known to be unlinked it is not made;
// one Hermes refuses on the way (the link went away in between) marks the
// project unlinked and reads as `empty`. Any other failure still fails.
export async function hermesRead(link, read, empty) {
  if (link.unlinked) return empty
  try {
    return await read()
  } catch (error) {
    if (!isUnlinkedError(error)) throw error
    link.unlinked = true
    return empty
  }
}
