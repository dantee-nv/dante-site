import json

import paper_search.handler as handler
from paper_search.semanticscholar import CircuitOpenError, UpstreamAuthError


class _Context:
    pass


def test_handler_returns_contract(monkeypatch):
    monkeypatch.setattr(handler, "check_rate_limit", lambda **kwargs: True)
    monkeypatch.setattr(
        handler,
        "_rank_candidates",
        lambda settings, context, k: (
            [
                {
                    "paperId": "1",
                    "title": "Paper",
                    "authors": ["Alice"],
                    "year": 2024,
                    "venue": "ACL",
                    "url": "https://example.com",
                    "score": 0.9,
                    "abstractSnippet": "snippet",
                }
            ],
            {"candidatesFetched": 1, "cachedEmbeddingsUsed": 1},
        ),
    )

    class _Settings:
        max_context_chars = 8000
        max_k = 10
        rate_limit_per_minute = 20
        request_rate_limit_table_name = "RequestRateLimit"
        paper_embeddings_table_name = "PaperEmbeddings"

    monkeypatch.setattr(handler, "_get_settings", lambda: _Settings())

    event = {
        "body": json.dumps({"context": "rag methods", "k": 10}),
        "requestContext": {"requestId": "req-123", "http": {"sourceIp": "1.2.3.4"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 200
    payload = json.loads(response["body"])
    assert "results" in payload
    assert payload["meta"]["requestId"] == "req-123"


def test_handler_rejects_empty_context():
    event = {
        "body": json.dumps({"context": "   ", "k": 10}),
        "requestContext": {"requestId": "req-123", "http": {"sourceIp": "1.2.3.4"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 400


def test_handler_returns_auth_failure_with_request_id(monkeypatch):
    monkeypatch.setattr(handler, "check_rate_limit", lambda **kwargs: True)
    monkeypatch.setattr(
        handler,
        "_rank_candidates",
        lambda settings, context, k: (_ for _ in ()).throw(
            UpstreamAuthError(
                "Semantic Scholar returned status 403.",
                status_code=403,
                body_excerpt="Forbidden",
                used_api_key=True,
                fallback_attempted=True,
            )
        ),
    )

    class _Settings:
        max_context_chars = 8000
        max_k = 10
        rate_limit_per_minute = 20
        request_rate_limit_table_name = "RequestRateLimit"
        paper_embeddings_table_name = "PaperEmbeddings"

    monkeypatch.setattr(handler, "_get_settings", lambda: _Settings())

    event = {
        "body": json.dumps({"context": "rag methods", "k": 10}),
        "requestContext": {"requestId": "req-auth", "http": {"sourceIp": "1.2.3.4"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 502
    payload = json.loads(response["body"])
    assert payload["requestId"] == "req-auth"
    assert "API access failed" in payload["message"]


def test_handler_returns_rate_limit_with_request_id(monkeypatch):
    monkeypatch.setattr(handler, "check_rate_limit", lambda **kwargs: False)

    class _Settings:
        max_context_chars = 8000
        max_k = 10
        rate_limit_per_minute = 20
        request_rate_limit_table_name = "RequestRateLimit"
        paper_embeddings_table_name = "PaperEmbeddings"

    monkeypatch.setattr(handler, "_get_settings", lambda: _Settings())

    event = {
        "body": json.dumps({"context": "rag methods", "k": 10}),
        "requestContext": {"requestId": "req-429", "http": {"sourceIp": "1.2.3.4"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 429
    payload = json.loads(response["body"])
    assert payload["requestId"] == "req-429"
    assert "Too many requests" in payload["message"]


def test_handler_returns_circuit_open_with_request_id(monkeypatch):
    monkeypatch.setattr(handler, "check_rate_limit", lambda **kwargs: True)
    monkeypatch.setattr(
        handler,
        "_rank_candidates",
        lambda settings, context, k: (_ for _ in ()).throw(CircuitOpenError("open")),
    )

    class _Settings:
        max_context_chars = 8000
        max_k = 10
        rate_limit_per_minute = 20
        request_rate_limit_table_name = "RequestRateLimit"
        paper_embeddings_table_name = "PaperEmbeddings"

    monkeypatch.setattr(handler, "_get_settings", lambda: _Settings())

    event = {
        "body": json.dumps({"context": "rag methods", "k": 10}),
        "requestContext": {"requestId": "req-circuit", "http": {"sourceIp": "1.2.3.4"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 503
    payload = json.loads(response["body"])
    assert payload["requestId"] == "req-circuit"
    assert "temporarily throttled" in payload["message"]
