import React from "react";

import dagsterAssetGraph from "../assets/ophthalmic-imaging-pipeline/dagster-asset-graph.png";

const stages = [
  { label: "Raw", value: "10 images", detail: "8 valid, 1 corrupt, 1 missing metadata" },
  { label: "Validated", value: "8 passed", detail: "Schema, checksum, and image integrity checks" },
  { label: "Quarantine", value: "2 held", detail: "Invalid records isolated with reasons" },
  { label: "Release", value: "v1.0", detail: "6 training rows, 2 validation rows" },
];

const artifacts = [
  "training.csv",
  "validation.csv",
  "validation_report.json",
  "dataset_manifest.json",
];

const dagsterAssets = [
  "raw_images",
  "validated_images",
  "versioned_dataset",
  "labeling_tasks",
  "imported_annotations",
  "dataset_release",
];

export default function OphthalmicPipelineDemoPanel() {
  return (
    <section className="ophthalmic-pipeline-panel">
      <div className="ophthalmic-pipeline-heading">
        <h3>Pipeline Demo Snapshot</h3>
        <span>Demo Scope</span>
      </div>
      <p>
        The default run uses synthetic ophthalmic-style images so the workflow can be shown
        publicly without patient data. The same adapter shape can prepare a small
        user-downloaded public OCT subset for a more realistic private demo.
      </p>

      <div className="ophthalmic-pipeline-grid" aria-label="Ophthalmic pipeline stage counts">
        {stages.map((stage) => (
          <article key={stage.label}>
            <strong>{stage.value}</strong>
            <span>{stage.label}</span>
            <small>{stage.detail}</small>
          </article>
        ))}
      </div>

      <div className="ophthalmic-pipeline-artifacts">
        <h4>Release Artifacts</h4>
        <ul>
          {artifacts.map((artifact) => (
            <li key={artifact}>{artifact}</li>
          ))}
        </ul>
      </div>

      <div className="ophthalmic-dagster-showcase">
        <div className="ophthalmic-dagster-copy">
          <div>
            <span className="ophthalmic-dagster-kicker">Dagster Orchestration Evidence</span>
            <h4>Asset graph captured from the local PoC run</h4>
          </div>
          <p>
            The Dagster view shows the workflow as executable assets, from raw ingestion
            through validation, lakeFS versioning, Label Studio task creation, annotation
            import, and the final dataset release.
          </p>
          <p className="ophthalmic-local-dagster-note">
            The screenshot is the public showcase artifact. The live Dagster UI opens only
            when the local Dagster server is running on this machine.
          </p>
          <ul aria-label="Dagster assets shown in the captured graph">
            {dagsterAssets.map((asset) => (
              <li key={asset}>{asset}</li>
            ))}
          </ul>
          <a
            className="ophthalmic-local-dagster-link"
            href="http://127.0.0.1:3000/locations/ophthalmic_imaging_pipeline.assets/asset-groups/default"
            target="_blank"
            rel="noreferrer"
            title="Requires Dagster running locally on port 3000"
          >
            Open local Dagster view when running
          </a>
        </div>
        <figure className="ophthalmic-dagster-figure">
          <img
            src={dagsterAssetGraph}
            alt="Dagster asset graph for the ophthalmic imaging pipeline"
            loading="lazy"
          />
          <figcaption>
            Captured Dagster asset graph for the proof-of-concept pipeline.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
