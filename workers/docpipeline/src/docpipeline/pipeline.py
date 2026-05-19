"""End-to-end tender ingestion pipeline (pure, deterministic, offline).

parse -> (OCR fallback) -> chunk -> extract requirements -> normalize
deadlines -> land in `needs_review` (human gate; never auto-published).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .chunking import Chunk, chunk_document
from .dates import NormalizedDate, normalize_deadline
from .extraction import ExtractedRequirement, LLMProvider, extract_requirements
from .parsing import NativeParser, OcrProvider, parse_document
from .review_gate import NEEDS_REVIEW, ReviewGate


@dataclass
class IngestionResult:
    used_ocr: bool
    chunks: list[Chunk]
    requirements: list[ExtractedRequirement]
    deadlines: list[NormalizedDate]
    review: ReviewGate = field(default_factory=ReviewGate)

    @property
    def status(self) -> str:
        return self.review.status


def run_pipeline(
    source: bytes | str,
    *,
    native: NativeParser,
    ocr: OcrProvider,
    llm: LLMProvider,
    deadline_texts: list[str] | None = None,
    max_chars: int = 800,
) -> IngestionResult:
    doc = parse_document(source, native, ocr)
    chunks = chunk_document(doc, max_chars=max_chars)
    requirements = extract_requirements(chunks, llm)
    deadlines: list[NormalizedDate] = []
    for raw in deadline_texts or []:
        try:
            deadlines.append(normalize_deadline(raw))
        except ValueError:
            continue
    result = IngestionResult(
        used_ocr=doc.used_ocr,
        chunks=chunks,
        requirements=requirements,
        deadlines=deadlines,
    )
    assert result.status == NEEDS_REVIEW  # never auto-published
    return result
