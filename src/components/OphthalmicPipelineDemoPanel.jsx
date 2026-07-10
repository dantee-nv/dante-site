import React from "react";

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
    </section>
  );
}
