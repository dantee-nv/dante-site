from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


KERMANY_CLASSES = {"CNV", "DME", "DRUSEN", "NORMAL"}


def prepare_kermany_oct_subset(source_root: Path, sample_dir: Path, limit_per_class: int = 3) -> dict[str, int]:
    """Create pipeline-ready metadata for a user-downloaded Kermany/Mendeley OCT subset.

    This function intentionally does not download data. The user should download the
    public dataset and point this adapter at the extracted OCT folder.
    """
    sample_dir.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    next_index = 1

    for class_name in sorted(KERMANY_CLASSES):
        class_dir = source_root / class_name
        if not class_dir.exists():
            continue

        copied = 0
        for image_path in sorted(class_dir.iterdir()):
            if image_path.suffix.lower() not in {".jpeg", ".jpg", ".png"}:
                continue
            if copied >= limit_per_class:
                break

            image_id = f"OCT-{next_index:03d}"
            destination_image = sample_dir / f"{image_id}{image_path.suffix.lower()}"
            shutil.copyfile(image_path, destination_image)
            metadata = {
                "image_id": image_id,
                "procedure_id": f"KERMANY-{next_index:03d}",
                "modality": "OCT",
                "device_id": "PUBLIC-KERMANY-OCT",
                "timestamp": datetime(2026, 7, 9, 18, copied, tzinfo=timezone.utc)
                .isoformat()
                .replace("+00:00", "Z"),
                "source_dataset": "Kermany/Mendeley OCT",
                "source_dataset_label": class_name,
                "license": "CC BY 4.0; see https://data.mendeley.com/datasets/rscbjbr9sj/2",
            }
            (sample_dir / f"{image_id}.json").write_text(
                json.dumps(metadata, indent=2) + "\n",
                encoding="utf-8",
            )
            copied += 1
            next_index += 1

        counts[class_name] = copied

    return counts
