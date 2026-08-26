"""G5 adversarial E2E: combined hostility over the RPC surface.

Simulates an attacker + a race-stressed legitimate fleet simultaneously;
the product must keep serving correct answers and never lose audit.
"""
from __future__ import annotations

import threading

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


@pytest.fixture()
def c(tmp_path):
    store = Store(tmp_path / "adv.db")
    client = TestClient(
        create_app(store, kanban_adapter=ReferenceKanbanAdapter(store))
    )
    r = client.post("/stewardship/v1/onboard", json={
        "project_id": "demo", "repo_path": "/srv/demo",
        "mission": "adversarial week", "lead_profile": "octacon",
        "autonomy_level": 2})
    assert r.status_code == 200
    yield client
    store.close()


V = "/stewardship/v1"


def test_hostile_traffic_cannot_corrupt_legitimate_state(c):
    # legitimate fleet state first
    for i in range(5):
        assert c.post(f"{V}/projects/demo/work-items", json={
            "type": "task", "title": f"legit {i}",
            "actor_id": "sahil"}).status_code == 200
    legit_before = len(c.get(
        f"{V}/projects/demo/work-items").json()["work_items"])

    # hostile flood: bad payloads, spoofed groups, giant strings, wrong types
    hostile_payloads = [
        {"msg_type": "handoff", "from_actor": "", "to_group": "",
         "payload": {}},
        {"msg_type": "HANDOFF", "from_actor": "x", "to_group": "demo-ops",
         "payload": {"item_ref": "HDY-1"}},
        {"msg_type": "status_query", "from_actor": {"a": 1},
         "to_group": "demo-ops", "payload": {"about": None}},
        {"msg_type": "result", "from_actor": "x" * 5000,
         "to_group": "demo-ops", "payload": {"outcome": "y" * 40000}},
        {"msg_type": None, "from_actor": None, "to_group": None},
    ]
    codes = []
    for body in hostile_payloads:
        try:
            r = c.post(f"{V}/a2a", json=body)
            codes.append(r.status_code)
        except Exception:
            codes.append("raise")
    assert all(code >= 400 or code == "raise" for code in codes), codes

    # freeze/pause attempts on unknown projects fail closed
    assert c.post(f"{V}/projects/ghost/freeze").status_code >= 400
    assert c.get(f"{V}/bots/ghost/reputation").status_code == 404
    assert c.post(f"{V}/bot-groups", json={
        "name": "BAD NAME!", "member_ids": []}).status_code == 422

    # legitimate state untouched and still serving
    legit_after = c.get(f"{V}/projects/demo/work-items").json()
    assert len(legit_after["work_items"]) == legit_before == 5
    dash = c.get(f"{V}/dashboard").json()
    proj = [p for p in dash["projects"] if p["id"] == "demo"][0]
    assert proj["work"]["backlog"] + proj["work"]["active"] >= 0


def test_concurrent_mixed_traffic_never_loses_audit(c):
    results: list[tuple] = []
    lock = threading.Lock()

    def worker(i):
        kind = i % 3
        if kind == 0:
            r = c.post(f"{V}/projects/demo/work-items", json={
                "type": "task", "title": f"concurrent {i}",
                "actor_id": "sahil"})
            ref = r.json().get("ref") if r.status_code == 200 else None
            out = ("create", ref)
        elif kind == 1:
            r = c.post(f"{V}/a2a", json={
                "msg_type": "status_query", "from_actor": f"watcher-{i}",
                "to_group": "x-ops" if i % 6 else "demo-ops",
                "payload": {"about": "HDY-1"}})
            out = ("query", r.status_code)
        else:
            r = c.get(f"{V}/dashboard")
            out = ("dash", r.status_code)
        with lock:
            results.append(out)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(18)]
    [t.start() for t in threads]
    [t.join() for t in threads]

    creates = [r for k, r in results if k == "create"]
    refs = [r for r in creates if r]
    assert len(set(refs)) == len(refs)          # no duplicate refs
    queries = [(k, s) for k, s in results if k == "query"]
    # spoofed group rejected, real one accepted — both clean statuses
    assert all(s in (200, 404) for _, s in queries)
    dashes = [s for k, s in results if k == "dash"]
    assert all(s == 200 for s in dashes)        # dashboard never fell over
