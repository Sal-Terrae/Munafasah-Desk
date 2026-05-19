import pytest

from docpipeline.chunking import chunk_document
from docpipeline.parsing import ParsedDocument, ParsedPage


def _doc(*pages: str) -> ParsedDocument:
    return ParsedDocument(
        pages=[ParsedPage(i + 1, t) for i, t in enumerate(pages)]
    )


def test_chunks_carry_page_and_offset_provenance():
    doc = _doc("abcdef", "ghijkl")
    chunks = chunk_document(doc, max_chars=3)
    assert [(c.index, c.page, c.start_offset, c.text) for c in chunks] == [
        (0, 1, 0, "abc"),
        (1, 1, 3, "def"),
        (2, 2, 0, "ghi"),
        (3, 2, 3, "jkl"),
    ]


def test_blank_chunks_skipped():
    assert chunk_document(_doc("   "), max_chars=2) == []


def test_invalid_max_chars_raises():
    with pytest.raises(ValueError):
        chunk_document(_doc("x"), max_chars=0)
