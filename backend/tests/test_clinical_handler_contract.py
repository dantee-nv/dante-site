import json

import clinical_rag.feedback_handler as feedback_handler
import clinical_rag.handler as handler


class _Context:
    pass


def test_clinical_ask_handler_returns_contract(monkeypatch):
    monkeypatch.setattr(
        handler,
        "answer_question",
        lambda question, *, retrieval_mode: (
            {
                "answer": f"Answer for {question}",
                "citations": [{"documentId": "doc-1"}],
                "retrieval": {"strategy": "test", "mode": "local_cached", "hits": []},
                "safety": {"answerMode": "grounded", "validationPassed": True},
            },
            {
                "promptTokens": 0,
                "completionTokens": 0,
                "totalTokens": 0,
                "estimatedCostUsd": 0,
            },
        ),
    )

    response = handler.lambda_handler(
        {"body": json.dumps({"question": "What is diabetes?"})},
        _Context(),
    )

    assert response["statusCode"] == 200
    payload = json.loads(response["body"])
    assert payload["answer"] == "Answer for What is diabetes?"
    assert payload["stats"]["latencyMs"] >= 0


def test_clinical_ask_handler_passes_retrieval_mode(monkeypatch):
    captured = {}

    def fake_answer_question(question, *, retrieval_mode):
        captured["question"] = question
        captured["retrievalMode"] = retrieval_mode
        return (
            {
                "answer": "Bedrock answer",
                "citations": [],
                "retrieval": {
                    "strategy": "bedrock_titan_semantic_plus_bm25_rrf_rerank",
                    "mode": "bedrock_semantic",
                    "hits": [],
                },
                "safety": {"answerMode": "grounded", "validationPassed": True},
            },
            {
                "promptTokens": 0,
                "completionTokens": 0,
                "embeddingTokens": 12,
                "embeddingCostUsd": 0.00000024,
                "totalTokens": 12,
                "estimatedCostUsd": 0.00000024,
            },
        )

    monkeypatch.setattr(handler, "answer_question", fake_answer_question)

    response = handler.lambda_handler(
        {
            "body": json.dumps(
                {
                    "question": "What is diabetes?",
                    "retrievalMode": "bedrock_titan_semantic_plus_bm25_rrf_rerank",
                }
            )
        },
        _Context(),
    )

    assert response["statusCode"] == 200
    payload = json.loads(response["body"])
    assert captured["retrievalMode"] == "bedrock_titan_semantic_plus_bm25_rrf_rerank"
    assert payload["stats"]["embeddingTokens"] == 12


def test_clinical_ask_handler_rejects_invalid_retrieval_mode():
    response = handler.lambda_handler(
        {
            "body": json.dumps(
                {
                    "question": "What is diabetes?",
                    "retrievalMode": "not-a-mode",
                }
            )
        },
        _Context(),
    )

    assert response["statusCode"] == 400


def test_clinical_ask_handler_rejects_empty_question():
    response = handler.lambda_handler({"body": json.dumps({"question": "  "})}, _Context())

    assert response["statusCode"] == 400


def test_feedback_payload_validation_accepts_metadata():
    record = feedback_handler.validate_feedback_payload(
        {
            "question": "What is diabetes?",
            "answer": "A grounded answer.",
            "helpful": True,
            "citations": [{"documentId": "doc-1"}],
            "retrieval": {"strategy": "test"},
            "safety": {"answerMode": "grounded"},
            "stats": {"latencyMs": 1},
        }
    )

    assert record["helpful"] is True
    assert record["citations"][0]["documentId"] == "doc-1"


def test_feedback_payload_requires_helpful_boolean():
    response = feedback_handler.lambda_handler(
        {
            "body": json.dumps(
                {
                    "question": "What is diabetes?",
                    "answer": "A grounded answer.",
                    "helpful": "yes",
                }
            )
        },
        _Context(),
    )

    assert response["statusCode"] == 400
