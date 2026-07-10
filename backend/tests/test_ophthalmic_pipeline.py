from __future__ import annotations

import csv
import json
from unittest.mock import Mock, patch

from ophthalmic_imaging_pipeline.annotations import (
    create_label_studio_tasks,
    import_label_studio_annotations,
)
from ophthalmic_imaging_pipeline.dataset import create_dataset_release
from ophthalmic_imaging_pipeline.ingestion import ingest_raw_images
from ophthalmic_imaging_pipeline.lakefs_client import LakeFSClient, commit_validated_dataset
from ophthalmic_imaging_pipeline.sample_data import generate_sample_data
from ophthalmic_imaging_pipeline.storage import LocalObjectStore
from ophthalmic_imaging_pipeline.validation import validate_raw_images


def test_sample_data_and_validation_routes_invalid_records(tmp_path):
    sample_dir = tmp_path / "sample_data"
    store = LocalObjectStore(tmp_path / "object_store")

    summary = generate_sample_data(sample_dir)
    ingest_summary = ingest_raw_images(sample_dir, store)
    report = validate_raw_images(store)

    assert summary == {"valid": 8, "corrupt": 1, "missing_metadata": 1}
    assert ingest_summary == {"image_ids": 10, "uploaded_files": 19}
    assert report.total_raw_images == 10
    assert len(report.valid_images) == 8
    assert len(report.quarantined_images) == 2
    assert {issue.reason for issue in report.quarantined_images} == {
        "image cannot be opened or is corrupt",
        "metadata file is missing",
    }
    assert store.list_keys("validated/")
    assert store.list_keys("quarantine/")


def test_duplicate_checksum_is_quarantined(tmp_path):
    sample_dir = tmp_path / "sample_data"
    store = LocalObjectStore(tmp_path / "object_store")

    generate_sample_data(sample_dir)
    duplicate_image = sample_dir / "IMG-011.png"
    duplicate_image.write_bytes((sample_dir / "IMG-001.png").read_bytes())
    metadata = json.loads((sample_dir / "IMG-001.json").read_text(encoding="utf-8"))
    metadata["image_id"] = "IMG-011"
    metadata["procedure_id"] = "PROC-011"
    (sample_dir / "IMG-011.json").write_text(json.dumps(metadata), encoding="utf-8")

    ingest_raw_images(sample_dir, store)
    report = validate_raw_images(store)

    assert any(issue.image_id == "IMG-011" and issue.reason == "duplicate image checksum" for issue in report.quarantined_images)


def test_label_studio_annotation_import_validates_labels(tmp_path):
    sample_dir = tmp_path / "sample_data"
    store = LocalObjectStore(tmp_path / "object_store")
    generate_sample_data(sample_dir)
    ingest_raw_images(sample_dir, store)
    report = validate_raw_images(store)

    tasks = create_label_studio_tasks(report.valid_images, "demo-bucket")
    valid_ids = {image.image_id for image in report.valid_images}
    export = [
        {
            "data": tasks[0]["data"],
            "annotations": [
                {
                    "completed_by": "reviewer",
                    "result": [{"value": {"choices": ["Acceptable"]}}],
                }
            ],
        },
        {
            "data": {"image_id": "IMG-999"},
            "annotations": [{"result": [{"value": {"choices": ["Acceptable"]}}]}],
        },
        {
            "data": tasks[1]["data"],
            "annotations": [{"result": [{"value": {"choices": ["Unsupported"]}}]}],
        },
    ]

    annotations, errors = import_label_studio_annotations(export, valid_ids)

    assert len(annotations) == 1
    assert annotations[0].image_id == tasks[0]["data"]["image_id"]
    assert annotations[0].label == "Acceptable"
    assert errors == [
        "annotation references unknown image_id: IMG-999",
        f"unsupported label for {tasks[1]['data']['image_id']}: Unsupported",
    ]


def test_dataset_release_is_reproducible_and_writes_expected_files(tmp_path):
    sample_dir = tmp_path / "sample_data"
    store = LocalObjectStore(tmp_path / "object_store")
    generate_sample_data(sample_dir)
    ingest_raw_images(sample_dir, store)
    report = validate_raw_images(store)

    export = [
        {
            "data": {"image_id": image.image_id},
            "annotations": [{"result": [{"value": {"choices": ["Acceptable"]}}]}],
        }
        for image in report.valid_images
    ]
    annotations, errors = import_label_studio_annotations(
        export,
        {image.image_id for image in report.valid_images},
    )
    assert errors == []

    manifest = create_dataset_release(
        validation_report=report,
        annotations=annotations,
        output_root=tmp_path / "output",
        dataset_version="v1.0",
        lakefs_commit_id="abc123",
        seed=7,
    )
    repeat_manifest = create_dataset_release(
        validation_report=report,
        annotations=annotations,
        output_root=tmp_path / "repeat_output",
        dataset_version="v1.0",
        lakefs_commit_id="abc123",
        seed=7,
    )

    release_dir = tmp_path / "output" / "v1.0"
    assert manifest["valid_images"] == 8
    assert manifest["quarantined_images"] == 2
    assert manifest["training_images"] == 6
    assert manifest["validation_images"] == 2
    assert repeat_manifest["training_images"] == manifest["training_images"]

    with (release_dir / "training.csv").open(encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))

    assert set(rows[0]) == {"image_id", "image_path", "modality", "label", "checksum", "lakefs_version"}
    assert (release_dir / "validation.csv").exists()
    assert (release_dir / "validation_report.json").exists()
    assert (release_dir / "dataset_manifest.json").exists()


def test_lakefs_import_polls_until_a_commit_is_available():
    client = LakeFSClient(
        endpoint="http://localhost:8000",
        access_key="demo-access",
        secret_key="demo-secret",
        repository="ophthalmic-image-quality",
    )
    responses = [
        {"id": "import-123"},
        {"completed": False},
        {"completed": True, "commit": {"id": "commit-123"}},
    ]

    with patch.object(client, "_request", side_effect=responses) as request, patch(
        "ophthalmic_imaging_pipeline.lakefs_client.time.sleep"
    ):
        commit_id = client.import_s3_prefix(
            branch="ingestion-run-001",
            source_path="s3://demo-bucket/validated/",
            destination_prefix="validated/",
            message="Import validated dataset",
        )

    assert commit_id == "commit-123"
    assert request.call_count == 3
    assert request.call_args_list[0].args[:2] == (
        "POST",
        "/repositories/ophthalmic-image-quality/branches/ingestion-run-001/import",
    )


def test_versioned_dataset_creates_repo_imports_objects_and_tags_commit():
    client = Mock()
    client.import_s3_prefix.return_value = "commit-123"

    with patch.object(LakeFSClient, "from_env", return_value=client):
        result = commit_validated_dataset(
            endpoint="http://localhost:8000",
            repository="ophthalmic-image-quality",
            branch="ingestion-run-001",
            tag_name="v1.0",
            source_bucket="demo-bucket",
            storage_namespace="s3://demo-bucket/lakefs/",
        )

    client.ensure_repository.assert_called_once_with("s3://demo-bucket/lakefs/")
    client.ensure_branch.assert_called_once_with("ingestion-run-001")
    client.import_s3_prefix.assert_called_once_with(
        branch="ingestion-run-001",
        source_path="s3://demo-bucket/validated/",
        destination_prefix="validated/",
        message="Import validated ophthalmic image dataset v1.0",
        metadata={"dataset_version": "v1.0"},
    )
    client.tag.assert_called_once_with("v1.0", "commit-123")
    assert result.commit_id == "commit-123"
