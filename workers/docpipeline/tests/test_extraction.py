from docpipeline.chunking import Chunk
from docpipeline.extraction import MockLLMProvider, extract_requirements


class _BadLLM:
    def generate(self, prompt: str) -> str:
        return "not json at all"


def test_extracts_requirements_with_provenance_and_confidence():
    chunks = [
        Chunk(0, 3, 120, "intro\nREQ: Valid CR certificate\nREQ: Bid bond"),
    ]
    reqs = extract_requirements(chunks, MockLLMProvider())
    assert [r.text for r in reqs] == [
        "Valid CR certificate",
        "Bid bond",
    ]
    for r in reqs:
        assert r.page == 3
        assert r.start_offset == 120
        assert 0.0 <= r.confidence <= 1.0


def test_malformed_model_output_is_skipped_not_crashed():
    chunks = [Chunk(0, 1, 0, "REQ: anything")]
    assert extract_requirements(chunks, _BadLLM()) == []
