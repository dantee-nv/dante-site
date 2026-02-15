import json

from paper_search.semanticscholar import CircuitBreaker, SemanticScholarClient


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def test_semantic_scholar_client_normalizes_candidates(monkeypatch):
    payload = {
        "data": [
            {
                "paperId": "123",
                "title": "RAG Paper",
                "abstract": "About retrieval.",
                "authors": [{"name": "Alice"}, {"name": "Bob"}],
                "year": 2024,
                "venue": "NeurIPS",
                "url": "https://example.com/paper",
            }
        ]
    }

    def fake_urlopen(request, timeout):  # noqa: ANN001
        del request, timeout
        return _FakeResponse(payload)

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = SemanticScholarClient(
        base_url="https://api.semanticscholar.org",
        api_key="",
        candidate_limit=100,
        timeout_seconds=8,
        circuit_breaker=CircuitBreaker(failure_threshold=3, open_seconds=30),
    )

    results = client.search_papers("retrieval augmented generation")

    assert len(results) == 1
    assert results[0].paper_id == "123"
    assert results[0].authors == ["Alice", "Bob"]
