import React, { useMemo, useState } from "react";

import ClinicalRagDataExplorer from "./ClinicalRagDataExplorer";
import clinicalEvalResults from "../../backend/clinical_rag/eval/eval_results.json";
import { normalizeEnvUrlValue } from "../utils/envUrl";

const MAX_QUESTION_LENGTH = 700;
const MAX_FEEDBACK_NOTE_LENGTH = 1000;
const REQUEST_TIMEOUT_MS = 20000;
const EXAMPLE_QUESTION = "How can someone prevent type 2 diabetes?";

function resolveClinicalAskApiUrl(rawUrl) {
  const trimmed = normalizeEnvUrlValue(rawUrl);
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.pathname = path || "/";

    if (path.endsWith("/clinical-rag/ask")) {
      return parsedUrl.toString();
    }

    if (path.endsWith("/clinical-rag")) {
      parsedUrl.pathname = `${path}/ask`;
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/clinical-rag/ask` : "/clinical-rag/ask";
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function resolveClinicalFeedbackApiUrl(askUrl) {
  const trimmed = normalizeEnvUrlValue(askUrl);
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    if (path.endsWith("/clinical-rag/ask")) {
      parsedUrl.pathname = path.slice(0, -"/ask".length) + "/feedback";
      return parsedUrl.toString();
    }
    parsedUrl.pathname = path ? `${path}/feedback` : "/clinical-rag/feedback";
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

function formatCost(cost) {
  const numericCost = Number(cost);
  if (!Number.isFinite(numericCost)) {
    return "N/A";
  }
  if (numericCost <= 0) {
    return "$0.0000";
  }
  return `$${numericCost.toFixed(4)}`;
}

function formatScore(score) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "N/A";
  }
  return numericScore.toFixed(4);
}

function formatPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }
  return `${Math.round(numericValue * 100)}%`;
}

function resolveCitationHref(citation) {
  return citation?.archiveUrl || citation?.citationUrl || "";
}

function isHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function ClinicalCitationItem({ citation, index }) {
  const citationHref = resolveCitationHref(citation);
  const hasUrl = isHttpUrl(citationHref);
  const citationLabel = `${citation.source || "MedQuAD"} | ${
    citation.questionFocus || "Source record"
  }`;

  return (
    <li>
      <div className="clinical-rag-citation-main">
        <span>[{citation.index || index + 1}] </span>
        {hasUrl ? (
          <a href={citationHref}>
            {citationLabel}
          </a>
        ) : (
          <span>{citationLabel}</span>
        )}
        {citation.questionType ? <small> {citation.questionType}</small> : null}
      </div>
      {hasUrl ? (
        <a
          className="clinical-rag-citation-url"
          href={citationHref}
        >
          {citationHref}
        </a>
      ) : null}
    </li>
  );
}

function ClinicalRagEvalDashboard() {
  const summary = clinicalEvalResults.summary || {};
  const metrics = [
    {
      label: "Retrieval hit@3",
      value: formatPercent(summary.retrievalHitAt3),
    },
    {
      label: "Citation correctness",
      value: formatPercent(summary.citationCorrectness),
    },
    {
      label: "Safety pass rate",
      value: formatPercent(summary.safetyPassRate),
    },
    {
      label: "Not-found accuracy",
      value: formatPercent(summary.notFoundAccuracy),
    },
    {
      label: "Avg latency",
      value: `${Math.round(Number(summary.averageLatencyMs) || 0)} ms`,
    },
    {
      label: "Eval questions",
      value: String(summary.evalQuestions || "N/A"),
    },
  ];

  return (
    <section className="clinical-rag-eval">
      <div className="clinical-rag-eval-header">
        <div>
          <h4>Evaluation Snapshot</h4>
          <p>Held-out retrieval, citation, safety, not-found, latency, and cost checks.</p>
        </div>
        <span>{formatCost(summary.averageEstimatedCostUsd)} avg cost</span>
      </div>
      <div className="clinical-rag-eval-grid" aria-label="Clinical RAG evaluation metrics">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ClinicalRagDemoPanel() {
  const [question, setQuestion] = useState("");
  const [answerPayload, setAnswerPayload] = useState(null);
  const [answeredQuestion, setAnsweredQuestion] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackChoice, setFeedbackChoice] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  const apiUrl = useMemo(
    () => resolveClinicalAskApiUrl(import.meta.env.VITE_CLINICAL_RAG_API_URL),
    []
  );
  const feedbackApiUrl = useMemo(() => resolveClinicalFeedbackApiUrl(apiUrl), [apiUrl]);

  function resetFeedback() {
    setFeedbackChoice(null);
    setFeedbackNote("");
    setFeedbackMessage("");
    setFeedbackError("");
    setHasSubmittedFeedback(false);
  }

  async function submitQuestion(normalizedQuestion) {
    if (!normalizedQuestion) {
      setError("Please enter a clinical information question.");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswerPayload(null);
    setAnsweredQuestion("");
    resetFeedback();

    if (!apiUrl) {
      setError("Clinical RAG API is not configured. Add VITE_CLINICAL_RAG_API_URL and restart the dev server.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: normalizedQuestion }),
        signal: controller.signal,
      });
      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        setError(payload?.message || "Clinical RAG request failed. Please try again.");
        return;
      }
      if (!payload?.answer || typeof payload.answer !== "string") {
        setError("Clinical RAG response was invalid.");
        return;
      }

      setAnswerPayload(payload);
      setAnsweredQuestion(normalizedQuestion);
    } catch (requestError) {
      setError(
        requestError?.name === "AbortError"
          ? "Clinical RAG request timed out. Try a shorter question."
          : "Network error while calling the clinical RAG API."
      );
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await submitQuestion(question.trim());
  }

  async function handleExampleClick() {
    setQuestion(EXAMPLE_QUESTION);
    await submitQuestion(EXAMPLE_QUESTION);
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();
    if (!answerPayload || !answeredQuestion || hasSubmittedFeedback) {
      return;
    }
    if (typeof feedbackChoice !== "boolean") {
      setFeedbackError("Choose Helpful or Not Helpful before submitting.");
      return;
    }
    if (!feedbackApiUrl) {
      setFeedbackError("Clinical RAG feedback API is not configured yet.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackMessage("");

    const payload = {
      question: answeredQuestion,
      answer: answerPayload.answer,
      helpful: feedbackChoice,
      citations: answerPayload.citations || [],
      retrieval: answerPayload.retrieval || {},
      safety: answerPayload.safety || {},
      stats: answerPayload.stats || {},
    };
    const normalizedNote = feedbackNote.trim();
    if (normalizedNote) {
      payload.note = normalizedNote;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(feedbackApiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responsePayload = await parseResponsePayload(response);
      if (!response.ok || responsePayload?.ok !== true) {
        setFeedbackError(responsePayload?.message || "Failed to submit feedback.");
        return;
      }
      setHasSubmittedFeedback(true);
      setFeedbackMessage("Thanks for the feedback.");
    } catch (requestError) {
      setFeedbackError(
        requestError?.name === "AbortError"
          ? "Feedback request timed out. Please try again."
          : "Network error while submitting feedback."
      );
    } finally {
      clearTimeout(timeoutId);
      setIsSubmittingFeedback(false);
    }
  }

  const citations = Array.isArray(answerPayload?.citations) ? answerPayload.citations : [];
  const hits = Array.isArray(answerPayload?.retrieval?.hits) ? answerPayload.retrieval.hits : [];
  const stats = answerPayload?.stats || null;
  const safety = answerPayload?.safety || null;

  return (
    <section className="clinical-rag-panel">
      <div className="clinical-rag-heading">
        <h3>Weight-Inclusive Clinical RAG Demo</h3>
        <span className="clinical-rag-pill">Public Data Only</span>
      </div>
      <p>
        Ask a general metabolic health question. The backend retrieves from a curated
        MedQuAD subset, reranks evidence, validates safety boundaries, and returns
        citations with operating stats.
      </p>
      <p className="clinical-rag-note">
        This is not medical advice and does not use PHI. Patient-specific diagnosis,
        dosing, urgent symptoms, and prompt-injection attempts are blocked.
      </p>

      <ClinicalRagDataExplorer />
      <ClinicalRagEvalDashboard />

      <form className="clinical-rag-form" onSubmit={handleSubmit}>
        <label className="clinical-rag-label" htmlFor="clinical-rag-question">
          Question
        </label>
        <textarea
          id="clinical-rag-question"
          className="clinical-rag-textarea"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={EXAMPLE_QUESTION}
          required
        />
        <button
          className="clinical-rag-example"
          type="button"
          onClick={handleExampleClick}
          disabled={isLoading}
        >
          Ask example: {EXAMPLE_QUESTION}
        </button>
        <div className="clinical-rag-actions">
          <span className="clinical-rag-count">
            {question.length}/{MAX_QUESTION_LENGTH}
          </span>
          <button className="btn primary" type="submit" disabled={isLoading}>
            {isLoading ? "Retrieving..." : "Ask Clinical RAG"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="clinical-rag-error" role="status">
          {error}
        </p>
      ) : null}

      {answerPayload ? (
        <div className="clinical-rag-answer">
          <h4>Answer</h4>
          <p>{answerPayload.answer}</p>
        </div>
      ) : null}

      {safety ? (
        <div className="clinical-rag-meta">
          <p>
            Safety mode: <strong>{safety.answerMode || "N/A"}</strong>
          </p>
          <p>
            Validation:{" "}
            <strong>{safety.validationPassed === false ? "Needs review" : "Passed"}</strong>
          </p>
          {safety.blockedReason ? (
            <p>
              Blocked reason: <strong>{safety.blockedReason}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {citations.length > 0 ? (
        <div className="clinical-rag-citations">
          <h4>
            Citations
            <span className="clinical-rag-citation-info-wrap">
              <button
                type="button"
                className="clinical-rag-citation-info"
                aria-label="Why citations use archived sources"
              >
                i
              </button>
              <span className="clinical-rag-citation-tooltip" role="tooltip">
                MedQuAD includes older public medical-source URLs. Archived citations keep the
                demo reproducible even when original pages move or retire.
              </span>
            </span>
          </h4>
          <ul>
            {citations.map((citation, index) => (
              <ClinicalCitationItem
                key={`${citation.chunkId || citation.documentId}-${index}`}
                citation={citation}
                index={index}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {hits.length > 0 ? (
        <details className="clinical-rag-details">
          <summary>Retrieval Trace</summary>
          <ol>
            {hits.slice(0, 5).map((hit) => (
              <li key={hit.chunkId}>
                <span>{hit.source} | {hit.questionFocus}</span>
                <small>
                  rerank {formatScore(hit.rerankScore)} | lexical{" "}
                  {formatScore(hit.lexicalScore)}
                </small>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {stats ? (
        <details className="clinical-rag-details">
          <summary>Operating Stats</summary>
          <div className="clinical-rag-stats-grid">
            <p><span>Latency:</span> {stats.latencyMs ?? "N/A"} ms</p>
            <p><span>Total Tokens:</span> {stats.totalTokens ?? "N/A"}</p>
            <p><span>Estimated Cost:</span> {formatCost(stats.estimatedCostUsd)}</p>
            <p><span>Strategy:</span> {answerPayload.retrieval?.strategy || "N/A"}</p>
          </div>
        </details>
      ) : null}

      {answerPayload ? (
        <form className="clinical-rag-feedback" onSubmit={handleFeedbackSubmit}>
          <h4>Was this answer useful?</h4>
          <div className="clinical-rag-feedback-options">
            <button
              type="button"
              className={`btn ghost clinical-rag-feedback-btn ${
                feedbackChoice === true ? "selected" : ""
              }`}
              onClick={() => setFeedbackChoice(true)}
              aria-pressed={feedbackChoice === true}
              disabled={hasSubmittedFeedback || isSubmittingFeedback}
            >
              Helpful
            </button>
            <button
              type="button"
              className={`btn ghost clinical-rag-feedback-btn ${
                feedbackChoice === false ? "selected" : ""
              }`}
              onClick={() => setFeedbackChoice(false)}
              aria-pressed={feedbackChoice === false}
              disabled={hasSubmittedFeedback || isSubmittingFeedback}
            >
              Not Helpful
            </button>
          </div>
          <label className="clinical-rag-label" htmlFor="clinical-rag-feedback-note">
            Optional note
          </label>
          <textarea
            id="clinical-rag-feedback-note"
            className="clinical-rag-textarea clinical-rag-feedback-note"
            value={feedbackNote}
            onChange={(event) => setFeedbackNote(event.target.value)}
            maxLength={MAX_FEEDBACK_NOTE_LENGTH}
            disabled={hasSubmittedFeedback || isSubmittingFeedback}
          />
          <div className="clinical-rag-actions">
            <span className="clinical-rag-count">
              {feedbackNote.length}/{MAX_FEEDBACK_NOTE_LENGTH}
            </span>
            <button
              className="btn primary"
              type="submit"
              disabled={
                hasSubmittedFeedback ||
                isSubmittingFeedback ||
                typeof feedbackChoice !== "boolean"
              }
            >
              {hasSubmittedFeedback
                ? "Feedback Sent"
                : isSubmittingFeedback
                ? "Submitting..."
                : "Submit Feedback"}
            </button>
          </div>
        </form>
      ) : null}

      {feedbackError ? <p className="clinical-rag-error">{feedbackError}</p> : null}
      {feedbackMessage ? (
        <p className="clinical-rag-feedback-success">{feedbackMessage}</p>
      ) : null}
    </section>
  );
}
