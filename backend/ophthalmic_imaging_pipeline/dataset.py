from __future__ import annotations

import csv
import json
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import ImportedAnnotation, ValidatedImage, ValidationReport


def _split_rows(rows: list[dict[str, str]], seed: int) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    shuffled = list(rows)
    random.Random(seed).shuffle(shuffled)
    split_index = int(len(shuffled) * 0.8)
    if len(shuffled) > 1:
        split_index = max(1, min(split_index, len(shuffled) - 1))
    return shuffled[:split_index], shuffled[split_index:]


def _write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fieldnames = ["image_id", "image_path", "modality", "label", "checksum", "lakefs_version"]
    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def create_dataset_release(
    validation_report: ValidationReport,
    annotations: list[ImportedAnnotation],
    output_root: Path,
    dataset_version: str = "v1.0",
    lakefs_commit_id: str = "local-demo-commit",
    seed: int = 42,
) -> dict[str, Any]:
    annotation_by_id = {annotation.image_id: annotation for annotation in annotations}
    rows: list[dict[str, str]] = []

    for image in validation_report.valid_images:
        annotation = annotation_by_id.get(image.image_id)
        if not annotation:
            continue

        rows.append(
            {
                "image_id": image.image_id,
                "image_path": image.image_path,
                "modality": image.modality,
                "label": annotation.label,
                "checksum": image.checksum,
                "lakefs_version": dataset_version,
            }
        )

    training_rows, validation_rows = _split_rows(rows, seed)
    release_dir = output_root / dataset_version
    release_dir.mkdir(parents=True, exist_ok=True)

    _write_csv(release_dir / "training.csv", training_rows)
    _write_csv(release_dir / "validation.csv", validation_rows)
    (release_dir / "validation_report.json").write_text(
        json.dumps(validation_report.to_dict(), indent=2) + "\n",
        encoding="utf-8",
    )

    manifest = {
        "dataset_name": "ophthalmic-image-quality",
        "dataset_version": dataset_version,
        "lakefs_commit_id": lakefs_commit_id,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total_raw_images": validation_report.total_raw_images,
        "valid_images": len(validation_report.valid_images),
        "quarantined_images": len(validation_report.quarantined_images),
        "training_images": len(training_rows),
        "validation_images": len(validation_rows),
        "modalities": sorted({image.modality for image in validation_report.valid_images}),
    }
    (release_dir / "dataset_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    return manifest
