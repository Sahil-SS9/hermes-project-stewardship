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
  labels?: string[];
  evidence_refs?: string[];
  estimate_days?: number | null;
  due?: string | null;
  initiative_ref?: string | null;
}

export interface WorkDetail {
  work_item: WorkItem;
  parent: WorkItem | null;
  children: WorkItem[];
  dependencies: WorkItem[];
  dependents: WorkItem[];
  history: Array<Record<string, unknown>>;
}

export interface MilestoneSummary {
  name: string;
  due?: string | null;
  closed?: boolean;
  total: number;
  done: number;
  created_at?: string | null;
}

export interface Initiative {
  ref: string;
  project_id: string;
  title: string;
  status: string;
  expected_outcome?: string | null;
  board_slug?: string | null;
}

export interface Observation {
  initiative_ref: string;
  project_id: string;
  status: string;
  cycle_id?: number | null;
  regressed: number | boolean;
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
  const patch = <T,>(path: string, body: unknown): Promise<T> =>
    sdk.fetchJSON(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });

  return {
    health: () => get<{ ok: boolean }>('/health'),
    features: (projectId: string) =>
      get<{ features: Record<string, boolean> }>(
        `/projects/${encodeURIComponent(projectId)}/features`,
      ),
    updateFeatures: (projectId: string, features: Record<string, boolean>) =>
      patch<{ features: Record<string, boolean> }>(
        `/projects/${encodeURIComponent(projectId)}/features`,
        { features, actor: 'sahil', interface: 'dockyard:human' },
      ),
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
    updateWork: (projectId: string, ref: string, changes: Record<string, unknown>) =>
      patch<WorkItem>(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}`,
        changes,
      ),
    assignWork: (projectId: string, ref: string, assigneeId: string | null) =>
      post<WorkItem>(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/assign`,
        { assignee_id: assigneeId },
      ),
    addDependency: (projectId: string, ref: string, dependencyRef: string) =>
      post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/dependencies`,
        { dependency_ref: dependencyRef },
      ),
    removeDependency: (projectId: string, ref: string, dependencyRef: string) =>
      post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/dependencies/${encodeURIComponent(dependencyRef)}/remove`,
        {},
      ),
    milestones: (projectId: string) =>
      get<{ milestones: MilestoneSummary[] }>(
        `/projects/${encodeURIComponent(projectId)}/milestones`,
      ),
    createMilestone: (projectId: string, name: string, due: string | null) =>
      post<{ id: number; name: string }>(
        `/projects/${encodeURIComponent(projectId)}/milestones`,
        { name, due, actor_id: 'sahil', actor_kind: 'human' },
      ),
    updateMilestone: (
      projectId: string,
      name: string,
      changes: { due?: string | null; closed?: boolean },
    ) =>
      patch<MilestoneSummary>(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}`,
        { ...changes, actor_id: 'sahil', actor_kind: 'human' },
      ),
    attachMilestone: (projectId: string, name: string, ref: string) =>
      post(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}/attach`,
        { ref, actor_id: 'sahil', actor_kind: 'human' },
      ),
    views: (projectId: string) =>
      get<{ views: Array<{ name: string; layout: string; filters?: Record<string, unknown> }> }>(
        `/projects/${encodeURIComponent(projectId)}/views?actor_id=sahil`,
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
    reject: (ref: string) => post(`/initiatives/${encodeURIComponent(ref)}/reject`, {}),
    workflowRuns: (projectId: string, name: string) =>
      get<{
        runs: Array<{
          run_key: string;
          version: number;
          status: string;
          started_at: string | null;
          updated_at: string | null;
          nodes: Array<{
            node_id: string;
            title: string;
            depends_on: string[];
            human_gate: boolean;
            task_ref: string | null;
            kind: 'task' | 'gate';
            status: string | null;
            assignee: string | null;
            evidence_refs: string[];
          }>;
        }>;
      }>(`/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(name)}/runs`),
    initiatives: (projectId: string) =>
      get<{ initiatives: Initiative[] }>(
        `/projects/${encodeURIComponent(projectId)}/initiatives`,
      ),
    observations: (projectId: string) =>
      get<{ observations: Observation[] }>(
        `/projects/${encodeURIComponent(projectId)}/observations`,
      ),
    completeInitiative: (ref: string, regressed: boolean) =>
      post(`/initiatives/${encodeURIComponent(ref)}/complete`, {
        verified: !regressed,
        regressed,
      }),
    runObservation: (ref: string) =>
      post(`/observations/${encodeURIComponent(ref)}/run`, {}),
    ack: (id: number) => post(`/notifications/${id}/ack`, {}),
  };
}

export type Api = ReturnType<typeof createApi>;

export function getSDK(): HermesPluginSDK | null {
  const sdk = (window as any).__HERMES_PLUGIN_SDK__;
  if (!sdk || typeof sdk.fetchJSON !== 'function') return null;
  return sdk;
}
