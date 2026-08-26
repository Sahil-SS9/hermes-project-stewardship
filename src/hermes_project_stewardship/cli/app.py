"""stewardctl — command-line control plane for Project Stewardship.

Human-readable output by default; `--json` on every read command.
Exit codes: 0 ok; 1 refused (paused/frozen/budget/mutex/dedupe);
2 error (unknown project, bad args, failure).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

from ..cycles.engine import CycleEngine, CycleRefused
from ..gateway.errors import CommandError
from ..persistence.backup import BackupError, export_store, restore_store
from ..persistence.service import ServiceError, StewardshipService
from ..persistence.store import Store
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


def _default_db() -> Path:
    return Path("./stewardship.db")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="stewardctl",
        description="Durable project ownership for Hermes agent fleets.",
    )
    p.add_argument("--db", type=Path, default=_default_db(), help="stewardship DB path")
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

    store = Store(args.db)
    svc = StewardshipService(store)
    engine = CycleEngine(svc)

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
            out = svc.reject_initiative(args.ref, actor=args.actor, interface="cli")
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
