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
    flowchart: {
      useMaxWidth: false,
    },
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

const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;

export default function MermaidDiagram({
  markdown,
  caption,
  ariaLabel,
}) {
  const [renderState, setRenderState] = React.useState("idle");
  const [svg, setSvg] = React.useState("");
  const [zoom, setZoom] = React.useState(1);
  const [svgSize, setSvgSize] = React.useState({ width: 0, height: 0 });
  const svgContainerRef = React.useRef(null);
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

  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10));
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10));
  }
  function zoomReset() {
    setZoom(1);
  }

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

  React.useLayoutEffect(() => {
    if (renderState !== "success" || !svgContainerRef.current) {
      return undefined;
    }

    const container = svgContainerRef.current;

    function measureSvg() {
      const svgElement = container.querySelector("svg");

      if (!svgElement) {
        return;
      }

      const width = svgElement.offsetWidth;
      const height = svgElement.offsetHeight;

      if (width > 0 && height > 0) {
        setSvgSize((currentSize) => {
          if (currentSize.width === width && currentSize.height === height) {
            return currentSize;
          }

          return { width, height };
        });
      }
    }

    measureSvg();
    window.addEventListener("resize", measureSvg);

    return () => window.removeEventListener("resize", measureSvg);
  }, [renderState, svg]);

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
      <div className="project-diagram-zoom-controls">
        <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" className="project-diagram-zoom-btn">−</button>
        <button onClick={zoomReset} aria-label="Reset zoom" className="project-diagram-zoom-btn project-diagram-zoom-label">{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" className="project-diagram-zoom-btn">+</button>
      </div>
      <div className="project-diagram-scroll">
        <div
          ref={svgContainerRef}
          className="project-diagram-svg"
          style={{
            width: svgSize.width ? `${svgSize.width * zoom}px` : undefined,
            height: svgSize.height ? `${svgSize.height * zoom}px` : undefined,
          }}
        >
          <div
            className="project-diagram-svg-scale"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
      {caption ? <figcaption className="project-diagram-caption">{caption}</figcaption> : null}
    </figure>
  );
}
