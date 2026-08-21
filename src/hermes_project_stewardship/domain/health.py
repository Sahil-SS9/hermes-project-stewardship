"""Health state machine with hysteresis (material-change debounce).

Transitions are deterministic and derived only from verified evidence.
`material_change()` decides whether a transition is worth emitting a
notification for — this is the notification-storm defence.
"""

from __future__ import annotations

from typing import Iterable, Optional, Sequence

from .constants import HealthState

# Ordered worst→best so comparisons are simple index math.
_ORDER: Sequence[HealthState] = (
    HealthState.CRITICAL,
    HealthState.DEGRADED,
    HealthState.UNKNOWN,
    HealthState.WATCH,
    HealthState.HEALTHY,
)

# How far apart (in rank distance) two states must be before the change is
# "material" enough to notify. Watch<->Healthy churn stays quiet.
_MATERIAL_RANK_DISTANCE = 2


def _rank(state: HealthState) -> int:
    return _ORDER.index(state)


class HealthStateMachine:
    """Derives a health state from objective results + verification verdict."""

    def derive(
        self,
        *,
        verification_ok: bool,
        critical_signals: Iterable[str],
        failed_objectives: Iterable[dict],
        watch_signals: Iterable[str],
    ) -> HealthState:
        if not verification_ok:
            # Fail closed: cannot establish canonical state.
            return HealthState.UNKNOWN
        criticals = list(critical_signals)
        if criticals:
            return HealthState.CRITICAL
        failures = list(failed_objectives)
        high_failures = [f for f in failures if f.get("severity") == "high"]
        if high_failures or len(failures) >= 2:
            return HealthState.DEGRADED
        if failures:
            return HealthState.WATCH
        if list(watch_signals):
            return HealthState.WATCH
        return HealthState.HEALTHY

    def material_change(
        self,
        previous: Optional[HealthState],
        current: HealthState,
    ) -> bool:
        """True when a transition should notify.

        Rules:
        - first observation of UNKNOWN/CRITICAL always notifies;
        - otherwise the rank distance must exceed the debounce threshold.
        """
        if previous is None:
            return current in (HealthState.UNKNOWN, HealthState.CRITICAL)
        if previous == current:
            return False
        if current in (HealthState.UNKNOWN, HealthState.CRITICAL):
            return True
        return abs(_rank(current) - _rank(previous)) >= _MATERIAL_RANK_DISTANCE


DEFAULT_HEALTH_MACHINE = HealthStateMachine()
