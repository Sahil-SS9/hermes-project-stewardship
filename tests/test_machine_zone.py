"""The notification engine's zone works on every platform Hermes supports.

Two Windows facts broke 24 Windows CI tests (and quiet hours for Windows users):

* the machine-zone fallback returned ``time.tzname[0]``, which on Windows is
  a display name ("Coordinated Universal Time", "GMT Standard Time") that is
  not an IANA key, so ZoneInfo raised for every notification;
* Windows ships no system time-zone database, so even a correct IANA key
  ("Europe/London") raised ZoneInfoNotFoundError without the ``tzdata``
  package.

These tests replay both on any OS: Windows-like zone probes, and a zoneinfo
search path emptied the way it is on Windows.
"""
from __future__ import annotations

import sys
import types
import zoneinfo
from datetime import datetime, timezone
from pathlib import Path

import pytest

from hermes_project_stewardship.events import notifications

_WINDOWS_TZNAME = ("Coordinated Universal Time", "Coordinated Universal Time")


def _windows_like(monkeypatch, local_zone):
    """No /etc/localtime link, Windows display names in time.tzname, and a
    tzlocal whose answer is `local_zone` (a key, or an exception to raise)."""
    real_is_symlink = Path.is_symlink
    monkeypatch.setattr(
        Path, "is_symlink",
        lambda self: False if str(self) == "/etc/localtime" else real_is_symlink(self),
    )
    monkeypatch.setattr("time.tzname", _WINDOWS_TZNAME)
    fake = types.ModuleType("tzlocal")

    def get_localzone_name():
        if isinstance(local_zone, Exception):
            raise local_zone
        return local_zone

    fake.get_localzone_name = get_localzone_name
    monkeypatch.setitem(sys.modules, "tzlocal", fake)


def test_windows_machine_zone_is_the_iana_key_tzlocal_reports(monkeypatch):
    _windows_like(monkeypatch, "Europe/London")
    assert notifications._machine_zone() == "Europe/London"


def test_a_windows_display_name_never_reaches_zoneinfo(monkeypatch):
    _windows_like(monkeypatch, zoneinfo.ZoneInfoNotFoundError("registry unreadable"))
    zone = notifications._machine_zone()
    assert zone == "UTC"
    zoneinfo.ZoneInfo(zone)  # loadable


def test_an_unloadable_tzlocal_answer_is_ignored(monkeypatch):
    _windows_like(monkeypatch, "Not/A_Zone")
    assert notifications._machine_zone() == "UTC"


@pytest.fixture()
def no_system_tz_database():
    """zoneinfo's search path emptied, as on Windows: only the tzdata package
    can answer."""
    zoneinfo.reset_tzpath(to=[])
    zoneinfo.ZoneInfo.clear_cache()
    try:
        yield
    finally:
        zoneinfo.reset_tzpath()
        zoneinfo.ZoneInfo.clear_cache()


def test_quiet_hours_work_without_a_system_tz_database(no_system_tz_database):
    """22:30 in London (21:30 UTC in July) is inside 22:00-07:00 quiet hours."""
    london = zoneinfo.ZoneInfo("Europe/London")
    now = datetime(2026, 7, 15, 21, 30, tzinfo=timezone.utc).astimezone(london)
    assert notifications.in_quiet_hours(
        {"quiet_hours": {"start": "22:00", "end": "07:00"}}, now) is True
