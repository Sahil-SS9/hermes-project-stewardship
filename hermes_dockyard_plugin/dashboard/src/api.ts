// Typed wrappers over the host SDK for the Dockyard plugin backend.
import type { ObjectiveView } from './objective-evidence';
export interface HermesPluginSDK {
  readonly sdkVersion: string;
  React: any;
  hooks: Record<string, any>;
  api: Record<string, (...args: any[]) => any>;
  fetchJSON: <T = any>(url: string, init?: RequestInit, opts?: { allowUnauthorized?: boolean }) => Promise<T>;
}

const BASE = '/api/plugins/hermes-dockyard';

export interface PortfolioProject {
  project_id: string;
  enabled?: boolean;
  phase?: string;
  status: 'on_track' | 'at_risk' | 'stalled' | 'idle';
  items: { total: number; done: number; blocked: number; overdue: number };
  next_milestone?: { name: string; due: string | null; overdue: boolean } | null;
  last_activity?: string | null;
  evidence_freshness_days?: number | null;
}

// P6.1/P6.2/P6.4: Fleet groups derived from existing records; every row
// carries cause/owner/next-action evidence and an exact deep link.
export interface FleetGroupItem {
  kind: string;
  cause?: string;
  project: string;
  ref?: string;
  title: string;
  risk?: string;
  detail?: string;
  owner?: string;
  age_days?: number;
  next_action?: string;
  severity?: string;
  created_at?: string;
  deep_link: string;
}

export interface FleetGroups {
  decisions: FleetGroupItem[];
  interventions: FleetGroupItem[];
  informational: FleetGroupItem[];
}

export interface PortfolioView {
  mix: { todo: number; in_progress: number; blocked: number; done: number };
  attention: { overdue_items: number; blocked_items: number; overdue_milestones: number };
  projects: PortfolioProject[];
  groups?: FleetGroups;
}

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

export interface DecisionPayload {
  action: 'approve';
  project_id: string;
  initiative_ref: string;
  title: string;
  proposer: string | number;
  risk: string;
  reason: string;
  expected_outcome: string;
  validation: { contract: Record<string, unknown>; links: string[]; age: string };
  authority: { granted: string; scope: string[] };
  revision: number;
  fingerprint: string;
}

export interface InboxItem {
  kind: 'initiative_approval' | 'project_attention';
  ref: string;
  project: string;
  title: string;
  risk?: string;
  deep_link?: string;
}

export interface InboxView {
  items: InboxItem[];
}

export interface NotificationItem {
  id?: number | string;
  summary?: string;
  title?: string;
  acked_at?: string | null;
  acked?: boolean;
  deep_link?: string;
  project?: string;
  severity?: string;
  kind?: string;
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
    objectives: (project: string) => get<{objectives: ObjectiveView[]}>(`/projects/${encodeURIComponent(project)}/objectives`),
    recordAssessment: (project: string, id: number, body: {passed: boolean; evidence: string[]; detail: string; expires_at: string | null}) => post(`/projects/${encodeURIComponent(project)}/objectives/${id}/assessment`, body),
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
    portfolio: () => get<PortfolioView>('/portfolio'),
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
    // P7.1/P7.2: host-driven discovery + host-validated preflight.
    discover: () =>
      get<{
        projects: Array<{ id: string; slug: string; name: string; board_slug: string; repo_path: string }>;
        profiles: Array<{ name: string; is_default: boolean }>;
      }>('/onboard/discover'),
    preflight: (b: { project_id: string; repo_path: string; mission: string; lead_profile: string }) =>
      post<{
        validated: Record<string, string>;
        existing: { projects: Array<Record<string, string>>; profiles: Array<{ name: string }> };
        mode: 'connect_existing' | 'create_new';
        suggestions: Array<{ name: string; evaluator_type: string; target: string; severity: string; description: string; suggested_file: string }>;
        preview: {
          governance_project_id: string;
          canonical_board: string;
          canonical_project_slug: string;
          lead_profile: string;
          repo_path: string;
          objectives_store: string;
          schedules_enabled: boolean;
          future_execution_enabled: boolean;
          first_action: string;
        };
      }>('/onboard/preflight', b),
    addObjective: (projectId: string, body: { name: string; evaluator_type: string; target: string; severity: string; description: string }) =>
      post(`/projects/${encodeURIComponent(projectId)}/objectives`, {
        ...body,
        actor: 'sahil',
        interface: 'dockyard:human',
      }),
    // P7.6: onboarding completion action — the first read-only assessment.
    firstAssessment: (projectId: string) =>
      post<{
        project: string;
        assessment: {
          cycle_id: number | null;
          verification_ok: boolean | null;
          health_state: string | null;
          objective_results: Array<Record<string, unknown>>;
          initiatives_created: number;
        };
        schedules_enabled: boolean;
        next: string;
      }>(`/projects/${encodeURIComponent(projectId)}/first-assessment`, {}),
    decision: (ref: string) =>
      get<DecisionPayload>(`/initiatives/${encodeURIComponent(ref)}/decision`),
    decisionReceipts: (ref: string) =>
      get<{ receipts: Array<Record<string, unknown>> }>(
        `/initiatives/${encodeURIComponent(ref)}/decision/receipts`,
      ),
    approve: (ref: string, payload: { expected_fingerprint: string; note?: string }) =>
      post(`/initiatives/${encodeURIComponent(ref)}/approve`, payload),
    reject: (ref: string, payload: { expected_fingerprint: string; reason: string; note?: string }) =>
      post(`/initiatives/${encodeURIComponent(ref)}/reject`, payload),
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
