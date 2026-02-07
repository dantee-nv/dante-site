import React, { useMemo, useState } from "react";

const MAX_QUESTION_LENGTH = 500;

function resolveRagDemoApiUrl(rawUrl) {
  if (typeof rawUrl !== "string") {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.pathname = path || "/";

    if (path.endsWith("/rag-demo")) {
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/rag-demo` : "/rag-demo";
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return null;
  }

  return { message: text };
}

function normalizeStats(rawStats) {
  if (!rawStats || typeof rawStats !== "object") {
    return null;
  }

  return {
    latencyMs: Number(rawStats.latencyMs) || 0,
    promptTokens: Number(rawStats.promptTokens) || 0,
    completionTokens: Number(rawStats.completionTokens) || 0,
    totalTokens: Number(rawStats.totalTokens) || 0,
    estimatedCostUsd: Number(rawStats.estimatedCostUsd) || 0,
  };
}

function formatCost(cost) {
  if (!Number.isFinite(cost)) {
    return "N/A";
  }

  if (cost <= 0) {
    return "$0.0000";
  }

  return `$${cost.toFixed(4)}`;
}

export default function ProjectDemoPanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = useMemo(
    () => resolveRagDemoApiUrl(import.meta.env.VITE_RAG_DEMO_API_URL),
    []
  );

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedQuestion = question.trim();

    if (!normalizedQuestion) {
      setError("Please enter a question before submitting.");
      return;
    }

    if (!apiUrl) {
      setError("RAG demo API is not configured yet.");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");
    setStats(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ question: normalizedQuestion }),
        signal: controller.signal,
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        const defaultMessage =
          response.status === 429
            ? "Too many demo requests. Please wait a moment and try again."
            : "The demo request failed. Please try again.";

        setError(payload?.message || defaultMessage);
        return;
      }

      if (!payload?.answer || typeof payload.answer !== "string") {
        setError("Demo response was invalid.");
        return;
      }

      setAnswer(payload.answer.trim());
      setStats(normalizeStats(payload.stats));
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        setError("The demo timed out. Please try a shorter question.");
        return;
      }

      setError("Network error while calling the demo API.");
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <section className="project-demo-panel">
      <h3>Live Demo</h3>
      <p>
        Ask a policy question and run the Python RAG demo directly from this
        page.
      </p>

      <form className="project-demo-form" onSubmit={handleSubmit}>
        <label className="project-demo-label" htmlFor="project-demo-question">
          Question
        </label>
        <textarea
          id="project-demo-question"
          className="project-demo-textarea"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Example: What does the policy say about reporting unplanned absences?"
          required
        />
        <div className="project-demo-actions">
          <span className="project-demo-count">
            {question.length}/{MAX_QUESTION_LENGTH}
          </span>
          <button className="btn primary" type="submit" disabled={isLoading}>
            {isLoading ? "Running Demo..." : "Ask Demo"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="project-demo-error" role="status">
          {error}
        </p>
      ) : null}

      {answer ? (
        <div className="project-demo-answer">
          <h4>Answer</h4>
          <p>{answer}</p>
        </div>
      ) : null}

      {stats ? (
        <details className="project-demo-stats">
          <summary>Answer Stats</summary>
          <div className="project-demo-stats-grid">
            <p>
              <span>Latency:</span> {stats.latencyMs} ms
            </p>
            <p>
              <span>Prompt Tokens:</span> {stats.promptTokens}
            </p>
            <p>
              <span>Completion Tokens:</span> {stats.completionTokens}
            </p>
            <p>
              <span>Total Tokens:</span> {stats.totalTokens}
            </p>
            <p>
              <span>Estimated Cost:</span> {formatCost(stats.estimatedCostUsd)}
            </p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
