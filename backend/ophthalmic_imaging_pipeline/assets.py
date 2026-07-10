from __future__ import annotations

from pathlib import Path

from .annotations import import_label_studio_annotations, load_annotation_export, write_label_studio_files
from .config import load_config
from .dataset import create_dataset_release
from .ingestion import ingest_raw_images
from .lakefs_client import commit_validated_dataset
from .sample_data import generate_sample_data
from .storage import S3ObjectStore
from .validation import validate_raw_images

try:
    from dagster import Definitions, MetadataValue, asset
except ImportError:  # pragma: no cover - lets tests import without Dagster installed.
    Definitions = None

    def asset(func=None, **_kwargs):
        if func is None:
            return lambda wrapped: wrapped
        return func

    class MetadataValue:
        @staticmethod
        def path(value):
            return str(value)


@asset
def raw_images():
    config = load_config()
    generate_sample_data(config.sample_data_dir)
    store = S3ObjectStore(config.bucket_name, config.aws_profile, config.aws_region)
    return ingest_raw_images(config.sample_data_dir, store)


@asset(deps=[raw_images])
def validated_images():
    config = load_config()
    store = S3ObjectStore(config.bucket_name, config.aws_profile, config.aws_region)
    return validate_raw_images(store)


@asset(deps=[validated_images])
def versioned_dataset():
    config = load_config()
    return commit_validated_dataset(
        endpoint=config.lakefs_endpoint,
        repository=config.lakefs_repository,
        branch=config.lakefs_branch,
        tag_name=config.dataset_version,
        source_bucket=config.bucket_name,
        storage_namespace=f"s3://{config.bucket_name}/lakefs/",
    )


@asset(deps=[versioned_dataset])
def labeling_tasks(validated_images):
    config = load_config()
    paths = write_label_studio_files(validated_images.valid_images, config.label_studio_dir, config.bucket_name)
    return {key: MetadataValue.path(path) for key, path in paths.items()}


@asset(deps=[labeling_tasks])
def imported_annotations(validated_images):
    config = load_config()
    export_path = Path(config.label_studio_dir) / "annotation_export.json"
    if not export_path.exists():
        raise FileNotFoundError(f"Export Label Studio annotations to {export_path}")
    valid_ids = {image.image_id for image in validated_images.valid_images}
    annotations, errors = import_label_studio_annotations(load_annotation_export(export_path), valid_ids)
    if errors:
        (config.label_studio_dir / "annotation_import_errors.json").write_text(
            "\n".join(errors) + "\n",
            encoding="utf-8",
        )
    return annotations


@asset(deps=[imported_annotations])
def dataset_release(validated_images, imported_annotations, versioned_dataset):
    config = load_config()
    commit_id = getattr(versioned_dataset, "commit_id", "") or "lakefs-commit-pending"
    return create_dataset_release(
        validation_report=validated_images,
        annotations=imported_annotations,
        output_root=config.output_dir,
        dataset_version=config.dataset_version,
        lakefs_commit_id=commit_id,
    )


if Definitions is not None:
    defs = Definitions(
        assets=[
            raw_images,
            validated_images,
            versioned_dataset,
            labeling_tasks,
            imported_annotations,
            dataset_release,
        ]
    )
else:
    defs = None
