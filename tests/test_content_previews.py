"""Images and PDFs show in the Content tab (Sahil's demo feedback 04/10, point g).

The preview route returns the stored bytes for images and PDFs, so the
Desktop can draw them. The same checks as text apply: the bytes are the stored
file, untouched, and they must still match their declared type. Text keeps its
text preview. Videos are not accepted yet: the project_content table's CHECK
lists the allowed types, so videos need a schema change first.
"""
from __future__ import annotations

import base64

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from hermes_project_stewardship.api.server import create_app  # noqa: E402
from hermes_project_stewardship.kanban import ReferenceKanbanAdapter  # noqa: E402
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


def test_videos_are_not_accepted_yet(client):
    c, _store = client
    response = c.post(V, json={"filename": "clip.mp4", "media_type": "video/mp4",
                               "content_base64": base64.b64encode(b"\x00\x00\x00\x18ftypmp42").decode("ascii"),
                               "actor": "sahil"})
    assert response.status_code >= 400
