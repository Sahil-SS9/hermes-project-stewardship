import pytest

from hermes_project_stewardship.persistence.service import ServiceError
from hermes_project_stewardship.persistence.canvas_service import CanvasService


def test_content_upload_is_project_scoped_and_canvas_reference_is_non_destructive(svc, store, enabled, tmp_path):
    other = "other-project"
    svc.enable(other, mission="Other", lead_profile="lead", autonomy_level=1)
    uploaded = svc.upload_project_content(enabled, filename="evidence.txt", media_type="text/plain", content=b"import preview evidence", actor="sahil")
    assert uploaded["project_id"] == enabled
    assert svc.project_content(enabled)[0]["content_id"] == uploaded["content_id"]
    assert svc.project_content(other) == []
    canvas = CanvasService(store)
    current = canvas.create_document(enabled, actor="sahil")
    saved = canvas.save(enabled, expected_revision=current["revision"], objects=[{
        "id": "media-1", "kind": "media", "content": {"title": "Evidence"}, "evidence_ref": uploaded["content_id"],
    }], connectors=[], actor="sahil")
    removed = canvas.remove_object(enabled, "media-1", expected_revision=saved["revision"], actor="sahil")
    assert removed["objects"] == []
    assert svc.project_content(enabled)[0]["content_id"] == uploaded["content_id"]


def test_content_upload_rejects_bad_signature_and_unsafe_filename(svc, enabled):
    with pytest.raises(ServiceError, match="match its declared media type"):
        svc.upload_project_content(enabled, filename="bad.png", media_type="image/png", content=b"not-png")
    with pytest.raises(ServiceError, match="safe single filename"):
        svc.upload_project_content(enabled, filename="../secret.txt", media_type="text/plain", content=b"safe")
