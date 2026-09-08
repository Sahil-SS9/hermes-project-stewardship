"""Project Stewardship observation package (Phase 3).

Connects native Hermes task events to Dockyard initiatives and outcomes:
- native_events: read-only native task observation + atomic event claims;
- recovery: run-once observation with classification, crash/restart recovery,
  host-identity-verified completion, and the bounded reconciliation command.
"""
from hermes_project_stewardship.observation.native_events import NativeEventObserver
from hermes_project_stewardship.observation.recovery import ReconcileService

__all__ = ["NativeEventObserver", "ReconcileService"]
