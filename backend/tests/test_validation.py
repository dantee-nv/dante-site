import pytest

from paper_search.handler import validate_search_payload


def test_validate_payload_happy_path():
    context, k = validate_search_payload(
        payload={"context": "  transformer retrieval evaluation  ", "k": 12},
        max_context_chars=8000,
        max_k=10,
    )

    assert context == "transformer retrieval evaluation"
    assert k == 10


def test_validate_payload_requires_context():
    with pytest.raises(ValueError, match="context is required"):
        validate_search_payload(
            payload={"context": "   ", "k": 10},
            max_context_chars=8000,
            max_k=10,
        )


def test_validate_payload_enforces_length():
    with pytest.raises(ValueError, match="characters or fewer"):
        validate_search_payload(
            payload={"context": "a" * 9001, "k": 10},
            max_context_chars=8000,
            max_k=10,
        )


def test_validate_payload_rejects_non_numeric_k():
    with pytest.raises(ValueError, match="k must be a number"):
        validate_search_payload(
            payload={"context": "rag", "k": "ten"},
            max_context_chars=8000,
            max_k=10,
        )
