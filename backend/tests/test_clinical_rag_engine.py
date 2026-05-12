import json

import clinical_rag.rag_engine as rag_engine


def _write_records(path, records):
    path.write_text(
        "\n".join(json.dumps(record, sort_keys=True) for record in records) + "\n",
        encoding="utf-8",
    )


def test_retrieval_prefers_topic_and_question_type(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-doc",
                "questionId": "diabetes-treatment",
                "source": "NIDDK",
                "sourceUrl": "https://example.com/diabetes",
                "questionFocus": "Type 2 Diabetes",
                "questionType": "treatment",
                "question": "What are treatments for type 2 diabetes?",
                "answer": "Treatment may include nutrition support, physical activity, and medicines.",
            },
            {
                "documentId": "blood-pressure-doc",
                "questionId": "blood-pressure-info",
                "source": "NHLBI",
                "sourceUrl": "https://example.com/bp",
                "questionFocus": "High Blood Pressure",
                "questionType": "information",
                "question": "What is high blood pressure?",
                "answer": "High blood pressure is a condition that affects blood vessels.",
            },
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    hits = rag_engine.retrieve("What treatments help type 2 diabetes?", top_k=2)

    assert hits[0].document_id == "diabetes-doc"
    assert hits[0].rerank_score >= hits[1].rerank_score


def test_load_knowledge_base_uses_cached_embedding(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    embedding_path = tmp_path / "embeddings.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-doc",
                "questionId": "diabetes-treatment",
                "source": "NIDDK",
                "sourceUrl": "https://example.com/diabetes",
                "questionFocus": "Type 2 Diabetes",
                "questionType": "treatment",
                "question": "What are treatments for type 2 diabetes?",
                "answer": "Treatment may include nutrition support, physical activity, and medicines.",
            }
        ],
    )
    cached_embedding = [0.0] * rag_engine.HASH_DIMS
    cached_embedding[7] = 1.0
    _write_records(
        embedding_path,
        [
            {
                "chunkId": "diabetes-doc-diabetes-treatment",
                "embedding": cached_embedding,
            }
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "EMBEDDING_CACHE_PATH", embedding_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    knowledge = rag_engine.load_knowledge_base()

    assert knowledge.chunks[0].embedding == cached_embedding


def test_load_knowledge_base_uses_cached_titan_embedding(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    local_embedding_path = tmp_path / "local_embeddings.jsonl"
    titan_embedding_path = tmp_path / "titan_embeddings.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-doc",
                "questionId": "diabetes-treatment",
                "source": "NIDDK",
                "sourceUrl": "https://example.com/diabetes",
                "questionFocus": "Type 2 Diabetes",
                "questionType": "treatment",
                "question": "What are treatments for type 2 diabetes?",
                "answer": "Treatment may include nutrition support, physical activity, and medicines.",
            }
        ],
    )
    _write_records(local_embedding_path, [])
    cached_embedding = [0.0] * rag_engine.TITAN_DIMS
    cached_embedding[3] = 1.0
    _write_records(
        titan_embedding_path,
        [
            {
                "chunkId": "diabetes-doc-diabetes-treatment",
                "embedding": cached_embedding,
            }
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "EMBEDDING_CACHE_PATH", local_embedding_path)
    monkeypatch.setattr(rag_engine, "TITAN_EMBEDDING_CACHE_PATH", titan_embedding_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    knowledge = rag_engine.load_knowledge_base()

    assert knowledge.chunks[0].semantic_embedding == cached_embedding


def test_answer_returns_not_found_when_support_is_weak(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-doc",
                "questionId": "diabetes-info",
                "source": "NIDDK",
                "sourceUrl": "https://example.com/diabetes",
                "questionFocus": "Type 2 Diabetes",
                "questionType": "information",
                "question": "What is type 2 diabetes?",
                "answer": "Type 2 diabetes affects how the body uses glucose.",
            }
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    result, usage = rag_engine.answer_question("What is the parking policy?")

    assert result["safety"]["answerMode"] == "not_found"
    assert result["citations"] == []
    assert usage["totalTokens"] == 0


def test_answer_uses_multiple_supported_sources(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-prevention-doc",
                "questionId": "diabetes-prevention",
                "source": "NIDDK",
                "sourceUrl": "http://www.niddk.nih.gov/health-information/health-topics/Diabetes/example.aspx",
                "questionFocus": "Type 2 Diabetes Prevention",
                "questionType": "prevention",
                "question": "How can someone prevent type 2 diabetes?",
                "answer": (
                    "Lifestyle changes can help prevent or delay type 2 diabetes. "
                    "Examples include a healthy eating plan and regular physical activity."
                ),
            },
            {
                "documentId": "blood-sugar-doc",
                "questionId": "blood-sugar-info",
                "source": "MPlusHealthTopics",
                "sourceUrl": "https://www.nlm.nih.gov/medlineplus/bloodsugar.html",
                "questionFocus": "Blood Sugar",
                "questionType": "information",
                "question": "What affects blood sugar?",
                "answer": (
                    "Blood sugar comes from the food you eat and is used by cells for energy. "
                    "Keeping a regular schedule of eating, activity, and medicines can help."
                ),
            },
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    result, _usage = rag_engine.answer_question("How can someone prevent type 2 diabetes?")

    assert result["safety"]["answerMode"] == "grounded"
    assert "[1]" in result["answer"]
    assert "[2]" in result["answer"]
    assert len(result["citations"]) >= 2
    assert result["citations"][0]["citationUrl"].startswith("https://web.archive.org/web/*/")
    assert result["citations"][0]["archiveUrl"].startswith("https://web.archive.org/web/*/")
    assert result["citations"][0]["sourceUrl"].startswith("http://www.niddk.nih.gov/")


def test_bedrock_mode_uses_cached_semantic_embeddings_and_bm25(tmp_path, monkeypatch):
    data_path = tmp_path / "clinical.jsonl"
    local_embedding_path = tmp_path / "local_embeddings.jsonl"
    titan_embedding_path = tmp_path / "titan_embeddings.jsonl"
    _write_records(
        data_path,
        [
            {
                "documentId": "diabetes-doc",
                "questionId": "diabetes-treatment",
                "source": "NIDDK",
                "sourceUrl": "https://example.com/diabetes",
                "questionFocus": "Type 2 Diabetes",
                "questionType": "treatment",
                "question": "What are treatments for type 2 diabetes?",
                "answer": "Treatment may include nutrition support and physical activity.",
            },
            {
                "documentId": "blood-pressure-doc",
                "questionId": "blood-pressure-info",
                "source": "NHLBI",
                "sourceUrl": "https://example.com/bp",
                "questionFocus": "High Blood Pressure",
                "questionType": "information",
                "question": "What is high blood pressure?",
                "answer": "High blood pressure affects blood vessels.",
            },
        ],
    )
    _write_records(local_embedding_path, [])
    diabetes_embedding = [0.0] * rag_engine.TITAN_DIMS
    diabetes_embedding[0] = 1.0
    blood_pressure_embedding = [0.0] * rag_engine.TITAN_DIMS
    blood_pressure_embedding[1] = 1.0
    _write_records(
        titan_embedding_path,
        [
            {
                "chunkId": "diabetes-doc-diabetes-treatment",
                "embedding": diabetes_embedding,
            },
            {
                "chunkId": "blood-pressure-doc-blood-pressure-info",
                "embedding": blood_pressure_embedding,
            },
        ],
    )
    monkeypatch.setattr(rag_engine, "DATA_PATH", data_path)
    monkeypatch.setattr(rag_engine, "EMBEDDING_CACHE_PATH", local_embedding_path)
    monkeypatch.setattr(rag_engine, "TITAN_EMBEDDING_CACHE_PATH", titan_embedding_path)
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)
    monkeypatch.setattr(
        rag_engine,
        "_titan_embedding",
        lambda question: (diabetes_embedding, 8),
    )

    result, usage = rag_engine.answer_question(
        "What treatments help type 2 diabetes?",
        retrieval_mode=rag_engine.BEDROCK_RETRIEVAL_MODE,
    )

    assert result["retrieval"]["mode"] == "bedrock_semantic"
    assert result["retrieval"]["embeddingModel"] == rag_engine.TITAN_EMBEDDING_MODEL
    assert result["retrieval"]["lexicalModel"] == "bm25"
    assert result["retrieval"]["hits"][0]["documentId"] == "diabetes-doc"
    assert result["retrieval"]["hits"][0]["semanticScore"] > 0
    assert usage["embeddingTokens"] == 8


def test_answer_blocks_unsafe_question_before_retrieval(monkeypatch):
    monkeypatch.setattr(rag_engine, "_KNOWLEDGE_BASE", None)

    result, _usage = rag_engine.answer_question("Should I stop taking insulin?")

    assert result["safety"]["answerMode"] == "blocked"
    assert result["retrieval"]["strategy"] == "blocked_before_retrieval"
