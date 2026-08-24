// Dockyard plugin app shell: header + three panels (Dashboard, Inbox, Notifications)
// + onboarding form. Vanilla TS DOM, host React only for the registration wrapper.
import type { Api, HermesPluginSDK } from './api';
import { createApi } from './api';

interface AppState {
  api: Api;
  tab: 'dashboard' | 'inbox' | 'notifications' | 'onboard';
}

export function initApp(
  sdk: HermesPluginSDK,
  root: HTMLElement,
): () => void {
  const state: AppState = { api: createApi(sdk), tab: 'dashboard' };
  // cor-005/007: generation token — a newer render invalidates in-flight ones;
  // disposed flag lets the host unmount abort everything cleanly.
  let renderSeq = 0;
  let disposed = false;

  const render = async (
    main: HTMLElement,
    s: AppState,
  ): Promise<void> => {
    const gen = ++renderSeq;
    main.innerHTML = `<div class="dy-loading">Loading…</div>`;
    try {
      if (disposed || gen !== renderSeq) return;
      const stale = (): boolean =>
        disposed || gen !== renderSeq || !main.isConnected;
      if (s.tab === 'dashboard') await renderDashboard(main, s, stale);
      else if (s.tab === 'inbox') await renderInbox(main, s, stale);
      else if (s.tab === 'notifications')
        await renderNotifications(main, s, stale);
      else renderOnboard(main, s);
    } catch (err) {
      if (disposed || gen !== renderSeq || !main.isConnected) return;
      main.innerHTML = `<div class="dy-error">Dockyard backend unreachable: ${esc(String(err))}</div>`;
    }
  };

  root.innerHTML = '';
  root.className = 'dy-root';

  // ---- header ----
  const header = document.createElement('header');
  header.className = 'dy-header';
  header.innerHTML = `
    <div class="dy-brand">
      <span class="dy-mark" aria-hidden="true"></span>
      <h1>Hermes Dockyard</h1>
    </div>
    <nav class="dy-tabs" role="tablist">
      <button data-tab="dashboard" class="active" role="tab">Dashboard</button>
      <button data-tab="inbox" role="tab">Approval Inbox</button>
      <button data-tab="notifications" role="tab">Notifications</button>
      <button data-tab="onboard" role="tab">Onboard Project</button>
    </nav>`;
  root.appendChild(header);

  // ---- content ----
  const main = document.createElement('main');
  main.className = 'dy-main';
  root.appendChild(main);

  const tabs = Array.from(header.querySelectorAll('button[data-tab]'));
  tabs.forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = (b as HTMLElement).dataset.tab as AppState['tab'];
      tabs.forEach((x) => x.classList.toggle('active', x === b));
      void render(main, state);
    }),
  );

  void render(main, state);

  // cor-007: host-facing teardown — aborts in-flight renders and blocks new ones
  return () => {
    disposed = true;
    root.innerHTML = '';
  };
}

async function renderDashboard(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.dashboard();
  const projects = view.projects ?? [];
  if (projects.length === 0) {
    main.innerHTML = `<div class="dy-empty"><p>No projects yet.</p><button class="dy-btn" id="dy-go-onboard">Onboard your first project</button></div>`;
    main.querySelector('#dy-go-onboard')?.addEventListener('click', () => {
      (document.querySelector('[data-tab="onboard"]') as HTMLButtonElement)?.click();
    });
    return;
  }
  const totals = view.totals ?? {};
  const rows = projects
    .map((p) => {
      const w = p.work ?? {};
      return `<tr>
        <td><strong>${esc(String(p.id))}</strong></td>
        <td>${esc(String(p.phase ?? ''))}</td>
        <td class="num">${w.backlog ?? 0}</td>
        <td class="num">${w.active ?? 0}</td>
        <td class="num ${w.blocked ? 'warn' : ''}">${w.blocked ?? 0}</td>
        <td class="num">${w.done ?? 0}</td>
        <td>${esc(String(p.health ?? '—'))}</td>
      </tr>`;
    })
    .join('');
  if (isStale()) return;
  main.innerHTML = `
    <section class="dy-card">
      <h2>Fleet overview</h2>
      <table class="dy-table">
        <thead><tr><th>Project</th><th>Phase</th><th>Backlog</th><th>Active</th><th>Blocked</th><th>Done</th><th>Health</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="dy-dim">Stuck bots: ${totals.stuck_bots ?? 0} · Unacked notifications: ${totals.unacked_notifications ?? 0}</p>
    </section>`;
}

async function renderInbox(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.inbox();
  const items = view.items ?? [];
  if (items.length === 0) {
    main.innerHTML = `<div class="dy-empty"><p>Inbox zero. Nothing is waiting on you.</p></div>`;
    return;
  }
  if (isStale()) return;
  const list = document.createElement('section');
  list.className = 'dy-card';
  list.innerHTML = '<h2>Waiting on you</h2>';
  items.forEach((it) => {
    const row = buildRow('dy-inbox-item', `
      <div class="dy-inbox-main">
        <span class="dy-pill">${esc(it.kind)}</span>
        <strong>${esc(it.title)}</strong>
        <span class="dy-dim">${esc(it.project_id)} · ${esc(it.ref)}</span>
      </div>`);
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
            list.insertAdjacentHTML('beforeend', '<p class="dy-dim">Inbox zero.</p>');
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
  main.innerHTML = '';
  main.appendChild(list);
}

async function renderNotifications(
  main: HTMLElement,
  s: AppState,
  isStale: () => boolean,
): Promise<void> {
  const view = await s.api.notifications();
  const notes = view.notifications ?? [];
  if (notes.length === 0) {
    main.innerHTML = `<div class="dy-empty"><p>No notifications.</p></div>`;
    return;
  }
  if (isStale()) return;
  const list = document.createElement('section');
  list.className = 'dy-card';
  list.innerHTML = '<h2>Notifications</h2>';
  notes.forEach((n) => {
    const row = buildRow('dy-note', `<span>${esc(String(n.summary ?? n.title ?? ''))}</span>`);
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
  main.innerHTML = '';
  main.appendChild(list);
}

function renderOnboard(main: HTMLElement, s: AppState): void {
  main.innerHTML = `
    <section class="dy-card dy-form">
      <h2>Onboard a project</h2>
      <label>Project ID<input id="dy-ob-id" placeholder="e.g. hermes-core"/></label>
      <label>Repo path<input id="dy-ob-repo" placeholder="/home/kensei/repos/…"/></label>
      <label>Mission<input id="dy-ob-mission" placeholder="What is this project for?"/></label>
      <label>Lead profile<select id="dy-ob-lead">
        <option value="octacon">octacon</option><option value="remii">remii</option>
        <option value="wesker">wesker</option><option value="ceecee">ceecee</option>
        <option value="gojo">gojo</option><option value="quan">quan</option>
      </select></label>
      <button class="dy-btn primary" id="dy-ob-go">Enable project</button>
      <p id="dy-ob-result" class="dy-dim"></p>
    </section>`;
  main.querySelector('#dy-ob-go')?.addEventListener('click', async () => {
    const body = {
      project_id: (main.querySelector('#dy-ob-id') as HTMLInputElement).value.trim(),
      repo_path: (main.querySelector('#dy-ob-repo') as HTMLInputElement).value.trim(),
      mission: (main.querySelector('#dy-ob-mission') as HTMLInputElement).value.trim(),
      lead_profile: (main.querySelector('#dy-ob-lead') as HTMLSelectElement).value,
    };
    const out = main.querySelector('#dy-ob-result') as HTMLElement;
    if (!body.project_id || !body.repo_path || !body.mission) {
      out.textContent = 'All fields are required.';
      return;
    }
    try {
      await s.api.onboard(body);
      out.textContent = `Project "${body.project_id}" enabled.`;
    } catch (e) {
      out.textContent = `Onboarding failed: ${String(e).slice(0, 120)}`;
    }
  });
}

// ---- helpers ----
function buildRow(className: string, html: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = className;
  row.innerHTML = html;
  return row;
}
function esc(v: string): string {
  return v.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

