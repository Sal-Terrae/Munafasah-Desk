"""Deterministic sectioning/chunking with provenance anchors."""

from __future__ import annotations

from dataclasses import dataclass

from .parsing import ParsedDocument


@dataclass(frozen=True)
class Chunk:
    index: int
    page: int
    start_offset: int
    text: str


def chunk_document(doc: ParsedDocument, max_chars: int = 800) -> list[Chunk]:
    """Split each page into <= max_chars chunks, preserving page number
    and the character offset within the page (source anchor)."""
    if max_chars <= 0:
        raise ValueError("max_chars must be positive")
    chunks: list[Chunk] = []
    idx = 0
    for page in doc.pages:
        text = page.text
        for start in range(0, max(len(text), 1), max_chars):
            piece = text[start : start + max_chars]
            if not piece.strip():
                continue
            chunks.append(Chunk(idx, page.number, start, piece))
            idx += 1
    return chunks
