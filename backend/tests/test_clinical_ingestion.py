from clinical_rag.ingestion import (
    curate_records,
    normalize_medquad_row,
    record_matches_metabolic_scope,
    source_allowed,
)


def test_normalize_medquad_row_maps_expected_fields():
    record = normalize_medquad_row(
        {
            "document_id": "doc-1",
            "document_source": "NIDDK",
            "document_url": "https://example.com",
            "question_id": "q-1",
            "question_focus": "Type 2 Diabetes",
            "question_type": "Treatment",
            "question": " What are treatments? ",
            "answer": " Healthy eating, activity, and medicines may help. ",
        }
    )

    assert record["documentId"] == "doc-1"
    assert record["source"] == "NIDDK"
    assert record["questionType"] == "treatment"
    assert record["question"] == "What are treatments?"


def test_metabolic_scope_filter_prefers_metabolic_topics():
    assert record_matches_metabolic_scope(
        {
            "questionFocus": "Overweight and Obesity",
            "questionType": "information",
            "question": "What is obesity?",
            "answer": "General information.",
            "synonyms": "",
            "category": "",
        }
    )
    assert not record_matches_metabolic_scope(
        {
            "questionFocus": "Common Cold",
            "questionType": "information",
            "question": "What is a cold?",
            "answer": "A diet sentence alone should not pull this into scope.",
            "synonyms": "",
            "category": "",
        }
    )


def test_curate_records_filters_sources_and_builds_eval_set():
    rows = [
        {
            "document_id": "doc-1",
            "document_source": "NIDDK",
            "question_id": "q-1",
            "question_focus": "Diabetes",
            "question_type": "information",
            "question": "What is diabetes?",
            "answer": "Diabetes affects blood glucose.",
        },
        {
            "document_id": "doc-2",
            "document_source": "GHR",
            "question_id": "q-2",
            "question_focus": "Diabetes mellitus type 1",
            "question_type": "information",
            "question": "What is type 1 diabetes?",
            "answer": "A genetic reference row.",
        },
    ]

    corpus, eval_records = curate_records(rows, corpus_limit=5, eval_limit=5)

    assert source_allowed("NIDDK")
    assert not source_allowed("GHR")
    assert len(corpus) == 1
    assert corpus[0]["documentId"] == "doc-1"
    assert eval_records[0]["expectedDocumentId"] == "doc-1"
