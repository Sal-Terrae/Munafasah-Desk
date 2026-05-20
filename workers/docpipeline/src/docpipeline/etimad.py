"""Deterministic Etimad tender-notice parser.

Etimad publishes tender notices on https://etimad.sa . Our PRD calls
for an inbound flow that turns a notice (pasted text, emailed copy, or
OCR'd PDF) into a `Tender` row + a list of `TenderRequirement` rows
the buyer can review before opening the matrix.

This module is a pure heuristic parser. **No LLM call. No network.**
The contract:

    parse_etimad_notice(text: str) -> EtimadParsedNotice

The parser is generous about formatting but strict about determinism:
the same input always yields the same output. Output structure is the
shape the API's `POST /tenders/{id}/requirements` and `POST /tenders`
expect (after light transformation in the worker consumer).
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re


# ----------------------------- types ---------------------------------


@dataclass(frozen=True)
class EtimadRequirement:
    category: str  # legal | financial | technical | admin | other
    text: str
    risk: str = "medium"  # baseline; humans can up-rate in the UI


@dataclass
class EtimadParsedNotice:
    title: str
    tender_number: str | None
    requirements: list[EtimadRequirement] = field(default_factory=list)


# --------------------------- heuristics ------------------------------


_BULLET_PREFIXES = ("- ", "• ", "* ", "– ", "‣ ", "○ ")
_NUM_BULLET_RE = re.compile(r"^\s*(\d+|[٠-٩]+)\s*[\.\)\-]\s*")
_HEADER_SUFFIXES = (":", "：", "؛")

# Keyword sets per category (Arabic + English aliases). All lowercase
# Latin for case-insensitive match; Arabic is matched as-is (case-less).
_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "legal": (
        "قانون", "تنظيم", "السجل التجاري", "زكاة",
        "legal", "compliance", "registration", "zakat",
    ),
    "financial": (
        "مالي", "ضمان", "كفالة", "مال", "ميزانية", "زكاة",
        "financial", "bond", "guarantee", "budget", "tax",
    ),
    "technical": (
        "فني", "تقني", "تقنية", "هندس", "مواصفات",
        "technical", "specification", "engineering",
    ),
    "admin": (
        "إدار", "ادار", "متطلبات إدارية", "وثائق",
        "admin", "administrative", "submission",
    ),
}

_REQUIREMENT_HEADERS = (
    "متطلب", "متطلبات", "شرط", "شروط", "وثائق المطلوبة",
    "requirements", "conditions",
)


def _strip_bullet(line: str) -> str:
    for p in _BULLET_PREFIXES:
        if line.startswith(p):
            return line[len(p):].strip()
    m = _NUM_BULLET_RE.match(line)
    if m:
        return line[m.end():].strip()
    return line.strip()


def _is_bullet_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    if any(stripped.startswith(p) for p in _BULLET_PREFIXES):
        return True
    if _NUM_BULLET_RE.match(stripped):
        return True
    return False


def _is_section_header(line: str) -> bool:
    stripped = line.strip()
    if not stripped or _is_bullet_line(line):
        return False
    if any(stripped.endswith(s) for s in _HEADER_SUFFIXES):
        return True
    # Short, header-like lines that mention a requirement keyword.
    if len(stripped) <= 80 and any(
        kw.lower() in stripped.lower() for kw in _REQUIREMENT_HEADERS
    ):
        return True
    return False


def _classify(line: str) -> str:
    lower = line.lower()
    for category, kws in _CATEGORY_KEYWORDS.items():
        for kw in kws:
            # Arabic keywords are case-less in practice; compare both
            # forms so Latin keywords still match case-insensitively.
            if kw in line or kw.lower() in lower:
                return category
    return "other"


_TENDER_NUMBER_RE = re.compile(
    r"(?:رقم\s*المنافسة|رقم\s*العطاء|tender\s*(?:no|number)|الرقم)\s*[:\-]?\s*([A-Za-z0-9\-/_]+)",
    re.IGNORECASE,
)

_TITLE_PREFIXES = (
    "اسم المنافسة",
    "اسم العطاء",
    "موضوع المنافسة",
    "tender title",
    "title",
)


def _maybe_title_from_prefix(line: str) -> str | None:
    lower = line.lower()
    for prefix in _TITLE_PREFIXES:
        if lower.startswith(prefix.lower()):
            remainder = line[len(prefix):].lstrip(" :-،")
            if remainder:
                return remainder.strip()
    return None


# ------------------------------ API ----------------------------------


def parse_etimad_notice(text: str) -> EtimadParsedNotice:
    """Parse an Etimad notice (Arabic or English) into title + requirements.

    Deterministic, side-effect-free. Empty input yields an empty notice.
    """
    if not text or not text.strip():
        return EtimadParsedNotice(title="Untitled", tender_number=None)

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # Title: explicit "اسم المنافسة: ..." prefix wins over the first line.
    title: str | None = None
    for ln in lines[:8]:
        candidate = _maybe_title_from_prefix(ln)
        if candidate:
            title = candidate
            break
    if title is None:
        title = lines[0]

    # Tender number: anywhere in the notice.
    tender_number: str | None = None
    for ln in lines:
        m = _TENDER_NUMBER_RE.search(ln)
        if m:
            tender_number = m.group(1)
            break

    # Requirements: walk the lines, tracking the current section
    # category. Bullets/numbered lines under a requirement-flavoured
    # header become EtimadRequirement rows.
    requirements: list[EtimadRequirement] = []
    current_category = "other"
    inside_requirements_block = False
    for ln in lines:
        if _is_section_header(ln):
            inside_requirements_block = any(
                kw.lower() in ln.lower() for kw in _REQUIREMENT_HEADERS
            )
            if inside_requirements_block:
                current_category = _classify(ln)
            continue
        if _is_bullet_line(ln) and inside_requirements_block:
            cleaned = _strip_bullet(ln)
            if cleaned:
                requirements.append(
                    EtimadRequirement(category=current_category, text=cleaned),
                )

    return EtimadParsedNotice(
        title=title,
        tender_number=tender_number,
        requirements=requirements,
    )
