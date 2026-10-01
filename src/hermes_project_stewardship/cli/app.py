"""stewardctl — command-line control plane for Project Stewardship.

Human-readable output by default; `--json` on every read command.
Exit codes: 0 ok; 1 refused (paused/frozen/budget/mutex/dedupe);
2 error (unknown project, bad args, failure).
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import List, Optional

from ..cycles.engine import CycleEngine, CycleRefused
from ..gateway.errors import CommandError
from ..persistence.backup import BackupError, export_store, restore_store
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store
from ..runtime import StateSelectionError, open_store
from .ui import (
    INITIATIVE_HEADERS,
    __version__,
    friendly_error,
    health_line,
    initiative_rows,
    paint,
    pick_initiative,
    render_table,
    state_glyph,
)

EXIT_OK = 0
EXIT_REFUSED = 1
EXIT_ERROR = 2


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="stewardctl",
        description="Durable project ownership for Hermes agent fleets.",
    )
    p.add_argument("--db", type=Path, default=None, help="override the profile-scoped stewardship DB")
    p.add_argument("--version", action="version", version=f"stewardctl {__version__}")
    sub = p.add_subparsers(dest="group", required=True)

    proj = sub.add_parser("project", help="project lifecycle")
    psub = proj.add_subparsers(dest="action", required=True)
    en = psub.add_parser("enable", help="enable stewardship on a project")
    en.add_argument("project_id")
    en.add_argument("--mission", default="")
    en.add_argument("--lead", dest="lead_profile", default=None)
    en.add_argument("--member", dest="member_profiles", action="append", default=[])
    en.add_argument("--autonomy", type=int, default=0, choices=range(0, 6))
    en.add_argument(
        "--repo", dest="repo_path", default=None,
        help="repo root used by verification collectors",
    )
    dis = psub.add_parser("disable")
    dis.add_argument("project_id")
    for act in ("pause", "resume", "freeze"):
        s = psub.add_parser(act)
        s.add_argument("project_id")
    st = psub.add_parser("status")
    st.add_argument("project_id")
    st.add_argument("--json", action="store_true")
    # PM-0602: project archive recovery (archive itself stays a Desktop
    # management action; the CLI carries list/restore for recovery).
    par = psub.add_parser("archive", help="list archived projects or archive one")
    par.add_argument("project_id", nargs="?", default=None)
    par.add_argument("--list", action="store_true")
    par.add_argument("--json", action="store_true")
    pre = psub.add_parser("restore", help="restore an archived project")
    pre.add_argument("project_id")

    team = sub.add_parser("team", help="project team membership (PM-0602)")
    tsub = team.add_subparsers(dest="action", required=True)
    tm = tsub.add_parser("members", help="list members incl. pending departures")
    tm.add_argument("project_id")
    tm.add_argument("--json", action="store_true")

    xfer = sub.add_parser("transfer", help="pending transfer operations (PM-0602)")
    xsub = xfer.add_subparsers(dest="action", required=True)
    xl = xsub.add_parser("list", help="list resumable transfer operations")
    xl.add_argument("--project", dest="project_id", default=None)
    xl.add_argument("--all", action="store_true", help="include completed/failed history")
    xl.add_argument("--json", action="store_true")
    xr = xsub.add_parser("retry", help="retry/resume a pending transfer operation")
    xr.add_argument("op_id")
    xr.add_argument(
        "--hermes-home", default=None,
        help="Hermes home of the Kanban host to resume against; required "
             "because the CLI process binds no host of its own",
    )

    content = sub.add_parser("content", help="managed project content (PM-0602)")
    csub = content.add_subparsers(dest="action", required=True)
    cr = csub.add_parser("remove", help="remove a managed file (destructive)")
    cr.add_argument("project_id")
    cr.add_argument("content_id")
    cr.add_argument(
        "--confirm", action="store_true",
        help="required: explicitly confirm the managed-file removal",
    )

    obj = sub.add_parser("objective", help="objective management")
    osub = obj.add_subparsers(dest="action", required=True)
    oa = osub.add_parser("add")
    oa.add_argument("project_id")
    oa.add_argument("--name", required=True)
    oa.add_argument("--evaluator", default="manual", choices=["manual", "command"])
    oa.add_argument("--target", default=">=1")
    oa.add_argument("--severity", default="medium", choices=["info", "low", "medium", "high"])
    oa.add_argument("--command", nargs="+", help="argv for command evaluator")
    ol = osub.add_parser("list")
    ol.add_argument("project_id")
    ol.add_argument("--json", action="store_true")

    health = sub.add_parser("health", help="latest health snapshot")
    health.add_argument("project_id")
    health.add_argument("--json", action="store_true")

    ini = sub.add_parser("initiative", help="initiative management")
    isub = ini.add_subparsers(dest="action", required=True)
    il = isub.add_parser("list")
    il.add_argument("project_id")
    il.add_argument("--status", default=None)
    il.add_argument("--json", action="store_true")
    iap = isub.add_parser("approve")
    iap.add_argument("ref")
    iap.add_argument("--actor", default="cli-user")
    irej = isub.add_parser("reject")
    irej.add_argument("ref")
    irej.add_argument("--actor", default="cli-user")
    ipick = isub.add_parser("pick", help="interactively approve a pending initiative")
    ipick.add_argument("project_id")
    ipick.add_argument("--actor", default="cli-user")

    run = sub.add_parser("run", help="run a stewardship cycle now")
    run.add_argument("project_id")
    run.add_argument("--idempotency-key", default=None)
    run.add_argument("--json", action="store_true")

    audit = sub.add_parser("audit", help="recent audit log")
    audit.add_argument("--limit", type=int, default=25)
    audit.add_argument("--json", action="store_true")

    export = sub.add_parser("export", help="export a consistent database snapshot")
    export.add_argument("--output", type=Path, required=True)

    restore = sub.add_parser("restore", help="restore an export into a new isolated DB")
    restore.add_argument("--archive", type=Path, required=True)
    restore.add_argument("--target", type=Path, required=True)

    return p


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.group == "restore":
        try:
            result = restore_store(args.archive, args.target)
        except BackupError as exc:
            print(friendly_error(str(exc)), file=sys.stderr)
            return EXIT_ERROR
        print(json.dumps(result, sort_keys=True))
        return EXIT_OK

    try:
        store = open_store(args.db)
    except (StateSelectionError, OSError) as exc:
        print(friendly_error(str(exc)), file=sys.stderr)
        return EXIT_ERROR
    svc = StewardshipService(store)
    engine = CycleEngine(svc)
    # Batch E1: the CLI surface reaches the same shared service path, so its
    # decisions emit the domain events that resolve approval notifications.
    # One shared wiring seam (review bug 2).
    from ..events.notifications import wire_notification_stack

    bus, notification_engine = wire_notification_stack(store, svc)
    engine.attach_events(bus)

    try:
        return _dispatch(args, svc, engine, store)
    except CycleRefused as e:
        print(friendly_error(str(e)), file=sys.stderr)
        return EXIT_REFUSED
    except (ServiceError, CommandError, BackupError) as e:
        print(friendly_error(str(e)), file=sys.stderr)
        return EXIT_ERROR
    finally:
        store.close()


def _transfer_host(hermes_home: Optional[str]):
    """Build the host-bound transfer retry surface, or refuse truthfully.

    The CLI has no host process binding of its own. Transfer retries write
    to the canonical Kanban through the adapter contract, so they run only
    when the operator explicitly supplies a Hermes home and the pinned
    vanilla runtime is importable. Anything else fails closed BEFORE the
    operation journal is touched — a pending operation is never reported
    as recovered when no host runtime exists.
    """
    if not hermes_home:
        return None, (
            "transfer retry needs a connected Hermes Kanban host runtime: "
            "pass --hermes-home <path>, or resume the operation from the "
            "Desktop backend, which binds the host process"
        )
    from ..kanban.host_adapter import ProjectKanbanHostAdapter
    from ..kanban.vanilla_host import ProjectKanbanHost

    raw_host = ProjectKanbanHost(hermes_home=hermes_home)
    try:
        raw_host._modules()  # force the lazy vanilla imports; fail closed if absent
        host = ProjectKanbanHostAdapter(raw_host)
    except ImportError as exc:
        return None, (
            f"vanilla Hermes runtime is not importable ({exc}); "
            "the pending operation was left untouched"
        )
    except Exception as exc:
        return None, f"host adapter does not implement the transfer contract: {exc}"
    if not hasattr(host, "list_work"):
        return None, "host adapter does not implement the transfer contract"
    return host, None


def _dispatch(args, svc: StewardshipService, engine: CycleEngine, store: Store) -> int:
    g = args.group
    if g == "export":
        manifest = export_store(store, args.output)
        print(json.dumps(manifest, sort_keys=True))
        return EXIT_OK
    if g == "project":
        if args.action == "enable":
            vp = {}
            if getattr(args, "repo_path", None):
                vp["repo_path"] = args.repo_path
            s = svc.enable(
                args.project_id,
                mission=args.mission,
                lead_profile=args.lead_profile,
                member_profiles=args.member_profiles,
                autonomy_level=args.autonomy,
                verification_policy=vp,
            )
            print(f"stewardship enabled for {s['project_id']} (autonomy L{s['autonomy_level']})")
            return EXIT_OK
        if args.action == "disable":
            svc.disable(args.project_id)
            print(f"stewardship disabled for {args.project_id}")
            return EXIT_OK
        if args.action in ("pause", "resume", "freeze"):
            fn = {"pause": svc.pause, "resume": svc.resume, "freeze": svc.freeze}[args.action]
            s = fn(args.project_id)
            print(f"{args.project_id}: phase={s['phase']}")
            return EXIT_OK
        if args.action == "status":
            s = svc.settings(args.project_id)
            h = svc.latest_health(args.project_id)
            if args.json:
                print(json.dumps({"settings": s, "health": h}))
            else:
                print(health_line(s["project_id"], h, s))
                print(paint(f"mission: {s['mission'] or '(none)'}", "grey"))
            return EXIT_OK
        if args.action == "archive":
            # PM-0602: essential archive recovery — list, or archive one.
            if args.list or args.project_id is None:
                archived = []
                for row in svc.list_projects():
                    settings = svc.settings(row["project_id"], include_disabled=True)
                    if settings.get("archived_at"):
                        archived.append(settings)
                if args.json:
                    print(json.dumps({"archived": [
                        {
                            "project_id": s["project_id"],
                            "phase": s["phase"],
                            "archived_at": s["archived_at"],
                            "archived_by": s["archived_by"],
                        }
                        for s in archived
                    ]}))
                else:
                    if not archived:
                        print("No archived projects.")
                    for s in archived:
                        print(f"- {s['project_id']} archived_at={s['archived_at']}")
                return EXIT_OK
            try:
                svc.archive_project(args.project_id, actor="cli-user", interface="cli")
            except ServiceError as e:
                print(friendly_error(str(e)), file=sys.stderr)
                return EXIT_ERROR
            print(f"archived {args.project_id}")
            return EXIT_OK
        if args.action == "restore":
            try:
                out = svc.restore_project(args.project_id, actor="cli-user", interface="cli")
            except ServiceError as e:
                print(friendly_error(str(e)), file=sys.stderr)
                return EXIT_ERROR
            print(f"restored {args.project_id} (phase={out['phase']})")
            return EXIT_OK

    if g == "team":
        if args.action == "members":
            from ..persistence.membership import MembershipService

            members = MembershipService(svc.store, svc).list_members(args.project_id)
            payload = {
                "project_id": args.project_id,
                "members": [m.__dict__ for m in members],
            }
            if args.json:
                print(json.dumps(payload))
            else:
                if not members:
                    print("No members.")
                for m in members:
                    marker = " (departure pending)" if m.state == "departure_pending" else ""
                    print(f"- {m.profile_slug} [{m.role}] {m.state}{marker}")
            return EXIT_OK

    if g == "transfer":
        if args.action == "list":
            sql = (
                "SELECT op_id, state, kind, project_id, created_at, updated_at"
                " FROM operation_journal"
            )
            params: list = []
            clauses = []
            if not getattr(args, "all", False):
                clauses.append("state IN ('pending','running')")
            if args.project_id:
                clauses.append("project_id=?")
                params.append(args.project_id)
            if clauses:
                sql += " WHERE " + " AND ".join(clauses)
            sql += " ORDER BY created_at DESC"
            rows = store._conn.execute(sql, params).fetchall()
            ops = [
                {
                    "op_id": r["op_id"],
                    "state": r["state"],
                    "kind": r["kind"],
                    "project_id": r["project_id"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                }
                for r in rows
            ]
            if args.json:
                print(json.dumps({"operations": ops}))
            else:
                if not ops:
                    print("No pending transfer operations.")
                for op in ops:
                    print(f"- {op['op_id']} [{op['state']}] {op['project_id']}"
                          f" ({op['created_at']})")
            return EXIT_OK
        if args.action == "retry":
            try:
                row = store._conn.execute(
                    "SELECT op_id FROM operation_journal WHERE op_id=?",
                    (args.op_id,),
                ).fetchone()
            except sqlite3.Error as exc:
                print(friendly_error(f"operation journal unreadable: {exc}"),
                      file=sys.stderr)
                return EXIT_ERROR
            if row is None:
                print(friendly_error("transfer operation not found: "
                                     f"{args.op_id}"), file=sys.stderr)
                return EXIT_ERROR
            host, refusal = _transfer_host(getattr(args, "hermes_home", None))
            if host is None:
                # Fail closed before any journal or canonical write.
                print(friendly_error(refusal or "transfer host unavailable"),
                      file=sys.stderr)
                return EXIT_ERROR
            from ..persistence.membership import MembershipService
            from ..persistence.team_management import PreviewConflict, TeamManagementService

            membership = MembershipService(svc.store, svc)
            tm = TeamManagementService(svc.store, svc, membership, host)
            try:
                operation = store._conn.execute(
                    "SELECT project_id FROM operation_journal WHERE op_id=?", (args.op_id,)
                ).fetchone()
                host.project_board(operation["project_id"])
                result = tm.retry(args.op_id, actor="cli-user")
            except KeyError:
                print(friendly_error("transfer operation not found: "
                                     f"{args.op_id}"), file=sys.stderr)
                return EXIT_ERROR
            except (ServiceError, PreviewConflict, ValueError) as e:
                print(friendly_error(str(e)), file=sys.stderr)
                return EXIT_ERROR
            print(f"{args.op_id}: {result['state']} "
                  f"(completed={result['completed_items']}, "
                  f"failed={len(result['failed_items'])})")
            return EXIT_OK if result["state"] == "completed" else EXIT_REFUSED

    if g == "content":
        if args.action == "remove":
            if not args.confirm:
                print(friendly_error(
                    "managed-file removal is destructive and requires explicit"
                    " confirmation; rerun with --confirm to erase the recorded"
                    " managed file (it is truncated to a zero-byte marker, not"
                    " securely physically erased)"
                ), file=sys.stderr)
                return EXIT_REFUSED
            try:
                result = svc.remove_project_content(
                    args.project_id, args.content_id,
                    actor="cli-user", interface="cli",
                )
            except ServiceError as e:
                print(friendly_error(str(e)), file=sys.stderr)
                return EXIT_ERROR
            print(f"removed {args.content_id} (removal_state="
                  f"{result['removal_state']})")
            return EXIT_OK

    if g == "objective":
        if args.action == "add":
            if args.evaluator == "command" and not args.command:
                print("error: --command required for command evaluator", file=sys.stderr)
                return EXIT_ERROR
            svc.add_objective(
                args.project_id,
                name=args.name,
                evaluator_type=args.evaluator,
                target=args.target,
                severity=args.severity,
                command=args.command,
            )
            print(f"objective '{args.name}' saved")
            return EXIT_OK
        if args.action == "list":
            objs = svc.objectives(args.project_id, include_disabled=True)
            if args.json:
                print(json.dumps([o.__dict__ for o in objs], default=str))
            else:
                for o in objs:
                    print(f"- {o.name} [{o.evaluator_type}] target={o.target} severity={o.severity}")
            return EXIT_OK

    if g == "health":
        h = svc.latest_health(args.project_id)
        if h is None:
            print(friendly_error("no snapshot yet — run: stewardctl run <project>"),
                  file=sys.stderr)
            return EXIT_ERROR
        if args.json:
            print(json.dumps(h))
        else:
            print(f"{state_glyph(h['status'])} {h['project_id']}: "
                  f"{h['status']} score={h.get('score')} at {h['created_at']}")
            for c in h.get("contradictions", []) or []:
                sev_colour = {"high": "red", "medium": "yellow"}.get(
                    c.get("severity"), "grey")
                print(paint(f"  ! [{c.get('severity')}] {c.get('detail')}", sev_colour))
        return EXIT_OK

    if g == "initiative":
        if args.action == "list":
            inis = svc.initiatives(args.project_id, status=args.status)
            if args.json:
                print(json.dumps(inis))
            else:
                if not inis:
                    print("No initiatives.")
                else:
                    print(render_table(INITIATIVE_HEADERS, initiative_rows(inis)))
            return EXIT_OK
        if args.action == "approve":
            out = svc.approve_initiative(args.ref, actor=args.actor, interface="cli")
            print(f"{state_glyph('healthy')} {out['ref']} approved")
            return EXIT_OK
        if args.action == "reject":
            out = svc.reject_initiative(args.ref, actor=args.actor, interface="cli",
                                       reason="rejected via CLI")
            print(f"{out['ref']} rejected (suppression applied)")
            return EXIT_OK
        if args.action == "pick":
            pending = svc.initiatives(args.project_id, status="pending_approval")
            chosen = pick_initiative(pending, f"Approve an initiative on {args.project_id}:")
            if chosen is None:
                return EXIT_REFUSED
            out = svc.approve_initiative(chosen, actor=getattr(args, "actor", "cli-user"),
                                         interface="cli-pick")
            print(f"{out['ref']} approved")
            return EXIT_OK

    if g == "run":
        result = engine.run_cycle(args.project_id, idempotency_key=args.idempotency_key)
        if args.json:
            print(json.dumps(result, default=str))
        else:
            h = result["health"]
            print(f"cycle {result['cycle_id']}: {state_glyph(h['state'])} "
                  f"health={h['state']} score={h['score']}")
            for i in result["initiatives"]:
                if i.get("refused"):
                    print(paint(f"  ~ {i['reason']}", "grey"))
                else:
                    print(f"  + proposed {paint(i['ref'], 'bold')}: {i['title']}")
            if result.get("mutation_blocked_reason"):
                print(paint(f"  mutations blocked: {result['mutation_blocked_reason']}",
                            "yellow"))
        return EXIT_OK

    if g == "audit":
        rows = store.audit_tail(limit=args.limit)
        if args.json:
            print(json.dumps(rows))
        else:
            for r in rows:
                print(f"{r['ts']} {r['actor']:>12} {r['interface']:<8} {r['action']:<28} {r['subject']}")
        return EXIT_OK

    print(f"unhandled group {g}", file=sys.stderr)
    return EXIT_ERROR


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
