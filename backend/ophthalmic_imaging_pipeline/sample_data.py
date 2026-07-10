from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw


def _timestamp(offset_minutes: int) -> str:
    base = datetime(2026, 7, 9, 18, 42, 13, tzinfo=timezone.utc)
    return base.replace(minute=(base.minute + offset_minutes) % 60).isoformat().replace("+00:00", "Z")


def _write_metadata(path: Path, image_id: str, modality: str, source_label: str = "") -> None:
    payload = {
        "image_id": image_id,
        "procedure_id": f"PROC-{image_id.split('-')[-1]}",
        "modality": modality,
        "device_id": "SIMULATED-OCT-01" if modality == "OCT" else "SIMULATED-FUNDUS-01",
        "timestamp": _timestamp(int(image_id.split("-")[-1])),
        "source_dataset": "synthetic",
        "source_dataset_label": source_label,
        "license": "synthetic demo data; not patient data",
    }
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _oct_image(path: Path, index: int) -> None:
    image = Image.new("L", (320, 180), 18)
    draw = ImageDraw.Draw(image)
    for x in range(320):
        top = 58 + int(8 * math.sin((x + index * 17) / 28))
        middle = 92 + int(6 * math.sin((x + index * 13) / 21))
        bottom = 128 + int(7 * math.sin((x + index * 11) / 31))
        draw.line((x, top, x, top + 2), fill=160)
        draw.line((x, middle, x, middle + 3), fill=210)
        draw.line((x, bottom, x, bottom + 2), fill=120)
    for x in range(0, 320, 9):
        draw.line((x, 0, x, 180), fill=24)
    image.save(path)


def _fundus_image(path: Path, index: int) -> None:
    image = Image.new("RGB", (240, 240), (14, 12, 18))
    draw = ImageDraw.Draw(image)
    draw.ellipse((22, 22, 218, 218), fill=(118, 54 + index * 3, 38), outline=(196, 108, 72), width=4)
    draw.ellipse((148, 82, 190, 124), fill=(230, 186, 98))
    for offset in range(-55, 75, 22):
        draw.arc((55 + offset, 45, 210 + offset, 210), 182, 330, fill=(118, 24, 31), width=2)
        draw.arc((42, 50 + offset, 210, 210 + offset), 205, 20, fill=(96, 18, 26), width=2)
    image.save(path)


def generate_sample_data(sample_dir: Path) -> dict[str, int]:
    sample_dir.mkdir(parents=True, exist_ok=True)

    for index in range(1, 9):
        image_id = f"IMG-{index:03d}"
        modality = "OCT" if index <= 4 else "RGB"
        image_path = sample_dir / f"{image_id}.png"
        if modality == "OCT":
            _oct_image(image_path, index)
            source_label = "NORMAL" if index % 2 else "DRUSEN"
        else:
            _fundus_image(image_path, index)
            source_label = "screening-demo"
        _write_metadata(sample_dir / f"{image_id}.json", image_id, modality, source_label)

    corrupt_id = "IMG-009"
    (sample_dir / f"{corrupt_id}.png").write_bytes(b"not a valid image file")
    _write_metadata(sample_dir / f"{corrupt_id}.json", corrupt_id, "OCT", "CORRUPT_DEMO")

    missing_metadata_id = "IMG-010"
    _fundus_image(sample_dir / f"{missing_metadata_id}.png", 10)

    return {"valid": 8, "corrupt": 1, "missing_metadata": 1}
