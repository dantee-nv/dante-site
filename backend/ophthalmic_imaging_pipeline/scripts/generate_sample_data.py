from __future__ import annotations

from pathlib import Path

from ophthalmic_imaging_pipeline.config import load_config
from ophthalmic_imaging_pipeline.sample_data import generate_sample_data


def main() -> None:
    config = load_config()
    summary = generate_sample_data(Path(config.sample_data_dir))
    print(summary)


if __name__ == "__main__":
    main()
