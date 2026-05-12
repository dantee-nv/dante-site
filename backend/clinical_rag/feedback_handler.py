from __future__ import annotations

import json
import logging
import os
import uuid
from base64 import b64decode
from datetime import datetime, timezone

try:
    import boto3
except ImportError:  # pragma: no cover - Lambda includes boto3
    boto3 = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

FEEDBACK_TABLE_NAME = os.getenv("CLINICAL_RAG_FEEDBACK_TABLE_NAME", "").strip()
MAX_TEXT_LENGTH = 4000
MAX_NOTE_LENGTH = 1000
_DDB_CLIENT = None


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


def _required_string(payload: dict, field_name: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    value = payload.get(field_name)
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string.")
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{field_name} is required.")
    if len(normalized) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or fewer.")
    return normalized


def validate_feedback_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload.")

    if "helpful" not in payload or not isinstance(payload.get("helpful"), bool):
        raise ValueError("helpful must be provided as a boolean.")

    note = payload.get("note")
    if note is not None:
        if not isinstance(note, str):
            raise ValueError("note must be a string.")
        note = note.strip()
        if len(note) > MAX_NOTE_LENGTH:
            raise ValueError(f"note must be {MAX_NOTE_LENGTH} characters or fewer.")

    return {
        "question": _required_string(payload, "question"),
        "answer": _required_string(payload, "answer"),
        "helpful": payload["helpful"],
        "note": note or None,
        "citations": payload.get("citations") if isinstance(payload.get("citations"), list) else [],
        "retrieval": payload.get("retrieval") if isinstance(payload.get("retrieval"), dict) else {},
        "safety": payload.get("safety") if isinstance(payload.get("safety"), dict) else {},
        "stats": payload.get("stats") if isinstance(payload.get("stats"), dict) else {},
    }


def _client():
    global _DDB_CLIENT
    if _DDB_CLIENT is not None:
        return _DDB_CLIENT
    if boto3 is None:
        return None
    _DDB_CLIENT = boto3.client("dynamodb")
    return _DDB_CLIENT


def _put_feedback(record: dict) -> str:
    if not FEEDBACK_TABLE_NAME:
        raise RuntimeError("CLINICAL_RAG_FEEDBACK_TABLE_NAME is not configured.")
    client = _client()
    if client is None:
        raise RuntimeError("DynamoDB client is unavailable.")

    feedback_id = str(uuid.uuid4())
    client.put_item(
        TableName=FEEDBACK_TABLE_NAME,
        Item={
            "feedbackId": {"S": feedback_id},
            "createdAt": {"S": datetime.now(timezone.utc).isoformat()},
            "question": {"S": record["question"]},
            "answer": {"S": record["answer"]},
            "helpful": {"BOOL": record["helpful"]},
            "note": {"S": record["note"] or ""},
            "citations": {"S": json.dumps(record["citations"], sort_keys=True)},
            "retrieval": {"S": json.dumps(record["retrieval"], sort_keys=True)},
            "safety": {"S": json.dumps(record["safety"], sort_keys=True)},
            "stats": {"S": json.dumps(record["stats"], sort_keys=True)},
        },
        ConditionExpression="attribute_not_exists(feedbackId)",
    )
    return feedback_id


def lambda_handler(event, context):  # noqa: ANN001
    del context

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    try:
        record = validate_feedback_payload(payload)
    except ValueError as error:
        return _json_response(400, {"message": str(error)})

    try:
        feedback_id = _put_feedback(record)
    except Exception as error:  # noqa: BLE001
        logger.error("clinical_rag_feedback_failed", extra={"error": str(error)})
        return _json_response(500, {"message": "Failed to record feedback. Please try again."})

    return _json_response(200, {"ok": True, "feedbackId": feedback_id})

