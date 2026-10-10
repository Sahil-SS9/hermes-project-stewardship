// Unlinked projects (found on Sahil's live app, 10/10/2026): a stewardship
// project Hermes has no project for. Its work items, milestones and team live
// in Hermes, so those reads fail with "canonical project was not found" (or
// "canonical board was not found"). Every view shows what it can and says why
// the rest is missing, in the backend's words (the unlinked_project
// intervention in dockyard_service.py), never "backend unreachable". The
// Desktop plugin uses the same words (desktop/src/data/unlinked.js).

export const UNLINKED_TITLE = 'Not linked to a Hermes project';
export const UNLINKED_DETAIL = 'Hermes has no project with this id or slug, so its work cannot be shown.';
export const UNLINKED_LABEL = 'Not linked';

export function unlinkedNextStep(projectId: string): string {
  return `Create a Hermes project with the slug "${projectId}" to link it.`;
}

// Hermes refused because it has no project or board for this id. The Hermes
// web SDK throws the backend's message; a missing task or epic is a different
// miss and does not match.
const MISSING_LINK = /canonical (project|board) was not found/i;

export function isUnlinkedError(error: unknown): boolean {
  if ((error as { unlinked?: unknown } | null)?.unlinked === true) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return MISSING_LINK.test(message);
}

// The same failure, in words, for whoever shows it. Keeps status and cause.
export function unlinkedFailure(error: unknown, path: string): Error {
  const projectId = /^\/projects\/([^/?]+)/.exec(path)?.[1];
  const failure = new Error(
    `${UNLINKED_TITLE}. ${projectId ? unlinkedNextStep(decodeURIComponent(projectId)) : 'Link it to a Hermes project first.'}`,
  ) as Error & { unlinked: true; status?: number; cause?: unknown };
  failure.unlinked = true;
  failure.status = (error as { status?: number } | null)?.status;
  failure.cause = error;
  return failure;
}

// A read that needs Hermes. For a project known to be unlinked it is not made;
// one Hermes refuses on the way (the link went away in between) marks the
// project unlinked and reads as `empty`. Any other failure still fails.
export async function hermesRead<T>(
  link: { unlinked: boolean },
  read: () => Promise<T>,
  empty: T,
): Promise<T> {
  if (link.unlinked) return empty;
  try {
    return await read();
  } catch (error) {
    if (!isUnlinkedError(error)) throw error;
    link.unlinked = true;
    return empty;
  }
}
