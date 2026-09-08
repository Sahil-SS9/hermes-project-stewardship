import type { Api } from './api';

export interface ObjectiveView {
  id: number; name: string; target: string; window: string;
  evaluator_type: string; enabled?: boolean; can_record_assessment?: boolean;
  evidence?: { state: string; detail: string; evidence_age_seconds: number | null;
    sample_count: number; pass_rate: number | null; history: Array<Record<string, unknown>> };
}

export async function renderObjectiveEvidence(root: HTMLElement, api: Api, project: string): Promise<void> {
  const text = (tag: string, value: string): HTMLElement => {
    const node = document.createElement(tag); node.textContent = value; return node;
  };
  root.dataset.objectiveEvidencePanel = project;
  root.replaceChildren(text('p', 'Loading objective evidence…'));
  try {
    const response = await api.objectives(project);
    root.replaceChildren(text('h3', `Objectives — ${project}`));
    if (!response.objectives.length) root.append(text('p', 'No objectives configured.'));
    for (const objective of response.objectives) {
      const evidence = objective.evidence;
      const state = objective.enabled === false ? 'not_applicable' : evidence?.state || 'unknown';
      const details = document.createElement('details');
      details.append(text('summary', `${objective.name} — ${state} — Evidence/history`));
      details.append(text('p', evidence?.detail || 'Insufficient data: no recorded evidence.'));
      details.append(text('p', `Target ${objective.target} · Window ${objective.window} · Evidence age ${evidence?.evidence_age_seconds == null ? 'unavailable' : Math.floor(evidence.evidence_age_seconds) + ' seconds'} · Samples ${evidence?.sample_count || 0} · Pass rate ${evidence?.pass_rate == null ? 'insufficient data' : Math.round(evidence.pass_rate * 100) + '%'}`));
      const list = document.createElement('ul');
      for (const sample of evidence?.history || []) {
        list.append(text('li', `${sample.recorded_at} · ${sample.state} · ${sample.verified_actor || 'objective evaluator'} · ${sample.detail || ''} · ${JSON.stringify(sample.evidence || sample.source_evidence || {})}`));
      }
      details.append(list);
      if (objective.evaluator_type === 'manual' && objective.enabled !== false) {
        if (!objective.can_record_assessment) details.append(text('p', 'Read-only: a dedicated authenticated human principal is required to record assessments.'));
        else {
          const form = document.createElement('form');
          const select = document.createElement('select');
          for (const state of ['passed', 'failed']) { const option = document.createElement('option'); option.value = state; option.textContent = state; select.append(option); }
          const resultLabel = text('label', 'Result '); resultLabel.append(select);
          const reference = document.createElement('input'); reference.required = true; reference.maxLength = 500;
          const label = text('label', 'Evidence reference '); label.append(reference);
          const note = document.createElement('input'); note.maxLength = 2000;
          const noteLabel = text('label', 'Assessment note '); noteLabel.append(note);
          const expiry = document.createElement('input'); expiry.type = 'datetime-local';
          const expiryLabel = text('label', 'Expires at (local time) '); expiryLabel.append(expiry);
          const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Record human assessment';
          const status = text('p', ''); status.setAttribute('role', 'status');
          form.append(resultLabel, label, noteLabel, expiryLabel, submit, status);
          form.addEventListener('submit', async event => {
            event.preventDefault(); if (submit.disabled) return; submit.disabled = true;
            try {
              await api.recordAssessment(project, objective.id, { passed: select.value === 'passed', evidence: [reference.value], detail: note.value, expires_at: expiry.value ? new Date(expiry.value).toISOString() : null });
              await renderObjectiveEvidence(root, api, project);
            } catch { status.textContent = 'Assessment not confirmed. Refresh evidence before retrying; check human authority.'; submit.disabled = false; }
          });
          details.append(form);
        }
      }
      root.append(details);
    }
  } catch {
    root.replaceChildren(text('p', 'Objective evidence unavailable.'));
    const retry = document.createElement('button'); retry.textContent = 'Retry evidence';
    retry.addEventListener('click', () => { void renderObjectiveEvidence(root, api, project); }); root.append(retry);
  }
}
