from dataclasses import dataclass
from typing import Optional


@dataclass
class CandidatePaper:
    paper_id: str
    title: str
    abstract: str
    authors: list[str]
    year: Optional[int]
    venue: str
    url: str


@dataclass
class RankedPaper:
    paper: CandidatePaper
    score: float
