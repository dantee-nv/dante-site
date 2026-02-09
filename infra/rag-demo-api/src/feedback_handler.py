import json
import logging
import math
import os
import uuid
from base64 import b64decode
from datetime import datetime, timezone

try:
    import boto3
except ImportError:
    boto3 = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_QUESTION_LENGTH = 500
MAX_ANSWER_LENGTH = 2000
MAX_NOTE_LENGTH = 1000
MAX_USER_AGENT_LENGTH = 500
FEEDBACK_TABLE_NAME = os.getenv("FEEDBACK_TABLE_NAME", "").strip()

_DDB_CLIENT = None


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


def _get_header(event, header_name):
    headers = event.get("headers") if isinstance(event, dict) else None
    if not isinstance(headers, dict):
        return ""

    expected = header_name.lower()
    for key, value in headers.items():
        if not isinstance(key, str):
            continue
        if key.lower() != expected:
            continue
        return value if isinstance(value, str) else ""

    return ""


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


def _validate_note(payload):
    note = payload.get("note")
    if note is None:
        return None

    if not isinstance(note, str):
        raise ValueError("note must be a string.")

    normalized = note.strip()
    if len(normalized) > MAX_NOTE_LENGTH:
        raise ValueError(f"note must be {MAX_NOTE_LENGTH} characters or fewer.")

    return normalized or None


def _to_non_negative_int(value, field_name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"stats.{field_name} must be a non-negative integer.")
    if not float(value).is_integer() or value < 0:
        raise ValueError(f"stats.{field_name} must be a non-negative integer.")
    return int(value)


def _to_non_negative_number(value, field_name):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"stats.{field_name} must be a non-negative number.")

    normalized = float(value)
    if not math.isfinite(normalized) or normalized < 0:
        raise ValueError(f"stats.{field_name} must be a non-negative number.")

    return round(normalized, 8)


def _validate_stats(payload):
    stats = payload.get("stats")
    if stats is None:
        return None

    if not isinstance(stats, dict):
        raise ValueError("stats must be an object.")

    expected_fields = {
        "latencyMs",
        "promptTokens",
        "completionTokens",
        "totalTokens",
        "estimatedCostUsd",
    }

    missing_fields = expected_fields - set(stats.keys())
    if missing_fields:
        raise ValueError("stats is missing required fields.")

    unknown_fields = set(stats.keys()) - expected_fields
    if unknown_fields:
        raise ValueError("stats contains unsupported fields.")

    return {
        "latencyMs": _to_non_negative_int(stats.get("latencyMs"), "latencyMs"),
        "promptTokens": _to_non_negative_int(stats.get("promptTokens"), "promptTokens"),
        "completionTokens": _to_non_negative_int(
            stats.get("completionTokens"), "completionTokens"
        ),
        "totalTokens": _to_non_negative_int(stats.get("totalTokens"), "totalTokens"),
        "estimatedCostUsd": _to_non_negative_number(
            stats.get("estimatedCostUsd"), "estimatedCostUsd"
        ),
    }


def _validate_payload(payload):
    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload.")

    question = _get_required_string(payload, "question", MAX_QUESTION_LENGTH)
    answer = _get_required_string(payload, "answer", MAX_ANSWER_LENGTH)

    if "helpful" not in payload or not isinstance(payload.get("helpful"), bool):
        raise ValueError("helpful must be provided as a boolean.")

    note = _validate_note(payload)
    stats = _validate_stats(payload)

    return {
        "question": question,
        "answer": answer,
        "helpful": payload.get("helpful"),
        "note": note,
        "stats": stats,
    }


def _format_number(value):
    if isinstance(value, int):
        return str(value)

    rendered = f"{value:.8f}".rstrip("0").rstrip(".")
    return rendered or "0"


def _get_dynamodb_client():
    global _DDB_CLIENT

    if _DDB_CLIENT is not None:
        return _DDB_CLIENT

    if boto3 is None:
        return None

    _DDB_CLIENT = boto3.client("dynamodb")
    return _DDB_CLIENT


def _build_stats_item(stats):
    if stats is None:
        return None

    return {
        "M": {
            "latencyMs": {"N": _format_number(stats["latencyMs"])},
            "promptTokens": {"N": _format_number(stats["promptTokens"])},
            "completionTokens": {"N": _format_number(stats["completionTokens"])},
            "totalTokens": {"N": _format_number(stats["totalTokens"])},
            "estimatedCostUsd": {"N": _format_number(stats["estimatedCostUsd"])},
        }
    }


def _store_feedback(record, event):
    if not FEEDBACK_TABLE_NAME:
        raise RuntimeError("FEEDBACK_TABLE_NAME is not configured.")

    client = _get_dynamodb_client()
    if client is None:
        raise RuntimeError("DynamoDB client is unavailable.")

    feedback_id = str(uuid.uuid4())
    source_ip = (
        event.get("requestContext", {}).get("http", {}).get("sourceIp", "unknown")
        if isinstance(event, dict)
        else "unknown"
    )
    source_ip = str(source_ip or "unknown")

    user_agent = _get_header(event, "user-agent").strip() or "unknown"
    user_agent = user_agent[:MAX_USER_AGENT_LENGTH]

    item = {
        "feedbackId": {"S": feedback_id},
        "createdAt": {"S": datetime.now(timezone.utc).isoformat()},
        "question": {"S": record["question"]},
        "answer": {"S": record["answer"]},
        "helpful": {"BOOL": record["helpful"]},
        "sourceIp": {"S": source_ip},
        "userAgent": {"S": user_agent},
    }

    if record["note"] is not None:
        item["note"] = {"S": record["note"]}

    stats_item = _build_stats_item(record["stats"])
    if stats_item is not None:
        item["stats"] = stats_item

    client.put_item(
        TableName=FEEDBACK_TABLE_NAME,
        Item=item,
        ConditionExpression="attribute_not_exists(feedbackId)",
    )

    return feedback_id


def lambda_handler(event, context):
    del context

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    try:
        record = _validate_payload(payload)
    except ValueError as error:
        return _json_response(400, {"message": str(error)})

    try:
        feedback_id = _store_feedback(record, event)
    except Exception as error:  # noqa: BLE001
        logger.error("rag_feedback_store_failed", extra={"error": str(error)})
        return _json_response(
            500,
            {"message": "Failed to record feedback. Please try again."},
        )

    return _json_response(200, {"ok": True, "feedbackId": feedback_id})
