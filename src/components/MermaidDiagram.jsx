import React from "react";

let mermaidIsInitialized = false;
let mermaidApi = null;

async function getMermaidApi() {
  if (!mermaidApi) {
    const mermaidModule = await import("mermaid");
    mermaidApi = mermaidModule.default;
  }

  if (mermaidIsInitialized) {
    return mermaidApi;
  }

  mermaidApi.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "dark",
  });
  mermaidIsInitialized = true;

  return mermaidApi;
}

function extractMermaidDefinition(markdown) {
  if (typeof markdown !== "string") {
    return "";
  }

  const fencedMatch = markdown.match(/```mermaid\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return markdown.trim();
}

export default function MermaidDiagram({
  markdown,
  caption,
  ariaLabel,
}) {
  const [renderState, setRenderState] = React.useState("idle");
  const [svg, setSvg] = React.useState("");
  const definition = React.useMemo(
    () => extractMermaidDefinition(markdown),
    [markdown]
  );
  const componentId = React.useId();
  const diagramId = React.useMemo(
    () => `mermaid-${componentId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [componentId]
  );
  const resolvedAriaLabel = ariaLabel || caption || "Project flow diagram";

  React.useEffect(() => {
    let isCancelled = false;

    async function renderDiagram() {
      if (!definition) {
        setRenderState("error");
        setSvg("");
        return;
      }

      setRenderState("loading");

      try {
        const instance = await getMermaidApi();
        const result = await instance.render(diagramId, definition);

        if (isCancelled) {
          return;
        }

        setSvg(result.svg);
        setRenderState("success");
      } catch {
        if (isCancelled) {
          return;
        }

        setSvg("");
        setRenderState("error");
      }
    }

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [definition, diagramId]);

  if (renderState === "error") {
    return (
      <figure className="project-diagram" role="img" aria-label={resolvedAriaLabel}>
        <pre className="project-diagram-fallback">{markdown}</pre>
        {caption ? <figcaption className="project-diagram-caption">{caption}</figcaption> : null}
      </figure>
    );
  }

  if (renderState !== "success") {
    return (
      <div
        className="project-diagram project-diagram-loading"
        role="img"
        aria-label={resolvedAriaLabel}
      >
        Rendering diagram...
      </div>
    );
  }

  return (
    <figure className="project-diagram" role="img" aria-label={resolvedAriaLabel}>
      <div
        className="project-diagram-svg"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption ? <figcaption className="project-diagram-caption">{caption}</figcaption> : null}
    </figure>
  );
}
