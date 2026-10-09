"""Discord alerts (Sahil 08/10, pick 2 = A: "alerts only, posted through the Discord bot
you already run"). Design and facts: HPS-Audit-2026-09-24/BUILD-CHECKS-R1.md.

``stewardctl --db <db> notifications discord-due --mark`` prints one short message with the
alerts due for Discord, or nothing. A no-AI Hermes cron job with deliver=discord:<channel>
posts that output as-is, and empty output posts nothing (cron/scheduler.py no_agent branch).
Pinned here:
- migration v40 adds notifications.discord_sent_at (and takes it away again);
- the policy has a real Discord channel: off by default, level "high", quiet hours apply;
  the legacy list ["discord"] turns it on; bad values are refused on save;
- due = Discord on for that project, at or above its level, still new (not seen, not
  resolved), under 24 hours old, not sent before; quiet hours hold it unless the kind
  skips quiet hours or the channel ignores them;
- the message: one line per alert, oldest first; mentions cannot ping; Markdown cannot
  break it; under Discord's 2,000 characters, with "and N more" when it is cut;
- --mark sends each alert once; without --mark nothing changes; nothing due prints nothing.
"""
from __future__ import annotations

import pytest

from hermes_project_stewardship.cli.app import main as stewardctl
from hermes_project_stewardship.events.discord_alerts import MESSAGE_CAP, discord_message
from hermes_project_stewardship.events.notifications import (
    DEFAULT_EFFECTIVE_POLICY,
    NotificationEngine,
    normalize_policy,
    normalize_policy_strict,
)
from hermes_project_stewardship.persistence import migrations
from hermes_project_stewardship.persistence.service import ServiceError, StewardshipService
from hermes_project_stewardship.persistence.store import Store


@pytest.fixture()
def alerts(store, svc, clock):
    for pid in ("alpha", "beta"):
        svc.enable(pid, mission=f"{pid} mission", lead_profile="lead", autonomy_level=2)
    engine = NotificationEngine(store, svc, zone="Europe/London")
    return engine


def _discord_on(engine, *, level="high", **extra):
    engine.set_app_policy({"channels": {"discord": {"enabled": True, "min_severity": level, **extra}}},
                          actor="sahil")


def _alert(engine, project="alpha", severity="high", kind="alert", title="CI is red on main"):
    return engine.create(project, severity=severity, kind=kind, title=title)


def _due_ids(engine):
    return [row["id"] for row in engine.discord_due()]


# ---- migration v40 ------------------------------------------------------------

def test_v40_adds_and_removes_the_sent_mark(store):
    assert store.schema_version >= 40
    assert "discord_sent_at" in [r[1] for r in store._conn.execute("PRAGMA table_info(notifications)")]
    v40 = next(m for m in migrations.MIGRATIONS if m.version == 40)
    store._conn.executescript(v40.downgrade_sql)
    assert "discord_sent_at" not in [r[1] for r in store._conn.execute("PRAGMA table_info(notifications)")]
    store._conn.executescript(v40.upgrade_sql)
    assert "discord_sent_at" in [r[1] for r in store._conn.execute("PRAGMA table_info(notifications)")]


# ---- the Discord channel in the policy -------------------------------------------

def test_discord_is_a_real_channel_off_by_default():
    assert DEFAULT_EFFECTIVE_POLICY["channels"]["discord"] == {
        "enabled": False, "min_severity": "high", "quiet_hours_apply": True}
    assert normalize_policy({})["channels"]["discord"]["enabled"] is False
    assert normalize_policy({"channels": ["desktop", "discord"]})["channels"]["discord"]["enabled"] is True
    saved = normalize_policy_strict({"channels": {"discord": {"enabled": True, "min_severity": "critical"}}})
    assert saved["channels"]["discord"] == {"enabled": True, "min_severity": "critical", "quiet_hours_apply": True}


@pytest.mark.parametrize("patch,message", [
    ({"enabled": "yes"}, "boolean"),
    ({"min_severity": "loud"}, "min_severity"),
    ({"quiet_hours_apply": 1}, "boolean"),
    ({"webhook": "https://example.invalid"}, "unknown"),
])
def test_bad_discord_settings_are_refused_on_save(patch, message):
    with pytest.raises(ServiceError, match=message):
        normalize_policy_strict({"channels": {"discord": patch}})


# ---- what is due ---------------------------------------------------------------

def test_nothing_is_due_while_discord_is_off(alerts):
    _alert(alerts, severity="critical")
    assert alerts.discord_due() == []


def test_due_follows_level_state_age_and_sent_mark(alerts, store, clock):
    _discord_on(alerts, level="high")
    high = _alert(alerts, severity="high", title="high one")
    _alert(alerts, severity="medium", title="below the level")
    seen = _alert(alerts, severity="critical", title="already seen")
    alerts.ack(seen, actor="sahil")
    clock.advance(hours=25)
    fresh = _alert(alerts, severity="critical", title="fresh critical")
    assert _due_ids(alerts) == [fresh], "older than 24 hours, seen and below the level are skipped"
    clock.advance(hours=-25)
    assert high in _due_ids(alerts)
    assert alerts.mark_discord_sent([high]) == 1
    assert alerts.mark_discord_sent([high]) == 0, "marking twice changes nothing"
    assert high not in _due_ids(alerts)


def test_each_projects_own_level_wins(alerts, svc):
    _discord_on(alerts, level="critical")
    svc.update_settings("beta", actor="sahil", interface="rpc",
                        notification_policy={"channels": {"discord": {"min_severity": "medium"}}})
    a = _alert(alerts, project="alpha", severity="high")
    b = _alert(alerts, project="beta", severity="high")
    assert _due_ids(alerts) == [b], "alpha needs critical; beta takes medium and up"
    assert a not in _due_ids(alerts)


def test_quiet_hours_hold_alerts_unless_the_kind_skips_them(alerts):
    alerts.set_app_policy({"quiet_hours": {"start": "00:00", "end": "23:59"},
                           "channels": {"discord": {"enabled": True, "min_severity": "low"}}}, actor="sahil")
    held = _alert(alerts, severity="critical", kind="alert")
    approval = _alert(alerts, severity="high", kind="approval_required", title="Approve the release")
    assert _due_ids(alerts) == [approval], "approvals skip quiet hours by default"
    alerts.set_app_policy({"quiet_hours": {"start": "00:00", "end": "23:59"},
                           "channels": {"discord": {"enabled": True, "min_severity": "low",
                                                    "quiet_hours_apply": False}}}, actor="sahil")
    assert _due_ids(alerts) == [held, approval]


# ---- the message ---------------------------------------------------------------

def _row(i, **kw):
    base = {"id": i, "project_id": "alpha", "severity": "high", "kind": "alert", "title": f"alert {i}",
            "created_at": f"2026-10-09T00:{i:02d}:00+00:00"}
    base.update(kw)
    return base


def test_message_lists_each_alert_and_cannot_ping_or_break_markdown():
    text = discord_message([
        _row(1, severity="critical", title="@everyone CI <@123456> is *red* `now`"),
        _row(2, project_id="beta", title="Approve **v2** ||spoiler|| @here"),
    ])
    lines = text.splitlines()
    assert lines[0] == "**Dockyard**: 2 new alerts"
    assert lines[1].startswith("- **CRITICAL** alpha: ")
    assert "@everyone" not in text and "@here" not in text and "<@123456>" not in text
    assert "@\u200beveryone" in text and "<@\u200b123456>" in text
    assert "\\*red\\*" in text and "\\`now\\`" in text and "\\|\\|spoiler\\|\\|" in text
    assert lines[2].startswith("- **HIGH** beta: ")


def test_message_is_cut_under_the_limit_and_says_how_many_more():
    rows = [_row(i % 60, title="x" * 180) for i in range(40)]
    text = discord_message(rows)
    assert len(text) <= MESSAGE_CAP < 2000
    shown = text.count("\n- ")
    assert text.endswith(f"...and {40 - shown} more in Dockyard.")
    assert discord_message([]) == ""


# ---- the command the cron job runs ------------------------------------------------

def test_command_prints_once_with_mark_and_never_without(tmp_path, capsys):
    db = tmp_path / "dockyard.db"
    store = Store(db)
    svc = StewardshipService(store)
    svc.enable("alpha", mission="m", lead_profile="lead", autonomy_level=2)
    engine = NotificationEngine(store, svc, zone="Europe/London")
    _discord_on(engine, level="high")
    _alert(engine, severity="critical", title="CI is red on main")
    store.close()

    assert stewardctl(["--db", str(db), "notifications", "discord-due"]) == 0
    dry = capsys.readouterr().out
    assert "CI is red on main" in dry
    assert stewardctl(["--db", str(db), "notifications", "discord-due"]) == 0
    assert capsys.readouterr().out == dry, "without --mark nothing is marked"

    assert stewardctl(["--db", str(db), "notifications", "discord-due", "--mark"]) == 0
    assert "CI is red on main" in capsys.readouterr().out
    assert stewardctl(["--db", str(db), "notifications", "discord-due", "--mark"]) == 0
    assert capsys.readouterr().out == "", "sent once; nothing due prints nothing"
