from __future__ import annotations

import json
from pathlib import Path

from ophthalmic_imaging_pipeline.config import load_config


def main() -> None:
    config = load_config()
    tasks_path = Path(config.label_studio_dir) / "tasks_v1.0.json"
    output_path = Path(config.label_studio_dir) / "annotation_export.json"
    tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    export = []
    for task in tasks:
        source_label = task["data"].get("source_dataset_label")
        label = source_label if source_label in {"CNV", "DME", "DRUSEN", "NORMAL"} else "Acceptable"
        export.append(
            {
                "data": task["data"],
                "annotations": [
                    {
                        "completed_by": "demo-reviewer",
                        "result": [
                            {
                                "from_name": "image_quality",
                                "to_name": "image",
                                "type": "choices",
                                "value": {"choices": [label]},
                            }
                        ],
                    }
                ],
            }
        )
    output_path.write_text(json.dumps(export, indent=2) + "\n", encoding="utf-8")
    print({"annotations": len(export), "path": str(output_path)})


if __name__ == "__main__":
    main()
