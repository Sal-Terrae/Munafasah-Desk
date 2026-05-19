"""Requirement extraction.

Rule: the LLM only *proposes* requirement text/category. Deterministic
facts (dates) are normalized by ``dates.py``, never by the model. Every
extracted requirement keeps a source anchor (page + offset) and a
confidence. The LLM is a pluggable protocol; tests use a deterministic
mock.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

from .chunking import Chunk


class LLMProvider(Protocol):
    def generate(self, prompt: str) -> str: ...


@dataclass(frozen=True)
class ExtractedRequirement:
    text: str
    category: str
    page: int
    start_offset: int
    confidence: float


class MockLLMProvider:
    """Deterministic LLM stub. Emits one requirement per non-empty line
    prefixed with 'REQ:' so extraction is fully testable offline."""

    def generate(self, prompt: str) -> str:
        items = []
        for line in prompt.splitlines():
            line = line.strip()
            if line.startswith("REQ:"):
                items.append(
                    {"text": line[4:].strip(), "category": "general"}
                )
        return json.dumps({"requirements": items})


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def extract_requirements(
    chunks: list[Chunk], llm: LLMProvider
) -> list[ExtractedRequirement]:
    out: list[ExtractedRequirement] = []
    for chunk in chunks:
        raw = llm.generate(chunk.text)
        try:
            parsed = json.loads(raw)
            items = parsed.get("requirements", [])
        except (ValueError, AttributeError):
            # Non-JSON / malformed model output -> low-confidence, skipped.
            continue
        for item in items:
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            out.append(
                ExtractedRequirement(
                    text=text,
                    category=str(item.get("category", "general")),
                    page=chunk.page,
                    start_offset=chunk.start_offset,
                    confidence=_clamp(float(item.get("confidence", 0.6))),
                )
            )
    return out
