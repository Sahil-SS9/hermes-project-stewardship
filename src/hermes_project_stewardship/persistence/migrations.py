"""SQLite schema definitions and numbered migrations.

Every schema change is a new migration with upgrade AND downgrade SQL.
`SCHEMA_VERSION` is the latest applied version; Store runs pending migrations
inside one transaction each.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

SCHEMA_VERSION = 4


@dataclass(frozen=True)
class Migration:
    version: int
    name: str
    upgrade_sql: str
    downgrade_sql: str


MIGRATIONS: List[Migration] = [
    Migration(
        version=1,
        name="initial stewardship schema",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS project_stewardship (
            project_id            TEXT PRIMARY KEY,
            enabled               INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
            mission               TEXT NOT NULL DEFAULT '',
            owner_lead_profile    TEXT,
            member_profiles_json  TEXT NOT NULL DEFAULT '[]',
            owner_team_id         TEXT,
            autonomy_level        INTEGER NOT NULL DEFAULT 0 CHECK (autonomy_level BETWEEN 0 AND 5),
            autonomy_policy_json  TEXT NOT NULL DEFAULT '{}',
            verification_policy_json TEXT NOT NULL DEFAULT '{}',
            release_policy_json   TEXT NOT NULL DEFAULT '{}',
            notification_policy_json TEXT NOT NULL DEFAULT '{}',
            phase                 TEXT NOT NULL DEFAULT 'active'
                                  CHECK (phase IN ('active','paused','frozen')),
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL,
            paused_at             TEXT
        );

        CREATE TABLE IF NOT EXISTS project_objectives (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id    TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            name          TEXT NOT NULL,
            description   TEXT NOT NULL DEFAULT '',
            evaluator_type TEXT NOT NULL CHECK (evaluator_type IN ('manual','command','integration')),
            target        TEXT NOT NULL,
            severity      TEXT NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('info','low','medium','high')),
            enabled       INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
            command_json  TEXT,
            integration   TEXT,
            window        TEXT NOT NULL DEFAULT '30d',
            UNIQUE (project_id, name)
        );

        CREATE TABLE IF NOT EXISTS project_health_snapshots (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id   TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            status       TEXT NOT NULL CHECK (status IN
                         ('unknown','healthy','watch','degraded','critical')),
            score        REAL,
            evidence_json TEXT NOT NULL DEFAULT '[]',
            contradictions_json TEXT NOT NULL DEFAULT '[]',
            created_at   TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_health_project_time
            ON project_health_snapshots(project_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS project_initiatives (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            ref           TEXT NOT NULL UNIQUE,
            project_id    TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            title         TEXT NOT NULL,
            rationale     TEXT NOT NULL,
            expected_outcome TEXT NOT NULL DEFAULT '',
            risk          TEXT NOT NULL DEFAULT 'low'
                          CHECK (risk IN ('low','medium','high','critical')),
            status        TEXT NOT NULL DEFAULT 'proposed'
                          CHECK (status IN ('proposed','pending_approval','approved',
                                            'executing','completed','regressed',
                                            'rejected','cancelled')),
            approval_state TEXT NOT NULL DEFAULT 'not_required'
                           CHECK (approval_state IN ('not_required','pending','approved','rejected')),
            priority      INTEGER NOT NULL DEFAULT 0,
            dedupe_key    TEXT,
            source_cycle_id INTEGER,
            board_slug    TEXT,
            validation_contract_json TEXT NOT NULL DEFAULT '{}',
            outcome_json  TEXT NOT NULL DEFAULT '{}',
            created_at    TEXT NOT NULL,
            completed_at  TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_initiative_project_status
            ON project_initiatives(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_initiative_dedupe
            ON project_initiatives(project_id, dedupe_key);

        CREATE TABLE IF NOT EXISTS project_cycles (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id   TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            trigger_type TEXT NOT NULL CHECK (trigger_type IN
                         ('manual','cron','webhook','gateway','internal')),
            trigger_ref  TEXT,
            idempotency_key TEXT UNIQUE,
            state        TEXT NOT NULL CHECK (state IN ('running','completed','failed')),
            summary      TEXT,
            started_at   TEXT NOT NULL,
            completed_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_cycle_project_time
            ON project_cycles(project_id, started_at DESC);

        CREATE TABLE IF NOT EXISTS project_knowledge (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            type        TEXT NOT NULL CHECK (type IN ('decision','finding','incident')),
            statement   TEXT NOT NULL,
            source      TEXT NOT NULL,
            confidence  REAL NOT NULL DEFAULT 0.5,
            supersedes_id INTEGER REFERENCES project_knowledge(id),
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stewardship_audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          TEXT NOT NULL,
            actor       TEXT NOT NULL,
            interface   TEXT NOT NULL,
            action      TEXT NOT NULL,
            subject     TEXT NOT NULL,
            detail_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_audit_time ON stewardship_audit_log(ts DESC);

        -- Cross-process cycle mutex row per project.
        CREATE TABLE IF NOT EXISTS cycle_mutex (
            project_id  TEXT PRIMARY KEY,
            holder      TEXT NOT NULL,
            acquired_at TEXT NOT NULL,
            expires_at  TEXT NOT NULL
        );

        -- Idempotency for event-triggered cycles (webhook redelivery etc).
        CREATE TABLE IF NOT EXISTS processed_triggers (
            trigger_key TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL
        );

        -- Rejection-driven proposal suppression windows.
        CREATE TABLE IF NOT EXISTS initiative_suppression (
            project_id  TEXT NOT NULL,
            dedupe_key  TEXT NOT NULL,
            suppressed_until TEXT NOT NULL,
            reason      TEXT NOT NULL DEFAULT 'rejected',
            PRIMARY KEY (project_id, dedupe_key)
        );

        -- Gateway sender permission binding per project.
        CREATE TABLE IF NOT EXISTS gateway_permissions (
            project_id  TEXT NOT NULL,
            platform    TEXT NOT NULL,
            sender_id   TEXT NOT NULL,
            can_approve INTEGER NOT NULL DEFAULT 0 CHECK (can_approve IN (0,1)),
            can_trigger INTEGER NOT NULL DEFAULT 0 CHECK (can_trigger IN (0,1)),
            PRIMARY KEY (project_id, platform, sender_id)
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS gateway_permissions;
        DROP TABLE IF EXISTS initiative_suppression;
        DROP TABLE IF EXISTS processed_triggers;
        DROP TABLE IF EXISTS cycle_mutex;
        DROP TABLE IF EXISTS stewardship_audit_log;
        DROP TABLE IF EXISTS project_knowledge;
        DROP TABLE IF EXISTS project_cycles;
        DROP TABLE IF EXISTS project_initiatives;
        DROP TABLE IF EXISTS project_health_snapshots;
        DROP TABLE IF EXISTS project_objectives;
        DROP TABLE IF EXISTS project_stewardship;
        """,
    ),
    Migration(
        version=2,
        name="events, notifications, cost accounting, merge gates",
        upgrade_sql="""
        -- Domain event log (FR-13). Append-only; the in-process bus writes
        -- here for durability so late subscribers can replay.
        CREATE TABLE IF NOT EXISTS domain_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          TEXT NOT NULL,
            event_type  TEXT NOT NULL,
            project_id  TEXT,
            subject     TEXT,
            payload_json TEXT NOT NULL DEFAULT '{}',
            emitted_by  TEXT NOT NULL DEFAULT 'system'
        );
        CREATE INDEX IF NOT EXISTS idx_domain_events_project_time
            ON domain_events(project_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_domain_events_type_time
            ON domain_events(event_type, id DESC);

        -- Notification records w/ acknowledgement (alert-fatigue metrics).
        CREATE TABLE IF NOT EXISTS notifications (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id   TEXT NOT NULL,
            severity     TEXT NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
            kind         TEXT NOT NULL,
            title        TEXT NOT NULL,
            body         TEXT NOT NULL DEFAULT '',
            dedupe_key   TEXT,
            channel      TEXT,
            delivered_at TEXT,
            acked_at     TEXT,
            created_at   TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_project_time
            ON notifications(project_id, created_at DESC);

        ALTER TABLE project_cycles ADD COLUMN duration_ms INTEGER;
        ALTER TABLE project_cycles ADD COLUMN token_estimate INTEGER;

        -- Merge-gate records for autonomy levels 4-5 flow.
        CREATE TABLE IF NOT EXISTS merge_gates (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            initiative_ref TEXT NOT NULL UNIQUE,
            risk          TEXT NOT NULL,
            decided_by    TEXT,
            interface     TEXT,
            decided_at    TEXT,
            outcome       TEXT NOT NULL DEFAULT 'pending'
                          CHECK (outcome IN ('pending','approved','rejected','superseded')),
            evidence_json TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS cycle_phase_timings (
            cycle_id  INTEGER NOT NULL REFERENCES project_cycles(id) ON DELETE CASCADE,
            phase     TEXT NOT NULL,
            started_at TEXT NOT NULL,
            ended_at  TEXT,
            PRIMARY KEY (cycle_id, phase)
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS cycle_phase_timings;
        DROP TABLE IF EXISTS merge_gates;
        DROP TABLE IF EXISTS notifications;
        DROP TABLE IF EXISTS domain_events;
        -- SQLite pre-3.35 cannot DROP COLUMN; guarded by minimum-version note
        -- in docs. Modern sqlite3 (3.35+) supports this.
        ALTER TABLE project_cycles DROP COLUMN duration_ms;
        ALTER TABLE project_cycles DROP COLUMN token_estimate;
        """,
    ),
    Migration(
        version=3,
        name="dockyard work-items and backlog",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_work_items (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id     TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            ref            TEXT NOT NULL UNIQUE,
            type           TEXT NOT NULL CHECK (type IN
                           ('epic','task','subtask','bug','spike','initiative')),
            title          TEXT NOT NULL,
            parent_id      INTEGER REFERENCES dockyard_work_items(id) ON DELETE SET NULL,
            status         TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN
                           ('backlog','in_progress','in_review','done','blocked')),
            assignee_id    TEXT,
            assignee_kind  TEXT CHECK (assignee_kind IN ('human','bot')),
            created_by_id  TEXT,
            created_by_kind TEXT CHECK (created_by_kind IN ('human','bot')),
            priority_rank  INTEGER,
            labels_json    TEXT NOT NULL DEFAULT '[]',
            blocked_by_json TEXT NOT NULL DEFAULT '[]',
            estimate_days  REAL,
            due            TEXT,
            evidence_refs_json TEXT NOT NULL DEFAULT '[]',
            created_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_dwi_project_status
            ON dockyard_work_items(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_dwi_parent
            ON dockyard_work_items(parent_id);

        CREATE TABLE IF NOT EXISTS dockyard_backlog (
            item_ref        TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            rank            INTEGER NOT NULL CHECK (rank >= 1),
            priority_reason TEXT NOT NULL DEFAULT '',
            aged_since      TEXT NOT NULL,
            last_rerank_actor       TEXT,
            last_rerank_kind        TEXT CHECK (last_rerank_kind IN ('human','bot')),
            last_rerank_reason      TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_project_rank
            ON dockyard_backlog(project_id, rank);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_backlog;
        DROP TABLE IF EXISTS dockyard_work_items;
        """,
    ),
    Migration(
        version=4,
        name="dockyard milestones and saved views",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_milestones (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            due         TEXT,
            created_at  TEXT NOT NULL,
            UNIQUE (project_id, name)
        );
        CREATE TABLE IF NOT EXISTS dockyard_milestone_items (
            milestone_id INTEGER NOT NULL REFERENCES dockyard_milestones(id) ON DELETE CASCADE,
            item_ref     TEXT NOT NULL,
            PRIMARY KEY (milestone_id, item_ref)
        );
        CREATE TABLE IF NOT EXISTS dockyard_saved_views (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            layout      TEXT NOT NULL CHECK (layout IN ('board','table','timeline','portfolio')),
            filters_json TEXT NOT NULL DEFAULT '{}',
            owner_id    TEXT NOT NULL,
            shared      INTEGER NOT NULL DEFAULT 0 CHECK (shared IN (0,1)),
            created_at  TEXT NOT NULL,
            UNIQUE (project_id, name)
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_saved_views;
        DROP TABLE IF EXISTS dockyard_milestone_items;
        DROP TABLE IF EXISTS dockyard_milestones;
        """,
    ),
]