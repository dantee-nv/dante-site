from __future__ import annotations

import hashlib
import io
import json
from collections import defaultdict

from PIL import Image

from .models import ImageMetadata, ValidatedImage, ValidationIssue, ValidationReport
from .storage import ObjectStore


IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".tif", ".tiff")


def _raw_image_ids(store: ObjectStore) -> list[str]:
    image_ids = set()
    for key in store.list_keys("raw/"):
        parts = key.split("/")
        if len(parts) >= 3 and parts[1]:
            image_ids.add(parts[1])
    return sorted(image_ids)


def _keys_by_image_id(store: ObjectStore) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for key in store.list_keys("raw/"):
        parts = key.split("/")
        if len(parts) >= 3 and parts[1]:
            grouped[parts[1]].append(key)
    return grouped


def _find_key(keys: list[str], suffixes: tuple[str, ...]) -> str | None:
    for key in keys:
        if key.lower().endswith(suffixes):
            return key
    return None


def _copy_raw_group(store: ObjectStore, keys: list[str], destination_zone: str, image_id: str) -> None:
    for key in keys:
        file_name = key.split("/")[-1]
        store.copy_object(key, f"{destination_zone}/{image_id}/{file_name}")


def _image_can_open(payload: bytes) -> None:
    with Image.open(io.BytesIO(payload)) as image:
        image.verify()


def validate_raw_images(store: ObjectStore) -> ValidationReport:
    grouped_keys = _keys_by_image_id(store)
    checksums: set[str] = set()
    valid_images: list[ValidatedImage] = []
    quarantined_images: list[ValidationIssue] = []

    for image_id in sorted(grouped_keys):
        keys = grouped_keys[image_id]
        metadata_key = _find_key(keys, (".json",))
        image_key = _find_key(keys, IMAGE_SUFFIXES)

        def quarantine(reason: str) -> None:
            quarantined_images.append(ValidationIssue(image_id=image_id, reason=reason))
            _copy_raw_group(store, keys, "quarantine", image_id)

        if not metadata_key:
            quarantine("metadata file is missing")
            continue

        if not image_key:
            quarantine("image file is missing")
            continue

        try:
            metadata_payload = json.loads(store.get_bytes(metadata_key).decode("utf-8"))
            metadata = ImageMetadata.from_dict(metadata_payload)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as exc:
            quarantine(str(exc))
            continue

        if metadata.image_id != image_id:
            quarantine("metadata image_id does not match raw object prefix")
            continue

        image_payload = store.get_bytes(image_key)
        checksum = hashlib.sha256(image_payload).hexdigest()
        if checksum in checksums:
            quarantine("duplicate image checksum")
            continue

        try:
            _image_can_open(image_payload)
        except Exception:
            quarantine("image cannot be opened or is corrupt")
            continue

        checksums.add(checksum)
        _copy_raw_group(store, keys, "validated", image_id)
        valid_images.append(
            ValidatedImage(
                image_id=image_id,
                image_path=f"validated/{image_id}/{image_key.split('/')[-1]}",
                metadata_path=f"validated/{image_id}/{metadata_key.split('/')[-1]}",
                modality=metadata.modality,
                checksum=checksum,
                metadata=metadata.to_dict(),
            )
        )

    report = ValidationReport(
        valid_images=valid_images,
        quarantined_images=quarantined_images,
        total_raw_images=len(grouped_keys),
    )
    store.put_bytes(
        "validated/validation_report.json",
        json.dumps(report.to_dict(), indent=2).encode("utf-8"),
    )
    return report
