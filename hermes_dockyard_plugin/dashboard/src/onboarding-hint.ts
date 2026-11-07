// Issue #30: Hermes keeps one project registry per profile, and onboarding
// offers only the registry of the profile Project Stewardship runs in. When
// that list is empty but other profiles have projects, say where they are and
// how to register one here, instead of a bare "none". Shared by the Desktop
// wizard and the dashboard's onboarding view so the wording cannot drift.

export interface OtherProfileProjects {
  name: string;
  project_count: number;
}

export interface OnboardingDiscovery {
  projects?: unknown[];
  profile?: string;
  other_profiles?: OtherProfileProjects[];
}

// Hermes profile names: letters, digits, '_' and '-' (the host's own rule).
const PROFILE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function otherProfilesHint(discovered: OnboardingDiscovery | null | undefined): string | null {
  if (!discovered || (discovered.projects ?? []).length > 0) return null;
  const others = (discovered.other_profiles ?? []).filter(
    (p) => p && PROFILE_NAME.test(String(p.name)) && Number(p.project_count) > 0,
  );
  if (others.length === 0) return null;
  const here = PROFILE_NAME.test(String(discovered.profile ?? '')) ? String(discovered.profile) : 'default';
  const listed = others.map((p) => `${p.name} (${Number(p.project_count)})`).join(', ');
  const command = here === 'default' ? 'hermes project create' : `hermes -p ${here} project create`;
  return `The ${here} profile has no Hermes projects yet. Other profiles have their own: ${listed}. `
    + 'Hermes keeps projects per profile, so those are not offered here. '
    + `To onboard one, register it in ${here} first (${command} <name> <repo path>), then refresh host discovery.`;
}
