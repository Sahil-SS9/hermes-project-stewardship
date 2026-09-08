"""Read-only GitHub check evidence. Authentication stays with the installed gh CLI."""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
from collections.abc import Callable
from typing import Any
from urllib.parse import quote


def collect_github_evidence(
    repository: str, sha: str, required: list[str],
    fetch: Callable[[str], dict[str, Any]] | None = None,
    *, ref: str | None = None, release_tag: str | None = None,
) -> dict[str, Any]:
    """Require configured branch/tag and published release to identify the checked commit."""
    fetch = fetch or github_json
    result = collect_checks(repository, sha, required, fetch)
    for label, value in (("ref", ref), ("release_tag", release_tag)):
        if value is not None and (
            not isinstance(value, str) or not value or len(value) > 200
            or any(ord(c) < 32 for c in value)
        ):
            raise ValueError(f"invalid GitHub {label}")
    try:
        if ref is not None:
            resolved = fetch(f"repos/{repository}/commits/{quote(ref, safe='')}")
            if resolved.get("sha") != sha:
                raise ValueError("configured ref does not match commit")
            result["ref"] = ref
        if release_tag is not None:
            encoded = quote(release_tag, safe='')
            release = fetch(f"repos/{repository}/releases/tags/{encoded}")
            resolved = fetch(f"repos/{repository}/commits/{encoded}")
            if (release.get("tag_name") != release_tag or release.get("draft") is not False
                    or not release.get("published_at") or resolved.get("sha") != sha):
                raise ValueError("published release does not match commit")
            # Never persist release bodies, arbitrary URLs or provider diagnostics.
            result["release"] = {"tag": release_tag, "sha": sha, "published": True}
    except (KeyError, TypeError, ValueError, AttributeError, RuntimeError, OSError, subprocess.SubprocessError):
        result["state"] = "unknown"
        result["detail"] = "GitHub ref or published release unavailable or does not match commit"
    return result


def github_json(path: str) -> dict[str, Any]:
    # Never capture unbounded provider output in memory or expose stderr/tokens.
    with tempfile.TemporaryFile() as output:
        subprocess.run(
            ['gh', 'api', '--hostname', 'github.com', path],
            stdout=output, stderr=subprocess.DEVNULL, timeout=20, check=True,
        )
        if output.tell() > 1_000_000:
            raise ValueError('GitHub response exceeds evidence limit')
        output.seek(0)
        value = json.load(output)
    if not isinstance(value, dict):
        raise ValueError('GitHub response must be an object')
    return value


def collect_checks(
    repository: str, sha: str, required: list[str],
    fetch: Callable[[str], dict[str, Any]] = github_json,
) -> dict[str, Any]:
    """Fail closed on absent, ambiguous, pending or wrong-revision checks."""
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ValueError('repository must be owner/name')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('commit must be a full lowercase SHA')
    if not isinstance(required, list) or not required or len(required) > 100 or any(not isinstance(n, str) or not n or len(n) > 200 for n in required):
        raise ValueError('explicit required check names are required')
    result: dict[str, Any] = {
        'source': 'github', 'repository': repository, 'sha': sha,
        'state': 'unknown', 'checks': [],
    }
    try:
        payload = fetch(f'repos/{repository}/commits/{sha}/check-runs?per_page=100&filter=latest')
        runs = payload['check_runs']
        if not isinstance(runs, list) or payload['total_count'] != len(runs) or len(runs) > 100:
            raise ValueError('incomplete response')
        for name in required:
            matches = [r for r in runs if r.get('name') == name and r.get('head_sha') == sha]
            if len(matches) != 1:
                result['detail'] = 'required check missing, ambiguous or wrong commit'
                return result
            row = matches[0]
            conclusion = row.get('conclusion')
            state = 'unknown'
            if row.get('status') == 'completed':
                if conclusion == 'success':
                    state = 'passed'
                elif conclusion in {'failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure'}:
                    state = 'failed'
            result['checks'].append({'name': name, 'state': state})
        states = {c['state'] for c in result['checks']}
        result['state'] = 'failed' if 'failed' in states else ('passed' if states == {'passed'} else 'unknown')
        result['detail'] = 'required checks evaluated for exact commit'
    except (KeyError, TypeError, ValueError, AttributeError, RuntimeError, OSError, subprocess.SubprocessError):
        result['detail'] = 'GitHub evidence unavailable or incomplete'
    return result
