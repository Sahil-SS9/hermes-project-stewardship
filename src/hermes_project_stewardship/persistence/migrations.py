"""SQLite schema definitions and numbered migrations.

Every schema change is a new migration with upgrade AND downgrade SQL.
`SCHEMA_VERSION` is the latest applied version; Store runs pending migrations
inside one transaction each.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

SCHEMA_VERSION = 15


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
    Migration(
        version=5,
        name="dockyard bot registry and groups",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_bots (
            id           TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            profile      TEXT,
            capabilities_json TEXT NOT NULL DEFAULT '[]',
            status       TEXT NOT NULL DEFAULT 'idle' CHECK (status IN
                         ('idle','busy','stuck','offline')),
            current_item TEXT,
            registered_at TEXT NOT NULL,
            last_seen_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS dockyard_bot_groups (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            purpose     TEXT NOT NULL DEFAULT '',
            channel_ref TEXT,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS dockyard_group_members (
            group_id  INTEGER NOT NULL REFERENCES dockyard_bot_groups(id) ON DELETE CASCADE,
            bot_id    TEXT NOT NULL REFERENCES dockyard_bots(id) ON DELETE CASCADE,
            role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('lead','member')),
            PRIMARY KEY (group_id, bot_id)
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_group_members;
        DROP TABLE IF EXISTS dockyard_bot_groups;
        DROP TABLE IF EXISTS dockyard_bots;
        """,
    ),
    Migration(
        version=6,
        name="dockyard A2A message bus",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_a2a_messages (
            id          TEXT PRIMARY KEY,
            msg_type    TEXT NOT NULL CHECK (msg_type IN
                        ('handoff','status_query','capability_request','result')),
            from_actor  TEXT NOT NULL,
            to_group    TEXT NOT NULL REFERENCES dockyard_bot_groups(name),
            item_ref    TEXT,
            payload_json TEXT NOT NULL DEFAULT '{}',
            channel_post TEXT,
            created_at  TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_a2a_group_time
            ON dockyard_a2a_messages(to_group, created_at);
        CREATE INDEX IF NOT EXISTS idx_a2a_item
            ON dockyard_a2a_messages(item_ref);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_a2a_messages;
        """,
    ),
    Migration(
        version=7,
        name="backlog project scoping hardening (G5 council)",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_backlog_v2 (
            item_ref        TEXT NOT NULL REFERENCES dockyard_work_items(ref)
                            ON UPDATE CASCADE ON DELETE CASCADE,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id)
                            ON DELETE CASCADE,
            rank            INTEGER NOT NULL CHECK (rank >= 1),
            priority_reason TEXT NOT NULL DEFAULT '',
            aged_since      TEXT NOT NULL,
            last_rerank_actor TEXT,
            last_rerank_kind  TEXT CHECK (last_rerank_kind IN ('human','bot')),
            last_rerank_reason TEXT,
            PRIMARY KEY (project_id, item_ref)
        );
        INSERT INTO dockyard_backlog_v2
            SELECT item_ref, project_id, rank, priority_reason, aged_since,
                   last_rerank_actor, last_rerank_kind, last_rerank_reason
            FROM dockyard_backlog;
        DROP TABLE dockyard_backlog;
        ALTER TABLE dockyard_backlog_v2 RENAME TO dockyard_backlog;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_project_rank
            ON dockyard_backlog(project_id, rank);
        """,
        downgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_backlog_legacy (
            item_ref        TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id) ON DELETE CASCADE,
            rank            INTEGER NOT NULL CHECK (rank >= 1),
            priority_reason TEXT NOT NULL DEFAULT '',
            aged_since      TEXT NOT NULL,
            last_rerank_actor       TEXT,
            last_rerank_kind        TEXT CHECK (last_rerank_kind IN ('human','bot')),
            last_rerank_reason      TEXT
        );
        INSERT INTO dockyard_backlog_legacy SELECT * FROM dockyard_backlog;
        DROP TABLE dockyard_backlog;
        ALTER TABLE dockyard_backlog_legacy RENAME TO dockyard_backlog;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_project_rank
            ON dockyard_backlog(project_id, rank);
        """,
    ),
    Migration(
        version=8,
        name="dockyard generated project reports",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_reports (
            report_id       TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id)
                            ON DELETE CASCADE,
            report_type     TEXT NOT NULL CHECK (
                            report_type IN ('executive','delivery','risk','full')),
            title           TEXT NOT NULL,
            content_md      TEXT NOT NULL,
            options_json    TEXT NOT NULL DEFAULT '{}',
            generated_by    TEXT NOT NULL,
            generated_at    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_dockyard_reports_project_time
            ON dockyard_reports(project_id, generated_at DESC);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_reports;
        """,
    ),
    Migration(
        version=9,
        name="dockyard work item ↔ initiative first-class relation",
        upgrade_sql="""
        -- Slice 3: backlog work items can be linked to an existing project
        -- initiative as a first-class validated relation. Cross-project
        -- references and unknown refs are rejected at the service layer and
        -- by the FK on `initiative_ref`.
        ALTER TABLE dockyard_work_items
            ADD COLUMN initiative_ref TEXT
            REFERENCES project_initiatives(ref)
            ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_dwi_initiative
            ON dockyard_work_items(initiative_ref);
        """,
        downgrade_sql="""
        DROP INDEX IF EXISTS idx_dwi_initiative;
        ALTER TABLE dockyard_work_items DROP COLUMN initiative_ref;
        """,
    ),
    Migration(
        version=10,
        name="mission archive and project supporting content",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS project_mission_archive (
            archive_id      TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id)
                            ON DELETE CASCADE,
            mission         TEXT NOT NULL CHECK (length(trim(mission)) > 0),
            archived_by     TEXT NOT NULL,
            archived_at     TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_project_mission_archive_project_time
            ON project_mission_archive(project_id, archived_at DESC);

        CREATE TABLE IF NOT EXISTS project_content (
            content_id      TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES project_stewardship(project_id)
                            ON DELETE CASCADE,
            filename        TEXT NOT NULL,
            stored_path     TEXT NOT NULL,
            media_type      TEXT NOT NULL CHECK (media_type IN (
                            'text/plain','text/markdown','application/pdf',
                            'image/png','image/jpeg','image/webp')),
            size_bytes      INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
            sha256          TEXT NOT NULL CHECK (length(sha256) = 64),
            uploaded_by     TEXT NOT NULL,
            uploaded_at     TEXT NOT NULL,
            UNIQUE(project_id, stored_path)
        );
        CREATE INDEX IF NOT EXISTS idx_project_content_project_time
            ON project_content(project_id, uploaded_at DESC);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS project_content;
        DROP TABLE IF EXISTS project_mission_archive;
        """,
    ),
    Migration(
        version=11,
        name="canonical Hermes work governance overlay",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_canonical_work_bindings (
            project_id      TEXT NOT NULL
                            REFERENCES project_stewardship(project_id)
                            ON DELETE CASCADE,
            item_kind       TEXT NOT NULL
                            CHECK (item_kind IN ('task','bug','spike','subtask','gate','epic')),
            item_id         TEXT NOT NULL,
            initiative_ref  TEXT REFERENCES project_initiatives(ref)
                            ON DELETE SET NULL,
            created_by_id   TEXT NOT NULL,
            created_by_kind TEXT NOT NULL CHECK (created_by_kind IN ('human','bot')),
            created_at      TEXT NOT NULL,
            PRIMARY KEY (project_id, item_kind, item_id)
        );
        CREATE INDEX IF NOT EXISTS idx_canonical_binding_initiative
            ON dockyard_canonical_work_bindings(project_id, initiative_ref);

        CREATE TABLE IF NOT EXISTS dockyard_canonical_backlog (
            project_id        TEXT NOT NULL,
            item_kind         TEXT NOT NULL,
            item_id           TEXT NOT NULL,
            rank              INTEGER NOT NULL CHECK (rank >= 1),
            priority_reason   TEXT NOT NULL CHECK (length(trim(priority_reason)) >= 4),
            aged_since        TEXT NOT NULL,
            last_rerank_actor TEXT,
            last_rerank_kind  TEXT CHECK (last_rerank_kind IN ('human','bot')),
            last_rerank_reason TEXT,
            PRIMARY KEY (project_id, item_kind, item_id),
            FOREIGN KEY (project_id, item_kind, item_id)
                REFERENCES dockyard_canonical_work_bindings(
                    project_id, item_kind, item_id
                ) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_backlog_project_rank
            ON dockyard_canonical_backlog(project_id, rank);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_canonical_backlog;
        DROP TABLE IF EXISTS dockyard_canonical_work_bindings;
        """,
    ),
    Migration(
        version=12,
        name="versioned canonical workflow graphs",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_workflows (
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            version INTEGER NOT NULL,
            definition_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, name, version)
        );
        CREATE TABLE IF NOT EXISTS dockyard_workflow_runs (
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            version INTEGER NOT NULL,
            run_key TEXT NOT NULL,
            result_json TEXT NOT NULL,
            started_at TEXT NOT NULL,
            PRIMARY KEY(project_id, name, version, run_key),
            FOREIGN KEY(project_id, name, version)
                REFERENCES dockyard_workflows(project_id, name, version)
                ON DELETE CASCADE
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_workflow_runs;
        DROP TABLE IF EXISTS dockyard_workflows;
        """,
    ),
    Migration(
        version=13,
        name="workflow run recovery journal",
        upgrade_sql="""
        ALTER TABLE dockyard_workflow_runs
            ADD COLUMN status TEXT NOT NULL DEFAULT 'complete'
            CHECK (status IN ('pending','complete','failed'));
        ALTER TABLE dockyard_workflow_runs
            ADD COLUMN updated_at TEXT;
        UPDATE dockyard_workflow_runs
            SET updated_at = started_at
            WHERE updated_at IS NULL;
        """,
        downgrade_sql="""
        ALTER TABLE dockyard_workflow_runs DROP COLUMN updated_at;
        ALTER TABLE dockyard_workflow_runs DROP COLUMN status;
        """,
    ),
    Migration(
        version=14,
        name="canonical work planning details",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_canonical_work_details (
            project_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            labels_json TEXT NOT NULL DEFAULT '[]',
            evidence_refs_json TEXT NOT NULL DEFAULT '[]',
            estimate_days REAL,
            due TEXT,
            updated_by TEXT NOT NULL,
            updated_by_kind TEXT NOT NULL CHECK (updated_by_kind IN ('human','bot')),
            updated_at TEXT NOT NULL,
            PRIMARY KEY(project_id, item_id)
        );
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_canonical_work_details;
        """,
    ),
    Migration(
        version=15,
        name="initiative observation triggers",
        upgrade_sql="""
        CREATE TABLE IF NOT EXISTS dockyard_observation_triggers (
            initiative_ref TEXT PRIMARY KEY
                REFERENCES project_initiatives(ref) ON DELETE CASCADE,
            project_id TEXT NOT NULL,
            trigger_key TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','completed','failed')),
            outcome_json TEXT NOT NULL,
            regressed INTEGER NOT NULL CHECK (regressed IN (0,1)),
            cycle_id INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_observation_project_status
            ON dockyard_observation_triggers(project_id,status);
        """,
        downgrade_sql="""
        DROP TABLE IF EXISTS dockyard_observation_triggers;
        """,
    ),
]
