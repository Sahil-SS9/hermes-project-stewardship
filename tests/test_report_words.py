"""C7 Reports (06/10/2026): the plain words new reports are written in.

The report generator's output is pinned end to end in
test_dockyard_plugin_backend.py; these pin each rule on its own, including
the edges (bad dates, unknown codes, empty and nested policies).
"""
from __future__ import annotations

import json
from pathlib import Path

from hermes_project_stewardship.persistence import report_words as words

# Shared with hermes_dockyard_plugin/desktop/report-words.test.mjs, which
# checks the Activity tab (event-vocab.js) against the same cases.
CASES = Path(__file__).resolve().parents[1] / "hermes_dockyard_plugin" / "desktop" / "test-support" / "report-event-cases.json"


def test_dates_read_as_day_month_year_and_utc_time():
    assert words.when("2026-10-06T11:58:01.123456+00:00") == "6 Oct 2026, 11:58 UTC"
    assert words.when("2026-10-06T12:58:01+01:00") == "6 Oct 2026, 11:58 UTC", "converted to UTC"
    assert words.when("2026-01-09T08:05:00Z") == "9 Jan 2026, 08:05 UTC"
    assert words.when("2026-12-31T23:59:59") == "31 Dec 2026, 23:59 UTC", "no zone means UTC"
    assert words.when("not a date") == "not a date", "anything else is left as it was"
    assert words.when("") == ""
    assert words.when(None) == ""


def test_work_status_words():
    assert words.work_status("backlog") == "Backlog"
    assert words.work_status("in_progress") == "In progress"
    assert words.work_status("in_review") == "In review"
    assert words.work_status("done") == "Done"
    assert words.work_status("blocked") == "Blocked"
    assert words.work_status("waiting_on_vendor") == "Waiting on vendor", "unknown codes still read as words"
    assert words.work_status("") == "Not set"


def test_policies_read_as_words_never_json():
    assert words.policy({}) == "Default settings"
    assert words.policy(None) == "Default settings"
    assert words.policy({"require_tests": True, "max_open_initiatives": 3}) == \
        "Max open initiatives: 3; Require tests: yes"
    assert words.policy({"require_rollback": False, "soak_hours": 24}) == "Require rollback: no; Soak hours: 24"
    assert words.policy({"severity_threshold": "medium", "digest": "daily"}) == \
        "Digest: daily; Severity threshold: medium"
    assert words.policy({"channels": ["email", "chat"], "owner": None, "note": ""}) == \
        "Channels: email, chat; Note: not set; Owner: not set"
    assert words.policy({"limits": {"p95_ms": 300, "strict": True}}) == "Limits: (P95 ms: 300; Strict: yes)"
    assert words.policy({"channels": []}) == "Channels: none"


def test_events_use_the_activity_tabs_words():
    assert words.event("initiative.approval_required") == "Approval requested"
    assert words.event("initiative.approval_required", {"resubmitted": True}) == "Resubmitted for approval"
    assert words.event("initiative.approved") == "Initiative approved"
    assert words.event("work.unassigned") == "Work unassigned"
    assert words.event("stewardship.cycle.started") == "Stewardship check"
    assert words.event("milestone.created") == "Milestone created", "unknown types use the same rule as the tab"
    assert words.event("") == "Project event"


def test_sentence_matches_the_desktop_rule():
    assert words.sentence("milestone.created") == "Milestone created"
    assert words.sentence("project.content_uploaded") == "Project content uploaded"
    assert words.sentence("  a__b..c  ") == "A b c"
    assert words.sentence("") == ""


def test_every_shared_case_reads_as_the_activity_tab_reads_it():
    cases = json.loads(CASES.read_text(encoding="utf-8"))
    assert len(cases) >= 20
    for case in cases:
        event = case["event"]
        got = {
            "label": words.event(event["event_type"], event["payload"]),
            "title": words.detail(event["event_type"], event["subject"], event["payload"]),
            "by": words.actor(event["emitted_by"], event["payload"]),
        }
        assert got == {"label": case["label"], "title": case["title"], "by": case["by"]}, event


def test_detail_uses_the_projects_names_when_the_event_has_none():
    # The tab finds a name in the project's initiatives or work items; the
    # report has the same lists.
    assert words.detail("initiative.approved", "INIT-2", {}, initiatives={"INIT-2": "Speed up checkout"}) == \
        "INIT-2 · Speed up checkout"
    assert words.detail("work.unassigned", "ATL-3", {}, work={"ATL-3": "Verify the build"}) == "ATL-3 · Verify the build"
    assert words.detail("work.unassigned", "ATL-3", {}, initiatives={"ATL-3": "wrong list"}) == "ATL-3"
    assert words.detail("initiative.approved", None, {}) == ""


def test_who_did_it_matches_the_activity_tab():
    # The tab shows the person named in the event's details, else who sent
    # it, and "System" for the system (event-vocab.js describeEvent).
    assert words.actor("system", {}) == "System"
    assert words.actor("system", {"actor": "sahil"}) == "sahil"
    assert words.actor("octacon", {}) == "octacon"
    assert words.actor("octacon", {"actor": "  "}) == "octacon"
    assert words.actor("", None) == "System"
