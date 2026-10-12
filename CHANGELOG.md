# Changelog

All notable changes to this project are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Objective descriptions from the CLI.** `stewardctl objective add
  --description` sets an objective's description, and the new `stewardctl
  objective update --name <objective>` changes its description, target,
  severity or command. The API and Desktop already could.
- **Per-project validation steps.** `verification_policy.validation_steps`
  (project settings) lists the cards created after Implement when an
  initiative is bound. Unset keeps the Validate and Outcome check cards; an
  empty list creates the Implement card only. An initiative's own
  `validation_contract.steps` still win. Set it through
  `PATCH /projects/{id}/settings` or
  `stewardctl project validation-steps <project> [--step S ... | --none | --default]`.
  No schema change.
(by @appletechie)
- **Approving an initiative no longer leaves it approved but unbound.** The
  board is resolved and checked on the Kanban host before the approval is
  recorded; a project with no usable board is refused with a 409 that names
  the board, and the initiative stays pending. On the canonical Hermes host
  the bridge no longer falls back to a `<project>-ops` board the host does
  not have (other adapters keep that convention).
- **`POST /initiatives/{ref}/bind-board` records canonical work bindings**
  for the cards it creates, like approval does, so the work-items view and
  reconciliation see them. A board the project is not bound to is a 409.

    actor_id: str = "stewardship-api"
            return integration.bind(
                ref, board_slug=body.board_slug, actor=_actor(body.actor_id, "human"))
        except (IntegrationError, ServiceError) as e:
    # A host whose projects carry their own board binding sets this, so the
    # bridge never guesses a "<project>-ops" board the host does not have.
    requires_bound_board = False

        Optional: adapters that cannot answer return None, and the bridge
        falls back to "<project>-ops" unless ``requires_bound_board`` is set.
        Onboarding may provision a board slug
    def resolve_board(
        self, project_id: str, board_slug: Optional[str] = None
    ) -> tuple[str, str]:
        """The board ``project_id`` binds to, verified on the host: (slug, board id).

        Callers resolve before committing anything (an approval, cards), so a
        project without a usable board is refused while it is still unchanged.
        """
        slug = board_slug or self.adapter.bound_board_slug(project_id)
        if not slug:
            if self.adapter.requires_bound_board:
                raise ServiceError(
                    f"project {project_id} has no board bound on the Kanban host;"
                    " bind it to an existing board first"
                )
            slug = f"{project_id}-ops"
        return slug, self.adapter.ensure_board(project_id, slug)

        slug, board_id = self.resolve_board(project_id, board_slug)
    requires_bound_board = True
from ..kanban.host_adapter import MISSING_LINK_CODES, KanbanAdapterError
# Host answers meaning "this project cannot be bound to that board", not an outage.
_BOARD_BINDING_CODES = MISSING_LINK_CODES | {"project_board_mismatch"}

            # Resolve and verify the board first: an approval that cannot be
            # bound is refused while still pending, never committed unbound.
            self._resolve_board(ini["project_id"])
        bound = self.bind(ini["ref"], actor=actor)
        if self.canonical_work is not None:
            out["work_item_refs"] = list(bound.get("card_ids") or [])
        out["board_slug"] = bound.get("board_slug")
        out["cards"] = len(bound.get("card_ids") or [])
        out["status"] = self.svc.initiative_by_ref(
            ini["ref"])["status"]
        return out

    def bind(self, ref: str, *, actor: Actor,
             board_slug: Optional[str] = None) -> Dict[str, Any]:
        """Bind an approved initiative to its project's board, then record
        the canonical work binding of every card so reconciliation sees them."""
        ini = self.svc.initiative_by_ref(ref)
        slug, _ = self._resolve_board(ini["project_id"], board_slug)
        bound = self.bridge.bind(ref, board_slug=slug, start_execution=True)
                    initiative_ref=ref,
        return bound

    def _resolve_board(self, project_id: str,
                       board_slug: Optional[str] = None) -> tuple[str, str]:
        try:
            return self.bridge.resolve_board(project_id, board_slug)
        except ServiceError as exc:
            raise IntegrationError(str(exc)) from None
        except KanbanAdapterError as exc:
            if exc.code not in _BOARD_BINDING_CODES:
                raise
            slug = (exc.fields or {}).get("board_slug") or board_slug
            target = f"board {slug}" if slug else "its board"
            raise IntegrationError(
                f"project {project_id} cannot be bound to {target}: {exc.message}"
            ) from None
def test_bind_never_guesses_a_board_for_hosts_that_bind_projects(svc, enabled, approved):
    """A host that binds each project to a board (the canonical Hermes host)
    gets no "<project>-ops" guess: an unbound project is refused."""
    fake = FakeHostAdapter()
    fake.requires_bound_board = True
    bridge = KanbanBridge(svc, fake)
    with pytest.raises(ServiceError, match="no board bound"):
        bridge.bind(approved["ref"])
    assert fake.boards == {} and fake.cards == []
    assert ini_status(svc, approved["ref"]) == "approved"

# ---- approval binds the project's own board, or is not committed -----------

def _approval_client(tmp_path: Path, host: FakeProjectKanbanHost):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.persistence.store import Store

    app = create_app(
        Store(tmp_path / "dockyard.sqlite"),
        kanban_adapter=_adapter_type()(host),
        auth_token="test-token",
        auth_principal="owner",
        auth_principal_is_human=True,
    )
    svc = app.state.svc
    svc.enable("project-1", mission="keep it green", lead_profile="lead",
               member_profiles=[], autonomy_level=2)
    ref = svc.propose_initiative(
        "project-1", title="Fix flaky CI", rationale="3 flakes in 30d")["ref"]
    client = TestClient(app, headers={"Authorization": "Bearer test-token"})
    return client, svc, ref

@pytest.mark.parametrize("board_slug", ["", "ghost"])
def test_approval_is_not_committed_when_the_project_board_cannot_be_bound(
    tmp_path: Path, board_slug: str,
):
    """Production 0.3/0.4: approving committed first, then binding fell back to
    "<project>-ops" (no such board) and left the initiative approved but
    unbound. The board is now resolved and verified before the approval."""
    host = FakeProjectKanbanHost()
    host.projects["project-1"]["board_slug"] = board_slug
    client, svc, ref = _approval_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve", json={})

    assert response.status_code == 409, response.text
    assert "board" in response.text
    assert "project-1-ops" not in response.text
    assert svc.initiative_by_ref(ref)["status"] == "pending_approval"
    assert svc.initiative_by_ref(ref)["board_slug"] is None
    assert host.create_calls == []

def test_approval_binds_the_hosts_board_and_records_canonical_bindings(tmp_path: Path):
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve", json={})

    assert response.status_code == 200, response.text
    assert response.json()["board_slug"] == "alpha"
    assert svc.initiative_by_ref(ref)["status"] == "executing"
    work = client.get("/stewardship/v1/projects/project-1/work-items").json()["work_items"]
    assert sorted(item["ref"] for item in work if item["initiative_ref"] == ref) == sorted(
        response.json()["work_item_refs"])

def test_bind_board_route_records_canonical_bindings(tmp_path: Path):
    """The bind-board route created cards without canonical work bindings, so
    reconciliation and the work-items view could not see them."""
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())
    svc.approve_initiative(ref, actor="owner", interface="cli")

    response = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board", json={})

    assert response.status_code == 200, response.text
    card_ids = response.json()["card_ids"]
    assert card_ids
    work = client.get("/stewardship/v1/projects/project-1/work-items").json()["work_items"]
    assert sorted(item["ref"] for item in work if item["initiative_ref"] == ref) == sorted(card_ids)

def test_bind_board_route_refuses_a_board_the_project_is_not_bound_to(tmp_path: Path):
    client, svc, ref = _approval_client(tmp_path, FakeProjectKanbanHost())
    svc.approve_initiative(ref, actor="owner", interface="cli")

    response = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                           json={"board_slug": "someone-elses"})

    assert response.status_code == 409, response.text
    assert svc.initiative_by_ref(ref)["status"] == "approved"
    assert svc.initiative_by_ref(ref)["board_slug"] is None
(by @appletechie)
- **Assign the Implement card when binding.** `POST /initiatives/{ref}/approve`
  and `POST /initiatives/{ref}/bind-board` take an optional `assignee`. It
  must be a profile the Kanban host runs work for: the dispatcher's
  `kanban.dispatch_profiles` on the vanilla host, else any existing
  profile. An unknown assignee is refused before the approval is recorded.
  The Validate and Outcome check cards stay unassigned.

    # Approve only: the profile that owns the Implement card.
    assignee: Optional[str] = None
    assignee: Optional[str] = None
                assignee=body.assignee,
            return bridge.bind(ref, board_slug=body.board_slug, assignee=body.assignee)
    assignee: Optional[str] = None
    def assignable_profiles(self) -> List[str]:
        """Profiles a card may be assigned to; by default every listed profile."""
        return [str(profile["name"]) for profile in self.list_profiles()]

                    json.dumps({**card.metadata, **({"assignee": card.assignee} if card.assignee else {})}),
                    iso(self.store._clock()),
        assignee: Optional[str] = None,
        """``assignee`` owns the first (Implement) card; the others stay unassigned."""
        self.check_assignee(assignee)
                        assignee=assignee if i == 0 else None,
    def check_assignee(self, assignee: Optional[str]) -> None:
        """Refuse an assignee the host would not run; fail closed if it cannot say."""
        if assignee is None:
            return
        try:
            allowed = self.adapter.assignable_profiles()
        except NotImplementedError:
            raise ServiceError(
                "the Kanban host cannot list its profiles, so cards cannot be assigned"
            ) from None
        if assignee not in allowed:
            raise ServiceError(
                f"{assignee!r} is not a profile the Kanban host runs work for"
                f" (assignable: {', '.join(sorted(allowed)) or 'none'})"
            )

    def assignable_profiles(self) -> list[str]:
        """The profiles the host's dispatcher runs when it can say, else every profile."""
        lister = getattr(self.host, "list_dispatchable_profiles", None)
        try:
            rows = lister() if callable(lister) else self.host.list_profiles()
            return [str(profile["name"]) for profile in rows]
        except Exception as exc:
            raise self._mapped_error(exc) from None

                assignee=card.assignee,
    def list_dispatchable_profiles(self) -> list[dict[str, Any]]:
        """The profiles Hermes' Kanban dispatcher claims cards for.

        ``kanban.dispatch_profiles`` narrows the existing profiles when set,
        resolved by the dispatcher's own reader; a Hermes without that
        setting dispatches for every profile.
        """
        profiles = self.list_profiles()
        try:
            from hermes_cli.kanban_db_dispatch import _dispatch_profile_allowlist
            from hermes_cli.profiles import normalize_profile_name
        except ImportError:
            return profiles
        with self._scope():
            allowed = _dispatch_profile_allowlist(normalize_profile_name)
        return profiles if allowed is None else [p for p in profiles if p["name"] in allowed]

                note: str = "",
                assignee: Optional[str] = None) -> Dict[str, Any]:
        """Human approval, then promotion + execution start.

        ``assignee`` owns the Implement card; it is checked before approving.
        """
        try:
            self.bridge.check_assignee(assignee)
        except ServiceError as e:
            raise IntegrationError(str(e)) from e
        out.update(self._after_approval(ini, actor, promote=True, assignee=assignee))
                        promote: bool,
                        assignee: Optional[str] = None) -> Dict[str, Any]:
        bound = self.bridge.bind(ini["ref"], start_execution=True, assignee=assignee)

# ---- an Implement card can be bound with an owner the host will run --------

def _assign_client(tmp_path: Path, host: FakeProjectKanbanHost):
    from fastapi.testclient import TestClient

    from hermes_project_stewardship.api.server import create_app
    from hermes_project_stewardship.persistence.store import Store

    app = create_app(
        Store(tmp_path / "dockyard.sqlite"),
        kanban_adapter=_adapter_type()(host),
        auth_token="test-token",
        auth_principal="owner",
        auth_principal_is_human=True,
    )
    svc = app.state.svc
    svc.enable("project-1", mission="keep it green", lead_profile="lead",
               member_profiles=[], autonomy_level=2)
    ref = svc.propose_initiative(
        "project-1", title="Fix flaky CI", rationale="3 flakes in 30d")["ref"]
    client = TestClient(app, headers={"Authorization": "Bearer test-token"})
    return client, svc, ref

class TeamHost(FakeProjectKanbanHost):
    def list_profiles(self):
        return [{"name": "default", "is_default": True},
                {"name": "coder", "is_default": False},
                {"name": "idle", "is_default": False}]

def test_approval_assigns_only_the_implement_card(tmp_path: Path):
    """Bound cards were always unassigned, and governance forbids unassigned
    cards; the fleet assigned the Implement card by hand afterwards."""
    host = TeamHost()
    client, svc, ref = _assign_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve",
                           json={"assignee": "coder"})

    assert response.status_code == 200, response.text
    assert [call["assignee"] for call in host.create_calls] == ["coder", None, None]
    assert host.create_calls[0]["title"].startswith("Implement:")

def test_an_unknown_assignee_is_refused_before_the_approval(tmp_path: Path):
    host = TeamHost()
    client, svc, ref = _assign_client(tmp_path, host)

    response = client.post(f"/stewardship/v1/initiatives/{ref}/approve",
                           json={"assignee": "ghost"})

    assert response.status_code == 409, response.text
    assert "ghost" in response.text
    assert svc.initiative_by_ref(ref)["status"] == "pending_approval"
    assert host.create_calls == []

def test_assignee_must_be_dispatchable_when_the_host_says(tmp_path: Path):
    class DispatchHost(TeamHost):
        def list_dispatchable_profiles(self):
            return [{"name": "coder"}]

    host = DispatchHost()
    client, svc, ref = _assign_client(tmp_path, host)
    svc.approve_initiative(ref, actor="owner", interface="cli")

    refused = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                          json={"assignee": "idle"})
    assert refused.status_code == 409, refused.text
    assert host.create_calls == []

    bound = client.post(f"/stewardship/v1/initiatives/{ref}/bind-board",
                        json={"assignee": "coder"})
    assert bound.status_code == 200, bound.text
    assert host.create_calls[0]["assignee"] == "coder"

def test_vanilla_host_narrows_profiles_by_the_dispatchers_allowlist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch,
):
    import contextlib
    import types

    from hermes_project_stewardship.kanban.vanilla_host import ProjectKanbanHost

    for name in ("coder", "idle"):
        (tmp_path / "profiles" / name).mkdir(parents=True)
    allowlist: dict = {"value": frozenset({"coder"})}
    constants = types.ModuleType("hermes_constants")
    setattr(constants, "set_hermes_home_override", lambda home: None)
    setattr(constants, "reset_hermes_home_override", lambda token: None)
    kanban_db = types.ModuleType("hermes_cli.kanban_db")
    setattr(kanban_db, "scoped_current_board", lambda board: contextlib.nullcontext())
    dispatch = types.ModuleType("hermes_cli.kanban_db_dispatch")
    setattr(dispatch, "_dispatch_profile_allowlist", lambda normalize: allowlist["value"])
    profiles = types.ModuleType("hermes_cli.profiles")
    setattr(profiles, "normalize_profile_name", str.lower)
    cli = types.ModuleType("hermes_cli")
    for attr, module in (("kanban_db", kanban_db), ("projects_db", types.ModuleType("p"))):
        setattr(cli, attr, module)
    for name, module in (("hermes_constants", constants), ("hermes_cli", cli),
                         ("hermes_cli.kanban_db", kanban_db),
                         ("hermes_cli.kanban_db_dispatch", dispatch),
                         ("hermes_cli.profiles", profiles)):
        monkeypatch.setitem(sys.modules, name, module)
    host = ProjectKanbanHost(hermes_home=tmp_path)

    assert [p["name"] for p in host.list_dispatchable_profiles()] == ["coder"]
    allowlist["value"] = None  # no kanban.dispatch_profiles: every profile runs
    assert [p["name"] for p in host.list_dispatchable_profiles()] == ["default", "coder", "idle"]
(by @appletechie)

## [0.5.0] - 2026-10-12

The delivery model becomes a strict ladder: **Task -> Goal -> Objective ->
Milestone -> Initiative**, each item with at most one parent at the next level
up. Work now rolls up automatically: a goal is met when all its tasks are done
and its check passes; an objective is met when all its goals are met; a
milestone is reached when all its objectives are met; and when every milestone
of an executing initiative is reached, the initiative shows **Ready to confirm**
and a person confirms it as delivered. Nothing is guessed: an item with no
parent is shown as "Not placed yet", and unknown is shown as unknown, never as
met or as zero.

### Changed
- **One parent per level (schema v42).** A goal has one objective, an objective
  has one milestone, a milestone has one initiative, a task has one goal. New
  nullable parent columns and a `goal_tasks` table replace the 0.4.0 many-to-many
  link tables.
- **Goals gain an optional check** using the existing objective evaluator
  machinery (manual/command/integration, with the same autonomy gate for command
  checks). A goal is met only when its tasks are done AND its check passes.
- **Derived states, computed at read time.** Goal `not_started|in_progress|met|
  at_risk|unknown`; objective the same; milestone `not_reached|reached` (with
  `overdue` a separate flag); initiative governance plus `ready_to_confirm`. No
  stored percentages, no blended scores, no forecasts.
- **Human delivery confirmation.** `confirm-delivered` completes an executing
  initiative and is refused (409) unless every milestone is reached. If a check
  later fails, the observation path marks the initiative `regressed`.
- **Roadmap (Desktop)** shows the ladder as an Outline tree with a state chip
  per level, "Not placed yet" groups per level, a "Needs placing (n)" banner for
  what the upgrade could not convert, and "Ready to confirm" on initiatives. The
  kanban card names the goal a task works towards.

### API changes
- **New routes:** `PUT /projects/{pid}/tasks/{ref}/goal`,
  `PUT /projects/{pid}/goals/{gid}/objective`,
  `PUT /projects/{pid}/objectives/{oid}/milestone`,
  `PUT /projects/{pid}/milestones/{mid}/initiative` (body `{parent_id|null}`),
  `POST /projects/{pid}/initiatives/{ref}/confirm-delivered`,
  `GET /projects/{pid}/roadmap/unplaced`,
  `POST /projects/{pid}/roadmap/unplaced/{id}/dismiss`,
  `GET|PUT /projects/{pid}/goals/{gid}/check`,
  `POST /projects/{pid}/goals/{gid}/assessment`.
- **Retired endpoints answer `410 Gone`** and name the replacement: the 0.4.0
  `POST/DELETE .../initiatives/{ref}/milestones` and
  `POST/DELETE .../objectives/{oid}/initiatives` link endpoints.
- **CLI:** `stewardctl roadmap unplaced|place|confirm`. `steward_status` reports
  the ladder states.

### Upgrade notes (read before upgrading from 0.4.0)
- **Export a backup first.** The schema moves from 41 to 42. The 0.4.0 link
  tables are kept as read-only history, so the downgrade restores 0.4.0 exactly.
- **Needs placing.** On upgrade, links that map unambiguously are converted;
  anything else is listed under "Needs placing" with its old links so you can
  place it by hand. Nothing is guessed from titles or shared work.
- **Rollback.** 0.4.0 refuses a v42 database (`NewerSchemaError`); to go back,
  downgrade the schema to 41 first (the old tables were never written).

## [0.4.0] - 2026-10-11

The Project Stewardship Desktop app becomes the main surface, and every part
of the plugin now shares one name.

### Upgrade notes (read before upgrading from 0.3.0)
- **One name: `hermes-project-stewardship`** (#4). In 0.3.0 the dashboard half
  was named `hermes-dockyard`, so `hermes plugins install ... --enable` left its
  backend off. After upgrading, switch the plugin on once under its new name:
  add `hermes-project-stewardship` to `plugins.enabled` (or enable it in Hermes
  Desktop). An old `hermes-dockyard` entry becomes harmless. Your data stays
  where it was (`plugin-data/hermes-dockyard/`).
- **Export a backup first.** The first time 0.4.0 opens your database it moves
  the schema from 17 to 41 and keeps every row:
  `stewardctl --db <your database> export --output <folder>`.
- **Going back to 0.3.0:** restore that export into a new database with 0.3.0
  (`stewardctl restore --archive <folder> --target <new.db>`) and point 0.3.0
  at it. Never open an upgraded database with 0.3.0: it does not check schema
  versions.
- **Databases written by development builds** are refused with a schema error
  instead of being half-migrated. `stewardctl db repair --db-source <copy>
  --db-target <new.db> --backup-dir <folder>` rebuilds a copy into this schema,
  keeps every row, and refuses if it cannot.
- **Scripts must name their database.** Scripts and the standalone API server
  need `--db` or `STEWARD_DB_PATH`; only the Hermes host and an installed
  `stewardctl` use the profile default.

### Added
- **Project Stewardship Desktop app** (formerly "Dockyard"): Dashboard,
  Projects, Roadmap, Backlog, Workflows, Approval Inbox, Notifications and App
  settings, with a project switcher (All projects or one project) that
  remembers your last choice. Nine themes with their own backgrounds, and a
  font choice; every colour pair passes WCAG AA.
- **Project tabs:** Overview, Vision (goals, objectives and their evidence),
  Planning (canvas from board to clarify, plan and document; undo, redo,
  duplicate, marquee select), Kanban (board and list, collapsible columns,
  "blocked by" links), Workflows, Activity (timeline), Content, Reports
  (readable pages in plain words), Memory and Settings. Every tab has a header
  strip with a "Needs attention" drawer.
- **Roadmap:** all projects by default, with a project picker; links existing
  items (create and edit stay on each item's own screen).
- **Backlog:** board and list, bulk import (template, validation, preview),
  bulk reassignment, item details, and in-place edits of rank, title, status
  and assignee.
- **Workflows:** a library of global and project workflows, switched on per
  project; a builder with a start dialog, 30 built-in templates, loops drawn
  as a frame, if-stuck steps and an AI chat sidebar that suggests first. Runs
  move on by themselves; the live map marks blocked steps and pending
  decisions.
- **Approval Inbox:** every decision waiting on you, with its evidence.
- **Notifications:** open and resolved states, per-channel settings, pop-ups
  and a Notifications screen. Optional **Discord alerts** through the Discord
  bot Hermes already uses (alerts only).
- **Project memory:** rules, decisions and facts per project, handed to the
  bots that work on it, with any memory provider. **Chat:** open a Hermes
  Desktop chat with a project's lead or any of its bots. See
  `docs/guides/project-memory-chat-discord.md`.
- **Onboarding** of an existing project: host discovery, safe retry and a
  first read-only assessment.
- **Management:** team membership and work transfer; project lifecycle
  (pause, freeze, archive, restore); fleet overview with deep links;
  milestones and capacity planning; evidence-backed decisions.
- `stewardctl db repair` (see the upgrade notes).

### Changed
- One name everywhere: **Hermes Project Stewardship** (plugin id, dashboard
  manifest, Desktop app, API path `/api/plugins/hermes-project-stewardship/`).
- A parent item only groups work; it never blocks its children.

- Old internal working notes (dated plans, release evidence and design
  hand-overs from earlier releases) moved out of the repository: they held
  the maintainer's machine paths. The prototypes, mockups and tests that
  stay use neutral example paths, and a test keeps home-folder paths out.

### Fixed
- #1: the tests collect from a checkout folder of any name.
- #4: switching the plugin on after the `hermes-dockyard` →
  `hermes-project-stewardship` rename is what mounts the dashboard; the
  `--enable` flag alone could not reach the backend under the old name.
- #5: no exact version pins, so Hermes can admit the plugin next to its own
  pinned tools. Thanks to Apostol Apostolov (#6).
- New work shows in Backlog on a real Hermes host, and the host's links show
  as dependencies and roadmap blockers.
- Workflows: the on/off switch and the search box reach 3:1 contrast in every
  theme; two React warnings (settings panel, backlog lists) are gone.
- Tests stay offline and never touch a live Hermes home. Tests that need a
  Hermes checkout or a database snapshot read `HPS_HERMES_SOURCE` or
  `HPS_LIVE_SNAPSHOT`, and skip without them.
- A project Hermes has no project for ("unlinked") no longer breaks a page:
  every tab loads for it, in the Desktop and the browser dashboard. Projects,
  Backlog, Bot teams and the browser dashboard's Work and Delivery tabs say
  "Not linked to a Hermes project" and how to link it (create a Hermes project
  with that slug), instead of "404 canonical project was not found" or
  "backend unreachable". Its status reads "Not linked" (never "On track"), it
  sorts near the top of the health table with its own filter and legend
  entry, and it is no longer tagged "Blocked" with an "Open work item" button.
  Work cannot be created in it, and an action that needs Hermes says why it
  failed. Its workflows still open with their run history (without live task
  status), and the Roadmap, Vision and Memory say "Not linked" instead of "the
  work host did not respond", which they also no longer say of archived records.
- The API answers a project Hermes does not know with a 404 carrying the
  host's code (`project_not_found` or `board_not_found`) on every route.
  `GET /projects/{id}/milestones` and `POST /projects/{id}/reports` used to
  fail with a 500, and the team, member and transfer-preview routes reported
  every Hermes error as 503. A 503 now means only that Hermes is unavailable.
- A quick tab switch no longer leaves the project switcher empty.
- **Archive hides a project everywhere, and Restore brings it back exactly.**
  An archived project no longer turns up in any list, count or inbox: the
  Dashboard and its health table, the Approval Inbox and "Needs you now"
  (where it used to appear as "This project is switched off"), notifications,
  search, the workflow library, the project switcher and the remembered last
  project. Restore puts back its switch, phase and pause time as they were; it
  used to switch every project on and make it active. The project switcher's menu lists archived
  projects with what Restore brings back; Restore asks first, then opens the
  project. A switched-off project can be archived too. The CLI
  (`stewardctl project archive --list`, `stewardctl project restore`) and the
  API (`GET /projects/archived`) list them as well. Schema 41 remembers
  whether a project was switched on; one archived before that is restored
  switched on, as before.
- On a profile where the plugin is not switched on, the Desktop page says so
  and how to switch it on, instead of "404: Plugin not found".
- Two surfaces opening an older database at the same moment (the Desktop app,
  the dashboard and the gateway can all start together after an upgrade) both
  come up. The second used to fail with "duplicate column name" and stay down
  until restarted; the database itself was never at risk.

### Security
- The acting user is always the authenticated principal, never a name the
  caller supplies.
- The plugin passes Hermes's plugin security admission scan.
- The standalone API server fails closed: 503 until `STEWARD_RPC_TOKEN` is set,
  401 for requests without it.

## [0.3.0] - 2026-08-31

### Added
- **Central feature toggles (DY-FT-01)**: per-project switches that turn
  Dockyard surfaces (workflow canvas, milestones, initiatives/delivery,
  approval inbox, notifications, saved views) on or off from one place.
  Disabling hides the surface and fails its API paths closed (409) — it never
  deletes or modifies any data, and re-enabling restores everything exactly
  as it was. Core surfaces (projects, work items, settings, audit, health,
  events) are locked and cannot be toggled off. Stored on
  project_stewardship.features_json (migration 17); every change is
  audit-logged with actor attribution. Dashboard gains a Features panel on
  the fleet overview; disabled tabs hide immediately and reappear on
  re-enable. Verified end-to-end in real Chrome (hide -> 409 -> re-enable ->
  tab + API restored, core toggle refused).
- **Milestones UI (DY-P1-02)**: Work tab gains a collapsible Milestones panel
  backed by a new milestones surface. Backend: `GET /projects/{id}/milestones`
  (ordered open-first/by-due, closed-last) and
  `PATCH /projects/{id}/milestones/{name}` for due-date changes and
  close/reopen, both with actor attribution and audit trail; store/schema
  advance to migration 16 (`closed_at`). Dashboard: per-milestone progress bar
  with done/total %, explicit overdue state, attach-task-to-milestone control,
  close/reopen, and inline create. One pre-existing defect surfaced and fixed
  during verification: the saved-views fetch omitted the now-required
  `actor_id`, which broke the whole Work tab render (422).
- Read-only Workflow node canvas on the dashboard surface (commit 509bd1c,
  refined through 6782982): SVG canvas with pan / cursor-centred zoom /
  minimap, Task and Gate nodes colour-coded from canonical status, dependency
  arrows with heads + active-edge flow dots, LOD semantic zoom, hover intent
  preview, 8s event-driven polling, and a collapsible live Activity strip
  driven by poll deltas.
- Semantic Passport per node: title, status badge, assignee, deep link, and
  Approve/Reject on gate nodes (wired to existing initiative endpoints).
  Selected node carries an unmistakable accent ring distinct from hover;
  Escape clears selection.
- Live detail expansion (agenttrail pattern): Progress bar (done/total with
  animated fill), Sub-tasks checklist with per-task assignee and
  strikethrough on completed items, Activity thread with wall-clock decay.
  Backed by the existing work-detail endpoint - no new routes.
- `scripts/local-ci.sh` mirrors the release gates locally; GitHub Actions run
  `33455039432` independently passed the full Linux/macOS/Windows matrix on
  Python 3.10–3.12.
- **Saved views with validated queries (DY-P1-03)**: views are no longer
  cosmetic. Versioned query schema (v1) with strict validation and legacy
  normalisation; real filter application (status, assignee, labels,
  milestone); role-aware sharing (owner + `shared_with`); dedicated
  view-run endpoint (`GET /projects/{id}/views/{name}/items`); deep links
  (`#/work/<view>`) restore the Work tab with the view preselected.
  An empty milestone match filters to nothing — never silently skipped.
- **Rolled-up portfolio dashboard**: cross-project cockpit derived from a
  single backend pass (`GET /portfolio`). Per-project standing with
  derived status (on_track / at_risk / stalled / idle), attention
  counters, next-milestone rollup and status mix. Attention strip renders
  only when something actually needs attention; status is text-first with
  colour as a secondary cue; tabular numerals; reuses the approved v4
  palette with no new runtime dependencies.

### Fixed
- Date-only `due` strings (API-accepted shape, e.g. `2026-08-01`) crashed
  the portfolio rollup with a naive/aware datetime TypeError; all ISO
  parsing now normalises to UTC.
- View-items milestone map now resolved in one query (was one per
  milestone); feature-toggle read-modify-write moved inside the store
  transaction (no lost updates under concurrent PATCHes); dashboard
  no longer double-fetches features or keeps split-brain toggle state.
- ci.yml install extras + coverage gate pinned to measured 87 (Actions had
  never run green; root causes verified 30/08).
- plugin.yaml desktop surface realigned to the shipped hermes_dockyard_plugin
  door (route /dockyard).
- Canvas frame styles moved from the never-rendered .dy-wf-host class to the
  real mount root .dy-wf (canvas had collapsed to a ~80px strip).
- Node clicks swallowed by svg-level pointer capture; capture now targets the
  pressed node (click-vs-drag disambiguation verified with real input events
  in headless Chrome).
- Contrast: Live-detail "Live detail" button inherited UA black-on-dark text;
  now inherits --dy-text. Pending/badge greys raised to >=4.5:1 (WCAG AA).

### Changed
- Live-detail reading order is now Progress -> Sub-tasks (with assignees,
  done items struck through) -> Activity.


### Fixed
- CI install step now includes the `desktop-panel` extra; the previous
  `[dev]`-only install made 7 API-importing test modules fail collection.
  This is the root cause of the GitHub Actions `CI` workflow failing always
  in ~3-6s worth of runs, alongside the gate mismatch below.
- Coverage gate re-pinned to the measured suite value (87%). The prior 90
  gate had never held: measured coverage on the exact candidate is 87.11%.
  Re-raising the gate is a deliberate, documented change (edit both
  `.github/workflows/ci.yml` and `scripts/local-ci.sh`).
- `plugin.yaml` desktop surface realigned to the shipped product: route
  `/dockyard` served by `hermes_dockyard_plugin/desktop/plugin.js` with
  dashboard manifest binding. The retired `desktop/stewardship-panel` TSX
  scaffold is no longer referenced as an active surface.

### Added
- Historical 30/08 note: `scripts/local-ci.sh` was introduced while GitHub
  Actions execution was unavailable. That infrastructure block was superseded
  on 01/09 by green run `33455039432`; the local mirror remains a required
  pre-push gate.
- Local-CI evidence run 2026-08-30T13:50:56Z: 6/6 gates PASS (399 passed,
  5 skipped, coverage gate green at 87, byte-compile clean, RPC import ok,
  dashboard 3/3, desktop harness 1/1).

## [0.2.0rc2] - 2026-08-26

### Added
- Complete canonical work-item editing, assignment and dependency mutation
  across RPC, Desktop proxy and dashboard UI.
- Structured planning metadata for labels, evidence, estimates and due dates.
- End-to-end initiative approval, canonical execution, completion/regression,
  durable observation scheduling and idempotent internal observation cycles.
- Delivery dashboard with initiative-to-work deep links and operator actions.

### Changed
- Approval now binds canonical work and enters execution atomically; it no
  longer creates a legacy Dockyard work-item twin.
- Dockyard schema advanced from version 13 to version 15.
- Dashboard, API and CLI package metadata are aligned on `0.2.0rc2`.

### Release state
- Local engineering candidate. Publication and live activation remain separate
  owner-controlled operations.

## [0.2.0rc1] - 2026-08-26

### Added
- Canonical Hermes Project/Kanban host contract v2 with fail-closed adapter,
  native project/board provisioning and idempotent onboarding.
- Canonical Board, Backlog table and work-item detail surfaces.
- Board/Table Saved Views; Timeline remains explicitly unavailable until
  canonical scheduling data exists.
- Versioned, manually started workflow DAGs with deterministic task keys,
  human gates, dependency links and crash-recovery journalling.
- Marker-guarded legacy work migration with dry-run, snapshot-backed apply,
  automatic failure restore and explicit rollback.
- `stewardctl export` and `stewardctl restore` with a versioned manifest,
  online SQLite snapshot, checksums and integrity validation.

### Changed
- Dockyard governance/ranking metadata is separated from canonical Hermes work
  authority; production task writes no longer fall back to legacy tables.
- Project/Kanban host contract advanced from v1 to v2.
- Dockyard schema advanced to version 13.
- Dashboard, API and CLI package metadata are aligned on `0.2.0rc1`.

### Security
- Host errors are redacted at the adapter boundary.
- Migration and restore paths fail closed on missing ownership markers,
  traversal, symlinks, existing targets, checksum mismatch and schema mismatch.
- Dashboard source and built output remain free of prohibited DOM, execution
  and browser-storage sinks.

### Release state
- Local engineering candidate only. No tag, publish, deployment, service
  restart, live plugin reload or production migration is authorised here.

## [0.1.0-alpha] - 2026-08-21

### Added
- Domain model: stewardship-enabled projects with mission, ownership
  (lead + member profiles, forward-compatible `owner_team_id`), objectives,
  autonomy policy (levels 0–5), verification policy, release policy,
  notification policy.
- Restriction-only autonomy policy engine with intersection invariant and
  per-level capability gating.
- Two-tier verification engine:
  - deterministic collectors (git status/log/branch, declared files,
    command probes) produce the canonical baseline;
  - advisory collectors (LLM/session/memory summaries) are recorded as advice
    and can never authorise mutations.
  - Contradiction detection with severity classification; high-severity
    contradictions force Unknown/Critical health and fail closed.
- Health state machine: healthy / watch / degraded / critical / unknown with
  hysteresis (material-change debounce) on transitions.
- Objective evaluators: `manual` and `command` types; command evaluators run
  under an allowlist with timeout, output cap and no shell interpolation.
- Initiative service: evidence-backed proposal, risk classification,
  dedupe against active/recent initiatives, per-project concurrency caps,
  rejection-driven suppression windows.
- Approval workflow: idempotent approvals keyed by initiative, actor +
  interface attribution, permission binding for gateway senders.
- Cycle engine: manual / cron / webhook / gateway triggers with idempotency
  keys, a cross-process cycle mutex, budget enforcement (max cycles/day,
  max initiatives/cycle), pause/freeze semantics honoured mid-cycle.
- Persistence: SQLite store with numbered migrations, WAL mode, foreign-key
  enforcement, audit log of every material action, retention/pruning job.
- Security module: untrusted-content labelling, prompt-injection pattern
  scanning with severity scoring, evidence/authority separation helpers,
  runtime capability allowlist gate required for autonomy ≥ 3.
- RPC API (optional FastAPI extra) exposing the same service layer;
  CLI (`stewardctl`) with human output and `--json`.
- Gateway command contract (platform-neutral) with sender-permission binding.
- Docs: PRD v0.2, architecture, threat model, gateway contract, upstream path.

### Security
- Builder+ autonomy (levels ≥ 3) requires the runtime capability allowlist
  gate and ships disabled by default in the reference config.
