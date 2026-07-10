from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import ImportedAnnotation, ValidatedImage


LABEL_STUDIO_LABELS = {
    "Acceptable",
    "Motion Artifact",
    "Low Signal",
    "Cropped",
    "Incorrect Orientation",
    "Other",
    "CNV",
    "DME",
    "DRUSEN",
    "NORMAL",
}

LABEL_CONFIG_XML = """<View>
  <Image name="image" value="$image"/>
  <Choices name="image_quality" toName="image" choice="single" showInline="true">
    <Choice value="Acceptable"/>
    <Choice value="Motion Artifact"/>
    <Choice value="Low Signal"/>
    <Choice value="Cropped"/>
    <Choice value="Incorrect Orientation"/>
    <Choice value="Other"/>
  </Choices>
  <Choices name="source_class_review" toName="image" choice="single" showInline="true">
    <Choice value="CNV"/>
    <Choice value="DME"/>
    <Choice value="DRUSEN"/>
    <Choice value="NORMAL"/>
  </Choices>
</View>
"""


def create_label_studio_tasks(
    valid_images: list[ValidatedImage],
    bucket_name: str,
    public_base_url: str = "",
) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    for index, image in enumerate(valid_images, start=1):
        image_url = (
            f"{public_base_url.rstrip('/')}/{image.image_path}"
            if public_base_url
            else f"s3://{bucket_name}/{image.image_path}"
        )
        tasks.append(
            {
                "id": index,
                "data": {
                    "image": image_url,
                    "image_id": image.image_id,
                    "modality": image.modality,
                    "checksum": image.checksum,
                    "source_dataset": image.metadata.get("source_dataset", ""),
                    "source_dataset_label": image.metadata.get("source_dataset_label", ""),
                },
            }
        )
    return tasks


def write_label_studio_files(
    valid_images: list[ValidatedImage],
    label_studio_dir: Path,
    bucket_name: str,
) -> dict[str, Path]:
    label_studio_dir.mkdir(parents=True, exist_ok=True)
    tasks_path = label_studio_dir / "tasks_v1.0.json"
    config_path = label_studio_dir / "label_config.xml"

    tasks = create_label_studio_tasks(valid_images, bucket_name)
    tasks_path.write_text(json.dumps(tasks, indent=2) + "\n", encoding="utf-8")
    config_path.write_text(LABEL_CONFIG_XML, encoding="utf-8")
    return {"tasks": tasks_path, "label_config": config_path}


def _extract_choice(result: dict[str, Any]) -> str:
    value = result.get("value") or {}
    choices = value.get("choices") or value.get("rectanglelabels") or []
    if not choices:
        return ""
    return str(choices[0])


def import_label_studio_annotations(
    annotation_export: list[dict[str, Any]],
    valid_image_ids: set[str],
) -> tuple[list[ImportedAnnotation], list[str]]:
    imported: list[ImportedAnnotation] = []
    errors: list[str] = []

    for item in annotation_export:
        image_id = str((item.get("data") or {}).get("image_id") or item.get("image_id") or "").strip()
        if not image_id:
            errors.append("annotation missing image_id")
            continue

        if image_id not in valid_image_ids:
            errors.append(f"annotation references unknown image_id: {image_id}")
            continue

        annotations = item.get("annotations") or []
        if not annotations:
            errors.append(f"annotation missing result for {image_id}")
            continue

        result_items = annotations[0].get("result") or []
        label = ""
        for result in result_items:
            label = _extract_choice(result)
            if label:
                break

        if label not in LABEL_STUDIO_LABELS:
            errors.append(f"unsupported label for {image_id}: {label or '<empty>'}")
            continue

        reviewer = str(annotations[0].get("completed_by") or annotations[0].get("reviewer") or "")
        imported.append(ImportedAnnotation(image_id=image_id, label=label, reviewer=reviewer))

    return imported, errors


def load_annotation_export(path: Path) -> list[dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))
