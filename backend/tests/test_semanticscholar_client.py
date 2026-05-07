import io
import json
import urllib.error

import pytest

from paper_search.semanticscholar import (
    CircuitBreaker,
    SemanticScholarClient,
    UpstreamAuthError,
    UpstreamRateLimitedError,
)


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def read(self):
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _build_client(api_key=""):
    return SemanticScholarClient(
        base_url="https://api.semanticscholar.org",
        api_key=api_key,
        candidate_limit=100,
        timeout_seconds=8,
        circuit_breaker=CircuitBreaker(failure_threshold=3, open_seconds=30),
    )


def _http_error(status_code, payload):
    return urllib.error.HTTPError(
        url="https://api.semanticscholar.org/graph/v1/paper/search",
        code=status_code,
        msg="error",
        hdrs=None,
        fp=io.BytesIO(json.dumps(payload).encode("utf-8")),
    )


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

    client = _build_client()

    results = client.search_papers("retrieval augmented generation")

    assert len(results) == 1
    assert results[0].paper_id == "123"
    assert results[0].authors == ["Alice", "Bob"]


def test_semantic_scholar_client_retries_without_api_key_after_403(monkeypatch):
    payload = {
        "data": [
            {
                "paperId": "123",
                "title": "RAG Paper",
                "abstract": "About retrieval.",
                "authors": [{"name": "Alice"}],
                "year": 2024,
                "venue": "NeurIPS",
                "url": "https://example.com/paper",
            }
        ]
    }
    calls = []
    responses = [_http_error(403, {"message": "Forbidden"}), _FakeResponse(payload)]

    def fake_urlopen(request, timeout):  # noqa: ANN001
        del timeout
        calls.append(request.headers.copy())
        response = responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _build_client(api_key="bad-key")

    results = client.search_papers("retrieval augmented generation")

    assert len(results) == 1
    assert "X-api-key" in calls[0]
    assert "X-api-key" not in calls[1]


def test_semantic_scholar_client_maps_fallback_429_to_rate_limit(monkeypatch):
    responses = [
        _http_error(403, {"message": "Forbidden"}),
        _http_error(429, {"message": "Too Many Requests"}),
    ]

    def fake_urlopen(request, timeout):  # noqa: ANN001
        del request, timeout
        response = responses.pop(0)
        raise response

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _build_client(api_key="bad-key")

    with pytest.raises(UpstreamRateLimitedError) as error_info:
        client.search_papers("retrieval augmented generation")

    assert error_info.value.status_code == 429
    assert error_info.value.fallback_attempted is True


def test_semantic_scholar_client_surfaces_unrecoverable_403_context(monkeypatch):
    responses = [
        _http_error(403, {"message": "Forbidden"}),
        _http_error(403, {"message": "Forbidden"}),
    ]

    def fake_urlopen(request, timeout):  # noqa: ANN001
        del request, timeout
        response = responses.pop(0)
        raise response

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    client = _build_client(api_key="bad-key")

    with pytest.raises(UpstreamAuthError) as error_info:
        client.search_papers("retrieval augmented generation")

    assert error_info.value.status_code == 403
    assert "Forbidden" in error_info.value.body_excerpt
    assert error_info.value.fallback_attempted is True
