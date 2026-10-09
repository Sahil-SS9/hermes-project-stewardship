# ADR-008 — Planning canvas evidence model

- Status: Accepted for Phase 8 implementation
- Date: 2026-09-20
- Scope: HPS Phase 8A/8B

## Context

The planning canvas must accept scattered project information and help a user turn it into a defensible plan. The existing prototype's visual primitives are useful, but a four-type visual vocabulary alone does not express evidence, claims, questions, decisions or provenance. The existing workflow canvas is an executable workflow surface and is not the planning-canvas data model.

## Decision

Use a semantic evidence graph rendered through canvas objects.

Canonical semantic records:

1. Evidence — a note, URL, image/screenshot, video/file, document/file, or extracted text/transcript reference.
2. Insight/Claim — a human or AI-derived statement linked to one or more evidence records.
3. Question/Decision — an unresolved question or recorded answer/decision linked to evidence and claims.
4. Plan Block — an approved or draft requirement, journey, edge case, architecture item, implementation step or acceptance criterion.

Visual primitives are views, not competing truths:

- note/text card
- link/evidence card
- media/file card
- claim/insight card
- question/decision card
- plan-block card
- frame as visual grouping only
- typed connector

Allowed connector meanings:

- supports
- contradicts
- derived_from
- clarifies
- depends_on
- implements
- raises_question

Canvas objects reference canonical evidence and work; they do not copy canonical work records. Deleting a canvas reference must not delete its evidence or canonical work. Binary content uses the existing project-content ownership, validation, checksum and removal/quarantine contract.

Every mutable canvas document is project-scoped and revisioned. Writes carry the expected revision and fail with a conflict on stale state. AI results are proposal records with source IDs, context fingerprint, provider/model identity and status; they never directly mutate canvas, plans, backlog or workflows.

## Quality-attribute scenarios

### Data integrity

- Stimulus: a user removes a visual reference to a file or canonical work item.
- Response: only the canvas reference is removed; the evidence/work record remains readable.
- Measure: readback confirms the referenced record and its audit/provenance remain present.

### Concurrency

- Stimulus: two clients save different changes to the same canvas revision.
- Response: exactly one write succeeds; the stale write receives a typed conflict and no partial mutation.
- Measure: revision and object graph have one winner, with no lost update.

### AI safety

- Stimulus: an AI proposal contains a malformed action, prompt injection-derived instruction or stale object reference.
- Response: the proposal is retained as failed/rejected and no canonical mutation occurs.
- Measure: zero unauthorised writes; audit record contains the proposal outcome and reason.

### Human control

- Stimulus: a user reviews a generated plan block or promotion proposal.
- Response: approve/reject is explicit and requires trusted human authority; rejection leaves canonical state unchanged.
- Measure: approved items have provenance and read back from the canonical owner; rejected items have no side effect.

## Consequences

Positive:

- Arbitrary evidence can be captured without forcing every input into a task.
- AI has a structured, provenance-preserving context rather than an untyped pile of cards.
- The same evidence graph can render workflow, journey, edge-case and technical lenses.
- Canonical Hermes work ownership is preserved.
- Stale writes, replay and approval boundaries are testable.

Negative:

- The data model is more deliberate than the original sticky/task/link/frame prototype.
- Media ingestion and extraction require storage limits, metadata and failure states.
- AI synthesis must maintain proposal, question and draft history rather than overwriting text.
- The UI needs clear distinctions between scratch, evidence, derived claims and approved plan blocks.
- Phase 8 is larger than a visual-canvas implementation and is therefore split into 8A and 8B.

## References

- `planning-canvas-research-findings.md` (the maintainer's research notes; not in this repository)
- `HPS-Implementation-Plan.md` Phase 8 (the maintainer's plan; not in this repository)
- `/tmp/dockyard-ux-research/canvas/preview/canvas.js`
- `https://tldraw.dev/docs/assets`
- `https://help.miro.com/hc/en-us/articles/20970362792210-Miro-AI-reference`
- `https://help.figma.com/hc/en-us/articles/18711926790423-Sort-and-summarize-stickies-with-FigJam-AI`
