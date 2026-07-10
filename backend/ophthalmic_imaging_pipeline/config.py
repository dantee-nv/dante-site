from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PipelineConfig:
    aws_profile: str
    aws_region: str
    bucket_name: str
    lakefs_endpoint: str
    lakefs_repository: str
    lakefs_branch: str
    dataset_version: str
    sample_data_dir: Path
    output_dir: Path
    label_studio_dir: Path


def load_config() -> PipelineConfig:
    root = Path(__file__).resolve().parent
    workspace_root = root.parents[1]

    return PipelineConfig(
        aws_profile=os.getenv("AWS_PROFILE", "dante_nv"),
        aws_region=os.getenv("AWS_REGION", "us-east-2"),
        bucket_name=os.getenv("OPHTHO_PIPELINE_BUCKET", "replace-with-terraform-output"),
        lakefs_endpoint=os.getenv("LAKEFS_ENDPOINT", "http://localhost:8000"),
        lakefs_repository=os.getenv("LAKEFS_REPOSITORY", "ophthalmic-image-quality"),
        lakefs_branch=os.getenv("LAKEFS_BRANCH", "ingestion-run-001"),
        dataset_version=os.getenv("DATASET_VERSION", "v1.0"),
        sample_data_dir=Path(
            os.getenv(
                "OPHTHO_SAMPLE_DATA_DIR",
                str(workspace_root / "backend" / "ophthalmic_imaging_pipeline" / "sample_data"),
            )
        ),
        output_dir=Path(
            os.getenv(
                "OPHTHO_OUTPUT_DIR",
                str(workspace_root / "backend" / "ophthalmic_imaging_pipeline" / "output"),
            )
        ),
        label_studio_dir=Path(
            os.getenv(
                "OPHTHO_LABEL_STUDIO_DIR",
                str(workspace_root / "backend" / "ophthalmic_imaging_pipeline" / "label_studio"),
            )
        ),
    )
