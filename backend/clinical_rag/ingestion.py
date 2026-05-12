from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import shutil
import ssl
import tempfile
import urllib.parse
import urllib.request
from collections import OrderedDict
from pathlib import Path
from typing import Iterable, Iterator

MEDQUAD_PARQUET_URL = (
    "https://huggingface.co/datasets/lavita/MedQuAD/resolve/main/"
    "data/train-00000-of-00001-e36383d177026d53.parquet"
)

PRIMARY_SCOPE_TERMS = (
    "diabetes",
    "prediabetes",
    "obesity",
    "obese",
    "overweight",
    "metabolic",
    "hypertension",
    "blood pressure",
    "cholesterol",
    "triglycerides",
    "glucose",
    "insulin",
    "a1c",
    "heart disease",
    "stroke",
)

SECONDARY_SCOPE_TERMS = (
    "nutrition",
    "diet",
    "eating",
    "physical activity",
    "exercise",
    "binge eating",
    "medication",
    "side effect",
    "weight management",
    "weight loss",
)

ALLOWED_SOURCES = ("NIDDK", "MPlus_Health_Topics", "MPlusHealthTopics", "NHLBI", "NIHSeniorHealth", "CDC")
PREFERRED_SOURCES = ("NIDDK", "MPlus_Health_Topics", "MPlusHealthTopics", "NHLBI", "NIHSeniorHealth", "CDC")
DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_CORPUS_PATH = DEFAULT_DATA_DIR / "medquad_weight_inclusive_subset.jsonl"
DEFAULT_EVAL_PATH = DEFAULT_DATA_DIR / "medquad_weight_inclusive_eval.jsonl"
DEFAULT_EMBEDDING_CACHE_PATH = DEFAULT_DATA_DIR / "medquad_weight_inclusive_embeddings.jsonl"
HASH_DIMS = 128

_SPACE_PATTERN = re.compile(r"\s+")
_TERM_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9+\-]{2,}")
_STOP_TERMS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "what",
    "when",
    "where",
    "which",
    "who",
    "how",
    "are",
    "was",
    "were",
    "can",
    "does",
    "about",
    "exact",
    "into",
    "policy",
    "your",
    "their",
    "should",
    "have",
    "has",
    "will",
}


def normalize_text(value: object) -> str:
    return _SPACE_PATTERN.sub(" ", str(value or "")).strip()


def normalize_medquad_row(row: dict) -> dict | None:
    question = normalize_text(row.get("question"))
    answer = normalize_text(row.get("answer"))
    if not question or not answer:
        return None

    document_id = normalize_text(row.get("document_id"))
    question_id = normalize_text(row.get("question_id")) or document_id
    source = normalize_text(row.get("document_source")) or "MedQuAD"

    return {
        "documentId": document_id,
        "questionId": question_id,
        "source": source,
        "sourceUrl": normalize_text(row.get("document_url")),
        "category": normalize_text(row.get("category")),
        "umlsCui": normalize_text(row.get("umls_cui")),
        "umlsSemanticTypes": normalize_text(row.get("umls_semantic_types")),
        "synonyms": normalize_text(row.get("synonyms")),
        "questionFocus": normalize_text(row.get("question_focus")),
        "questionType": normalize_text(row.get("question_type")).lower(),
        "question": question,
        "answer": answer,
    }


def record_matches_metabolic_scope(record: dict) -> bool:
    broad_haystack = " ".join(
        [
            record.get("questionFocus", ""),
            record.get("questionType", ""),
            record.get("question", ""),
            record.get("answer", ""),
            record.get("synonyms", ""),
            record.get("category", ""),
        ]
    ).lower()
    narrow_haystack = " ".join(
        [
            record.get("questionFocus", ""),
            record.get("questionType", ""),
            record.get("question", ""),
            record.get("synonyms", ""),
            record.get("category", ""),
        ]
    ).lower()
    narrow_primary_match = any(term in narrow_haystack for term in PRIMARY_SCOPE_TERMS)
    narrow_secondary_match = any(term in narrow_haystack for term in SECONDARY_SCOPE_TERMS)
    broad_primary_hits = sum(1 for term in PRIMARY_SCOPE_TERMS if term in broad_haystack)
    return narrow_primary_match or narrow_secondary_match or broad_primary_hits >= 2


def relevance_score(record: dict) -> int:
    narrow_haystack = " ".join(
        [
            record.get("questionFocus", ""),
            record.get("questionType", ""),
            record.get("question", ""),
            record.get("synonyms", ""),
            record.get("category", ""),
        ]
    ).lower()
    broad_haystack = f"{narrow_haystack} {record.get('answer', '')}".lower()
    primary_narrow = sum(1 for term in PRIMARY_SCOPE_TERMS if term in narrow_haystack)
    secondary_narrow = sum(1 for term in SECONDARY_SCOPE_TERMS if term in narrow_haystack)
    primary_broad = sum(1 for term in PRIMARY_SCOPE_TERMS if term in broad_haystack)
    return primary_narrow * 8 + secondary_narrow * 5 + primary_broad


def source_priority(source: str) -> int:
    normalized = source.lower().replace("-", "_")
    for index, preferred in enumerate(PREFERRED_SOURCES):
        if preferred.lower().replace("-", "_") in normalized:
            return index
    return len(PREFERRED_SOURCES)


def source_allowed(source: str) -> bool:
    normalized = source.lower().replace("-", "_")
    return any(allowed.lower().replace("-", "_") in normalized for allowed in ALLOWED_SOURCES)


def curate_records(
    rows: Iterable[dict],
    *,
    corpus_limit: int = 420,
    eval_limit: int = 80,
) -> tuple[list[dict], list[dict]]:
    records = [
        record
        for row in rows
        if (record := normalize_medquad_row(row))
        and source_allowed(record["source"])
        and record_matches_metabolic_scope(record)
    ]

    records.sort(
        key=lambda item: (
            -relevance_score(item),
            source_priority(item["source"]),
            item["questionFocus"].lower(),
            item["questionType"].lower(),
            item["questionId"],
        )
    )

    seen_questions: set[str] = set()
    deduped: list[dict] = []
    for record in records:
        question_key = record["question"].lower()
        if question_key in seen_questions:
            continue
        seen_questions.add(question_key)
        deduped.append(record)

    corpus = deduped[:corpus_limit]
    grouped: OrderedDict[str, list[dict]] = OrderedDict()
    for record in corpus:
        grouped.setdefault(record["documentId"], []).append(record)

    eval_records = []
    for group in grouped.values():
        eval_record = group[0]
        eval_records.append(
            {
                "questionId": eval_record["questionId"],
                "question": eval_record["question"],
                "expectedDocumentId": eval_record["documentId"],
                "expectedQuestionType": eval_record["questionType"],
                "expectedFocus": eval_record["questionFocus"],
                "source": eval_record["source"],
            }
        )
        if len(eval_records) >= eval_limit:
            break

    return corpus, eval_records


def load_parquet_rows(parquet_path_or_url: str) -> Iterator[dict]:
    try:
        import pandas as pd
    except ImportError as error:  # pragma: no cover - exercised by environment
        raise RuntimeError("pandas and pyarrow are required to read MedQuAD parquet data.") from error

    downloaded_path = None
    parquet_path = parquet_path_or_url
    if _is_url(parquet_path_or_url):
        downloaded_path = _download_to_tempfile(parquet_path_or_url)
        parquet_path = str(downloaded_path)

    try:
        frame = pd.read_parquet(parquet_path)
        for row in frame.to_dict(orient="records"):
            yield row
    finally:
        if downloaded_path is not None:
            downloaded_path.unlink(missing_ok=True)


def write_jsonl(path: Path, records: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True, sort_keys=True))
            handle.write("\n")


def record_to_retrieval_text(record: dict) -> str:
    return "\n".join(
        part
        for part in [
            f"Focus: {record.get('questionFocus', '')}",
            f"Question type: {record.get('questionType', '')}",
            f"Source question: {record.get('question', '')}",
            f"Source answer: {record.get('answer', '')}",
        ]
        if part.strip()
    )


def extract_terms(text: str) -> set[str]:
    terms = {term.lower() for term in _TERM_PATTERN.findall(text)}
    return {term for term in terms if term not in _STOP_TERMS}


def hash_embedding(text: str) -> list[float]:
    vector = [0.0] * HASH_DIMS
    for term in extract_terms(text):
        bucket = int(hashlib.sha256(term.encode("utf-8")).hexdigest(), 16) % HASH_DIMS
        vector[bucket] += 1.0

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [round(value / norm, 8) for value in vector]


def build_embedding_cache(records: Iterable[dict]) -> list[dict]:
    cache = []
    for index, record in enumerate(records, start=1):
        document_id = record.get("documentId") or f"medquad-{index}"
        chunk_id = f"{document_id}-{record.get('questionId') or index}"
        text = record_to_retrieval_text(record)
        cache.append(
            {
                "chunkId": chunk_id,
                "documentId": document_id,
                "questionId": record.get("questionId") or "",
                "embeddingModel": "local-hash-v1",
                "dimensions": HASH_DIMS,
                "embedding": hash_embedding(text),
            }
        )
    return cache


def _is_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"}


def _download_to_tempfile(url: str) -> Path:
    try:
        import certifi

        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:  # pragma: no cover
        context = ssl.create_default_context()

    request = urllib.request.Request(url, headers={"User-Agent": "clinical-rag-ingestion/1.0"})
    temp = tempfile.NamedTemporaryFile(delete=False, suffix=".parquet")
    temp_path = Path(temp.name)
    try:
        with temp:
            with urllib.request.urlopen(request, context=context, timeout=45) as response:
                shutil.copyfileobj(response, temp)
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise
    return temp_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare the clinical RAG MedQuAD subset.")
    parser.add_argument("--input", default=MEDQUAD_PARQUET_URL, help="MedQuAD parquet path or URL.")
    parser.add_argument("--corpus-output", default=str(DEFAULT_CORPUS_PATH))
    parser.add_argument("--eval-output", default=str(DEFAULT_EVAL_PATH))
    parser.add_argument("--embedding-cache-output", default=str(DEFAULT_EMBEDDING_CACHE_PATH))
    parser.add_argument("--corpus-limit", type=int, default=420)
    parser.add_argument("--eval-limit", type=int, default=80)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    corpus, eval_records = curate_records(
        load_parquet_rows(args.input),
        corpus_limit=args.corpus_limit,
        eval_limit=args.eval_limit,
    )
    write_jsonl(Path(args.corpus_output), corpus)
    write_jsonl(Path(args.eval_output), eval_records)
    embedding_cache = build_embedding_cache(corpus)
    write_jsonl(Path(args.embedding_cache_output), embedding_cache)
    print(
        json.dumps(
            {
                "corpusRecords": len(corpus),
                "evalRecords": len(eval_records),
                "embeddingCacheRecords": len(embedding_cache),
                "corpusOutput": args.corpus_output,
                "evalOutput": args.eval_output,
                "embeddingCacheOutput": args.embedding_cache_output,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
