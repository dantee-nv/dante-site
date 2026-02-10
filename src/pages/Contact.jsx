import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";
import { normalizeEnvUrlValue } from "../utils/envUrl";

const INITIAL_VALUES = {
  name: "",
  email: "",
  subject: "",
  message: "",
  contactPreference: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveContactApiUrl(rawUrl) {
  const trimmedUrl = normalizeEnvUrlValue(rawUrl);
  if (!trimmedUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const path = parsedUrl.pathname.replace(/\/+$/, "");
    parsedUrl.pathname = path || "/";

    if (path.endsWith("/contact")) {
      return parsedUrl.toString();
    }

    parsedUrl.pathname = path ? `${path}/contact` : "/contact";
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

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function validateForm(values) {
  const errors = {};

  if (!values.name || values.name.length > 100) {
    errors.name = "Name is required and must be 100 characters or fewer.";
  }

  if (!values.email || !EMAIL_PATTERN.test(values.email)) {
    errors.email = "Please provide a valid email address.";
  }

  if (!values.subject || values.subject.length > 150) {
    errors.subject = "Subject is required and must be 150 characters or fewer.";
  }

  if (!values.message || values.message.length > 5000) {
    errors.message = "Message is required and must be 5000 characters or fewer.";
  }

  return errors;
}

export default function Contact() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
  const apiUrl = resolveContactApiUrl(import.meta.env.VITE_CONTACT_API_URL);
  const emailActionHref = `mailto:contact@dantenavarro.com?subject=${encodeURIComponent(
    "Website Inquiry"
  )}`;

  usePageTitle("Contact");

  const isSending = submitState.status === "sending";

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }

      const nextErrors = { ...previous };
      delete nextErrors[name];
      return nextErrors;
    });

    if (submitState.status !== "idle") {
      setSubmitState({ status: "idle", message: "" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalized = {
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      message: values.message.trim(),
      website: values.contactPreference.trim(),
    };

    const validationErrors = validateForm(normalized);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitState({ status: "error", message: "Please fix the highlighted fields." });
      return;
    }

    if (!apiUrl) {
      setSubmitState({
        status: "error",
        message: "Contact form is not configured. Please try again later.",
      });
      return;
    }

    setErrors({});
    setSubmitState({ status: "sending", message: "" });

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(normalized),
      });

      const payload = await parseResponsePayload(response);
      if (response.ok && payload?.ok !== false) {
        setValues(INITIAL_VALUES);
        setSubmitState({ status: "success", message: payload?.message || "Message sent." });
        return;
      }

      const defaultMessage =
        response.status === 429
          ? "Too many requests. Please wait a moment and try again."
          : "Failed to send message.";

      setSubmitState({
        status: "error",
        message: payload?.message || defaultMessage,
      });
    } catch {
      setSubmitState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  return (
    <Motion.section
      className="page contact-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>Contact</h2>
      <p className="contact-intro">Send a message and let&apos;s connect!</p>

      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="contact-field">
          <label className="contact-label" htmlFor="contact-name">
            Name
          </label>
          <input
            id="contact-name"
            className="contact-input"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            required
          />
          {errors.name && (
            <p id="contact-name-error" className="contact-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="contact-field">
          <label className="contact-label" htmlFor="contact-email">
            Email
          </label>
          <input
            id="contact-email"
            className="contact-input"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={320}
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            required
          />
          {errors.email && (
            <p id="contact-email-error" className="contact-error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="contact-field">
          <label className="contact-label" htmlFor="contact-subject">
            Subject
          </label>
          <input
            id="contact-subject"
            className="contact-input"
            name="subject"
            type="text"
            maxLength={150}
            value={values.subject}
            onChange={handleChange}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "contact-subject-error" : undefined}
            required
          />
          {errors.subject && (
            <p id="contact-subject-error" className="contact-error">
              {errors.subject}
            </p>
          )}
        </div>

        <div className="contact-field">
          <label className="contact-label" htmlFor="contact-message">
            Message
          </label>
          <textarea
            id="contact-message"
            className="contact-textarea"
            name="message"
            rows={7}
            maxLength={5000}
            value={values.message}
            onChange={handleChange}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            required
          />
          {errors.message && (
            <p id="contact-message-error" className="contact-error">
              {errors.message}
            </p>
          )}
        </div>

        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-preference">Leave this field blank</label>
          <input
            id="contact-preference"
            name="contactPreference"
            type="text"
            tabIndex={-1}
            autoComplete="new-password"
            value={values.contactPreference}
            onChange={handleChange}
          />
        </div>

        <div className="contact-form-actions">
          <button className="btn ghost" type="submit" disabled={isSending}>
            {isSending ? "Sending..." : "Send Message"}
          </button>
          <span className="contact-helper">All fields are required.</span>
        </div>

        {submitState.status !== "idle" && (
          <p className={`contact-status ${submitState.status}`} role="status" aria-live="polite">
            {submitState.message}
          </p>
        )}
      </form>

      <div className="contact-row">
        <a className="btn ghost" href="https://www.linkedin.com/in/dante-navarro/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a className="btn ghost" href={emailActionHref}>Email</a>
      </div>
    </Motion.section>
  );
}
