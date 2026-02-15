import json
import logging
import os
import re
import time
from base64 import b64decode
from dataclasses import dataclass

from .bedrock_embeddings import BedrockEmbeddingClient
from .cache import (
    build_embedding_text,
    compute_content_hash,
    get_cached_embedding,
    put_cached_embedding,
)
from .models import CandidatePaper, RankedPaper
from .rate_limit import check_rate_limit
from .semanticscholar import (
    CircuitBreaker,
    CircuitOpenError,
    SemanticScholarClient,
    UpstreamRateLimitedError,
    UpstreamRequestError,
)
from .similarity import cosine_similarity

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_WORD_PATTERN = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9+\-]{1,}")
_STOP_WORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "using",
    "use",
    "what",
    "which",
    "when",
    "where",
    "how",
    "does",
    "are",
    "can",
    "your",
    "about",
}


@dataclass
class Settings:
    bedrock_region: str
    bedrock_model_id: str
    semantic_scholar_base_url: str
    semantic_scholar_api_key: str
    candidate_limit: int
    max_context_chars: int
    max_k: int
    paper_embedding_ttl_days: int
    rate_limit_per_minute: int
    circuit_breaker_threshold: int
    circuit_breaker_open_seconds: int
    paper_embeddings_table_name: str
    request_rate_limit_table_name: str
    embedding_max_workers: int


_SETTINGS = None
_EMBEDDING_CLIENT = None
_SEMANTIC_CLIENT = None
_CIRCUIT_BREAKER = None


def _json_response(status_code: int, payload: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(payload),
    }


def _load_settings() -> Settings:
    return Settings(
        bedrock_region=os.getenv("BEDROCK_REGION", "us-east-2").strip() or "us-east-2",
        bedrock_model_id=os.getenv("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0").strip()
        or "amazon.titan-embed-text-v2:0",
        semantic_scholar_base_url=os.getenv(
            "SEMANTIC_SCHOLAR_BASE_URL", "https://api.semanticscholar.org"
        ).strip()
        or "https://api.semanticscholar.org",
        semantic_scholar_api_key=os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip(),
        candidate_limit=max(1, min(100, int(os.getenv("CANDIDATE_LIMIT", "100")))),
        max_context_chars=max(200, int(os.getenv("MAX_CONTEXT_CHARS", "8000"))),
        max_k=max(1, int(os.getenv("MAX_K", "10"))),
        paper_embedding_ttl_days=max(1, int(os.getenv("PAPER_EMBEDDING_TTL_DAYS", "30"))),
        rate_limit_per_minute=max(1, int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))),
        circuit_breaker_threshold=max(1, int(os.getenv("CIRCUIT_BREAKER_THRESHOLD", "3"))),
        circuit_breaker_open_seconds=max(5, int(os.getenv("CIRCUIT_BREAKER_OPEN_SECONDS", "30"))),
        paper_embeddings_table_name=os.getenv("PAPER_EMBEDDINGS_TABLE_NAME", "").strip(),
        request_rate_limit_table_name=os.getenv("REQUEST_RATE_LIMIT_TABLE_NAME", "").strip(),
        embedding_max_workers=max(1, int(os.getenv("EMBEDDING_MAX_WORKERS", "6"))),
    )


def _get_settings() -> Settings:
    global _SETTINGS
    if _SETTINGS is None:
        _SETTINGS = _load_settings()
    return _SETTINGS


def _get_embedding_client(settings: Settings) -> BedrockEmbeddingClient:
    global _EMBEDDING_CLIENT
    if _EMBEDDING_CLIENT is None:
        _EMBEDDING_CLIENT = BedrockEmbeddingClient(
            region_name=settings.bedrock_region,
            model_id=settings.bedrock_model_id,
        )
    return _EMBEDDING_CLIENT


def _get_semantic_client(settings: Settings) -> SemanticScholarClient:
    global _SEMANTIC_CLIENT
    global _CIRCUIT_BREAKER

    if _CIRCUIT_BREAKER is None:
        _CIRCUIT_BREAKER = CircuitBreaker(
            failure_threshold=settings.circuit_breaker_threshold,
            open_seconds=settings.circuit_breaker_open_seconds,
        )

    if _SEMANTIC_CLIENT is None:
        _SEMANTIC_CLIENT = SemanticScholarClient(
            base_url=settings.semantic_scholar_base_url,
            api_key=settings.semantic_scholar_api_key,
            candidate_limit=settings.candidate_limit,
            timeout_seconds=8,
            circuit_breaker=_CIRCUIT_BREAKER,
        )

    return _SEMANTIC_CLIENT


def _parse_body(event: dict) -> dict:
    if not isinstance(event, dict):
        return {}

    raw_body = event.get("body")
    if not raw_body:
        return {}

    if event.get("isBase64Encoded"):
        raw_body = b64decode(raw_body).decode("utf-8")

    if isinstance(raw_body, str):
        return json.loads(raw_body)

    return {}


def _normalize_context(value: str) -> str:
    return " ".join(value.split()).strip()


def _extract_request_id(event: dict) -> str:
    request_context = event.get("requestContext") if isinstance(event, dict) else None
    if not isinstance(request_context, dict):
        return ""

    request_id = request_context.get("requestId")
    return str(request_id).strip() if request_id else ""


def _extract_source_ip(event: dict) -> str:
    request_context = event.get("requestContext") if isinstance(event, dict) else None
    if not isinstance(request_context, dict):
        return "unknown"

    http_context = request_context.get("http")
    if isinstance(http_context, dict):
        source_ip = http_context.get("sourceIp")
        if source_ip:
            return str(source_ip).strip()

    identity_context = request_context.get("identity")
    if isinstance(identity_context, dict):
        source_ip = identity_context.get("sourceIp")
        if source_ip:
            return str(source_ip).strip()

    return "unknown"


def validate_search_payload(payload: dict, max_context_chars: int, max_k: int) -> tuple[str, int]:
    if not isinstance(payload, dict):
        raise ValueError("Invalid JSON payload.")

    context = payload.get("context")
    if not isinstance(context, str):
        raise ValueError("context must be a string.")

    normalized_context = _normalize_context(context)
    if not normalized_context:
        raise ValueError("context is required.")

    if len(normalized_context) > max_context_chars:
        raise ValueError(f"context must be {max_context_chars} characters or fewer.")

    requested_k = payload.get("k", 10)
    if isinstance(requested_k, bool) or not isinstance(requested_k, (int, float)):
        raise ValueError("k must be a number.")

    if int(requested_k) < 1:
        requested_k = 1

    k = min(int(requested_k), max_k)
    return normalized_context, k


def _keyword_safe_query(context: str) -> str:
    terms = [term.lower() for term in _WORD_PATTERN.findall(context)]
    selected: list[str] = []
    seen: set[str] = set()

    for term in terms:
        if term in _STOP_WORDS or term in seen:
            continue
        seen.add(term)
        selected.append(term)
        if len(selected) >= 24:
            break

    if selected:
        return " ".join(selected)

    return context[:300]


def _abstract_snippet(abstract: str, max_chars: int = 320) -> str:
    normalized = " ".join((abstract or "").split())
    if not normalized:
        return "Abstract not available."
    if len(normalized) <= max_chars:
        return normalized
    return f"{normalized[: max_chars - 1].rstrip()}..."


def _rank_candidates(
    settings: Settings,
    context: str,
    k: int,
) -> tuple[list[dict], dict]:
    semantic_client = _get_semantic_client(settings)
    embedding_client = _get_embedding_client(settings)

    candidates = semantic_client.search_papers(_keyword_safe_query(context))
    context_embedding = embedding_client.embed_text(context, normalize=True)

    cached_hits = 0
    embeddings_by_paper: dict[str, list[float]] = {}
    missing: list[tuple[int, str]] = []
    missing_metadata: dict[int, tuple[CandidatePaper, str]] = {}

    for index, candidate in enumerate(candidates):
        content_hash = compute_content_hash(candidate.title, candidate.abstract)
        cached_embedding, cache_hit = get_cached_embedding(
            table_name=settings.paper_embeddings_table_name,
            paper_id=candidate.paper_id,
            content_hash=content_hash,
        )

        if cache_hit and cached_embedding is not None:
            cached_hits += 1
            embeddings_by_paper[candidate.paper_id] = cached_embedding
            continue

        candidate_text = build_embedding_text(candidate.title, candidate.abstract)
        if not candidate_text:
            continue

        missing.append((index, candidate_text))
        missing_metadata[index] = (candidate, content_hash)

    if missing:
        embedded_missing = embedding_client.embed_texts_indexed(
            indexed_texts=missing,
            max_workers=settings.embedding_max_workers,
            normalize=True,
        )

        for index, embedding in embedded_missing.items():
            candidate, content_hash = missing_metadata[index]
            embeddings_by_paper[candidate.paper_id] = embedding
            put_cached_embedding(
                table_name=settings.paper_embeddings_table_name,
                paper_id=candidate.paper_id,
                content_hash=content_hash,
                embedding=embedding,
                ttl_days=settings.paper_embedding_ttl_days,
            )

    ranked: list[RankedPaper] = []
    for candidate in candidates:
        embedding = embeddings_by_paper.get(candidate.paper_id)
        if embedding is None:
            continue

        score = cosine_similarity(context_embedding, embedding)
        ranked.append(RankedPaper(paper=candidate, score=score))

    ranked.sort(key=lambda item: item.score, reverse=True)
    top_ranked = ranked[:k]

    results = [
        {
            "paperId": item.paper.paper_id,
            "title": item.paper.title,
            "authors": item.paper.authors,
            "year": item.paper.year,
            "venue": item.paper.venue,
            "url": item.paper.url,
            "score": round(item.score, 4),
            "abstractSnippet": _abstract_snippet(item.paper.abstract),
        }
        for item in top_ranked
    ]

    meta = {
        "candidatesFetched": len(candidates),
        "cachedEmbeddingsUsed": cached_hits,
    }

    return results, meta


def lambda_handler(event, context):
    del context

    started_at = time.perf_counter()
    settings = _get_settings()
    request_id = _extract_request_id(event)
    source_ip = _extract_source_ip(event)

    try:
        payload = _parse_body(event)
    except json.JSONDecodeError:
        return _json_response(400, {"message": "Invalid JSON payload."})

    try:
        normalized_context, k = validate_search_payload(
            payload=payload,
            max_context_chars=settings.max_context_chars,
            max_k=settings.max_k,
        )
    except ValueError as error:
        return _json_response(400, {"message": str(error)})

    if not settings.paper_embeddings_table_name or not settings.request_rate_limit_table_name:
        logger.error("paper_search_missing_table_config")
        return _json_response(500, {"message": "Service is not configured."})

    try:
        allowed = check_rate_limit(
            table_name=settings.request_rate_limit_table_name,
            source_ip=source_ip,
            per_minute_limit=settings.rate_limit_per_minute,
        )
    except Exception as error:  # noqa: BLE001
        logger.exception(
            "paper_search_rate_limit_failed error_type=%s error_message=%s request_id=%s",
            type(error).__name__,
            str(error),
            request_id,
        )
        return _json_response(500, {"message": "Rate limiting service is unavailable."})

    if not allowed:
        return _json_response(429, {"message": "Too many requests. Please try again shortly."})

    try:
        results, meta = _rank_candidates(settings=settings, context=normalized_context, k=k)
    except CircuitOpenError:
        return _json_response(
            503,
            {
                "message": "Semantic Scholar is temporarily throttled. Please retry shortly.",
            },
        )
    except UpstreamRateLimitedError:
        return _json_response(
            503,
            {
                "message": "Semantic Scholar is rate limiting requests right now. Please retry shortly.",
            },
        )
    except UpstreamRequestError:
        return _json_response(
            502,
            {
                "message": "Semantic Scholar request failed. Please retry.",
            },
        )
    except Exception as error:  # noqa: BLE001
        logger.exception(
            "paper_search_failed error_type=%s error_message=%s request_id=%s",
            type(error).__name__,
            str(error),
            request_id,
        )
        return _json_response(
            500,
            {
                "message": "Paper search is temporarily unavailable. Please try again.",
            },
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    meta["requestId"] = request_id
    meta["latencyMs"] = latency_ms

    logger.info(
        "paper_search_success request_id=%s source_ip=%s candidates=%s cache_hits=%s results=%s latency_ms=%s",
        request_id,
        source_ip,
        meta["candidatesFetched"],
        meta["cachedEmbeddingsUsed"],
        len(results),
        latency_ms,
    )

    return _json_response(
        200,
        {
            "results": results,
            "meta": meta,
        },
    )
