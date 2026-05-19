"""Deterministic Hijri/Gregorian date normalization.

PRD rule: preserve the ORIGINAL source text AND a normalized operational
Gregorian date, plus which calendar it came from. No external libs —
uses the tabular (civil) Islamic calendar via Julian Day Number, which
is fully deterministic and unit-testable offline.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

_ISO_RE = re.compile(r"^\s*(\d{3,4})-(\d{1,2})-(\d{1,2})\s*$")
# Arabic Hijri month names (common spellings) -> month number.
_AR_MONTHS = {
    "محرم": 1,
    "صفر": 2,
    "ربيع الأول": 3,
    "ربيع الاول": 3,
    "ربيع الثاني": 4,
    "ربيع الآخر": 4,
    "جمادى الأولى": 5,
    "جمادى الاولى": 5,
    "جمادى الآخرة": 6,
    "جمادى الثانية": 6,
    "رجب": 7,
    "شعبان": 8,
    "رمضان": 9,
    "شوال": 10,
    "ذو القعدة": 11,
    "ذو الحجة": 12,
}
_AR_DAY_RE = re.compile(r"(\d{1,2})\s+([^\d]+?)\s+(\d{3,4})")


@dataclass(frozen=True)
class NormalizedDate:
    source_text: str
    calendar: str  # "gregorian" | "hijri"
    gregorian: date


def _gregorian_to_jdn(y: int, m: int, d: int) -> int:
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return (
        d
        + (153 * mm + 2) // 5
        + 365 * yy
        + yy // 4
        - yy // 100
        + yy // 400
        - 32045
    )


def _jdn_to_gregorian(jdn: int) -> date:
    a = jdn + 32044
    b = (4 * a + 3) // 146097
    c = a - (146097 * b) // 4
    d2 = (4 * c + 3) // 1461
    e = c - (1461 * d2) // 4
    m2 = (5 * e + 2) // 153
    day = e - (153 * m2 + 2) // 5 + 1
    month = m2 + 3 - 12 * (m2 // 10)
    year = 100 * b + d2 - 4800 + m2 // 10
    return date(year, month, day)


# Tabular Islamic calendar epoch (civil, 16 July 622 CE -> JDN 1948440).
_ISLAMIC_EPOCH = 1948440


def hijri_to_gregorian(y: int, m: int, d: int) -> date:
    jdn = (
        d
        + 29 * (m - 1)
        + (6 * m) // 11
        + (y - 1) * 354
        + (3 * y + 3) // 11
        + _ISLAMIC_EPOCH
        - 1
    )
    return _jdn_to_gregorian(jdn)


def _looks_hijri(year: int, text: str) -> bool:
    if any(name in text for name in _AR_MONTHS):
        return True
    if "هـ" in text or re.search(r"\bH\b", text):
        return True
    # Hijri years are ~579 less than Gregorian; a 4-digit year < 1700
    # with no Gregorian marker is treated as Hijri only when hinted.
    return year < 1500


def normalize_deadline(
    text: str, calendar: str | None = None
) -> NormalizedDate:
    """Parse a deadline string, preserving source text. ``calendar`` may
    force 'hijri'/'gregorian'; otherwise it is auto-detected."""
    raw = text
    iso = _ISO_RE.match(text)
    if iso:
        y, m, d = (int(iso.group(i)) for i in (1, 2, 3))
        is_hijri = (
            calendar == "hijri"
            if calendar
            else _looks_hijri(y, text)
        )
        greg = hijri_to_gregorian(y, m, d) if is_hijri else date(y, m, d)
        return NormalizedDate(
            raw, "hijri" if is_hijri else "gregorian", greg
        )

    ar = _AR_DAY_RE.search(text)
    if ar:
        d = int(ar.group(1))
        month_name = ar.group(2).strip()
        y = int(ar.group(3))
        month = _AR_MONTHS.get(month_name)
        if month is not None:
            return NormalizedDate(raw, "hijri", hijri_to_gregorian(y, month, d))

    raise ValueError(f"Unrecognized date format: {text!r}")
