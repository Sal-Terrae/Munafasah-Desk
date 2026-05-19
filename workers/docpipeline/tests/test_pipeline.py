from docpipeline.extraction import MockLLMProvider
from docpipeline.parsing import InMemoryNativeParser, StubOcrProvider
from docpipeline.pipeline import run_pipeline
from docpipeline.review_gate import NEEDS_REVIEW


def test_end_to_end_native_with_requirements_and_deadlines():
    source = "REQ: CR certificate\fREQ: Zakat certificate"
    result = run_pipeline(
        source,
        native=InMemoryNativeParser(),
        ocr=StubOcrProvider(),
        llm=MockLLMProvider(),
        deadline_texts=["2026-05-22", "5 رمضان 1447", "garbage"],
        max_chars=200,
    )
    assert result.used_ocr is False
    assert {r.text for r in result.requirements} == {
        "CR certificate",
        "Zakat certificate",
    }
    # provenance preserved across pages
    assert {r.page for r in result.requirements} == {1, 2}
    # garbage deadline dropped; two normalized
    assert len(result.deadlines) == 2
    # never auto-published — human gate
    assert result.status == NEEDS_REVIEW


def test_end_to_end_falls_back_to_ocr_when_native_empty():
    result = run_pipeline(
        "    ",
        native=InMemoryNativeParser(),
        ocr=StubOcrProvider("REQ: scanned requirement"),
        llm=MockLLMProvider(),
    )
    assert result.used_ocr is True
    assert [r.text for r in result.requirements] == [
        "scanned requirement"
    ]
    assert result.status == NEEDS_REVIEW
