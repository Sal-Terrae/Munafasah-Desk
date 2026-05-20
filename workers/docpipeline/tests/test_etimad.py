from docpipeline.etimad import parse_etimad_notice


def test_empty_input_yields_untitled_no_requirements():
    parsed = parse_etimad_notice("")
    assert parsed.title == "Untitled"
    assert parsed.requirements == []


def test_title_picked_from_arabic_prefix():
    text = """\
رقم المنافسة: T-2026-00042
اسم المنافسة: توريد أجهزة طبية لمستشفى الملك فهد
الجهة: وزارة الصحة
"""
    parsed = parse_etimad_notice(text)
    assert parsed.title == "توريد أجهزة طبية لمستشفى الملك فهد"
    assert parsed.tender_number == "T-2026-00042"


def test_title_falls_back_to_first_line_when_no_prefix():
    text = "MOH RFP — Medical Equipment\nbody line"
    parsed = parse_etimad_notice(text)
    assert parsed.title == "MOH RFP — Medical Equipment"


def test_arabic_requirements_under_section_headers():
    text = """\
اسم المنافسة: توريد أجهزة طبية
المتطلبات القانونية:
- سجل تجاري ساري
- شهادة زكاة سارية
المتطلبات المالية:
- ضمان ابتدائي بقيمة 1٪
- ميزانية مراجعة للسنتين الأخيرتين
"""
    parsed = parse_etimad_notice(text)
    cats = [r.category for r in parsed.requirements]
    texts = [r.text for r in parsed.requirements]
    assert cats == ["legal", "legal", "financial", "financial"]
    assert "سجل تجاري ساري" in texts
    assert "ضمان ابتدائي بقيمة 1٪" in texts


def test_english_requirements_with_numbered_bullets():
    text = """\
Tender Title: IT Services Renewal
Technical Requirements:
1. ISO 27001 certificate (valid)
2. 24/7 support coverage
Administrative Requirements:
1. Company profile
"""
    parsed = parse_etimad_notice(text)
    cats = [r.category for r in parsed.requirements]
    texts = [r.text for r in parsed.requirements]
    assert "technical" in cats
    assert "admin" in cats
    assert "ISO 27001 certificate (valid)" in texts
    assert "Company profile" in texts


def test_only_picks_lines_inside_a_requirement_block():
    text = """\
اسم المنافسة: ABC
الجهة: وزارة الصحة
- bullet outside any block — should be ignored
المتطلبات الفنية:
- مواصفات الجهاز
"""
    parsed = parse_etimad_notice(text)
    texts = [r.text for r in parsed.requirements]
    assert texts == ["مواصفات الجهاز"]


def test_unknown_category_falls_back_to_other():
    text = """\
Tender Title: X
الشروط:
- بعض الشروط
"""
    parsed = parse_etimad_notice(text)
    # 'الشروط' alone (no category keyword) classifies to 'other'.
    assert parsed.requirements[0].category in ("other", "legal")
    assert parsed.requirements[0].text == "بعض الشروط"


def test_deterministic_repeated_calls_match():
    text = """\
اسم المنافسة: X
المتطلبات القانونية:
- A
- B
"""
    a = parse_etimad_notice(text)
    b = parse_etimad_notice(text)
    assert a == b
