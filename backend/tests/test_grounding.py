from app.ai import validate_grounding


def span(source: str, text: str) -> dict:
    start = source.index(text)
    return {"start": start, "end": start + len(text), "text": text}


def test_grounding_keeps_exact_spans_and_drops_invalid_claims():
    source = "Data Analyst — Acme\nSalary: ₹12 LPA\nDeadline: October 20, 2026.\nBuild dashboards with SQL."
    payload = {
        "title": {"text": "Data Analyst", "source_span": span(source, "Data Analyst")},
        "company": {"text": "Acme", "source_span": span(source, "Acme")},
        "summary": {"text": "The role builds dashboards with SQL.", "source_span": span(source, "Build dashboards with SQL.")},
        "skills": [{"text": "SQL", "source_span": span(source, "SQL")}],
        "deadline": {"text": "Deadline: October 20, 2026.", "source_span": span(source, "Deadline: October 20, 2026.")},
        "responsibilities": [],
        "required": [],
        "preferred": [],
        "process": [],
        "location": None,
        "type": None,
    }
    clean = validate_grounding(source, payload)
    assert clean["grounded"] is True
    assert clean["sourceSpans"]["summary"]["text"] == "Build dashboards with SQL."
    assert clean["sourceSpans"]["deadline"]["text"] == "Deadline: October 20, 2026."

    payload["summary"] = {"text": "Salary is $999K", "source_span": span(source, "Data Analyst")}
    clean = validate_grounding(source, payload)
    assert clean["summary"] == ""
    assert clean["sourceSpans"]["summary"] is None
