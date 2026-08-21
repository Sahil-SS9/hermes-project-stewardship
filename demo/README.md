# Demo — Project Stewardship in action

Two ways to see the ownership loop run:

## 1. Live scripted demo (terminal)

```bash
python demo/run_demo.py
```

A 5-act story against a throwaway repo: assign once → quiet day proves
zero busywork → incident detected & proposed → approved from Discord →
Kanban execution → outcome measured → prompt-injection attack fails
closed → recovery. Deterministic; runs in seconds.

## 2. Interactive dashboard (point-and-click)

Open `demo/dashboard.html` in any browser. Seven clickable stages with the
same story, terminal transcripts, and the Kanban board view.
Arrow keys work.

## What to watch for

| Moment | Why it matters |
|---|---|
| Act 2: zero proposals on a healthy day | Anti-busywork: NO_ACTION_REQUIRED is success |
| Approval from Discord | Permission binding + audit attribution + idempotency |
| Outcome check after the fix | Completion measured against objectives, not task ticks |
| README injection | Fail-closed: CRITICAL + freeze, content never becomes authority |
| Recovery | Trust restored by evidence, never by promise |
