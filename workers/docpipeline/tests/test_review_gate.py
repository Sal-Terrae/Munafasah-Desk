import pytest

from docpipeline.review_gate import NEEDS_REVIEW, ReviewError, ReviewGate


def test_starts_in_needs_review_not_published():
    g = ReviewGate()
    assert g.status == NEEDS_REVIEW
    assert g.is_published is False


def test_approve_requires_a_human_reviewer():
    g = ReviewGate()
    with pytest.raises(ReviewError):
        g.approve("")


def test_approve_publishes_and_is_idempotent_guarded():
    g = ReviewGate()
    assert g.approve("bid.manager@acme") == "published"
    assert g.is_published is True
    with pytest.raises(ReviewError):
        g.approve("bid.manager@acme")


def test_reject_path():
    g = ReviewGate()
    g.reject("reviewer@acme", "out of scope")
    assert g.status == "rejected"
    with pytest.raises(ReviewError):
        g.approve("reviewer@acme")
