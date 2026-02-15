import json
import logging
import os
import time
from base64 import b64decode

from .rag_engine import answer_question

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_QUESTION_LENGTH = 500
INPUT_COST_PER_MILLION = float(os.getenv("MODEL_INPUT_COST_PER_MILLION", "0.10"))
OUTPUT_COST_PER_MILLION = float(os.getenv("MODEL_OUTPUT_COST_PER_MILLION", "0.40"))


def _json_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }


def _parse_body(event):
    if not event or not event.get("body"):
        return {}

    raw_body = event["body"]
    if event.get("isBase64Encoded"):
        raw_body = b64decode(raw_body).decode("utf-8")

    return json.loads(raw_body)


def _estimate_cost(prompt_tokens, completion_tokens):
    input_cost = (prompt_tokens / 1_000_000) * INPUT_COST_PER_MILLION
    output_cost = (completion_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION
    return round(input_cost + output_cost, 8)


def lambda_handler(event, context):
    del context

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    question = payload.get("question") if isinstance(payload, dict) else ""
    if not isinstance(question, str):
        return _json_response(400, {"message": "Question must be a string."})

    question = question.strip()
    if not question:
        return _json_response(400, {"message": "Question is required."})

    if len(question) > MAX_QUESTION_LENGTH:
        return _json_response(
            400,
            {"message": f"Question must be {MAX_QUESTION_LENGTH} characters or fewer."},
        )

    started_at = time.perf_counter()

    try:
        answer, usage = answer_question(question)
    except Exception as error:  # noqa: BLE001
        logger.exception(
            "rag_demo_failed error_type=%s error_message=%s",
            type(error).__name__,
            str(error),
        )
        return _json_response(
            500,
            {"message": "The RAG demo is temporarily unavailable. Please try again."},
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    prompt_tokens = int(usage.get("promptTokens", 0))
    completion_tokens = int(usage.get("completionTokens", 0))
    total_tokens = int(usage.get("totalTokens", prompt_tokens + completion_tokens))

    return _json_response(
        200,
        {
            "answer": answer,
            "stats": {
                "latencyMs": latency_ms,
                "promptTokens": prompt_tokens,
                "completionTokens": completion_tokens,
                "totalTokens": total_tokens,
                "estimatedCostUsd": _estimate_cost(prompt_tokens, completion_tokens),
            },
        },
    )
