import time
from typing import Optional

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None

_DDB_CLIENT = None


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


def build_bucket_key(source_ip: str, epoch_minute: Optional[int] = None) -> str:
    normalized_ip = (source_ip or "unknown").strip() or "unknown"
    minute = int(epoch_minute if epoch_minute is not None else time.time() // 60)
    return f"{normalized_ip}#{minute}"


def check_rate_limit(table_name: str, source_ip: str, per_minute_limit: int) -> bool:
    client = _get_ddb_client()

    epoch_minute = int(time.time() // 60)
    ttl_seconds = (epoch_minute * 60) + 180
    bucket_key = build_bucket_key(source_ip, epoch_minute)

    try:
        client.update_item(
            TableName=table_name,
            Key={"bucketKey": {"S": bucket_key}},
            UpdateExpression="SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl",
            ConditionExpression="attribute_not_exists(#count) OR #count < :limit",
            ExpressionAttributeNames={"#count": "requestCount", "#ttl": "ttl"},
            ExpressionAttributeValues={
                ":zero": {"N": "0"},
                ":inc": {"N": "1"},
                ":limit": {"N": str(max(1, per_minute_limit))},
                ":ttl": {"N": str(ttl_seconds)},
            },
        )
        return True
    except client.exceptions.ConditionalCheckFailedException:
        return False
