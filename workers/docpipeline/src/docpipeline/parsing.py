"""Document parsing with an OCR fallback.

Real PyMuPDF/pdfplumber/Tesseract are pluggable via protocols; the
deterministic core + tests use in-memory stubs (offline, no native deps).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass(frozen=True)
class ParsedPage:
    number: int
    text: str


@dataclass
class ParsedDocument:
    pages: list[ParsedPage] = field(default_factory=list)
    used_ocr: bool = False

    @property
    def text(self) -> str:
        return "\n".join(p.text for p in self.pages)

    @property
    def has_text(self) -> bool:
        return any(p.text.strip() for p in self.pages)


class NativeParser(Protocol):
    def parse(self, source: bytes | str) -> ParsedDocument: ...


class OcrProvider(Protocol):
    def ocr(self, source: bytes | str) -> ParsedDocument: ...


class InMemoryNativeParser:
    """Test/stub parser: ``source`` is page texts joined by form-feed."""

    def parse(self, source: bytes | str) -> ParsedDocument:
        text = source.decode() if isinstance(source, bytes) else source
        pages = [
            ParsedPage(i + 1, chunk)
            for i, chunk in enumerate(text.split("\f"))
        ]
        return ParsedDocument(pages=pages)


class StubOcrProvider:
    """Deterministic OCR stub: returns fixed recognized text."""

    def __init__(self, recognized: str = "[ocr] recognized text") -> None:
        self._recognized = recognized

    def ocr(self, source: bytes | str) -> ParsedDocument:
        return ParsedDocument(
            pages=[ParsedPage(1, self._recognized)], used_ocr=True
        )


def parse_document(
    source: bytes | str,
    native: NativeParser,
    ocr: OcrProvider,
) -> ParsedDocument:
    """Native parse first; if no extractable text, fall back to OCR."""
    parsed = native.parse(source)
    if parsed.has_text:
        return parsed
    return ocr.ocr(source)
