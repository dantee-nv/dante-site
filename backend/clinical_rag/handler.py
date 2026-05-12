from __future__ import annotations

import json
import logging
import os
import time
from base64 import b64decode

from .rag_engine import DEFAULT_RETRIEVAL_MODE, RETRIEVAL_MODES, answer_question

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_QUESTION_LENGTH = max(100, int(os.getenv("CLINICAL_RAG_MAX_QUESTION_LENGTH", "700")))


def _json_response(status_code: int, payload: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }


def _parse_body(event: dict) -> dict:
    if not isinstance(event, dict) or not event.get("body"):
        return {}
    raw_body = event["body"]
    if event.get("isBase64Encoded"):
        raw_body = b64decode(raw_body).decode("utf-8")
    return json.loads(raw_body)


def validate_ask_payload(payload: dict) -> tuple[str, str]:
    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload.")

    question = payload.get("question")
    if not isinstance(question, str):
        raise ValueError("question must be a string.")

    normalized = question.strip()
    if not normalized:
        raise ValueError("question is required.")

    if len(normalized) > MAX_QUESTION_LENGTH:
        raise ValueError(f"question must be {MAX_QUESTION_LENGTH} characters or fewer.")

    retrieval_mode = payload.get("retrievalMode", DEFAULT_RETRIEVAL_MODE)
    if not isinstance(retrieval_mode, str):
        raise ValueError("retrievalMode must be a string.")
    normalized_retrieval_mode = retrieval_mode.strip() or DEFAULT_RETRIEVAL_MODE
    if normalized_retrieval_mode not in RETRIEVAL_MODES:
        allowed_modes = ", ".join(sorted(RETRIEVAL_MODES))
        raise ValueError(f"retrievalMode must be one of: {allowed_modes}.")

    return normalized, normalized_retrieval_mode


def lambda_handler(event, context):  # noqa: ANN001
    del context

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    try:
        question, retrieval_mode = validate_ask_payload(payload)
    except ValueError as error:
        return _json_response(400, {"message": str(error)})

    started_at = time.perf_counter()
    try:
        result, usage = answer_question(question, retrieval_mode=retrieval_mode)
    except Exception as error:  # noqa: BLE001
        logger.exception(
            "clinical_rag_failed error_type=%s error_message=%s",
            type(error).__name__,
            str(error),
        )
        return _json_response(
            500,
            {"message": "The clinical RAG demo is temporarily unavailable. Please try again."},
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    stats = {
        "latencyMs": latency_ms,
        "promptTokens": int(usage.get("promptTokens", 0)),
        "completionTokens": int(usage.get("completionTokens", 0)),
        "totalTokens": int(usage.get("totalTokens", 0)),
        "embeddingTokens": int(usage.get("embeddingTokens", 0)),
        "embeddingCostUsd": float(usage.get("embeddingCostUsd", 0)),
        "estimatedCostUsd": float(usage.get("estimatedCostUsd", 0)),
    }

    logger.info(
        "clinical_rag_success answer_mode=%s hits=%s latency_ms=%s",
        result.get("safety", {}).get("answerMode"),
        len(result.get("retrieval", {}).get("hits", [])),
        latency_ms,
    )

    return _json_response(200, {**result, "stats": stats})
