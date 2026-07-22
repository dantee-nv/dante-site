import json

import src.handler as handler
import src.rag_engine as rag_engine


class _Context:
    pass


class _EmbeddingItem:
    embedding = [1.0, 0.0]


class _EmbeddingResponse:
    data = [_EmbeddingItem()]


class _QuotaError(Exception):
    code = "insufficient_quota"
    status_code = 429


class _AuthError(Exception):
    status_code = 401


class _FailingEmbeddings:
    def __init__(self, error):
        self.error = error

    def create(self, **kwargs):
        del kwargs
        raise self.error


class _WorkingEmbeddings:
    def create(self, **kwargs):
        del kwargs
        return _EmbeddingResponse()


class _FailingResponses:
    def __init__(self, error):
        self.error = error

    def create(self, **kwargs):
        del kwargs
        raise self.error


class _EmbeddingFailureClient:
    def __init__(self, error):
        self.embeddings = _FailingEmbeddings(error)


class _GenerationFailureClient:
    def __init__(self, error):
        self.embeddings = _WorkingEmbeddings()
        self.responses = _FailingResponses(error)


def _reset_engine(monkeypatch, client):
    monkeypatch.setattr(rag_engine, "_CLIENT", client)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)
    monkeypatch.setattr(
        rag_engine,
        "_read_policy_documents",
        lambda: [
            (
                2,
                "Employees receive paid vacation according to tenure. "
                "Vacation requests must be approved by the employee's manager.",
            )
        ],
    )


def _ask():
    return handler.lambda_handler(
        {
            "body": json.dumps({"question": "What is the vacation policy?"}),
            "requestContext": {"requestId": "req-rag-demo"},
        },
        _Context(),
    )


def test_embedding_quota_failure_returns_error_contract(monkeypatch):
    _reset_engine(monkeypatch, _EmbeddingFailureClient(_QuotaError("quota exceeded")))

    response = _ask()

    assert response["statusCode"] == 503
    payload = json.loads(response["body"])
    assert payload == {
        "message": "The RAG demo is unavailable because the OpenAI account quota is exhausted.",
        "code": "openai_insufficient_quota",
        "requestId": "req-rag-demo",
    }
    assert "answer" not in payload


def test_generation_failure_returns_error_contract(monkeypatch):
    _reset_engine(monkeypatch, _GenerationFailureClient(_AuthError("bad key")))

    response = _ask()

    assert response["statusCode"] == 503
    payload = json.loads(response["body"])
    assert payload["code"] == "openai_auth_error"
    assert payload["requestId"] == "req-rag-demo"
    assert "answer" not in payload


def test_missing_openai_key_returns_dependency_error(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(rag_engine, "_CLIENT", rag_engine._UNINITIALIZED)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)
    monkeypatch.setattr(rag_engine, "OpenAI", object)

    response = _ask()

    assert response["statusCode"] == 503
    payload = json.loads(response["body"])
    assert payload == {
        "message": "The RAG demo is unavailable because the OpenAI API key is not configured.",
        "code": "dependency_unavailable",
        "requestId": "req-rag-demo",
    }
    assert "answer" not in payload
