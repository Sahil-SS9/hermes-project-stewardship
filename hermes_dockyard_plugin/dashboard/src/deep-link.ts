// Deep-link routing for the fleet surfaces, kept in its own module so the
// destination logic can be tested without booting the dashboard.
//
// Notifications and fleet rows are the only places a person reaches a
// specific object from outside its project. A link identifies its object
// globally (``s2:work/<ref>``) but never names the project the object lives
// in, so the owning project has to travel with the click: recovering it from
// the current selection is what fails in "All projects", where the work tab
// had no project to render and showed the project chooser instead.
import type { AppState } from './app';

export interface FleetLink {
  link: string;
  s: AppState;
  tabs: HTMLElement[];
  go: () => void;
  // The project owning the clicked notification or row, when the caller knows
  // it. Used only for links whose object lives inside a project and which do
  // not name one themselves.
  ownerProjectId?: string;
}

export function applyFleetDeepLink(
  { link, s, tabs, go, ownerProjectId }: FleetLink,
): void {
  const sep = link.indexOf(':');
  if (sep <= 0) return;
  const screen = link.slice(0, sep);
  const rest = link.slice(sep + 1);
  const slash = rest.indexOf('/');
  const objectKind = slash >= 0 ? rest.slice(0, slash) : '';
  const objectId = slash >= 0 ? rest.slice(slash + 1) : rest;
  // A link identifies its object globally but carries no project. Whatever
  // project owns the clicked row must therefore come with the click, or the
  // destination renders against whichever project happened to be selected -
  // and against none at all in "All projects".
  const ownProject = (): void => {
    if (ownerProjectId) s.projectId = ownerProjectId;
  };
  const select = (tab: AppState['tab']): void => {
    s.tab = tab;
    // keep the tab strip in sync with the programmatic navigation
    for (const t of tabs) {
      const active = (t as HTMLElement).dataset.tab === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    }
    go();
  };
  if (screen === 's4') {
    ownProject();
    select('inbox');
    return;
  }
  if (screen === 's6' && objectKind === 'initiative') {
    ownProject();
    select('inbox');
    return;
  }
  if (screen === 's2') {
    if (objectKind === 'work' && objectId) {
      s.selectedWorkRef = objectId;
      ownProject();
      select('work');
      return;
    }
    if (objectKind === 'project' && objectId) {
      s.projectId = objectId;
      select('work');
      return;
    }
    select('work');
    return;
  }
  if (screen === 's1') {
    if (objectKind === 'project' && objectId) s.projectId = objectId;
    else ownProject();
    select('dashboard');
    return;
  }
  if (screen === 's5') {
    select('workflow');
    return;
  }
  select('dashboard');
}
