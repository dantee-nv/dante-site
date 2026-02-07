import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

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

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4.1-nano")
TOP_K = int(os.getenv("TOP_K", "4"))
MIN_SIMILARITY = float(os.getenv("MIN_SIMILARITY", "0.22"))

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_POLICY_PDF_PATH = BASE_DIR / "data" / "nestle_hr_policy.pdf"
DEFAULT_POLICY_TEXT_PATH = BASE_DIR / "data" / "nestle_hr_policy.txt"
POLICY_PDF_PATH = Path(os.getenv("POLICY_PDF_PATH", str(DEFAULT_POLICY_PDF_PATH)))
POLICY_TEXT_PATH = Path(os.getenv("POLICY_TEXT_PATH", str(DEFAULT_POLICY_TEXT_PATH)))

NOT_FOUND_MESSAGE = (
    "I could not find that information in the approved HR policy. "
    "Please check the policy document or contact HR for clarification."
)

_CLIENT = None
_KNOWLEDGE_BASE = None


@dataclass
class KnowledgeBase:
    chunks: List[str]
    embeddings: List[List[float]]
    index: Optional[object]


@dataclass
class RetrievalHit:
    text: str
    score: float


def _get_client():
    global _CLIENT

    if _CLIENT is not None:
        return _CLIENT

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or OpenAI is None:
        _CLIENT = False
        return None

    _CLIENT = OpenAI(api_key=api_key)
    return _CLIENT


def _read_policy_text() -> str:
    if POLICY_PDF_PATH.exists() and PdfReader is not None:
        pages = []
        reader = PdfReader(str(POLICY_PDF_PATH))
        for page in reader.pages:
            page_text = page.extract_text() or ""
            page_text = page_text.strip()
            if page_text:
                pages.append(page_text)
        if pages:
            return "\n\n".join(pages)

    if POLICY_TEXT_PATH.exists():
        text = POLICY_TEXT_PATH.read_text(encoding="utf-8").strip()
        if text:
            return text

    return (
        "Nestle HR Policy excerpt: Employees should consult approved HR documentation "
        "for leave, conduct, and benefits information. If no policy entry is found, "
        "the assistant must say the information is not available in the approved policy."
    )


def _fallback_chunk_text(text: str) -> List[str]:
    paragraphs = [part.strip() for part in text.split("\n\n") if part.strip()]
    if not paragraphs:
        return [text.strip()]

    chunks = []
    buffer = ""
    for paragraph in paragraphs:
        candidate = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
        if len(candidate) <= 700:
            buffer = candidate
            continue

        if buffer:
            chunks.append(buffer)
        buffer = paragraph

    if buffer:
        chunks.append(buffer)

    return chunks


def _chunk_text(text: str) -> List[str]:
    if RecursiveCharacterTextSplitter is None:
        return _fallback_chunk_text(text)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=120,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = [part.strip() for part in splitter.split_text(text) if part.strip()]
    return chunks or _fallback_chunk_text(text)


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

    raw_text = _read_policy_text()
    chunks = _chunk_text(raw_text)
    embeddings = _embed_texts(chunks)
    index = _build_index(embeddings)

    _KNOWLEDGE_BASE = KnowledgeBase(chunks=chunks, embeddings=embeddings, index=index)
    return _KNOWLEDGE_BASE


def _lexical_retrieval(question: str, chunks: Sequence[str], k: int) -> List[RetrievalHit]:
    terms = set(re.findall(r"[a-zA-Z]{3,}", question.lower()))
    if not terms:
        return []

    scored: List[Tuple[float, str]] = []
    for chunk in chunks:
        chunk_terms = set(re.findall(r"[a-zA-Z]{3,}", chunk.lower()))
        overlap = len(terms & chunk_terms)
        if overlap > 0:
            scored.append((float(overlap), chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [RetrievalHit(text=text, score=score) for score, text in scored[:k]]


def _vector_retrieval(question: str, knowledge: KnowledgeBase, k: int) -> List[RetrievalHit]:
    client = _get_client()
    if client is None or not knowledge.embeddings:
        return _lexical_retrieval(question, knowledge.chunks, k)

    question_embedding = client.embeddings.create(model=EMBEDDING_MODEL, input=question).data[0].embedding

    if knowledge.index is not None and faiss is not None and np is not None:
        vector = np.asarray([question_embedding], dtype="float32")
        faiss.normalize_L2(vector)
        scores, indices = knowledge.index.search(vector, k)

        hits = []
        for score, index in zip(scores[0], indices[0]):
            if index < 0:
                continue
            hits.append(RetrievalHit(text=knowledge.chunks[index], score=float(score)))

        return hits

    hits = []
    query_norm = sum(value * value for value in question_embedding) ** 0.5 or 1.0
    for chunk, embedding in zip(knowledge.chunks, knowledge.embeddings):
        dot = sum(q * c for q, c in zip(question_embedding, embedding))
        emb_norm = sum(value * value for value in embedding) ** 0.5 or 1.0
        score = dot / (query_norm * emb_norm)
        hits.append(RetrievalHit(text=chunk, score=float(score)))

    hits.sort(key=lambda item: item.score, reverse=True)
    return hits[:k]


def _clip_to_two_sentences(text: str) -> str:
    normalized = " ".join(text.strip().split())
    if not normalized:
        return ""

    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    clipped = " ".join(sentences[:2]).strip()
    return clipped


def _offline_answer(retrieved_context: Sequence[RetrievalHit]) -> str:
    if not retrieved_context:
        return NOT_FOUND_MESSAGE

    best_context = retrieved_context[0].text.strip()
    answer = _clip_to_two_sentences(best_context)
    return answer or NOT_FOUND_MESSAGE


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

    context_block = "\n\n".join(
        f"[{idx + 1}] {hit.text}" for idx, hit in enumerate(retrieved_context)
    )

    instructions = (
        "You are Nestle's Human Resources Policy Assistant. "
        "Answer strictly from the provided policy context. "
        "Keep answers concise (one or two short sentences), professional, and factual. "
        "If the context does not contain the answer, respond exactly with: "
        "'I could not find that information in the approved HR policy. "
        "Please check the policy document or contact HR for clarification.' "
        "Do not speculate and do not provide legal advice."
    )

    prompt = (
        "Policy context:\n"
        f"{context_block}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )

    response = client.responses.create(
        model=CHAT_MODEL,
        instructions=instructions,
        input=prompt,
        temperature=0.1,
        max_output_tokens=120,
    )

    answer_text = getattr(response, "output_text", "") or ""
    answer_text = _clip_to_two_sentences(answer_text)

    if not answer_text:
        answer_text = NOT_FOUND_MESSAGE

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

    hits = _vector_retrieval(question, knowledge, TOP_K)
    filtered_hits = [hit for hit in hits if hit.score >= MIN_SIMILARITY]

    # Lexical retrieval scores are overlap counts; keep them even when MIN_SIMILARITY is tuned for cosine.
    if hits and max(hit.score for hit in hits) > 1.0:
        filtered_hits = hits

    answer, usage = _generate_answer(question, filtered_hits)
    if "legal advice" in answer.lower():
        answer = (
            "I can only provide information from approved HR policy context and "
            "cannot provide legal advice."
        )

    if not answer.strip():
        answer = NOT_FOUND_MESSAGE

    return answer, usage
