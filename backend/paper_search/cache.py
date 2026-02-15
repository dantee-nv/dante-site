import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None

_DDB_CLIENT = None


def _format_number(value: float) -> str:
    rendered = f"{float(value):.8f}".rstrip("0").rstrip(".")
    return rendered or "0"


def _get_ddb_client():
    global _DDB_CLIENT

    if _DDB_CLIENT is not None:
        return _DDB_CLIENT

    if boto3 is None:
        raise RuntimeError("boto3 is required for DynamoDB access.")

    _DDB_CLIENT = boto3.client("dynamodb")
    return _DDB_CLIENT


def reset_ddb_client_for_tests() -> None:
    global _DDB_CLIENT
    _DDB_CLIENT = None


def compute_content_hash(title: str, abstract: str) -> str:
    payload = f"{(title or '').strip()}\n\n{(abstract or '').strip()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def build_embedding_text(title: str, abstract: str) -> str:
    normalized_title = (title or "").strip()
    normalized_abstract = (abstract or "").strip()
    if normalized_title and normalized_abstract:
        return f"{normalized_title}\n\n{normalized_abstract}"
    return normalized_title or normalized_abstract


def _embedding_to_attr(embedding: list[float]) -> dict:
    return {"L": [{"N": _format_number(value)} for value in embedding]}


def _attr_to_embedding(attribute: dict) -> Optional[list[float]]:
    if not isinstance(attribute, dict):
        return None

    values = attribute.get("L")
    if not isinstance(values, list):
        return None

    embedding: list[float] = []
    for item in values:
        if not isinstance(item, dict) or "N" not in item:
            return None
        try:
            embedding.append(float(item["N"]))
        except (TypeError, ValueError):
            return None

    return embedding if embedding else None


def get_cached_embedding(
    table_name: str,
    paper_id: str,
    content_hash: str,
) -> tuple[Optional[list[float]], bool]:
    client = _get_ddb_client()
    response = client.get_item(
        TableName=table_name,
        Key={"paperId": {"S": paper_id}},
        ConsistentRead=False,
    )

    item = response.get("Item")
    if not isinstance(item, dict):
        return None, False

    stored_hash = item.get("contentHash", {}).get("S")
    if stored_hash != content_hash:
        return None, False

    embedding = _attr_to_embedding(item.get("embedding"))
    if embedding is None:
        return None, False

    return embedding, True


def put_cached_embedding(
    table_name: str,
    paper_id: str,
    content_hash: str,
    embedding: list[float],
    ttl_days: int,
) -> None:
    client = _get_ddb_client()

    ttl_timestamp = int(
        (datetime.now(timezone.utc) + timedelta(days=max(1, ttl_days))).timestamp()
    )

    item = {
        "paperId": {"S": paper_id},
        "contentHash": {"S": content_hash},
        "embedding": _embedding_to_attr(embedding),
        "updatedAt": {"S": datetime.now(timezone.utc).isoformat()},
        "ttl": {"N": str(ttl_timestamp)},
    }

    client.put_item(TableName=table_name, Item=item)
