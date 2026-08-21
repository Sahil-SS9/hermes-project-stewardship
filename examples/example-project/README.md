# Example project

Walkthrough of a full stewardship loop against a throwaway repo:

```bash
python examples/example_project.py
```

What it shows, in order:

1. Enable stewardship with mission, owner profiles and autonomy L2 (propose
   only — no code writes).
2. Declare a deterministic objective (`pytest -q` exit code must be 1.0).
3. Cycle 1 on a healthy repo → `healthy`, zero initiatives: the loop accepts
   NO_ACTION_REQUIRED as success.
4. Break the code; cycle 2 detects it deterministically and the steward
   proposes one evidence-backed initiative.
5. Human approval recorded with actor + interface in the audit log.
6. Canonical state read back through the service layer.
