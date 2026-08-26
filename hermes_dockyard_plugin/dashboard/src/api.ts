// Typed wrappers over the host SDK for the Dockyard plugin backend.
export interface HermesPluginSDK {
  readonly sdkVersion: string;
  React: any;
  hooks: Record<string, any>;
  api: Record<string, (...args: any[]) => any>;
  fetchJSON: <T = any>(url: string, init?: RequestInit, opts?: { allowUnauthorized?: boolean }) => Promise<T>;
}

const BASE = '/api/plugins/hermes-dockyard';

export interface DashboardView {
  projects: Array<{
    id: string;
    enabled?: boolean;
    phase?: string;
    health?: string | null;
    work?: { backlog?: number; active?: number; done?: number; blocked?: number };
    unacked_notifications?: number;
  }>;
  owed_decisions?: number;
  totals?: {
    active_work?: number;
    blocked?: number;
    stuck_bots?: number;
    unacked_notifications?: number;
  };
}

export interface InboxItem {
  kind: string;          // 'approval' | 'attention' ...
  ref: string;
  project_id: string;
  title: string;
  deep_link?: Record<string, string>;
}

export interface InboxView {
  items: InboxItem[];
}

export interface NotificationItem {
  id?: number | string;
  summary?: string;
  title?: string;
  acked_at?: string | null;
}

export interface WorkItem {
  id: string;
  ref: string;
  title: string;
  body?: string | null;
  status: string;
  canonical_status?: string;
  kind?: string;
  assignee?: string | null;
  parent_task_id?: string | null;
  blocked_reason?: string | null;
  priority_rank?: number | null;
  priority_reason?: string | null;
}

export interface WorkDetail {
  work_item: WorkItem;
  parent: WorkItem | null;
  children: WorkItem[];
  history: Array<Record<string, unknown>>;
}

export function createApi(sdk: HermesPluginSDK) {
  const get = <T,>(path: string): Promise<T> => sdk.fetchJSON(`${BASE}${path}`);
  const post = <T,>(path: string, body: unknown): Promise<T> =>
    sdk.fetchJSON(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  const put = <T,>(path: string, body: unknown): Promise<T> =>
    sdk.fetchJSON(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });

  return {
    health: () => get<{ ok: boolean }>('/health'),
    dashboard: () => get<DashboardView>('/dashboard'),
    inbox: () => get<InboxView>('/inbox'),
    notifications: () => get<{ notifications: NotificationItem[] }>('/notifications'),
    workItems: (projectId: string) =>
      get<{ work_items: WorkItem[] }>(
        `/projects/${encodeURIComponent(projectId)}/work-items`,
      ),
    backlog: (projectId: string) =>
      get<{ backlog: Array<{ item_ref: string; rank: number; priority_reason?: string | null }> }>(
        `/projects/${encodeURIComponent(projectId)}/backlog`,
      ),
    workDetail: (projectId: string, ref: string) =>
      get<WorkDetail>(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}`,
      ),
    views: (projectId: string) =>
      get<{ views: Array<{ name: string; layout: string; filters?: Record<string, unknown> }> }>(
        `/projects/${encodeURIComponent(projectId)}/views`,
      ),
    saveView: (projectId: string, name: string, layout: 'board' | 'table') =>
      put(`/projects/${encodeURIComponent(projectId)}/views`, {
        name,
        layout,
        filters: {},
        shared: false,
      }),
    onboard: (b: { project_id: string; repo_path: string; mission: string; lead_profile: string }) =>
      post('/onboard', b),
    approve: (ref: string) => post(`/initiatives/${encodeURIComponent(ref)}/approve`, {}),
    ack: (id: number) => post(`/notifications/${id}/ack`, {}),
  };
}

export type Api = ReturnType<typeof createApi>;

export function getSDK(): HermesPluginSDK | null {
  const sdk = (window as any).__HERMES_PLUGIN_SDK__;
  if (!sdk || typeof sdk.fetchJSON !== 'function') return null;
  return sdk;
}
