"""Security module: untrusted-content handling and allowlisted execution."""

from .allowlist import (  # noqa: F401
    DEFAULT_ALLOWLIST,
    CommandNotPermitted,
    CommandResult,
    run_allowlisted,
)
from .untrusted import (  # noqa: F401
    BOUNDARY_BEGIN,
    BOUNDARY_END,
    EvidencePrefix,
    InjectionFinding,
    UntrustedContent,
    is_authoritative,
    make_evidence_entry,
    scan_text,
    worst_severity,
)
