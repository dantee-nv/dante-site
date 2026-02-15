from paper_search.cache import build_embedding_text, compute_content_hash


def test_compute_content_hash_changes_with_content():
    first = compute_content_hash("Title", "Abstract")
    second = compute_content_hash("Title", "Abstract updated")

    assert first != second


def test_build_embedding_text_prefers_title_and_abstract():
    text = build_embedding_text("Paper title", "Paper abstract")
    assert text == "Paper title\n\nPaper abstract"


def test_build_embedding_text_handles_missing_abstract():
    text = build_embedding_text("Paper title", "")
    assert text == "Paper title"
