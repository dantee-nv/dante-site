import math
from typing import Sequence


def _dot(left: Sequence[float], right: Sequence[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def _l2_norm(vector: Sequence[float]) -> float:
    return math.sqrt(sum(value * value for value in vector))


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    denominator = _l2_norm(left) * _l2_norm(right)
    if denominator == 0:
        return 0.0

    return _dot(left, right) / denominator
