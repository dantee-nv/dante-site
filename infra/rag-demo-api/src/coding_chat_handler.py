import json
import logging
import os
import re
import time
from base64 import b64decode

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_CHALLENGE_LENGTH = max(500, int(os.getenv("CODING_CHAT_MAX_CHALLENGE_LENGTH", "6000")))
MAX_MESSAGE_LENGTH = max(20, int(os.getenv("CODING_CHAT_MAX_MESSAGE_LENGTH", "1200")))
MAX_HISTORY_ITEMS = max(0, int(os.getenv("CODING_CHAT_MAX_HISTORY_ITEMS", "24")))
MAX_HISTORY_CONTENT_LENGTH = max(
    20, int(os.getenv("CODING_CHAT_MAX_HISTORY_CONTENT_LENGTH", "2000"))
)
HISTORY_WINDOW = max(0, int(os.getenv("CODING_CHAT_HISTORY_WINDOW", "16")))
MAX_REPLY_LENGTH = max(500, int(os.getenv("CODING_CHAT_MAX_REPLY_LENGTH", "12000")))

INPUT_COST_PER_MILLION = float(os.getenv("MODEL_INPUT_COST_PER_MILLION", "0.10"))
OUTPUT_COST_PER_MILLION = float(os.getenv("MODEL_OUTPUT_COST_PER_MILLION", "0.40"))
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4.1-nano").strip() or "gpt-4.1-nano"

VALID_MODES = {"hints", "full_solution"}
VALID_ROLES = {"user", "assistant"}

LANGUAGE_PATTERNS = [
    (re.compile(r"\bpython\b", re.IGNORECASE), "Python"),
    (re.compile(r"\bjavascript\b|\bnode\.?js\b|\bjs\b", re.IGNORECASE), "JavaScript"),
    (re.compile(r"\btypescript\b|\bts\b", re.IGNORECASE), "TypeScript"),
    (re.compile(r"\bjava\b", re.IGNORECASE), "Java"),
    (re.compile(r"\bc\+\+\b|\bcpp\b", re.IGNORECASE), "C++"),
    (re.compile(r"\bc#\b|\bcsharp\b", re.IGNORECASE), "C#"),
    (re.compile(r"\bgo\b|\bgolang\b", re.IGNORECASE), "Go"),
    (re.compile(r"\brust\b", re.IGNORECASE), "Rust"),
]

_UNINITIALIZED = object()
_CLIENT = _UNINITIALIZED


def _json_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }


def _parse_body(event):
    if not isinstance(event, dict) or not event.get("body"):
        return {}

    raw_body = event["body"]
    if event.get("isBase64Encoded"):
        raw_body = b64decode(raw_body).decode("utf-8")

    return json.loads(raw_body)


def _estimate_cost(prompt_tokens, completion_tokens):
    input_cost = (prompt_tokens / 1_000_000) * INPUT_COST_PER_MILLION
    output_cost = (completion_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION
    return round(input_cost + output_cost, 8)


def _get_required_string(payload, field_name, max_length):
    value = payload.get(field_name)
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string.")

    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_name} is required.")

    if len(normalized) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or fewer.")

    return normalized


def _normalize_history(payload):
    raw_history = payload.get("history", [])
    if raw_history is None:
        return []
    if not isinstance(raw_history, list):
        raise ValueError("history must be an array.")

    normalized = []
    for item in raw_history[-MAX_HISTORY_ITEMS:]:
        if not isinstance(item, dict):
            raise ValueError("history items must be objects.")

        role = item.get("role")
        if role not in VALID_ROLES:
            raise ValueError("history role must be user or assistant.")

        content = item.get("content")
        if not isinstance(content, str):
            raise ValueError("history content must be a string.")

        text = content.strip()
        if not text:
            continue
        if len(text) > MAX_HISTORY_CONTENT_LENGTH:
            raise ValueError(
                f"history content must be {MAX_HISTORY_CONTENT_LENGTH} characters or fewer."
            )

        normalized.append({"role": role, "content": text})

    return normalized[-HISTORY_WINDOW:] if HISTORY_WINDOW else []


def _validate_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload.")

    challenge = _get_required_string(payload, "challenge", MAX_CHALLENGE_LENGTH)
    message = _get_required_string(payload, "message", MAX_MESSAGE_LENGTH)

    mode = payload.get("mode", "hints")
    if not isinstance(mode, str):
        raise ValueError("mode must be a string.")
    mode = mode.strip().lower()
    if mode not in VALID_MODES:
        raise ValueError("mode must be hints or full_solution.")

    history = _normalize_history(payload)
    return challenge, message, mode, history


def _detect_language(challenge, message, history):
    haystack = " ".join(
        [challenge, message] + [item.get("content", "") for item in history if isinstance(item, dict)]
    )
    for pattern, language in LANGUAGE_PATTERNS:
        if pattern.search(haystack):
            return language
    return "Python"


def _build_system_prompt(mode, language):
    common = (
        "You are a coding challenge assistant. "
        "Use only reasoning-based validation; do not claim code execution happened. "
        "Be accurate and concise. "
        f"Default language for solutions is {language} unless the user clearly asks for another language."
    )

    if mode == "hints":
        return (
            f"{common} "
            "Mode: hints. Do not provide a complete final solution. "
            "Give strategic hints, mention key edge cases, and suggest a concrete next step."
        )

    return (
        f"{common} "
        "Mode: full_solution. Provide a complete correct solution, include time and space complexity, "
        "and explain the approach in concise terms."
    )


def _get_client():
    global _CLIENT
    if _CLIENT is not _UNINITIALIZED:
        return _CLIENT

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or OpenAI is None:
        _CLIENT = None
        return _CLIENT

    _CLIENT = OpenAI(api_key=api_key)
    return _CLIENT


def _generate_reply(challenge, message, mode, history, language):
    client = _get_client()
    if client is None:
        raise RuntimeError("OpenAI client is unavailable.")

    model_messages = [
        {"role": "system", "content": _build_system_prompt(mode, language)},
        {
            "role": "user",
            "content": (
                "Use this coding challenge as the canonical context for this session:\n\n"
                f"{challenge}"
            ),
        },
        *history,
        {"role": "user", "content": message},
    ]

    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=model_messages,
        temperature=0.15 if mode == "full_solution" else 0.2,
        max_tokens=1500 if mode == "full_solution" else 900,
    )

    reply = (response.choices[0].message.content or "").strip()
    if not reply:
        raise RuntimeError("Chat model returned an empty reply.")

    if len(reply) > MAX_REPLY_LENGTH:
        reply = reply[:MAX_REPLY_LENGTH].rstrip()

    usage = response.usage
    prompt_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
    completion_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
    total_tokens = int(getattr(usage, "total_tokens", prompt_tokens + completion_tokens) or 0)

    return reply, {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
    }


def lambda_handler(event, context):
    del context

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    try:
        challenge, message, mode, history = _validate_payload(payload)
    except ValueError as error:
        return _json_response(400, {"message": str(error)})

    language = _detect_language(challenge, message, history)
    started_at = time.perf_counter()

    try:
        reply, usage = _generate_reply(challenge, message, mode, history, language)
    except Exception as error:  # noqa: BLE001
        logger.exception(
            "coding_chat_failed error_type=%s error_message=%s",
            type(error).__name__,
            str(error),
        )
        return _json_response(
            500,
            {"message": "The coding challenge chatbot is temporarily unavailable. Please try again."},
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    prompt_tokens = usage.get("promptTokens", 0)
    completion_tokens = usage.get("completionTokens", 0)
    total_tokens = usage.get("totalTokens", prompt_tokens + completion_tokens)

    return _json_response(
        200,
        {
            "reply": reply,
            "mode": mode,
            "stats": {
                "latencyMs": latency_ms,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "totalTokens": total_tokens,
                "estimatedCostUsd": _estimate_cost(prompt_tokens, completion_tokens),
            },
        },
    )
