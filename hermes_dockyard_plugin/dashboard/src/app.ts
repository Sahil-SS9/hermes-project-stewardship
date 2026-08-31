// Dockyard plugin app shell: header + three panels (Dashboard, Inbox, Notifications)
// + onboarding form. Vanilla TS DOM, host React only for the registration wrapper.
// Product constraint (locked): no string→DOM sinks, no eval, no storage. All text
// is inert (createElement + textContent); user and API strings are never parsed
// as markup.
import type { Api, HermesPluginSDK, MilestoneSummary, WorkItem } from './api';
import { createApi } from './api';
import { mountWorkflowCanvas, type CanvasRun } from './workflow-canvas';

interface AppState {
  api: Api;
  tab: 'dashboard' | 'work' | 'delivery' | 'inbox' | 'notifications' | 'workflow' | 'onboard';
  projectId?: string;
  selectedWorkRef?: string;
  workLayout: 'board' | 'table';
  featureMap?: Record<string, boolean> | null;
  pendingView?: string | null;
}

type FeatureMap = Record<string, boolean>;

export function initApp(
  sdk: HermesPluginSDK,
  root: HTMLElement,
): () => void {
  // Deep link (DY-P1-03): ``#/work/<view name>`` opens the Work tab with that
  // saved view selected. Read-only at boot; no storage sinks involved.
  let deepLinkView: string | null = null;
  const hash = typeof window !== 'undefined' && window.location
    ? window.location.hash : '';
  const deepMatch = /^#\/work\/(.+)$/.exec(hash || '');
  if (deepMatch) {
    try { deepLinkView = decodeURIComponent(deepMatch[1]); } catch { deepLinkView = deepMatch[1]; }
  }

  const state: AppState = {
    api: createApi(sdk),
    tab: deepLinkView ? 'work' : 'dashboard',
    workLayout: 'board',
    pendingView: deepLinkView,
  };
  // cor-005/007: generation token — a newer render invalidates in-flight ones;
  // disposed flag lets the host unmount abort everything cleanly.
  let renderSeq = 0;
  let disposed = false;

  const render = async (
    main: HTMLElement,
    s: AppState,
  ): Promise<void> => {
    const gen = ++renderSeq;
    main.replaceChildren(loadingEl());
    try {
      if (disposed || gen !== renderSeq) return;
      const stale = (): boolean =>
        disposed || gen !== renderSeq || !main.isConnected;
      if (s.tab === 'dashboard') await renderDashboard(main, s, stale);
      else if (s.tab === 'work') await renderWork(main, s, stale);
      else if (s.tab === 'delivery') await renderDelivery(main, s, stale);
      else if (s.tab === 'inbox') await renderInbox(main, s, stale);
      else if (s.tab === 'workflow') await renderWorkflow(main, s, stale);
      else if (s.tab === 'notifications')
        await renderNotifications(main, s, stale);
      else renderOnboard(main, s);
    } catch (err) {
      if (disposed || gen !== renderSeq || !main.isConnected) return;
      main.replaceChildren(
        textEl('div', 'dy-error', `Dockyard backend unreachable: ${String(err)}`),
      );
    }
  };

  root.replaceChildren();
  root.className = 'dy-root';

  // ---- header ----
  const header = document.createElement('header');
  header.className = 'dy-header';

  const brand = document.createElement('div');
  brand.className = 'dy-brand';
  const mark = document.createElement('span');
  mark.className = 'dy-mark';
  mark.setAttribute('aria-hidden', 'true');
  const h1 = document.createElement('h1');
  h1.textContent = 'Hermes Dockyard';
  brand.append(mark, h1);

  const nav = document.createElement('nav');
  nav.className = 'dy-tabs';
  nav.setAttribute('role', 'tablist');
  const TABS: Array<{ id: AppState['tab']; label: string; feature?: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'work', label: 'Work' },
    { id: 'delivery', label: 'Delivery', feature: 'initiatives' },
    { id: 'inbox', label: 'Approval Inbox', feature: 'inbox' },
    { id: 'workflow', label: 'Workflow', feature: 'workflow_canvas' },
    { id: 'notifications', label: 'Notifications', feature: 'notifications' },
    { id: 'onboard', label: 'Onboard Project' },
  ];

  // Feature toggles (DY-FT-01): tabs for disabled features are hidden.
  // Data is never touched — re-enabling restores the tab.
  let featureMap: FeatureMap | null = null;
  const featureOn = (name?: string): boolean =>
    !name || !featureMap || featureMap[name] !== false;

  const hideDisabledTabs = (): void => {
    for (const t of TABS) {
      const btn = nav.querySelector<HTMLButtonElement>(`button[data-tab="${t.id}"]`);
      if (btn) btn.hidden = !featureOn(t.feature);
    }
  };

  for (const t of TABS) {
    const b = document.createElement('button');
    b.dataset.tab = t.id;
    if (t.feature) b.dataset.feature = t.feature;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(t.id === 'dashboard'));
    b.textContent = t.label;
    if (t.id === 'dashboard') b.classList.add('active');
    nav.appendChild(b);
  }
  header.append(brand, nav);
  root.appendChild(header);

  // ---- content ----
  const main = document.createElement('main');
  main.className = 'dy-main';
  root.appendChild(main);

  const tabs = Array.from(header.querySelectorAll('button[data-tab]'));
  tabs.forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = (b as HTMLElement).dataset.tab as AppState['tab'];
      tabs.forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-selected', String(x === b));
      });
      void render(main, state);
    }),
  );

  void render(main, state);

  // Fetch features after the first project is known; until then default-all-on
  // so first paint is never blocked by the toggle check (DY-FT-01).
  const activeTab = state.tab;
  void (async () => {
    try {
      const dash = await state.api.dashboard();
      const first = (dash.projects ?? [])[0]?.id;
      if (!first) return;
      const res = await state.api.features(first);
      featureMap = res.features ?? {};
      hideDisabledTabs();
      if (!featureOn(TABS.find((t) => t.id === activeTab)?.feature)) {
        state.tab = 'dashboard';
        const dashBtn = nav.querySelector('button[data-tab="dashboard"]');
        if (dashBtn) {
          nav.querySelectorAll('button').forEach((x) => {
            x.classList.toggle('active', x === dashBtn);
            x.setAttribute('aria-selected', String(x === dashBtn));
          });
        }
        void render(main, state);
      }
    } catch {
      // Toggles are optional; on failure everything behaves as enabled.
    }
  })();

  // cor-007: host-facing teardown — aborts in-flight renders and blocks new ones
  return () => {
    disposed = true;
    root.replaceChildren();
  };
}

async function renderDashboard(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.portfolio();
  const projects = view.projects ?? [];

  if (projects.length === 0) {
    const empty = textEl('div', 'dy-empty', '');
    const p = document.createElement('p');
    p.textContent = 'No projects yet.';
    const btn = document.createElement('button');
    btn.className = 'dy-btn';
    btn.id = 'dy-go-onboard';
    btn.textContent = 'Onboard your first project';
    btn.addEventListener('click', () => {
      (document.querySelector('[data-tab="onboard"]') as HTMLButtonElement)?.click();
    });
    empty.append(p, btn);
    main.replaceChildren(empty);
    return;
  }
  if (isStale()) return;

  const wrap = document.createElement('div');
  wrap.className = 'dy-portfolio';

  // -- Attention strip: derived from the backend status verdicts, not
  // decoration. Hidden entirely when nothing needs attention (anti-slop:
  // no always-on stat cards).
  const atRisk = projects.filter((p) => p.status === 'at_risk')
    .map((p) => p.project_id);
  const stalled = projects.filter((p) => p.status === 'stalled')
    .map((p) => p.project_id);
  const at = view.attention ?? { overdue_items: 0, blocked_items: 0, overdue_milestones: 0 };
  const hasAttention = atRisk.length > 0 || stalled.length > 0
    || (at.blocked_items ?? 0) > 0 || (at.overdue_items ?? 0) > 0
    || (at.overdue_milestones ?? 0) > 0;
  if (hasAttention) {
    const strip = document.createElement('section');
    strip.className = 'dy-card dy-attention';
    strip.appendChild(textEl('h2', '', 'Needs attention'));
    const lines = document.createElement('ul');
    lines.className = 'dy-attention-list';
    const addLine = (cls: string, text: string): void => {
      const li = document.createElement('li');
      li.className = cls;
      li.textContent = text;
      lines.appendChild(li);
    };
    if (atRisk.length > 0) addLine('bad', `At risk: ${atRisk.join(', ')}`);
    if (stalled.length > 0) addLine('warn', `Stalled: ${stalled.join(', ')}`);
    if ((at.blocked_items ?? 0) > 0) addLine('warn', `Blocked items: ${at.blocked_items}`);
    if ((at.overdue_items ?? 0) > 0) addLine('bad', `Overdue items: ${at.overdue_items}`);
    if ((at.overdue_milestones ?? 0) > 0) addLine('bad', `Overdue milestones: ${at.overdue_milestones}`);
    strip.appendChild(lines);
    wrap.appendChild(strip);
  }

  // -- Per-project standing: one dense row each. Status is the derived
  // backend verdict (on_track / at_risk / stalled / idle) — no vanity gauge.
  const section = document.createElement('section');
  section.className = 'dy-card';
  section.appendChild(textEl('h2', '', 'Projects'));

  const table = document.createElement('table');
  table.className = 'dy-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const h of ['Project', 'Status', 'Done', 'Open', 'Blocked', 'Next milestone', 'Last activity']) {
    hr.appendChild(textEl('th', '', h));
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');
  for (const p of projects) {
    const tr = document.createElement('tr');
    const tdId = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = String(p.project_id);
    tdId.appendChild(strong);
    const items = p.items ?? { total: 0, done: 0, blocked: 0, overdue: 0 };
    const ms = p.next_milestone;
    let msText = '—';
    if (ms) msText = ms.overdue ? `${ms.name} (overdue)` : ms.name;
    const act = p.last_activity ? p.last_activity.slice(0, 10) : '—';
    const open = (items.total ?? 0) - (items.done ?? 0);
    const blocked = items.blocked ?? 0;
    tr.append(
      tdId,
      textEl('td', `dy-status dy-status-${p.status}`, STATUS_LABEL[p.status] ?? p.status),
      textEl('td', 'num', String(items.done ?? 0)),
      textEl('td', 'num', String(open)),
      textEl('td', blocked > 0 ? 'num warn' : 'num', String(blocked)),
      textEl('td', ms?.overdue ? 'bad' : '', msText),
      textEl('td', 'dy-dim', act),
    );
    tbody.appendChild(tr);
  }
  table.append(thead, tbody);

  // Footer: status mix from the backend (counts, not percentages).
  const mix = view.mix ?? { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  const dim = textEl(
    'p',
    'dy-dim',
    `${projects.length} projects · ${mix.done} done · ${mix.in_progress} in progress · ${mix.todo} backlog · ${mix.blocked} blocked`,
  );
  section.append(table, dim);

  main.replaceChildren(wrap);
  wrap.appendChild(section);
  section.appendChild(await buildFeaturesPanel(
    s,
    projects.map((p) => ({ id: p.project_id })),
    () => void renderDashboard(main, s, isStale),
  ));
}

const STATUS_LABEL: Record<string, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  stalled: 'Stalled',
  idle: 'Idle',
};

const FEATURE_LABELS: Record<string, string> = {
  workflow_canvas: 'Workflow canvas',
  milestones: 'Milestones',
  initiatives: 'Initiatives & delivery',
  inbox: 'Approval inbox',
  notifications: 'Notifications',
  saved_views: 'Saved views',
};

async function buildFeaturesPanel(
  s: AppState,
  projects: Array<{ id: string }>,
  rerender: () => void,
): Promise<HTMLElement> {
  const box = document.createElement('details');
  box.className = 'dy-features';
  box.appendChild(textEl('summary', '', 'Features'));
  const body = textEl('div', 'dy-features-body', 'Loading features...');
  box.appendChild(body);
  const refreshTabVisibility = (): void => {
    document.querySelectorAll('.dy-tabs button[data-tab]').forEach((btn) => {
      const feature = (btn as HTMLElement).dataset.feature;
      if (!feature) return;
      (btn as HTMLElement).hidden = (s.featureMap ?? {})[feature] === false;
    });
  };
  try {
    const projectId = projects[0]?.id;
    if (!projectId) return box;
    // cor-005: reuse state.featureMap when already known (boot pre-fetch or a
    // previous fetch) — one source of truth, no duplicate round trips.
    if (!s.featureMap) {
      const res = await s.api.features(projectId);
      s.featureMap = res.features ?? {};
    }
    const list = document.createElement('div');
    list.className = 'dy-feature-list';
    for (const [name, on] of Object.entries(s.featureMap)) {
      const row = document.createElement('div');
      row.className = 'dy-feature-row';
      const label = textEl('span', 'dy-feature-name', FEATURE_LABELS[name] ?? name);
      const stateTxt = textEl('span', 'dy-dim', on ? 'On' : 'Off');
      const btn = workLayoutButton(on ? 'Disable' : 'Enable', false);
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        // Read CURRENT state at click time — in-place state edits would make
        // a captured `on` stale and re-send the same transition.
        const nowOn = (s.featureMap ?? {})[name] !== false;
        try {
          const updated = await s.api.updateFeatures(projectId, { [name]: !nowOn });
          s.featureMap = updated.features ?? {};
          stateTxt.textContent = !nowOn ? 'On' : 'Off';
          btn.textContent = !nowOn ? 'Disable' : 'Enable';
          btn.disabled = false;
          refreshTabVisibility();
        } catch {
          btn.textContent = 'Failed';
          btn.disabled = false;
        }
      });
      row.append(label, stateTxt, btn);
      list.appendChild(row);
    }
    body.replaceChildren(list);
    const note = textEl(
      'p', 'dy-dim',
      'Turning a feature off hides it and blocks its API. No data is ever deleted; re-enabling restores everything.',
    );
    body.appendChild(note);
  } catch {
    body.textContent = 'Feature settings are unavailable.';
  }
  return box;
}

async function renderWork(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const dashboard = await s.api.dashboard();
  const projects = dashboard.projects ?? [];
  if (projects.length === 0) {
    main.replaceChildren(textEl('div', 'dy-empty', 'Onboard a project to view work.'));
    return;
  }
  const projectId = s.projectId && projects.some((p) => p.id === s.projectId)
    ? s.projectId
    : projects[0].id;
  s.projectId = projectId;
  const [workResponse, backlogResponse, viewsResponse] = await Promise.all([
    s.api.workItems(projectId),
    s.api.backlog(projectId),
    s.api.views(projectId),
  ]);
  if (isStale()) return;
  const items = workResponse.work_items ?? [];
  const ranks = new Map(
    (backlogResponse.backlog ?? []).map((row) => [row.item_ref, row]),
  );

  const toolbar = document.createElement('div');
  toolbar.className = 'dy-work-toolbar';
  const projectSelect = document.createElement('select');
  projectSelect.setAttribute('aria-label', 'Project');
  projects.forEach((project) => {
    const option = textEl('option', '', project.id, project.id) as HTMLOptionElement;
    option.selected = project.id === projectId;
    projectSelect.appendChild(option);
  });
  const boardButton = workLayoutButton('Board', s.workLayout === 'board');
  const tableButton = workLayoutButton('Backlog table', s.workLayout === 'table');
  const savedViews = document.createElement('select');
  savedViews.setAttribute('aria-label', 'Saved view');
  savedViews.appendChild(textEl('option', '', 'Saved views', ''));
  (viewsResponse.views ?? []).forEach((view) => {
    savedViews.appendChild(textEl('option', '', view.name, view.name));
  });
  const timelineButton = workLayoutButton('Timeline unavailable', false);
  timelineButton.disabled = true;
  timelineButton.title = 'Timeline requires canonical scheduling data.';
  const saveButton = workLayoutButton('Save view', false);
  toolbar.append(projectSelect, savedViews, boardButton, tableButton,
    timelineButton, saveButton);

  const content = document.createElement('div');
  const detail = document.createElement('aside');
  detail.className = 'dy-work-detail';
  detail.appendChild(textEl('p', 'dy-dim', 'Select a work item to inspect it.'));
  const openDetail = (item: WorkItem): void => {
    detail.replaceChildren(loadingEl());
    void s.api.workDetail(projectId, item.ref).then((result) => {
      if (isStale()) return;
      const current = result.work_item;
      const history = result.history.length
        ? textEl('pre', 'dy-history', JSON.stringify(result.history, null, 2))
        : textEl('p', 'dy-dim', 'No canonical history is available.');
      const editor = document.createElement('div');
      editor.className = 'dy-work-editor';
      const titleInput = workInput('Title', current.title);
      const typeSelect = document.createElement('select');
      typeSelect.setAttribute('aria-label', 'Type');
      ['task', 'bug', 'spike', 'subtask', 'gate'].forEach((kind) => {
        const option = textEl('option', '', kind, kind) as HTMLOptionElement;
        option.selected = kind === (current.kind ?? 'task');
        typeSelect.appendChild(option);
      });
      const bodyInput = document.createElement('textarea');
      bodyInput.setAttribute('aria-label', 'Body');
      bodyInput.value = current.body ?? '';
      const assigneeInput = workInput('Assignee', current.assignee ?? '');
      const labelsInput = workInput('Labels, comma separated', (current.labels ?? []).join(', '));
      const estimateInput = workInput(
        'Estimate days',
        current.estimate_days == null ? '' : String(current.estimate_days),
      );
      estimateInput.type = 'number';
      estimateInput.min = '0';
      estimateInput.step = '0.5';
      const dueInput = workInput('Due date', current.due ?? '');
      dueInput.type = 'date';
      const save = workLayoutButton('Save changes', false);
      const feedback = textEl('p', 'dy-dim', '');
      save.addEventListener('click', async () => {
        save.disabled = true;
        feedback.textContent = 'Saving...';
        try {
          const updated = await s.api.updateWork(projectId, current.ref, {
            title: titleInput.value,
            type: typeSelect.value,
            body: bodyInput.value || null,
            labels: labelsInput.value.split(',').map((v: string) => v.trim()).filter(Boolean),
            estimate_days: estimateInput.value ? Number(estimateInput.value) : null,
            due: dueInput.value || null,
          });
          if ((current.assignee ?? '') !== assigneeInput.value.trim()) {
            await s.api.assignWork(
              projectId,
              current.ref,
              assigneeInput.value.trim() || null,
            );
          }
          feedback.textContent = 'Saved.';
          openDetail(updated);
        } catch {
          feedback.textContent = 'Save failed.';
          save.disabled = false;
        }
      });
      editor.append(
        titleInput,
        typeSelect,
        bodyInput,
        assigneeInput,
        labelsInput,
        estimateInput,
        dueInput,
        save,
        feedback,
      );

      const dependencyEditor = document.createElement('div');
      dependencyEditor.className = 'dy-dependency-editor';
      dependencyEditor.appendChild(textEl('h3', '', 'Dependencies'));
      result.dependencies.forEach((dependency) => {
        const row = document.createElement('div');
        row.className = 'dy-dependency-row';
        row.appendChild(textEl('span', '', `${dependency.ref}: ${dependency.title}`));
        const remove = workLayoutButton('Remove', false);
        remove.addEventListener('click', async () => {
          remove.disabled = true;
          try {
            await s.api.removeDependency(projectId, current.ref, dependency.ref);
            openDetail(current);
          } catch {
            remove.textContent = 'Failed';
            remove.disabled = false;
          }
        });
        row.appendChild(remove);
        dependencyEditor.appendChild(row);
      });
      const dependencyInput = workInput('Dependency task ref', '');
      const addDependency = workLayoutButton('Add dependency', false);
      addDependency.addEventListener('click', async () => {
        const dependencyRef = dependencyInput.value.trim();
        if (!dependencyRef) return;
        addDependency.disabled = true;
        try {
          await s.api.addDependency(projectId, current.ref, dependencyRef);
          openDetail(current);
        } catch {
          addDependency.textContent = 'Add failed';
          addDependency.disabled = false;
        }
      });
      dependencyEditor.append(dependencyInput, addDependency);

      detail.replaceChildren(
        textEl('h2', '', current.title),
        textEl('p', 'dy-dim', `${current.ref} · ${current.kind ?? 'task'} · ${current.status}`),
        textEl('p', 'dy-work-body', current.body || 'No body supplied.'),
        textEl('p', '', `Assignee: ${current.assignee || 'Unassigned'}`),
        current.status === 'blocked'
          ? textEl('p', 'dy-warning', current.blocked_reason || 'Blocked; no reason supplied.')
          : textEl('span', '', ''),
        textEl('p', '', `Parent: ${result.parent?.ref ?? 'None'} · Children: ${result.children.length}`),
        editor,
        dependencyEditor,
        textEl('h3', '', 'History'),
        history,
      );
    }).catch(() => {
      detail.replaceChildren(textEl('p', 'dy-error', 'Work-item detail is unavailable.'));
    });
  };

  const draw = (): void => {
    content.replaceChildren();
    if (s.workLayout === 'board') {
      content.className = 'dy-board';
      ([
        ['backlog', 'Backlog'],
        ['in_progress', 'In progress'],
        ['in_review', 'Review'],
        ['blocked', 'Blocked'],
        ['done', 'Done'],
      ] as Array<[string, string]>).forEach(([status, label]) => {
        const column = document.createElement('section');
        column.className = 'dy-board-column';
        const matching = items.filter((item) => item.status === status);
        column.appendChild(textEl('h3', '', `${label} (${matching.length})`));
        matching.forEach((item) => column.appendChild(workCard(item, openDetail)));
        content.appendChild(column);
      });
    } else {
      content.className = 'dy-card';
      const table = document.createElement('table');
      table.className = 'dy-table';
      const head = document.createElement('tr');
      ['Rank', 'Item', 'Status', 'Assignee', 'Reason'].forEach((label) =>
        head.appendChild(textEl('th', '', label)));
      const thead = document.createElement('thead');
      thead.appendChild(head);
      const tbody = document.createElement('tbody');
      [...items]
        .sort((a, b) => (ranks.get(a.ref)?.rank ?? 999999) - (ranks.get(b.ref)?.rank ?? 999999))
        .forEach((item) => {
          const rank = ranks.get(item.ref);
          const row = document.createElement('tr');
          const itemCell = document.createElement('td');
          itemCell.appendChild(workLink(item, openDetail));
          row.append(
            textEl('td', 'num', rank ? String(rank.rank) : 'Unranked'),
            itemCell,
            textEl('td', '', item.status),
            textEl('td', '', item.assignee || 'Unassigned'),
            textEl('td', '', rank?.priority_reason || ''),
          );
          tbody.appendChild(row);
        });
      table.append(thead, tbody);
      content.appendChild(table);
    }
    boardButton.classList.toggle('active', s.workLayout === 'board');
    tableButton.classList.toggle('active', s.workLayout === 'table');
  };
  projectSelect.addEventListener('change', () => {
    s.projectId = projectSelect.value;
    void renderWork(main, s, isStale);
  });
  boardButton.addEventListener('click', () => { s.workLayout = 'board'; draw(); });
  tableButton.addEventListener('click', () => { s.workLayout = 'table'; draw(); });
  savedViews.addEventListener('change', () => {
    const view = (viewsResponse.views ?? []).find((row) => row.name === savedViews.value);
    if (view?.layout === 'board' || view?.layout === 'table') {
      s.workLayout = view.layout;
      s.pendingView = view.name;
      draw();
    }
  });
  // Deep link (DY-P1-03): restore a specific saved view on first render.
  if (s.pendingView) {
    const view = (viewsResponse.views ?? []).find(
      (row) => row.name === s.pendingView);
    if (view) {
      if (view.layout === 'board' || view.layout === 'table') {
        s.workLayout = view.layout;
      }
      savedViews.value = view.name;
    }
    s.pendingView = null;
  }
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try {
      await s.api.saveView(projectId, `${projectId} ${s.workLayout}`, s.workLayout);
      saveButton.textContent = 'Saved';
    } catch {
      saveButton.textContent = 'Save failed';
    } finally {
      saveButton.disabled = false;
    }
  });
  draw();

  const milestonesSection = buildMilestonesPanel(s, projectId, items, () =>
    renderWork(main, s, isStale));

  const split = document.createElement('div');
  split.className = 'dy-work-split';
  split.append(content, detail);
  const section = document.createElement('section');
  section.append(toolbar, milestonesSection, split);
  main.replaceChildren(section);
  if (s.selectedWorkRef) {
    const selected = items.find((item) => item.ref === s.selectedWorkRef);
    s.selectedWorkRef = undefined;
    if (selected) openDetail(selected);
  }
}

async function renderDelivery(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const dashboard = await s.api.dashboard();
  const projects = dashboard.projects ?? [];
  if (projects.length === 0) {
    main.replaceChildren(textEl('div', 'dy-empty', 'Onboard a project to manage delivery.'));
    return;
  }
  const projectId = s.projectId && projects.some((p) => p.id === s.projectId)
    ? s.projectId
    : projects[0].id;
  s.projectId = projectId;
  const [initiativeResponse, workResponse, observationResponse] = await Promise.all([
    s.api.initiatives(projectId),
    s.api.workItems(projectId),
    s.api.observations(projectId),
  ]);
  if (isStale()) return;
  const initiatives = initiativeResponse.initiatives ?? [];
  const work = workResponse.work_items ?? [];
  const observations = new Map(
    (observationResponse.observations ?? []).map((row) => [row.initiative_ref, row]),
  );

  const toolbar = document.createElement('div');
  toolbar.className = 'dy-work-toolbar';
  const projectSelect = document.createElement('select');
  projectSelect.setAttribute('aria-label', 'Delivery project');
  projects.forEach((project) => {
    const option = textEl('option', '', project.id, project.id) as HTMLOptionElement;
    option.selected = project.id === projectId;
    projectSelect.appendChild(option);
  });
  projectSelect.addEventListener('change', () => {
    s.projectId = projectSelect.value;
    void renderDelivery(main, s, isStale);
  });
  toolbar.append(projectSelect);

  const list = document.createElement('div');
  list.className = 'dy-delivery-list';
  initiatives.forEach((initiative) => {
    const card = document.createElement('article');
    card.className = 'dy-card dy-delivery-card';
    card.append(
      textEl('h2', '', initiative.title),
      textEl('p', 'dy-dim', `${initiative.ref} · ${initiative.status}`),
      textEl('p', '', initiative.expected_outcome || 'No expected outcome supplied.'),
      textEl('p', '', `Execution board: ${initiative.board_slug || 'Not bound'}`),
    );
    const linked = work.filter((item) =>
      item.initiative_ref === initiative.ref);
    const links = document.createElement('div');
    links.className = 'dy-delivery-work';
    links.appendChild(textEl('h3', '', `Bound work (${linked.length})`));
    linked.forEach((item) => {
      const button = workLayoutButton(`${item.ref}: ${item.title}`, false);
      button.addEventListener('click', () => {
        s.projectId = projectId;
        s.selectedWorkRef = item.ref;
        (document.querySelector('[data-tab="work"]') as HTMLButtonElement)?.click();
      });
      links.appendChild(button);
    });
    card.appendChild(links);

    const observation = observations.get(initiative.ref);
    card.appendChild(textEl(
      'p',
      'dy-dim',
      observation
        ? `Observation: ${observation.status}${observation.cycle_id ? ` · cycle ${observation.cycle_id}` : ''}`
        : 'Observation: not scheduled',
    ));
    const actions = document.createElement('div');
    actions.className = 'dy-delivery-actions';
    const run = async (button: HTMLButtonElement, operation: () => Promise<unknown>) => {
      button.disabled = true;
      try {
        await operation();
        await renderDelivery(main, s, isStale);
      } catch {
        button.textContent = 'Action failed';
        button.disabled = false;
      }
    };
    if (initiative.status === 'pending_approval') {
      const approve = workLayoutButton('Approve and start execution', false);
      approve.addEventListener('click', () => void run(approve, () => s.api.approve(initiative.ref)));
      actions.appendChild(approve);
    }
    if (initiative.status === 'executing') {
      const complete = workLayoutButton('Complete with verified outcome', false);
      complete.addEventListener('click', () =>
        void run(complete, () => s.api.completeInitiative(initiative.ref, false)));
      const regress = workLayoutButton('Record regression', false);
      regress.addEventListener('click', () =>
        void run(regress, () => s.api.completeInitiative(initiative.ref, true)));
      actions.append(complete, regress);
    }
    if (observation?.status === 'pending') {
      const observe = workLayoutButton('Run observation cycle', false);
      observe.addEventListener('click', () =>
        void run(observe, () => s.api.runObservation(initiative.ref)));
      actions.appendChild(observe);
    }
    card.appendChild(actions);
    list.appendChild(card);
  });
  if (initiatives.length === 0) {
    list.appendChild(textEl('div', 'dy-empty', 'No initiatives for this project.'));
  }
  const section = document.createElement('section');
  section.append(toolbar, list);
  main.replaceChildren(section);
}

function workLayoutButton(labelText: string, active: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = `dy-btn${active ? ' active' : ''}`;
  button.textContent = labelText;
  return button;
}

function buildMilestonesPanel(
  s: AppState,
  projectId: string,
  items: WorkItem[],
  rerender: () => void,
): HTMLElement {
  const api = s.api;
  const box = document.createElement('details');
  box.className = 'dy-milestones';
  const summary = textEl('summary', '', 'Milestones');
  box.appendChild(summary);
  const body = textEl('div', 'dy-milestones-body', 'Loading milestones...');
  box.appendChild(body);

  const today = new Date().toISOString().slice(0, 10);

  const overdueClass = (m: { due?: string | null; closed?: boolean }): string =>
    !m.closed && m.due && m.due < today ? ' dy-milestone-overdue' : '';

  const drawRows = (rows: MilestoneSummary[]): void => {
    if (rows.length === 0) {
      body.replaceChildren(textEl('p', 'dy-dim', 'No milestones yet. Create one below.'));
      body.appendChild(creator);
      return;
    }
    const list = document.createElement('div');
    list.className = 'dy-milestone-list';
    for (const m of rows) {
      const row = document.createElement('div');
      row.className = 'dy-milestone-row' + overdueClass(m);
      const nameCell = textEl('span', 'dy-milestone-name', m.closed ? `${m.name} (closed)` : m.name);
      const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
      const bar = document.createElement('div');
      bar.className = 'dy-wf-progress';
      const fill = document.createElement('div');
      fill.className = 'dy-wf-progress-fill';
      fill.style.width = `${Math.min(100, pct)}%`;
      bar.appendChild(fill);
      const counts = textEl(
        'span', 'dy-dim', `${m.done} of ${m.total} done (${pct}%)`);
      const dueLabel = textEl('span', 'dy-dim', m.due ? `Due ${m.due}` : 'No due date');
      const attachSelect = document.createElement('select');
      attachSelect.setAttribute('aria-label', `Attach a task to ${m.name}`);
      attachSelect.appendChild(textEl('option', '', 'Attach a task...', ''));
      items
        .filter((item) => item.status !== 'done')
        .forEach((item) => {
          attachSelect.appendChild(
            textEl('option', '', `${item.ref}: ${item.title}`, item.ref) as HTMLOptionElement,
          );
        });
      const attachBtn = workLayoutButton('Attach', false);
      attachBtn.addEventListener('click', async () => {
        const ref = attachSelect.value;
        if (!ref) return;
        attachBtn.disabled = true;
        try {
          await api.attachMilestone(projectId, m.name, ref);
          rerender();
        } catch {
          attachBtn.textContent = 'Failed';
          attachBtn.disabled = false;
        }
      });
      const closeBtn = workLayoutButton(m.closed ? 'Reopen' : 'Close', false);
      closeBtn.addEventListener('click', async () => {
        closeBtn.disabled = true;
        try {
          await api.updateMilestone(projectId, m.name, { closed: !m.closed });
          rerender();
        } catch {
          closeBtn.textContent = 'Failed';
          closeBtn.disabled = false;
        }
      });
      row.append(nameCell, bar, counts, dueLabel, attachSelect, attachBtn, closeBtn);
      list.appendChild(row);
    }
    body.replaceChildren(list);
  };

  void api.milestones(projectId).then((response: { milestones: MilestoneSummary[] }) => {
    drawRows(response.milestones ?? []);
    body.appendChild(creator);
  }).catch(() => {
    body.textContent = 'Milestones are unavailable.';
  });

  const nameInput = workInput('New milestone name', '');
  const dueInput = workInput('Due date', '');
  dueInput.type = 'date';
  const createBtn = workLayoutButton('Create milestone', false);
  const feedback = textEl('p', 'dy-dim', '');
  createBtn.addEventListener('click', async () => {
    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      feedback.textContent = 'Enter a milestone name first.';
      return;
    }
    createBtn.disabled = true;
    feedback.textContent = 'Creating...';
    try {
      await api.createMilestone(projectId, nameVal, dueInput.value || null);
      feedback.textContent = 'Created.';
      rerender();
    } catch {
      feedback.textContent = 'Create failed (name may already exist).';
      createBtn.disabled = false;
    }
  });
  const creator = document.createElement('div');
  creator.className = 'dy-milestone-create';
  creator.append(nameInput, dueInput, createBtn, feedback);
  return box;
}

function workInput(labelText: string, value: string): HTMLInputElement {
  const input = document.createElement('input');
  input.setAttribute('aria-label', labelText);
  input.value = value;
  return input;
}

function workLink(item: WorkItem, open: (item: WorkItem) => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'dy-work-link';
  button.textContent = item.title;
  button.addEventListener('click', () => open(item));
  return button;
}

function workCard(item: WorkItem, open: (item: WorkItem) => void): HTMLElement {
  const card = document.createElement('article');
  card.className = `dy-work-card${item.status === 'blocked' ? ' blocked' : ''}`;
  card.append(
    workLink(item, open),
    textEl('span', 'dy-dim', `${item.ref} · ${item.assignee || 'Unassigned'}`),
  );
  return card;
}

async function renderInbox(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.inbox();
  const items = view.items ?? [];
  if (isStale()) return;  // guard BEFORE any DOM write, including empty states
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dy-empty';
    empty.appendChild(textEl('p', '', 'Inbox zero. Nothing is waiting on you.'));
    main.replaceChildren(empty);
    return;
  }
  const list = document.createElement('section');
  list.className = 'dy-card';
  list.appendChild(textEl('h2', '', 'Waiting on you'));
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'dy-inbox-item';
    const body = document.createElement('div');
    body.className = 'dy-inbox-main';
    body.append(
      textEl('span', 'dy-pill', String(it.kind)),
      textEl('strong', '', String(it.title)),
      textEl('span', 'dy-dim', `${it.project_id} · ${it.ref}`),
    );
    row.appendChild(body);
    if (it.kind === 'approval') {
      const btn = document.createElement('button');
      btn.className = 'dy-btn primary';
      btn.textContent = 'Approve';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await s.api.approve(it.ref);
          row.remove();
          if (!list.querySelector('.dy-inbox-item')) {
            list.appendChild(textEl('p', 'dy-dim', 'Inbox zero.'));
          }
        } catch (e) {
          btn.disabled = false;
          btn.textContent = `Failed: ${String(e).slice(0, 60)}`;
        }
      });
      row.appendChild(btn);
    }
    list.appendChild(row);
  });
  main.replaceChildren(list);
}

async function renderNotifications(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.notifications();
  const notes = view.notifications ?? [];
  if (isStale()) return;  // guard BEFORE any DOM write, including empty states
  if (notes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dy-empty';
    empty.appendChild(textEl('p', '', 'No notifications.'));
    main.replaceChildren(empty);
    return;
  }
  const list = document.createElement('section');
  list.className = 'dy-card';
  list.appendChild(textEl('h2', '', 'Notifications'));
  notes.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'dy-note';
    row.appendChild(textEl('span', '', String(n.summary ?? n.title ?? '')));
    if (!n.acked_at && n.id != null) {
      const btn = document.createElement('button');
      btn.className = 'dy-btn';
      btn.textContent = 'Acknowledge';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await s.api.ack(Number(n.id));
          row.classList.add('acked');
        } catch (e) {
          btn.disabled = false;
          btn.textContent = `Failed: ${String(e).slice(0, 60)}`;
        }
      });
      row.appendChild(btn);
    }
    list.appendChild(row);
  });
  main.replaceChildren(list);
}

function renderOnboard(main: HTMLElement, s: AppState): void {
  const section = document.createElement('section');
  section.className = 'dy-card dy-form';
  section.appendChild(textEl('h2', '', 'Onboard a project'));

  const idLabel = label('Project ID');
  idLabel.appendChild(inputEl('dy-ob-id', 'e.g. hermes-core'));

  const repoLabel = label('Repo path');
  repoLabel.appendChild(inputEl('dy-ob-repo', '/home/kensei/repos/…'));

  const missionLabel = label('Mission');
  missionLabel.appendChild(inputEl('dy-ob-mission', 'What is this project for?'));

  const leadLabel = label('Lead profile');
  const select = document.createElement('select');
  select.id = 'dy-ob-lead';
  for (const profile of ['octacon', 'remii', 'wesker', 'ceecee', 'gojo', 'quan']) {
    select.appendChild(textEl('option', '', profile, profile));
  }
  leadLabel.appendChild(select);

  const go = document.createElement('button');
  go.className = 'dy-btn primary';
  go.id = 'dy-ob-go';
  go.textContent = 'Enable project';

  const result = document.createElement('p');
  result.id = 'dy-ob-result';
  result.className = 'dy-dim';

  go.addEventListener('click', async () => {
    const body = {
      project_id: (main.querySelector('#dy-ob-id') as HTMLInputElement).value.trim(),
      repo_path: (main.querySelector('#dy-ob-repo') as HTMLInputElement).value.trim(),
      mission: (main.querySelector('#dy-ob-mission') as HTMLInputElement).value.trim(),
      lead_profile: (main.querySelector('#dy-ob-lead') as HTMLSelectElement).value,
    };
    if (!body.project_id || !body.repo_path || !body.mission) {
      result.textContent = 'All fields are required.';
      return;
    }
    try {
      await s.api.onboard(body);
      result.textContent = `Project "${body.project_id}" enabled.`;
    } catch (e) {
      result.textContent = `Onboarding failed: ${String(e).slice(0, 120)}`;
    }
  });

  section.append(idLabel, repoLabel, missionLabel, leadLabel, go, result);
  main.replaceChildren(section);
}

// ---- helpers ----
// textEl builds an element and sets its textContent (inert by construction).
function textEl(
  tag: string,
  className: string,
  text: string,
  value?: string,
): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  if (value !== undefined && el instanceof HTMLOptionElement) el.value = value;
  return el;
}
function loadingEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'dy-loading';
  el.textContent = 'Loading…';
  return el;
}

// Read-only workflow canvas view: pick a project + workflow name, then mount
// the SVG canvas. Gate nodes expose Approve/Reject wired to existing endpoints.
async function renderWorkflow(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.dashboard();
  const projects = view.projects ?? [];
  if (isStale()) return;
  if (projects.length === 0) {
    main.replaceChildren(
      textEl('div', 'dy-empty', 'Onboard a project to view workflows.'),
    );
    return;
  }

  const controls = document.createElement('div');
  controls.className = 'dy-wf-controls';

  const projectSel = document.createElement('select');
  projectSel.className = 'dy-select';
  for (const p of projects) {
    const opt = textEl(
      'option',
      '',
      `${p.id} · ${p.health ?? 'unknown'}`,
      p.id,
    ) as HTMLOptionElement;
    projectSel.appendChild(opt);
  }
  const nameInput = document.createElement('input');
  nameInput.className = 'dy-input';
  nameInput.placeholder = 'workflow name';
  nameInput.value = 'main';
  const go = document.createElement('button');
  go.className = 'dy-btn primary';
  go.textContent = 'Render';

  const canvasHost = document.createElement('div');
  canvasHost.className = 'dy-wf-host';

  controls.append(
    textEl('span', 'dy-dim', 'Project'),
    projectSel,
    textEl('span', 'dy-dim', 'Workflow'),
    nameInput,
    go,
  );
  main.replaceChildren(controls, canvasHost);

  let dispose: (() => void) | null = null;
  const load = () => {
    if (dispose) dispose();
    const pid = projectSel.value;
    const wname = nameInput.value.trim() || 'main';
    dispose = mountWorkflowCanvas(
      canvasHost,
      pid,
      wname,
      () => s.api.workflowRuns(pid, wname).then((r) => r.runs),
      {
        onApprove: (ref) => s.api.approve(ref),
        onReject: (ref) => s.api.reject(ref),
        // agenttrail expansion: children -> task list, history -> activity thread
        onExpand: async (ref) => {
          const d = await s.api.workDetail(pid, ref);
          return {
            children: (d.children ?? []).map((c) => ({
              ref: c.ref,
              title: c.title,
              status: c.status,
              assignee: c.assignee ?? null,
            })),
            history: (d.history ?? []).map((h) => {
              const rec = h as Record<string, unknown>;
              return {
                ts: (rec.at ?? rec.ts ?? rec.created_at ?? null) as string | number | null,
                text: String(rec.summary ?? rec.text ?? rec.message ?? rec.action ?? 'event'),
              };
            }),
          };
        },
      },
    );
    (canvasHost as unknown as { dyDispose?: () => void }).dyDispose = dispose;
  };
  go.addEventListener('click', load);
  load();
}

function label(text: string): HTMLLabelElement {
  const el = document.createElement('label');
  el.textContent = text;
  return el;
}
function inputEl(id: string, placeholder: string): HTMLInputElement {
  const el = document.createElement('input');
  el.id = id;
  el.placeholder = placeholder;
  return el;
}
