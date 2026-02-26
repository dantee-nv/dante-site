import React, { useMemo, useState } from "react";

import { normalizeEnvUrlValue } from "../utils/envUrl";

const MAX_CHALLENGE_LENGTH = 6000;
const MAX_MESSAGE_LENGTH = 1200;
const MAX_FEEDBACK_NOTE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 18;
const REQUEST_TIMEOUT_MS = 25000;
const FEEDBACK_TIMEOUT_MS = 12000;
const DEFAULT_FULL_SOLUTION_PROMPT = "Show the full solution now.";

function resolveCodingChatApiUrl(rawCodingChatUrl, rawRagDemoUrl) {
  const configured = normalizeEnvUrlValue(rawCodingChatUrl);
  if (configured) {
    try {
      const parsedUrl = new URL(configured);
      const path = parsedUrl.pathname.replace(/\/+$/, "");
      if (path.endsWith("/coding-chat")) {
        parsedUrl.pathname = path;
        return parsedUrl.toString();
      }

      parsedUrl.pathname = path ? `${path}/coding-chat` : "/coding-chat";
      return parsedUrl.toString();
    } catch {
      return "";
    }
  }

  const ragDemoUrl = normalizeEnvUrlValue(rawRagDemoUrl);
  if (!ragDemoUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(ragDemoUrl);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    if (path.endsWith("/coding-chat")) {
      parsedUrl.pathname = path;
      return parsedUrl.toString();
    }

    if (path.endsWith("/rag-demo")) {
      const basePath = path.slice(0, -"/rag-demo".length);
      parsedUrl.pathname = basePath ? `${basePath}/coding-chat` : "/coding-chat";
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/coding-chat` : "/coding-chat";
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function resolveCodingChatFeedbackApiUrl(rawUrl) {
  const normalized = normalizeEnvUrlValue(rawUrl);
  if (!normalized) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalized);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    if (path.endsWith("/coding-chat/feedback")) {
      parsedUrl.pathname = path;
      return parsedUrl.toString();
    }

    if (path.endsWith("/coding-chat")) {
      parsedUrl.pathname = `${path}/feedback`;
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/coding-chat/feedback` : "/coding-chat/feedback";
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function buildRequestNetworkErrorMessage(apiUrl) {
  if (!import.meta.env.PROD) {
    return "Network error while calling coding challenge chatbot API.";
  }

  const origin =
    typeof window !== "undefined" && window?.location?.origin
      ? window.location.origin
      : "this site origin";
  const endpoint = apiUrl || "the configured coding challenge chatbot endpoint";

  return `Network error while calling coding challenge chatbot API. Check CORS allowlist includes ${origin} and verify endpoint reachability (${endpoint}).`;
}

function buildFeedbackNetworkErrorMessage(feedbackApiUrl) {
  if (!import.meta.env.PROD) {
    return "Network error while submitting chatbot feedback.";
  }

  const origin =
    typeof window !== "undefined" && window?.location?.origin
      ? window.location.origin
      : "this site origin";
  const endpoint = feedbackApiUrl || "the configured coding challenge feedback endpoint";

  return `Network error while submitting chatbot feedback. Check CORS allowlist includes ${origin} and verify endpoint reachability (${endpoint}).`;
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text ? { message: text } : null;
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

function createMessageId(role) {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function CodingChallengeChatPanel() {
  const [challenge, setChallenge] = useState("");
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState("");
  const [lastStats, setLastStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequestMode, setActiveRequestMode] = useState("");

  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackChoice, setFeedbackChoice] = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const apiUrl = useMemo(
    () =>
      resolveCodingChatApiUrl(
        import.meta.env.VITE_CODING_CHAT_API_URL,
        import.meta.env.VITE_RAG_DEMO_API_URL
      ),
    []
  );
  const feedbackApiUrl = useMemo(() => resolveCodingChatFeedbackApiUrl(apiUrl), [apiUrl]);

  function resetFeedbackUi() {
    setFeedbackChoice(null);
    setFeedbackNote("");
    setFeedbackError("");
    setFeedbackMessage("");
    setHasSubmittedFeedback(false);
    setIsSubmittingFeedback(false);
  }

  function resetConversationState() {
    setMessages([]);
    setActiveChallenge("");
    setLastStats(null);
    setError("");
    setFeedbackTarget(null);
    resetFeedbackUi();
  }

  function handleChallengeChange(event) {
    const nextValue = event.target.value;
    const nextNormalizedChallenge = nextValue.trim();
    const shouldReset =
      Boolean(activeChallenge) &&
      messages.length > 0 &&
      nextNormalizedChallenge !== activeChallenge;

    setChallenge(nextValue);
    if (!shouldReset) {
      return;
    }

    setComposer("");
    resetConversationState();
  }

  async function runChatRequest(mode) {
    const normalizedChallenge = challenge.trim();
    const normalizedMessage =
      mode === "full_solution"
        ? composer.trim() || DEFAULT_FULL_SOLUTION_PROMPT
        : composer.trim();

    if (!normalizedChallenge) {
      setError("Please paste a coding challenge before chatting.");
      return;
    }

    if (!normalizedMessage) {
      setError("Enter a follow-up message before requesting hints.");
      return;
    }

    if (!apiUrl) {
      setError("Coding challenge chatbot API is not configured yet.");
      return;
    }

    const history = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((item) => ({ role: item.role, content: item.content }));

    setIsLoading(true);
    setActiveRequestMode(mode);
    setError("");
    setFeedbackError("");
    setFeedbackMessage("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          challenge: normalizedChallenge,
          message: normalizedMessage,
          mode,
          history,
        }),
        signal: controller.signal,
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        const defaultMessage =
          response.status === 429
            ? "Too many requests. Please wait a moment and try again."
            : "Chatbot request failed. Please try again.";
        setError(payload?.message || defaultMessage);
        return;
      }

      if (typeof payload?.reply !== "string" || !payload.reply.trim()) {
        setError("Chatbot response was invalid.");
        return;
      }

      const normalizedReply = payload.reply.trim();
      const userMessage = {
        id: createMessageId("user"),
        role: "user",
        content: normalizedMessage,
        mode,
      };
      const assistantMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: normalizedReply,
        mode,
      };

      setMessages((previousMessages) => [...previousMessages, userMessage, assistantMessage]);
      setComposer("");
      setActiveChallenge(normalizedChallenge);
      setLastStats(normalizeStats(payload.stats));
      setFeedbackTarget({
        question: normalizedMessage,
        answer: normalizedReply,
        mode,
      });
      resetFeedbackUi();
    } catch (requestError) {
      if (requestError?.name === "AbortError") {
        setError("Request timed out. Try a shorter prompt and retry.");
      } else {
        setError(buildRequestNetworkErrorMessage(apiUrl));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setActiveRequestMode("");
    }
  }

  function handleHintsSubmit(event) {
    event.preventDefault();
    runChatRequest("hints");
  }

  function handleRevealSolution() {
    runChatRequest("full_solution");
  }

  async function handleFeedbackSubmit(event) {
    event.preventDefault();

    if (hasSubmittedFeedback) {
      return;
    }

    if (!feedbackTarget) {
      setFeedbackError("Run the chatbot first, then submit feedback.");
      return;
    }

    if (typeof feedbackChoice !== "boolean") {
      setFeedbackError("Choose Helpful or Not Helpful before submitting.");
      return;
    }

    if (!feedbackApiUrl) {
      setFeedbackError("Coding challenge feedback API is not configured yet.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackMessage("");

    const payload = {
      challenge: activeChallenge || challenge.trim(),
      question: feedbackTarget.question,
      answer: feedbackTarget.answer,
      mode: feedbackTarget.mode,
      helpful: feedbackChoice,
    };

    if (lastStats) {
      payload.stats = lastStats;
    }

    const normalizedNote = feedbackNote.trim();
    if (normalizedNote) {
      payload.note = normalizedNote;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FEEDBACK_TIMEOUT_MS);

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
      if (requestError?.name === "AbortError") {
        setFeedbackError("Feedback request timed out. Please try again.");
      } else {
        setFeedbackError(buildFeedbackNetworkErrorMessage(feedbackApiUrl));
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSubmittingFeedback(false);
    }
  }

  const hasHintsResponse = messages.some(
    (item) => item.role === "assistant" && item.mode === "hints"
  );
  const canRevealSolution = hasHintsResponse && !isLoading;

  return (
    <section className="coding-chat-panel">
      <div className="coding-chat-heading">
        <h3>Coding Challenge Chatbot Demo</h3>
        <span className="coding-chat-pill">Hints First</span>
      </div>
      <p>
        Paste a coding challenge, ask follow-ups, and iterate in a real chat flow.
        Start with hints, then reveal a full solution when ready.
      </p>
      <p className="coding-chat-note">
        Chat memory is session-only in your browser. Updating the challenge after a
        conversation starts resets the chat to keep context aligned.
      </p>

      <form className="coding-chat-form" onSubmit={handleHintsSubmit}>
        <label className="coding-chat-label" htmlFor="coding-chat-challenge">
          Coding Challenge
        </label>
        <textarea
          id="coding-chat-challenge"
          className="coding-chat-textarea coding-chat-textarea-challenge"
          name="challenge"
          value={challenge}
          onChange={handleChallengeChange}
          maxLength={MAX_CHALLENGE_LENGTH}
          placeholder="Paste the full challenge prompt, constraints, and sample input/output."
          required
        />
        <div className="coding-chat-count">
          {challenge.length}/{MAX_CHALLENGE_LENGTH}
        </div>

        <div className="coding-chat-transcript-wrap">
          <h4>Chat Transcript</h4>
          {messages.length > 0 ? (
            <ol className="coding-chat-transcript" aria-label="Coding challenge chat transcript">
              {messages.map((item) => (
                <li key={item.id} className={`coding-chat-message ${item.role}`}>
                  <p className="coding-chat-message-role">
                    {item.role === "assistant" ? "Assistant" : "You"}
                  </p>
                  <p className="coding-chat-message-content">{item.content}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="coding-chat-empty">
              No messages yet. Add the challenge and ask for hints to start.
            </p>
          )}
        </div>

        <label className="coding-chat-label" htmlFor="coding-chat-message">
          Chat Message
        </label>
        <textarea
          id="coding-chat-message"
          className="coding-chat-textarea coding-chat-textarea-message"
          name="message"
          value={composer}
          onChange={(event) => setComposer(event.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Example: Give me one hint for the data structure and one edge case to test."
          required
        />

        <div className="coding-chat-actions">
          <span className="coding-chat-count">
            {composer.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <div className="coding-chat-button-row">
            <button className="btn primary" type="submit" disabled={isLoading}>
              {activeRequestMode === "hints" ? "Getting Hints..." : "Get Hints"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={handleRevealSolution}
              disabled={!canRevealSolution}
            >
              {activeRequestMode === "full_solution"
                ? "Generating Solution..."
                : "Show Full Solution"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="coding-chat-error" role="status">
          {error}
        </p>
      ) : null}

      {feedbackTarget ? (
        <form className="coding-chat-feedback" onSubmit={handleFeedbackSubmit}>
          <h4>Was this response helpful?</h4>
          <div className="coding-chat-feedback-options">
            <button
              type="button"
              className={`btn ghost coding-chat-feedback-btn ${
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
              className={`btn ghost coding-chat-feedback-btn ${
                feedbackChoice === false ? "selected" : ""
              }`}
              onClick={() => setFeedbackChoice(false)}
              aria-pressed={feedbackChoice === false}
              disabled={hasSubmittedFeedback || isSubmittingFeedback}
            >
              Not Helpful
            </button>
          </div>

          <label className="coding-chat-label" htmlFor="coding-chat-feedback-note">
            Optional note
          </label>
          <textarea
            id="coding-chat-feedback-note"
            className="coding-chat-textarea coding-chat-feedback-note"
            name="feedback-note"
            value={feedbackNote}
            onChange={(event) => setFeedbackNote(event.target.value)}
            maxLength={MAX_FEEDBACK_NOTE_LENGTH}
            placeholder="Add context to improve future responses."
            disabled={hasSubmittedFeedback || isSubmittingFeedback}
          />

          <div className="coding-chat-actions">
            <span className="coding-chat-count">
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
        <p className="coding-chat-error" role="status">
          {feedbackError}
        </p>
      ) : null}

      {feedbackMessage ? (
        <p className="coding-chat-feedback-success" role="status">
          {feedbackMessage}
        </p>
      ) : null}

      {lastStats ? (
        <details className="coding-chat-stats">
          <summary>Last Response Stats</summary>
          <div className="coding-chat-stats-grid">
            <p>
              <span>Latency:</span> {lastStats.latencyMs} ms
            </p>
            <p>
              <span>Prompt Tokens:</span> {lastStats.promptTokens}
            </p>
            <p>
              <span>Completion Tokens:</span> {lastStats.completionTokens}
            </p>
            <p>
              <span>Total Tokens:</span> {lastStats.totalTokens}
            </p>
            <p>
              <span>Estimated Cost:</span> {formatCost(lastStats.estimatedCostUsd)}
            </p>
          </div>
        </details>
      ) : null}
    </section>
  );
}
