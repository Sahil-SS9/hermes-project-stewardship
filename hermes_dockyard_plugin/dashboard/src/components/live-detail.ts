// Shared UI pieces for "live detail" surfaces (agenttrail expansion pattern).
// Used by: Workflows passport, bot cards, Dashboard live panel.
// Locked constraint: no innerHTML / eval / storage — createElement + textContent only.

export interface ThreadItem {
  ts?: string | number | null;
  text: string;
  kind?: string | null;
}

// Rolling activity thread. With decay, items visibly fade on a wall-clock
// timer (agenttrail model) instead of being statically dimmed once. The
// animation runs for ~8s after mount, then stops — self-cleaning, no leaked
// intervals; reopening re-fades.
export function buildActivityThread(
  items: ThreadItem[],
  opts: { decay?: boolean; max?: number } = {},
): HTMLElement {
  const max = opts.max ?? 8;
  const wrap = document.createElement('div');
  wrap.className = 'dy-activity-thread';
  const list = items.slice(0, max);
  const rows: HTMLElement[] = [];
  list.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'dy-activity-item';
    row.style.opacity = opts.decay ? '1' : '';
    if (it.ts) {
      const t = document.createElement('span');
      t.className = 'dy-activity-time';
      const d = new Date(it.ts);
      t.textContent = isNaN(d.getTime())
        ? String(it.ts)
        : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      row.appendChild(t);
    }
    const body = document.createElement('span');
    body.textContent = it.text;
    row.appendChild(body);
    wrap.appendChild(row);
    rows.push(row);
  });
  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dy-dim';
    empty.textContent = 'No recent activity.';
    wrap.appendChild(empty);
  }
  // live decay: over ~8s, each row eases from full opacity to tiered dimness
  // (row depth sets the target), then the timer stops itself.
  if (opts.decay && rows.length) {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 8000); // 0..1
      let done = true;
      rows.forEach((row, i) => {
        const target = Math.max(0.3, 1 - i * 0.14);
        row.style.opacity = String(1 - (1 - target) * p);
        if (p < 1) done = false;
      });
      if (done) clearInterval(iv);
    }, 300);
  }
  return wrap;
}

export interface MiniTask {
  ref: string;
  title: string;
  status?: string | null;
  assignee?: string | null;
}

// Compact sub-task checklist with status ticks, assignees and deep links.
export function buildTaskListMini(
  tasks: MiniTask[],
  onOpen?: (ref: string) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'dy-tasklist';
  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dy-dim';
    empty.textContent = 'No sub-tasks.';
    wrap.appendChild(empty);
    return wrap;
  }
  const ul = document.createElement('ul');
  for (const t of tasks) {
    const li = document.createElement('li');
    li.className = 'dy-taskitem';
    const mark = document.createElement('span');
    mark.className = 'dy-taskmark ' + (t.status ?? 'pending');
    mark.textContent =
      t.status === 'done' ? '✓' : t.status === 'working' ? '◐' : t.status === 'blocked' ? '✕' : '○';
    const label = document.createElement('span');
    label.className = 'dy-tasklabel';
    label.textContent = t.title;
    li.append(mark, label);
    if (t.assignee) {
      const who = document.createElement('span');
      who.className = 'dy-taskassignee';
      who.textContent = t.assignee;
      li.appendChild(who);
    }
    if (onOpen) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => onOpen(t.ref));
    }
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}