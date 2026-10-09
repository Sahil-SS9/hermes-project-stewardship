"""Every call the Desktop app makes must reach the backend through the plugin proxy.

The Desktop UI talks only to dashboard/plugin_api.py. A call with no matching
proxy route fails inside the app (404) even when the backend supports it. That
is how "Return to proposer", "Comment", "Revise & resubmit" and "Run first
assessment" broke without anyone noticing: the backend routes existed, the
proxy never forwarded them, and no test exercised the full chain.

1. Static guard: every literal api(...) call in desktop/src has a proxy route
   with the same method.
2. Behaviour through the REAL proxy -> real backend app, with the exact bodies
   the app sends. Attribution is trusted: the caller can never name the actor.
"""
import importlib.util
import re
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter
from hermes_project_stewardship.persistence.service import StewardshipService

ROOT = Path(__file__).parents[1]
PROXY = ROOT / "hermes_dockyard_plugin/dashboard/plugin_api.py"
DESKTOP_SRC = ROOT / "hermes_dockyard_plugin/desktop/src"
TOKEN = "synthetic-desktop-token"
HEADERS = {"x-hermes-session-token": TOKEN}
BASE = "/api/plugins/hermes-project-stewardship"
WILD = object()  # a path segment the app fills in at run time


# --- 1. static guard ---------------------------------------------------------

def _read_literal(text: str, start: int) -> tuple[str, int]:
    """Return (contents, index after the closing quote) of the JS string at start."""
    quote, i, depth, out = text[start], start + 1, 0, []
    while i < len(text):
        if quote == "`" and text.startswith("${", i):
            depth += 1
            out.append("${")
            i += 2
            continue
        ch = text[i]
        if depth and ch == "{":
            depth += 1
        elif depth and ch == "}":
            depth -= 1
        elif not depth and ch == quote:
            return "".join(out), i + 1
        out.append(ch)
        i += 1
    raise AssertionError(f"unterminated string at offset {start}")


def _call_options(text: str, start: int) -> str:
    """Text between the end of the path literal and the api( call's closing paren."""
    depth, i = 1, start
    while i < len(text) and depth:
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
        i += 1
    return text[start:i]


def _desktop_calls():
    """(method, path, where) for every api(...) call whose path is a string literal."""
    calls, dynamic = [], []
    for source in sorted(DESKTOP_SRC.rglob("*.js")):
        text = source.read_text()
        for match in re.finditer(r"\bapi\(\s*", text):
            where = f"{source.relative_to(DESKTOP_SRC)}:{text.count(chr(10), 0, match.start()) + 1}"
            begin = match.end()
            if text[begin] not in "`'\"":
                dynamic.append(where)  # path held in a variable; not checkable statically
                continue
            path, end = _read_literal(text, begin)
            method = re.search(r"\bmethod:\s*['\"](\w+)['\"]", _call_options(text, end))
            calls.append(((method.group(1) if method else "GET").upper(), path, where))
    return calls, dynamic


def _call_segments(path: str):
    """Split an app path into segments; run-time parts become WILD. None = prefix unknown."""
    if path.startswith("${"):
        return None
    # A trailing ${...} holding a ternary only builds an optional query string.
    path = re.sub(r"\$\{[^{}]*\?(?:[^{}]|\$\{[^{}]*\})*\}$", "", path)
    path = path.split("?", 1)[0]
    return [WILD if "${" in part else part for part in path.strip("/").split("/")]


def _proxy_routes():
    text = PROXY.read_text()
    routes = []
    for match in re.finditer(r'@plugin_api\.(get|post|put|patch|delete)\(\s*"([^"]+)"', text):
        routes.append((match.group(1).upper(), match.group(2).strip("/").split("/")))
    return routes


def _matches(call: list, route: list[str]) -> bool:
    if route and route[-1].endswith(":path}"):
        head = route[:-1]
        return len(call) > len(head) and _matches(call[: len(head)], head)
    if len(call) != len(route):
        return False
    return all(c is WILD or r.startswith("{") or c == r for c, r in zip(call, route))


def test_every_desktop_call_has_a_proxy_route():
    calls, dynamic = _desktop_calls()
    routes = _proxy_routes()
    assert len(routes) > 100, "parsed the proxy's routes"
    checked, missing = 0, []
    for method, path, where in calls:
        segments = _call_segments(path)
        if segments is None:
            continue
        checked += 1
        if not any(m == method and _matches(segments, route) for m, route in routes):
            missing.append(f"{method} {path}  ({where})")
    # A broken parser must not pass by checking nothing.
    assert checked > 120, f"only {checked} literal calls found; the scan is broken"
    assert dynamic, "variable-path calls are reported, not silently dropped"
    assert missing == [], "Desktop calls with no proxy route (they 404 inside the app):\n" + "\n".join(missing)


# --- 2. behaviour through the real proxy -------------------------------------

def _proxy_client(tmp_path, monkeypatch, *, auth: bool):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path))
    monkeypatch.setenv("STEWARD_DB_PATH", str(tmp_path / "db.sqlite"))
    monkeypatch.setenv("DOCKYARD_ACTOR_ID", "trusted-desktop")
    monkeypatch.delenv("STEWARD_RPC_TOKEN", raising=False)
    monkeypatch.setenv("HERMES_DASHBOARD_SESSION_TOKEN", TOKEN)
    spec = importlib.util.spec_from_file_location("desktop_routes_isolated_proxy", PROXY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    store = module._store
    StewardshipService(store).enable(
        "p1", mission="m", lead_profile="lead", member_profiles=["worker"], autonomy_level=2)
    module._app = create_app(
        store, kanban_adapter=ReferenceKanbanAdapter(store),
        auth_token=TOKEN if auth else None,
        auth_principal="owner" if auth else None,
        auth_principal_is_human=True)
    module._client = module.httpx.AsyncClient(
        transport=module.httpx.ASGITransport(app=module._app), base_url="http://dockyard.test")
    host = FastAPI()
    host.include_router(module.plugin_api, prefix=BASE)
    # With a backend principal it wins; without one the proxy's fixed actor is used.
    return module, TestClient(host), ("owner" if auth else "trusted-desktop")


def _pending(module, title="Tighten the review queue") -> str:
    initiative = StewardshipService(module._store).propose_initiative(
        "p1", title=title, rationale="Reviews stall for days")
    assert initiative["status"] == "pending_approval"
    return initiative["ref"]


def _status(client, ref: str) -> str:
    rows = client.get(f"{BASE}/projects/p1/initiatives", headers=HEADERS).json()["initiatives"]
    return next(row["status"] for row in rows if row["ref"] == ref)


@pytest.mark.parametrize("auth", [True, False], ids=["backend_principal", "proxy_actor"])
def test_return_to_proposer_records_feedback_under_the_trusted_actor(tmp_path, monkeypatch, auth):
    module, client, actor = _proxy_client(tmp_path, monkeypatch, auth=auth)
    ref = _pending(module)
    fingerprint = client.get(f"{BASE}/initiatives/{ref}/decision", headers=HEADERS).json()["fingerprint"]
    url = f"{BASE}/initiatives/{ref}/request-changes"

    forged = client.post(url, headers=HEADERS, json={
        "expected_fingerprint": fingerprint, "feedback": "Split it", "actor": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    assert _status(client, ref) == "pending_approval", "a refused request changes nothing"

    # The exact body work-item/approvals.js sends.
    returned = client.post(url, headers=HEADERS, json={
        "expected_fingerprint": fingerprint, "feedback": "Split it into two bets", "note": "see thread"})
    assert returned.status_code == 200, returned.text
    assert returned.json()["status"] == "changes_requested"
    receipts = client.get(f"{BASE}/initiatives/{ref}/decision/receipts", headers=HEADERS).json()["receipts"]
    assert [(row["decision"], row["actor"], row["reason"]) for row in receipts] == [
        ("changes_requested", actor, "Split it into two bets")]


@pytest.mark.parametrize("auth", [True, False], ids=["backend_principal", "proxy_actor"])
def test_comment_is_recorded_and_never_changes_the_decision(tmp_path, monkeypatch, auth):
    module, client, actor = _proxy_client(tmp_path, monkeypatch, auth=auth)
    ref = _pending(module)
    decision_url = f"{BASE}/initiatives/{ref}/decision"
    url = f"{BASE}/initiatives/{ref}/comments"
    before = client.get(decision_url, headers=HEADERS).json()["fingerprint"]

    assert client.get(url, headers=HEADERS).json()["comments"] == []
    forged = client.post(url, headers=HEADERS, json={"body": "Hi", "actor": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"

    # The exact body work-item/approvals.js sends.
    created = client.post(url, headers=HEADERS, json={"body": "Can we see the cost first?"})
    assert created.status_code == 200, created.text
    assert (created.json()["actor"], created.json()["body"]) == (actor, "Can we see the cost first?")
    thread = client.get(url, headers=HEADERS).json()["comments"]
    assert [(row["actor"], row["body"]) for row in thread] == [(actor, "Can we see the cost first?")]

    assert client.get(decision_url, headers=HEADERS).json()["fingerprint"] == before
    assert _status(client, ref) == "pending_approval"
    assert client.get(f"{decision_url}/receipts", headers=HEADERS).json()["receipts"] == []


@pytest.mark.parametrize("auth", [True, False], ids=["backend_principal", "proxy_actor"])
def test_resubmit_makes_a_new_fingerprint_and_the_old_one_is_refused(tmp_path, monkeypatch, auth):
    module, client, _actor = _proxy_client(tmp_path, monkeypatch, auth=auth)
    ref = _pending(module)
    decision_url = f"{BASE}/initiatives/{ref}/decision"
    old = client.get(decision_url, headers=HEADERS).json()["fingerprint"]
    returned = client.post(f"{BASE}/initiatives/{ref}/request-changes", headers=HEADERS, json={
        "expected_fingerprint": old, "feedback": "Smaller first slice"})
    assert returned.status_code == 200, returned.text
    url = f"{BASE}/initiatives/{ref}/resubmit"

    forged = client.post(url, headers=HEADERS, json={"rationale": "Smaller", "actor": "forged"})
    assert forged.status_code == 422, "the caller must never name the actor"
    assert _status(client, ref) == "changes_requested"

    # The exact body views/dashboard.js (Revise & resubmit) sends.
    resubmitted = client.post(url, headers=HEADERS, json={"rationale": "One team first, then the rest"})
    assert resubmitted.status_code == 200, resubmitted.text
    assert resubmitted.json()["status"] == "pending_approval"
    new = client.get(decision_url, headers=HEADERS).json()["fingerprint"]
    assert new != old, "a resubmission is a new decision"

    stale = client.post(f"{BASE}/initiatives/{ref}/approve", headers=HEADERS, json={"expected_fingerprint": old})
    assert stale.status_code == 409, "a decision made against the old version is refused"
    fresh = client.post(f"{BASE}/initiatives/{ref}/approve", headers=HEADERS, json={"expected_fingerprint": new})
    assert fresh.status_code == 200, fresh.text


def test_run_first_assessment_reaches_the_backend(tmp_path, monkeypatch):
    _module, client, _actor = _proxy_client(tmp_path, monkeypatch, auth=True)
    # The exact body views/dashboard.js (Run first assessment) sends.
    ran = client.post(f"{BASE}/projects/p1/first-assessment", headers=HEADERS, json={})
    assert ran.status_code == 200, ran.text
    assessment = ran.json()["assessment"]
    assert {"cycle_id", "verification_ok", "health_state", "objective_results",
            "initiatives_created"} <= set(assessment)
    assert assessment["initiatives_created"] == 0, "the first assessment proposes nothing"
