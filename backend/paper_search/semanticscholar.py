import json
import logging
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Optional

from .models import CandidatePaper

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_FIELDS = "paperId,title,abstract,authors,year,venue,url"
_ERROR_BODY_MAX_CHARS = 240


class SemanticScholarError(Exception):
    pass


class CircuitOpenError(SemanticScholarError):
    pass


class UpstreamRateLimitedError(SemanticScholarError):
    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        body_excerpt: str = "",
        used_api_key: bool = False,
        fallback_attempted: bool = False,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.body_excerpt = body_excerpt
        self.used_api_key = used_api_key
        self.fallback_attempted = fallback_attempted


class UpstreamRequestError(SemanticScholarError):
    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        body_excerpt: str = "",
        used_api_key: bool = False,
        fallback_attempted: bool = False,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.body_excerpt = body_excerpt
        self.used_api_key = used_api_key
        self.fallback_attempted = fallback_attempted


class UpstreamAuthError(SemanticScholarError):
    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        body_excerpt: str = "",
        used_api_key: bool = False,
        fallback_attempted: bool = False,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.body_excerpt = body_excerpt
        self.used_api_key = used_api_key
        self.fallback_attempted = fallback_attempted


@dataclass
class CircuitBreaker:
    failure_threshold: int
    open_seconds: int

    def __post_init__(self):
        self._failure_count = 0
        self._open_until = 0.0
        self._lock = threading.Lock()

    def allow_request(self) -> bool:
        with self._lock:
            return time.time() >= self._open_until

    def record_success(self) -> None:
        with self._lock:
            self._failure_count = 0
            self._open_until = 0.0

    def record_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            if self._failure_count >= max(1, self.failure_threshold):
                self._open_until = time.time() + max(5, self.open_seconds)


class SemanticScholarClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        candidate_limit: int,
        timeout_seconds: int,
        circuit_breaker: CircuitBreaker,
    ):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key.strip()
        self._candidate_limit = max(1, min(100, candidate_limit))
        self._timeout_seconds = max(1, timeout_seconds)
        self._circuit_breaker = circuit_breaker

    def search_papers(self, query: str) -> list[CandidatePaper]:
        if not self._circuit_breaker.allow_request():
            raise CircuitOpenError("Semantic Scholar circuit breaker is open.")

        fallback_attempted = False
        try:
            payload = self._request_search(query=query, use_api_key=bool(self._api_key))
        except UpstreamAuthError as error:
            if not error.used_api_key or not self._api_key:
                raise

            fallback_attempted = True
            logger.warning(
                "semantic_scholar_auth_fallback status=%s body_excerpt=%s",
                error.status_code,
                error.body_excerpt,
            )
            try:
                payload = self._request_search(query=query, use_api_key=False)
            except (UpstreamAuthError, UpstreamRateLimitedError, UpstreamRequestError) as fallback_error:
                fallback_error.fallback_attempted = True
                raise

        self._circuit_breaker.record_success()

        raw_items = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(raw_items, list):
            return []

        papers: list[CandidatePaper] = []
        for raw in raw_items:
            paper = _normalize_candidate(raw)
            if paper is not None:
                papers.append(paper)

        logger.info(
            "semantic_scholar_candidates count=%s fallback_attempted=%s",
            len(papers),
            fallback_attempted,
        )
        return papers

    def _request_search(self, query: str, *, use_api_key: bool) -> dict:
        params = {
            "query": query,
            "limit": str(self._candidate_limit),
            "fields": _FIELDS,
        }

        url = f"{self._base_url}/graph/v1/paper/search?{urllib.parse.urlencode(params)}"
        headers = {
            "accept": "application/json",
            "user-agent": "dante-paper-search/1.0",
        }

        if use_api_key and self._api_key:
            headers["x-api-key"] = self._api_key

        request = urllib.request.Request(url, headers=headers, method="GET")

        try:
            with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                body = response.read().decode("utf-8")
                payload = json.loads(body)
        except urllib.error.HTTPError as error:
            body_excerpt = _extract_error_body(error)
            if error.code in (401, 403):
                raise UpstreamAuthError(
                    f"Semantic Scholar returned status {error.code}.",
                    status_code=error.code,
                    body_excerpt=body_excerpt,
                    used_api_key=use_api_key,
                ) from error

            self._circuit_breaker.record_failure()
            if error.code == 429 or error.code >= 500:
                raise UpstreamRateLimitedError(
                    f"Semantic Scholar returned status {error.code}.",
                    status_code=error.code,
                    body_excerpt=body_excerpt,
                    used_api_key=use_api_key,
                ) from error
            raise UpstreamRequestError(
                f"Semantic Scholar returned status {error.code}.",
                status_code=error.code,
                body_excerpt=body_excerpt,
                used_api_key=use_api_key,
            ) from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            self._circuit_breaker.record_failure()
            raise UpstreamRequestError(
                "Semantic Scholar request failed.",
                used_api_key=use_api_key,
            ) from error

        return payload


def _extract_error_body(error: urllib.error.HTTPError) -> str:
    try:
        raw_body = error.read().decode("utf-8", errors="ignore")
    except Exception:  # noqa: BLE001
        return ""

    normalized = " ".join(raw_body.split())
    if len(normalized) <= _ERROR_BODY_MAX_CHARS:
        return normalized
    return f"{normalized[: _ERROR_BODY_MAX_CHARS - 3].rstrip()}..."


def _normalize_candidate(raw: dict) -> Optional[CandidatePaper]:
    if not isinstance(raw, dict):
        return None

    paper_id = str(raw.get("paperId") or "").strip()
    title = str(raw.get("title") or "").strip()
    abstract = str(raw.get("abstract") or "").strip()

    if not paper_id or not title:
        return None

    authors = []
    raw_authors = raw.get("authors")
    if isinstance(raw_authors, list):
        for author in raw_authors:
            if not isinstance(author, dict):
                continue
            name = str(author.get("name") or "").strip()
            if name:
                authors.append(name)

    year = raw.get("year")
    year_value = int(year) if isinstance(year, int) else None
    venue = str(raw.get("venue") or "").strip()
    url = str(raw.get("url") or "").strip()

    return CandidatePaper(
        paper_id=paper_id,
        title=title,
        abstract=abstract,
        authors=authors,
        year=year_value,
        venue=venue,
        url=url,
    )
