from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


REQUIRED_METADATA_FIELDS = {
    "image_id",
    "procedure_id",
    "modality",
    "device_id",
    "timestamp",
}

SUPPORTED_MODALITIES = {"OCT", "RGB"}


@dataclass(frozen=True)
class ImageMetadata:
    image_id: str
    procedure_id: str
    modality: str
    device_id: str
    timestamp: str
    source_dataset: str = "synthetic"
    source_dataset_label: str = ""
    license: str = "synthetic demo data; not patient data"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ImageMetadata":
        missing = REQUIRED_METADATA_FIELDS.difference(data)
        if missing:
            missing_list = ", ".join(sorted(missing))
            raise ValueError(f"metadata missing required fields: {missing_list}")

        modality = str(data["modality"]).strip().upper()
        if modality not in SUPPORTED_MODALITIES:
            raise ValueError(f"unsupported modality: {data['modality']}")

        return cls(
            image_id=str(data["image_id"]).strip(),
            procedure_id=str(data["procedure_id"]).strip(),
            modality=modality,
            device_id=str(data["device_id"]).strip(),
            timestamp=str(data["timestamp"]).strip(),
            source_dataset=str(data.get("source_dataset", "synthetic")).strip(),
            source_dataset_label=str(data.get("source_dataset_label", "")).strip(),
            license=str(data.get("license", "synthetic demo data; not patient data")).strip(),
        )

    def to_dict(self) -> dict[str, str]:
        return {
            "image_id": self.image_id,
            "procedure_id": self.procedure_id,
            "modality": self.modality,
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "source_dataset": self.source_dataset,
            "source_dataset_label": self.source_dataset_label,
            "license": self.license,
        }


@dataclass(frozen=True)
class ValidatedImage:
    image_id: str
    image_path: str
    metadata_path: str
    modality: str
    checksum: str
    metadata: dict[str, str]


@dataclass(frozen=True)
class ValidationIssue:
    image_id: str
    reason: str


@dataclass(frozen=True)
class ValidationReport:
    valid_images: list[ValidatedImage] = field(default_factory=list)
    quarantined_images: list[ValidationIssue] = field(default_factory=list)
    total_raw_images: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_raw_images": self.total_raw_images,
            "valid_images": [image.__dict__ for image in self.valid_images],
            "quarantined_images": [issue.__dict__ for issue in self.quarantined_images],
        }


@dataclass(frozen=True)
class ImportedAnnotation:
    image_id: str
    label: str
    reviewer: str = ""

    def to_dict(self) -> dict[str, str]:
        return {
            "image_id": self.image_id,
            "label": self.label,
            "reviewer": self.reviewer,
        }
