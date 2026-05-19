from docpipeline.parsing import (
    InMemoryNativeParser,
    StubOcrProvider,
    parse_document,
)


def test_native_parser_splits_pages_on_formfeed():
    doc = InMemoryNativeParser().parse("page one\fpage two")
    assert [p.number for p in doc.pages] == [1, 2]
    assert doc.pages[1].text == "page two"
    assert doc.has_text is True
    assert doc.used_ocr is False


def test_parse_document_uses_native_when_text_present():
    doc = parse_document(
        "real text", InMemoryNativeParser(), StubOcrProvider()
    )
    assert doc.used_ocr is False
    assert "real text" in doc.text


def test_parse_document_falls_back_to_ocr_when_empty():
    doc = parse_document(
        "   ", InMemoryNativeParser(), StubOcrProvider("scanned arabic")
    )
    assert doc.used_ocr is True
    assert doc.text == "scanned arabic"
