from __future__ import annotations

import json
from pathlib import Path

from .storage import ObjectStore


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}


def discover_local_image_ids(sample_dir: Path) -> list[str]:
    image_ids = {
        path.stem
        for path in sample_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    }
    image_ids.update(path.stem for path in sample_dir.glob("*.json"))
    return sorted(image_ids)


def ingest_raw_images(sample_dir: Path, store: ObjectStore) -> dict[str, int]:
    image_ids = discover_local_image_ids(sample_dir)
    uploaded_files = 0

    for image_id in image_ids:
        metadata_path = sample_dir / f"{image_id}.json"
        if metadata_path.exists():
            store.put_file(f"raw/{image_id}/{metadata_path.name}", metadata_path)
            uploaded_files += 1

        for candidate in sample_dir.iterdir():
            if candidate.stem == image_id and candidate.suffix.lower() in IMAGE_EXTENSIONS:
                store.put_file(f"raw/{image_id}/{candidate.name}", candidate)
                uploaded_files += 1

    store.put_bytes(
        "raw/ingestion_summary.json",
        json.dumps({"image_ids": image_ids, "uploaded_files": uploaded_files}, indent=2).encode("utf-8"),
    )
    return {"image_ids": len(image_ids), "uploaded_files": uploaded_files}
