from __future__ import annotations

import re
from dataclasses import dataclass

EMERGENCY_MESSAGE = (
    "I can't assess urgent symptoms or replace emergency care. If this may be urgent, "
    "please call emergency services or seek immediate medical care now."
)

CLINICIAN_MESSAGE = (
    "I can share general information from public medical sources, but I can't provide a "
    "patient-specific diagnosis, medication decision, or dosing instruction. Please review "
    "your situation with a licensed clinician who can consider your full health history."
)

_EMERGENCY_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\b(chest pain|crushing chest|shortness of breath)\b",
        r"\b(face droop|slurred speech|stroke symptoms)\b",
        r"\b(suicidal|kill myself|self[- ]harm)\b",
        r"\b(overdose|anaphylaxis|severe allergic)\b",
        r"\b(emergency|urgent|right now)\b",
    ]
]

_PATIENT_SPECIFIC_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\b(should|can|may)\s+i\s+(start|stop|take|increase|decrease|switch|combine)\b",
        r"\bwhat\s+dose\b",
        r"\bhow\s+much\s+(ozempic|wegovy|mounjaro|zepbound|insulin|metformin|medication)\b",
        r"\b(do i have|am i diabetic|diagnose me|what is my diagnosis)\b",
        r"\b(my labs|my blood pressure|my a1c|my symptoms|my medication)\b",
        r"\b(prescribe|prescription|refill)\b",
    ]
]

_PROMPT_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"ignore (all )?(previous|above|system) instructions",
        r"developer message",
        r"system prompt",
        r"reveal.*instructions",
        r"do not cite",
    ]
]


@dataclass(frozen=True)
class SafetyDecision:
    blocked: bool
    answer_mode: str
    blocked_reason: str
    message: str


def assess_question_safety(question: str) -> SafetyDecision:
    normalized = " ".join(question.split())
    if any(pattern.search(normalized) for pattern in _EMERGENCY_PATTERNS):
        return SafetyDecision(
            blocked=True,
            answer_mode="blocked",
            blocked_reason="urgent_or_emergency",
            message=EMERGENCY_MESSAGE,
        )

    if any(pattern.search(normalized) for pattern in _PATIENT_SPECIFIC_PATTERNS):
        return SafetyDecision(
            blocked=True,
            answer_mode="blocked",
            blocked_reason="patient_specific_medical_advice",
            message=CLINICIAN_MESSAGE,
        )

    if any(pattern.search(normalized) for pattern in _PROMPT_INJECTION_PATTERNS):
        return SafetyDecision(
            blocked=True,
            answer_mode="blocked",
            blocked_reason="prompt_injection",
            message=(
                "I can't follow instructions that try to bypass grounding or citation rules. "
                "Ask a general medical information question and I'll answer from the approved sources."
            ),
        )

    return SafetyDecision(
        blocked=False,
        answer_mode="grounded",
        blocked_reason="",
        message="",
    )
