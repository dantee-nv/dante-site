import json

import paper_search.handler as handler


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
