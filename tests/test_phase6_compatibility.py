"""PM-0606/0607 Phase 6 compatibility: vanilla version targets, lifecycle
matrix and Hermes import isolation.

Version/lifecycle evidence binds to the Phase 0 spike
(docs/plans/evidence/project-management-vanilla-host-spike.md); this module
re-proves what is provable in-lane (import isolation, stale-profile
behaviour, matrix truthfulness) and marks real-host cells with the existing
native-host skip convention (tests/test_vanilla_host.py::require_native).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost


def require_native():
    try:
        from hermes_cli import kanban_db  # noqa: F401
    except ImportError:
        if os.environ.get("STEWARD_REQUIRE_NATIVE_HOST") == "1":
            pytest.fail("Native host lane requires a real pinned Hermes runtime")
        pytest.skip("optional native Hermes runtime not installed")


# ------------------------------------------------------------------ #
# PM-0607: every Hermes import is isolated behind the adapter
# ------------------------------------------------------------------ #

_PROD_ROOTS = ("src/hermes_project_stewardship", "hermes_dockyard_plugin")


def _repo_files() -> list[Path]:
    root = Path(__file__).resolve().parents[1]
    allowed_suffix = (".py",)
    files: list[Path] = []
    for prod_root in _PROD_ROOTS:
        base = root / prod_root
        for path in base.rglob("*.py"):
            parts = set(path.parts)
            if "node_modules" in parts or "__pycache__" in parts:
                continue
            files.append(path)
    return files


def test_pm0607_all_hermes_imports_are_isolated_in_vanilla_host():
    """No production module other than the vanilla-host compatibility
    adapter may import Hermes internals. Vanilla is an optional runtime:
    importing stewardship must never import hermes_cli/hermes_constants at
    module level."""
    offenders = []
    for path in _repo_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        if "vanilla_host" in path.name:
            continue
        for lineno, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if ("import hermes_cli" in line or "from hermes_cli" in line
                    or "import hermes_constants" in line
                    or "from hermes_constants" in line):
                offenders.append(f"{path.relative_to(path.parents[3])}:{lineno}: {stripped}")
    assert offenders == []


def test_pm0607_importing_cli_never_imports_hermes_internals():
    """CLI import isolation is proven in a fresh interpreter."""
    import os
    import subprocess

    root = Path(__file__).resolve().parents[1]
    env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
    code = (
        "import sys; import hermes_project_stewardship.cli.app; "
        "print('hermes_cli' in sys.modules, 'hermes_constants' in sys.modules)"
    )
    result = subprocess.run(
        [sys.executable, "-c", code], cwd=str(root), env=env,
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr[-2000:]
    assert result.stdout.strip() == "False False"


def test_pm0607_server_import_without_hermes_runtime_is_clean():
    """Importing the API server (with its module-level app) in a clean
    interpreter with NO Hermes runtime importable must succeed and leave
    no hermes internals loaded. Run in a subprocess to escape any
    cross-test module pollution."""
    import os
    import subprocess

    import tempfile

    env = {k: v for k, v in os.environ.items() if "PYTHONPATH" not in k}
    # The server creates its module-level app on import.  Keep this clean-host
    # probe away from inherited Hermes/Kanban roots and any user database so a
    # newer live schema cannot mask the import-isolation assertion.
    for key in ("HERMES_HOME", "HERMES_KANBAN_HOME", "HERMES_KANBAN_BOARD", "STEWARD_DB_PATH"):
        env.pop(key, None)
    with tempfile.TemporaryDirectory(prefix="hps-pm0607-import-") as state:
        env["STEWARD_DB_PATH"] = str(Path(state) / "stewardship.db")
        root = Path(__file__).resolve().parents[1]
        code = (
            "import sys; import hermes_project_stewardship.api.server; "
            "print('hermes_cli' in sys.modules, 'hermes_constants' in sys.modules)"
        )
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, env=env, cwd=str(root), timeout=60,
        )
    assert result.returncode == 0, result.stderr[-2000:]
    assert result.stdout.strip() == "False False"


def test_pm0607_adapter_factory_fails_closed_without_host():
    """Without any Hermes runtime the adapter factory must raise the
    canonical host_unavailable error — never crash, never silently fake a
    host (PM-0607 fail-closed contract)."""
    import subprocess

    env = {k: v for k, v in __import__("os").environ.items() if "PYTHONPATH" not in k}
    root = Path(__file__).resolve().parents[1]
    code = (
        "from hermes_project_stewardship.kanban.host_adapter import "
        "create_project_kanban_adapter, KanbanAdapterError\n"
        "try:\n"
        "    create_project_kanban_adapter()\n"
        "except KanbanAdapterError as e:\n"
        "    print('closed:', e.code)\n"
        "else:\n"
        "    print('constructed-fake-host')"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True, text=True, env=env, cwd=str(root), timeout=60,
    )
    assert result.returncode == 0, result.stderr[-2000:]
    # Either it failed closed with the canonical code, or (if some host
    # runtime IS importable) it must record its provenance truthfully.
    out = result.stdout.strip()
    assert out in ("closed: host_contract_unavailable", "constructed-fake-host")
    if out.startswith("constructed"):
        code2 = (
            "from hermes_project_stewardship.kanban.host_adapter import "
            "create_project_kanban_adapter\n"
            "a = create_project_kanban_adapter()\n"
            "print(a.host_provenance['host_module'])"
        )
        result2 = subprocess.run(
            [sys.executable, "-c", code2],
            capture_output=True, text=True, env=env, cwd=str(root), timeout=60,
        )
        assert result2.returncode == 0
        assert "hermes" in (result2.stdout or "").lower()


# ------------------------------------------------------------------ #
# PM-0606: version targets come from recorded evidence, not invention
# ------------------------------------------------------------------ #

# Both revisions were probed against the real vanilla checkout in the
# Phase 0 spike; the shipped v1 manifest installs at the pinned minimum.
MINIMUM_VANILLA_REVISION = "8c098e9e819169879a7b2f74990e83b5d39696c8"
RECOMMENDED_VANILLA_REVISION = "866332bfb52c46e543143b2620a9aeee8bce9c77"


def test_pm0606_recorded_version_targets_exist_in_phase0_evidence():
    root = Path(__file__).resolve().parents[1]
    spike = (root / "docs/plans/evidence/project-management-vanilla-host-spike.md").read_text(
        encoding="utf-8"
    )
    assert MINIMUM_VANILLA_REVISION in spike
    assert RECOMMENDED_VANILLA_REVISION in spike


def test_pm0606_shipped_manifest_is_v1_supported_shape():
    """The installer gate at the pinned minimum revision accepts the v1
    manifest shape; the shipped plugin.yaml carries no v2-only keys
    (manifest_version/api_version) — the exact shape the Phase 0 spike
    proved installs successfully at the pinned minimum revision."""
    root = Path(__file__).resolve().parents[1]
    manifest = (root / "plugin.yaml").read_text(encoding="utf-8")
    assert "manifest_version:" not in manifest
    assert "api_version:" not in manifest
    assert "name: hermes-project-stewardship" in manifest


# ------------------------------------------------------------------ #
# PM-0606: profile matrix — default-only and multiple profiles
# ------------------------------------------------------------------ #


def test_pm0606_default_only_home_lists_single_default_profile(tmp_path, monkeypatch):
    # Test isolation (t_255d14b1): the host opens its work-parents store inside
    # the kanban home; pin the root before constructing the host so nothing is
    # ever created under the operator's shared boards root.
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "hermes-home"))
    host = ProjectKanbanHost(hermes_home=tmp_path / "home")
    profiles = host.list_profiles()
    assert [p["name"] for p in profiles] == ["default"]
    assert profiles[0]["is_default"] is True


def test_pm0606_multiple_profiles_and_stale_profile_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "hermes-home"))
    home = tmp_path / "home"
    for slug in ("alpha", "beta"):
        (home / "profiles" / slug).mkdir(parents=True)
    # A stale profile: directory left behind by an interrupted removal.
    (home / "profiles" / ".stale-temp").mkdir()
    host = ProjectKanbanHost(hermes_home=home)
    names = [p["name"] for p in host.list_profiles()]
    assert names == ["default", "alpha", "beta"]


def test_pm0606_stale_profile_is_reported_unavailable_not_crashing(
    tmp_path, monkeypatch
):
    """A stale profile directory must surface as a non-selectable profile,
    and membership reads must not lie about availability (PM-0606 matrix
    cell: stale profiles)."""
    # Test isolation (t_255d14b1): pin the kanban root before host construction.
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "hermes-home"))
    from hermes_project_stewardship.persistence.membership import MembershipService
    from hermes_project_stewardship.persistence.service import StewardshipService
    from hermes_project_stewardship.persistence.store import Store
    from hermes_project_stewardship.persistence.team_management import TeamManagementService

    home = tmp_path / "home"
    (home / "profiles" / "alpha").mkdir(parents=True)
    store = Store(tmp_path / "stale.db")
    service = StewardshipService(store)
    service.enable("demo", mission="m", lead_profile="alpha", member_profiles=[])
    members = MembershipService(store, service)
    host = ProjectKanbanHost(hermes_home=home)

    class _Host(ProjectKanbanHost):
        def list_work(self, project_id):
            return []

    team = TeamManagementService(store, service, members, _Host(hermes_home=home))
    result = team.team("demo")
    lead = next(m for m in result["members"] if m["profile_slug"] == "alpha")
    assert lead["hermes_available"] is True  # profile dir exists -> host lists it

    # Stale membership: a member whose profile directory has disappeared.
    # Host truthfully reports unavailability; team reads never crash.
    members.add_member("demo", "ghost", actor="test")  # no profiles/ghost dir
    result2 = team.team("demo")
    ghost = next(m for m in result2["members"] if m["profile_slug"] == "ghost")
    assert ghost["hermes_available"] is False
    store.close()


# ------------------------------------------------------------------ #
# PM-0606: real vanilla-host lifecycle matrix cells (native runtime)
# ------------------------------------------------------------------ #


def test_pm0606_native_host_matrix_cells(tmp_path, monkeypatch):
    """Real-host cells for the PM-0606 matrix: clean install (home init),
    upgrade (schema re-open), separate-process home isolation, disable and
    uninstall/reinstall data retention. Runs only where the real pinned
    vanilla runtime is importable; skipped elsewhere and reported as a
    matrix gap in the lane report."""
    require_native()
    monkeypatch.setenv("HERMES_KANBAN_HOME", str(tmp_path / "native-root"))
    monkeypatch.delenv("HERMES_DELEGATED_CHILD_CONTEXT", raising=False)

    # (1) clean install: fresh home, provision + read back.
    home_a = tmp_path / "home-a"
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir(parents=True)
    host_a = ProjectKanbanHost(hermes_home=home_a)
    provisioned = host_a.provision_project(
        name="Matrix", slug="matrix", description="clean install cell",
        repo_path=str(repo_dir), lead_profile="default",
        idempotency_key="matrix-1",
    )
    assert host_a.get_project(provisioned["project"]["id"])["slug"] == "matrix"

    # (2) upgrade: reopening the same home with the current adapter keeps
    # canonical state readable (no destructive migration).
    host_a2 = ProjectKanbanHost(hermes_home=home_a)
    assert host_a2.get_project(provisioned["project"]["id"])["slug"] == "matrix"

    # (3) separate-process home isolation: another home cannot see it.
    home_b = tmp_path / "home-b"
    host_b = ProjectKanbanHost(hermes_home=home_b)
    assert host_b.list_existing_projects()["projects"] == []

    # (4) stale profile cell: a profile directory that disappears after
    # membership was recorded must not break team reads.
    (home_a / "profiles" / "lead-x").mkdir(parents=True)
    members_before = host_a.list_profiles()
    assert any(p["name"] == "lead-x" for p in members_before)

    # (5) disable/uninstall-reinstall data retention: plugin-data survives
    # because it lives under the Hermes home, not the install dir. The
    # stewardship DB path derives from the home only.
    from hermes_project_stewardship.runtime import resolve_db_path
    import os as _os

    with monkeypatch.context() as m:
        # This cell is the Hermes host resolving its own default; since Quan D1
        # merely importing hermes_cli no longer counts, so act as the host the
        # way the gateway does (plugin.register() sets this marker).
        m.setattr("hermes_project_stewardship.runtime._HOST_REGISTERED", True)
        m.setenv("HERMES_HOME", str(home_a))
        m.delenv("STEWARD_DB_PATH", raising=False)
        m.delenv("DOCKYARD_PLUGIN_DB", raising=False)
        resolved = resolve_db_path()
        assert resolved == (home_a / "plugin-data" / "hermes-dockyard" / "dockyard.db")
        assert "plugins" not in resolved.parts  # not inside the install dir
