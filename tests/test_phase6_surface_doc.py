"""PM-0601: the documented dashboard subset must equal the real dashboard
frontend call surface.

docs/surfaces/supported-surfaces.md documents the exact backend calls the
dashboard frontend can make. This test mechanically extracts the calls from
dashboard/src/api.ts and refuses any drift in either direction: a call the
documentation misses (undocumented surface) or a documented call that no
longer exists (stale documentation).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_TS = ROOT / "hermes_dockyard_plugin/dashboard/src/api.ts"
SURFACES_DOC = ROOT / "docs/surfaces/supported-surfaces.md"

_METHODS = ("get", "post", "put", "patch")
_METHOD_RE = re.compile(r"\b(get|post|put|patch)\(\s*[`'\"]([^`'\"]+)[`'\"]")

_NORMALISATIONS = (
    ("${encodeURIComponent(projectId)}", "{id}"),
    ("${encodeURIComponent(project)}", "{id}"),
    ("${encodeURIComponent(ref)}", "{ref}"),
    ("${encodeURIComponent(name)}", "{name}"),
    ("${encodeURIComponent(dependencyRef)}", "{dependency_ref}"),
    ("${id}", "{id}"),
)


def _strip_generics(text: str) -> str:
    """Remove TypeScript generic argument blocks after call-method words so
    `get<{ a: string }>(`/path`)` reads as `get(`/path`)`. Balanced-angle
    scan keeps nested generics (Array<{...}>) intact."""
    result: list[str] = []
    i, n = 0, len(text)
    method_words = set(_METHODS)
    while i < n:
        ch = text[i]
        if ch.isalpha() or ch == "_":
            j = i
            while j < n and (text[j].isalnum() or text[j] == "_"):
                j += 1
            word = text[i:j]
            result.append(word)
            if word in method_words and j < n and text[j] == "<":
                depth = 0
                k = j
                while k < n:
                    if text[k] == "<":
                        depth += 1
                    elif text[k] == ">":
                        depth -= 1
                        if depth == 0:
                            break
                    k += 1
                i = k + 1
                continue
            i = j
            continue
        result.append(ch)
        i += 1
    return "".join(result)


def _normalise(path: str) -> str:
    path = path.split("?", 1)[0]  # method+path is the contract; not query args
    for raw, template in _NORMALISATIONS:
        path = path.replace(raw, template)
    return path


def _extracted_calls() -> set[str]:
    text = _strip_generics(API_TS.read_text(encoding="utf-8"))
    return {
        f"{method} {_normalise(path)}"
        for method, path in _METHOD_RE.findall(text)
        if path.startswith("/")  # drop wrapper definitions (`${BASE}${path}`)
    }


def _documented_calls() -> set[str]:
    text = SURFACES_DOC.read_text(encoding="utf-8")
    block = text.split("```text", 1)[1].split("```", 1)[0]
    calls = set()
    for line in block.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(None, 1)  # method, path — robust to spacing
        if len(parts) != 2:
            continue
        method, path = parts
        calls.add(f"{method.lower()} {_normalise(path.strip())}")
    return calls


def test_pm0601_documented_dashboard_subset_matches_frontend_calls():
    extracted = _extracted_calls()
    documented = _documented_calls()
    assert len(extracted) >= 20, (
        f"call extraction collapsed ({len(extracted)} calls) — parser broke"
    )
    missing_from_doc = sorted(extracted - documented)
    stale = sorted(documented - extracted)
    assert not missing_from_doc, (
        f"undocumented dashboard calls: {missing_from_doc}"
    )
    assert not stale, (
        f"documented calls absent from the dashboard frontend: {stale}"
    )
