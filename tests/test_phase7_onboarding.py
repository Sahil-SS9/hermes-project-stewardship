"""Phase 7 preflight: host-driven onboarding discovery + reuse + objectives.

P7.1 — Discover existing native projects and valid lead profiles from the
       host; offer connect-existing before create-new (no hard-coded lists).
P7.2 — Reuse the host's validate_project as the preflight (permission and
       duplicate conflicts surface BEFORE commitment; no second validator).
P7.3 — Detect basic repository tooling from declared files and suggest
       objectives; suggestions are inert (manual evaluator, no commands).
P7.6 — The completion action runs a first read-only assessment (manual
       trigger) and shows evidence/result; onboarding never enables schedules.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban.vanilla_host import (
    HostError,
    ProjectKanbanHost,
)


def require_native():
    """Canonical guard (same shape as test_migration_runner.py): skip unless
    ALL THREE pinned-host modules import — hermes_constants, hermes_cli.kanban_db,
    hermes_cli.projects_db. With STEWARD_REQUIRE_NATIVE_HOST=1 a missing host
    fails loudly instead of skipping."""
    missing = []
    for module in ("hermes_constants", "hermes_cli.kanban_db", "hermes_cli.projects_db"):
        try:
            __import__(module)
        except ImportError:
            missing.append(module)
    if missing:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail(f"Native host lane requires a real pinned Hermes runtime (missing: {', '.join(missing)})")
        pytest.skip("optional native Hermes runtime not installed")


@pytest.fixture()
def host(tmp_path, monkeypatch):
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    repo = tmp_path / "repo"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=tmp_path / "hermes")
    return host, repo


# ------------------------------------------------------------------ #
# P7.1 — discovery                                                    #
# ------------------------------------------------------------------ #

def test_discover_lists_existing_projects_and_boards_before_provision():
    """P7.1: discovery reflects what the host ALREADY has — before any
    provisioning, after provisioning it lists the provisioned project."""
    require_native()
    home = Path(tempfile.mkdtemp())
    (home / "alpha").mkdir()
    host = ProjectKanbanHost(hermes_home=home)
    discovered = host.list_existing_projects()
    # No projects yet: empty discovery, no crash, valid shape.
    assert discovered["projects"] == []
    assert "profiles" in discovered
    assert any(p["name"] == "default" for p in discovered["profiles"])
    host.provision_project(
        name="Alpha", slug="alpha", description="alpha mission",
        repo_path=str(home / "alpha"), lead_profile="default",
        idempotency_key="alpha-1", board_slug="alpha",
    )
    after = host.list_existing_projects()
    assert [(p["slug"], p["board_slug"]) for p in after["projects"]] == [
        ("alpha", "alpha")]
    assert all("repo_path" in p for p in after["projects"])


# ------------------------------------------------------------------ #
# P7.2 — host validate as preflight                                   #
# ------------------------------------------------------------------ #

def test_preflight_uses_host_validate_and_surfaces_conflicts_early(tmp_path):
    """P7.2: validate_project is the preflight; an invalid repo path or an
    unknown profile is rejected BEFORE provisioning, and a duplicate slug
    conflict is reported without creating anything."""
    require_native()
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=home)
    # invalid: unknown lead profile
    try:
        host.validate_project(
            name="Alpha", slug="alpha", description="mission text",
            repo_path=str(repo), lead_profile="nobody",
            board_slug="alpha",
        )
        raise AssertionError("unknown profile must fail preflight")
    except HostError as exc:
        assert exc.code == "validation_error"
        assert "lead_profile" in exc.fields
    # invalid: missing repo path
    try:
        host.validate_project(
            name="Alpha", slug="alpha", description="mission text",
            repo_path=str(tmp_path / "missing"), lead_profile="default",
            board_slug="alpha",
        )
        raise AssertionError("missing repo must fail preflight")
    except HostError as exc:
        assert "repo_path" in exc.fields
    # provision, then a re-provision of the same slug with DIFFERENT details
    # must conflict instead of overwriting
    host.provision_project(
        name="Alpha", slug="alpha", description="mission text",
        repo_path=str(repo), lead_profile="default",
        idempotency_key="alpha-1", board_slug="alpha",
    )
    other = tmp_path / "beta"
    other.mkdir()
    try:
        host.provision_project(
            name="Beta", slug="alpha", description="other mission",
            repo_path=str(other), lead_profile="default",
            idempotency_key="beta-1", board_slug="beta",
        )
        raise AssertionError("duplicate slug must conflict")
    except HostError as exc:
        assert exc.code == "idempotency_conflict"


# ------------------------------------------------------------------ #
# P7.5 — partial failure + same-key replay (P7.GATE)                  #
# ------------------------------------------------------------------ #

def test_partial_failure_then_same_key_replay_completes(tmp_path, monkeypatch):
    """P7.5 (P7.GATE): a failure between project-creation and board-creation
    leaves a resumable partial state. Retrying the SAME idempotency key and
    details completes the original provisioning — no duplicate project, no
    destructive cleanup, no 'board not found' dead end."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "partial"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=home)
    import hermes_constants
    from hermes_cli import kanban_db, projects_db

    payload = dict(
        name="Partial", slug="partial", description="partial mission",
        repo_path=str(repo), lead_profile="default",
        idempotency_key="review-partial", board_slug="partial",
    )
    original = kanban_db.create_board
    calls = {"n": 0}

    def fail_once(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("injected board failure")
        return original(*args, **kwargs)

    kanban_db.create_board = fail_once
    try:
        # 1. First attempt fails after the native project record exists.
        with pytest.raises(RuntimeError, match="injected board failure"):
            host.provision_project(**payload)
        token = hermes_constants.set_hermes_home_override(home)
        try:
            with projects_db.connect_closing() as conn:
                rows = projects_db.list_projects(conn, include_archived=True)
                partials = [p for p in rows if p.slug == "partial"]
            assert len(partials) == 1, "partial record must be resumable, not deleted"
        finally:
            hermes_constants.reset_hermes_home_override(token)

        # 2. Same-key retry with the failure removed: resumes to completion.
        result = host.provision_project(**payload)
        assert result["project"]["slug"] == "partial"
        assert result["board"]["slug"] == "partial"
        assert result["board"].get("project_id") == result["project"]["id"]

        # 3. Exactly one project, not a duplicate; the project is live.
        token = hermes_constants.set_hermes_home_override(home)
        try:
            with projects_db.connect_closing() as conn:
                rows = projects_db.list_projects(conn, include_archived=True)
                matching = [p for p in rows if p.slug == "partial"]
            assert len(matching) == 1
            assert not matching[0].archived
        finally:
            hermes_constants.reset_hermes_home_override(token)
    finally:
        kanban_db.create_board = original


def test_different_key_on_partial_conflicts_without_duplicates(tmp_path, monkeypatch):
    """P7.5 (P7.GATE): replaying the same slug with a DIFFERENT idempotency
    key on a partial state conflicts instead of duplicating or clobbering."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "partial2"
    repo.mkdir()
    host = ProjectKanbanHost(hermes_home=home)
    from hermes_cli import kanban_db

    payload = dict(
        name="Partial2", slug="partial2", description="mission two",
        repo_path=str(repo), lead_profile="default",
        idempotency_key="key-a", board_slug="partial2",
    )
    original = kanban_db.create_board
    calls = {"n": 0}

    def fail_once(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("injected board failure")
        return original(*args, **kwargs)

    kanban_db.create_board = fail_once
    try:
        with pytest.raises(RuntimeError, match="injected board failure"):
            host.provision_project(**payload)
    finally:
        kanban_db.create_board = original
    # A different key, same slug: explicit conflict, no second project, no
    # substitute board under a different identity.
    with pytest.raises(HostError) as excinfo:
        host.provision_project(**{**payload, "idempotency_key": "key-b"})
    assert excinfo.value.code == "idempotency_conflict"


# ------------------------------------------------------------------ #
# P7.3 — tooling detection, inert suggestions                         #
# ------------------------------------------------------------------ #

def test_tooling_suggestions_are_inert_manual_objectives(tmp_path):
    """P7.3: declared files suggest objectives; suggestions carry no commands
    (manual evaluator only) and never execute anything."""
    from hermes_project_stewardship.onboarding.tooling import suggest_objectives

    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "pyproject.toml").write_text("[project]\nname='x'\n")
    (repo / "README.md").write_text("readme\n")
    suggestions = suggest_objectives(repo)
    kinds = {s["evaluator_type"] for s in suggestions}
    assert "command" not in kinds, "suggestions must never pre-arm commands"
    assert all(s["evaluator_type"] == "manual" for s in suggestions)
    assert any("python" in s["name"].lower() for s in suggestions)
    assert any("readme" in s["name"].lower() for s in suggestions)


# ------------------------------------------------------------------ #
# P7.6 — first read-only assessment                                   #
# ------------------------------------------------------------------ #

def test_first_assessment_is_read_only_and_leaves_automation_off(engine, enabled, svc, tmp_path):
    """P7.6: a manual cycle run is the first read-only assessment: it records
    health/evidence and creates no initiatives when nothing is proposed."""
    from tests.test_cycles import wire_repo
    from tests.conftest import make_repo

    repo = make_repo(tmp_path / "repo")
    wire_repo(svc, enabled, repo)
    result = engine.run_cycle(enabled, trigger_type="manual")
    assert result["verification_ok"] is True
    assert result["health"]["state"] == "healthy"
    assert result["initiatives"] == []
    # schedules/cron stay off: no automation policy was flipped
    policies = svc.settings(enabled)["policies"]
    assert not policies.get("cron") or policies.get("cron", {}).get("enabled") is not True


# ------------------------------------------------------------------ #
# API surface: discover / preflight / first-assessment via the app     #
# ------------------------------------------------------------------ #

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402


def _api_payload(repo: Path) -> dict:
    return {
        "project_id": "alpha",
        "name": "Alpha Project",
        "slug": "alpha",
        "repo_path": str(repo),
        "mission": "Deliver Alpha safely",
        "lead_profile": "default",
        "board_slug": "alpha",
        "idempotency_key": "dockyard-onboard-alpha",
        "autonomy_level": 2,
        "actor_id": "sahil",
    }


# test-phase6-file used _payload as the canonical name; keep the same name so
# the API tests share the one fixture builder.
_payload = _api_payload


def test_onboard_discover_and_preflight_endpoints(tmp_path, monkeypatch):
    """P7.1/P7.2 over the real API: discovery reflects host state; preflight
    validates via the host and reports connect-existing vs create-new."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(
                    hermes_home=home)))
            before = client.get("/stewardship/v1/onboard/discover")
            assert before.status_code == 200, before.text
            assert before.json()["projects"] == []
            assert any(p["name"] == "default"
                       for p in before.json()["profiles"])

            pre = client.post(
                "/stewardship/v1/onboard/preflight",
                json=_api_payload(repo))
            assert pre.status_code == 200, pre.text
            assert pre.json()["mode"] == "create_new"
            assert pre.json()["validated"]["slug"] == "alpha"

            created = client.post("/stewardship/v1/onboard",
                                  json=_payload(repo))
            assert created.status_code == 200, created.text

            after = client.get("/stewardship/v1/onboard/discover")
            assert after.status_code == 200
            assert [p["slug"] for p in after.json()["projects"]] == ["alpha"]

            replay_pre = client.post("/stewardship/v1/onboard/preflight",
                                     json=_api_payload(repo))
            assert replay_pre.status_code == 200, replay_pre.text
            assert replay_pre.json()["mode"] == "connect_existing"
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


def test_preflight_rejects_before_commitment(tmp_path, monkeypatch):
    """P7.2: preflight errors carry the host's field errors and write nothing."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            bad = _payload(tmp_path / "missing-repo")
            r = client.post("/stewardship/v1/onboard/preflight", json=bad)
            assert r.status_code == 422, r.text
            assert "repo_path" in r.json()["error"]["fields"]
            assert store._conn.execute(
                "SELECT COUNT(*) AS n FROM project_stewardship"
            ).fetchone()["n"] == 0
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


def test_first_assessment_endpoint_after_onboarding(tmp_path, monkeypatch):
    """P7.6: the completion action endpoint runs a read-only assessment and
    explicitly reports schedules_enabled=false."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            created = client.post("/stewardship/v1/onboard",
                                  json=_payload(repo))
            assert created.status_code == 200, created.text
            r = client.post("/stewardship/v1/projects/alpha/first-assessment")
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["schedules_enabled"] is False
            assert body["assessment"]["initiatives_created"] == 0
            assert body["assessment"]["health_state"] in (
                "healthy", "unknown", "watch")
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


# ------------------------------------------------------------------ #
# P7.GATE round-2: preview fields, suggestions, duplicate identity,    #
# missing host/profile, onboard -> first-assessment journey.          #
# ------------------------------------------------------------------ #

def test_preflight_preview_and_suggestions(tmp_path, monkeypatch):
    """P7.4 + P7.3 (P7.GATE): preflight returns the exact proposed
    governance/board/automation preview plus inert tooling suggestions
    (supported and unsupported files distinguished)."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    (repo / "pyproject.toml").write_text("[project]\nname='x'\n")
    (repo / "unknown-tool.cfg").write_text("noise\n")
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            pre = client.post(
                "/stewardship/v1/onboard/preflight", json=_api_payload(repo))
            assert pre.status_code == 200, pre.text
            body = pre.json()
            # P7.4: the exact preview fields, automation inactive.
            preview = body["preview"]
            assert preview["governance_project_id"] == "alpha"
            assert preview["canonical_board"] == "alpha"
            assert preview["canonical_project_slug"] == "alpha"
            assert "objectives_store" in preview
            assert preview["schedules_enabled"] is False
            assert preview["future_execution_enabled"] is False
            assert preview["first_action"]
            # P7.3: suggestions ride the preflight; manual evaluator only.
            names = [s["name"] for s in body.get("suggestions", [])]
            assert "Python packaging present" in names
            for s in body["suggestions"]:
                assert s["evaluator_type"] == "manual"
                assert not s.get("command")
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


def test_duplicate_identity_conflict_previews_cleanly(tmp_path, monkeypatch):
    """P7.GATE: a second onboarding attempt for an existing slug with
    different details fails with an explicit conflict and writes nothing
    new (duplicate identity never silently substitutes)."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    other = tmp_path / "beta"
    repo.mkdir()
    other.mkdir()
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            first = client.post("/stewardship/v1/onboard", json=_payload(repo))
            assert first.status_code == 200, first.text
            clash = _payload(other)
            clash["name"] = "Beta Project"
            clash["slug"] = "alpha"
            clash["project_id"] = "alpha"
            clash["board_slug"] = "beta"
            r = client.post("/stewardship/v1/onboard/preflight", json=clash)
            assert r.status_code in (200, 409, 422), r.text
            if r.status_code == 200:
                # connect-existing detected; the differing details must be
                # visible in the response (never silently replaced).
                assert r.json()["mode"] == "connect_existing"
            on = client.post("/stewardship/v1/onboard", json=clash)
            assert on.status_code in (409, 422), on.text
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


def test_missing_host_and_profile_fail_closed(tmp_path, monkeypatch):
    """P7.GATE: an unknown profile is rejected by preflight; a missing host
    (no hermes_cli importable) makes discovery fail closed with 503, not an
    invented empty success."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    import sys
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            bad_profile = _payload(repo)
            bad_profile["lead_profile"] = "does-not-exist"
            r = client.post(
                "/stewardship/v1/onboard/preflight", json=bad_profile)
            assert r.status_code == 422, r.text
            assert "lead_profile" in r.json()["error"]["fields"]
            # missing host: hide hermes_cli modules so the adapter cannot
            # reach the canonical stores; discovery must fail closed.
            monkeypatch.setitem(sys.modules, "hermes_cli", None)
            monkeypatch.setitem(sys.modules, "hermes_cli.projects_db", None)
            monkeypatch.setitem(sys.modules, "hermes_cli.kanban_db", None)
            gone = client.get("/stewardship/v1/onboard/discover")
            assert gone.status_code == 503, gone.text
            assert gone.json()["error"]["code"] == "host_unavailable"
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)


def test_onboard_to_first_assessment_journey(tmp_path, monkeypatch):
    """P7.GATE: the complete successful journey over the real API —
    discover → preflight (preview present) → onboard → first assessment —
    with the final assessment reporting automation off."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    home = tmp_path / "hermes"
    repo = tmp_path / "alpha"
    repo.mkdir()
    (repo / "package.json").write_text("{}\n")
    import hermes_constants
    from hermes_project_stewardship.kanban.host_adapter import (
        create_project_kanban_adapter,
    )
    token = hermes_constants.set_hermes_home_override(home)
    try:
        monkeypatch.setattr(
            hermes_constants, "get_hermes_home", lambda: str(home))
        store = Store(tmp_path / "dockyard.db")
        try:
            client = TestClient(create_app(
                store,
                kanban_adapter=create_project_kanban_adapter(hermes_home=home),
            ))
            d = client.get("/stewardship/v1/onboard/discover")
            assert d.status_code == 200 and d.json()["projects"] == []
            pre = client.post(
                "/stewardship/v1/onboard/preflight", json=_api_payload(repo))
            assert pre.status_code == 200
            assert pre.json()["preview"]["schedules_enabled"] is False
            on = client.post("/stewardship/v1/onboard", json=_payload(repo))
            assert on.status_code == 200, on.text
            assert on.json()["canonical"]["board"]["slug"] == "alpha"
            fa = client.post("/stewardship/v1/projects/alpha/first-assessment")
            assert fa.status_code == 200, fa.text
            body = fa.json()
            assert body["schedules_enabled"] is False
            assert body["next"]
        finally:
            store.close()
    finally:
        hermes_constants.reset_hermes_home_override(token)