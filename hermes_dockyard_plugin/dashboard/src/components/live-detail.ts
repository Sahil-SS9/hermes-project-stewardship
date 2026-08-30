// Shared UI pieces for "live detail" surfaces (agenttrail expansion pattern).
// Used by: Workflows passport, bot cards, Dashboard live panel.
// Locked constraint: no innerHTML / eval / storage — createElement + textContent only.

export interface ThreadItem {
  ts?: string | number | null;
  text: string;
  kind?: string | null;
}

// Rolling activity thread. Optionally decays: items fade with age.
export function buildActivityThread(
  items: ThreadItem[],
  opts: { decay?: boolean; max?: number } = {},
): HTMLElement {
  const max = opts.max ?? 8;
  const wrap = document.createElement('div');
  wrap.className = 'dy-activity-thread';
  const list = items.slice(0, max);
  list.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'dy-activity-item';
    if (opts.decay) row.style.opacity = String(Math.max(0.25, 1 - i * 0.13));
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
  });
  if (list.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dy-dim';
    empty.textContent = 'No recent activity.';
    wrap.appendChild(empty);
  }
  return wrap;
}

export interface MiniTask {
  ref: string;
  title: string;
  status?: string | null;
}

// Compact sub-task checklist with status ticks and deep links.
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
    label.textContent = t.title;
    li.append(mark, label);
    if (onOpen) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => onOpen(t.ref));
    }
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  return wrap;
}