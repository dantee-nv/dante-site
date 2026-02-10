import React, { useMemo, useState } from "react";
import { normalizeEnvUrlValue } from "../utils/envUrl";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_TIMEOUT_MS = 12000;

function resolveWebhookUrl(rawUrl) {
  const trimmed = normalizeEnvUrlValue(rawUrl);
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
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

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export default function AmcThirtyDayWatchSignupPanel() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webhookUrl = useMemo(
    () => resolveWebhookUrl(import.meta.env.VITE_AMC_SIGNUP_WEBHOOK_URL),
    []
  );

  function resetStatusIfNeeded() {
    if (submitState.status !== "idle") {
      setSubmitState({ status: "idle", message: "" });
    }
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);
    setFieldError("");
    resetStatusIfNeeded();
  }

  function handleHoneypotChange(event) {
    setHoneypot(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setFieldError("Please provide a valid email address.");
      setSubmitState({ status: "idle", message: "" });
      return;
    }

    if (!webhookUrl) {
      setSubmitState({
        status: "error",
        message: "Signup is not configured yet. Please try again later.",
      });
      return;
    }

    if (honeypot.trim()) {
      setEmail("");
      setFieldError("");
      setSubmitState({
        status: "success",
        message: "Added to 30-Day Watch. Check your inbox for upcoming updates.",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitState({ status: "sending", message: "" });
    setFieldError("");

    const payload = {
      email: normalizedEmail,
      watchMode: "30_day_watch",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responsePayload = await parseResponsePayload(response);

      if (!response.ok || responsePayload?.ok === false) {
        const defaultMessage =
          response.status === 429
            ? "Too many requests. Please wait a moment and try again."
            : "Failed to add you to 30-Day Watch.";

        setSubmitState({
          status: "error",
          message: responsePayload?.message || defaultMessage,
        });
        return;
      }

      setEmail("");
      setSubmitState({
        status: "success",
        message:
          responsePayload?.message ||
          "Added to 30-Day Watch. Check your inbox for upcoming updates.",
      });
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        setSubmitState({
          status: "error",
          message: "Signup timed out. Please try again.",
        });
        return;
      }

      setSubmitState({
        status: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  return (
    <section className="amc-signup-panel">
      <h3>IMAX 30-Day Watch</h3>
      <p>
        Follow the rolling 30-day IMAX schedule feed from this scraper project.
        Join with one email to get updates from the automated run.
      </p>

      <form className="amc-signup-form" onSubmit={handleSubmit} noValidate>
        <label className="amc-signup-label" htmlFor="amc-watch-email">
          Email
        </label>
        <input
          id="amc-watch-email"
          className="amc-signup-input"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          value={email}
          onChange={handleEmailChange}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "amc-watch-email-error" : undefined}
          required
        />

        <div className="amc-signup-honeypot" aria-hidden="true">
          <label htmlFor="amc-watch-company">Leave this field blank</label>
          <input
            id="amc-watch-company"
            type="text"
            name="company"
            autoComplete="off"
            tabIndex={-1}
            value={honeypot}
            onChange={handleHoneypotChange}
          />
        </div>

        <div className="amc-signup-actions">
          <span className="amc-signup-helper">Mode: 30-Day Watch</span>
          <button className="btn primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Joining..." : "Join 30-Day Watch"}
          </button>
        </div>

        {fieldError ? (
          <p id="amc-watch-email-error" className="amc-signup-status error" role="status">
            {fieldError}
          </p>
        ) : null}

        {submitState.status === "success" || submitState.status === "error" ? (
          <p className={`amc-signup-status ${submitState.status}`} role="status">
            {submitState.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
