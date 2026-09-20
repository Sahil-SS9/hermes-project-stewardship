// Shared Desktop seam for the production Dashboard canvas.
// Keep this adapter data-only: Desktop does not invent or persist graph state.
import { mountWorkflowCanvas } from '../dashboard/src/workflow-canvas.ts'

const toCanvasNode = (node) => ({
  node_id: node.node_id ?? node.id,
  title: node.title ?? node.name ?? node.id,
  depends_on: node.depends_on ?? [],
  human_gate: Boolean(node.human_gate),
  task_ref: node.task_ref ?? null,
  kind: node.kind ?? (node.human_gate ? 'gate' : 'task'),
  status: node.status ?? null,
  assignee: node.assignee ?? null,
  phase_team: node.phase_team ?? null,
  evidence_refs: node.evidence_refs ?? [],
  canvas_position: node.canvas_position ?? undefined,
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
