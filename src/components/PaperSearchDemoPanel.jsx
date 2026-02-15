import React, { useMemo, useState } from "react";

import { normalizeEnvUrlValue } from "../utils/envUrl";

const MAX_CONTEXT_LENGTH = 8000;
const REQUEST_TIMEOUT_MS = 20000;

function resolvePaperSearchApiUrl(rawUrl) {
  const trimmed = normalizeEnvUrlValue(rawUrl);
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.pathname = path || "/";

    if (path.endsWith("/search")) {
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/search` : "/search";
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
  return text ? { message: text } : null;
}

function formatAuthors(authors) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return "Unknown authors";
  }

  if (authors.length <= 3) {
    return authors.join(", ");
  }

  return `${authors.slice(0, 3).join(", ")} et al.`;
}

function formatScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "N/A";
  }

  return numericScore.toFixed(4);
}

export default function PaperSearchDemoPanel() {
  const [context, setContext] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = useMemo(
    () => resolvePaperSearchApiUrl(import.meta.env.VITE_PAPER_SEARCH_API_URL),
    []
  );

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedContext = context.trim();
    if (!normalizedContext) {
      setError("Please paste context text before searching.");
      return;
    }

    if (!apiUrl) {
      setError("Paper search API is not configured yet.");
      return;
    }

    setError("");
    setIsLoading(true);
    setResults([]);
    setMeta(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          context: normalizedContext,
          k: 10,
        }),
        signal: controller.signal,
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        const defaultMessage =
          response.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : "Search request failed. Please try again.";
        setError(payload?.message || defaultMessage);
        return;
      }

      if (!Array.isArray(payload?.results) || typeof payload?.meta !== "object") {
        setError("Search response was invalid.");
        return;
      }

      setResults(payload.results);
      setMeta(payload.meta);
    } catch (requestError) {
      if (requestError?.name === "AbortError") {
        setError("Search timed out. Try shorter context or retry.");
      } else {
        setError("Network error while calling paper search API.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <section className="paper-search-demo-panel">
      <div className="paper-search-demo-heading">
        <h3>Context-Based Paper Search Demo</h3>
        <span className="paper-search-demo-pill">Live</span>
      </div>
      <p>
        Paste notes, an abstract, or a research question. The backend fetches
        keyword candidates from Semantic Scholar, then reranks them using Bedrock
        embeddings to return the top 10 semantic matches.
      </p>
      <p className="paper-search-demo-note">
        First run can be slower while embeddings are cached. Repeated queries are
        faster when cache hits increase.
      </p>

      <form className="paper-search-demo-form" onSubmit={handleSubmit}>
        <label className="paper-search-demo-label" htmlFor="paper-search-context">
          Context
        </label>
        <textarea
          id="paper-search-context"
          className="paper-search-demo-textarea"
          name="context"
          value={context}
          onChange={(event) => setContext(event.target.value)}
          maxLength={MAX_CONTEXT_LENGTH}
          placeholder="Example: Looking for recent papers on retrieval-augmented generation evaluation for enterprise QA systems."
          required
        />
        <div className="paper-search-demo-actions">
          <span className="paper-search-demo-count">
            {context.length}/{MAX_CONTEXT_LENGTH}
          </span>
          <button className="btn primary" type="submit" disabled={isLoading}>
            {isLoading ? "Searching..." : "Search by Context"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="paper-search-demo-error" role="status">
          {error}
        </p>
      ) : null}

      {meta ? (
        <div className="paper-search-demo-meta">
          <p>
            Candidates fetched: <strong>{meta.candidatesFetched ?? "N/A"}</strong>
          </p>
          <p>
            Cached embeddings used:{" "}
            <strong>{meta.cachedEmbeddingsUsed ?? "N/A"}</strong>
          </p>
          <p>
            Latency: <strong>{meta.latencyMs ?? "N/A"} ms</strong>
          </p>
        </div>
      ) : null}

      {results.length > 0 ? (
        <ol className="paper-search-results" aria-label="Ranked paper search results">
          {results.map((result, index) => (
            <li className="paper-search-result-card" key={`${result.paperId}-${index}`}>
              <div className="paper-search-result-head">
                <p className="paper-search-result-rank">#{index + 1}</p>
                <p className="paper-search-result-score">
                  Relevance: {formatScore(result.score)}
                </p>
              </div>
              <h4>{result.title || "Untitled paper"}</h4>
              <p className="paper-search-result-meta">
                {formatAuthors(result.authors)} | {result.year || "Year N/A"}
                {result.venue ? ` | ${result.venue}` : ""}
              </p>
              <p className="paper-search-result-snippet">
                {result.abstractSnippet || "Abstract not available."}
              </p>
              {result.url ? (
                <a href={result.url} target="_blank" rel="noreferrer">
                  Open Paper
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
