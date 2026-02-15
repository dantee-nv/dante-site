from paper_search.similarity import cosine_similarity


def test_cosine_similarity_identical_vectors():
    assert cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == 1.0


def test_cosine_similarity_orthogonal_vectors():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0


def test_cosine_similarity_handles_mismatched_lengths():
    assert cosine_similarity([1.0], [1.0, 2.0]) == 0.0
