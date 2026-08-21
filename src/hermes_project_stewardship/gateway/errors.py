"""Gateway contract errors."""


class CommandError(RuntimeError):
    """User-facing command failure (bad args, unknown project, etc.)."""
