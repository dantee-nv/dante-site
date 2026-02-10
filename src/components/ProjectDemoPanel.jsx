import React, { useMemo, useState } from "react";
import { normalizeEnvUrlValue } from "../utils/envUrl";

const MAX_QUESTION_LENGTH = 500;
const MAX_FEEDBACK_NOTE_LENGTH = 1000;
const POLICY_PDF_DOWNLOAD_PATH = "/nestle_hr_policy.pdf";
const PRODUCTION_RAG_DEMO_API_URL =
  "https://fv9c2ycohg.execute-api.us-east-2.amazonaws.com/rag-demo";

function resolveRagDemoApiUrl(rawUrl) {
  const trimmed = normalizeEnvUrlValue(rawUrl);
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

function resolveRagDemoFeedbackApiUrl(rawUrl) {
  const trimmed = normalizeEnvUrlValue(rawUrl);
  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.pathname = path || "/";

    if (path.endsWith("/rag-demo/feedback")) {
      return parsedUrl.toString();
    }

    if (path.endsWith("/rag-demo")) {
      parsedUrl.pathname = `${path}/feedback`;
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/rag-demo/feedback` : "/rag-demo/feedback";
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function resolveRagDemoApiUrlWithProductionFallback(rawUrl) {
  const configuredUrl = resolveRagDemoApiUrl(rawUrl);
  if (configuredUrl) {
    return configuredUrl;
  }

  if (!import.meta.env.PROD) {
    return "";
  }

  return resolveRagDemoApiUrl(PRODUCTION_RAG_DEMO_API_URL);
}

function buildDemoNetworkErrorMessage(apiUrl) {
  if (!import.meta.env.PROD) {
    return "Network error while calling the demo API.";
  }

  const origin =
    typeof window !== "undefined" && window?.location?.origin
      ? window.location.origin
      : "this site origin";
  const endpoint = apiUrl || "the configured demo endpoint";

  return `Network error while calling the demo API. Check CORS allowlist includes ${origin} and verify VITE_RAG_DEMO_API_URL points to a live /rag-demo endpoint (${endpoint}).`;
}

function buildFeedbackNetworkErrorMessage(feedbackApiUrl) {
  if (!import.meta.env.PROD) {
    return "Network error while submitting feedback.";
  }

  const origin =
    typeof window !== "undefined" && window?.location?.origin
      ? window.location.origin
      : "this site origin";
  const endpoint = feedbackApiUrl || "the configured feedback endpoint";

  return `Network error while submitting feedback. Check CORS allowlist includes ${origin} and verify the /rag-demo/feedback endpoint is reachable (${endpoint}).`;
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
  const [answeredQuestion, setAnsweredQuestion] = useState("");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackChoice, setFeedbackChoice] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const apiUrl = useMemo(
    () => resolveRagDemoApiUrlWithProductionFallback(import.meta.env.VITE_RAG_DEMO_API_URL),
    []
  );
  const feedbackApiUrl = useMemo(
    () => resolveRagDemoFeedbackApiUrl(apiUrl),
    [apiUrl]
  );

  function resetFeedbackState() {
    setFeedbackChoice(null);
    setFeedbackNote("");
    setFeedbackError("");
    setFeedbackMessage("");
    setHasSubmittedFeedback(false);
    setIsSubmittingFeedback(false);
  }

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
    setAnsweredQuestion("");
    setStats(null);
    resetFeedbackState();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
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
      setAnsweredQuestion(normalizedQuestion);
      setStats(normalizeStats(payload.stats));
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        setError("The demo timed out. Please try a shorter question.");
        return;
      }

      setError(buildDemoNetworkErrorMessage(apiUrl));
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();

    if (hasSubmittedFeedback) {
      return;
    }

    if (!answer || !answeredQuestion) {
      setFeedbackError("Run the demo first, then submit feedback.");
      return;
    }

    if (typeof feedbackChoice !== "boolean") {
      setFeedbackError("Choose Helpful or Not Helpful before submitting.");
      return;
    }

    if (!feedbackApiUrl) {
      setFeedbackError("RAG feedback API is not configured yet.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackMessage("");

    const payload = {
      question: answeredQuestion,
      answer,
      helpful: feedbackChoice,
    };

    if (stats) {
      payload.stats = stats;
    }

    const normalizedNote = feedbackNote.trim();
    if (normalizedNote) {
      payload.note = normalizedNote;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(feedbackApiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responsePayload = await parseResponsePayload(response);
      if (!response.ok) {
        const defaultMessage =
          response.status === 429
            ? "Too many feedback requests. Please wait a moment and try again."
            : "Failed to submit feedback. Please try again.";
        setFeedbackError(responsePayload?.message || defaultMessage);
        return;
      }

      if (responsePayload?.ok !== true || typeof responsePayload?.feedbackId !== "string") {
        setFeedbackError("Feedback response was invalid.");
        return;
      }

      setHasSubmittedFeedback(true);
      setFeedbackMessage("Thanks for the feedback.");
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        setFeedbackError("Feedback request timed out. Please try again.");
        return;
      }

      setFeedbackError(buildFeedbackNetworkErrorMessage(feedbackApiUrl));
    } finally {
      clearTimeout(timeoutId);
      setIsSubmittingFeedback(false);
    }
  }

  return (
    <section className="project-demo-panel">
      <div className="project-demo-heading">
        <h3>Live Demo</h3>
        <span className="project-demo-pill">Try It Now</span>
      </div>
      <p>
        This demo uses the Nestle HR policy document. The same RAG architecture
        can be applied to any approved document set.
      </p>

      <form className="project-demo-form" onSubmit={handleSubmit}>
        <div className="project-demo-document-actions">
          <a
            className="btn ghost project-demo-document-btn"
            href={POLICY_PDF_DOWNLOAD_PATH}
            target="_blank"
            rel="noreferrer"
          >
            Open Nestle HR Policy (PDF)
          </a>
        </div>

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
          placeholder="Example: What elements are included in Nestle's Total Rewards employee commitment?"
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

      {answer ? (
        <form className="project-demo-feedback" onSubmit={handleFeedbackSubmit}>
          <h4>Was this answer helpful?</h4>
          <div className="project-demo-feedback-options">
            <button
              type="button"
              className={`btn ghost project-demo-feedback-btn ${
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
              className={`btn ghost project-demo-feedback-btn ${
                feedbackChoice === false ? "selected" : ""
              }`}
              onClick={() => setFeedbackChoice(false)}
              aria-pressed={feedbackChoice === false}
              disabled={hasSubmittedFeedback || isSubmittingFeedback}
            >
              Not Helpful
            </button>
          </div>

          <label className="project-demo-label" htmlFor="project-demo-feedback-note">
            Optional note
          </label>
          <textarea
            id="project-demo-feedback-note"
            className="project-demo-textarea project-demo-feedback-note"
            name="feedback-note"
            value={feedbackNote}
            onChange={(event) => setFeedbackNote(event.target.value)}
            maxLength={MAX_FEEDBACK_NOTE_LENGTH}
            placeholder="Add context to help improve future answers."
            disabled={hasSubmittedFeedback || isSubmittingFeedback}
          />
          <div className="project-demo-actions">
            <span className="project-demo-count">
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

      {feedbackError ? (
        <p className="project-demo-error" role="status">
          {feedbackError}
        </p>
      ) : null}

      {feedbackMessage ? (
        <p className="project-demo-feedback-success" role="status">
          {feedbackMessage}
        </p>
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
