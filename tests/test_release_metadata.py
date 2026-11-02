from __future__ import annotations

import json
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python 3.10
    import tomli as tomllib

from hermes_project_stewardship.api.server import create_app
from hermes_project_stewardship.cli.ui import __version__
from hermes_project_stewardship.persistence.store import Store


ROOT = Path(__file__).resolve().parents[1]


def test_active_release_metadata_is_coherent(tmp_path):
    version = "0.5.4"
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    assert project["project"]["version"] == version
    assert __version__ == version
    manifest = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/manifest.json").read_text(
            encoding="utf-8"))
    package = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/package.json").read_text(
            encoding="utf-8"))
    package_lock = json.loads(
        (ROOT / "hermes_dockyard_plugin/dashboard/package-lock.json").read_text(
            encoding="utf-8"))
    plugin_text = (ROOT / "plugin.yaml").read_text(encoding="utf-8")
    assert manifest["version"] == version
    assert package["version"] == version
    assert package_lock["version"] == version
    assert package_lock["packages"][""]["version"] == version
    assert f"version: {version}" in plugin_text
    store = Store(tmp_path / "version.db")
    app = create_app(store)
    assert app.version == version
    store.close()
    assert version in (ROOT / "README.md").read_text(encoding="utf-8")
    assert f"[{version}]" in (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")


def test_vanilla_plugin_distribution_layout_exists():
    assert (ROOT / "__init__.py").is_file()
    assert (ROOT / "dashboard/manifest.json").is_file()
    assert (ROOT / "dashboard/plugin_api.py").is_file()
    assert (ROOT / "dashboard/dist/index.js").is_file()
    assert (ROOT / "desktop/plugin.js").is_file()


def test_runtime_dependencies_are_declared():
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    plugin_deps = project["project"]["optional-dependencies"]["plugin"]
    assert any(dep.startswith("httpx2") for dep in plugin_deps)
    assert any(dep.startswith("fastapi") for dep in plugin_deps)


def test_no_requirement_pins_an_exact_version():
    """Issue #5: Hermes admits a plugin by locking its own pinned dependencies together
    with the plugin's dependencies and EVERY extra, dev tooling included (one uv
    workspace, `uv lock`). An exact pin anywhere here therefore stops the plugin being
    enabled as soon as Hermes pins another version (ty==0.0.21 vs Hermes' ty==0.0.82).
    Our own CI stays reproducible through uv.lock, not through pins in pyproject.toml.
    """
    from packaging.requirements import Requirement

    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]
    groups = {"dependencies": project.get("dependencies", []),
              **project.get("optional-dependencies", {})}
    exact = [
        f"{group}: {spec}"
        for group, specs in groups.items()
        for spec in specs
        if any(s.operator == "===" or (s.operator == "==" and not s.version.endswith(".*"))
               for s in Requirement(spec).specifier)
    ]
    assert exact == [], f"exact pins stop Hermes admitting the plugin (#5): {exact}"


def test_verify_bootstrap_installs_the_host_side_yaml_libraries():
    """R-GATE (3b). The native tests import a Hermes source tree that is not
    installed, so the test venv needs the packages that tree imports. The
    minimum supported Hermes imports `yaml` (pyyaml); newer supported revisions
    also import `ruamel.yaml` (their hermes_yaml.py), and without it those tests
    error. `hermes verify` must therefore install both, or the release gate
    only passes where someone installed them by hand."""
    recipe = json.loads((ROOT / ".hermes" / "environment.json").read_text(encoding="utf-8"))
    installed = {
        token
        for command in recipe["bootstrap"]
        if command.startswith("uv pip install ")
        for token in command.split()[3:]
        if not token.startswith("-") and token != ".venv/bin/python"
    }
    assert {"pyyaml", "ruamel.yaml"} <= installed, installed


def test_audit_tool_constraints_are_secure_on_each_supported_python():
    """Keep 3.10 support without admitting any locking release we can avoid.

    Python 3.11+ must take the patched filelock line. Python 3.10 has no patched
    release at all, so it keeps the 3.20.3 line (fewest advisories) and the two
    that remain are ignored by scripts/audit_python.py, tested below."""
    from packaging.markers import default_environment
    from packaging.requirements import Requirement
    from packaging.version import Version

    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    requirements = [Requirement(dep) for dep in project["project"]["optional-dependencies"]["dev"]]
    for python in ("3.10", "3.11", "3.12", "3.14"):
        environment = {**default_environment(), "python_version": python,
                       "python_full_version": python + ".0"}
        active = [dep for dep in requirements
                  if dep.marker is None or dep.marker.evaluate(environment)]
        locking = [dep for dep in active if dep.name == "filelock"]
        certificates = [dep for dep in active if dep.name == "certifi"]
        assert len(locking) == len(certificates) == 1, python
        safe_lock = "3.20.3" if python == "3.10" else "4.2.1"
        assert Version(safe_lock) in locking[0].specifier, python
        for vulnerable in ("3.20.2", "3.20.4", "3.32.5", "4.2.0"):
            assert Version(vulnerable) not in locking[0].specifier, (python, vulnerable)
        assert Version("2026.10.19") in certificates[0].specifier
        assert Version("2026.7.22") not in certificates[0].specifier
        msgpacks = [dep for dep in active if dep.name == "msgpack"]
        assert len(msgpacks) == 1, python
        assert Version("1.2.3") in msgpacks[0].specifier, python
        assert Version("1.2.2") not in msgpacks[0].specifier, python


def _audit_wrapper():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "audit_python", ROOT / "scripts" / "audit_python.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_audit_exception_is_scoped_to_python_310_and_two_filelock_advisories():
    """The one documented audit exception must stay narrow: exactly the two
    filelock advisories, only on Python 3.10, with every other advisory still
    failing the audit on every version."""
    audit = _audit_wrapper()
    assert audit.PYTHON_310_ONLY_IGNORES == ("CVE-2026-112909", "CVE-2026-112910")
    ignored = audit.audit_command((3, 10, 20))
    assert [ignored[i + 1] for i, a in enumerate(ignored) if a == "--ignore-vuln"] == \
        list(audit.PYTHON_310_ONLY_IGNORES)
    for version in ((3, 11, 0), (3, 12, 9), (3, 14, 7)):
        assert "--ignore-vuln" not in audit.audit_command(version), version
    assert audit.audit_command((3, 14, 7), extra=("--strict",))[-1] == "--strict"


def test_ci_and_local_gate_audit_through_the_single_wrapper():
    """Both gates call scripts/audit_python.py, so the exception cannot drift
    between CI and the local mirror (or be widened in only one of them)."""
    workflow = (ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    local = (ROOT / "scripts" / "local-ci.sh").read_text(encoding="utf-8")
    assert "scripts/audit_python.py" in workflow
    assert "scripts/audit_python.py" in local
    for text in (workflow, local):
        assert "--ignore-vuln" not in text
        assert "-m pip_audit" not in text
        assert "pip-audit\n" not in text.split("Audit Python dependencies", 1)[-1][:120]
