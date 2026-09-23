// Shared Desktop seam for the production Dashboard canvas.
// Keep this adapter data-only: Desktop does not invent or persist graph state.
import { mountWorkflowCanvas, validateConnection } from '../dashboard/src/workflow-canvas.ts'
// Re-export the canonical connection validator so plugin.js toolbar actions
// (Validate) answer with the SAME cycle/self-dependency rules the canvas
// enforces on a drag — one implementation, not a second copy in the plugin.
export { validateConnection }

const toCanvasNode = (node) => ({
  node_id: node.node_id ?? node.id,
  title: node.title ?? node.name ?? node.id,
  depends_on: node.depends_on ?? [],
  human_gate: Boolean(node.human_gate),
  task_ref: node.task_ref ?? null,
  kind: node.kind ?? (node.human_gate ? 'gate' : 'task'),
  status: node.status ?? null,
  assignee: node.assignee ?? null,
  // The run projection's resolved assignment. Dropping it collapsed every
  // lane band to 'unassigned' on the Desktop surface, so the canvas could
  // never group by the real roster (the Dashboard half reads it directly).
  team: node.team ?? null,
  phase_team: node.phase_team ?? null,
  evidence_refs: node.evidence_refs ?? [],
  canvas_position: node.canvas_position ?? undefined,
  // Graph-shape modifiers the run projection already returns. Dropping them
  // collapsed a conditional branch and a bounded loop onto the plain-task
  // silhouette, so two of the four node purposes could never appear on the
  // Desktop surface. Data only — this adapter still invents no graph state.
  when: node.when ?? null,
  loop: node.loop ?? null,
})

const toCanvasRun = (run) => ({
  run_key: run.run_key,
  version: Number(run.version ?? 0),
  status: run.status ?? 'unknown',
  started_at: run.started_at ?? null,
  updated_at: run.updated_at ?? null,
  nodes: (run.nodes ?? []).map(toCanvasNode),
})

export function mountDesktopWorkflowCanvas(host, projectId, workflowName, definition, runs, handlers = {}) {
  const nodes = (definition?.nodes ?? []).map(toCanvasNode)
  const fetchRuns = async () => {
    const mapped = (runs ?? []).map(toCanvasRun)
    return mapped.length ? mapped : [{ run_key: `definition:${workflowName}`, version: 0, status: 'definition', started_at: null, updated_at: null, nodes }]
  }
  return mountWorkflowCanvas(host, projectId, workflowName, fetchRuns, {
    onApprove: handlers.onApprove ?? (() => undefined),
    onReject: handlers.onReject ?? (() => undefined),
    onRetry: handlers.onRetry,
    onExpand: handlers.onExpand,
    onEdit: handlers.onEdit,
  }, handlers.pollMs ?? 60000)
}

export { toCanvasNode, toCanvasRun }
