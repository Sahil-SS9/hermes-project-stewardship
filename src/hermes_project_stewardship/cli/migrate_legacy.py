"""Bounded CLI for isolated legacy Dockyard work migration proofs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from ..persistence.migration_service import IsolatedMigrationRunner


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="dockyard-migrate-legacy",
        description=(
            "Migrate a marker-owned legacy Dockyard DB copy into a marker-owned "
            "isolated Hermes home. Never operates on unmarked roots."
        ),
    )
    parser.add_argument("mode", choices=("dry-run", "apply", "rollback"))
    parser.add_argument("--source-db", type=Path, required=True)
    parser.add_argument("--target-home", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--board", required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        runner = IsolatedMigrationRunner(
            source_db=args.source_db,
            target_home=args.target_home,
            snapshot=args.snapshot,
            board=args.board,
        )
        if args.mode == "dry-run":
            result = runner.dry_run(args.project)
        elif args.mode == "apply":
            result = runner.apply(args.project)
        else:
            result = runner.rollback()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, sort_keys=True))
        return 1
    print(json.dumps({"ok": True, "result": result}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
