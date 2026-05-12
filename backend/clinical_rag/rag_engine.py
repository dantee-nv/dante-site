from __future__ import annotations

import json
import logging
import math
import os
import re
import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from .safety import assess_question_safety

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional runtime dependency
    OpenAI = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "data" / "medquad_weight_inclusive_subset.jsonl"
DEFAULT_EMBEDDING_CACHE_PATH = BASE_DIR / "data" / "medquad_weight_inclusive_embeddings.jsonl"

DATA_PATH = Path(os.getenv("CLINICAL_RAG_DATA_PATH", str(DEFAULT_DATA_PATH)))
EMBEDDING_CACHE_PATH = Path(
    os.getenv("CLINICAL_RAG_EMBEDDING_CACHE_PATH", str(DEFAULT_EMBEDDING_CACHE_PATH))
)
CHAT_MODEL = os.getenv("CLINICAL_RAG_CHAT_MODEL", "gpt-4.1-nano")
EMBEDDING_MODEL = os.getenv("CLINICAL_RAG_EMBEDDING_MODEL", "local-hash-v1")
USE_LLM = os.getenv("CLINICAL_RAG_USE_LLM", "false").lower() == "true"

TOP_K = max(1, int(os.getenv("CLINICAL_RAG_TOP_K", "5")))
VECTOR_CANDIDATE_K = max(TOP_K, int(os.getenv("CLINICAL_RAG_VECTOR_CANDIDATE_K", "60")))
LEXICAL_CANDIDATE_K = max(TOP_K, int(os.getenv("CLINICAL_RAG_LEXICAL_CANDIDATE_K", "60")))
MIN_SUPPORT_SCORE = float(os.getenv("CLINICAL_RAG_MIN_SUPPORT_SCORE", "0.05"))
MIN_LEXICAL_SUPPORT = float(os.getenv("CLINICAL_RAG_MIN_LEXICAL_SUPPORT", "0.25"))
RRF_K = max(1, int(os.getenv("CLINICAL_RAG_RRF_K", "60")))
HASH_DIMS = max(32, int(os.getenv("CLINICAL_RAG_HASH_DIMS", "128")))

NOT_FOUND_MESSAGE = (
    "I could not find enough support in the approved public medical dataset to answer that. "
    "Please ask a more general metabolic health question or review it with a licensed clinician."
)

INPUT_COST_PER_MILLION = float(os.getenv("MODEL_INPUT_COST_PER_MILLION", "0.10"))
OUTPUT_COST_PER_MILLION = float(os.getenv("MODEL_OUTPUT_COST_PER_MILLION", "0.40"))

TERM_PATTERN = re.compile(r"[a-zA-Z][a-zA-Z0-9+\-]{2,}")
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")
STOP_TERMS = {
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

TOPIC_STOP_TERMS = {
    "risk",
    "risks",
    "factor",
    "factors",
    "general",
    "ways",
    "lower",
    "common",
    "information",
}

QUESTION_TYPE_PATTERNS = (
    ("side effects", re.compile(r"\b(side effect|adverse|risk|risks)\b", re.IGNORECASE)),
    ("treatment", re.compile(r"\b(treat|treatment|manage|management|therapy)\b", re.IGNORECASE)),
    ("diagnosis", re.compile(r"\b(test|diagnos|screen|a1c|blood pressure)\b", re.IGNORECASE)),
    ("symptoms", re.compile(r"\b(symptom|sign)\b", re.IGNORECASE)),
    ("prevention", re.compile(r"\b(prevent|reduce risk|lower risk)\b", re.IGNORECASE)),
    ("information", re.compile(r"\b(what is|explain|overview|information)\b", re.IGNORECASE)),
)

IMPORTANT_PHRASES = (
    "type 2 diabetes",
    "gestational diabetes",
    "blood pressure",
    "high blood pressure",
    "cholesterol",
    "physical activity",
    "metabolic syndrome",
    "blood sugar",
    "prediabetes",
)

CLINICAL_SCOPE_TERMS = {
    "a1c",
    "activity",
    "blood",
    "cholesterol",
    "coronary",
    "diabetes",
    "diabetic",
    "diet",
    "disease",
    "exercise",
    "glucose",
    "health",
    "heart",
    "hypertension",
    "insulin",
    "kidney",
    "medical",
    "medication",
    "metabolic",
    "metformin",
    "nutrition",
    "obesity",
    "overweight",
    "physical",
    "prediabetes",
    "pressure",
    "primary",
    "sugar",
    "stroke",
    "syndrome",
    "weight",
}

_UNINITIALIZED = object()
_CLIENT = _UNINITIALIZED
_KNOWLEDGE_BASE = None


@dataclass(frozen=True)
class ClinicalChunk:
    chunk_id: str
    document_id: str
    source: str
    source_url: str
    question_focus: str
    question_type: str
    question: str
    answer: str
    text: str
    terms: set[str]
    embedding: list[float]


@dataclass(frozen=True)
class RetrievalHit:
    chunk_id: str
    document_id: str
    source: str
    source_url: str
    question_focus: str
    question_type: str
    question: str
    text: str
    score: float
    vector_score: float
    lexical_score: float
    rerank_score: float


@dataclass(frozen=True)
class KnowledgeBase:
    chunks: list[ClinicalChunk]


def _extract_terms(text: str) -> set[str]:
    terms = {term.lower() for term in TERM_PATTERN.findall(text)}
    return {term for term in terms if term not in STOP_TERMS}


def _hash_embedding(text: str) -> list[float]:
    vector = [0.0] * HASH_DIMS
    for term in _extract_terms(text):
        bucket = int(hashlib.sha256(term.encode("utf-8")).hexdigest(), 16) % HASH_DIMS
        vector[bucket] += 1.0

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def _cosine(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    return sum(a * b for a, b in zip(left, right))


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        logger.warning("clinical_rag_data_missing path=%s", path)
        return []

    records = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            normalized = line.strip()
            if not normalized:
                continue
            try:
                records.append(json.loads(normalized))
            except json.JSONDecodeError:
                logger.warning("clinical_rag_data_invalid_json line=%s path=%s", line_number, path)
    return records


def _record_to_text(record: dict) -> str:
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


def _chunk_id_for_record(record: dict, index: int) -> str:
    document_id = str(record.get("documentId") or f"medquad-{index}")
    return f"{document_id}-{record.get('questionId') or index}"


def _load_embedding_cache(path: Path) -> dict[str, list[float]]:
    cache: dict[str, list[float]] = {}
    for item in _load_jsonl(path):
        chunk_id = str(item.get("chunkId") or "")
        embedding = item.get("embedding")
        if not chunk_id or not isinstance(embedding, list):
            continue
        numeric_embedding = [
            float(value)
            for value in embedding
            if isinstance(value, int | float)
        ]
        if len(numeric_embedding) == HASH_DIMS:
            cache[chunk_id] = numeric_embedding
    return cache


def load_knowledge_base() -> KnowledgeBase:
    global _KNOWLEDGE_BASE
    if _KNOWLEDGE_BASE is not None:
        return _KNOWLEDGE_BASE

    chunks: list[ClinicalChunk] = []
    embedding_cache = _load_embedding_cache(EMBEDDING_CACHE_PATH)
    for index, record in enumerate(_load_jsonl(DATA_PATH), start=1):
        answer = str(record.get("answer", "")).strip()
        question = str(record.get("question", "")).strip()
        if not answer or not question:
            continue

        document_id = str(record.get("documentId") or f"medquad-{index}")
        chunk_id = _chunk_id_for_record(record, index)
        text = _record_to_text(record)
        embedding = embedding_cache.get(chunk_id) or _hash_embedding(text)
        chunks.append(
            ClinicalChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                source=str(record.get("source") or "MedQuAD"),
                source_url=str(record.get("sourceUrl") or ""),
                question_focus=str(record.get("questionFocus") or ""),
                question_type=str(record.get("questionType") or "").lower(),
                question=question,
                answer=answer,
                text=text,
                terms=_extract_terms(text),
                embedding=embedding,
            )
        )

    logger.info(
        "clinical_rag_knowledge_base_loaded chunks=%s cached_embeddings=%s",
        len(chunks),
        len(embedding_cache),
    )
    _KNOWLEDGE_BASE = KnowledgeBase(chunks=chunks)
    return _KNOWLEDGE_BASE


def _lexical_retrieval(question: str, chunks: Sequence[ClinicalChunk], k: int) -> list[RetrievalHit]:
    terms = _extract_terms(question)
    if not terms:
        return []

    scored = []
    for chunk in chunks:
        overlap = len(terms & chunk.terms)
        if overlap == 0:
            continue
        score = overlap / max(1, len(terms))
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [_hit_from_chunk(chunk, lexical_score=score) for score, chunk in scored[:k]]


def _vector_retrieval(question: str, chunks: Sequence[ClinicalChunk], k: int) -> list[RetrievalHit]:
    query_embedding = _hash_embedding(question)
    scored = [
        (_cosine(query_embedding, chunk.embedding), chunk)
        for chunk in chunks
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    return [_hit_from_chunk(chunk, vector_score=score) for score, chunk in scored[:k] if score > 0]


def _hit_from_chunk(
    chunk: ClinicalChunk,
    *,
    score: float = 0.0,
    vector_score: float = 0.0,
    lexical_score: float = 0.0,
    rerank_score: float = 0.0,
) -> RetrievalHit:
    return RetrievalHit(
        chunk_id=chunk.chunk_id,
        document_id=chunk.document_id,
        source=chunk.source,
        source_url=chunk.source_url,
        question_focus=chunk.question_focus,
        question_type=chunk.question_type,
        question=chunk.question,
        text=chunk.answer,
        score=score,
        vector_score=vector_score,
        lexical_score=lexical_score,
        rerank_score=rerank_score,
    )


def _rrf_fuse(vector_hits: Sequence[RetrievalHit], lexical_hits: Sequence[RetrievalHit]) -> list[RetrievalHit]:
    scores: dict[str, float] = {}
    best: dict[str, RetrievalHit] = {}

    for rank, hit in enumerate(vector_hits, start=1):
        scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + (1.0 / (RRF_K + rank))
        best[hit.chunk_id] = hit

    for rank, hit in enumerate(lexical_hits, start=1):
        scores[hit.chunk_id] = scores.get(hit.chunk_id, 0.0) + (0.9 / (RRF_K + rank))
        existing = best.get(hit.chunk_id)
        if existing:
            best[hit.chunk_id] = RetrievalHit(
                **{
                    **existing.__dict__,
                    "lexical_score": max(existing.lexical_score, hit.lexical_score),
                }
            )
        else:
            best[hit.chunk_id] = hit

    fused = []
    for chunk_id, score in scores.items():
        hit = best[chunk_id]
        fused.append(RetrievalHit(**{**hit.__dict__, "score": score}))

    fused.sort(key=lambda hit: hit.score, reverse=True)
    return fused


def _classify_question_type(question: str) -> str:
    for label, pattern in QUESTION_TYPE_PATTERNS:
        if pattern.search(question):
            return label
    return ""


def _normalized_phrase_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def _rerank(question: str, hits: Sequence[RetrievalHit], k: int) -> list[RetrievalHit]:
    terms = _extract_terms(question)
    desired_question_type = _classify_question_type(question)
    normalized_question = _normalized_phrase_text(question)
    requested_phrases = [phrase for phrase in IMPORTANT_PHRASES if phrase in normalized_question]
    reranked = []

    for hit in hits:
        focus_terms = _extract_terms(hit.question_focus)
        question_type_bonus = 0.08 if desired_question_type and desired_question_type in hit.question_type else 0.0
        topic_terms = terms - TOPIC_STOP_TERMS
        topic_overlap = len(topic_terms & focus_terms)
        topic_bonus = min(0.3, topic_overlap * 0.15)
        observed_terms = _extract_terms(f"{hit.question_focus} {hit.question} {hit.text}")
        observed_text = _normalized_phrase_text(f"{hit.question_focus} {hit.question} {hit.text}")
        exact_phrase_bonus = min(0.28, 0.14 * sum(1 for phrase in requested_phrases if phrase in observed_text))
        prevention_phrase_bonus = (
            0.12
            if desired_question_type == "prevention"
            and re.search(r"\b(prevent|prevention|delay|lower your risk|reduce.*risk)\b", observed_text)
            else 0.0
        )
        broad_diabetes_penalty = (
            0.12
            if "type 2 diabetes" in normalized_question
            and "diabetes problems" in _normalized_phrase_text(hit.question_focus)
            and "type 2 diabetes" not in _normalized_phrase_text(f"{hit.question_focus} {hit.question}")
            else 0.0
        )
        observed_lexical_score = max(
            hit.lexical_score,
            len(terms & observed_terms) / max(1, len(terms)),
        )
        support_bonus = min(0.18, observed_lexical_score * 0.18)
        rerank_score = (
            hit.score
            + topic_bonus
            + question_type_bonus
            + support_bonus
            + exact_phrase_bonus
            + prevention_phrase_bonus
            - broad_diabetes_penalty
        )
        reranked.append(
            RetrievalHit(
                **{
                    **hit.__dict__,
                    "lexical_score": observed_lexical_score,
                    "rerank_score": rerank_score,
                }
            )
        )

    reranked.sort(key=lambda hit: hit.rerank_score, reverse=True)
    return reranked[:k]


def retrieve(question: str, *, top_k: int = TOP_K) -> list[RetrievalHit]:
    knowledge = load_knowledge_base()
    vector_hits = _vector_retrieval(question, knowledge.chunks, VECTOR_CANDIDATE_K)
    lexical_hits = _lexical_retrieval(question, knowledge.chunks, LEXICAL_CANDIDATE_K)
    fused_hits = _rrf_fuse(vector_hits, lexical_hits)
    return _rerank(question, fused_hits, top_k)


def _clip_answer(text: str, max_words: int = 90, max_sentences: int = 2) -> str:
    normalized = " ".join(text.split())
    sentences = SENTENCE_SPLIT_PATTERN.split(normalized)
    clipped = " ".join(sentences[:max_sentences]).strip()
    words = clipped.split()
    if len(words) <= max_words:
        return clipped
    return " ".join(words[:max_words]).rstrip(" ,;:") + "..."


def _compose_grounded_answer(hits: Sequence[RetrievalHit]) -> str:
    sections = []
    seen_documents = set()

    for hit in hits[:4]:
        if hit.document_id in seen_documents and len(sections) >= 2:
            continue
        clipped = _clip_answer(hit.text, max_words=70, max_sentences=2)
        if not clipped:
            continue
        seen_documents.add(hit.document_id)
        sections.append(f"{clipped} [{len(sections) + 1}]")
        if len(sections) == 3:
            break

    if not sections:
        return ""

    answer = " ".join(sections)
    return (
        f"{answer} This is general education from public sources, so decisions about diagnosis, "
        "medications, or an individualized care plan should be made with a licensed clinician."
    )


def _get_client():
    global _CLIENT
    if _CLIENT is not _UNINITIALIZED:
        return _CLIENT

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or OpenAI is None:
        _CLIENT = None
    else:
        _CLIENT = OpenAI(api_key=api_key)
    return _CLIENT


def _usage(prompt_tokens: int = 0, completion_tokens: int = 0) -> dict:
    total_tokens = prompt_tokens + completion_tokens
    cost = (
        (prompt_tokens / 1_000_000) * INPUT_COST_PER_MILLION
        + (completion_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION
    )
    return {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
        "estimatedCostUsd": round(cost, 8),
    }


def _generate_answer(question: str, hits: Sequence[RetrievalHit]) -> tuple[str, dict]:
    if not hits:
        return NOT_FOUND_MESSAGE, _usage()

    best_hit = hits[0]
    if best_hit.rerank_score < MIN_SUPPORT_SCORE or best_hit.lexical_score < MIN_LEXICAL_SUPPORT:
        return NOT_FOUND_MESSAGE, _usage()

    client = _get_client()
    if USE_LLM and client is not None:
        context = "\n\n".join(
            f"[{index + 1}] {hit.text}\nSource: {hit.source}; Focus: {hit.question_focus}"
            for index, hit in enumerate(hits[:3])
        )
        instructions = (
            "You are a clinical information assistant with no-stigma language constraints. Use only the supplied "
            "public medical source context. Do not provide patient-specific diagnosis, dosing, "
            "or medication start/stop advice. Avoid blame, shame, and BMI-only conclusions. "
            "Answer in three concise, source-grounded sentences."
        )
        prompt = (
            f"Context:\n{context}\n\nQuestion: {question}\n"
            "Answer with general information only and include no uncited claims."
        )
        response = client.responses.create(
            model=CHAT_MODEL,
            instructions=instructions,
            input=prompt,
            temperature=0.1,
            max_output_tokens=150,
        )
        answer = _clip_answer(getattr(response, "output_text", "") or "", max_words=170, max_sentences=4)
        usage = getattr(response, "usage", None)
        return answer or _clip_answer(best_hit.text), _usage(
            int(getattr(usage, "input_tokens", 0) or 0),
            int(getattr(usage, "output_tokens", 0) or 0),
        )

    answer = _compose_grounded_answer(hits)
    return answer or NOT_FOUND_MESSAGE, _usage()


def _is_in_clinical_scope(question: str) -> bool:
    terms = _extract_terms(question)
    normalized_question = _normalized_phrase_text(question)
    return bool(terms & CLINICAL_SCOPE_TERMS) or any(
        phrase in normalized_question for phrase in IMPORTANT_PHRASES
    )


def _archive_url(source_url: str) -> str:
    normalized = source_url.strip()
    if not normalized:
        return ""
    return f"https://web.archive.org/web/*/{normalized}"


def _citation_from_hit(hit: RetrievalHit, index: int) -> dict:
    archive_url = _archive_url(hit.source_url)
    return {
        "index": index,
        "documentId": hit.document_id,
        "chunkId": hit.chunk_id,
        "source": hit.source,
        "sourceUrl": hit.source_url,
        "citationUrl": archive_url or hit.source_url,
        "archiveUrl": archive_url,
        "questionFocus": hit.question_focus,
        "questionType": hit.question_type,
    }


def _serialize_hit(hit: RetrievalHit) -> dict:
    return {
        "chunkId": hit.chunk_id,
        "documentId": hit.document_id,
        "source": hit.source,
        "questionFocus": hit.question_focus,
        "questionType": hit.question_type,
        "score": round(hit.score, 6),
        "vectorScore": round(hit.vector_score, 6),
        "lexicalScore": round(hit.lexical_score, 6),
        "rerankScore": round(hit.rerank_score, 6),
    }


def answer_question(question: str) -> tuple[dict, dict]:
    safety_decision = assess_question_safety(question)
    if safety_decision.blocked:
        return {
            "answer": safety_decision.message,
            "citations": [],
            "retrieval": {
                "strategy": "blocked_before_retrieval",
                "topK": TOP_K,
                "vectorCandidateK": VECTOR_CANDIDATE_K,
                "lexicalCandidateK": LEXICAL_CANDIDATE_K,
                "hits": [],
            },
            "safety": {
                "answerMode": safety_decision.answer_mode,
                "validationPassed": True,
                "blockedReason": safety_decision.blocked_reason,
            },
        }, _usage()

    hits = retrieve(question) if _is_in_clinical_scope(question) else []
    answer, usage = _generate_answer(question, hits)
    answer_mode = "not_found" if answer == NOT_FOUND_MESSAGE else "grounded"
    citations = [] if answer_mode == "not_found" else [
        _citation_from_hit(hit, index + 1) for index, hit in enumerate(hits[:3])
    ]

    if answer_mode == "grounded" and not citations:
        answer = NOT_FOUND_MESSAGE
        answer_mode = "not_found"

    return {
        "answer": answer,
        "citations": citations,
        "retrieval": {
            "strategy": "local_hash_vector_plus_lexical_rrf_rerank",
            "embeddingModel": EMBEDDING_MODEL,
            "topK": TOP_K,
            "vectorCandidateK": VECTOR_CANDIDATE_K,
            "lexicalCandidateK": LEXICAL_CANDIDATE_K,
            "hits": [_serialize_hit(hit) for hit in hits],
        },
        "safety": {
            "answerMode": answer_mode,
            "validationPassed": True,
            "blockedReason": "",
        },
    }, usage
