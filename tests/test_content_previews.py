"""Images, PDFs and videos show in the Content tab (Sahil's demo feedback g).

The preview route returns the stored bytes for images, PDFs and videos, so the
Desktop can draw them. The same checks as text apply: the bytes are the stored
file, untouched, and they must still match their declared type. Text keeps its
text preview. Sahil 05/10: MP4 and WebM videos up to 25 MB (schema v37); every
other file keeps the 5 MB limit.
"""
from __future__ import annotations

import base64

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
from hermes_project_stewardship.persistence.service import StewardshipService  # noqa: E402
from hermes_project_stewardship.persistence.store import Store  # noqa: E402

V = "/stewardship/v1/projects/dy1/content"
# A real 1x1 PNG and a minimal PDF: both pass the upload's signature check.
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==")
PDF = b"%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n"


@pytest.fixture()
def client(tmp_path):
    store = Store(tmp_path / "content.db")
    c = TestClient(create_app(store, kanban_adapter=ReferenceKanbanAdapter(store)))
    enabled = c.post("/stewardship/v1/projects/dy1/enable", json={
        "project_id": "dy1", "mission": "m", "lead_profile": "l", "autonomy_level": 2})
    assert enabled.status_code == 200
    yield c, store
    store.close()


def _upload(c, filename, media_type, raw):
    response = c.post(V, json={"filename": filename, "media_type": media_type,
                               "content_base64": base64.b64encode(raw).decode("ascii"),
                               "actor": "sahil", "interface": "dockyard:human"})
    assert response.status_code == 200, response.text
    return response.json()["content_id"]


@pytest.mark.parametrize("filename,media_type,raw,kind", [
    ("pixel.png", "image/png", PNG, "image"),
    ("brief.pdf", "application/pdf", PDF, "pdf"),
], ids=["png", "pdf"])
def test_images_and_pdfs_preview_as_their_stored_bytes(client, filename, media_type, raw, kind):
    c, _store = client
    content_id = _upload(c, filename, media_type, raw)
    preview = c.get(f"{V}/{content_id}/preview")
    assert preview.status_code == 200, preview.text
    body = preview.json()
    assert (body["preview_kind"], body["media_type"], body["text"]) == (kind, media_type, None)
    assert base64.b64decode(body["data_base64"]) == raw


def test_text_keeps_its_text_preview_and_sends_no_bytes(client):
    c, _store = client
    content_id = _upload(c, "notes.md", "text/markdown", b"# Notes\n")
    body = c.get(f"{V}/{content_id}/preview").json()
    assert (body["preview_kind"], body["text"]) == ("text", "# Notes\n")
    assert "data_base64" not in body


def test_a_changed_file_is_never_shown(client):
    c, store = client
    content_id = _upload(c, "pixel.png", "image/png", PNG)
    row = store._conn.execute(
        "SELECT stored_path FROM project_content WHERE content_id=?", (content_id,)).fetchone()
    stored = store.db_path.parent / "project-content" / row["stored_path"]
    assert stored.read_bytes() == PNG
    stored.write_bytes(PNG[:-1] + b"\x00")
    response = c.get(f"{V}/{content_id}/preview")
    assert response.status_code >= 400
    assert "data_base64" not in response.text


# Smallest bytes that pass each video signature check (a box size, then
# "ftyp" for MP4; the EBML magic number for WebM).
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 12
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 20
MB = 1024 * 1024


@pytest.mark.parametrize("filename,media_type,raw", [
    ("clip.mp4", "video/mp4", MP4),
    ("clip.webm", "video/webm", WEBM),
], ids=["mp4", "webm"])
def test_videos_upload_and_preview_as_their_stored_bytes(client, filename, media_type, raw):
    c, _store = client
    content_id = _upload(c, filename, media_type, raw)
    body = c.get(f"{V}/{content_id}/preview").json()
    assert (body["preview_kind"], body["media_type"]) == ("video", media_type)
    assert base64.b64decode(body["data_base64"]) == raw


def test_a_video_that_is_not_a_video_is_refused(client):
    c, _store = client
    response = c.post(V, json={"filename": "clip.mp4", "media_type": "video/mp4",
                               "content_base64": base64.b64encode(PNG).decode("ascii"), "actor": "sahil"})
    assert response.status_code >= 400
    assert "does not match its declared media type" in response.text


def test_videos_may_be_25_mb_and_everything_else_5_mb(client):
    c, store = client
    big_video = MP4 + b"\x00" * (6 * MB)
    content_id = _upload(c, "long.mp4", "video/mp4", big_video)
    # A video over 5 MB is verified with its own limit too: removing it works.
    # (The API route needs a signed-in person, so the service is called directly.)
    StewardshipService(store).remove_project_content("dy1", content_id, actor="sahil")
    assert c.get(f"{V}/{content_id}/preview").status_code >= 400, "the file is gone"
    for filename, media_type, raw, message in [
        ("too-long.mp4", "video/mp4", MP4 + b"\x00" * (25 * MB), "videos cannot exceed 25 MB"),
        ("big.png", "image/png", PNG + b"\x00" * (5 * MB), "project content cannot exceed 5 MB"),
    ]:
        response = c.post(V, json={"filename": filename, "media_type": media_type,
                                   "content_base64": base64.b64encode(raw).decode("ascii"), "actor": "sahil"})
        assert response.status_code >= 400, filename
        assert message in response.text, response.text
