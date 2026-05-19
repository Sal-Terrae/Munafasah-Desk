from datetime import date

import pytest

from docpipeline.dates import hijri_to_gregorian, normalize_deadline


def test_gregorian_iso_is_passthrough():
    n = normalize_deadline("2026-05-19")
    assert n.calendar == "gregorian"
    assert n.gregorian == date(2026, 5, 19)
    assert n.source_text == "2026-05-19"


def test_forced_hijri_maps_into_expected_gregorian_year():
    n = normalize_deadline("1447-11-05", calendar="hijri")
    assert n.calendar == "hijri"
    # 1447 AH falls in 2025/2026 CE; source text preserved verbatim.
    assert n.gregorian.year in (2025, 2026)
    assert n.source_text == "1447-11-05"


def test_hijri_conversion_is_deterministic_and_monotonic():
    a = hijri_to_gregorian(1447, 1, 1)
    b = hijri_to_gregorian(1447, 1, 1)
    c = hijri_to_gregorian(1447, 6, 1)
    assert a == b
    assert c > a


def test_arabic_month_form_detected_as_hijri():
    n = normalize_deadline("5 رمضان 1447")
    assert n.calendar == "hijri"
    assert isinstance(n.gregorian, date)
    assert n.source_text == "5 رمضان 1447"


def test_unrecognized_raises():
    with pytest.raises(ValueError):
        normalize_deadline("sometime next quarter")
