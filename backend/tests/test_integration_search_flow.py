import json

import paper_search.handler as handler
from paper_search.models import CandidatePaper


class _Context:
    pass


class _FakeSemanticClient:
    def search_papers(self, query):  # noqa: ANN001
        del query
        return [
            CandidatePaper(
                paper_id="paper-1",
                title="Hybrid Retrieval Systems",
                abstract="Discusses hybrid search and reranking techniques.",
                authors=["Alice", "Bob"],
                year=2024,
                venue="ACL",
                url="https://example.com/paper-1",
            ),
            CandidatePaper(
                paper_id="paper-2",
                title="Dense Vector Databases",
                abstract="Covers vector indexing and embedding search.",
                authors=["Carol", "Dan"],
                year=2023,
                venue="NeurIPS",
                url="https://example.com/paper-2",
            ),
        ]


class _FakeEmbeddingClient:
    def embed_text(self, text, normalize=True):  # noqa: ANN001
        del text, normalize
        return [1.0, 0.0]

    def embed_texts_indexed(self, indexed_texts, max_workers, normalize=True):  # noqa: ANN001
        del max_workers, normalize
        vectors = {}
        for index, text in indexed_texts:
            vectors[index] = [1.0, 0.0] if "Hybrid" in text else [0.0, 1.0]
        return vectors


def test_integration_flow_returns_ranked_results(monkeypatch):
    cache_state = {}

    def fake_get_cached_embedding(table_name, paper_id, content_hash):  # noqa: ANN001
        del table_name
        record = cache_state.get(paper_id)
        if not record:
            return None, False
        if record["content_hash"] != content_hash:
            return None, False
        return record["embedding"], True

    def fake_put_cached_embedding(table_name, paper_id, content_hash, embedding, ttl_days):  # noqa: ANN001
        del table_name, ttl_days
        cache_state[paper_id] = {
            "content_hash": content_hash,
            "embedding": embedding,
        }

    class _Settings:
        max_context_chars = 8000
        max_k = 10
        rate_limit_per_minute = 20
        request_rate_limit_table_name = "RequestRateLimit"
        paper_embeddings_table_name = "PaperEmbeddings"
        paper_embedding_ttl_days = 30
        embedding_max_workers = 4

    monkeypatch.setattr(handler, "_get_settings", lambda: _Settings())
    monkeypatch.setattr(handler, "check_rate_limit", lambda **kwargs: True)
    monkeypatch.setattr(handler, "_get_semantic_client", lambda settings: _FakeSemanticClient())
    monkeypatch.setattr(handler, "_get_embedding_client", lambda settings: _FakeEmbeddingClient())
    monkeypatch.setattr(handler, "get_cached_embedding", fake_get_cached_embedding)
    monkeypatch.setattr(handler, "put_cached_embedding", fake_put_cached_embedding)

    event = {
        "body": json.dumps({"context": "hybrid retrieval rank fusion", "k": 10}),
        "requestContext": {"requestId": "req-integration", "http": {"sourceIp": "10.1.2.3"}},
    }

    response = handler.lambda_handler(event, _Context())

    assert response["statusCode"] == 200
    payload = json.loads(response["body"])
    assert len(payload["results"]) == 2
    assert payload["results"][0]["paperId"] == "paper-1"
    assert payload["meta"]["cachedEmbeddingsUsed"] == 0
    assert payload["meta"]["requestId"] == "req-integration"
