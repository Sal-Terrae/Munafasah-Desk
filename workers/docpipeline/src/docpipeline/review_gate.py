"""Human-review gate. A parsed/extracted tender is NEVER auto-published;
a human must approve it (PRD: AI-assisted, rules-governed, human-approved)."""

from __future__ import annotations

from dataclasses import dataclass

NEEDS_REVIEW = "needs_review"
PUBLISHED = "published"
REJECTED = "rejected"


class ReviewError(RuntimeError):
    pass


@dataclass
class ReviewGate:
    status: str = NEEDS_REVIEW

    def approve(self, reviewer: str) -> str:
        if not reviewer:
            raise ReviewError("a human reviewer is required to approve")
        if self.status != NEEDS_REVIEW:
            raise ReviewError(f"cannot approve from status {self.status!r}")
        self.status = PUBLISHED
        return self.status

    def reject(self, reviewer: str, reason: str) -> str:
        if not reviewer:
            raise ReviewError("a human reviewer is required to reject")
        if self.status != NEEDS_REVIEW:
            raise ReviewError(f"cannot reject from status {self.status!r}")
        self.status = REJECTED
        return self.status

    @property
    def is_published(self) -> bool:
        return self.status == PUBLISHED
