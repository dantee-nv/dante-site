import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Set, Tuple

try:
    import faiss  # type: ignore
except ImportError:
    faiss = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    RecursiveCharacterTextSplitter = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4.1-nano")

# Retrieval defaults are tuned for smaller, policy-style documents and lightweight models.
TOP_K = int(os.getenv("TOP_K", "6"))
MAX_CONTEXT_CHUNKS = max(1, int(os.getenv("MAX_CONTEXT_CHUNKS", str(TOP_K))))
VECTOR_CANDIDATE_K = max(TOP_K, int(os.getenv("VECTOR_CANDIDATE_K", str(max(TOP_K * 2, 10)))))
LEXICAL_CANDIDATE_K = max(
    TOP_K, int(os.getenv("LEXICAL_CANDIDATE_K", str(max(TOP_K * 2, 10))))
)
MIN_SIMILARITY = float(os.getenv("MIN_SIMILARITY", "0.18"))
RRF_K = max(1, int(os.getenv("RRF_K", "60")))

# Chunking defaults are tighter to reduce context dilution for small/cheap models.
CHUNK_SIZE = max(150, int(os.getenv("CHUNK_SIZE", "500")))
CHUNK_OVERLAP = max(0, int(os.getenv("CHUNK_OVERLAP", "100")))

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_POLICY_PDF_PATH = BASE_DIR / "data" / "nestle_hr_policy.pdf"
DEFAULT_POLICY_TEXT_PATH = BASE_DIR / "data" / "nestle_hr_policy.txt"
POLICY_PDF_PATH = Path(os.getenv("POLICY_PDF_PATH", str(DEFAULT_POLICY_PDF_PATH)))
POLICY_TEXT_PATH = Path(os.getenv("POLICY_TEXT_PATH", str(DEFAULT_POLICY_TEXT_PATH)))

NOT_FOUND_MESSAGE = (
    "I could not find that information in the approved HR policy. "
    "Please check the policy document or contact HR for clarification."
)

TERM_PATTERN = re.compile(r"[a-zA-Z]{3,}")
PAGE_PREFIX_PATTERN = re.compile(r"^\[Page\s+\d+\]\s*", re.IGNORECASE)
PAGE_CITATION_PATTERN = re.compile(r"\(Page(?:s)?\s+\d", re.IGNORECASE)
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
    "into",
    "your",
    "their",
    "should",
}

_UNINITIALIZED = object()
_CLIENT = _UNINITIALIZED
_KNOWLEDGE_BASE = None


@dataclass
class PolicyChunk:
    chunk_id: str
    text: str
    page_number: Optional[int]
    lexical_terms: Set[str]


@dataclass
class KnowledgeBase:
    chunks: List[PolicyChunk]
    embeddings: List[List[float]]
    index: Optional[object]


@dataclass
class RetrievalHit:
    chunk_id: str
    text: str
    page_number: Optional[int]
    score: float


def _get_client():
    global _CLIENT

    if _CLIENT is not _UNINITIALIZED:
        return _CLIENT

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or OpenAI is None:
        _CLIENT = None
        return _CLIENT

    _CLIENT = OpenAI(api_key=api_key)
    return _CLIENT


def _extract_terms(text: str) -> Set[str]:
    terms = {term.lower() for term in TERM_PATTERN.findall(text)}
    return {term for term in terms if term not in STOP_TERMS}


def _read_pdf_documents() -> List[Tuple[int, str]]:
    if not POLICY_PDF_PATH.exists():
        return []

    if PdfReader is None:
        logger.warning("policy_pdf_unavailable_reader_missing path=%s", POLICY_PDF_PATH)
        return []

    reader = PdfReader(str(POLICY_PDF_PATH))
    documents: List[Tuple[int, str]] = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = (page.extract_text() or "").strip()
        if not page_text:
            logger.warning("policy_pdf_page_empty page=%s path=%s", page_number, POLICY_PDF_PATH)
            continue
        documents.append((page_number, page_text))

    if not documents:
        logger.warning("policy_pdf_no_extractable_text path=%s", POLICY_PDF_PATH)
    return documents


def _read_policy_documents() -> List[Tuple[Optional[int], str]]:
    pdf_documents = _read_pdf_documents()
    if pdf_documents:
        return [(page_number, text) for page_number, text in pdf_documents]

    if POLICY_TEXT_PATH.exists():
        text = POLICY_TEXT_PATH.read_text(encoding="utf-8").strip()
        if text:
            return [(None, text)]

    return [
        (
            None,
            "Nestle HR Policy excerpt: Employees should consult approved HR documentation "
            "for leave, conduct, and benefits information. If no policy entry is found, "
            "the assistant must say the information is not available in the approved policy.",
        )
    ]


def _fallback_chunk_text(text: str) -> List[str]:
    paragraphs = [part.strip() for part in text.split("\n\n") if part.strip()]
    if not paragraphs:
        return [text.strip()]

    chunks: List[str] = []
    buffer = ""
    chunk_step = max(1, CHUNK_SIZE - CHUNK_OVERLAP)

    def flush_oversized_paragraph(paragraph: str):
        start = 0
        while start < len(paragraph):
            part = paragraph[start : start + CHUNK_SIZE].strip()
            if part:
                chunks.append(part)
            if start + CHUNK_SIZE >= len(paragraph):
                break
            start += chunk_step

    for paragraph in paragraphs:
        candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        if len(candidate) <= CHUNK_SIZE:
            buffer = candidate
            continue

        if buffer:
            chunks.append(buffer)

        if len(paragraph) <= CHUNK_SIZE:
            buffer = paragraph
            continue

        flush_oversized_paragraph(paragraph)
        buffer = ""

    if buffer:
        chunks.append(buffer)

    return chunks


def _chunk_single_text(text: str) -> List[str]:
    if RecursiveCharacterTextSplitter is None:
        return _fallback_chunk_text(text)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = [part.strip() for part in splitter.split_text(text) if part.strip()]
    return chunks or _fallback_chunk_text(text)


def _build_policy_chunks(documents: Sequence[Tuple[Optional[int], str]]) -> List[PolicyChunk]:
    chunks: List[PolicyChunk] = []

    for page_number, document_text in documents:
        parts = _chunk_single_text(document_text)
        for chunk_position, part in enumerate(parts, start=1):
            if page_number is not None:
                normalized_text = f"[Page {page_number}] {part}"
                chunk_id = f"page-{page_number}-chunk-{chunk_position}"
            else:
                normalized_text = part
                chunk_id = f"text-chunk-{chunk_position}"

            chunks.append(
                PolicyChunk(
                    chunk_id=chunk_id,
                    text=normalized_text,
                    page_number=page_number,
                    lexical_terms=_extract_terms(part),
                )
            )

    return chunks


def _embed_texts(texts: Sequence[str]) -> List[List[float]]:
    client = _get_client()
    if client is None:
        return []

    vectors: List[List[float]] = []
    batch_size = 96
    for idx in range(0, len(texts), batch_size):
        batch = list(texts[idx : idx + batch_size])
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        vectors.extend(item.embedding for item in response.data)

    return vectors


def _build_index(embeddings: Sequence[Sequence[float]]):
    if not embeddings or faiss is None or np is None:
        return None

    matrix = np.asarray(embeddings, dtype="float32")
    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    return index


def load_knowledge_base() -> KnowledgeBase:
    global _KNOWLEDGE_BASE

    if _KNOWLEDGE_BASE is not None:
        return _KNOWLEDGE_BASE

    documents = _read_policy_documents()
    chunks = _build_policy_chunks(documents)
    embeddings = _embed_texts([chunk.text for chunk in chunks])
    index = _build_index(embeddings)

    _KNOWLEDGE_BASE = KnowledgeBase(chunks=chunks, embeddings=embeddings, index=index)
    return _KNOWLEDGE_BASE


def _lexical_retrieval(question: str, chunks: Sequence[PolicyChunk], k: int) -> List[RetrievalHit]:
    terms = _extract_terms(question)
    if not terms:
        return []

    scored: List[Tuple[float, PolicyChunk]] = []
    term_count = max(1, len(terms))
    for chunk in chunks:
        overlap = len(terms & chunk.lexical_terms)
        if overlap == 0:
            continue

        score = overlap / term_count
        scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        RetrievalHit(
            chunk_id=chunk.chunk_id,
            text=chunk.text,
            page_number=chunk.page_number,
            score=score,
        )
        for score, chunk in scored[:k]
    ]


def _vector_retrieval(question: str, knowledge: KnowledgeBase, k: int) -> List[RetrievalHit]:
    client = _get_client()
    if client is None or not knowledge.embeddings:
        return []

    question_embedding = client.embeddings.create(model=EMBEDDING_MODEL, input=question).data[0].embedding

    if knowledge.index is not None and faiss is not None and np is not None:
        vector = np.asarray([question_embedding], dtype="float32")
        faiss.normalize_L2(vector)
        scores, indices = knowledge.index.search(vector, k)

        hits: List[RetrievalHit] = []
        for score, index in zip(scores[0], indices[0]):
            if index < 0:
                continue
            chunk = knowledge.chunks[index]
            hits.append(
                RetrievalHit(
                    chunk_id=chunk.chunk_id,
                    text=chunk.text,
                    page_number=chunk.page_number,
                    score=float(score),
                )
            )
        return hits

    hits: List[RetrievalHit] = []
    query_norm = sum(value * value for value in question_embedding) ** 0.5 or 1.0
    for chunk, embedding in zip(knowledge.chunks, knowledge.embeddings):
        dot = sum(q * c for q, c in zip(question_embedding, embedding))
        emb_norm = sum(value * value for value in embedding) ** 0.5 or 1.0
        score = dot / (query_norm * emb_norm)
        hits.append(
            RetrievalHit(
                chunk_id=chunk.chunk_id,
                text=chunk.text,
                page_number=chunk.page_number,
                score=float(score),
            )
        )

    hits.sort(key=lambda item: item.score, reverse=True)
    return hits[:k]


def _rrf_fuse(
    vector_hits: Sequence[RetrievalHit], lexical_hits: Sequence[RetrievalHit], k: int
) -> List[RetrievalHit]:
    fused_scores: Dict[str, float] = {}
    best_hits: Dict[str, RetrievalHit] = {}

    for rank, hit in enumerate(vector_hits, start=1):
        fused_scores[hit.chunk_id] = fused_scores.get(hit.chunk_id, 0.0) + (1.0 / (RRF_K + rank))
        best_hits[hit.chunk_id] = hit

    for rank, hit in enumerate(lexical_hits, start=1):
        fused_scores[hit.chunk_id] = fused_scores.get(hit.chunk_id, 0.0) + (0.85 / (RRF_K + rank))
        if hit.chunk_id not in best_hits:
            best_hits[hit.chunk_id] = hit

    ranked = sorted(fused_scores.items(), key=lambda item: item[1], reverse=True)
    return [
        RetrievalHit(
            chunk_id=chunk_id,
            text=best_hits[chunk_id].text,
            page_number=best_hits[chunk_id].page_number,
            score=score,
        )
        for chunk_id, score in ranked[:k]
    ]


def _hybrid_retrieval(question: str, knowledge: KnowledgeBase, k: int) -> List[RetrievalHit]:
    vector_candidates = _vector_retrieval(question, knowledge, VECTOR_CANDIDATE_K)
    vector_hits = [hit for hit in vector_candidates if hit.score >= MIN_SIMILARITY]

    lexical_hits = _lexical_retrieval(question, knowledge.chunks, LEXICAL_CANDIDATE_K)
    if not vector_hits and not lexical_hits:
        return []

    if not vector_hits:
        return lexical_hits[:k]

    if not lexical_hits:
        return vector_hits[:k]

    return _rrf_fuse(vector_hits, lexical_hits, k)


def _strip_page_prefix(text: str) -> str:
    return PAGE_PREFIX_PATTERN.sub("", text).strip()


def _collect_page_numbers(retrieved_context: Sequence[RetrievalHit]) -> List[int]:
    pages = {hit.page_number for hit in retrieved_context if hit.page_number is not None}
    return sorted(pages)


def _append_page_citation(answer: str, retrieved_context: Sequence[RetrievalHit]) -> str:
    if not answer or answer == NOT_FOUND_MESSAGE:
        return answer

    if PAGE_CITATION_PATTERN.search(answer):
        return answer

    pages = _collect_page_numbers(retrieved_context)
    if not pages:
        return answer

    if len(pages) == 1:
        citation = f"(Page {pages[0]})"
    else:
        citation = f"(Pages {', '.join(str(page) for page in pages[:3])})"

    normalized = answer.strip()
    if normalized.endswith((".", "!", "?")):
        return f"{normalized} {citation}"
    return f"{normalized}. {citation}"


def _clip_to_two_sentences(text: str) -> str:
    normalized = " ".join(text.strip().split())
    if not normalized:
        return ""

    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    return " ".join(sentences[:2]).strip()


def _truncate_words(text: str, max_words: int = 65) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text

    truncated = " ".join(words[:max_words]).rstrip(" ,;:")
    if truncated.endswith((".", "!", "?")):
        return truncated
    return f"{truncated}..."


def _offline_answer(retrieved_context: Sequence[RetrievalHit]) -> str:
    if not retrieved_context:
        return NOT_FOUND_MESSAGE

    best_context = _strip_page_prefix(retrieved_context[0].text)
    answer = _clip_to_two_sentences(best_context)
    answer = _truncate_words(answer, max_words=65)
    answer = answer or NOT_FOUND_MESSAGE
    return _append_page_citation(answer, retrieved_context[:1])


def _generate_answer(question: str, retrieved_context: Sequence[RetrievalHit]):
    client = _get_client()
    if client is None:
        return _offline_answer(retrieved_context), {
            "promptTokens": 0,
            "completionTokens": 0,
            "totalTokens": 0,
        }

    if not retrieved_context:
        return NOT_FOUND_MESSAGE, {
            "promptTokens": 0,
            "completionTokens": 0,
            "totalTokens": 0,
        }

    context_hits = list(retrieved_context[:MAX_CONTEXT_CHUNKS])
    context_block = "\n\n".join(
        f"[{idx + 1}] {hit.text}" for idx, hit in enumerate(context_hits)
    )
    page_numbers = _collect_page_numbers(context_hits)
    page_hint = (
        f"Context pages available: {', '.join(str(page) for page in page_numbers)}."
        if page_numbers
        else "Context pages are not available for citation."
    )

    instructions = (
        "You are Nestle's Human Resources Policy Assistant. "
        "Use only the supplied policy context. "
        "Because you are a lightweight model, avoid multi-step inference and avoid speculation. "
        "Prefer direct policy wording from the context, and keep responses concise (one or two sentences). "
        "If the context does not contain the answer, respond exactly with: "
        f"'{NOT_FOUND_MESSAGE}' "
        "Do not provide legal advice."
    )

    prompt = (
        f"{page_hint}\n"
        "Policy context:\n"
        f"{context_block}\n\n"
        f"Question: {question}\n"
        "Answer in one or two short sentences. Include page citation in parentheses when available."
    )

    response = client.responses.create(
        model=CHAT_MODEL,
        instructions=instructions,
        input=prompt,
        temperature=0.1,
        max_output_tokens=140,
    )

    answer_text = getattr(response, "output_text", "") or ""
    answer_text = _clip_to_two_sentences(answer_text)
    answer_text = _truncate_words(answer_text, max_words=65)

    if not answer_text:
        answer_text = NOT_FOUND_MESSAGE

    answer_text = _append_page_citation(answer_text, context_hits)

    usage = getattr(response, "usage", None)
    prompt_tokens = int(getattr(usage, "input_tokens", 0) or 0)
    completion_tokens = int(getattr(usage, "output_tokens", 0) or 0)
    total_tokens = int(getattr(usage, "total_tokens", prompt_tokens + completion_tokens) or 0)

    return answer_text, {
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
    }


def answer_question(question: str):
    knowledge = load_knowledge_base()

    hits = _hybrid_retrieval(question, knowledge, TOP_K)
    answer, usage = _generate_answer(question, hits)

    if "legal advice" in answer.lower():
        answer = (
            "I can only provide information from approved HR policy context and "
            "cannot provide legal advice."
        )

    if not answer.strip():
        answer = NOT_FOUND_MESSAGE

    return answer, usage
